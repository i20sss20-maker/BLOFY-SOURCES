import http from 'node:http';
import { PORT,ADMIN_PASSWORD,SYNC_INTERVAL_MS } from './config.mjs';
import { catalog } from './context.mjs';
import { baseUrl,json } from './http.mjs';
import { adminApi,serveAdminAsset } from './admin.mjs';
import { servePlayerApi,serveM3u,servePlayback } from './xtream.mjs';
import { syncAll,syncState } from './sync.mjs';

function logSync(label,result){
  console.log(`${label} sync complete: ${JSON.stringify({stats:result.stats,log:result.log})}`);
}

const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url||'/',baseUrl(req));
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'blofy-sources-xtream',stats:catalog.stats(),...syncState()});
  if(req.method==='GET'&&url.pathname==='/'){res.writeHead(302,{location:'/admin'});return res.end()}
  if(req.method==='GET'&&await serveAdminAsset(res,url.pathname))return;
  if(url.pathname.startsWith('/api/admin/'))return adminApi(req,res,url);
  if(req.method==='GET'&&(url.pathname==='/player_api.php'||url.pathname==='/panel_api.php'))return servePlayerApi(req,res,url);
  if(req.method==='GET'&&url.pathname==='/get.php')return serveM3u(req,res,url);
  if(req.method==='GET'&&await servePlayback(req,res,url.pathname))return;
  return json(res,404,{ok:false,error:'not_found'});
}catch(e){console.error(e);if(!res.headersSent)json(res,500,{ok:false,error:'internal_error'});else res.end()}});
server.listen(PORT,()=>{console.log(`BLOFY SOURCES Xtream listening on :${PORT}`);if(!ADMIN_PASSWORD)console.warn('ADMIN_PASSWORD is empty; admin login disabled.')});
setTimeout(()=>{
  if(!catalog.lastSyncAt) syncAll().then(result=>logSync('initial',result)).catch(e=>console.error('initial sync failed:',e));
  else console.log(`catalog restored: ${JSON.stringify(catalog.stats())}`);
},1500).unref();
setInterval(()=>syncAll().then(result=>logSync('scheduled',result)).catch(e=>console.error('scheduled sync failed:',e)),SYNC_INTERVAL_MS).unref();
