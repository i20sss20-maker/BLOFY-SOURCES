import {randomUUID} from 'node:crypto';
import {mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,unlinkSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const ORIGIN='https://blofy-activation-portal-production.up.railway.app';
// Each feed/request must hold a durable admission before upstream access.
// A failed or ambiguous acknowledgement never grants a media connection.
// Closing local holds is NOT evidence of provider-wide capacity.
export function createRelayIngressHold({env=process.env,fetchImpl=fetch,newId=randomUUID,sleep=delay}={}){
 const enabled=env.BLOFY_RELAY_INGRESS_HOLDS==='1',token=env.BLOFY_STREAM_RELAY_SHARED_TOKEN||'';
 const journal=String(env.BLOFY_RELAY_CLEANUP_JOURNAL_DIR||'').trim();
 const entryPattern=/^(close|abandon)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
 const validJournal=journal.startsWith('/')&&journal.length>1;
 let journalReady=false;
 if(enabled&&validJournal){
  try{mkdirSync(journal,{recursive:true,mode:0o700});const s=statSync(journal);
   journalReady=s.isDirectory()&&(s.mode&0o077)===0;
  }catch{}
 }
 function syncDir(){const fd=openSync(journal,'r');try{fsyncSync(fd)}finally{closeSync(fd)}}
 function record(operation,id){
  if(!journalReady)return false;
  const name=operation+'-'+id;
  if(!entryPattern.test(name))return false;
  try{
   let fd;
   try{fd=openSync(join(journal,name),'wx',0o600);writeFileSync(fd,'1');fsyncSync(fd)}
   catch(e){if(e.code!=='EEXIST')throw e}
   finally{if(fd!==undefined)closeSync(fd)}
   syncDir();return true;
  }catch{return false}
 }
 function remove(operation,id){
  if(!journalReady||!entryPattern.test(operation+'-'+id))return;
  try{unlinkSync(join(journal,operation+'-'+id));syncDir()}catch{}
 }
 const post=async(operation,holdId)=>{
  try{
   const r=await fetchImpl(ORIGIN+'/internal/legacy-ingress-hold',{method:'POST',redirect:'error',signal:AbortSignal.timeout(2500),headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({operation,holdId})});
   if(r.status!==200){await r.body?.cancel().catch(()=>{});return r.status>=400&&r.status<500&&![408,425,429].includes(r.status)?false:null}
   const rd=r.body?.getReader();if(!rd)return null;
   let n=0;const parts=[];
   try{for(;;){const x=await rd.read();if(x.done)break;n+=x.value.byteLength;if(n>128)return null;parts.push(Buffer.from(x.value))}}
   finally{await rd.cancel().catch(()=>{});rd.releaseLock()}
   const v=JSON.parse(Buffer.concat(parts).toString('utf8'));
   return v?.ok===true&&Object.keys(v).length===1?true:null;
  }catch{return null}
 };
 const inFlight=new Map();
 const attemptCleanup=async(operation,id)=>{
  for(const backoff of [0,150,450]){
   if(backoff)await sleep(backoff);
   const result=await post(operation,id);
   if(result===true){remove(operation,id);return true;}
   if(result===false)break;
  }
  console.warn('BLOFY_RELAY_INGRESS_CLEANUP_UNCONFIRMED',JSON.stringify({operation}));
  return false;
 };
 // Only journal after a caller has confirmed upstream closure, or an
 // unacknowledged enter was never used. Never replay an active admission.
 function cleanup(operation,id){
  const key=operation+'-'+id;
  if(inFlight.has(key))return inFlight.get(key);
  if(journalReady&&!record(operation,id))
   console.warn('BLOFY_RELAY_INGRESS_JOURNAL_UNAVAILABLE');
  const p=attemptCleanup(operation,id).finally(()=>inFlight.delete(key));
  inFlight.set(key,p);return p;
 }
 let replaying=false;
 async function replay(){
  if(!journalReady||replaying||token.length<32)return;
  replaying=true;
  try{
   const names=readdirSync(journal).filter(n=>entryPattern.test(n)).slice(0,16);
   await Promise.allSettled(names.map(n=>{const [,operation,id]=entryPattern.exec(n);return cleanup(operation,id)}));
  }catch{}finally{replaying=false}
 }
 if(journalReady&&token.length>=32){
  const t=setInterval(()=>void replay(),30000);t.unref?.();
  queueMicrotask(()=>void replay());
 }
 const acquire=async()=>{
  if(!enabled)return {ok:true,close:async()=>true};
  if(token.length<32)return {ok:false};
  const id=newId();
  const entered=await post('enter',id);
  if(entered!==true){
   if(entered===null)return {ok:false,cleanup:cleanup('abandon',id)};
   return {ok:false};
  }
  let closing;
  return {ok:true,close(){
   closing??=cleanup('close',id);
   return closing;
  }};
 };
 acquire.replayCleanup=replay;
 return acquire;
}
