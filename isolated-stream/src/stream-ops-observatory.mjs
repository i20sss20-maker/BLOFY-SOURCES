// BLOFY STREAM Operations 3.0: read-only, bounded operator-scoped alerts.
// Observes existing shared-relay and operator-HLS metrics ONLY.
// Never opens media connections, changes quotas, or lists customer IPs/URLs.
const CODES=new Set([
  'feed_near_capacity','feed_media_stalled','provider_failures_increased',
  'capacity_rejections_increased','reconnects_increased',
  'slow_viewer_disconnects_increased','operator_hls_probe_failed'
]);
const LEVELS=new Set(['warning','critical']);
const FEED_STATES=new Set(['starting','ready','reconnecting','failed','idle']);
const HLS_PATH=/^live-[a-f0-9]{12}$/;
const positive=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const bounded=(value,max)=>Math.min(max,positive(value));
function safeLatency(input){
  const empty={samples:0,p50Ms:null,p95Ms:null,maxMs:null};
  if(!input||!Number.isInteger(input.samples)||input.samples<1||input.samples>64)return empty;
  const {samples,p50Ms,p95Ms,maxMs}=input;
  if(![p50Ms,p95Ms,maxMs].every(v=>Number.isFinite(v)&&v>=0)||
     p50Ms>p95Ms||p95Ms>maxMs)return empty;
  return {samples,p50Ms,p95Ms,maxMs};
}
function countedDiff(current,old){
  // Counters are process-lifetime. Restart/reset must never appear as a spike.
  return old===null||current<old?0:current-old;
}
export function createStreamOpsObservatory({
  relayStats=()=>null,autoHealth=()=>null,clock=Date.now,
  capacityWarningPercent=85,mediaStallMs=30000,historyLimit=50,
  sampleIntervalMs=15000,trendLimit=240
}={}){
  if(typeof relayStats!=='function'||typeof autoHealth!=='function'||
     typeof clock!=='function'||!Number.isInteger(capacityWarningPercent)||
     capacityWarningPercent<60||capacityWarningPercent>99||
     !Number.isInteger(mediaStallMs)||mediaStallMs<15000||mediaStallMs>120000||
     !Number.isInteger(historyLimit)||historyLimit<1||historyLimit>100||
     !Number.isInteger(sampleIntervalMs)||sampleIntervalMs<5000||sampleIntervalMs>60000||
     !Number.isInteger(trendLimit)||trendLimit<10||trendLimit>480)
    throw Error('stream_ops_config_invalid');
  let previous=null,previousAt=null;
  let lastActive=new Map(),history=[],totalRaised=0;
  const trends=[];
  let timer=null,lastReport=null;

  function collect(){
    const now=clock();
    const relay=relayStats()||{};
    const f=relay?.fanout||{};
    const maxViewers=bounded(f.maxViewersPerFeed,512);
    const maxFeeds=bounded(f.maxFeeds,64);
    const counters={
      providerFailures:positive(f.providerFailures),
      capacityRejections:positive(f.capacityRejections),
      upstreamReconnects:positive(f.upstreamReconnects),
      slowViewerDisconnects:positive(f.slowViewerDisconnects),
      sourceBytesReceived:positive(f.sourceBytesReceived),
      viewerBytesQueued:positive(f.viewerBytesQueued)
    };
    const sinceMs=previousAt===null?null:Math.max(0,now-previousAt);
    const delta={};
    for(const [name,value] of Object.entries(counters))
      delta[name]=countedDiff(value,previous?.[name]??null);
    previous=counters;previousAt=now;

    const alerts=[];
    function alert(code,level,context={}){
      if(!CODES.has(code)||!LEVELS.has(level))return;
      const channel=positive(context.channel);
      const path=typeof context.path==='string'&&HLS_PATH.test(context.path)
        ?context.path:null;
      const key=code+':'+(channel||path||'global');
      if(alerts.some(row=>row.id===key))return;
      alerts.push({id:key,code,level,
        ...(channel?{channel}:{}),...(path?{path}:{}),
        ...(context.count!==undefined?{count:bounded(context.count,100000000)}:{})
      });
    }
    const seen=new Set();
    const channels=[];
    for(const row of (Array.isArray(f.channels)?f.channels:[]).slice(0,64)){
      const channel=positive(row?.channel);
      if(!channel||seen.has(channel))continue;
      seen.add(channel);
      const viewers=bounded(row.viewers,512);
      const state=FEED_STATES.has(row?.state)?row.state:'unknown';
      const lastMediaAgeMs=row?.lastMediaAgeMs===null?null:
        Number.isSafeInteger(row?.lastMediaAgeMs)&&row.lastMediaAgeMs>=0?
          Math.min(row.lastMediaAgeMs,86400000):null;
      const saturationPercent=maxViewers>0?
        Math.min(100,Math.round(100*viewers/maxViewers)):null;
      channels.push({channel,state,viewers,maxViewers,
        saturationPercent,lastMediaAgeMs});
      if(viewers>0&&saturationPercent>=capacityWarningPercent)
        alert('feed_near_capacity','warning',{channel,count:viewers});
      if(viewers>0&&lastMediaAgeMs!==null&&
         lastMediaAgeMs>=mediaStallMs&&state!=='starting')
        alert('feed_media_stalled','critical',{channel});
    }
    for(const [counter,code,level] of [
      ['providerFailures','provider_failures_increased','critical'],
      ['capacityRejections','capacity_rejections_increased','warning'],
      ['upstreamReconnects','reconnects_increased','warning'],
      ['slowViewerDisconnects','slow_viewer_disconnects_increased','warning']
    ])if(delta[counter]>0)alert(code,level,{count:delta[counter]});

    const hls=autoHealth()||{};
    const hlsTotals={operatorPaths:0,failed:0,warning:0,stale:0,untested:0};
    if(hls?.ok===true&&Array.isArray(hls.paths)){
      const known=new Set();
      for(const path of hls.paths.slice(0,256)){
        if(typeof path?.path!=='string'||!HLS_PATH.test(path.path)||
           known.has(path.path))continue;
        known.add(path.path);hlsTotals.operatorPaths++;
        if(['failed','warning','stale','untested'].includes(path.status))
          hlsTotals[path.status]++;
        if(path.status==='failed'||path.status==='warning')
          alert('operator_hls_probe_failed','warning',{path:path.path});
      }
    }
    const current=new Map(alerts.map(a=>[a.id,a]));
    const raised=alerts.filter(a=>!lastActive.has(a.id));
    const resolved=[...lastActive.values()].filter(a=>!current.has(a.id));
    for(const a of raised){
      history.unshift({at:now,state:'raised',...a});totalRaised++;
    }
    for(const a of resolved)
      history.unshift({at:now,state:'resolved',...a});
    if(history.length>historyLimit)history.length=historyLimit;
    lastActive=current;

    const point={at:now,viewers:bounded(f.viewers,32768),
      activeFeeds:bounded(f.activeFeeds,64),alertCount:alerts.length,
      criticalCount:alerts.filter(a=>a.level==='critical').length,
      providerErrors:delta.providerFailures,
      capacityRejections:delta.capacityRejections,
      reconnects:delta.upstreamReconnects,
      sourceBytes:delta.sourceBytesReceived,
      viewerBytesQueued:delta.viewerBytesQueued,
      intervalMs:sinceMs};
    trends.push(point);
    if(trends.length>trendLimit)trends.splice(0,trends.length-trendLimit);
    lastReport={ok:true,checkedAt:now,
      scope:'shared_relay_and_operator_restream_only',
      isAllSubscribersMeasured:false,
      playbackQualityVerified:false,sourceRightsVerified:false,
      actionsTaken:0,readOnly:true,
      relayEnabled:relay.enabled===true,
      sharedLiveEnabled:relay.sharedLiveEnabled===true,
      capacity:{activeFeeds:bounded(f.activeFeeds,64),
        activeViewers:bounded(f.viewers,32768),maxFeeds,
        maxViewersPerFeed:maxViewers,
        capacityNote:'Internal shared-relay limits; not licensed provider capacity'},
      mediaLatency:{scope:'shared_ts_transport_only',decodedVideoVerified:false,
        windowMs:3600000,
        admissionToFirstBytes:safeLatency(f.mediaLatency?.admissionToFirstBytes),
        lastBytesToRecoveredBytes:safeLatency(f.mediaLatency?.lastBytesToRecoveredBytes)},
      channels,alertCount:alerts.length,criticalCount:
        alerts.filter(a=>a.level==='critical').length,
      alerts:alerts.slice(0,96),recentChanges:history.slice(0,historyLimit),
      totalRaised,sampleIntervalMs:sinceMs,deltas:delta,hls:hlsTotals,
      backgroundSampling:timer!==null,
      historyWindowMinutes:Math.round(sampleIntervalMs*trendLimit/60000),
      trend:trends.map(x=>({...x}))};
    return lastReport;
  }
  function sample(){
    try{return collect()}
    catch{
      // A corrupt telemetry source is NOT equivalent to zero incidents.
      lastReport={ok:false,code:'smart_ops_metrics_unavailable',
        checkedAt:clock(),readOnly:true,actionsTaken:0,
        scope:'shared_relay_and_operator_restream_only',
        isAllSubscribersMeasured:false,backgroundSampling:timer!==null,
        trend:trends.map(x=>({...x}))};
      return lastReport;
    }
  }
  function start(){
    if(timer)return;
    // Initialize the baseline even when nobody has the dashboard open.
    sample();
    timer=setInterval(sample,sampleIntervalMs);
    timer.unref?.();
    if(lastReport)lastReport={...lastReport,backgroundSampling:true};
  }
  function stop(){
    if(timer){clearInterval(timer);timer=null}
    if(lastReport)lastReport={...lastReport,backgroundSampling:false};
  }
  function snapshot(){
    // Browser requests never alter incident deltas when monitoring is on.
    // Tests/standalone consumers can still take ad-hoc snapshots before start.
    if(timer)return {...lastReport,trend:trends.map(x=>({...x})),
      recentChanges:Array.isArray(lastReport?.recentChanges)?
        lastReport.recentChanges.map(x=>({...x})):[]};
    return sample();
  }
  return {snapshot,start,stop,sample};
}


// Process-local counters only. Do not treat stale or failed telemetry as
// evidence of zero incidents. A delta crossing the rolling boundary or a
// sampling gap is not attributable to the measured window.
export function summarizeMediaHour(snap,now=Date.now()){
  const windowStart=now-3600000,maxGap=45000;
  const trend=(Array.isArray(snap?.trend)?snap.trend:[]).slice(-480)
    .filter(p=>Number.isSafeInteger(p?.at)&&p.at>=windowStart&&p.at<=now);
  const latest=trend[trend.length-1];
  const fresh=snap?.ok===true&&Number.isSafeInteger(snap.checkedAt)&&
    snap.checkedAt<=now&&now-snap.checkedAt<=maxGap&&
    latest?.at===snap.checkedAt;
  let coveredMs=0,measuredIntervals=0,lastEnd=windowStart;
  const totals={totalProviderFailures:0,totalReconnects:0,totalCapacityRejections:0};
  for(const p of trend){
    const interval=p.intervalMs;
    if(!Number.isSafeInteger(interval)||interval<=0||interval>maxGap||
       p.at-interval<lastEnd||
       ![p.providerErrors,p.reconnects,p.capacityRejections].every(n=>Number.isSafeInteger(n)&&n>=0))
      continue;
    lastEnd=p.at;coveredMs+=interval;measuredIntervals++;
    totals.totalProviderFailures+=p.providerErrors;
    totals.totalReconnects+=p.reconnects;
    totals.totalCapacityRejections+=p.capacityRejections;
  }
  const measured=fresh&&measuredIntervals>0&&Object.values(totals).every(Number.isSafeInteger);
  return {ok:fresh,readOnly:true,mediaCopied:false,customerTrafficChanged:false,
    isAllSubscribersMeasured:false,type:'rolling_media_observability_1h',
    evidenceState:!fresh?'unavailable':measured?'measured_intervals_only':'baseline_only',
    ...(!fresh?{code:'media_hour_metrics_unavailable'}:{}),
    samples:trend.length,measuredIntervals:fresh?measuredIntervals:0,
    observedWindowMinutes:measured?Math.round(coveredMs/60000*100)/100:0,
    totalProviderFailures:measured?totals.totalProviderFailures:null,
    totalReconnects:measured?totals.totalReconnects:null,
    totalCapacityRejections:measured?totals.totalCapacityRejections:null,
    lastCriticalCount:fresh&&Number.isSafeInteger(snap.criticalCount)&&snap.criticalCount>=0?snap.criticalCount:null,
    checkedAt:new Date(now).toISOString()};
}
