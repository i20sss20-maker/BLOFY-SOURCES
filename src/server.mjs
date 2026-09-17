import http from 'node:http';
import { PORT,ADMIN_PASSWORD,SYNC_INTERVAL_MS,SYNC_ON_START } from './config.mjs';
import { catalog,listAccounts } from './context.mjs';
import { baseUrl,json } from './http.mjs';
import { adminApi,serveAdminAsset } from './admin.mjs';
import { servePlayerApi,serveM3u,serveXmltv,servePlayback } from './xtream.mjs';
import { syncAll,syncState } from './sync.mjs';

function logSync(label,result){console.log(`${label} sync complete: ${JSON.stringify({stats:result.stats,log:result.log})}`)}
function accountHealth(){const rows=listAccounts();return{total:rows.length,active:rows.filter(x=>x.enabled&&!x.expired).length,expired:rows.filter(x=>x.expired).length,disabled:rows.filter(x=>!x.enabled).length}}
function cleanPath(pathname){if(pathname==='/'||!pathname)return '/';return pathname.replace(/\/+$/,'')||'/'}

const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url||'/',baseUrl(req)),pathname=cleanPath(url.pathname);
  if((req.method==='GET'||req.method==='HEAD')&&pathname==='/health'){
    const body={ok:true,service:'blofy-sources-xtream',stats:catalog.stats(),accounts:accountHealth(),...syncState()};
    if(req.method==='HEAD'){res.writeHead(200,{'cache-control':'no-store'});return res.end()}
    return json(res,200,body);
  }
  if(req.method==='GET'&&pathname==='/'){res.writeHead(302,{location:'/admin'});return res.end()}
  if(req.method==='GET'&&await serveAdminAsset(res,pathname))return;
  if(pathname.startsWith('/api/admin/')){url.pathname=pathname;return adminApi(req,res,url)}
  if(req.method==='GET'&&(pathname==='/player_api.php'||pathname==='/panel_api.php'))return servePlayerApi(req,res,url);
  if(req.method==='GET'&&pathname==='/get.php')return serveM3u(req,res,url);
  if(req.method==='GET'&&pathname==='/xmltv.php')return serveXmltv(req,res,url);
  if(req.method==='GET'&&await servePlayback(req,res,pathname))return;
  return json(res,404,{ok:false,error:'not_found'});
}catch(e){console.error(e);if(!res.headersSent)json(res,500,{ok:false,error:'internal_error'});else res.end()}});
server.listen(PORT,()=>{console.log(`BLOFY SOURCES Xtream listening on :${PORT}`);if(!ADMIN_PASSWORD)console.warn('ADMIN_PASSWORD is empty; admin login disabled.')});
setTimeout(()=>{
  if(SYNC_ON_START){console.log(`startup catalog sync scheduled; restored=${catalog.items.size} lastSync=${catalog.lastSyncAt||'never'}`);syncAll().then(result=>logSync('startup',result)).catch(e=>console.error('startup sync failed:',e))}
  else if(!catalog.lastSyncAt){syncAll().then(result=>logSync('initial',result)).catch(e=>console.error('initial sync failed:',e))}
  else console.log(`catalog restored without startup sync: ${JSON.stringify(catalog.stats())}`);
},1500).unref();
setInterval(()=>syncAll().then(result=>logSync('scheduled',result)).catch(e=>console.error('scheduled sync failed:',e)),SYNC_INTERVAL_MS).unref();
