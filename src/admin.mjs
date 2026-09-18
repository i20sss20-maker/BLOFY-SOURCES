import crypto from 'node:crypto';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ROOT, ADMIN_PASSWORD } from './config.mjs';
import { catalog,listAccounts,createAccount,resetAccount,renewAccount,setAccountEnabled,updateAccount,resetAccountPassword,deleteAccount,createAdminSession,isAdmin,clearAdminSession } from './context.mjs';
import { authenticateXtream } from './xtream-auth.mjs';
import { providerDefinitions } from './providers.mjs';
import { baseUrl,xtreamBaseUrl,json,text,readJsonBody } from './http.mjs';
import { syncAll,syncSource,syncState } from './sync.mjs';

const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
const LOGIN_WINDOW_MS=10*60_000,LOGIN_MAX_ATTEMPTS=8,loginAttempts=new Map();
function loginKey(req){return String(req.headers['cf-connecting-ip']||req.headers['x-real-ip']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim().slice(0,120)}
function loginState(key,now=Date.now()){const row=loginAttempts.get(key);if(!row||now-row.startedAt>=LOGIN_WINDOW_MS){const fresh={startedAt:now,count:0};loginAttempts.set(key,fresh);return fresh}return row}
function safePasswordEqual(value){const a=Buffer.from(String(value||''),'utf8'),b=Buffer.from(String(ADMIN_PASSWORD||''),'utf8');return a.length===b.length&&a.length>0&&crypto.timingSafeEqual(a,b)}
function pruneLoginAttempts(now=Date.now()){if(loginAttempts.size<1000)return;for(const [key,row] of loginAttempts)if(now-row.startedAt>=LOGIN_WINDOW_MS)loginAttempts.delete(key)}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function isArabicItem(item){return String(item?.language||'').toLowerCase()==='ar'||String(item?.category||'').startsWith('عربي ·')||item?.rights?.arabic===true||/[\u0600-\u06ff]/.test(String(item?.title||''))}
function catalogCounts(rows){const out={total:0,live:0,movies:0,episodes:0};for(const item of rows){out.total++;if(item.kind==='live')out.live++;else if(item.kind==='series_episode')out.episodes++;else out.movies++}return out}
function accountSummary(accounts){const now=Date.now();return{total:accounts.length,active:accounts.filter(x=>x.enabled&&!x.expired).length,expired:accounts.filter(x=>x.expired).length,disabled:accounts.filter(x=>!x.enabled).length,expiringSoon:accounts.filter(x=>x.enabled&&!x.expired&&x.expiresAt&&(new Date(x.expiresAt).getTime()-now)<=7*86400000).length}}
function normalizeLegacyAdminAccount(row={}){
export async function serveAdminAsset(res,pathname){
  const file=pathname==='/admin'?'/admin.html':pathname;if(!['/admin.html','/admin.css','/admin.js'].includes(file))return false;
  const body=await readFile(path.join(ROOT,'public',file.slice(1)),'utf8');
  text(res,200,body,contentTypes[path.extname(file)]||'text/plain; charset=utf-8',file.endsWith('.html')?{'content-security-policy':"default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",'x-frame-options':'DENY','referrer-policy':'no-referrer'}:{});return true;
}
export async function adminApi(req,res,url){
  if(url.pathname==='/api/admin/login'&&req.method==='POST'){
    pruneLoginAttempts();const key=loginKey(req),attempt=loginState(key);
    if(attempt.count>=LOGIN_MAX_ATTEMPTS){const retry=Math.max(1,Math.ceil((LOGIN_WINDOW_MS-(Date.now()-attempt.startedAt))/1000));return json(res,429,{ok:false,error:'too_many_login_attempts'},{'retry-after':String(retry)})}
    const body=await readJsonBody(req).catch(()=>({}));if(!ADMIN_PASSWORD||!safePasswordEqual(body.password)){attempt.count++;await sleep(Math.min(1200,150+(attempt.count*100)));return json(res,401,{ok:false,error:'invalid_admin_password'})}
    loginAttempts.delete(key);createAdminSession(res,req);return json(res,200,{ok:true});
  }
  if(!isAdmin(req))return json(res,401,{ok:false,error:'admin_auth_required'});
  if(url.pathname==='/api/admin/logout'&&req.method==='POST'){clearAdminSession(res);return json(res,200,{ok:true})}
  if(url.pathname==='/api/admin/status'&&req.method==='GET'){
    const sync=syncState(),accounts=listAccounts(),perSource={};const all=[...catalog.items.values()],arabicRows=all.filter(isArabicItem),arabic=catalogCounts(arabicRows);
    arabic.series=catalog.seriesGroups().filter(group=>String(group.category||'').startsWith('عربي ·')||/[\u0600-\u06ff]/.test(String(group.title||''))).length;
    for(const item of all){const bucket=perSource[item.source]||(perSource[item.source]={live:0,movies:0,episodes:0,total:0});bucket.total++;if(item.kind==='live')bucket.live++;else if(item.kind==='series_episode')bucket.episodes++;else bucket.movies++}
    return json(res,200,{ok:true,adminBaseUrl:baseUrl(req),baseUrl:xtreamBaseUrl(req),stats:catalog.stats(),arabic,accountsSummary:accountSummary(accounts),providers:providerDefinitions.map(p=>({id:p.id,name:p.name,kind:p.kind,enabled:p.enabled(),rights:p.rights,runtime:catalog.sources[p.id]||null,counts:perSource[p.id]||{live:0,movies:0,episodes:0,total:0}})),account:accounts[0]||null,...sync});
  }
  if(url.pathname==='/api/admin/accounts'&&req.method==='GET'){
    const accounts=listAccounts();return json(res,200,{ok:true,summary:accountSummary(accounts),accounts});
  }
  if(url.pathname==='/api/admin/accounts'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({}));
    try{const account=await createAccount({username:body.username,password:body.password,durationDays:body.durationDays,maxConnections:body.maxConnections,label:body.label,note:body.note});const host=xtreamBaseUrl(req);return json(res,201,{ok:true,host,...account,m3u:`${host}/get.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}&type=m3u_plus&output=ts`,playerApi:`${host}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}`})}catch(e){return json(res,400,{ok:false,error:String(e?.message||e)})}
  }
  if(url.pathname==='/api/admin/accounts/renew'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({}));try{return json(res,200,{ok:true,account:await renewAccount(body.username,body.days)})}catch(e){return json(res,400,{ok:false,error:String(e?.message||e)})}
  }
  if(url.pathname==='/api/admin/accounts/toggle'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({}));try{return json(res,200,{ok:true,account:await setAccountEnabled(body.username,body.enabled)})}catch(e){return json(res,400,{ok:false,error:String(e?.message||e)})}
  }
  if(url.pathname==='/api/admin/accounts/update'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({}));try{return json(res,200,{ok:true,account:await updateAccount(body.username,{maxConnections:body.maxConnections,label:body.label,note:body.note})})}catch(e){return json(res,400,{ok:false,error:String(e?.message||e)})}
  }
  if(url.pathname==='/api/admin/accounts/password'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({}));try{const account=await resetAccountPassword(body.username,body.password);const host=xtreamBaseUrl(req);return json(res,200,{ok:true,host,...account,m3u:`${host}/get.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}&type=m3u_plus&output=ts`,playerApi:`${host}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}`})}catch(e){return json(res,400,{ok:false,error:String(e?.message||e)})}
  }
  if(url.pathname==='/api/admin/accounts'&&req.method==='DELETE'){
    const username=String(url.searchParams.get('username')||'');try{await deleteAccount(username);return json(res,200,{ok:true})}catch(e){return json(res,400,{ok:false,error:String(e?.message||e)})}
  }
  if(url.pathname==='/api/admin/sync'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({})),source=String(body.source||'').trim();if(syncState().syncing)return json(res,202,{ok:true,started:false,syncing:true,source:source||'all'});
    const task=source?syncSource(source):syncAll();task.catch(error=>console.error('admin background sync failed:',error));return json(res,202,{ok:true,started:true,syncing:true,source:source||'all'});
  }
  if(url.pathname==='/api/admin/account/reset'&&req.method==='POST'){
    try{const account=await resetAccount(),host=xtreamBaseUrl(req);return json(res,200,{ok:true,host,...account,m3u:`${host}/get.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}&type=m3u_plus&output=ts`,playerApi:`${host}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}`,xmltv:`${host}/xmltv.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password)}`})}catch(e){return json(res,400,{ok:false,error:String(e?.message||e)})}
  }
  if(url.pathname==='/api/admin/account/test'&&req.method==='POST'){
    const body=await readJsonBody(req).catch(()=>({})),username=String(body.username||'').trim(),password=String(body.password||''),auth=await authenticateXtream(username,password),host=xtreamBaseUrl(req),stats=catalog.stats();
    if(!auth)return json(res,200,{ok:true,auth:false,host,error:'invalid_or_expired_xtream_credentials'});
    return json(res,200,{ok:true,auth:true,authSource:auth.source,host,username,stats:{live:stats.live,movies:stats.movies,series:stats.series,episodes:stats.episodes,totalItems:stats.totalItems},playerApi:`${host}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,m3u:`${host}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`,xmltv:`${host}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`});
  }
  if(url.pathname==='/api/admin/catalog'&&req.method==='GET'){
    const kind=url.searchParams.get('kind')||'',source=url.searchParams.get('source')||'',arabic=['1','true','yes'].includes(String(url.searchParams.get('arabic')||'').toLowerCase()),q=String(url.searchParams.get('q')||'').trim().toLowerCase(),limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit')||60))),offset=Math.max(0,Number(url.searchParams.get('offset')||0));
    let rows=[...catalog.items.values()];if(kind&&['live','movie','series_episode'].includes(kind))rows=rows.filter(x=>x.kind===kind);if(source)rows=rows.filter(x=>x.source===source);if(arabic)rows=rows.filter(isArabicItem);if(q)rows=rows.filter(x=>`${x.title} ${x.category} ${x.source} ${x.language||''}`.toLowerCase().includes(q));
    const total=rows.length,items=rows.slice(offset,offset+limit).map(x=>({id:x.id,kind:x.kind,title:x.title,category:x.category,source:x.source,language:x.language||'',licenseName:x.licenseName,licenseUrl:x.licenseUrl,attribution:x.attribution,icon:x.icon}));
    return json(res,200,{ok:true,total,offset,limit,hasMore:offset+items.length<total,items});
  }
  return json(res,404,{ok:false,error:'admin_route_not_found'});
}
