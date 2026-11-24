// Last-resort recovery for a terminated provider stream whose reader.cancel()
// never confirms completion. NEVER pretend that the provider freed a slot;
// only a process restart tears down the real operating-system sockets.
// The operator restart guard can fire only after every customer viewer and
// active fanout channel has drained for a sustained period.
export function createIdleFanoutReleaseRecovery({
 clock=Date.now,minStallMs=60000,minSamples=3
}={}){
 if(typeof clock!=='function'||!Number.isSafeInteger(minStallMs)||
    minStallMs<1000||minStallMs>3600000||
    !Number.isSafeInteger(minSamples)||minSamples<2||minSamples>100)
  throw Error('idle_fanout_recovery_invalid');
 let pendingSince=null,quietSamples=0,fired=false;
 return function evaluate(stats){
  const pending=stats?.pendingSourceHandoffs;
  const viewers=stats?.viewers;
  const feeds=stats?.activeFeeds;
  if(!Number.isSafeInteger(pending)||!Number.isSafeInteger(viewers)||
     !Number.isSafeInteger(feeds)||pending<0||viewers<0||feeds<0||
     pending===0||viewers>0||feeds>0){
    pendingSince=null;quietSamples=0;
    return {restart:false,reason:'not_quiescent'};
  }
  const now=clock();
  if(!Number.isFinite(now)||now<0){
   pendingSince=null;quietSamples=0;
   return {restart:false,reason:'clock_invalid'}
  }
  if(pendingSince===null||now<pendingSince){
   pendingSince=now;quietSamples=0
  }
  quietSamples=Math.min(minSamples,quietSamples+1);
  const idleMs=now-pendingSince;
  if(!fired&&idleMs>=minStallMs&&quietSamples>=minSamples){
   fired=true;
   return {restart:true,reason:'stuck_provider_reader_requires_socket_close',
    idleMs,quiescent:true}
  }
  return {restart:false,reason:fired?'already_triggered':'release_pending',
   idleMs,quiescent:true}
 }
}
