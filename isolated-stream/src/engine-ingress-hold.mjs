import {randomUUID} from 'node:crypto';
const ORIGIN='https://blofy-activation-portal-production.up.railway.app';
// Each feed/request must hold a durable admission before upstream access.
// A failed or ambiguous acknowledgement never grants a media connection.
// Closing local holds is NOT evidence of provider-wide capacity.
export function createRelayIngressHold({env=process.env,fetchImpl=fetch,newId=randomUUID}={}){
 const enabled=env.BLOFY_RELAY_INGRESS_HOLDS==='1',token=env.BLOFY_STREAM_RELAY_SHARED_TOKEN||'';
 const post=async(operation,holdId)=>{
  if(token.length<32)return false;
  try{
   const r=await fetchImpl(ORIGIN+'/internal/legacy-ingress-hold',{method:'POST',redirect:'error',signal:AbortSignal.timeout(2500),headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({operation,holdId})});
   if(r.status!==200){await r.body?.cancel().catch(()=>{});return false}
   const rd=r.body?.getReader();if(!rd)return false;
   let n=0;const parts=[];
   try{for(;;){const x=await rd.read();if(x.done)break;n+=x.value.byteLength;if(n>128)return false;parts.push(Buffer.from(x.value))}}
   finally{await rd.cancel().catch(()=>{});rd.releaseLock()}
   const v=JSON.parse(Buffer.concat(parts).toString('utf8'));
   return v?.ok===true&&Object.keys(v).length===1;
  }catch{return false}
 };
 return async()=>{
  if(!enabled)return {ok:true,close:async()=>true};
  const id=newId();
  if(!await post('enter',id))return {ok:false};
  let closed=false;
  return {ok:true,async close(){
   if(closed)return true;
   if(await post('close',id)){closed=true;return true}
   return false;
  }};
 };
}
