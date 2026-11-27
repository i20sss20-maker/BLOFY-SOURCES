import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
const ORIGIN='https://blofy-activation-portal-production.up.railway.app';
// Each feed/request must hold a durable admission before upstream access.
// A failed or ambiguous acknowledgement never grants a media connection.
// Closing local holds is NOT evidence of provider-wide capacity.
export function createRelayIngressHold({env=process.env,fetchImpl=fetch,newId=randomUUID,sleep=delay}={}){
 const enabled=env.BLOFY_RELAY_INGRESS_HOLDS==='1',token=env.BLOFY_STREAM_RELAY_SHARED_TOKEN||'';
 const post=async(operation,holdId)=>{
  try{
   const r=await fetchImpl(ORIGIN+'/internal/legacy-ingress-hold',{method:'POST',redirect:'error',signal:AbortSignal.timeout(2500),headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({operation,holdId})});
   if(r.status!==200){await r.body?.cancel().catch(()=>{});return r.status>=400&&r.status<500?false:null}
   const rd=r.body?.getReader();if(!rd)return null;
   let n=0;const parts=[];
   try{for(;;){const x=await rd.read();if(x.done)break;n+=x.value.byteLength;if(n>128)return null;parts.push(Buffer.from(x.value))}}
   finally{await rd.cancel().catch(()=>{});rd.releaseLock()}
   const v=JSON.parse(Buffer.concat(parts).toString('utf8'));
   return v?.ok===true&&Object.keys(v).length===1?true:null;
  }catch{return null}
 };
 const cleanup=async(operation,id)=>{
  for(const backoff of [0,150,450]){
   if(backoff)await sleep(backoff);
   const result=await post(operation,id);
   if(result===true)return true;
   if(result===false)break;
  }
  console.warn('BLOFY_RELAY_INGRESS_CLEANUP_UNCONFIRMED',JSON.stringify({operation}));
  return false;
 };
 return async()=>{
  if(!enabled)return {ok:true,close:async()=>true};
  if(token.length<32)return {ok:false};
  const id=newId();
  const entered=await post('enter',id);
  if(entered!==true){
   if(entered===null)void cleanup('abandon',id);
   return {ok:false};
  }
  let closing;
  return {ok:true,close(){
   closing??=cleanup('close',id);
   return closing;
  }};
 };
}
