// Website operator-only original-file S3 range relay, not customer playback.
// Requires Basic auth in operator-dashboard before this function is called.
// The portal and Hub independently validate each exact verified file request.
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const RUN=/^[A-Za-z0-9_-]{8,80}$/;
const MAX=8*1024*1024,MAX_FILE=4*1024**3;
const TYPES=new Set(['video/x-matroska','video/mp4','video/mp2t','video/x-msvideo']);
function fail(res,status,code){
 if(res.headersSent){if(!res.destroyed)res.destroy();return}
 const body=Buffer.from(JSON.stringify({ok:false,code}));
 res.writeHead(status,{'content-type':'application/json','content-length':String(body.length),
  'cache-control':'no-store','x-content-type-options':'nosniff'});
 res.end(body);
}
export async function streamOperatorOriginalRange({
 req,res,mediaKind,runId,getUpstream
}={}){
 if(!['movie','episode'].includes(mediaKind)||!RUN.test(String(runId||'')))
  return fail(res,400,'site_qa_selection_invalid');
 if(!['HEAD','GET'].includes(req.method)||String(req.url||'').includes('?'))
  return fail(res,405,'site_qa_method_or_query_denied');
 const range=String(req.headers.range||'');
 if(range.length>90||range.includes(',')||
    (range&&!/^bytes=(?:0|[1-9][0-9]*)-(?:(?:0|[1-9][0-9]*))?$/.test(range)
      &&!/^bytes=-[1-9][0-9]*$/.test(range)))
  return fail(res,416,'site_qa_range_invalid');
 if(typeof getUpstream!=='function')return fail(res,503,'site_qa_not_configured');
 const abort=new AbortController();
 const timeout=setTimeout(()=>abort.abort(),65000);timeout.unref?.();
 const disconnect=()=>abort.abort();
 res.once('close',disconnect);
 try{
  const upstream=await getUpstream({signal:abort.signal,method:req.method,range});
  if(upstream.status===404)return fail(res,404,'site_qa_file_not_available');
  if(upstream.status!==(req.method==='HEAD'?200:206))
   return fail(res,503,'site_qa_private_media_unavailable');
  const type=upstream.headers.get('content-type');
  if(!TYPES.has(type))return fail(res,503,'site_qa_type_invalid');
  const length=Number(upstream.headers.get('content-length'));
  if(!Number.isSafeInteger(length)||length<1||
     length>(req.method==='HEAD'?MAX_FILE:MAX))
   return fail(res,503,'site_qa_length_invalid');
  const headers={'content-type':type,'content-length':String(length),
    'accept-ranges':'bytes','cache-control':'private,no-store',
    'cross-origin-resource-policy':'same-origin',
    'x-content-type-options':'nosniff','x-frame-options':'DENY',
    'referrer-policy':'no-referrer'};
  if(req.method==='HEAD'){res.writeHead(200,headers);return res.end()}
  const cr=String(upstream.headers.get('content-range')||'');
  const m=/^bytes (0|[1-9][0-9]*)-(0|[1-9][0-9]*)\/(0|[1-9][0-9]*)$/.exec(cr);
  if(!m||!upstream.body||!Number.isSafeInteger(Number(m[3]))||
     Number(m[3])>MAX_FILE||Number(m[3])<1||
     Number(m[2])<Number(m[1])||Number(m[2])>=Number(m[3])||
     Number(m[2])-Number(m[1])+1!==length)
   return fail(res,503,'site_qa_content_range_invalid');
  // Exact byte-range response expected, with capped open-ended Range.
  const from=Number(m[1]),to=Number(m[2]),total=Number(m[3]);
  if(range){
   let expectedFrom=null,expectedTo=null;
   const forward=/^bytes=(\d+)-(\d*)$/.exec(range);
   const suffix=/^bytes=-(\d+)$/.exec(range);
   if(forward){
    expectedFrom=Number(forward[1]);
    expectedTo=forward[2]===''?Math.min(total-1,expectedFrom+MAX-1):
      Number(forward[2]);
   }else if(suffix){
    expectedTo=total-1;
    expectedFrom=Math.max(0,total-Number(suffix[1]));
   }
   if(from!==expectedFrom||to!==expectedTo)
    return fail(res,503,'site_qa_unexpected_range');
  }else if(from!==0||to!==Math.min(total,MAX)-1)
   return fail(res,503,'site_qa_unexpected_default_range');
  let seen=0;
  const bounded=new Transform({transform(bytes,enc,done){
    seen+=bytes.byteLength;
    done(seen<=length?null:Error('site_qa_overrun'),bytes);
  }});
  res.writeHead(206,{...headers,'content-range':cr,
    'content-disposition':'inline; filename="blofy-owner-original-media"'});
  await pipeline(Readable.fromWeb(upstream.body),bounded,res,{signal:abort.signal});
  if(seen!==length&&!res.destroyed)res.destroy();
 }catch{
  if(!abort.signal.aborted)fail(res,503,'site_qa_proxy_failed');
 }finally{
  clearTimeout(timeout);
  res.off('close',disconnect);
 }
}
