// Binary owner-only MP4 preview stream through the already authenticated
// STREAM /operator console. No source/media URLs or bearer tokens in HTML.
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const MAX=12*1024*1024,MAX_TIMELINE=18*1024*1024;
function failure(res,status,code){
 if(res.headersSent){if(!res.destroyed)res.destroy();return}
 const data=Buffer.from(JSON.stringify({ok:false,code}));
 res.writeHead(status,{'content-type':'application/json',
  'cache-control':'no-store','content-length':String(data.length),
  'x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
 res.end(data);
}
// Accept only bounded, non-sensitive internal error codes from the portal.
async function safePreviewFailure(response){
 const status=response.status===409?409:response.status===429?429:503;
 const fallback={status,code:status===429?'owner_preview_busy':'owner_preview_private_media_unavailable'};
 if(![409,429,503].includes(response.status)||
    !String(response.headers.get('content-type')||'').includes('application/json')||
    !response.body)return fallback;
 const reader=response.body.getReader(),parts=[];
 let count=0;
 try{
  while(true){
   const next=await reader.read();
   if(next.done)break;
   count+=next.value?.byteLength||0;
   if(count>512)return fallback;
   parts.push(Buffer.from(next.value));
  }
  const code=String(JSON.parse(Buffer.concat(parts).toString('utf8'))?.code||'');
  if(/^(?:private_preview|owner_preview|season_episode|season_verified_episode)_[a-z0-9_]{1,62}$/.test(code))
   return {status,code};
 }catch{ /* No upstream data exposed on parse failures. */ }
 finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
 return fallback;
}
// Accept authorized chunked internal MP4 only after a complete bounded
// read, so the browser receives a real size and no partial/oversized file.
async function collectChunkedPrivateMp4(body,maxBytes){
 const reader=body.getReader(),chunks=[];
 let count=0;
 try{
  for(;;){
   const next=await reader.read();
   if(next.done)break;
   if(!(next.value instanceof Uint8Array))return null;
   count+=next.value.byteLength;
   if(count>maxBytes)return null;
   chunks.push(Buffer.from(next.value));
  }
  if(count<2048)return null;
  const buffer=Buffer.concat(chunks,count);
  return buffer.subarray(4,8).toString('ascii')==='ftyp'?buffer:null;
 }catch{return null}
 finally{try{await reader.cancel()}catch{}try{reader.releaseLock()}catch{}}
}
export async function streamOperatorOwnerPreview({req,res,getUpstream,
  seekPosition=null,timeoutMs=90000,maxBytes=MAX}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<MAX||maxBytes>MAX_TIMELINE)
  return failure(res,400,'owner_preview_max_bytes_invalid');
 if(seekPosition!==null&&
    !['start','middle','near_end'].includes(seekPosition))
  return failure(res,400,'owner_preview_seek_position_invalid');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<10000||timeoutMs>158000)
  return failure(res,400,'owner_preview_timeout_invalid');
 if(req.method!=='GET')
  return failure(res,405,'owner_preview_method_denied');
 if(String(req.url||'').includes('?'))
  return failure(res,400,'owner_preview_query_denied');
 if(typeof getUpstream!=='function')
  return failure(res,503,'owner_preview_unavailable');
 const abort=new AbortController();
 const timer=setTimeout(()=>abort.abort(),timeoutMs);timer.unref?.();
 const close=()=>abort.abort();
 res.once('close',close);
 try{
  const upstream=await getUpstream({signal:abort.signal});
  if(upstream.status!==200){
   const error=await safePreviewFailure(upstream);
   return failure(res,error.status,error.code);
  }
  if(!upstream.body||upstream.headers.get('content-type')!=='video/mp4')
   return failure(res,503,'owner_preview_invalid_media_response');
  const declared=upstream.headers.get('content-length');
  const n=declared===null?null:Number(declared);
  if(declared!==null&&(!Number.isSafeInteger(n)||n<2048||n>maxBytes))
   return failure(res,503,'owner_preview_payload_invalid');
  const reportedPosition=seekPosition===null?null:
    upstream.headers.get('x-blofy-clip-position');
  const startSeconds=seekPosition===null?null:
    Number(upstream.headers.get('x-blofy-clip-start-seconds'));
  if(seekPosition!==null&&
     (reportedPosition!==seekPosition||!Number.isFinite(startSeconds)||
      startSeconds<0||
      upstream.headers.get('x-blofy-clip-source')!=='verified-private-s3'))
    return failure(res,503,'owner_seek_private_proof_invalid');
  if(n===null){
   const bytes=await collectChunkedPrivateMp4(upstream.body,maxBytes);
   if(!bytes)return failure(res,503,'owner_preview_payload_invalid');
   res.writeHead(200,{
    'content-type':'video/mp4',
    'content-length':String(bytes.length),
    'content-disposition':'inline; filename="blofy-private-preview.mp4"',
    'cross-origin-resource-policy':'same-origin',
    'cache-control':'private,no-store',
    'x-frame-options':'DENY',
    'x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer',
    ...(seekPosition!==null?{
      'x-blofy-clip-position':seekPosition,
      'x-blofy-clip-start-seconds':String(Math.floor(startSeconds)),
      'x-blofy-clip-source':'verified-private-s3'}:{})
   });
   return res.end(bytes);
  }
  let count=0;
  const limiter=new Transform({transform(part,encoding,callback){
   count+=part.byteLength;
   callback(count<=n?null:Error('owner_preview_payload_overrun'),part);
  }});
  res.writeHead(200,{
   'content-type':'video/mp4',
   'content-length':String(n),
   'content-disposition':'inline; filename="blofy-private-preview.mp4"',
   'cross-origin-resource-policy':'same-origin',
   'cache-control':'private,no-store',
   'x-frame-options':'DENY',
   'x-content-type-options':'nosniff',
   'referrer-policy':'no-referrer',
   ...(seekPosition!==null?{
     'x-blofy-clip-position':seekPosition,
     'x-blofy-clip-start-seconds':String(Math.floor(startSeconds)),
     'x-blofy-clip-source':'verified-private-s3'}:{})
  });
  await pipeline(Readable.fromWeb(upstream.body),limiter,res,{
   signal:abort.signal});
  if(count!==n&&!res.destroyed)res.destroy();
 }catch{
  if(!abort.signal.aborted)failure(res,503,'owner_preview_stream_failed');
 }finally{
  clearTimeout(timer);
  res.off('close',close);
 }
}
