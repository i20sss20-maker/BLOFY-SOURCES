import test from 'node:test';
import assert from 'node:assert/strict';
import {createIdleFanoutReleaseRecovery} from '../src/idle-fanout-release-recovery.mjs';
import {readFileSync} from 'node:fs';

const server=readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');

test('stuck provider cancellation triggers a single isolated process reset only after 60 seconds with no viewers or source feeds',()=>{
 let now=5000;
 const guard=createIdleFanoutReleaseRecovery({clock:()=>now,minStallMs:60000,minSamples:3});
 const idle={pendingSourceHandoffs:1,viewers:0,activeFeeds:0};
 assert.equal(guard(idle).restart,false);
 now+=5000;assert.equal(guard(idle).restart,false);
 now+=55000;
 const decision=guard(idle);
 assert.equal(decision.restart,true);
 assert.equal(decision.quiescent,true);
 assert.equal(decision.idleMs,60000);
 now+=90000;
 assert.equal(guard(idle).restart,false,'never repeat a process-exit request')
});
test('healthy customer playback means zero restarts even after a full hour of pending release',()=>{
 let now=1;
 const guard=createIdleFanoutReleaseRecovery({clock:()=>now,minStallMs:60000,minSamples:3});
 for(let i=0;i<720;i++){
  now+=5000;
  assert.equal(guard({pendingSourceHandoffs:1,viewers:1,activeFeeds:1}).restart,false);
 }
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false,'must wait another minute after customers leave')
});
test('an active feed, even with no viewers, prevents destructive restart until it finishes',()=>{
 let now=10000;
 const guard=createIdleFanoutReleaseRecovery({clock:()=>now,minStallMs:60000,minSamples:3});
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
 const guard=createIdleFanoutReleaseRecovery({clock:()=>now,minStallMs:3000,minSamples:2});
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false);
 now+=2500;
 assert.equal(guard({pendingSourceHandoffs:0,viewers:0,activeFeeds:0}).restart,false);
 now+=3000;
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,false);
 now+=3000;
 assert.equal(guard({pendingSourceHandoffs:1,viewers:0,activeFeeds:0}).restart,true);
 for(const bad of [null,undefined,{}, {pendingSourceHandoffs:1,viewers:-1,activeFeeds:0},
  {pendingSourceHandoffs:'1',viewers:0,activeFeeds:0}]){
  assert.equal(createIdleFanoutReleaseRecovery({clock:()=>1000,minStallMs:1000,minSamples:2})(bad).restart,false)
 }
});
test('service watchdog is idle-only, has kill switch, and never releases licensed quota in memory',()=>{
 assert.match(server,/createIdleFanoutReleaseRecovery/);
 assert.match(server,/snapshot\?\.sharedLiveEnabled!==true/);
 assert.match(server,/BLOFY_STREAM_IDLE_FANOUT_RECOVERY_DISABLED/);
 assert.match(server,/minStallMs:60000,minSamples:3/);
 assert.match(server,/if\(!decision\.restart\)return/);
 assert.match(server,/process\.exit\(76\)/);
 assert.doesNotMatch(server,/pendingSourceReleases\.clear\(|forceReleaseProvider|sourceQuota\s*=/);
});
