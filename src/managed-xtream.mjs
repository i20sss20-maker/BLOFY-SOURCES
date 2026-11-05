import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { DATA_DIR, SESSION_SECRET } from './config.mjs';

const DEST=path.join(DATA_DIR,'managed-xtream.enc.json');
const KEY=crypto.createHash('sha256').update('blofy:managed-xtream:v1:'+SESSION_SECRET).digest();
let active=null;

function publicHost(hostname) {
  const h=hostname.toLowerCase().replace(/\.$/,'');
  if (!h || h==='localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || net.isIP(h)) return false;
  return /^[a-z0-9.-]+$/.test(h) && h.includes('.') && h.length<=253;
}
function privateIp(ip){
  if(net.isIP(ip)===4) {
    const p=ip.split('.').map(Number);
    return p[0]===0||p[0]===10||p[0]===127||p[0]>=224||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]===192&&p[1]===0)||(p[0]===198&&(p[1]===18||p[1]===19));
  }
  if(net.isIP(ip)===6){
    const s=ip.toLowerCase();
    return s==='::1'||s==='::'||s.startsWith('fe80:')||s.startsWith('fc')||s.startsWith('fd')||s.startsWith('::ffff:');
  }
  return true;
}
export async function validateManagedXtreamUrl(value){
  let u;
  try{u=new URL(String(value||'').trim())}catch{throw new Error('invalid_xtream_host')}
  if(!['https:','http:'].includes(u.protocol)||!publicHost(u.hostname)||u.username||u.password||u.search||u.hash)throw new Error('invalid_xtream_host');
  if(u.pathname!=='/'&&u.pathname!=='')throw new Error('xtream_host_must_be_origin');
  const addresses=await dns.lookup(u.hostname,{all:true,verbatim:true});
  if(!addresses.length||addresses.some(a=>privateIp(a.address)))throw new Error('xtream_host_not_public');
  return u.origin;
}
function seal(obj){
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',KEY,iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(obj),'utf8'),cipher.final()]);
  return {version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
function unseal(row){
  if(row?.version!==1)throw new Error('xtream_config_unknown_version');
  const decipher=crypto.createDecipheriv('aes-256-gcm',KEY,Buffer.from(row.iv,'base64'));
  decipher.setAuthTag(Buffer.from(row.tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(row.ciphertext,'base64')),decipher.final()]).toString('utf8'));
}
try{active=unseal(JSON.parse(await readFile(DEST,'utf8')))}catch(e){
  if(e.code!=='ENOENT')console.error('managed Xtream config unavailable:',e.message);
}
export function managedXtreamStatus(){
  if(!active)return{configured:false};
  return{configured:true,host:active.host,username:active.username,enabled:active.enabled,updatedAt:active.updatedAt,rightsReference:active.rightsReference};
}
export function managedXtreamCredentials(){
  if(!active?.enabled)throw new Error('managed_xtream_not_enabled');
  return{baseUrl:active.host,username:active.username,password:active.password,secretRef:'MANAGED'};
}
export function managedXtreamIsEnabled(){return Boolean(active?.enabled)}
export async function saveManagedXtream({host,username,password,rightsConfirmed,rightsReference}){
  if(rightsConfirmed!==true)throw new Error('redistribution_rights_confirmation_required');
  const ref=String(rightsReference||'').trim();
  if(ref.length<3||ref.length>160)throw new Error('rights_reference_required');
  const user=String(username||'').trim(),pass=String(password||'');
  if(!user||user.length>128||!pass||pass.length>256)throw new Error('xtream_credentials_required');
  const normalized=await validateManagedXtreamUrl(host);
  const next={host:normalized,username:user,password:pass,rightsReference:ref,enabled:true,updatedAt:new Date().toISOString()};
  await mkdir(DATA_DIR,{recursive:true});
  const tmp=DEST+'.'+crypto.randomBytes(5).toString('hex')+'.tmp';
  await writeFile(tmp,JSON.stringify(seal(next)),{encoding:'utf8',mode:0o600});
  await rename(tmp,DEST);
  active=next;
  return managedXtreamStatus();
}
export async function disableManagedXtream(){
  if(!active)return{configured:false};
  const next={...active,enabled:false,updatedAt:new Date().toISOString()};
  const tmp=DEST+'.'+crypto.randomBytes(5).toString('hex')+'.tmp';
  await writeFile(tmp,JSON.stringify(seal(next)),{encoding:'utf8',mode:0o600});
  await rename(tmp,DEST);active=next;
  return managedXtreamStatus();
}
export async function syncManagedXtream(){
  if(!active?.enabled)return[];
  const {syncAuthorizedXtreamFeed}=await import('./providers/authorized-xtream.mjs');
  return syncAuthorizedXtreamFeed({secretRef:'MANAGED',include:['live','vod','series']},{
    rights:{partner:'BLOFY Managed Xtream',rightsReference:active.rightsReference,territories:['SA'],expiresAt:null,rightsUrl:''},
    profile:{localizedArabic:true,arabicLanguage:true,arabicSubtitle:false},
    allowHttp:active.host.startsWith('http:'),
    maxItems:50000
  });
}
