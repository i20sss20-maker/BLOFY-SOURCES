import { catalog } from './context.mjs';
import { resolveStream } from './providers.mjs';

// Rolling, in-memory observations: no passwords, upstream URLs, tokens, or IPs are stored.
const observations=[];
const MAX_EVENTS=250;
const WINDOW_MS=60*60*1000;
const MAX_PROBES=4;
let lastProbeAt=0,probeRunning=false;
let latestProbe={at:null,results:[]};

const cleanCode=value=>String(value||'').replace(/[^a-z0-9_-]/gi,'_').slice(0,48);
function clamp(value,max=600000){
  const n=Number(value);
  return Number.isFinite(n)&&n>=0?Math.min(max,Math.round(n)):null;
}

export function recordPlaybackEvent(item,outcome,{status,reason,startupMs,durationMs,attempts}={}){
  if(!item)return;
  const at=new Date().toISOString();
  observations.push({
    at,id:Number(item.id)||0,title:String(item.title||'').slice(0,110),
    kind:String(item.kind||''),source:String(item.source||''),
    outcome:cleanCode(outcome),httpStatus:Number.isInteger(Number(status))?Number(status):null,
    reason:cleanCode(reason),startupMs:clamp(startupMs),durationMs:clamp(durationMs),
    attempts:clamp(attempts,10)
  });
  if(observations.length>MAX_EVENTS)observations.splice(0,observations.length-MAX_EVENTS);
}

export function playbackObservations(now=Date.now()){
  const since=now-WINDOW_MS;
  const rows=observations.filter(x=>Date.parse(x.at)>=since);
  const starts=rows.filter(x=>x.outcome==='started');
  const startsMs=starts.map(x=>x.startupMs).filter(Number.isFinite).sort((a,b)=>a-b);
  const percentile=(p)=>startsMs.length?startsMs[Math.max(0,Math.ceil(startsMs.length*p)-1)]:null;
  const total=(key)=>rows.filter(x=>x.outcome===key).length;
  const failedByReason={};
  for(const row of rows){
    if(row.outcome==='failed'||row.outcome==='interrupted'||row.outcome==='limited'){
      const k=row.reason||('http_'+(row.httpStatus||'unknown'));
      failedByReason[k]=(failedByReason[k]||0)+1;
    }
  }
  const byItem=new Map();
  for(const row of rows)byItem.set(row.id,row);
  return{
    windowMinutes:60,
    starts:starts.length,failures:total('failed'),interruptions:total('interrupted'),
    limits:total('limited'),redirects:total('redirected'),
    medianStartMs:percentile(0.5),p95StartMs:percentile(0.95),
    slowStarts:starts.filter(x=>x.startupMs!=null&&x.startupMs>6000).length,
    failureReasons:failedByReason,
    observedItems:byItem.size,
    latest:[...rows].reverse().slice(0,40)
  };
}

function statusResult(item,details){
  return {id:Number(item.id),title:String(item.title||'').slice(0,110),kind:item.kind,
    source:item.source,...details};
}
function nonMediaResponse(contentType,bytes,kind){
  const type=String(contentType||'').toLowerCase();
  const prefix=Buffer.from(bytes||[]).subarray(0,256).toString('utf8').trimStart().toLowerCase();
  if(type.includes('text/html')||type.includes('application/json')||prefix.startsWith('<!doctype html')||prefix.startsWith('<html'))return 'upstream_not_media';
  if(kind==='live'&&(prefix.startsWith('#extm3u')||type.includes('mpegurl')))return 'upstream_hls_not_ts';
  return '';
}
export function unexpectedMediaResponse(contentType,bytes,kind){return nonMediaResponse(contentType,bytes,kind)}

// One short, bounded GET Range is more representative than HEAD for IPTV.
// This never streams the entire source or returns its URL to the dashboard.
export async function probeOne(item,{resolve=resolveStream,fetchFn=fetch,timeoutMs=12000}={}){
  if(item?.stream?.resolver!=='authorized-xtream'){
    return statusResult(item,{state:'unsupported',reason:'not_managed_xtream'});
  }
  const started=Date.now();
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(new Error('probe_timeout')),timeoutMs);
  let response,reader;
  try{
    const destination=await resolve(item);
    const url=new URL(destination.url);
    if(!['https:','http:'].includes(url.protocol))throw new Error('invalid_protocol');
    response=await fetchFn(url.toString(),{
      redirect:'follow',signal:abort.signal,
      headers:{range:'bytes=0-1023',accept:'*/*','accept-encoding':'identity','user-agent':'BLOFY-Restream-Probe/1.0'}
    });
    const status=response.status;
    const contentType=response.headers.get('content-type')||'';
    if(!response.ok){
      return statusResult(item,{state:'failed',httpStatus:status,reason:'upstream_http_'+status,startupMs:Date.now()-started});
    }
    if(!response.body)return statusResult(item,{state:'failed',httpStatus:status,reason:'empty_stream',startupMs:Date.now()-started});
    reader=response.body.getReader();
    let first;
    do{ first=await reader.read(); }while(!first.done&&!first.value?.byteLength);
    const ms=Date.now()-started;
    if(first.done)return statusResult(item,{state:'failed',httpStatus:status,reason:'empty_stream',startupMs:ms});
    const invalid=nonMediaResponse(contentType,first.value,item.kind);
    if(invalid)return statusResult(item,{state:'failed',httpStatus:status,reason:invalid,startupMs:ms});
    return statusResult(item,{state:ms>6000?'slow':'ok',httpStatus:status,reason:'',startupMs:ms});
  }catch(error){
    const message=abort.signal.aborted?'timeout':(error?.name==='TypeError'?'network_failed':'upstream_unreachable');
    return statusResult(item,{state:'failed',httpStatus:null,reason:message,startupMs:Date.now()-started});
  }finally{
    clearTimeout(timer);
    abort.abort();
    if(reader){try{await reader.cancel()}catch{}try{reader.releaseLock()}catch{}}
    else if(response?.body){try{await response.body.cancel()}catch{}}
  }
}
export function recentProbe(){return latestProbe}
function defaultSamples(){
  const found=[],kinds=new Set();
  for(const item of catalog.items.values()){
    if(item.stream?.resolver!=='authorized-xtream')continue;
    if(kinds.has(item.kind))continue;
    found.push(item);kinds.add(item.kind);
    if(found.length>=3)break;
  }
  return found;
}
export async function runPlaybackProbe(requestedIds=[]){
  if(probeRunning)return{ok:false,status:429,error:'probe_already_running'};
  if(Date.now()-lastProbeAt<15000)return{ok:false,status:429,error:'probe_cooldown'};
  if(!Array.isArray(requestedIds)||requestedIds.length>MAX_PROBES)return{ok:false,status:400,error:'invalid_probe_ids'};
  if(requestedIds.some(id=>!/^\d{1,15}$/.test(String(id))))return{ok:false,status:400,error:'invalid_probe_ids'};
  const ids=[...new Set(requestedIds.map(String))];
  const items=ids.length?ids.map(id=>catalog.get(id)).filter(Boolean):defaultSamples();
  if(ids.length&&items.length!==ids.length)return{ok:false,status:404,error:'catalog_item_missing'};
  if(items.some(x=>x.stream?.resolver!=='authorized-xtream'))return{ok:false,status:400,error:'unsupported_source_probe'};
  if(!items.length)return{ok:false,status:400,error:'no_probe_candidates'};
  lastProbeAt=Date.now();probeRunning=true;
  try{
    const results=[];
    // Two in-flight samples max; do not create a burst of upstream streams.
    for(let i=0;i<items.length;i+=2){
      results.push(...await Promise.all(items.slice(i,i+2).map(item=>probeOne(item))));
    }
    latestProbe={at:new Date().toISOString(),results};
    return{ok:true,...latestProbe};
  }finally{probeRunning=false}
}
export function resetPlaybackObservationsForTest(){
  observations.length=0;lastProbeAt=0;probeRunning=false;latestProbe={at:null,results:[]};
}
