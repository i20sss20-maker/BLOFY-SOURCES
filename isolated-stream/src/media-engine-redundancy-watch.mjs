// Read-only MediaMTX primary/standby reliability monitor.
// Uses PRIVATE fixed control API endpoints only; no media fetch, no source
// URL, credentials, subscribers, recording or automatic customer cutover.
const CONTROL={
 primary:'http://blofy-stream-media.railway.internal:9997',
 standby:'http://blofy-stream-media-standby.railway.internal:9997'
};
const ROLES=Object.freeze(['primary','standby']);
function safeSummary(row,now){
 const h=row.history;
 const cutoff=now-60*60*1000;
 const recent=h.filter(x=>x.at>=cutoff);
 const last=recent[recent.length-1]||null;
 const up=recent.filter(x=>x.ok).length;
 const down=recent.length-up;
 const windowMinutes=recent.length<2?0:
   Math.max(0,Math.round((recent.at?.(-1)?.at-recent[0].at)/60000));
 const state=!last?'unknown':last.ok?'available':
   !recent.at(-2)?.ok?'unavailable':'degraded';
 return {
  state,samples:recent.length,healthySamples:up,failedSamples:down,
  availabilityPct:recent.length?Math.round(10000*up/recent.length)/100:null,
  observationWindowMinutes:windowMinutes,
  checkedAt:last?new Date(last.at).toISOString():null,
  lastError:last?.ok?null:last?.code||null,
  // "available" means API is reachable, NOT media playback was tested.
  controlApiReachable:last?.ok===true,
  configuredPaths:last?.ok?last.paths:null
 };
}
export function createMediaEngineRedundancyWatch({
 fetchImpl=fetch,clock=Date.now,controlPassword='',
 intervalMs=60000,logger=()=>{}
}={}){
 if(typeof fetchImpl!=='function'||typeof clock!=='function'||
  typeof logger!=='function'||!Number.isInteger(intervalMs)||
  intervalMs<10000||intervalMs>120000)
  throw Error('media_engine_watch_invalid');
 const configured=typeof controlPassword==='string'&&controlPassword.length>=32;
 const headers=configured?{
  authorization:'Basic '+Buffer.from('blofy-control:'+controlPassword).toString('base64'),
  accept:'application/json'
 }:null;
 const data=Object.fromEntries(ROLES.map(name=>[name,{history:[]}]));
 let timer=null,active=false,lastTransition=null;
 const safeCode=(code)=>['engine_unreachable','engine_http_error',
  'engine_auth_failed','engine_invalid_response','engine_unconfigured']
  .includes(code)?code:'engine_unreachable';
 async function probe(role){
  if(!configured)return {ok:false,code:'engine_unconfigured',paths:null};
  const controller=new AbortController(),t=setTimeout(()=>controller.abort(),4500);
  try{
   const reply=await fetchImpl(CONTROL[role]+'/v3/config/paths/list',{
    method:'GET',headers,redirect:'error',cache:'no-store',signal:controller.signal
   });
   if(reply.status===401||reply.status===403)
    return {ok:false,code:'engine_auth_failed',paths:null};
   if(!reply.ok)
    return {ok:false,code:'engine_http_error',paths:null};
   const max=128*1024;
   if(Number(reply.headers.get('content-length')||0)>max)
    return {ok:false,code:'engine_invalid_response',paths:null};
   const raw=await reply.text();
   if(Buffer.byteLength(raw)>max)
    return {ok:false,code:'engine_invalid_response',paths:null};
   let body;try{body=JSON.parse(raw)}catch{
    return {ok:false,code:'engine_invalid_response',paths:null};
   }
   if(!Array.isArray(body?.items))
    return {ok:false,code:'engine_invalid_response',paths:null};
   return {ok:true,code:'ok',paths:body.items.length};
  }catch{
   return {ok:false,code:'engine_unreachable',paths:null};
  }finally{clearTimeout(t)}
 }
 function snapshot(){
  const now=clock();
  const engines=Object.fromEntries(ROLES.map(role=>
   [role,safeSummary(data[role],now)]));
  const primary=engines.primary,standby=engines.standby;
  return {
   ok:true,configured,readOnly:true,scope:'private_mediamtx_control_apis',
   mediaBytesRead:0,providerRequests:0,customerTrafficChanged:false,
   autoFailoverEnabled:false,recordingEnabledByMonitor:false,
   livePlaybackVerified:false,monitoringActive:timer!==null,
   observationWindowTargetMinutes:60,
   checkedAt:primary.checkedAt||standby.checkedAt||null,engines,
   readiness:!configured?'control_credentials_unconfigured':
    primary.controlApiReachable&&standby.controlApiReachable?
     'both_control_apis_reachable':
    !primary.controlApiReachable&&standby.controlApiReachable?
     'primary_unreachable_standby_api_reachable':
    primary.controlApiReachable&&!standby.controlApiReachable?
     'standby_control_api_unreachable':'both_control_apis_unreachable'
  };
 }
 async function check(){
  if(active)return snapshot();
  active=true;
  try{
   const at=clock();
   const result=await Promise.all(ROLES.map(role=>probe(role)));
   for(let i=0;i<ROLES.length;i++){
    const role=ROLES[i],r=result[i],h=data[role].history;
    h.push({at,ok:r.ok,paths:r.paths,code:safeCode(r.code)});
    while(h.length>65||h[0]?.at<at-60*60*1000)h.shift();
   }
   const fresh=snapshot();
   // Aggregate state only, no private URLs or identifiers in logs.
   if(lastTransition!==fresh.readiness){
    lastTransition=fresh.readiness;
    logger({code:'media_redundancy_state',readiness:fresh.readiness,
     primary:fresh.engines.primary.state,standby:fresh.engines.standby.state,
     mediaBytesRead:0,providerRequests:0,customerTrafficChanged:false});
   }
   return fresh;
  }finally{active=false}
 }
 function start(){
  if(timer)return;
  timer=setInterval(()=>{void check().catch(()=>{})},intervalMs);
  timer.unref?.();
  void check().catch(()=>{});
 }
 function stop(){
  if(timer)clearInterval(timer);
  timer=null;
 }
 return{start,stop,check,snapshot};
}
