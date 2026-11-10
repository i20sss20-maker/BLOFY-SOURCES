// Licensed shared TS readiness controller for operator and optional one-shot boot.
// Never persists or logs source URLs, Xtream credentials, subscriber identities,
// relay tokens, or raw provider error payloads. Does not modify customer routes.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHANNEL=/^[a-zA-Z0-9._-]{1,100}$/;
const CODES=new Set(['shared_single_upstream_verified',
  'shared_with_sequential_reconnect','pilot_media_http_failure',
  'pilot_source_not_ts','pilot_media_stalled','pilot_stream_ended',
  'pilot_transport_unavailable','pilot_source_unavailable',
  'pilot_source_auth_denied','pilot_source_invalid',
  'pilot_source_ambiguous','pilot_source_not_found',
  'pilot_catalog_unavailable','pilot_channel_not_found',
  'pilot_channel_ambiguous','pilot_source_not_enabled',
  'pilot_requires_live_ts','pilot_invalid_configuration',
  'pilot_bridge_unavailable','pilot_internal_error',
  'pilot_media_failure','pilot_not_started']);
const FAILURE_CODES=new Set(['provider_denied','provider_not_media','provider_not_ts',
  'provider_unavailable','fanout_upstream_ended','fanout_read_idle_timeout',
  'provider_redirect_denied','relay_private_origin','relay_origin_unresolved',
  'other_transport']);
const safeInt=(number,maximum)=>Number.isFinite(Number(number))?
  Math.min(maximum,Math.max(0,Math.floor(Number(number)))):0;
const safeCode=(code,fallback='pilot_media_failure')=>
  CODES.has(String(code||''))?String(code):fallback;
const notReady=(code)=>({ok:false,code,customerTrafficChanged:false,
  realVideoDecoded:false,realAudioDecoded:false});
export function createSharedLiveReadiness({
  portal,probe,now=Date.now,onResult=()=>{},
  sourceName='saleh',search='V SPORT',cooldownMs=60000
}={}){
  if(!portal||typeof probe!=='function')throw new Error('shared_readiness_invalid');
  if(!Number.isInteger(cooldownMs)||cooldownMs<0||cooldownMs>86400000)
    throw new Error('shared_readiness_cooldown_invalid');
  let busy=false,lastStartedAt=0,hasRun=false,last=null,totalRuns=0;
  const exactSource=String(sourceName||'').trim().toLocaleLowerCase('en-US');
  function sanitize(proof){
    const detail=proof&&typeof proof==='object'?proof:{};
    return {ok:detail.ok===true,code:safeCode(detail.code),
      customerTrafficChanged:false,realVideoDecoded:false,
      realAudioDecoded:false,viewerSamples:safeInt(detail.viewerSamples,2),
      upstreamSessions:safeInt(detail.upstreamSessions,100),
      reconnects:safeInt(detail.reconnects,100),
      durationMs:safeInt(detail.durationMs,60000),
      sampleBytes:Array.isArray(detail.sampleBytes)?
        detail.sampleBytes.slice(0,2).map(x=>safeInt(x,2_000_000_000)):[],
      maxInterChunkGapMs:safeInt(detail.maxInterChunkGapMs,60000),
      failureCodes:Array.isArray(detail.failureCodes)?
        [...new Set(detail.failureCodes.filter(x=>FAILURE_CODES.has(x)))].slice(0,8):[]};
  }
  async function scopedProbe(sourceId,channelId){
    let upstream;
    try{upstream=await portal.liveChannel({
      sourceId,channelId,rightsConfirmed:true
    })}catch{return notReady('pilot_bridge_unavailable')}
    if(upstream.status!==200||upstream.body?.ok!==true){
      const code=String(upstream.body?.code||'');
      return notReady(upstream.status===403||upstream.status===401||
        /denied|permission|not_authorized|rights/.test(code)
        ?'pilot_source_auth_denied':'pilot_source_unavailable');
    }
    if(upstream.body.kind!=='live'||upstream.body.extension!=='ts'||
      typeof upstream.body.sourceUrl!=='string')
      return notReady('pilot_requires_live_ts');
    try{return sanitize(await probe({sourceUrl:upstream.body.sourceUrl}))}
    catch{return notReady('pilot_transport_unavailable')}
  }
  async function guarded(mode,action){
    if(busy)return {status:429,body:notReady('pilot_in_progress')};
    if(hasRun&&now()-lastStartedAt<cooldownMs)
      return {status:429,body:notReady('pilot_rate_limited')};
    busy=true;hasRun=true;lastStartedAt=now();totalRuns++;
    let result;
    try{result=sanitize(await action())}
    catch{result=notReady('pilot_internal_error')}
    finally{busy=false}
    last={...result,checkedAt:new Date(now()).toISOString(),
      mode:mode==='boot'?'boot':'operator'};
    try{onResult({...last})}catch{}
    return {status:200,body:last};
  }
  function manual({sourceId,channelId,rightsConfirmed}={}){
    if(rightsConfirmed!==true)
      return Promise.resolve({status:403,body:notReady('stream_rights_confirmation_required')});
    if(!UUID.test(String(sourceId||''))||!CHANNEL.test(String(channelId||'')))
      return Promise.resolve({status:400,body:notReady('pilot_invalid_configuration')});
    return guarded('operator',()=>scopedProbe(sourceId,channelId));
  }
  async function auto(){
    return guarded('boot',async()=>{
      if(!portal.configured)return notReady('pilot_bridge_unavailable');
      let overview;
      try{overview=await portal.overview()}catch{return notReady('pilot_bridge_unavailable')}
      if(overview.status!==200||overview.body?.ok!==true)
        return notReady('pilot_bridge_unavailable');
      const sources=(Array.isArray(overview.body.sources)?overview.body.sources:[])
        .filter(x=>UUID.test(String(x.id||''))&&
          String(x.name||'').trim().toLocaleLowerCase('en-US')===exactSource);
      if(!sources.length)return notReady('pilot_source_not_found');
      if(sources.length!==1)return notReady('pilot_source_ambiguous');
      const src=sources[0];
      if(src.enabled!==true||src.publishCatalog!==true)
        return notReady('pilot_source_not_enabled');
      let catalog;
      try{catalog=await portal.catalog({
        type:'live',serverId:src.id,q:search,offset:0
      })}catch{return notReady('pilot_catalog_unavailable')}
      if(catalog.status!==200||catalog.body?.ok!==true)
        return notReady('pilot_catalog_unavailable');
      // Never guess a different broadcast: only one uniquely matching 4K
      // sport title is accepted. Ambiguity requires operator selection.
      const candidates=(Array.isArray(catalog.body.items)?catalog.body.items:[])
        .filter(x=>x.enabled===true&&CHANNEL.test(String(x.id||''))&&
          String(x.name||'').trim().toUpperCase().startsWith('4K: V SPORT'));
      if(!candidates.length)return notReady('pilot_channel_not_found');
      if(candidates.length!==1)return notReady('pilot_channel_ambiguous');
      return scopedProbe(src.id,String(candidates[0].id));
    });
  }
  function snapshot(){
    return {ok:true,state:busy?'running':last?'checked':'not_tested',
      totalRuns,customerTrafficChanged:false,
      last:last?{...last,sampleBytes:[...last.sampleBytes],
        failureCodes:[...last.failureCodes]}:null};
  }
  return {manual,auto,snapshot};
}
