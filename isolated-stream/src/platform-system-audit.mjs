import {triagePlatformChecks} from './platform-audit-triage.mjs';
// BLOFY STREAM NextGen: a single, read-only operator audit.
// It never probes a new media stream, reindexes catalogs, rotates a code,
// retries an upstream connection, or exposes provider/customer credentials.
// Every check is a bounded aggregate of *existing* trusted health surfaces.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_COUNTS=100_000_000;
const n=value=>{
  const x=Number(value);
  return Number.isFinite(x)&&x>=0?Math.min(MAX_COUNTS,Math.trunc(x)):0;
};
const check=(id,status,code,metrics={})=>({id,status,code,metrics});
const ok=result=>result?.status===200&&result.body?.ok===true;
function checked(result,id,onPass){
  if(!ok(result))return check(id,'unknown','data_unavailable');
  try{return onPass(result.body)}
  catch{return check(id,'unknown','invalid_data')}
}
function publicMedia(health){
  const totals=health?.totals||{};
  if(health?.ok!==true)return check('restream','unknown','monitor_unavailable');
  const paths=n(totals.paths),failed=n(totals.failed),warning=n(totals.warning),
    checking=n(totals.checking),untested=n(totals.untested),stale=n(totals.stale);
  return check('restream',failed||warning?'warning':paths&&!(untested||stale||checking)?'ok':'unknown',
    failed||warning?'operator_paths_failed':paths?'operator_paths_not_all_verified':'no_operator_paths',
    {paths,failed,warning,untested,stale,checking});
}
function sourceSelection(sources,wanted){
  const items=Array.isArray(sources)?sources.slice(0,120):[];
  const chosen=wanted?items.find(x=>x.id===wanted):items.find(x=>
    x.enabled===true&&String(x.name||'').trim().toLowerCase()==='saleh')||
    items.find(x=>x.enabled===true);
  return chosen&&UUID.test(String(chosen.id||''))?chosen:null;
}
function safePlayback(payload){
  const p=payload?.livePlayback;
  if(!p||typeof p!=='object')return check('playback','unknown','metrics_not_available');
  const started=n(p.started),failed=n(p.failed),interrupted=n(p.interrupted),
    slowStarts=n(p.slowStarts),p95=Number.isFinite(p.p95StartMs)?n(p.p95StartMs):null,
    shortEnds=n(p.shortLiveUpstreamEnds),closed=n(p.clientOrProxyClosed);
  const attempts=started+failed;
  const errorPercent=attempts?Math.round(100*failed/attempts):null;
  const bad=failed>=3||interrupted>=3||(errorPercent!==null&&errorPercent>=25&&attempts>=6);
  return check('playback',bad?'warning':started?'ok':'unknown',
    bad?'recent_playback_failures':started?'relay_start_events_recorded':'no_playback_samples',
    {started,failed,interrupted,slowStarts,p95StartMs:p95,shortLiveEnds:shortEnds,
      clientClosed:closed,errorPercent,windowMinutes:60,
      decodedByEndDevice:false});
}
function media404(body){
  const entries=Array.isArray(body?.entries)?body.entries.slice(0,100):[];
  const missing=entries.filter(e=>e.state==='missing').reduce((total,row)=>total+n(row.count),0);
  const due=entries.filter(e=>e.state==='missing').reduce((total,row)=>total+n(row.due),0);
  const recovered=entries.filter(e=>e.state==='recovered').reduce((total,row)=>total+n(row.count),0);
  return check('media404',missing?'warning':'ok',
    missing?'verified_provider_404_recorded':'no_verified_404_recorded',
    {missing,due,recovered,scope:'verified_upstream_404_only'});
}
export function createPlatformSystemAudit({
  portal,engineStatus,mediaControl,autoHealth,liveSupervisor=null,
  releaseInspector=null,relayStats=()=>({}),
  clock=Date.now,cacheMs=30_000
}={}){
  if(!portal||typeof portal.overview!=='function'||
    typeof engineStatus!=='function'||!mediaControl||
    typeof mediaControl.overview!=='function'||
    typeof autoHealth!=='function'||
    !Number.isInteger(cacheMs)||cacheMs<1000||cacheMs>300000)
    throw Error('platform_system_audit_configuration_invalid');
  const cached=new Map(),inflight=new Map();
  async function audit({sourceId=''}={}){
    const requested=String(sourceId||'');
    if(requested&&!UUID.test(requested))return {
      ok:false,code:'platform_audit_source_invalid'};
    const key=requested||'default',now=clock();
    const old=cached.get(key);
    if(old&&now-old.created<cacheMs)return {...old.data,cacheHit:true};
    if(inflight.has(key))return inflight.get(key);
    const promise=(async()=>{
      // All requests are either in-process or existing *read-only* endpoints.
      // Never request a stream URL, credentials, or run a source test/sync.
      const results=await Promise.allSettled([
        portal.overview(),
        portal.mediaFailures({}),
        portal.salesSummary(),
        portal.libraryAIStatus(),
        engineStatus(),
        mediaControl.overview(),
        typeof portal.mediaQuality==='function'?portal.mediaQuality():null,
        releaseInspector?.inspect?.()||null
      ]);
      const get=i=>results[i].status==='fulfilled'?results[i].value:null;
      const overview=get(0),overviewOk=ok(overview),body=overviewOk?overview.body:{};
      const sources=Array.isArray(body.sources)?body.sources:[];
      const selected=sourceSelection(sources,requested);
      const stats=body.totals||{};
      const enabled=n(stats.enabled),online=n(stats.online),total=n(stats.servers);
      const sourceMetrics={total,enabled,online};
      const checks=[
        check('bridge',overviewOk?'ok':'unknown',
          overviewOk?'primary_bridge_responded':'primary_bridge_unavailable'),
        check('sources',!overviewOk?'unknown':!enabled?'warning':online<enabled?'warning':'ok',
          !overviewOk?'data_unavailable':!enabled?'no_enabled_sources':
            online<enabled?'sources_not_all_online':'reported_sources_online',sourceMetrics),
        ...['live','movie','series'].map(type=>{
          const count=overviewOk?n(stats[type]):0;
          return check('catalog_'+type,!overviewOk?'unknown':count?'ok':'warning',
            !overviewOk?'data_unavailable':count?'indexed_items_present':'no_indexed_items',
            {items:count,playbackVerified:false});
        }),
        checked(get(1),'media404',media404),
        checked(get(2),'codes',b=>check('codes','ok','sales_ledger_available',
          {total:n(b?.total??b?.totals?.total),expiringSoon:n(b?.expiring_soon)})),
        checked(get(3),'libraryAI',b=>check('libraryAI',b.configured?'ok':'unknown',
          b.configured?'assistance_configured':'assistance_not_configured',
          {configured:b.configured===true,automaticPublish:false})),
        check('subscribers',!overviewOk||!body.subscribers?.gateway?'unknown':'ok',
          !overviewOk?'data_unavailable':body.subscribers?.gateway?
            'subscription_counts_available':'subscriber_stats_unavailable',
          {active:body.subscribers?.gateway?n(body.subscribers.gateway.active):0,
           total:body.subscribers?.gateway?n(body.subscribers.gateway.total):0}),
      ];
      const engine=get(4),media=get(5);
      checks.push(check('engine',!engine?'unknown':engine.reachable?'ok':'warning',
        !engine?'probe_unavailable':engine.reachable?'media_listener_replied':'media_listener_unreachable',
        {httpStatus:Number.isInteger(engine?.httpStatus)?engine.httpStatus:null}));
      checks.push(check('mediamtx',!media?'unknown':media.online?'ok':'warning',
        !media?'control_unavailable':media.online?'mediamtx_control_online':'mediamtx_control_offline',
        {readyPaths:n(media?.readyPaths),hlsSessions:n(media?.hlsSessions)}));
      let monitored;try{monitored=autoHealth()}catch{monitored=null}
      checks.push(publicMedia(monitored));
      let fanout;try{fanout=relayStats()||{}}catch{fanout={}}
      checks.push(check('fanout',fanout&&fanout.enabled===true?'ok':'unknown',
        fanout?.enabled===true?'fanout_runtime_available':'fanout_runtime_not_verified',
        {activeFeeds:n(fanout?.fanout?.activeFeeds),
          viewers:n(fanout?.fanout?.viewers),
          sourceOutages:n(fanout?.fanout?.sourceOutages),
          providerFailures:n(fanout?.fanout?.providerFailures)}));
      const quality=get(6);
      const qBody=ok(quality)?quality.body:null;
      for(const kind of ['live','movie','series']){
        const sample=qBody?.byKind?.[kind];
        if(!sample){checks.push(check('quality_'+kind,'unknown','media_quality_unavailable'));continue}
        const started=n(sample.started),failed=n(sample.failed),
          interrupted=n(sample.interrupted);
        const attempts=started+failed;
        const pct=attempts?Math.round(failed*100/attempts):null;
        const bad=failed>=3||interrupted>=3||
          (attempts>=6&&pct!==null&&pct>=25);
        checks.push(check('quality_'+kind,bad?'warning':started?'ok':'unknown',
          bad?'media_relay_failures':started?'media_relay_starts':'no_playback_samples',
          {started,failed,interrupted,errorPercent:pct,decodedOnClient:false}));
      }
      const p95=qBody?.p95StartMs;
      checks.push(check('quality_startup',!qBody?'unknown':
        qBody.started<6?'unknown':
        Number.isFinite(p95)&&p95>6500?'warning':'ok',
        !qBody?'media_quality_unavailable':qBody.started<6?'insufficient_startup_samples':
        Number.isFinite(p95)&&p95>6500?'slow_playback_start':'startup_telemetry_available',
        {started:n(qBody?.started),p95StartMs:Number.isFinite(p95)?n(p95):null,
         slowStarts:n(qBody?.slowStarts)}));
      if(selected){
        const item=await Promise.allSettled([portal.opsSourceStats({sourceId:selected.id})]);
        const sourceStats=item[0].status==='fulfilled'?item[0].value:null;
        checks.push(checked(sourceStats,'playback',safePlayback));
        checks.push(checked(sourceStats,'sourceCapacity',body=>{
          const capacity=body.liveSourceCapacity;
          if(!capacity||typeof capacity!=='object')
            return check('sourceCapacity','unknown','source_capacity_unavailable');
          const max=capacity.maxConnections,active=capacity.activeConnections;
          const hasMax=Number.isInteger(max)&&max>=0&&max<=1000000;
          const hasActive=Number.isInteger(active)&&active>=0&&active<=1000000;
          const prohibited=capacity.restreamer===false||max===0;
          const atLimit=hasMax&&hasActive&&max>0&&active>=max;
          const constrained=hasMax&&max===1;
          const status=prohibited||atLimit||constrained?'warning':'unknown';
          return check('sourceCapacity',status,
            prohibited?'source_restream_or_capacity_denied':
            atLimit?'source_upstream_at_limit':
            constrained?'source_single_connection_only':
            hasMax?'source_capacity_reported_not_load_tested':
            'source_upstream_capacity_unknown',
            {maxConnections:hasMax?max:null,
             activeConnections:hasActive?active:null,
             restreamer:capacity.restreamer===true,
             sharedUpstreamForCodes:capacity.sourceAccountSharedByCodes===true,
             productionViewersVerified:false});
        }));
      }else{
        checks.push(check('playback','unknown','source_not_selected'));
        checks.push(check('sourceCapacity','unknown','source_not_selected'));
      }
      const releaseResult=get(7);
      const release=releaseResult&&typeof releaseResult==='object'?releaseResult:null;
      checks.push(check('appUpdates',release?.ok&&release.metadataConsistent===false?
        'warning':'unknown',
        release?.metadataConsistent?'release_manifest_consistent_apk_unverified':
          release?.ok?'release_manifest_mismatch':'release_manifest_not_verified',
        {versionCode:Number.isSafeInteger(release?.versionCode)?release.versionCode:null,
          sha256FieldPresent:release?.sha256FieldPresent===true,
          apkBytesVerified:false,signatureVerified:false,deviceUpdateTested:false}));
      // Passive MPEG-TS PAT/PMT metadata is useful for finding missing
      // declared audio tracks, but never proves that a device decodes sound.
      let operatorPaths=[];
      try{
        const listed=liveSupervisor?.list?.();
        operatorPaths=Array.isArray(listed?.items)?listed.items.slice(0,64):[];
      }catch{}
      const feedChannels=Array.isArray(fanout?.fanout?.channels)?
        fanout.fanout.channels.slice(0,64):[];
      const signals=[...operatorPaths.map(x=>x.mediaTracks),
        ...feedChannels.map(x=>x.audio)].filter(Boolean);
      const declaredAudio=signals.filter(x=>x.status==='audio-stream-declared').length;
      const missingAudio=signals.filter(x=>x.status==='no-audio-stream-declared').length;
      checks.push(check('audio',missingAudio?'warning':'unknown',
        missingAudio?'pmt_audio_missing':declaredAudio?
          'audio_track_metadata_detected':'audio_track_not_decoded',
        {observed:signals.length,declaredAudio,missingAudio,
          decodedOnClient:false}));
      // A successful catalog query/health endpoint never proves that device
      // codecs, audio, subtitles, playback or an installed APK work.
      for(const [id,code] of [
        ['episodes','episode_playback_not_sampled'],
        ['subtitles','subtitle_render_not_tested'],
        ['backup','restore_test_not_observed']
      ])checks.push(check(id,'unknown',code));
      const summary={ok:checks.filter(x=>x.status==='ok').length,
        warning:checks.filter(x=>x.status==='warning').length,
        unknown:checks.filter(x=>x.status==='unknown').length};
      const data={
        ok:true,readOnly:true,customerTrafficChanged:false,
        mediaBytesFetched:false,checkedAt:clock(),cacheHit:false,
        source:selected?{id:selected.id,name:String(selected.name||'').slice(0,80)}:null,
        checks,summary,recommendations:triagePlatformChecks(checks),
        note:'Status reflects available signals, not guaranteed successful device playback.'
      };
      cached.set(key,{created:clock(),data});
      if(cached.size>6)cached.delete(cached.keys().next().value);
      return data;
    })().catch(()=>({ok:false,code:'platform_audit_temporarily_unavailable'}))
      .finally(()=>inflight.delete(key));
    inflight.set(key,promise);return promise;
  }
  return {audit};
}
