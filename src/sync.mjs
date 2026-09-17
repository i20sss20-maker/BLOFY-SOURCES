import { catalog } from './context.mjs';
import { providerDefinitions } from './providers.mjs';
let current=null; let last=[];
export function syncState(){ return {syncing:!!current,lastSyncLog:last}; }
export async function syncAll(){
  if(current)return current;
  current=(async()=>{const started=Date.now(),log=[];
    for(const provider of providerDefinitions){
      if(!provider.enabled()){
        catalog.sources[provider.id]={...(catalog.sources[provider.id]||{}),id:provider.id,name:provider.name,enabled:false,rights:provider.rights};
        log.push({source:provider.id,status:'disabled',count:0}); continue;
      }
      try{
        const rows=await provider.sync();
        const count=catalog.replaceSource(provider.id,rows,{name:provider.name,enabled:true,kind:provider.kind,rights:provider.rights,lastError:null});
        log.push({source:provider.id,status:'ok',count}); await catalog.persist();
      }catch(error){ catalog.markSourceError(provider.id,error); log.push({source:provider.id,status:'error',error:String(error?.message||error)}); }
    }
    catalog.finishSync(); await catalog.persist(); last=log;
    return {ok:true,elapsedMs:Date.now()-started,log,stats:catalog.stats()};
  })().finally(()=>{current=null});
  return current;
}
