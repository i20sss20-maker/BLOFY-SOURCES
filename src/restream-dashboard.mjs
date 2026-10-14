import { catalog, blofysatSelection } from './context.mjs';
import { providerDefinitions } from './providers.mjs';
import { resolveStream } from './providers.mjs';
import { connectionStats } from './connections.mjs';
import { syncState } from './sync.mjs';
import { openLicensedMediaProxyAllowed } from './open-licensed-playback.mjs';

const recentChecks=[];
const OPEN_SOURCES=new Set(['wikimedia','internet-archive']);
const RESTREAM_LIMIT=10;

export function isOpenRestreamCandidate(item){
  if(!item || !OPEN_SOURCES.has(item.source))return false;
  const probeUrl=item.source==='wikimedia'
    ? item.stream?.url
    : 'https://archive.org/download/verified-license-required';
  return openLicensedMediaProxyAllowed(item,probeUrl,true);
}

export function restreamOverview({items=catalog.items.values(),providers=providerDefinitions,
  selection=blofysatSelection.summary(),sessions=connectionStats(),
  syncing=syncState().syncing,enabled=String(process.env.XTREAM_PROXY_OPEN_LICENSED||'').toLowerCase()==='true'}={}){
  const counters=new Map(providers.map(provider=>[provider.id,{
    id:provider.id,name:provider.name,enabled:provider.enabled(),
    available:0,candidates:0,live:0,movies:0,episodes:0,
    status:'',rights:provider.rights
  }]));
  const samples=[];
  let total=0,candidates=0;
  for(const item of items){
    total++;
    const row=counters.get(item.source);
    if(row){
      row.available++;
      if(item.kind==='live')row.live++;
      else if(item.kind==='series_episode')row.episodes++;
      else if(item.kind==='movie')row.movies++;
    }
    if(isOpenRestreamCandidate(item)){
      candidates++;
      if(row)row.candidates++;
      if(samples.length<RESTREAM_LIMIT)samples.push({
        id:item.id,title:item.title,source:item.source,category:item.category,
        kind:item.kind,licenseName:item.licenseName,licenseUrl:item.licenseUrl,
        attribution:item.attribution
      });
    }
  }
  for(const row of counters.values()){
    row.status=row.candidates>0?'licensed-candidates':row.available>0?'view-only-or-unverified':row.enabled?'empty':'disabled';
  }
  return{
    enabled,streamingMode:enabled?'licensed-proxy':'redirect-only',
    catalog:{total,candidates},
    privateSelection:{
      total:selection.total||0,counts:selection.counts||{},
      metadataOnly:true,playbackConnected:false
    },
    syncing:Boolean(syncing),sources:[...counters.values()],
    samples,recentChecks:[...recentChecks],
    connections:{total:sessions.total,users:sessions.users}
  };
}

function allowedCheckHost(url,item){
  try{
    const u=new URL(url);
    if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')return false;
    if(item.source==='wikimedia')return u.hostname==='upload.wikimedia.org';
    return item.source==='internet-archive'
      && (u.hostname==='archive.org'||u.hostname.endsWith('.archive.org'));
  }catch{return false}
}

async function verifyHttpHead(url,item,{request=fetch,signal}={}){
  let current=url;
  for(let i=0;i<5;i++){
    if(!allowedCheckHost(current,item))throw new Error('source_domain_not_allowed');
    const response=await request(current,{method:'HEAD',redirect:'manual',signal,headers:{'user-agent':'BLOFY-Restream-Check/1.0','accept':'*/*'}});
    if([301,302,303,307,308].includes(response.status)){
      const loc=response.headers.get('location');
      await response.body?.cancel();
      if(!loc)throw new Error('redirect_missing_location');
      current=new URL(loc,current).toString();
      continue;
    }
    if(response.status===405){
      await response.body?.cancel();
      const fallback=await request(current,{method:'GET',redirect:'manual',signal,headers:{range:'bytes=0-0','user-agent':'BLOFY-Restream-Check/1.0'}});
      const result={status:fallback.status,domain:new URL(current).hostname,contentType:fallback.headers.get('content-type')||''};
      await fallback.body?.cancel();
      return result;
    }
    const result={status:response.status,domain:new URL(current).hostname,contentType:response.headers.get('content-type')||''};
    await response.body?.cancel();
    return result;
  }
  throw new Error('redirect_limit_exceeded');
}

export async function checkOpenRestreamItem(id,{getItem=value=>catalog.get(value),resolver=resolveStream,request=fetch,timeoutMs=15000}={}){
  if(!/^\d{1,15}$/.test(String(id)))throw new Error('invalid_item_id');
  const item=getItem(id);
  if(!item)throw new Error('item_not_found');
  if(!isOpenRestreamCandidate(item))throw new Error('item_not_licensed_for_restream');
  const resolved=await resolver(item);
  if(!openLicensedMediaProxyAllowed(item,resolved.url,true))throw new Error('resolved_source_not_licensed_for_restream');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  let check;
  try{
    check=await verifyHttpHead(resolved.url,item,{request,signal:controller.signal});
  }catch(e){
    if(controller.signal.aborted)throw new Error('upstream_timeout');
    throw e;
  }finally{clearTimeout(timer)}
  const result={itemId:item.id,title:item.title,source:item.source,
    checkedAt:new Date().toISOString(),reachable:[200,206].includes(check.status),
    status:check.status,domain:check.domain,contentType:check.contentType,
    note:'Connectivity check only, not full playback validation or a grant of rights.'};
  recentChecks.unshift(result);
  if(recentChecks.length>15)recentChecks.length=15;
  return result;
}
