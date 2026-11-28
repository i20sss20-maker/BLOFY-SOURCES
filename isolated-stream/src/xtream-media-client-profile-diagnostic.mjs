// Operator-only: compare the SAME provider movie/episode URL with three
// legitimate HTTP playback request profiles. Does NOT change customer paths,
// guess IDs, follow arbitrary redirects or expose source credentials.
import {timingSafeEqual} from 'node:crypto';
import {assertPublicMediaUrl} from './relay-guard.mjs';
import {compareXtreamNativeHttp11} from './xtream-native-http11-media-diagnostic.mjs';
import {readProviderDenialHint} from './provider-denial-hint.mjs';

const MAX_JSON=4096;
const KIND=new Set(['movie','series']);
const profiles=[
  {name:'relay_range',userAgent:'BLOFY-STREAM-Relay/1.0',range:'bytes=0-1023'},
  {name:'relay_plain',userAgent:'BLOFY-STREAM-Relay/1.0'},
  {name:'player_plain',userAgent:'VLC/3.0.20 LibVLC/3.0.20'}
];
function equalBearer(header,secret){
 if(typeof secret!=='string'||secret.length<32||
    !String(header||'').startsWith('Bearer '))return false;
 const a=Buffer.from(header.slice(7)),b=Buffer.from(secret);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function answer(res,status,body){
 const buf=Buffer.from(JSON.stringify(body));
 res.writeHead(status,{'content-type':'application/json',
  'content-length':buf.length,'cache-control':'no-store',
  'x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
 res.end(buf);
}
function playable(bytes,mime){
 const b=Buffer.from(bytes||[]);
 if(!b.length)return false;
 const prefix=b.subarray(0,160).toString('utf8').trimStart().toLowerCase();
 if(/^(text\/|application\/(json|xml|xhtml))/i.test(String(mime||'')))return false;
 if(prefix.startsWith('#extm3u')||/^<(!doctype|html)|^\{\s*"(error|message|status|code)"/i.test(prefix))return false;
 if(/^(not found|unauthorized|access denied)/i.test(prefix))return false;
 return true;
}
function category(err){
 const code=String(err?.cause?.code||err?.code||'');
 if(['ECONNRESET','EPIPE','UND_ERR_SOCKET'].includes(code))return 'connection_reset';
 if(['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(code))return 'timeout';
 return 'unavailable';
}
async function profileProbe(url,profile,{
 fetchImpl,validate,lookup,allowedOrigin,allowRedirectFrom
}){
 let target=await validate(url,{lookup});
 if(target.origin.toLowerCase()!==allowedOrigin.toLowerCase())
  return {profile:profile.name,code:'outside_source_allowlist'};
 let crossOrigin=0,redirects=0;
 const headers={'accept':'*/*','accept-encoding':'identity',
  'user-agent':profile.userAgent};
 if(profile.range)headers.range=profile.range;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),7500);
 let response=null;
 try{
  for(let hop=0;hop<=2;hop++){
   response=await fetchImpl(target,{method:'GET',headers,
    redirect:'manual',signal:controller.signal});
   if([301,302,303,307,308].includes(response.status)){
    const location=response.headers.get('location');
    await response.body?.cancel().catch(()=>{});
    if(!location||hop===2)return{profile:profile.name,status:response.status,
      code:'redirect_limit',redirects};
    const next=await validate(new URL(location,target).href,{lookup});
    if(next.origin!==target.origin){
     if(target.origin!==allowRedirectFrom||crossOrigin>=1)
      return{profile:profile.name,status:response.status,
        code:'cross_origin_redirect_disallowed',redirects};
     crossOrigin++;
    }
    redirects++;target=next;continue;
   }
   const status=response.status;
   if(status!==200&&status!==206){
    // Some provider 404 responses are deliberate IP/connection denials.
    // Inspect only a bounded first chunk and return a vetted reason enum;
    // never include the upstream body, address or credentials in results.
    const providerHint=await readProviderDenialHint(response);
    await response.body?.cancel().catch(()=>{});
    return {profile:profile.name,status,mediaBytes:false,
      code:status===404?'provider_not_found':status===403?'provider_forbidden':
      status===456?'provider_limited':'other_http',redirects,
      ...(providerHint?{providerHint}:{}),
      crossOriginRedirect:crossOrigin>0};
   }
   if(!response.body)return{profile:profile.name,status,
     mediaBytes:false,code:'empty_body',redirects};
   const reader=response.body.getReader();
   let first;
   try{first=await reader.read()}
   finally{try{await reader.cancel()}catch{}try{reader.releaseLock()}catch{}}
   return {profile:profile.name,status,mediaBytes:!first.done&&
     playable(first.value,response.headers.get('content-type')),
     code:'media_checked',redirects,crossOriginRedirect:crossOrigin>0};
  }
  return {profile:profile.name,code:'redirect_limit',redirects};
 }catch(e){return{profile:profile.name,code:controller.signal.aborted?
   'timeout':category(e),redirects,crossOriginRedirect:crossOrigin>0};}
 finally{clearTimeout(timer);await response?.body?.cancel().catch(()=>{});}
}
export async function compareXtreamMediaClientProfiles(samples,{
 allowedOrigin='',allowRedirectFrom='',fetchImpl=fetch,
 validate=assertPublicMediaUrl,lookup,compareHttp11=false,
 http11Read
}={}){
 const results=[];
 for(const [idx,item] of samples.entries()){
  const checks=[];
  for(const profile of profiles){
   const outcome=await profileProbe(item.sourceUrl,profile,{
    allowedOrigin,allowRedirectFrom,fetchImpl,validate,lookup});
   checks.push(outcome);
   // A provider denial must never trigger a different client profile.
   if([401,403,456].includes(outcome.status))break;
  }
  if(compareHttp11&&!checks.some(x=>x.mediaBytes===true)&&
     !checks.some(x=>[401,403,456].includes(x.status))){
    checks.push(await compareXtreamNativeHttp11(item.sourceUrl,{
     allowedOrigin,allowRedirectFrom,validate,lookup,read:http11Read
    }));
  }
  results.push({index:idx+1,kind:item.kind,checks,
   normalMedia:checks[0]?.mediaBytes===true,
   plainMedia:checks[1]?.mediaBytes===true,
   playerMedia:checks[2]?.mediaBytes===true});
 }
 return {ok:true,readOnly:true,mediaPlaybackDecoded:false,
  sourceUrlsLogged:false,samples:results};
}
export function createXtreamMediaClientProfileDiagnostic({
 sharedToken='',allowedOrigin='',allowRedirectFrom='',
 fetchImpl=fetch,validate=assertPublicMediaUrl,lookup,http11Read
}={}){
 const enabled=sharedToken.length>=32&&/^https?:\/\/[a-z0-9.-]+(?::\d{2,5})?$/i.test(allowedOrigin);
 let busy=false,last=0;
 return{enabled,async handle(req,res){
  if(!enabled||!equalBearer(req.headers.authorization,sharedToken))
   return answer(res,401,{ok:false,code:'not_authorized'});
  if(req.method!=='POST')return answer(res,405,{ok:false,code:'method_not_allowed'});
  if(busy||Date.now()-last<45000)return answer(res,429,{ok:false,code:'cooldown'});
  busy=true;last=Date.now();
  try{
   let size=0,parts=[];
   for await(const part of req){
    size+=part.length;
    if(size>MAX_JSON)return answer(res,413,{ok:false,code:'request_too_large'});
    parts.push(part);
   }
   const payload=JSON.parse(Buffer.concat(parts).toString('utf8'));
   if(!Array.isArray(payload?.samples)||payload.samples.length<1||payload.samples.length>3)
    return answer(res,400,{ok:false,code:'invalid_samples'});
   const samples=[];
   for(const item of payload.samples){
    if(!KIND.has(item?.kind)||typeof item.sourceUrl!=='string'||item.sourceUrl.length>1500)
     return answer(res,400,{ok:false,code:'invalid_samples'});
    const url=await validate(item.sourceUrl,{lookup});
    if(url.origin.toLowerCase()!==allowedOrigin.toLowerCase()||
       !url.pathname.startsWith('/'+item.kind+'/')||
       url.search||url.hash)
     return answer(res,400,{ok:false,code:'source_not_allowlisted'});
    samples.push({kind:item.kind,sourceUrl:url.href});
   }
   const result=await compareXtreamMediaClientProfiles(samples,{
    allowedOrigin,allowRedirectFrom,fetchImpl,validate,lookup,
    compareHttp11:payload.compareHttp11===true,http11Read});
   return answer(res,200,result);
  }catch{return answer(res,400,{ok:false,code:'diagnostic_unavailable'})}
  finally{busy=false;}
 }};
}
