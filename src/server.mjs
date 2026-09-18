import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { PORT,ADMIN_PASSWORD,SYNC_INTERVAL_MS,SYNC_ON_START,ROOT,PUBLIC_BASE_URL,XTREAM_PUBLIC_BASE_URL } from './config.mjs';
import { catalog,listAccounts } from './context.mjs';
import { baseUrl,json,text } from './http.mjs';
import { storageStatus } from './storage.mjs';
import { adminApi } from './admin.mjs';
import { servePlayerApi,serveM3u,serveXmltv,servePlayback } from './xtream.mjs';
import { syncAll,syncState } from './sync.mjs';
import { runXtreamSelfTest,xtreamSmokeState } from './xtream-auth.mjs';

const SELF_TEST_BASE=XTREAM_PUBLIC_BASE_URL||PUBLIC_BASE_URL||'';
const PROCESS_STARTED_AT=new Date().toISOString();
const BUILD_SHA=String(process.env.BLOFY_BUILD_SHA||'').trim();

function securityHeaders(){
  return{
    'strict-transport-security':'max-age=31536000',
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY',
    'referrer-policy':'no-referrer',
    'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'cross-origin-opener-policy':'same-origin'
  };
}
function logSync(label,result){console.log(`${label} sync complete: ${JSON.stringify({stats:result.stats,log:result.log})}`)}
function accountHealth(){
  const rows=listAccounts();
  return{
    total:rows.length,
    active:rows.filter(x=>x.enabled&&!x.expired).length,
    expired:rows.filter(x=>x.expired).length,
    disabled:rows.filter(x=>!x.enabled).length
  };
}
function cleanPath(pathname){
  if(pathname==='/'||!pathname)return '/';
  return pathname.replace(/\/+$/,'')||'/';
}

async function serveAdminUi(res,pathname){
  let file='';
  if(pathname==='/'||pathname==='/admin'||pathname==='/xtream'||pathname==='/sources-admin')file='admin.html';
  else if(pathname==='/admin-assets/admin.css'||pathname==='/xtream-assets/admin.css')file='admin.css';
  else if(pathname==='/admin-assets/admin.js'||pathname==='/xtream-assets/admin.js')file='admin.js';
  else return false;
  const body=await readFile(path.join(ROOT,'public',file),'utf8');
  const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';
  const headers=file.endsWith('.html')?{
    'content-security-policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    ...securityHeaders()
  }:{};
  text(res,200,body,type,headers);
  return true;
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/',baseUrl(req)),pathname=cleanPath(url.pathname);

    if((req.method==='GET'||req.method==='HEAD')&&pathname==='/health'){
      const body={
        ok:true,
        service:'blofy-xtream',
        standalone:true,
        build:{sha:BUILD_SHA,startedAt:PROCESS_STARTED_AT},
        storage:storageStatus(),
        xtream:{
          ok:true,
          stats:catalog.stats(),
          accounts:accountHealth(),
          smoke:xtreamSmokeState(),
          ...syncState()
        }
      };
      if(req.method==='HEAD'){
        res.writeHead(200,{'cache-control':'no-store',...securityHeaders()});
        return res.end();
      }
      return json(res,200,body,securityHeaders());
    }

    if(req.method==='GET'&&await serveAdminUi(res,pathname))return;

    if(pathname.startsWith('/admin-api/')||pathname.startsWith('/xtream-api/')){
      const prefix=pathname.startsWith('/admin-api/')?'/admin-api/':'/xtream-api/';
      const adminUrl=new URL(url);
      adminUrl.pathname=`/api/admin/${pathname.slice(prefix.length)}`;
      return adminApi(req,res,adminUrl);
    }

    if((req.method==='GET'||req.method==='POST')&&(pathname==='/player_api.php'||pathname==='/panel_api.php')){
      return await servePlayerApi(req,res,url);
    }
    if(req.method==='GET'&&pathname==='/get.php')return await serveM3u(req,res,url);
    if(req.method==='GET'&&pathname==='/xmltv.php')return await serveXmltv(req,res,url);
    if((req.method==='GET'||req.method==='HEAD')&&await servePlayback(req,res,pathname))return;

    return json(res,404,{ok:false,error:'route_not_found'});
  }catch(error){
    console.error('standalone xtream request error:',error?.message||String(error));
    if(!res.headersSent)json(res,500,{ok:false,error:'gateway_error'},securityHeaders());
    else res.end();
  }
});

server.on('clientError',(error,socket)=>{
  console.warn('xtream client error:',error.message);
  if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

server.listen(PORT,'0.0.0.0',()=>{
  console.log(`BLOFY standalone Xtream listening on :${PORT}`);
  console.log(`storage mode: ${storageStatus().mode}`);
  if(!ADMIN_PASSWORD)console.warn('ADMIN_PASSWORD is empty; admin login disabled.');
});

setTimeout(()=>{
  if(SYNC_ON_START){
    console.log(`startup catalog sync scheduled; restored=${catalog.items.size} lastSync=${catalog.lastSyncAt||'never'}`);
    syncAll().then(result=>logSync('startup',result)).catch(error=>console.error('startup sync failed:',error));
  }else if(!catalog.lastSyncAt){
    syncAll().then(result=>logSync('initial',result)).catch(error=>console.error('initial sync failed:',error));
  }else{
    console.log(`catalog restored without startup sync: ${JSON.stringify(catalog.stats())}`);
  }
},1500).unref();

setInterval(()=>{
  syncAll().then(result=>logSync('scheduled',result)).catch(error=>console.error('scheduled sync failed:',error));
},SYNC_INTERVAL_MS).unref();

async function startupSmoke(){
  if(!SELF_TEST_BASE)return;
  for(let waitAttempt=1;waitAttempt<=120;waitAttempt++){
    if(!syncState().syncing)break;
    if(waitAttempt===1||waitAttempt%12===0)console.log(`xtream self-test waiting for catalog sync: attempt ${waitAttempt}`);
    await new Promise(resolve=>setTimeout(resolve,5_000));
  }
  if(syncState().syncing){
    console.error('xtream self-test skipped: catalog sync did not finish before timeout');
    return;
  }
  for(let attempt=1;attempt<=8;attempt++){
    const result=await runXtreamSelfTest(SELF_TEST_BASE);
    console.log(`xtream self-test attempt ${attempt}:`,JSON.stringify(result));
    if(result.ok)return;
    await new Promise(resolve=>setTimeout(resolve,15_000));
  }
}
setTimeout(()=>startupSmoke().catch(error=>console.error('xtream self-test failed:',String(error?.message||error))),8000).unref();
setInterval(()=>{
  if(!SELF_TEST_BASE)return;
  runXtreamSelfTest(SELF_TEST_BASE).catch(error=>console.error('scheduled xtream self-test failed:',String(error?.message||error)));
},30*60_000).unref();
