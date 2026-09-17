import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ROOT, ADMIN_PASSWORD } from './config.mjs';
import { catalog,getAccount,resetAccount,createAdminSession,isAdmin,clearAdminSession } from './context.mjs';
import { providerDefinitions } from './providers.mjs';
import { baseUrl,json,text,readJsonBody } from './http.mjs';
import { syncAll,syncSource,syncState } from './sync.mjs';

const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
export async function serveAdminAsset(res,pathname){
  const file=pathname==='/admin'?'/admin.html':pathname; if(!['/admin.html','/admin.css','/admin.js'].includes(file))return false;
  const body=await readFile(path.join(ROOT,'public',file.slice(1)),'utf8');
  text(res,200,body,contentTypes[path.extname(file)]||'text/plain; charset=utf-8',file.endsWith('.html')?{'content-security-policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",'x-frame-options':'DENY'}:{});return true;
}
export async function adminApi(req,res,url){
  if(url.pathname==='/api/admin/login'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({})); if(!ADMIN_PASSWORD||String(body.password||'')!==ADMIN_PASSWORD)return json(res,401,{ok:false,error:'invalid_admin_password'});
    createAdminSession(res,req); return json(res,200,{ok:true});
  }
  if(!isAdmin(req))return json(res,401,{ok:false,error:'admin_auth_required'});
  if(url.pathname==='/api/admin/logout'&&req.method==='POST'){clearAdminSession(res);return json(res,200,{ok:true})}
  if(url.pathname==='/api/admin/status'&&req.method==='GET'){
    const sync=syncState(),account=getAccount();
    const perSource={};
    for(const item of catalog.items.values()){
      const bucket=perSource[item.source]||(perSource[item.source]={live:0,movies:0,episodes:0,total:0});
      bucket.total++;
      if(item.kind==='live')bucket.live++;
      else if(item.kind==='series_episode')bucket.episodes++;
      else bucket.movies++;
    }
    return json(res,200,{ok:true,baseUrl:baseUrl(req),stats:catalog.stats(),providers:providerDefinitions.map(p=>({id:p.id,name:p.name,kind:p.kind,enabled:p.enabled(),rights:p.rights,runtime:catalog.sources[p.id]||null,counts:perSource[p.id]||{live:0,movies:0,episodes:0,total:0}})),account:account?{username:account.username,createdAt:account.createdAt}:null,...sync});
  }
  if(url.pathname==='/api/admin/sync'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({}));
    const source=String(body.source||'').trim();
    if(syncState().syncing)return json(res,202,{ok:true,started:false,syncing:true,source:source||'all'});
    const task=source?syncSource(source):syncAll();
    task.catch(error=>console.error('admin background sync failed:',error));
    return json(res,202,{ok:true,started:true,syncing:true,source:source||'all'});
  }
  if(url.pathname==='/api/admin/account/reset'&&req.method==='POST'){
    const creds=await resetAccount(),host=baseUrl(req);return json(res,200,{ok:true,host,...creds,m3u:`${host}/get.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&type=m3u_plus&output=ts`,playerApi:`${host}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`,xmltv:`${host}/xmltv.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`});
  }
  if(url.pathname==='/api/admin/catalog'&&req.method==='GET'){
    const kind=url.searchParams.get('kind')||'',source=url.searchParams.get('source')||'',q=String(url.searchParams.get('q')||'').trim().toLowerCase(),limit=Math.min(500,Math.max(1,Number(url.searchParams.get('limit')||100)));
    let rows=[...catalog.items.values()];if(kind&&['live','movie','series_episode'].includes(kind))rows=rows.filter(x=>x.kind===kind);if(source)rows=rows.filter(x=>x.source===source);if(q)rows=rows.filter(x=>`${x.title} ${x.category} ${x.source}`.toLowerCase().includes(q));
    return json(res,200,{ok:true,total:rows.length,items:rows.slice(0,limit).map(x=>({id:x.id,kind:x.kind,title:x.title,category:x.category,source:x.source,licenseName:x.licenseName,licenseUrl:x.licenseUrl,attribution:x.attribution,icon:x.icon}))});
  }
  return json(res,404,{ok:false,error:'admin_route_not_found'});
}
