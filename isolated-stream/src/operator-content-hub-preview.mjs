// Binary owner-only MP4 preview stream through the already authenticated
// STREAM /operator console. No source/media URLs or bearer tokens in HTML.
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const MAX=12*1024*1024;
function failure(res,status,code){
 if(res.headersSent){if(!res.destroyed)res.destroy();return}
 const data=Buffer.from(JSON.stringify({ok:false,code}));
 res.writeHead(status,{'content-type':'application/json',
  'cache-control':'no-store','content-length':String(data.length),
  'x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
 res.end(data);
}
export async function streamOperatorOwnerPreview({req,res,getUpstream,
  seekPosition=null,timeoutMs=90000}={}){
 if(seekPosition!==null&&
    !['start','middle','near_end'].includes(seekPosition))
  return failure(res,400,'owner_preview_seek_position_invalid');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<10000||timeoutMs>120000)
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
  if(upstream.status!==200||!upstream.body||
    upstream.headers.get('content-type')!=='video/mp4')
   return failure(res,upstream.status===409?409:503,
      'owner_preview_private_media_unavailable');
  const n=Number(upstream.headers.get('content-length'));
  if(!Number.isSafeInteger(n)||n<2048||n>MAX)
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
