// BLOFY STREAM Operations 2.0: read-only, bounded operator-scoped alerts.
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
function countedDiff(current,old){
  // Counters are process-lifetime. Restart/reset must never appear as a spike.
  return old===null||current<old?0:current-old;
}
export function createStreamOpsObservatory({
  relayStats=()=>null,autoHealth=()=>null,clock=Date.now,
  capacityWarningPercent=85,mediaStallMs=30000,historyLimit=50
}={}){
  if(typeof relayStats!=='function'||typeof autoHealth!=='function'||
     typeof clock!=='function'||!Number.isInteger(capacityWarningPercent)||
     capacityWarningPercent<60||capacityWarningPercent>99||
     !Number.isInteger(mediaStallMs)||mediaStallMs<15000||mediaStallMs>120000||
     !Number.isInteger(historyLimit)||historyLimit<1||historyLimit>100)
    throw Error('stream_ops_config_invalid');
  let previous=null,previousAt=null;
  let lastActive=new Map(),history=[],totalRaised=0;

  function snapshot(){
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

    return {ok:true,checkedAt:now,
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
      channels,alertCount:alerts.length,criticalCount:
        alerts.filter(a=>a.level==='critical').length,
      alerts:alerts.slice(0,96),recentChanges:history.slice(0,historyLimit),
      totalRaised,sampleIntervalMs:sinceMs,deltas:delta,hls:hlsTotals};
  }
  return {snapshot};
}
