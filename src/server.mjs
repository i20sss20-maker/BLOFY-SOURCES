import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { PORT,ADMIN_PASSWORD,SYNC_INTERVAL_MS,SYNC_ON_START,ROOT } from './config.mjs';
import { catalog,listAccounts } from './context.mjs';
import { baseUrl,json,text } from './http.mjs';
import { storageStatus } from './storage.mjs';
import { adminApi } from './admin.mjs';
import { servePlayerApi,serveM3u,serveXmltv,servePlayback } from './xtream.mjs';
import { syncAll,syncState } from './sync.mjs';

const ACTIVATION_URL=String(process.env.ACTIVATION_URL||'http://blofy-activation').replace(/\/+$/,'');
const RELEASE_URL=String(process.env.RELEASE_URL||'http://blofy-releases').replace(/\/+$/,'');
const RELEASE_PATH=/^(?:\/release\.json|\/download(?:\/|$)|\/downloads(?:\/|$)|\/releases(?:\/|$))/;
const HOP_BY_HOP=new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade']);

function securityHeaders(){return{'strict-transport-security':'max-age=31536000','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer','permissions-policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()','cross-origin-opener-policy':'same-origin'}}
function logSync(label,result){console.log(`${label} sync complete: ${JSON.stringify({stats:result.stats,log:result.log})}`)}
function accountHealth(){const rows=listAccounts();return{total:rows.length,active:rows.filter(x=>x.enabled&&!x.expired).length,expired:rows.filter(x=>x.expired).length,disabled:rows.filter(x=>!x.enabled).length}}
function cleanPath(pathname){if(pathname==='/'||!pathname)return '/';return pathname.replace(/\/+$/,'')||'/'}

async function serveAdminUi(res,pathname){
  let file='';
  if(pathname==='/xtream')file='admin.html';
  else if(pathname==='/admin-assets/admin.css'||pathname==='/xtream-assets/admin.css')file='admin.css';
  else if(pathname==='/admin-assets/admin.js'||pathname==='/xtream-assets/admin.js')file='admin.js';
  else return false;
  const body=await readFile(path.join(ROOT,'public',file),'utf8');
  const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';
  const headers=file.endsWith('.html')?{'content-security-policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",...securityHeaders()}:{};
  text(res,200,body,type,headers);return true;
}

function proxyTarget(requestUrl){
  const incoming=new URL(requestUrl||'/','http://blofy-gateway.local');
  let pathname=incoming.pathname,base=ACTIVATION_URL;
  if(pathname==='/activation-admin'||pathname.startsWith('/activation-admin/')){
    const suffix=pathname.slice('/activation-admin'.length);
    pathname=`/admin${suffix}`;
    base=ACTIVATION_URL;
  }else if(pathname==='/releases-admin'||pathname.startsWith('/releases-admin/')){
    const suffix=pathname.slice('/releases-admin'.length);
    pathname=`/admin${suffix}`;
    base=RELEASE_URL;
  }else if(RELEASE_PATH.test(pathname))base=RELEASE_URL;
  return new URL(pathname+incoming.search,`${base}/`);
}

function proxy(req,res){
  const target=proxyTarget(req.url),transport=target.protocol==='https:'?https:http,publicHost=String(req.headers.host||'').split(',')[0].trim(),incomingProto=String(req.headers['x-forwarded-proto']||'').split(',')[0].trim().toLowerCase(),publicProto=incomingProto==='http'||incomingProto==='https'?incomingProto:'https';
  const headers={...req.headers,host:target.host,'x-forwarded-host':publicHost,'x-forwarded-proto':publicProto};for(const name of HOP_BY_HOP)delete headers[name];
  const upstream=transport.request({protocol:target.protocol,hostname:target.hostname,port:target.port||undefined,method:req.method,path:`${target.pathname}${target.search}`,headers},upstreamRes=>{
    const responseHeaders={};for(const [name,value] of Object.entries(upstreamRes.headers)){if(value!=null&&!HOP_BY_HOP.has(name.toLowerCase())&&name.toLowerCase()!=='server')responseHeaders[name]=value}
    Object.assign(responseHeaders,securityHeaders());res.writeHead(upstreamRes.statusCode||502,responseHeaders);upstreamRes.pipe(res)
  });
  upstream.setTimeout(30_000,()=>upstream.destroy(new Error('upstream_timeout')));
  upstream.on('error',error=>{console.error(`gateway upstream error for ${target.href}:`,error.message);if(!res.headersSent)json(res,502,{ok:false,error:'bad_gateway'});else res.destroy(error)});
  req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
}

const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url||'/',baseUrl(req)),pathname=cleanPath(url.pathname);
  if((req.method==='GET'||req.method==='HEAD')&&pathname==='/health'){
    const body={ok:true,service:'blofy-gateway',storage:storageStatus(),xtream:{ok:true,stats:catalog.stats(),accounts:accountHealth(),...syncState()}};
    if(req.method==='HEAD'){res.writeHead(200,{'cache-control':'no-store',...securityHeaders()});return res.end()}
    return json(res,200,body,securityHeaders());
  }
  if(req.method==='GET'&&await serveAdminUi(res,pathname))return;
  if(pathname.startsWith('/admin-api/')||pathname.startsWith('/xtream-api/')){
    const prefix=pathname.startsWith('/admin-api/')?'/admin-api/':'/xtream-api/';
    const adminUrl=new URL(url);
    adminUrl.pathname=`/api/admin/${pathname.slice(prefix.length)}`;
    return adminApi(req,res,adminUrl);
  }
  if(req.method==='GET'&&(pathname==='/player_api.php'||pathname==='/panel_api.php'))return servePlayerApi(req,res,url);
  if(req.method==='GET'&&pathname==='/get.php')return serveM3u(req,res,url);
  if(req.method==='GET'&&pathname==='/xmltv.php')return serveXmltv(req,res,url);
  if(req.method==='GET'&&await servePlayback(req,res,pathname))return;
  return proxy(req,res);
}catch(e){
  console.error('gateway request error:',e?.message||String(e));
  if(!res.headersSent)json(res,500,{ok:false,error:'gateway_error'},securityHeaders());else res.end()
}});
server.on('clientError',(error,socket)=>{console.warn('gateway client error:',error.message);if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')});
server.listen(PORT,'0.0.0.0',()=>{console.log(`BLOFY unified gateway + admin + Xtream listening on :${PORT}`);console.log(`activation upstream: ${ACTIVATION_URL}`);console.log(`releases upstream: ${RELEASE_URL}`);console.log(`storage mode: ${storageStatus().mode}`);if(!ADMIN_PASSWORD)console.warn('ADMIN_PASSWORD is empty; admin login disabled.')});
setTimeout(()=>{if(SYNC_ON_START){console.log(`startup catalog sync scheduled; restored=${catalog.items.size} lastSync=${catalog.lastSyncAt||'never'}`);syncAll().then(result=>logSync('startup',result)).catch(e=>console.error('startup sync failed:',e))}else if(!catalog.lastSyncAt){syncAll().then(result=>logSync('initial',result)).catch(e=>console.error('initial sync failed:',e))}else console.log(`catalog restored without startup sync: ${JSON.stringify(catalog.stats())}`)},1500).unref();
setInterval(()=>syncAll().then(result=>logSync('scheduled',result)).catch(e=>console.error('scheduled sync failed:',e)),SYNC_INTERVAL_MS).unref();
