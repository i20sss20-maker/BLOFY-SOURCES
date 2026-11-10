// Operator-only end-to-end live sharing canary.
// Opens ONE licensed source feed and TWO local test readers, without changing
// any customer media route. No Xtream URL, credential, device or IP is returned.
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from './live-fanout.mjs';

function fail(code,details={}){
 return {ok:false,code,customerTrafficChanged:false,
   realVideoDecoded:false,realAudioDecoded:false,...details};
}
export async function probeLicensedSharedLive({
 sourceUrl,fetchImpl=fetch,lookup,redirectSourceOrigin='',
 approvedProviderRedirect=false,durationMs=26000,now=Date.now
}={}){
 if(typeof sourceUrl!=='string'||sourceUrl.length<12||
   !Number.isInteger(durationMs)||durationMs<120||durationMs>30000)
  return fail('pilot_invalid_configuration');
 // The source URL is resolved inside the authenticated portal after
 // explicit operator redistribution consent. Only this controlled canary may
 // follow one source-issued public CDN hop; no arbitrary user-supplied URL.
 let licensedRedirectOrigin=redirectSourceOrigin;
 if(approvedProviderRedirect===true){
   try{licensedRedirectOrigin=new URL(sourceUrl).origin}catch{}
 }
 const fanout=createLiveFanout({fetchImpl,lookup,
   redirectSourceOrigin:licensedRedirectOrigin,
   reconnectOnUpstreamEnd:true,maxFeeds:1,maxViewersPerFeed:2,
   minViewersToStart:2});
 const srv=http.createServer((req,res)=>{
   void fanout.handle(req,res,sourceUrl).catch(()=>{
     if(!res.headersSent)res.writeHead(502,{'cache-control':'no-store'});
     if(!res.writableEnded)res.end();
   });
 });
 const controllers=[new AbortController(),new AbortController()];
 const readers=[];
 const started=now();
 let result=fail('pilot_not_started'),phase='initializing';
 try{
  srv.listen(0,'127.0.0.1');await once(srv,'listening');
  const base='http://127.0.0.1:'+srv.address().port+'/probe';
  phase='connecting';
  const responses=await Promise.all(controllers.map(c=>
   fetch(base,{signal:c.signal,redirect:'manual'})));
  const diagnostics=()=>({
    upstreamSessions:fanout.stats().upstreamSessionsOpened,
    reconnects:fanout.stats().upstreamReconnects,
    // Fixed internal categories only, never raw provider URL or response body.
    failureCodes:Object.keys(fanout.stats().failureReasons||{})
      .filter(code=>/^[a-z_]{3,45}$/.test(code)).slice(0,8)
  });
  if(!responses.every(r=>r.status===200&&r.body))
    return fail('pilot_media_http_failure',diagnostics());
  if(!responses.every(r=>
    String(r.headers.get('content-type')||'').startsWith('video/mp2t')))
    return fail('pilot_source_not_ts',diagnostics());
  for(const response of responses)readers.push(response.body.getReader());
  phase='reading';
  const endAt=now()+durationMs;
  async function sample(reader){
    let bytes=0,packets=0,last=now(),largestGapMs=0;
    while(now()<endAt){
      let timer;
      const timeout=new Promise(resolve=>{
        timer=setTimeout(()=>resolve({timeout:true}),5000);
        timer.unref?.();
      });
      const chunk=await Promise.race([reader.read(),timeout])
        .finally(()=>clearTimeout(timer));
      if(chunk.timeout)return {ok:false,code:'pilot_media_stalled',bytes};
      if(chunk.done)return {ok:false,code:'pilot_stream_ended',bytes};
      const at=now();
      largestGapMs=Math.max(largestGapMs,at-last);last=at;
      const data=chunk.value;
      if(data?.byteLength)bytes+=data.byteLength;
      packets++;
    }
    return {ok:bytes>0,bytes,packets,largestGapMs};
  }
  const samples=await Promise.all(readers.map(sample));
  const stats=fanout.stats();
  if(!samples.every(x=>x.ok))return fail(samples.find(x=>!x.ok)?.code||'pilot_failed',{
    durationMs:now()-started,upstreamSessions:stats.upstreamSessionsOpened,
    reconnects:stats.upstreamReconnects});
  result={ok:true,code:stats.upstreamSessionsOpened===1?'shared_single_upstream_verified':
    'shared_with_sequential_reconnect',
    viewerSamples:2,durationMs:now()-started,
    upstreamSessions:stats.upstreamSessionsOpened,
    reconnects:stats.upstreamReconnects,
    sampleBytes:samples.map(x=>x.bytes),
    maxInterChunkGapMs:Math.max(...samples.map(x=>x.largestGapMs)),
    customerTrafficChanged:false,realVideoDecoded:false,realAudioDecoded:false};
  return result;
 }catch(error){
  const stats=fanout.stats();
  // These labels are predefined diagnostics, not arbitrary exception text.
  // Do NOT copy error.message, source URL, remote address or credentials.
  const type=String(error?.cause?.code||error?.code||error?.name||'');
  const safeTypes=new Set(['UND_ERR_SOCKET','ECONNRESET','ETIMEDOUT',
    'ABORT_ERR','ERR_STREAM_PREMATURE_CLOSE','AbortError','TypeError']);
  return fail('pilot_transport_unavailable',{
    durationMs:now()-started,phase,
    transportCode:safeTypes.has(type)?type:'other_transport',
    upstreamSessions:stats.upstreamSessionsOpened,
    reconnects:stats.upstreamReconnects,
    failureCodes:Object.keys(stats.failureReasons||{}).slice(0,8)
  });
 }finally{
  for(const c of controllers)c.abort();
  fanout.close();
  try{srv.closeAllConnections()}catch{}
  if(srv.listening)await new Promise(resolve=>srv.close(resolve));
  // Reader cancellation follows client abort, so no provider source is kept.
  for(const reader of readers){try{reader.releaseLock()}catch{}}
 }
}
