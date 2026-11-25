// Passive metrics for synthetic test traffic only. No provider probes, URLs,
// credentials, client addresses, per-viewer identifiers or unbounded labels.
const CHANNELS=['hd','fhd','list'];
const KINDS=['manifest','segment'];
const LIMITS=[5,10,25,50,100,250,500,1000,2000,4000,10000];
const blank=()=>({finished:0,ok:0,overloaded:0,unavailable:0,expired:0,other:0,aborted:0,slowSegments:0,hist:Array(LIMITS.length+1).fill(0)});
export function createEngineQualityMetrics({clock=Date.now,monotonic=()=>performance.now(),windowMinutes=15}={}){
 if(!Number.isInteger(windowMinutes)||windowMinutes<1||windowMinutes>60)throw Error('quality_metrics_window_invalid');
 const rows=new Map();let active=0;
 function trim(minute){
  for(const key of rows.keys())if(key<=minute-windowMinutes||key>minute)rows.delete(key);
 }
 function observe(res,channel,kind){
  if(!CHANNELS.includes(channel)||!KINDS.includes(kind)||typeof res.once!=='function')return;
  const start=monotonic();active++;
  let settled=false;
  function settle(finished){
   if(settled)return;settled=true;active--;
   res.removeListener('finish',onFinish);res.removeListener('close',onClose);
   const minute=Math.floor(clock()/60000);trim(minute);
   if(!rows.has(minute))rows.set(minute,new Map());
   const bucket=rows.get(minute),key=channel+':'+kind;
   if(!bucket.has(key))bucket.set(key,blank());
   const r=bucket.get(key);
   if(!finished){r.aborted++;return;}
   r.finished++;
   const status=res.statusCode;
   if(status>=200&&status<300){
    r.ok++;
    const ms=Math.max(0,monotonic()-start),i=LIMITS.findIndex(n=>ms<=n);
    r.hist[i<0?LIMITS.length:i]++;
    if(kind==='segment'&&ms>=4000)r.slowSegments++;
   }else if(status===429)r.overloaded++;
   else if(status===503)r.unavailable++;
   else if(status===404)r.expired++;
   else r.other++;
  }
  const onFinish=()=>settle(true),onClose=()=>settle(res.writableFinished===true);
  res.once('finish',onFinish);res.once('close',onClose);
 }
 function snapshot(){
  const minute=Math.floor(clock()/60000);trim(minute);
  const totals={};
  for(const channel of CHANNELS)for(const kind of KINDS)totals[channel+':'+kind]=blank();
  for(const bucket of rows.values())for(const [key,r] of bucket){
   const dest=totals[key];
   for(const k of Object.keys(dest))if(k!=='hist')dest[k]+=r[k];
   r.hist.forEach((n,i)=>dest.hist[i]+=n);
  }
  const results=Object.entries(totals).filter(([,r])=>r.finished||r.aborted).map(([key,r])=>{
   const {hist,...counts}=r;let p95UpperMs=null;
   if(r.ok){let seen=0;const target=Math.ceil(r.ok*.95);for(let i=0;i<hist.length;i++){seen+=hist[i];if(seen>=target){p95UpperMs=LIMITS[i]??null;break;}}}
   return {scope:key,...counts,p95UpperMs,p95Above10000:r.ok>0&&p95UpperMs===null};
  });
  return {ok:true,scope:'synthetic_quality_delivery_only',windowMinutes,activeResponses:active,results,
   measuresServerResponseCompletion:true,viewerPlaybackVerified:false,upstreamHealthVerified:false,providerRequests:0};
 }
 return {observe,snapshot};
}
