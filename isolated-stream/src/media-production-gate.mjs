// Explicit production release evidence gate. Synthetic checks can prove
// network transport but never licensing, real decoding or multi-viewer
// reliability. This is READ ONLY: no customer routing, source credentials,
// trial stream, player registration or cache mutation.
const realEvidenceFlags=Object.freeze([
 'licensedOriginPermissionVerified',
 'realLive60MinutePlaybackVerified',
 'multiViewerCapacityVerified',
 'tvAndroid9CodecAudioVerified',
 'webAndVidaPlaybackVerified',
 'rollbackDrillVerified'
]);
export function assessMediaProductionGate({
 redundancy=null,synthetic=null,evidence={}
}={}){
 const controls=redundancy?.engines||{};
 const canary=synthetic?.engines||{};
 const barriers=[];
 const check=(predicate,code)=>{if(!predicate)barriers.push(code)};
 check(controls.primary?.controlApiReachable===true,'primary_engine_control_not_verified');
 check(controls.standby?.controlApiReachable===true,'standby_engine_control_not_verified');
 check(canary.primary?.syntheticHlsState==='verified','primary_synthetic_hls_not_verified');
 check(canary.standby?.syntheticHlsState==='verified','standby_synthetic_hls_not_verified');
 const primaryObserved=Math.min(60,Math.max(0,Number(controls.primary?.observationWindowMinutes)||0));
 const standbyObserved=Math.min(60,Math.max(0,Number(controls.standby?.observationWindowMinutes)||0));
 const primaryHls=Math.min(60,Math.max(0,Number(canary.primary?.observedWindowMinutes)||0));
 const standbyHls=Math.min(60,Math.max(0,Number(canary.standby?.observedWindowMinutes)||0));
 check(primaryObserved>=55&&standbyObserved>=55&&primaryHls>=55&&standbyHls>=55,
  'full_hour_engine_transport_not_observed');
 for(const flag of realEvidenceFlags)
  check(evidence?.[flag]===true,flag+'_missing');
 return{
  ok:true,release:'blocked_until_verified',
  productionCutoverAllowed:false,
  // No source or user can be automatically promoted by synthetic metrics.
  playbackQualityVerified:false,
  sourceCapacityVerified:false,
  operatorCanReview:true,
  blockers:barriers,
  syntheticInfrastructureStatus:controls.primary?.controlApiReachable===true&&
   controls.standby?.controlApiReachable===true&&
   canary.primary?.syntheticHlsState==='verified'&&
   canary.standby?.syntheticHlsState==='verified'
   ?'two_engines_synthetic_media_verified':'synthetic_infrastructure_not_yet_verified',
  safeReleaseStages:['operator_only','authorized_single_channel',
   '1_percent_opt_in','5_percent_opt_in','25_percent_opt_in','full_only_after_go_no_go'],
  realDeviceDecodeTested:false,concurrentSubscriberLoadTested:false,
  sourcesUntouched:true,customerRoutingUnchanged:true,
  windows:{primaryControlMinutes:primaryObserved,standbyControlMinutes:standbyObserved,
   primaryHlsMinutes:primaryHls,standbyHlsMinutes:standbyHls}
 };
}
