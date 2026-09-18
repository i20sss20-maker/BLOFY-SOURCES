import { catalog, createAccount, deleteAccount, getAccount, verifyAccount } from './context.mjs';

const SMOKE_DEFAULT=process.env.NODE_ENV==='production'?'true':'false';
let smokeState={
  enabled:String(process.env.ENABLE_XTREAM_SELF_TEST||SMOKE_DEFAULT).toLowerCase()==='true',
  running:false,ok:null,lastRunAt:null,elapsedMs:null,stage:'idle',error:null,timings:{},counts:{}
};

export async function authenticateXtream(username,password){
  const user=String(username||''),pass=String(password||'');
  if(!verifyAccount(user,pass))return null;
  return{username:user,password:pass,source:'standalone',account:getAccount(user),legacyUserInfo:null};
}

export function xtreamSmokeState(){return{...smokeState}}

export async function runXtreamSelfTest(publicBaseUrl){
  if(!smokeState.enabled||smokeState.running)return smokeState;
  const started=Date.now();
  smokeState={...smokeState,running:true,ok:null,lastRunAt:new Date().toISOString(),elapsedMs:null,stage:'create-account',error:null,timings:{},counts:{}};
  let account=null;
  try{
    account=await createAccount({durationDays:1,maxConnections:1,label:'BLOFY Xtream self-test'});
    const username=account.username,password=account.password;
    const base=String(publicBaseUrl||'').replace(/\/+$/,'');
    if(!base)throw new Error('public_base_url_missing');

    smokeState.stage='player-api';
    let r=await fetch(`${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,{headers:{'user-agent':'BLOFY-Xtream-SelfTest/2.0','accept':'application/json'}});
    if(!r.ok)throw new Error(`player_api_http_${r.status}`);
    let j=await r.json();
    if(!(j?.user_info?.auth===1||j?.user_info?.auth===true||String(j?.user_info?.auth)==='1'))throw new Error('player_api_auth_failed');

    for(const [stage,action,countKey] of [
      ['live-streams','get_live_streams','live'],
      ['vod-streams','get_vod_streams','vod'],
      ['series-list','get_series','series']
    ]){
      smokeState.stage=stage;
      const t0=Date.now();
      r=await fetch(`${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${action}`,{headers:{'accept':'application/json','accept-encoding':'gzip, deflate'}});
      if(!r.ok)throw new Error(`${stage}_http_${r.status}`);
      const list=await r.json();
      if(!Array.isArray(list))throw new Error(`${stage}_invalid`);
      smokeState.timings[countKey]=Date.now()-t0;
      smokeState.counts[countKey]=list.length;
    }

    smokeState.stage='m3u';
    const m3uStarted=Date.now();
    r=await fetch(`${base}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`,{headers:{'accept':'audio/x-mpegurl,*/*','accept-encoding':'gzip, deflate'}});
    if(!r.ok)throw new Error(`m3u_http_${r.status}`);
    const m3u=await r.text();
    if(!m3u.startsWith('#EXTM3U'))throw new Error('m3u_invalid');
    smokeState.timings.m3u=Date.now()-m3uStarted;

    smokeState.stage='playback-route';
    const live=catalog.listKind('live')[0];
    if(live){
      r=await fetch(`${base}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${live.id}.ts`,{method:'HEAD',redirect:'manual',headers:{'user-agent':'BLOFY-Xtream-SelfTest/2.0'}});
      if(![200,206,301,302,303,307,308].includes(r.status))throw new Error(`playback_route_http_${r.status}`);
    }

    smokeState={...smokeState,running:false,ok:true,elapsedMs:Date.now()-started,stage:'complete',error:null};
  }catch(error){
    smokeState={...smokeState,running:false,ok:false,elapsedMs:Date.now()-started,stage:smokeState.stage,error:String(error?.message||error).slice(0,180)};
  }finally{
    if(account?.username){try{await deleteAccount(account.username)}catch{}}
  }
  return smokeState;
}
