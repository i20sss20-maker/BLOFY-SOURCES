import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorLiveProbeQueue} from '../src/operator-live-probe-queue.mjs';
const P1='live-123456abcdef',P2='live-abcdef123456',P3='live-aaaabbbbcccc';
const track={
  status:'audio-stream-declared',hasAudioStream:true,
  audioCodecs:['aac','https://should-not-leak.invalid'],
  videoCodecs:['h264'],audioPayloadPackets:7,videoPayloadPackets:12,
  audioContinuityGaps:1,videoContinuityGaps:0,checkedPackets:53,
  secretSourceUrl:'https://provider.invalid/key'
};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function supervisorStub(initial=[P1],clock=()=>1000000){
  const rows=initial.map(path=>({path,connections:1,
    probePending:false,lastProbe:null,mediaTracks:track,
    sourceUrl:'https://provider.invalid/stream?password=secret'}));
  const metrics={probes:0,simultaneous:0,maxSimultaneous:0,active:0};
  return {
    metrics,rows,
    list(){return {ok:true,items:rows.map(r=>({...r}))}},
    async probe(path){
      const r=rows.find(x=>x.path===path);
      metrics.probes++;metrics.active++;
      metrics.maxSimultaneous=Math.max(metrics.maxSimultaneous,metrics.active);
      r.probePending=true;
      return {status:202,body:{ok:true,started:true,probePending:true}};
    },
    finish(){
      const r=rows.find(x=>x.probePending===true);
      if(!r)return;
      r.lastProbe={at:clock(),ok:true,code:'ok',firstMediaBytesVerified:true};
      r.probePending=false;metrics.active--;
    }
  };
}
async function finishQueue(queue,rounds=10){
  for(let i=0;i<rounds;i++){await tick();if(queue.snapshot().job?.state!=='running')return;}
  throw Error('queue_did_not_finish');
}
test('queue is inert until explicit rights and capacity acknowledgements',async()=>{
  const s=supervisorStub();
  const q=createOperatorLiveProbeQueue({supervisor:s,delay:async()=>s.finish(),pollIntervalMs:10,maxPollIterations:2});
  const before=q.snapshot();
  assert.equal(before.job,null);
  assert.equal(s.metrics.probes,0);
  assert.deepEqual(before.eligiblePaths,[{
    path:P1,readyOnExistingSourceConnection:true,currentFeedConnections:1
  }]);
  const r=q.start({paths:[P1]});
  assert.equal(r.status,403);
  assert.equal(s.metrics.probes,0);
  assert.equal(q.snapshot().job,null);
});
test('one-at-a-time HLS probes preserve safe codec metadata and do not create paths',async()=>{
  let now=1000000;
  const s=supervisorStub([P1,P2],()=>now);
  const q=createOperatorLiveProbeQueue({
    supervisor:s,clock:()=>now,
    delay:async()=>{now+=100;s.finish();},
    pollIntervalMs:10,maxPollIterations:2
  });
  const accepted=q.start({paths:[P1,P2],rightsConfirmed:true,capacityAcknowledged:true});
  assert.equal(accepted.status,202);
  assert.equal(accepted.body.concurrency,1);
  await finishQueue(q);
  const state=q.snapshot();
  assert.equal(state.job.state,'completed');
  assert.equal(state.job.completed,2);
  assert.equal(s.metrics.probes,2);
  assert.equal(s.metrics.maxSimultaneous,1);
  assert.equal(state.job.results[0].state,'transport_verified');
  assert.equal(state.job.results[0].tracks.audioTrackDeclared,true);
  assert.deepEqual(state.job.results[0].tracks.audioCodecs,['aac']);
  assert.deepEqual(state.job.results[0].tracks.videoCodecs,['h264']);
  assert.equal(state.job.results[0].tracks.decodedAudioVerified,false);
  assert.equal(state.job.results[0].audioVideoDecoded,false);
  assert.equal(state.sourceConnectionsCreatedByQueue,0);
  assert.equal(state.customerRoutesModified,false);
  assert.doesNotMatch(JSON.stringify(state),/provider.invalid|password=secret|key/);
});
test('pre-start checks require an already active, available operator feed',async()=>{
  const s=supervisorStub([P1,P2,P3]);
  s.rows[0].connections=0;
  s.rows[1].probePending=true;
  const q=createOperatorLiveProbeQueue({supervisor:s,delay:async()=>{}});
  assert.deepEqual(q.snapshot().eligiblePaths.map(x=>x.path),[P3]);
  assert.equal(q.start({paths:[P1],rightsConfirmed:true,capacityAcknowledged:true}).status,409);
  assert.equal(q.start({paths:[P2],rightsConfirmed:true,capacityAcknowledged:true}).status,409);
  assert.equal(s.metrics.probes,0);
});
test('concurrency, duplicate selections, and cooldown reject without more probes',async()=>{
  let now=1000000;
  const s=supervisorStub([P1,P2],()=>now);
  const q=createOperatorLiveProbeQueue({
    supervisor:s,clock:()=>now,
    delay:async()=>{now+=100;s.finish();},pollIntervalMs:10,maxPollIterations:2
  });
  assert.equal(q.start({paths:[P1,P1],rightsConfirmed:true,capacityAcknowledged:true}).status,400);
  assert.equal(q.start({paths:[P1,P2,'live-bbbbbbbbbbbb'],rightsConfirmed:true,capacityAcknowledged:true}).status,400);
  assert.equal(q.start({paths:['http://source.invalid'],rightsConfirmed:true,capacityAcknowledged:true}).status,400);
  assert.equal(q.start({paths:[P1],rightsConfirmed:true,capacityAcknowledged:true}).status,202);
  assert.equal(q.start({paths:[P2],rightsConfirmed:true,capacityAcknowledged:true}).status,409);
  await finishQueue(q);
  assert.equal(q.start({paths:[P1],rightsConfirmed:true,capacityAcknowledged:true}).status,429);
  now+=91000;
  assert.equal(q.start({paths:[P1],rightsConfirmed:true,capacityAcknowledged:true}).status,202);
  await finishQueue(q);
});
test('cancel stops future work only, not currently running HLS sample',async()=>{
  const s=supervisorStub([P1,P2]);
  let release;
  const gate=new Promise(resolve=>{release=resolve});
  const q=createOperatorLiveProbeQueue({
    supervisor:s,delay:async()=>{await gate;s.finish()},pollIntervalMs:10,maxPollIterations:2
  });
  assert.equal(q.start({paths:[P1,P2],rightsConfirmed:true,capacityAcknowledged:true}).status,202);
  await tick();
  assert.equal(q.cancel().status,202);
  release();
  await finishQueue(q);
  assert.equal(q.snapshot().job.state,'cancelled');
  assert.equal(s.metrics.probes,1);
  assert.equal(q.snapshot().job.results[1].state,'cancelled');
});
test('a missing probe result times out honestly, never reports channel verified',async()=>{
  const s=supervisorStub([P1]);
  const q=createOperatorLiveProbeQueue({
    supervisor:s,delay:async()=>{},pollIntervalMs:10,maxPollIterations:2
  });
  q.start({paths:[P1],rightsConfirmed:true,capacityAcknowledged:true});
  await finishQueue(q);
  assert.equal(q.snapshot().job.results[0].state,'unknown');
  assert.equal(q.snapshot().job.results[0].code,'timeout');
  assert.equal(q.snapshot().job.results[0].transportVerified,false);
});
test('unknown PMT and no declared audio never claim audible silence or decoded audio',async()=>{
  const s=supervisorStub([P1]);
  s.rows[0].mediaTracks={status:'waiting-for-pmt',checkedPackets:100};
  const q=createOperatorLiveProbeQueue({supervisor:s,delay:async()=>s.finish(),pollIntervalMs:10,maxPollIterations:2});
  q.start({paths:[P1],rightsConfirmed:true,capacityAcknowledged:true});
  await finishQueue(q);
  assert.equal(q.snapshot().job.results[0].tracks.audioTrackDeclared,null);
  assert.equal(q.snapshot().job.results[0].tracks.decodedAudioVerified,false);
});
