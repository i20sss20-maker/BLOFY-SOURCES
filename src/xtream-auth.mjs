import crypto from 'node:crypto';
import { getAccount, verifyAccount } from './context.mjs';

const ACTIVATION_URL = String(process.env.ACTIVATION_URL || '').trim().replace(/\/+$/, '');
const CACHE_TTL_MS = Math.max(5_000, Number(process.env.LEGACY_XTREAM_AUTH_CACHE_MS || 120_000));
const NEGATIVE_TTL_MS = Math.max(2_000, Number(process.env.LEGACY_XTREAM_AUTH_NEGATIVE_CACHE_MS || 15_000));
const cache = new Map();

function cacheKey(username,password){
  return crypto.createHash('sha256').update(String(username)).update('\0').update(String(password)).digest('hex');
}

function parseEpoch(value){
  const n=Number(value);
  return Number.isFinite(n)&&n>0?new Date(n*1000).toISOString():null;
}

function normalizeLegacyAccount(user={}){
  return {
    username:String(user.username||''),
    createdAt:parseEpoch(user.created_at)||new Date().toISOString(),
    expiresAt:parseEpoch(user.exp_date),
    enabled:String(user.status||'Active').toLowerCase()!=='disabled',
    expired:Boolean(user.exp_date&&Number(user.exp_date)*1000<=Date.now()),
    maxConnections:Math.max(1,Number(user.max_connections)||1),
    label:'Legacy Xtream',
    note:'',
    legacy:true
  };
}

async function legacyAuth(username,password){
  if(!ACTIVATION_URL)return null;
  const key=cacheKey(username,password),now=Date.now(),cached=cache.get(key);
  if(cached&&cached.expiresAt>now)return cached.value;

  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
    const url=new URL('/player_api.php',ACTIVATION_URL+'/');
    url.searchParams.set('username',String(username||''));
    url.searchParams.set('password',String(password||''));
    const response=await fetch(url,{signal:controller.signal,headers:{'user-agent':'BLOFY-Sources-Legacy-Auth/1.0','accept':'application/json'}});
    if(!response.ok){cache.set(key,{value:null,expiresAt:now+NEGATIVE_TTL_MS});return null}
    const text=await response.text();
    if(Buffer.byteLength(text)>256_000)throw new Error('legacy_xtream_auth_response_too_large');
    const data=JSON.parse(text);
    const authenticated=String(data?.user_info?.auth??'')==='1'||data?.user_info?.auth===1||data?.user_info?.auth===true;
    if(!authenticated){cache.set(key,{value:null,expiresAt:now+NEGATIVE_TTL_MS});return null}
    const value={
      username:String(username||''),
      password:String(password||''),
      source:'legacy',
      account:normalizeLegacyAccount(data.user_info||{}),
      legacyUserInfo:data.user_info||{}
    };
    cache.set(key,{value,expiresAt:now+CACHE_TTL_MS});
    return value;
  }catch(error){
    if(error?.name!=='AbortError')console.warn('legacy xtream auth failed:',String(error?.message||error));
    cache.set(key,{value:null,expiresAt:now+NEGATIVE_TTL_MS});
    return null;
  }finally{clearTimeout(timer)}
}

export async function authenticateXtream(username,password){
  const user=String(username||''),pass=String(password||'');
  if(verifyAccount(user,pass)){
    return{username:user,password:pass,source:'local',account:getAccount(user),legacyUserInfo:null};
  }
  return legacyAuth(user,pass);
}

export async function legacyXtreamHealth(){
  if(!ACTIVATION_URL)return{ok:false,configured:false,accounts:0,error:'activation_url_missing'};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch(new URL('/xtream/health',ACTIVATION_URL+'/'),{signal:controller.signal,headers:{'accept':'application/json','user-agent':'BLOFY-Sources-Legacy-Health/1.0'}});
    if(!response.ok)return{ok:false,configured:true,accounts:0,error:`http_${response.status}`};
    const data=await response.json();
    return{ok:Boolean(data?.ok),configured:true,accounts:Number(data?.accounts||0),catalog:data?.catalog||{},playbackProxy:Boolean(data?.playbackProxy)};
  }catch(error){
    return{ok:false,configured:true,accounts:0,error:error?.name==='AbortError'?'timeout':String(error?.message||error).slice(0,160)};
  }finally{clearTimeout(timer)}
}
