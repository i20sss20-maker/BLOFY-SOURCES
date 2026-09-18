import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { CatalogStore } from './catalog.mjs';
import { DATA_DIR, SESSION_SECRET } from './config.mjs';
import { baseUrl } from './http.mjs';
import { loadRemoteJson, saveRemoteJson } from './storage.mjs';

const STATE_PATH = path.join(DATA_DIR, 'state.json');
const BOOTSTRAP_USERNAME = String(process.env.XTREAM_USERNAME || '').trim();
const BOOTSTRAP_PASSWORD = String(process.env.XTREAM_PASSWORD || '').trim();
const BOOTSTRAP_CREATED_AT = new Date().toISOString();

export const catalog = await new CatalogStore({ dataDir: DATA_DIR }).init();
let state = migrateState(await loadState());

async function loadState(){
  await mkdir(DATA_DIR,{recursive:true});
  try { const remote=await loadRemoteJson('state.json'); if(remote&&typeof remote==='object')return remote; }
  catch(e){ console.warn('remote state load skipped:',e.message); }
  try { const x=JSON.parse(await readFile(STATE_PATH,'utf8')); return x&&typeof x==='object'?x:{}; }
  catch(e){ if(e?.code!=='ENOENT') console.warn('state load skipped:',e.message); return {}; }
}
function normalizeAccount(account={}){
  return {username:String(account.username||'').trim(),salt:String(account.salt||''),hash:String(account.hash||''),createdAt:account.createdAt||new Date().toISOString(),expiresAt:account.expiresAt||null,enabled:account.enabled!==false,maxConnections:Math.max(1,Math.min(20,Number(account.maxConnections)||1)),label:String(account.label||'').trim().slice(0,120),note:String(account.note||'').trim().slice(0,500),lastRenewedAt:account.lastRenewedAt||null};
}
function migrateState(raw={}){
  const accounts=[];
  if(Array.isArray(raw.accounts)) for(const a of raw.accounts){const n=normalizeAccount(a);if(n.username&&n.salt&&n.hash&&!accounts.some(x=>x.username===n.username))accounts.push(n)}
  if(raw.account?.username&&!accounts.some(a=>a.username===raw.account.username)){const n=normalizeAccount(raw.account);if(n.username&&n.salt&&n.hash)accounts.push(n)}
  return {schemaVersion:2,accounts};
}
async function saveState(){
  const payload={schemaVersion:2,accounts:state.accounts},tmp=`${STATE_PATH}.tmp`;
  await writeFile(tmp,JSON.stringify(payload,null,2),'utf8');await rename(tmp,STATE_PATH);
  try{await saveRemoteJson('state.json',payload)}catch(error){console.error('remote state persist failed:',error.message);throw error}
}
function hash(password,salt){return crypto.scryptSync(String(password),salt,32).toString('hex')}
function safeHex(a,b){try{const x=Buffer.from(String(a),'hex'),y=Buffer.from(String(b),'hex');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y)}catch{return false}}
function safeText(a,b){const x=Buffer.from(String(a),'utf8'),y=Buffer.from(String(b),'utf8');return x.length===y.length&&x.length>0&&crypto.timingSafeEqual(x,y)}
function bootstrapAccount(){if(state.accounts.length)return null;if(!/^[A-Za-z0-9_-]{4,64}$/.test(BOOTSTRAP_USERNAME)||BOOTSTRAP_PASSWORD.length<8)return null;return{username:BOOTSTRAP_USERNAME,createdAt:BOOTSTRAP_CREATED_AT,expiresAt:null,enabled:true,maxConnections:1,label:'Bootstrap',note:'',bootstrap:true}}
function random(prefix,bytes){return `${prefix}${crypto.randomBytes(bytes).toString('base64url').replace(/[-_]/g,'').slice(0,bytes*2)}`}
function validateUsername(username){return /^[A-Za-z0-9_-]{4,64}$/.test(username)}
function publicAccount(a){if(!a)return null;const expired=Boolean(a.expiresAt&&new Date(a.expiresAt).getTime()<=Date.now());return{username:a.username,createdAt:a.createdAt,expiresAt:a.expiresAt||null,enabled:a.enabled!==false,expired,maxConnections:a.maxConnections||1,label:a.label||'',note:a.note||'',lastRenewedAt:a.lastRenewedAt||null,bootstrap:Boolean(a.bootstrap)}}
export function listAccounts(){const rows=state.accounts.map(publicAccount),bootstrap=bootstrapAccount();if(bootstrap)rows.push(publicAccount(bootstrap));return rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}
export function getAccount(username=''){if(username){const found=state.accounts.find(a=>safeText(a.username,username));return found||((bootstrapAccount()&&safeText(BOOTSTRAP_USERNAME,username))?bootstrapAccount():null)}return state.accounts[0]||bootstrapAccount()}
export function authenticateAccount(username,password){const a=state.accounts.find(row=>safeText(row.username,username));if(a){if(a.enabled===false)return null;if(a.expiresAt&&new Date(a.expiresAt).getTime()<=Date.now())return null;return safeHex(a.hash,hash(password,a.salt))?a:null}const bootstrap=bootstrapAccount();return bootstrap&&safeText(username,BOOTSTRAP_USERNAME)&&safeText(password,BOOTSTRAP_PASSWORD)?bootstrap:null}
export function verifyAccount(username,password){return Boolean(authenticateAccount(username,password))}
export async function createAccount({username='',password='',durationDays=30,maxConnections=1,label='',note=''}={}){
  const finalUsername=String(username||random('blofy',5).toLowerCase()).trim(),finalPassword=String(password||random('',12));
  if(!validateUsername(finalUsername))throw new Error('invalid_username');if(finalPassword.length<8||finalPassword.length>128)throw new Error('invalid_password');if(state.accounts.some(a=>a.username===finalUsername))throw new Error('username_exists');
  const days=Math.max(0,Math.min(3650,Number(durationDays)||0)),now=Date.now(),salt=crypto.randomBytes(16).toString('hex');
  const account=normalizeAccount({username:finalUsername,salt,hash:hash(finalPassword,salt),createdAt:new Date(now).toISOString(),expiresAt:days?new Date(now+days*86400000).toISOString():null,enabled:true,maxConnections,label,note});
  state.accounts.push(account);await saveState();return{...publicAccount(account),password:finalPassword};
}
export async function resetAccount(){return createAccount({durationDays:365,label:'Generated account'})}
export async function renewAccount(username,days=30){const a=state.accounts.find(x=>x.username===String(username));if(!a)throw new Error('account_not_found');const add=Math.max(1,Math.min(3650,Number(days)||30))*86400000,base=a.expiresAt&&new Date(a.expiresAt).getTime()>Date.now()?new Date(a.expiresAt).getTime():Date.now();a.expiresAt=new Date(base+add).toISOString();a.enabled=true;a.lastRenewedAt=new Date().toISOString();await saveState();return publicAccount(a)}
export async function setAccountEnabled(username,enabled){const a=state.accounts.find(x=>x.username===String(username));if(!a)throw new Error('account_not_found');a.enabled=Boolean(enabled);await saveState();return publicAccount(a)}
export async function updateAccount(username,{maxConnections,label,note}={}){const a=state.accounts.find(x=>x.username===String(username));if(!a)throw new Error('account_not_found');if(maxConnections!=null)a.maxConnections=Math.max(1,Math.min(20,Number(maxConnections)||1));if(label!=null)a.label=String(label).trim().slice(0,120);if(note!=null)a.note=String(note).trim().slice(0,500);await saveState();return publicAccount(a)}
export async function resetAccountPassword(username,password=''){const a=state.accounts.find(x=>x.username===String(username));if(!a)throw new Error('account_not_found');const finalPassword=String(password||random('',12));if(finalPassword.length<8||finalPassword.length>128)throw new Error('invalid_password');const salt=crypto.randomBytes(16).toString('hex');a.salt=salt;a.hash=hash(finalPassword,salt);await saveState();return{...publicAccount(a),password:finalPassword}}
export async function deleteAccount(username){const before=state.accounts.length;state.accounts=state.accounts.filter(x=>x.username!==String(username));if(state.accounts.length===before)throw new Error('account_not_found');await saveState();return true}
function sign(payload){return crypto.createHmac('sha256',SESSION_SECRET).update(payload).digest('base64url')}
function cookieMap(req){const out={};for(const p of String(req.headers.cookie||'').split(';')){const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim())}return out}
export function createAdminSession(res,req){const payload=`${Date.now()+8*60*60_000}.${crypto.randomBytes(18).toString('base64url')}`,token=`${payload}.${sign(payload)}`,secure=baseUrl(req).startsWith('https://')?'; Secure':'';res.setHeader('set-cookie',`blofy_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`)}
export function isAdmin(req){const token=cookieMap(req).blofy_admin||'',i=token.lastIndexOf('.');if(i<1)return false;const payload=token.slice(0,i),sig=token.slice(i+1),expected=sign(payload),x=Buffer.from(sig),y=Buffer.from(expected);if(x.length!==y.length||!crypto.timingSafeEqual(x,y))return false;const exp=Number(payload.split('.',1)[0]);return Number.isFinite(exp)&&exp>Date.now()}
export function clearAdminSession(res){res.setHeader('set-cookie','blofy_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')}
