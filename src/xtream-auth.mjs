import crypto from 'node:crypto';
import { getAccount, verifyAccount } from './context.mjs';
import { SESSION_SECRET } from './config.mjs';

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


const SMOKE_DEFAULT=process.env.NODE_ENV==='production'?'true':'false';
let smokeState={enabled:String(process.env.ENABLE_XTREAM_SELF_TEST||SMOKE_DEFAULT).toLowerCase()==='true',running:false,ok:null,lastRunAt:null,elapsedMs:null,stage:'idle',error:null};

function smokeHeaders(){return{'content-type':'application/json','authorization':`Bearer ${SESSION_SECRET}`,'user-agent':'BLOFY-Xtream-SelfTest/1.0'}}

export function xtreamSmokeState(){return{...smokeState}}

export async function runXtreamSelfTest(publicBaseUrl){
  if(!smokeState.enabled)return smokeState;
  if(smokeState.running)return smokeState;
  const started=Date.now();smokeState={...smokeState,running:true,ok:null,lastRunAt:new Date().toISOString(),elapsedMs:null,stage:'create-account',error:null};
  let accountId='';
  try{
    if(!ACTIVATION_URL)throw new Error('activation_url_missing');
    const createResponse=await fetch(new URL('/api/v1/admin/xtream-gateway/accounts',ACTIVATION_URL+'/'),{
      method:'POST',
      headers:smokeHeaders(),
      body:JSON.stringify({label:'BLOFY automated compatibility probe',maxConnections:1,expiresAt:new Date(Date.now()+20*60_000).toISOString()})
    });
    if(!createResponse.ok)throw new Error(`create_account_http_${createResponse.status}`);
    const created=await createResponse.json();
    accountId=String(created?.item?.id||'');
    const username=String(created?.credentials?.username||''),password=String(created?.credentials?.password||'');
    if(!accountId||!username||!password)throw new Error('create_account_incomplete');

    const base=String(publicBaseUrl||'').replace(/\/+$/,'');
    smokeState.stage='player-api';
    let r=await fetch(`${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,{headers:{'user-agent':'BLOFY-Xtream-SelfTest/1.0','accept':'application/json'}});
    if(!r.ok)throw new Error(`player_api_http_${r.status}`);
    let j=await r.json();
    if(!(j?.user_info?.auth===1||j?.user_info?.auth===true||String(j?.user_info?.auth)==='1'))throw new Error('player_api_auth_failed');

    smokeState.stage='live-categories';
    r=await fetch(`${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`,{headers:{'accept':'application/json'}});
    if(!r.ok)throw new Error(`live_categories_http_${r.status}`);
    j=await r.json();
    if(!Array.isArray(j))throw new Error('live_categories_invalid');

    smokeState.stage='vod-categories';
    r=await fetch(`${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_categories`,{headers:{'accept':'application/json'}});
    if(!r.ok)throw new Error(`vod_categories_http_${r.status}`);
    j=await r.json();
    if(!Array.isArray(j))throw new Error('vod_categories_invalid');

    smokeState.stage='series-categories';
    r=await fetch(`${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_categories`,{headers:{'accept':'application/json'}});
    if(!r.ok)throw new Error(`series_categories_http_${r.status}`);
    j=await r.json();
    if(!Array.isArray(j))throw new Error('series_categories_invalid');

    smokeState.stage='m3u';
    r=await fetch(`${base}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`,{headers:{'accept':'audio/x-mpegurl,*/*'}});
    if(!r.ok)throw new Error(`m3u_http_${r.status}`);
    const m3u=await r.text();
    if(!m3u.startsWith('#EXTM3U'))throw new Error('m3u_invalid');

    smokeState={...smokeState,running:false,ok:true,elapsedMs:Date.now()-started,stage:'complete',error:null};
  }catch(error){
    smokeState={...smokeState,running:false,ok:false,elapsedMs:Date.now()-started,stage:smokeState.stage,error:String(error?.message||error).slice(0,180)};
  }finally{
    if(accountId){
      try{await fetch(new URL(`/api/v1/admin/xtream-gateway/accounts/${encodeURIComponent(accountId)}`,ACTIVATION_URL+'/'),{method:'DELETE',headers:{'authorization':`Bearer ${SESSION_SECRET}`,'user-agent':'BLOFY-Xtream-SelfTest/1.0'}})}catch{}
    }
  }
  return smokeState;
}


function legacyAdminHeaders(){
  return{'content-type':'application/json','authorization':`Bearer ${SESSION_SECRET}`,'user-agent':'BLOFY-Sources-Legacy-Admin/1.0'};
}
async function legacyAdminRequest(path,{method='GET',body=null}={}){
  if(!ACTIVATION_URL)throw new Error('activation_url_missing');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(new URL(path,ACTIVATION_URL+'/'),{
      method,signal:controller.signal,headers:legacyAdminHeaders(),body:body==null?undefined:JSON.stringify(body)
    });
    const text=await response.text();
    let data={};try{data=text?JSON.parse(text):{}}catch{}
    if(!response.ok)throw new Error(String(data?.error||`legacy_admin_http_${response.status}`));
    return data;
  }finally{clearTimeout(timer)}
}
export async function listLegacyGatewayAccounts(){
  const data=await legacyAdminRequest('/api/v1/admin/xtream-gateway');
  return{serverUrl:data?.serverUrl||'',items:Array.isArray(data?.items)?data.items:[]};
}
export async function createLegacyGatewayAccount({label='',durationDays=365,maxConnections=1}={}){
  const days=Math.max(0,Math.min(3650,Number(durationDays)||0));
  const expiresAt=days?new Date(Date.now()+days*86400000).toISOString():null;
  return legacyAdminRequest('/api/v1/admin/xtream-gateway/accounts',{method:'POST',body:{label,maxConnections,expiresAt}});
}
export async function resetLegacyGatewayPassword(id){
  return legacyAdminRequest(`/api/v1/admin/xtream-gateway/accounts/${encodeURIComponent(String(id))}/reset`,{method:'POST',body:{}});
}
export async function patchLegacyGatewayAccount(id,patch={}){
  return legacyAdminRequest(`/api/v1/admin/xtream-gateway/accounts/${encodeURIComponent(String(id))}`,{method:'PATCH',body:patch});
}
export async function deleteLegacyGatewayAccount(id){
  return legacyAdminRequest(`/api/v1/admin/xtream-gateway/accounts/${encodeURIComponent(String(id))}`,{method:'DELETE'});
}
