// Operator-only live source resilience. No credentials or client IDs.
export async function readWithMediaDeadline(reader,controller,{timeoutMs=22000}={}){
 if(typeof reader?.read!=='function'||typeof controller?.abort!=='function'||
  !Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)
  throw new Error('restream_read_deadline_invalid');
 const signal=controller.signal;
 const failure=code=>Object.assign(new Error(code),{code});
 if(signal?.aborted)throw signal.reason||failure('restream_cancelled');
 let timer,onAbort;
 try{
  const interrupted=new Promise((_,reject)=>{
   onAbort=()=>reject(signal?.reason||failure('restream_cancelled'));
   signal?.addEventListener('abort',onAbort,{once:true});
   timer=setTimeout(()=>{
    // Settle the deadline first: fetch readers can reject synchronously
    // on abort, masking the actual stall as an undifferentiated AbortError.
    const error=failure('restream_provider_stalled');
    reject(error);
    controller.abort(error);
   },timeoutMs);
  });
  return await Promise.race([interrupted,Promise.resolve().then(()=>reader.read())]);
 }finally{
  clearTimeout(timer);
  signal?.removeEventListener('abort',onAbort);
 }
}
// Select a separately authorized backup only on a very short EOF or two
// short primary EOFs within five minutes. Selection applies on NEXT restart.
export function nextOperatorSourcePreference({
 backupConfigured=false,sourceIndex=0,preferredIndex=0,
 priorShortEndAt=null,priorShortEndCount=0,now=Date.now(),durationMs=0
}={}){
 const count=Math.max(0,Math.min(2,Number(priorShortEndCount)||0));
 if(!backupConfigured||sourceIndex!==0)
  return {preferredIndex,shortEndCount:count,shortEndAt:priorShortEndAt,switched:false};
 if(!Number.isFinite(durationMs)||durationMs<0||durationMs>=180000)
  return {preferredIndex:0,shortEndCount:0,shortEndAt:null,switched:false};
 const consecutive=Number.isFinite(priorShortEndAt)&&Number.isFinite(now)&&
  now>=priorShortEndAt&&now-priorShortEndAt<=300000;
 const nextCount=consecutive?Math.min(2,count+1):1;
 const switched=durationMs<10000||nextCount>=2;
 return {preferredIndex:switched?1:0,shortEndCount:nextCount,
  shortEndAt:now,switched};
}
