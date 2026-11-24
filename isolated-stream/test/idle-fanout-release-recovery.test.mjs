import test from 'node:test';
import assert from 'node:assert/strict';
import {createIdleFanoutReleaseRecovery} from '../src/idle-fanout-release-recovery.mjs';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
// Legacy shared-fanout assertions test the explicit zero-direct-viewers case.
function guardWithDefaultNoDirect(options){
 const guard=createIdleFanoutReleaseRecovery(options);
 return (stats,directClients=0)=>guard(stats,directClients)
}

test('stuck provider cancellation emits a one-time quarantine alert only after 15 seconds of zero viewers and feeds',()=>{
 let now=5000;
 const guard=guardWithDefaultNoDirect({clock:()=>now,minStallMs:15000,minSamples:3});
 const idle={pendingSourceHandoffs:1,viewers:0,activeFeeds:0};
 assert.equal(guard(idle).restart,false);
 now+=5000;assert.equal(guard(idle).restart,false);
 now+=10000;
 const decision=guard(idle);
 assert.equal(decision.restart,true);
 assert.equal(decision.quiescent,true);
 assert.equal(decision.reason,'stuck_provider_release_quarantined');
 assert.equal(decision.idleMs,15000);
 now+=90000;
 assert.equal(guard(idle).restart,false,'never repeat the same operator incident')
});
test('healthy customer playback means zero quarantine decisions even after a full hour of pending release',()=>{
 let now=1;
 const guard=guardWithDefaultNoDirect({clock:()=>now,minStallMs:60000,minSamples:3});
 for(let i=0;i<720;i++){
  now+=5000;
  assert.equal(guard({pendingSourceHandoffs:1,viewers:1,activeFeeds:1}).restart,false);
 }
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false,'must wait another minute after customers leave')
});
test('an active feed, even with no viewers, prevents any quarantine incident until it finishes',()=>{
 let now=10000;
 const guard=guardWithDefaultNoDirect({clock:()=>now,minStallMs:60000,minSamples:3});
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false);
 now+=60000;
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:1}).restart,false);
 now+=20000;
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false);
 now+=60000;
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false);
 now+=5000;
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,true)
});
test('release confirmation or invalid metrics reset the pending watch and protect viewers',()=>{
 let now=1000;
 const guard=guardWithDefaultNoDirect({clock:()=>now,minStallMs:3000,minSamples:2});
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false);
 now+=2500;
 assert.equal(guard({pendingSourceHandoffs:0,viewers:0,activeFeeds:0}).restart,false);
 now+=3000;
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false);
 now+=3000;
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,true);
 for(const bad of [null,undefined,{}, {pendingSourceHandoffs:1,viewers:-1,activeFeeds:0},
  {pendingSourceHandoffs:'1',viewers:0,activeFeeds:0}]){
  assert.equal(guardWithDefaultNoDirect({clock:()=>1000,minStallMs:1000,minSamples:2})(bad).restart,false)
 }
});
test('service watchdog is idle-only, has kill switch, and quarantines a stuck source without exiting process',()=>{
 assert.match(server,/createIdleFanoutReleaseRecovery/);
 assert.match(server,/snapshot\?\.sharedLiveEnabled!==true/);
 assert.match(server,/BLOFY_STREAM_IDLE_FANOUT_RECOVERY_DISABLED/);
 assert.match(server,/minStallMs:15000,minSamples:3/);
 assert.match(server,/if\(!decision\.restart\)return/);
 assert.doesNotMatch(server,/process\.exit\(76\)/);
 assert.match(server,/clearInterval\(releaseGuard\)/);
 assert.match(server,/orphaned_provider_release_quarantined/);
 assert.doesNotMatch(server,/pendingSourceReleases\.clear\(|forceReleaseProvider|sourceQuota\s*=/);
});

test('unshared movie downloads prevent fanout quarantine alert, even if fanout has no viewers',()=>{
 let now=0;
 const guard=createIdleFanoutReleaseRecovery({clock:()=>now,minStallMs:15000,minSamples:3});
 const idle={pendingSourceHandoffs:1,viewers:0,activeFeeds:0};
 assert.equal(guard(idle,2).restart,false);
 now+=60000;
 assert.equal(guard(idle,1).restart,false,'direct relay movie client remains connected');
 now+=2000;
 assert.equal(guard(idle,0).restart,false,'direct traffic just finished: fresh quiet window');
 now+=10000;
 assert.equal(guard(idle,0).restart,false);
 now+=5000;
 assert.equal(guard(idle,0).restart,true,'all streams drained for 15 seconds');
});

test('missing or invalid non-shared media metrics MUST fail closed and cannot alert on a healthy direct stream',()=>{
 let now=0;
 const guard=createIdleFanoutReleaseRecovery({clock:()=>now,minStallMs:1000,minSamples:2});
 const idle={pendingSourceHandoffs:1,viewers:0,activeFeeds:0};
 for(const count of [undefined,null,NaN,-1,'0',1.2,Infinity]){
  now+=1000;
  assert.equal(guard(idle,count).restart,false,'missing/bad direct viewer count '+count)
 }
 now+=1000;
 assert.equal(guard(idle,0).restart,false,'new clean interval');
 now+=1000;
 assert.equal(guard(idle,0).restart,true);
});

test('real operator watchdog reads direct clients and requires zero before alert',()=>{
 assert.match(server,/verifyStaleRelease\(snapshot\.fanout,\s*snapshot\.activeDirectMediaClients\)/);
 assert.match(server,/activeDirectMediaClients:0/);
});
