// Privileged data-plane relay for Xtream catalog JSON ONLY.
// No public player route, no media/manifest transfer, no cache, and no
// persisted provider credentials. The authoritative PLAYER verifies source
// account and selects an allowlisted source ID before calling this service.
import http from 'node:http';
import https from 'node:https';
import {timingSafeEqual} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {assertPublicMediaUrl} from './relay-guard.mjs';

const MAX_BODY=4096,MAX_DATA=256*1024*1024;
const ALLOWED_ACTIONS=new Set(['','get_live_categories','get_vod_categories',
 'get_series_categories','get_live_streams','get_vod_streams','get_series',
 'get_series_info','get_vod_info','get_short_epg','get_simple_data_table']);
function safeWrite(res,code,data){
 if(res.headersSent)return;
 const bytes=Buffer.from(JSON.stringify(data));
 res.writeHead(code,{'content-type':'application/json; charset=utf-8',
  'content-length':bytes.length,'cache-control':'no-store',
  'x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
 res.end(bytes);
}
function bearer(value,expected){
 if(typeof expected!=='string'||expected.length<32||
    typeof value!=='string'||!value.startsWith('Bearer '))return false;
 const x=Buffer.from(value.slice(7)),y=Buffer.from(expected);
 return x.length===y.length&&timingSafeEqual(x,y);
}
async function getJson(req){
 let bytes=0,buf=[];
 for await(const part of req){
  bytes+=part.length;
  if(bytes>MAX_BODY)throw new Error('body_too_large');
  buf.push(part);
 }
 return JSON.parse(Buffer.concat(buf).toString('utf8'));
}
export function createXtreamCatalogRelay({
 sharedToken='',allowedOrigin='',validate=assertPublicMediaUrl,
 httpRequest=http.request,httpsRequest=https.request,maxConcurrent=2,
 manifestOnly=false
}={}){
 const enabled=sharedToken.length>=32&&/^https?:\/\/[a-z0-9.-]+(?::\d{2,5})?$/i.test(allowedOrigin);
 let concurrent=0;
 return {enabled,
 async handle(req,res){
  if(!enabled||!bearer(req.headers.authorization,sharedToken))
    return safeWrite(res,401,{ok:false,code:'not_authorized'});
  if(req.method!=='POST')return safeWrite(res,405,{ok:false,code:'method_not_allowed'});
  if(concurrent>=maxConcurrent)return safeWrite(res,429,{ok:false,code:'relay_busy'});
  concurrent++;
  let upstream;
  const signal=new AbortController();
  const aborted=()=>signal.abort();
  req.once('aborted',aborted);
  const disconnected=()=>{if(!res.writableEnded)signal.abort()};
  res.once('close',disconnected);
  try{
   if(!String(req.headers['content-type']||'').includes('application/json'))
     return safeWrite(res,415,{ok:false,code:'content_type_invalid'});
   const body=await getJson(req);
   if(typeof body?.sourceUrl!=='string'||body.sourceUrl.length>2500)
     return safeWrite(res,400,{ok:false,code:'source_url_invalid'});
   const target=await validate(body.sourceUrl);
   const isApi=target.pathname.endsWith('/player_api.php')&&
     ALLOWED_ACTIONS.has(target.searchParams.get('action')||'');
   const isManifest=target.pathname.endsWith('/get.php')&&
     target.searchParams.get('type')==='m3u_plus'&&
     target.searchParams.get('output')==='ts'&&
     [...target.searchParams.keys()].sort().join(',')==='output,password,type,username';
   if(target.origin.toLowerCase()!==allowedOrigin.toLowerCase()||
      !target.searchParams.get('username')||!target.searchParams.get('password')||
      (manifestOnly?!isManifest:!isApi))
     return safeWrite(res,400,{ok:false,code:'source_not_allowlisted'});
   // Single HTTP/1.1 request with a fresh socket. Redirects are deliberately
   // not followed, because the upstream query contains private credentials.
   const request=target.protocol==='https:'?httpsRequest:httpRequest;
   upstream=request(target,{
    method:'GET',agent:false,timeout:30000,
    headers:{connection:'close','user-agent':'BLOFY-Xtream/1.0',
     accept:'application/json,text/plain;q=0.8,*/*;q=0.1'}
   },response=>{
    const status=Number(response.statusCode)||502;
    if(status!==200){
     response.resume();
     return safeWrite(res,status>=100&&status<=599?status:502,
       {ok:false,code:'upstream_rejected'});
    }
    // Content is streamed with backpressure. Manifest audits are capped
    // at 256 MiB, streamed with backpressure, never buffered or public.
    // The real provider's official export exceeds our initial 64 MiB cap.
    const maxData=MAX_DATA;
    const len=Number(response.headers['content-length']||0);
    if(len>maxData){response.destroy();return safeWrite(res,413,{ok:false,code:'catalog_too_large'});}
    let total=0;
    response.on('data',part=>{
      total+=part.byteLength;
      if(total>maxData)response.destroy(new Error('catalog_too_large'));
    });
    res.writeHead(200,{'content-type':manifestOnly?
       'audio/x-mpegurl; charset=utf-8':'application/json; charset=utf-8',
      'cache-control':'no-store','x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer'});
    void pipeline(response,res,{signal:signal.signal}).catch(()=>{
     if(!res.destroyed)res.destroy();
    });
   });
   upstream.setTimeout(30000,()=>upstream.destroy(Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})));
   upstream.once('error',()=>safeWrite(res,502,{ok:false,code:'upstream_unavailable'}));
   signal.signal.addEventListener('abort',()=>upstream.destroy(),{once:true});
   upstream.end();
   // Keep the concurrent slot until the response stream has ended.
   await new Promise(resolve=>res.once('close',resolve));
  }catch{
   safeWrite(res,400,{ok:false,code:'relay_request_invalid'});
  }finally{
   concurrent--;signal.abort();
   req.off('aborted',aborted);res.off('close',disconnected);
   if(upstream&&!upstream.destroyed)upstream.destroy();
  }
 }};
}

// Strictly separate the read-only manifest diagnostic from normal catalog API.
export function createXtreamManifestRelay(options={}){
 return createXtreamCatalogRelay({...options,manifestOnly:true,maxConcurrent:1});
}
