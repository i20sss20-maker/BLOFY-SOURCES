// Read-only native HTTP/1.1 request comparison for the SAME provider media
// URL that returned 404 via fetch. Never rewrite user identifiers/headers,
// emit credentials, or follow an unvalidated provider redirect.
import http from 'node:http';
import https from 'node:https';
import {assertPublicMediaUrl} from './relay-guard.mjs';

function transportCode(e){
 const code=String(e?.code||e?.cause?.code||'');
 if(['ECONNRESET','EPIPE','UND_ERR_SOCKET'].includes(code))return 'connection_reset';
 if(['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(code))return 'timeout';
 return 'unavailable';
}
export function readFirstHttp11(url,{requestHttp=http.request,
 requestHttps=https.request,timeoutMs=7000}={}){
 return new Promise(resolve=>{
  const u=new URL(url);
  if(!['http:','https:'].includes(u.protocol))
   return resolve({code:'bad_protocol'});
  const request=u.protocol==='https:'?requestHttps:requestHttp;
  let completed=false,req;
  const settle=out=>{
   if(completed)return;
   completed=true;resolve(out);req?.destroy();
  };
  try{
   req=request(u,{method:'GET',agent:false,timeout:timeoutMs,
    headers:{'user-agent':'BLOFY-STREAM-Relay/1.0',
     accept:'*/*','accept-encoding':'identity',connection:'close'}
   },res=>{
    const status=Number(res.statusCode||0);
    if([301,302,303,307,308].includes(status)){
     res.resume();
     return settle({status,code:'redirect',redirect:String(res.headers.location||'').slice(0,2000)});
    }
    if(status!==200&&status!==206){
     res.resume();
     return settle({status,code:'http_status'});
    }
    res.once('data',part=>settle({status,code:'first_bytes',
     // Max one packet, never return payload to operator caller.
     mime:String(res.headers['content-type']||'').slice(0,100),
     first:Buffer.from(part).subarray(0,1024)}));
    res.once('end',()=>settle({status,code:'empty_media'}));
    res.once('error',e=>settle({status,code:transportCode(e)}));
    res.resume();
   });
   req.once('timeout',()=>settle({code:'timeout'}));
   req.once('error',e=>settle({code:transportCode(e)}));
   req.end();
  }catch(e){settle({code:transportCode(e)})}
 });
}
function media(bytes,mime){
 const b=Buffer.from(bytes||[]);
 if(!b.length)return false;
 const prefix=b.subarray(0,100).toString('utf8').trimStart().toLowerCase();
 if(/^(text\/|application\/(json|xml|xhtml))/i.test(mime||''))return false;
 if(prefix.startsWith('#extm3u')||/^<(!doctype|html)|^\{\s*"(error|message|status|code)"|^not found|^unauthorized|^access denied/.test(prefix))return false;
 return true;
}
export async function compareXtreamNativeHttp11(sourceUrl,{
 allowedOrigin='',allowRedirectFrom='',validate=assertPublicMediaUrl,
 lookup,read=readFirstHttp11
}={}){
 let target=await validate(sourceUrl,{lookup});
 if(target.origin.toLowerCase()!==allowedOrigin.toLowerCase())
  return {profile:'http11_plain',code:'outside_source_allowlist'};
 let redirects=0,crossOrigin=0;
 for(let hop=0;hop<=2;hop++){
  const outcome=await read(target);
  const status=outcome.status||null;
  if([301,302,303,307,308].includes(status)){
   if(hop===2||!outcome.redirect)
    return {profile:'http11_plain',status,code:'redirect_limit',redirects};
   const next=await validate(new URL(outcome.redirect,target).href,{lookup});
   if(next.origin!==target.origin){
    if(target.origin!==allowRedirectFrom||crossOrigin>=1)
     return {profile:'http11_plain',status,
      code:'cross_origin_redirect_disallowed',redirects};
    crossOrigin++;
   }
   target=next;redirects++;continue;
  }
  return {profile:'http11_plain',status,
   mediaBytes:(status===200||status===206)&&media(outcome.first,outcome.mime),
   code:status===404?'provider_not_found':
    status===403?'provider_forbidden':status===456?'provider_limited':
    outcome.code==='first_bytes'?'media_checked':
    ['timeout','connection_reset','empty_media','unavailable'].includes(outcome.code)?
      outcome.code:'other_http',
   redirects,crossOriginRedirect:crossOrigin>0
  };
 }
 return {profile:'http11_plain',code:'redirect_limit',redirects};
}
