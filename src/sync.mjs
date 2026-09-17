import { catalog } from './context.mjs';
import { providerDefinitions } from './providers.mjs';
let current=null;let last=[];
export function syncState(){return{syncing:!!current,lastSyncLog:last}}

async function fetchProvider(provider){
  if(!provider.enabled())return{provider,status:'disabled',rows:[],count:0};
  const started=Date.now();
  try{
    const rows=await provider.sync();
    console.log(`source fetched ${provider.id}: ${rows.length} items in ${Date.now()-started}ms`);
    return{provider,status:'ok',rows};
  }catch(error){
    console.warn(`source fetch failed ${provider.id}: ${String(error?.message||error)}`);
    return{provider,status:'error',rows:[],error:String(error?.message||error)};
  }
}
function applyResult(result){
  const provider=result.provider;
  if(result.status==='disabled'){
    catalog.sources[provider.id]={...(catalog.sources[provider.id]||{}),id:provider.id,name:provider.name,enabled:false,rights:provider.rights,lastError:null};
    return{source:provider.id,status:'disabled',count:0};
  }
  if(result.status==='error'){
    catalog.markSourceError(provider.id,result.error);
    return{source:provider.id,status:'error',error:result.error};
  }
  const count=catalog.replaceSource(provider.id,result.rows,{name:provider.name,enabled:true,kind:provider.kind,rights:provider.rights,lastError:null,failedAt:null});
  return{source:provider.id,status:'ok',count};
}
async function fetchWithConcurrency(providers,limit=3){
  const results=new Array(providers.length),queue=providers.map((provider,index)=>({provider,index}));
  await Promise.all(Array.from({length:Math.min(limit,queue.length)},async()=>{
    while(queue.length){
      const job=queue.shift();
      results[job.index]=await fetchProvider(job.provider);
    }
  }));
  return results;
}
export async function syncAll(){
  if(current)return current;
  current=(async()=>{
    const started=Date.now();
    const concurrency=Math.max(1,Math.min(6,Number(process.env.SYNC_PROVIDER_CONCURRENCY)||3));
    const fetched=await fetchWithConcurrency(providerDefinitions,concurrency);
    const log=fetched.map(applyResult);
    catalog.finishSync();
    await catalog.persist({remote:true});
    last=log;
    const result={ok:!log.some(x=>x.status==='error'),elapsedMs:Date.now()-started,log,stats:catalog.stats()};
    console.log(`catalog sync committed: ${JSON.stringify({elapsedMs:result.elapsedMs,stats:result.stats,log})}`);
    return result;
  })().finally(()=>{current=null});
  return current;
}
export async function syncSource(sourceId){
  if(current)return current;
  const id=String(sourceId||'').trim(),provider=providerDefinitions.find(item=>item.id===id);if(!provider)return{ok:false,error:'source_not_found'};
  current=(async()=>{
    const started=Date.now(),fetched=await fetchProvider(provider),entry=applyResult(fetched);
    catalog.finishSync();await catalog.persist({remote:true});last=[entry];
    return{ok:entry.status!=='error',elapsedMs:Date.now()-started,log:[entry],stats:catalog.stats()};
  })().finally(()=>{current=null});
  return current;
}
