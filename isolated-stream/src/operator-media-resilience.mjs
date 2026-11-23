// Operator-only live source resilience. No credentials or client IDs.
export async function readWithMediaDeadline(reader,controller,{timeoutMs=22000}={}){
 if(typeof reader?.read!=='function'||typeof controller?.abort!=='function'||
  !Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>120000)
  throw new Error('restream_read_deadline_invalid');
 let timer;
 try{
  return await Promise.race([reader.read(),new Promise((_,reject)=>{
   timer=setTimeout(()=>{
    controller.abort();
    const error=new Error('restream_provider_stalled');
    error.code='restream_provider_stalled';
    reject(error);
   },timeoutMs);
  })]);
 }finally{clearTimeout(timer)}
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
