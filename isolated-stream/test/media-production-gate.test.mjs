import test from 'node:test';
import assert from 'node:assert/strict';
import {assessMediaProductionGate} from '../src/media-production-gate.mjs';
const healthy={
 redundancy:{engines:{primary:{controlApiReachable:true,observationWindowMinutes:60},
  standby:{controlApiReachable:true,observationWindowMinutes:60}}},
 synthetic:{engines:{primary:{syntheticHlsState:'verified',observedWindowMinutes:60},
  standby:{syntheticHlsState:'verified',observedWindowMinutes:60}}}
};
test('healthy synthetic engines NEVER silently authorize full customer cutover',()=>{
 const result=assessMediaProductionGate(healthy);
 assert.equal(result.ok,true);
 assert.equal(result.productionCutoverAllowed,false);
 assert.equal(result.release,'blocked_until_verified');
 assert.equal(result.syntheticInfrastructureStatus,'two_engines_synthetic_media_verified');
 assert.ok(result.blockers.includes('licensedOriginPermissionVerified_missing'));
 assert.ok(result.blockers.includes('realLive60MinutePlaybackVerified_missing'));
 assert.ok(result.blockers.includes('multiViewerCapacityVerified_missing'));
 assert.equal(result.sourceCapacityVerified,false);
 assert.equal(result.customerRoutingUnchanged,true);
});
test('even operator-supplied claims cannot enable automatic rollout',()=>{
 const evidence=Object.fromEntries([
  'licensedOriginPermissionVerified','realLive60MinutePlaybackVerified',
  'multiViewerCapacityVerified','tvAndroid9CodecAudioVerified',
  'webAndVidaPlaybackVerified','rollbackDrillVerified'].map(k=>[k,true]));
 const result=assessMediaProductionGate({...healthy,evidence});
 assert.equal(result.productionCutoverAllowed,false);
 assert.equal(result.blockers.length,0);
 assert.equal(result.release,'blocked_until_verified');
});
test('an unstable standby adds engine and missing-one-hour barriers',()=>{
 const result=assessMediaProductionGate({
  redundancy:{engines:{primary:{controlApiReachable:true,observationWindowMinutes:40},
    standby:{controlApiReachable:false}}},
  synthetic:{engines:{primary:{syntheticHlsState:'verified',observedWindowMinutes:40},
    standby:{syntheticHlsState:'failed'}}}
 });
 assert.ok(result.blockers.includes('standby_engine_control_not_verified'));
 assert.ok(result.blockers.includes('standby_synthetic_hls_not_verified'));
 assert.ok(result.blockers.includes('full_hour_engine_transport_not_observed'));
 assert.equal(result.productionCutoverAllowed,false);
});
