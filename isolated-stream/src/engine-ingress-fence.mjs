// Global relay fence: this process cannot infer which credentials refer to
// the licensed single-slot account. During a handoff deny ALL media ingress,
// including previously issued tickets. Do not trust an absent source ID.
// A configured gate is fail-closed on timeouts or malformed replies.
const ORIGIN='https://blofy-activation-portal-production.up.railway.app';
export function createRelayIngressFence({env=process.env,fetchImpl=fetch}={}){
 const enabled=env.BLOFY_RELAY_INGRESS_FENCE==='1';
 const token=env.BLOFY_STREAM_RELAY_SHARED_TOKEN||'';
 return async function allow(){
  if(!enabled)return true;
  if(token.length<32)return false;
  try{
   const r=await fetchImpl(ORIGIN+'/internal/legacy-ingress',{method:'GET',redirect:'error',signal:AbortSignal.timeout(2000),headers:{authorization:'Bearer '+token,accept:'application/json'}});
   if(r.status!==200){await r.body?.cancel().catch(()=>{});return false}
   // Fixed response contract; cap the response before parsing.
   const reader=r.body?.getReader();if(!reader)return false;
   let size=0,parts=[];
   try{for(;;){const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>512)return false;parts.push(Buffer.from(x.value))}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
   const body=JSON.parse(Buffer.concat(parts).toString('utf8'));
   return body.ok===true&&body.mode==='legacy'&&Number.isSafeInteger(body.observedAt)&&Math.abs(Date.now()-body.observedAt)<3000;
  }catch{return false}
 };
}
// This is an ingress decision only, not proof of socket drain or atomic
// source ownership. Existing feeds, diagnostics and independent paths must
// still be stopped and the provider slot independently confirmed.
