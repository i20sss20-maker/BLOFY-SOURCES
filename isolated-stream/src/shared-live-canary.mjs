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
 durationMs=26000,now=Date.now
}={}){
 if(typeof sourceUrl!=='string'||sourceUrl.length<12||
   !Number.isInteger(durationMs)||durationMs<120||durationMs>30000)
  return fail('pilot_invalid_configuration');
 const fanout=createLiveFanout({fetchImpl,lookup,redirectSourceOrigin,
   reconnectOnUpstreamEnd:true,maxFeeds:1,maxViewersPerFeed:2});
 const srv=http.createServer((req,res)=>{
   void fanout.handle(req,res,sourceUrl).catch(()=>{
     if(!res.headersSent)res.writeHead(502,{'cache-control':'no-store'});
     if(!res.writableEnded)res.end();
   });
 });
 const controllers=[new AbortController(),new AbortController()];
 const readers=[];
 const started=now();
 let result=fail('pilot_not_started');
 try{
  srv.listen(0,'127.0.0.1');await once(srv,'listening');
  const base='http://127.0.0.1:'+srv.address().port+'/probe';
  const responses=await Promise.all(controllers.map(c=>
   fetch(base,{signal:c.signal,redirect:'manual'})));
  if(!responses.every(r=>r.status===200)&&
    !responses.every(r=>r.headers.get('content-type')?.startsWith('video/mp2t')))
    return fail('pilot_source_not_ts',{upstreamSessions:fanout.stats().upstreamSessionsOpened});
  if(!responses.every(r=>r.status===200&&r.body&&
    String(r.headers.get('content-type')||'').startsWith('video/mp2t')))
    return fail('pilot_media_http_failure',{upstreamSessions:fanout.stats().upstreamSessionsOpened});
  for(const response of responses)readers.push(response.body.getReader());
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
 }catch{
  return fail('pilot_transport_unavailable',{durationMs:now()-started});
 }finally{
  for(const c of controllers)c.abort();
  fanout.close();
  try{srv.closeAllConnections()}catch{}
  if(srv.listening)await new Promise(resolve=>srv.close(resolve));
  // Reader cancellation follows client abort, so no provider source is kept.
  for(const reader of readers){try{reader.releaseLock()}catch{}}
 }
}
