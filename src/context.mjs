import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CatalogStore } from './catalog.mjs';
import { DATA_DIR, SESSION_SECRET } from './config.mjs';
import { baseUrl } from './http.mjs';

const STATE_PATH = path.join(DATA_DIR, 'state.json');
const BOOTSTRAP_USERNAME = String(process.env.XTREAM_USERNAME || '').trim();
const BOOTSTRAP_PASSWORD = String(process.env.XTREAM_PASSWORD || '').trim();
const BOOTSTRAP_CREATED_AT = new Date().toISOString();

export const catalog = await new CatalogStore({ dataDir: DATA_DIR }).init();
let state = await loadState();

async function loadState(){
  await mkdir(DATA_DIR,{recursive:true});
  try { const x=JSON.parse(await readFile(STATE_PATH,'utf8')); return x&&typeof x==='object'?x:{account:null}; }
  catch(e){ if(e?.code!=='ENOENT') console.warn('state load skipped:',e.message); return {account:null}; }
}
async function saveState(){ await writeFile(STATE_PATH,JSON.stringify(state,null,2),'utf8'); }
function hash(password,salt){ return crypto.scryptSync(String(password),salt,32).toString('hex'); }
function safeHex(a,b){ try{const x=Buffer.from(String(a),'hex'),y=Buffer.from(String(b),'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y)}catch{return false} }
function safeText(a,b){
  const x=Buffer.from(String(a),'utf8'), y=Buffer.from(String(b),'utf8');
  return x.length===y.length && x.length>0 && crypto.timingSafeEqual(x,y);
}
function bootstrapAccount(){
  if(!/^[A-Za-z0-9_-]{4,64}$/.test(BOOTSTRAP_USERNAME) || BOOTSTRAP_PASSWORD.length<8) return null;
  return { username: BOOTSTRAP_USERNAME, createdAt: BOOTSTRAP_CREATED_AT, bootstrap: true };
}
export function getAccount(){ return state.account || bootstrapAccount(); }
export function verifyAccount(username,password){
  const a=state.account;
  if(a) return String(username)===a.username && safeHex(a.hash,hash(password,a.salt));
  const bootstrap=bootstrapAccount();
  return !!bootstrap && safeText(username,bootstrap.username) && safeText(password,BOOTSTRAP_PASSWORD);
}
function random(prefix,bytes){ return `${prefix}${crypto.randomBytes(bytes).toString('base64url').replace(/[-_]/g,'').slice(0,bytes*2)}`; }
export async function resetAccount(){
  const username=random('blofy',5).toLowerCase(), password=random('',12), salt=crypto.randomBytes(16).toString('hex');
  state.account={username,salt,hash:hash(password,salt),createdAt:new Date().toISOString()}; await saveState();
  return {username,password};
}
function sign(payload){ return crypto.createHmac('sha256',SESSION_SECRET).update(payload).digest('base64url'); }
function cookieMap(req){ const out={}; for(const p of String(req.headers.cookie||'').split(';')){const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())} return out; }
export function createAdminSession(res,req){
  const payload=`${Date.now()+8*60*60_000}.${crypto.randomBytes(18).toString('base64url')}`;
  const token=`${payload}.${sign(payload)}`; const secure=baseUrl(req).startsWith('https://')?'; Secure':'';
  res.setHeader('set-cookie',`blofy_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`);
}
export function isAdmin(req){
  const token=cookieMap(req).blofy_admin||''; const i=token.lastIndexOf('.'); if(i<1)return false;
  const payload=token.slice(0,i),sig=token.slice(i+1),expected=sign(payload);
  const x=Buffer.from(sig),y=Buffer.from(expected); if(x.length!==y.length||!crypto.timingSafeEqual(x,y))return false;
  const exp=Number(payload.split('.',1)[0]); return Number.isFinite(exp)&&exp>Date.now();
}
export function clearAdminSession(res){ res.setHeader('set-cookie','blofy_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'); }
