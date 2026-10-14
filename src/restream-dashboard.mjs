import { catalog, blofysatSelection } from './context.mjs';
import { providerDefinitions } from './providers.mjs';
import { connectionStats } from './connections.mjs';
import { syncState } from './sync.mjs';
import { openLicensedMediaProxyAllowed } from './open-licensed-playback.mjs';

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
    samples,recentChecks:[],
    connections:{total:sessions.total,users:sessions.users}
  };
}

