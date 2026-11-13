// MediaMTX Origin -> private Read Replica synthetic proof.
// Never accepts a source URL, Xtream account, channel name, public host or
// per-subscriber input. The single fixed path is MediaMTX's INTERNAL smoke.
// Output is a bounded aggregate, never media bytes or client information.
const PRIVATE='http://blofy-stream-read-replica.railway.internal:8888';
const PREFIX='/smoke/';
async function bounded(response,max,{firstOnly=false}={}){
 if(!response.body)throw Error('replica_empty_body');
 if(!firstOnly&&Number(response.headers.get('content-length')||0)>max)
   throw Error('replica_response_too_large');
 const reader=response.body.getReader(),chunks=[];
 let total=0,done=false;
 try{
   for(;;){
     const part=await reader.read();
     if(part.done){done=true;break}
     const bytes=Buffer.from(part.value||[]);
     if(firstOnly){
       const take=Math.min(bytes.length,max-total);
       if(take>0){chunks.push(bytes.subarray(0,take));total+=take}
       if(total>=max)break;
     }else{
       total+=bytes.length;
       if(total>max)throw Error('replica_response_too_large');
       chunks.push(bytes);
     }
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
 let requests=0,stage='playlist',httpStatus=null,lastSafePath=null,redirectCount=0;
 let cookie='';
 async function get(path,max,{firstOnly=false}={}){
   let target=new URL(path,PRIVATE);
   function allowed(url){
     return url.origin===PRIVATE&&url.pathname.startsWith(PREFIX)&&
       !url.username&&!url.password&&!url.hash&&
       url.search.length<=140&&url.href.length<500;
   }
   if(!allowed(target))throw Error('replica_invalid_segment');
   for(let redirects=0;redirects<=3;redirects++){
     requests++;
     lastSafePath=target.pathname;
     let response;
     try{
       response=await fetchImpl(target,{
         method:'GET',redirect:'manual',cache:'no-store',
         signal:AbortSignal.timeout(timeoutMs),
         headers:{accept:'application/vnd.apple.mpegurl,video/mp2t',
           ...(cookie?{cookie}:{})}
       });
     }catch{throw Error('replica_private_unreachable')}
     const setCookie=response.headers.get('set-cookie')||'';
     const matched=/^([a-zA-Z0-9_-]{1,40}=[a-zA-Z0-9_.-]{1,100})(?:;|$)/.exec(setCookie);
     if(matched)cookie=matched[1];
     if([301,302,303,307,308].includes(response.status)){
       const location=response.headers.get('location');
       try{await response.body?.cancel?.()}catch{}
       if(!location||redirects===3)throw Error('replica_redirect_invalid');
       let next;
       try{next=new URL(location,target)}catch{throw Error('replica_redirect_invalid')}
       if(!allowed(next))throw Error('replica_redirect_invalid');
       target=next;redirectCount++;
       continue;
     }
     if(!response.ok){
       httpStatus=response.status;
       try{await response.body?.cancel?.()}catch{}
       throw Error([401,403].includes(response.status)?'replica_auth_denied':
         response.status===404?'replica_path_not_ready':'replica_http_error');
     }
     return bounded(response,max,{firstOnly});
   }
   throw Error('replica_redirect_invalid');
 }
 // HLS starts on demand. MediaMTX can answer 500 briefly until the
 // private RTSP source publishes its first keyframe/segment. Retry ONLY the
 // internal synthetic playlist with a strict total attempt cap; never retry
 // Xtream provider or arbitrary URLs.
 async function getWarmPlaylist(url){
   for(let attempt=0;attempt<12;attempt++){
     try{return (await get(url,48*1024)).toString('utf8')}
     catch(error){
       const retryable=['replica_http_error','replica_path_not_ready'].includes(error?.message);
       if(!retryable||attempt===11)throw error;
       await wait(900);
     }
   }
   throw Error('replica_probe_failed');
 }
 function mediaChild(reference,base,{segment=false}={}){
   const raw=String(reference||'').trim();
   // Only fixed synthetic relative paths; no provider URLs, ports, scheme,
   // encoded traversal, absolute paths, or unsafe query keys.
   if(!raw||raw.length>240||raw.startsWith('/')||raw.includes('%')||
     /[\\\\\r\n]/.test(raw))throw Error('replica_invalid_segment');
   let url;try{url=new URL(raw,PRIVATE+base)}catch{
     throw Error('replica_invalid_segment');
   }
   if(url.origin!==PRIVATE||!url.pathname.startsWith(PREFIX)||
     url.username||url.password||url.hash||
     /\/\.\.?\//.test(url.pathname))throw Error('replica_invalid_segment');
   const file=url.pathname.slice(PREFIX.length);
   const valid=segment?/^[a-zA-Z0-9_-]{1,110}\.ts$/.test(file):
     /^(?:stream|video[0-9]+_stream|audio[0-9]+_stream)\.m3u8$/.test(file);
   if(!valid)throw Error('replica_invalid_segment');
   for(const [key,value] of url.searchParams){
     if(!['session','cookieCheck'].includes(key)||value.length>150)
       throw Error('replica_invalid_segment');
   }
   return url.pathname+url.search;
 }
 try{
   let playlistPath='/smoke/index.m3u8';
   let playlist=await getWarmPlaylist(playlistPath);
   if(!playlist.startsWith('#EXTM3U'))throw Error('replica_invalid_manifest');
   // MediaMTX generally serves a master playlist followed by a session-
   // scoped child playlist. Do not look for EXTINF in the master indefinitely.
   if(playlist.includes('#EXT-X-STREAM-INF')){
     const variant=playlist.split(/\r?\n/).map(x=>x.trim())
       .find(x=>x&&!x.startsWith('#'));
     if(!variant)throw Error('replica_invalid_manifest');
     playlistPath=mediaChild(variant,PRIVATE+playlistPath);
     stage='variant';
     playlist=await getWarmPlaylist(playlistPath);
   }
   for(let attempt=0;attempt<5;attempt++){
     if(!playlist.startsWith('#EXTM3U'))throw Error('replica_invalid_manifest');
     const match=/#EXTINF:[^\r\n]*\r?\n([^#\r\n]+)/.exec(playlist);
     if(match){
       const path=mediaChild(match[1],playlistPath,{segment:true});
       stage='segment';
       const bytes=await get(path,188*4,{firstOnly:true});
       if(bytes.length<188*2||bytes[0]!==0x47||bytes[188]!==0x47)
         throw Error('replica_invalid_ts');
       return {ok:true,code:'private_replica_synthetic_ts_verified',
         stage:'segment',transportVerified:true,bytesVerified:bytes.length,httpStatus:200,
         redirectCount,requests,elapsedMs:Date.now()-started,
         mediaSource:'synthetic_only',deliveryMode:'private_hls_read_through',
         realSalehVerified:false,audioVideoDecoded:false,
         originUpstreamConnectionVerified:false,customerTrafficChanged:false};
     }
     if(attempt===4)break;
     await wait(1100);
     playlist=await getWarmPlaylist(playlistPath);
   }
   throw Error('replica_segment_not_ready');
 }catch(err){
   const allowed=new Set(['replica_empty_body','replica_response_too_large',
     'replica_invalid_segment','replica_redirect_invalid','replica_private_unreachable','replica_auth_denied',
     'replica_path_not_ready','replica_http_error','replica_invalid_manifest',
     'replica_invalid_ts','replica_segment_not_ready']);
   const code=allowed.has(err?.message)?err.message:'replica_probe_failed';
   return {ok:false,code,stage,transportVerified:false,httpStatus,
     lastSafePath,redirectCount,
     requests,elapsedMs:Date.now()-started,realSalehVerified:false,
     audioVideoDecoded:false,originUpstreamConnectionVerified:false,
     customerTrafficChanged:false};
 }
}
