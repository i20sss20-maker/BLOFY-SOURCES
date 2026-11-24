// Fail-closed detection of an orphaned licensed source release. This module
// only emits an incident decision: it never kills the process or releases
// a provider slot. The caller must quarantine the source and alert the operator.
// An incident can be emitted only after all customer viewers, active feeds,
// and direct media relays have drained for a sustained period.
export function createIdleFanoutReleaseRecovery({
 clock=Date.now,minStallMs=15000,minSamples=3
}={}){
 if(typeof clock!=='function'||!Number.isSafeInteger(minStallMs)||
    minStallMs<1000||minStallMs>3600000||
    !Number.isSafeInteger(minSamples)||minSamples<2||minSamples>100)
  throw Error('idle_fanout_recovery_invalid');
 let pendingSince=null,quietSamples=0,fired=false;
 return function evaluate(stats,activeDirectMediaClients){
  const pending=stats?.pendingSourceHandoffs;
  const viewers=stats?.viewers;
  const feeds=stats?.activeFeeds;
  const direct=activeDirectMediaClients;
  if(!Number.isSafeInteger(pending)||!Number.isSafeInteger(viewers)||
     !Number.isSafeInteger(feeds)||!Number.isSafeInteger(direct)||
     pending<0||viewers<0||feeds<0||direct<0||
     pending===0||viewers>0||feeds>0||direct>0){
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
   return {restart:true,reason:'stuck_provider_release_quarantined',
    idleMs,quiescent:true}
  }
  return {restart:false,reason:fired?'already_triggered':'release_pending',
   idleMs,quiescent:true}
 }
}
