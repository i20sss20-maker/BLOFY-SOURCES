// BLOFY private HTTP/HLS read-through edge.
// An alternative to MediaMTX remuxing for a fixed, AUTHORIZED MediaMTX Origin.
// Preserves HLS bytes/cookies/redirects without a second upstream Xtream GET.
// Deploy on Railway private networking ONLY; NEVER attach a public domain.
import http from 'node:http';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';
import {timingSafeEqual} from 'node:crypto';

const PRODUCTION_ORIGIN='http://blofy-stream-media.railway.internal:8888';
const ALLOWED_QUERY=new Set(['session','cookieCheck','_HLS_msn','_HLS_part','_HLS_skip']);
const PLAYABLE=/^[a-zA-Z0-9_-]{1,110}\.(?:m3u8|ts|m4s|mp4|aac)$/;
const LIVE=/^live-[a-f0-9]{12}$/;

function safeRoute(raw){
  if(typeof raw!=='string'||raw.length>440||/[\\\r\n]/.test(raw))return null;
  let parsed;
  try{parsed=new URL(raw,'http://localhost')}catch{return null}
  if(parsed.host!=='localhost'||parsed.username||parsed.password||parsed.hash)return null;
  if(/%|\/\/|\/\.\.?\//.test(parsed.pathname))return null;
  const p=parsed.pathname.split('/');
  if(p.length!==3||p[0]!==''||(!LIVE.test(p[1])&&p[1]!=='smoke')||
    !PLAYABLE.test(p[2]))return null;
  for(const [key,value] of parsed.searchParams){
    if(!ALLOWED_QUERY.has(key)||value.length>150||/[\r\n]/.test(value))
      return null;
  }
  return {path:parsed.pathname,search:parsed.search,smoke:p[1]==='smoke'};
}
function matchesBearer(header,secret){
 if(typeof secret!=='string'||secret.length<32||typeof header!=='string'||
   !header.startsWith('Bearer '))return false;
 const value=Buffer.from(header.slice(7)),expected=Buffer.from(secret);
 return value.length===expected.length&&timingSafeEqual(value,expected);
}
function respond(res,status,payload){
 const body=Buffer.from(JSON.stringify(payload));
 res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',
  'x-content-type-options':'nosniff','content-length':body.length,
  'referrer-policy':'no-referrer'});
 res.end(body);
}
function allowOrigin(origin,allowTestOrigin){
 if(origin===PRODUCTION_ORIGIN)return origin;
 // Explicit loopback override is for node:test only; production main passes
 // no such flag and takes the immutable fixed private MediaMTX origin.
 if(allowTestOrigin===true&&/^http:\/\/127\.0\.0\.1:[0-9]{2,5}$/.test(origin))
   return origin;
 throw Error('private_edge_origin_forbidden');
}
export function createPrivateHlsEdge({
 origin=PRODUCTION_ORIGIN,fetchImpl=fetch,accessToken='',maxConcurrent=256,
 timeoutMs=30000,allowTestOrigin=false,log=()=>{}
}={}){
 const fixedOrigin=allowOrigin(origin,allowTestOrigin);
 if(!Number.isInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>512||
   !Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>60000)
   throw Error('private_edge_invalid_limits');
 let concurrent=0,completed=0,rejected=0;
 const server=http.createServer(async(req,res)=>{
  const path=safeRoute(req.url);
  if(req.url==='/health'&&req.method==='GET')
    return respond(res,200,{ok:true,service:'blofy-private-hls-edge',
      privateOnly:true,sourceType:'fixed-private-mediamtx-origin',
      providerConnectionsOpened:0,subscriberCutover:false,
      activeRequests:concurrent});
  if(!path)return respond(res,404,{ok:false,code:'edge_not_found'});
  if(!['GET','HEAD'].includes(req.method))
    return respond(res,405,{ok:false,code:'edge_method_not_allowed'});
  if(!path.smoke&&!matchesBearer(req.headers.authorization,accessToken)){
    rejected++;
    return respond(res,401,{ok:false,code:'edge_authorization_required'});
  }
  if(concurrent>=maxConcurrent){
    rejected++;res.setHeader('retry-after','2');
    return respond(res,503,{ok:false,code:'edge_busy'});
  }
  concurrent++;
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  timer.unref?.();
  const onClose=()=>{if(!res.writableEnded)ctrl.abort()};
  res.once('close',onClose);
  try{
    const upstream=new URL(path.path+path.search,fixedOrigin);
    // No path, query or header can change the fixed upstream host.
    if(upstream.origin!==fixedOrigin)throw Error('edge_origin_forbidden');
    const cookie=String(req.headers.cookie||'');
    const response=await fetchImpl(upstream,{
      method:req.method,redirect:'manual',cache:'no-store',signal:ctrl.signal,
      headers:{accept:'application/vnd.apple.mpegurl,video/mp2t,*/*;q=0.5',
        'accept-encoding':'identity',...(cookie.length<400&&!/[\r\n]/.test(cookie)?
          {cookie}:{})}
    });
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get('location');
      let redirect;
      try{redirect=new URL(location,upstream)}catch{}
      const local=redirect?.origin===fixedOrigin?
        safeRoute(redirect.pathname+redirect.search):null;
      await response.body?.cancel().catch(()=>{});
      if(!local||local.smoke!==path.smoke)
        return respond(res,502,{ok:false,code:'edge_redirect_denied'});
      const redirectHeaders={location:local.path+local.search,
        'cache-control':'no-store','referrer-policy':'no-referrer'};
      // MediaMTX HLS session negotiation begins with a cookie-setting 302.
      // Forward the cookie on this trusted fixed-origin redirect; otherwise
      // browser/client requests can fail despite a valid synthetic manifest.
      const originCookie=response.headers.get('set-cookie');
      if(originCookie&&originCookie.length<=500&&
        /^[a-zA-Z0-9_-]{1,48}=[^\r\n]{1,450}$/.test(originCookie))
        redirectHeaders['set-cookie']=originCookie;
      res.writeHead(response.status,redirectHeaders);
      res.end();return;
    }
    // Only carry trusted media headers and the MediaMTX HLS session cookie.
    const headers={'cache-control':'no-store','x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer','x-frame-options':'DENY'};
    for(const key of ['content-type','content-length','set-cookie']){
      const value=response.headers.get(key);
      if(value&&value.length<500)headers[key]=value;
    }
    res.writeHead(response.status,headers);
    if(req.method==='HEAD'||!response.body){res.end();return}
    await pipeline(Readable.fromWeb(response.body),res,{signal:ctrl.signal});
    completed++;
  }catch{
    if(!res.headersSent&&!res.destroyed)
      respond(res,503,{ok:false,code:'edge_origin_temporarily_unavailable'});
    else if(!res.destroyed&&!res.writableEnded)res.end();
    try{log('edge_request_error')}catch{}
  }finally{
    clearTimeout(timer);concurrent--;
    res.off('close',onClose);
  }
 });
 return {server,stats:()=>({activeRequests:concurrent,completedRequests:completed,
   rejectedRequests:rejected,providerConnectionsOpened:0,
   subscriberCutover:false}),productionOrigin:fixedOrigin};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {server}=createPrivateHlsEdge({accessToken:process.env.BLOFY_EDGE_READ_TOKEN||'',
   log:msg=>console.warn(msg)});
 server.listen(8888,'0.0.0.0',()=>console.info(
   'BLOFY_PRIVATE_HLS_EDGE_STARTED',{port:8888,privateOnly:true,
     origin:'private_mediamtx',subscriberCutover:false}));
}
