// The authenticated central owner check is renewed periodically. Losing it
// revokes local permission and drains the broker. Expiry is NOT independent
// proof that the provider has released a connection.
export function createRelayRuntimeLease({enabled=false,configured=false,readPermit,
 onExpired=()=>{},clock=()=>performance.now(),ttlMs=10000,pollMs=2000,
 autoStart=true}={}){
 if(!enabled)return {allows:()=>true,refresh:async()=>true,stop(){},status:()=>({enabled:false})};
 if(!configured||typeof readPermit!=='function')return {allows:()=>false,refresh:async()=>false,stop(){},status:()=>({enabled:true,configured:false,permitted:false})};
 if(!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>15000||
    !Number.isSafeInteger(pollMs)||pollMs<100||pollMs>=ttlMs)throw Error('runtime_lease_invalid');
 let deadline=0,everGranted=false,revoked=false,stopped=false,busy=false,interval=null,expiry=null;
 function clear(){if(interval!==null)clearInterval(interval);if(expiry!==null)clearTimeout(expiry);interval=expiry=null}
 function revoke(){
  if(revoked||stopped)return;
  revoked=true;deadline=0;clear();
  try{void Promise.resolve(onExpired()).catch(()=>{})}catch{}
 }
 function allows(){
  if(revoked||stopped)return false;
  if(everGranted&&clock()>=deadline){revoke();return false}
  return everGranted&&clock()<deadline;
 }
 function scheduleExpiry(){
  if(expiry!==null)clearTimeout(expiry);
  if(!autoStart)return;
  expiry=setTimeout(()=>{if(!allows()||stopped)return;scheduleExpiry()},Math.max(1,Math.ceil(deadline-clock())));
  expiry.unref?.();
 }
 async function refresh(){
  if(stopped||revoked)return false;
  if(everGranted&&!allows())return false;
  if(busy)return allows();
  busy=true;
  const started=clock();
  try{
   const granted=await readPermit();
   if(stopped||revoked)return false;
   if(everGranted&&!allows())return false;
   // Count validity from REQUEST START, never from a delayed reply.
   if(granted===true&&clock()<started+ttlMs){
    everGranted=true;deadline=started+ttlMs;scheduleExpiry();return true;
   }
   return allows();
  }catch{return allows()}
  finally{busy=false}
 }
 if(autoStart){interval=setInterval(()=>void refresh(),pollMs);interval.unref?.();queueMicrotask(()=>void refresh())}
 return {allows,refresh,stop(){stopped=true;deadline=0;clear()},
  status:()=>({enabled:true,configured:true,permitted:allows(),revoked})};
}
