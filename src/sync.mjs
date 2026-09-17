import { catalog } from './context.mjs';
import { providerDefinitions } from './providers.mjs';
let current=null; let last=[];
export function syncState(){ return {syncing:!!current,lastSyncLog:last}; }

async function syncProvider(provider) {
  if(!provider.enabled()){
    catalog.sources[provider.id]={...(catalog.sources[provider.id]||{}),id:provider.id,name:provider.name,enabled:false,rights:provider.rights};
    return {source:provider.id,status:'disabled',count:0};
  }
  try{
    const rows=await provider.sync();
    const count=catalog.replaceSource(provider.id,rows,{name:provider.name,enabled:true,kind:provider.kind,rights:provider.rights,lastError:null,failedAt:null});
    await catalog.persist();
    return {source:provider.id,status:'ok',count};
  }catch(error){
    catalog.markSourceError(provider.id,error);
    await catalog.persist();
    return {source:provider.id,status:'error',error:String(error?.message||error)};
  }
}

export async function syncAll(){
  if(current)return current;
  current=(async()=>{const started=Date.now(),log=[];
    for(const provider of providerDefinitions) log.push(await syncProvider(provider));
    catalog.finishSync(); await catalog.persist(); last=log;
    return {ok:true,elapsedMs:Date.now()-started,log,stats:catalog.stats()};
  })().finally(()=>{current=null});
  return current;
}

export async function syncSource(sourceId){
  if(current)return current;
  const id=String(sourceId||'').trim();
  const provider=providerDefinitions.find(item=>item.id===id);
  if(!provider)return {ok:false,error:'source_not_found'};
  current=(async()=>{const started=Date.now();
    const entry=await syncProvider(provider);
    catalog.finishSync(); await catalog.persist(); last=[entry];
    return {ok:entry.status!=='error',elapsedMs:Date.now()-started,log:[entry],stats:catalog.stats()};
  })().finally(()=>{current=null});
  return current;
}
