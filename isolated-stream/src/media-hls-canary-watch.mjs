// Private periodic synthetic-only HLS transport proof for two MediaMTX
// instances. Fixed internal smoke paths; NO provider Xtream or subscriber
// traffic, credentials, recordings, or auto-migration.
import {verifyRestreamSmoke} from './restream-smoke.mjs';
const ENGINES=Object.freeze({
 primary:'http://blofy-stream-media.railway.internal:8888',
 standby:'http://blofy-stream-media-standby.railway.internal:8888'
});
const ROLES=Object.freeze(['primary','standby']);
const MAX_SAMPLES=14;
const MAX_HISTORY_MS=3600000;
const known=new Set(['synthetic_hls_ts_verified','restream_smoke_invalid_path',
 'restream_smoke_engine_unreachable','restream_smoke_auth_rejected',
 'restream_smoke_not_published','restream_smoke_http_error',
 'restream_smoke_manifest_invalid','restream_smoke_variant_missing',
 'restream_smoke_segment_missing','restream_smoke_not_mpegts',
 'restream_smoke_redirect_invalid','restream_smoke_failed',
 'restream_smoke_empty_body','restream_smoke_response_too_large']);
const safeCode=x=>known.has(x)?x:'synthetic_probe_failed';
export function createMediaHlsCanaryWatch({
 verify=verifyRestreamSmoke,fetchImpl=fetch,clock=Date.now,
 intervalMs=300000,logger=()=>{}
}={}){
 if(typeof verify!=='function'||typeof fetchImpl!=='function'||
  typeof clock!=='function'||typeof logger!=='function'||
  !Number.isSafeInteger(intervalMs)||intervalMs<60000||intervalMs>3600000)
  throw new Error('media_hls_canary_watch_invalid');
 const records=new Map(ROLES.map(role=>[role,[]]));
 let running=false,timer=null,nextAt=null,lastState=null;
 function snapshot(){
  const now=clock();
  const engines={};
  for(const role of ROLES){
   const recent=records.get(role).filter(x=>x.at>=now-MAX_HISTORY_MS);
   const last=recent.at(-1)||null;
   const pass=recent.filter(x=>x.ok).length;
   engines[role]={
    syntheticHlsState:!last?'unknown':last.ok?'verified':'failed',
    samples:recent.length,successfulSamples:pass,
    failedSamples:recent.length-pass,
    successRatePct:recent.length?Math.round(10000*pass/recent.length)/100:null,
    lastCode:last?.code||null,
    lastCheckedAt:last?new Date(last.at).toISOString():null,
    lastElapsedMs:last?.elapsedMs??null,
    observedWindowMinutes:recent.length>1
      ?Math.round((recent.at(-1).at-recent[0].at)/60000):0,
    // No synthetic HLS result establishes real licensed-source readiness.
    realProviderPlaybackVerified:false
   };
  }
  return {ok:true,enabled:timer!==null,readOnly:true,
   scope:'fixed_private_synthetic_hls_only',intervalMinutes:intervalMs/60000,
   providerRequests:0,customerTrafficChanged:false,realSourceVerified:false,
   playbackCodecsDecoded:false,recordingsCreated:false,
   running,checkedAt:Math.max(...ROLES.map(role=>
    records.get(role).at(-1)?.at||0))||null,
   engines,readiness:ROLES.every(r=>engines[r].syntheticHlsState==='verified')
    ?'synthetic_transport_verified':ROLES.some(r=>engines[r].syntheticHlsState==='failed')
    ?'synthetic_transport_failure':'synthetic_transport_unverified'
  };
 }
 async function check(){
  if(running)return snapshot();
  running=true;
  try{
   for(const role of ROLES){
    let result;
    try{
     // Each engine owns a local FFmpeg-generated 'smoke' path. The verifier
     // reads at most the first 564 bytes of its generated HLS segment.
     result=await verify(ENGINES[role],{
      fetchImpl,pathName:'smoke',timeoutMs:17000
     });
    }catch{result={ok:false,code:'synthetic_probe_failed'}}
    const item={
     at:clock(),ok:result?.ok===true&&result?.stage==='segment',
     code:safeCode(String(result?.code||'')),
     elapsedMs:Number.isSafeInteger(result?.elapsedMs)
      ?Math.min(60000,Math.max(0,result.elapsedMs)):null
    };
    const h=records.get(role);h.push(item);
    while(h.length>MAX_SAMPLES||h[0]?.at<clock()-MAX_HISTORY_MS)h.shift();
   }
   const state=snapshot();
   if(state.readiness!==lastState){
    lastState=state.readiness;
    logger({code:'synthetic_hls_state',state:lastState,
     primary:state.engines.primary.syntheticHlsState,
     standby:state.engines.standby.syntheticHlsState,
     providerRequests:0,customerTrafficChanged:false,realSourceVerified:false});
   }
   return state;
  }finally{running=false}
 }
 function start({delayMs=30000}={}){
  if(timer)return;
  if(!Number.isSafeInteger(delayMs)||delayMs<0||delayMs>120000)
   throw new Error('media_hls_canary_delay_invalid');
  nextAt=setTimeout(()=>{void check().catch(()=>{})},delayMs);
  nextAt.unref?.();
  timer=setInterval(()=>{void check().catch(()=>{})},intervalMs);
  timer.unref?.();
 }
 function stop(){
  if(timer)clearInterval(timer);
  if(nextAt)clearTimeout(nextAt);
  timer=null;nextAt=null;
 }
 return{start,stop,check,snapshot};
}
