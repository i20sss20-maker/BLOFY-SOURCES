// MediaMTX Origin -> private Read Replica synthetic proof.
// Never accepts a source URL, Xtream account, channel name, public host or
// per-subscriber input. The single fixed path is MediaMTX's INTERNAL smoke.
// Output is a bounded aggregate, never media bytes or client information.
const PRIVATE='http://blofy-stream-read-replica.railway.internal:8888';
const PREFIX='/smoke/';
async function bounded(response,max){
 if(!response.body)throw Error('replica_empty_body');
 if(Number(response.headers.get('content-length')||0)>max)
   throw Error('replica_response_too_large');
 const reader=response.body.getReader(),chunks=[];
 let total=0,done=false;
 try{
   for(;;){
     const part=await reader.read();
     if(part.done){done=true;break}
     const bytes=Buffer.from(part.value||[]);
     total+=bytes.length;
     if(total>max)throw Error('replica_response_too_large');
     chunks.push(bytes);
   }
   return Buffer.concat(chunks,total);
 }finally{
   if(!done){try{await reader.cancel()}catch{}}
   try{reader.releaseLock()}catch{}
 }
}
export async function verifyReadReplicaSynthetic({
 fetchImpl=fetch,timeoutMs=20000,
 wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)
   throw Error('replica_probe_timeout_invalid');
 const started=Date.now();
 let requests=0,stage='playlist';
 async function get(path,max){
   const url=new URL(path,PRIVATE);
   if(url.origin!==PRIVATE||!url.pathname.startsWith(PREFIX)||
      url.search||url.hash||url.username||url.password)
     throw Error('replica_invalid_segment');
   requests++;
   let response;
   try{
     response=await fetchImpl(url,{
       method:'GET',redirect:'manual',cache:'no-store',
       signal:AbortSignal.timeout(timeoutMs),
       headers:{accept:'application/vnd.apple.mpegurl,video/mp2t'}
     });
   }catch{throw Error('replica_private_unreachable')}
   if(!response.ok){
     try{await response.body?.cancel?.()}catch{}
     throw Error(response.status===403?'replica_auth_denied':
       response.status===404?'replica_path_not_ready':'replica_http_error');
   }
   return bounded(response,max);
 }
 try{
   const url='/smoke/index.m3u8';
   let playlist=(await get(url,48*1024)).toString('utf8');
   for(let attempt=0;attempt<5;attempt++){
     if(!playlist.startsWith('#EXTM3U'))throw Error('replica_invalid_manifest');
     const match=/#EXTINF:[^\r\n]*\r?\n([^#\r\n]+)/.exec(playlist);
     if(match){
       const file=match[1].trim();
       // The replica may only serve a local segment within its synthetic
       // path. Absolutely no redirects, external hosts or relative ../.
       if(!/^[a-zA-Z0-9_-]{1,90}\.ts$/.test(file))
         throw Error('replica_invalid_segment');
       stage='segment';
       const bytes=await get(PREFIX+file,188*4);
       if(bytes.length<188*2||bytes[0]!==0x47||bytes[188]!==0x47)
         throw Error('replica_invalid_ts');
       return {ok:true,code:'private_replica_synthetic_ts_verified',
         stage:'segment',transportVerified:true,bytesVerified:bytes.length,
         requests,elapsedMs:Date.now()-started,mediaSource:'synthetic_only',
         realSalehVerified:false,audioVideoDecoded:false,
         originUpstreamConnectionVerified:false,customerTrafficChanged:false};
     }
     if(attempt===4)break;
     await wait(1100);
     playlist=(await get(url,48*1024)).toString('utf8');
   }
   throw Error('replica_segment_not_ready');
 }catch(err){
   const allowed=new Set(['replica_empty_body','replica_response_too_large',
     'replica_invalid_segment','replica_private_unreachable','replica_auth_denied',
     'replica_path_not_ready','replica_http_error','replica_invalid_manifest',
     'replica_invalid_ts','replica_segment_not_ready']);
   const code=allowed.has(err?.message)?err.message:'replica_probe_failed';
   return {ok:false,code,stage,transportVerified:false,
     requests,elapsedMs:Date.now()-started,realSalehVerified:false,
     audioVideoDecoded:false,originUpstreamConnectionVerified:false,
     customerTrafficChanged:false};
 }
}
