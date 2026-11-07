// One-shot, protected inspection of the OFFICIALLY ADVERTISED Xtream M3U.
// Never returns any raw stream URL, hostname, account, media payload, token or
// provider message. No writes, no bypass and no customer routing changes.
import http from 'node:http';
import https from 'node:https';
import {timingSafeEqual} from 'node:crypto';
import {assertPublicMediaUrl} from './relay-guard.mjs';
const MAX_REQ=4096,MAX_MANIFEST=256*1024,MAX_SAMPLE=2048;
const BUDGET_MS=9000;
function eq(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y);}
function reply(res,status,obj){const body=Buffer.from(JSON.stringify(obj));res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':body.length,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(body);}
function reason(error){const code=String(error?.code||'');if(['ECONNRESET','EPIPE'].includes(code))return 'connection_reset';if(['ETIMEDOUT','ESOCKETTIMEDOUT'].includes(code))return 'timeout';if(['ECONNREFUSED'].includes(code))return 'connection_refused';if(['ENOTFOUND','EAI_AGAIN'].includes(code))return 'dns_unavailable';return 'transport_error';}
async function small(req){let arr=[],length=0;for await(const b of req){length+=b.length;if(length>MAX_REQ)throw Error('too_large');arr.push(b)}return JSON.parse(Buffer.concat(arr).toString('utf8'));}
async function fetchPart(target,{requestHttp=http.request,requestHttps=https.request,maxBytes=MAX_MANIFEST,timeoutMs=BUDGET_MS}={}){
 return new Promise(resolve=>{
  let ended=false,bytes=0,parts=[],client;
  const done=r=>{if(ended)return;ended=true;client?.destroy();resolve(r)};
  const started=Date.now();
  const protocol=target.protocol==='https:'?requestHttps:requestHttp;
  try{
   client=protocol(target,{method:'GET',agent:false,timeout:timeoutMs,
    headers:{'user-agent':'BLOFY-Xtream/1.0','accept':'*/*','connection':'close'}},res=>{
     const status=Number(res.statusCode||0);
     if(status!==200&&status!==206){res.resume();return done({status,code:'http_status',bytes:0});}
     res.on('data',chunk=>{
       bytes+=chunk.length;
       parts.push(Buffer.from(chunk));
       if(bytes>=maxBytes){
         done({status,code:'sample_ready',bytes:Math.min(bytes,maxBytes),
           data:Buffer.concat(parts).subarray(0,maxBytes)});
       }
     });
     res.once('end',()=>done({status,code:'body_complete',bytes,data:Buffer.concat(parts)}));
     res.once('error',e=>done({status,code:reason(e),bytes:0}));
   });
   client.once('timeout',()=>client.destroy(Object.assign(Error('timeout'),{code:'ETIMEDOUT'})));
   client.once('error',e=>done({status:null,code:reason(e),bytes:0}));
   client.end();
  }catch(e){done({status:null,code:reason(e),bytes:0});}
 });
}
function parseFirstUrls(data){
 const str=(data||Buffer.alloc(0)).toString('utf8');
 if(!str.trimStart().startsWith('#EXTM3U'))return [];
 const lines=str.replace(/\r/g,'').split('\n');
 const urls=[];
 for(const l of lines){
  const line=l.trim();if(!line||line.startsWith('#'))continue;
  try{
   const url=new URL(line);
   if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password)urls.push(url);
  }catch{}
  if(urls.length>=3)break;
 }
 return urls;
}
function format(data){
 const b=Buffer.from(data||[]),s=b.subarray(0,80).toString('utf8').trimStart().toLowerCase();
 if(!b.length)return 'none';
 if(s.startsWith('#extm3u'))return 'playlist';
 if(/^<html|^<!doctype|^\{\s*"/.test(s))return 'error_document';
 if(b.length>=189&&b[0]===0x47&&b[188]===0x47)return 'mpegts';
 if(b.length>=8&&b.subarray(4,8).toString('ascii')==='ftyp')return 'mp4';
 return 'unknown';
}
export async function compareOfficialM3uOrigin(m3uUrl,{
 allowedOrigin='',validate=assertPublicMediaUrl,requestHttp=http.request,
 requestHttps=https.request
}={}){
 let manifest;
 try{
  manifest=await validate(m3uUrl);
  if(manifest.origin.toLowerCase()!==String(allowedOrigin).toLowerCase()||
     !manifest.pathname.endsWith('/get.php')||
     !manifest.searchParams.get('username')||
     !manifest.searchParams.get('password')||
     manifest.searchParams.get('type')!=='m3u_plus'||
     !['ts','m3u8'].includes(manifest.searchParams.get('output')||''))return {ok:false,stage:'validation',code:'manifest_not_allowlisted'};
 }catch{return {ok:false,stage:'validation',code:'manifest_not_allowlisted'};}
 const part=await fetchPart(manifest,{requestHttp,requestHttps});
 if(part.status!==200||!part.data)
   return {ok:false,stage:'manifest',code:part.code,httpStatus:part.status??null,
     mediaVerified:false};
 const candidates=parseFirstUrls(part.data);
 if(!candidates.length)return {ok:false,stage:'manifest',code:'no_advertised_media_url',
   httpStatus:200,mediaVerified:false};
 const summaries=[];
 for(const [i,candidate] of candidates.entries()){
  let u;
  try{u=await validate(candidate.href)}
  catch{
   summaries.push({index:i+1,stage:'validation',code:'unsafe_advertised_url'});
   continue;
  }
  const path=u.pathname.toLowerCase();
  const route=path.startsWith('/live/')?'live':path.startsWith('/movie/')?'movie':
    path.startsWith('/series/')?'series':'other';
  const sameOrigin=u.origin.toLowerCase()===manifest.origin.toLowerCase();
  // Only official URLs from the response are probed. Never follow redirects,
  // change identity or search another origin; validate public DNS first.
  const r=await fetchPart(u,{requestHttp,requestHttps,maxBytes:MAX_SAMPLE,timeoutMs:7500});
  const kind=format(r.data);
  summaries.push({index:i+1,stage:'media',route,sameOrigin,
    scheme:u.protocol==='https:'?'https':'http',httpStatus:r.status??null,
    code:r.code,format:kind,mediaBytesPresent:kind==='mpegts'||kind==='mp4'});
  if(kind==='mpegts'||kind==='mp4')break;
 }
 return {ok:true,stage:'compared',playlistHttpStatus:part.status,
  playlistMediaUrlsFound:candidates.length,anyDifferentMediaOrigin:summaries.some(x=>x.sameOrigin===false),
  mediaTransportVerified:summaries.some(x=>x.mediaBytesPresent),checks:summaries,
  audioVideoDecoded:false,customerCutover:false,credentialsLogged:false};
}
export function createOfficialM3uDiagnostic({sharedToken='',allowedOrigin='',validate=assertPublicMediaUrl,requestHttp=http.request,requestHttps=https.request}={}){
 const enabled=sharedToken.length>=32&&/^https?:\/\/[a-z0-9.-]+(?::\d{2,5})?$/i.test(allowedOrigin);
 let busy=false,last=0;
 return {enabled,async handle(req,res){
  if(!enabled||!eq(req.headers.authorization,'Bearer '+sharedToken))return reply(res,401,{ok:false,code:'not_authorized'});
  if(req.method!=='POST')return reply(res,405,{ok:false,code:'method_not_allowed'});
  if(busy||Date.now()-last<45000)return reply(res,429,{ok:false,code:'diagnostic_cooldown'});
  busy=true;last=Date.now();
  try{
   if(!String(req.headers['content-type']||'').includes('application/json'))
     return reply(res,415,{ok:false,code:'json_required'});
   const input=await small(req);
   const result=await compareOfficialM3uOrigin(input?.manifestUrl,{
     allowedOrigin,validate,requestHttp,requestHttps
   });
   return reply(res,200,result);
  }catch{
   return reply(res,400,{ok:false,code:'diagnostic_failed'});
  }finally{busy=false;}
 }};
}
