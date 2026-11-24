import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaHlsCanaryWatch} from '../src/media-hls-canary-watch.mjs';
test('both HLS smoke paths verify bounded MPEG TS samples without provider access',async()=>{
 let now=1000000;
 const calls=[],logs=[];
 const watch=createMediaHlsCanaryWatch({
  clock:()=>now,logger:x=>logs.push(x),
  verify:async(origin,options)=>{
   calls.push({origin,options});return {
    ok:true,stage:'segment',code:'synthetic_hls_ts_verified',elapsedMs:23
   };
  }
 });
 await watch.check();now+=300000;await watch.check();
 const s=watch.snapshot();
 assert.equal(s.readiness,'synthetic_transport_verified');
 assert.equal(s.engines.primary.samples,2);
 assert.equal(s.engines.standby.samples,2);
 assert.equal(s.engines.primary.successRatePct,100);
 assert.equal(s.engines.standby.observedWindowMinutes,5);
 assert.equal(s.providerRequests,0);
 assert.equal(s.customerTrafficChanged,false);
 assert.equal(s.recordingsCreated,false);
 assert.equal(s.realSourceVerified,false);
 assert.equal(calls.length,4);
 assert.ok(calls.every(x=>x.origin.startsWith('http://blofy-stream-media')));
 assert.ok(calls.every(x=>x.options.pathName==='smoke'));
 assert.equal(logs.length,1);
});
test('standby HLS failure is distinguished from healthy control endpoint',async()=>{
 const watch=createMediaHlsCanaryWatch({
  verify:async origin=>origin.includes('-standby.')?
   {ok:false,code:'restream_smoke_segment_missing',stage:'segment'}:
   {ok:true,code:'synthetic_hls_ts_verified',stage:'segment'}
 });
 const s=await watch.check();
 assert.equal(s.readiness,'synthetic_transport_failure');
 assert.equal(s.engines.standby.failedSamples,1);
 assert.equal(s.engines.primary.failedSamples,0);
 assert.equal(s.engines.standby.lastCode,'restream_smoke_segment_missing');
});
test('concurrent probes are single-flight and never create extra provider requests',async()=>{
 let release,ran=0;
 const pending=new Promise(resolve=>release=resolve);
 const watch=createMediaHlsCanaryWatch({verify:async()=>{ran++;await pending;return {
  ok:true,stage:'segment',code:'synthetic_hls_ts_verified'
 }}});
 const a=watch.check(),b=await watch.check();
 assert.equal(b.running,true);
 assert.equal(ran,1);
 release();await a;
 assert.equal(ran,2);
});
test('expired samples are excluded from the last-hour window',async()=>{
 let now=10000000;
 const watch=createMediaHlsCanaryWatch({clock:()=>now,
  verify:async()=>({ok:true,stage:'segment',code:'synthetic_hls_ts_verified'})});
 await watch.check();now+=3600001;
 assert.equal(watch.snapshot().engines.primary.samples,0);
 assert.equal(watch.snapshot().engines.standby.syntheticHlsState,'unknown');
});

test('synthetic HLS P50/P95 show measured startup without falsely claiming real playback',async()=>{
 let now=5000000,step=0;
 const watch=createMediaHlsCanaryWatch({clock:()=>now,verify:async()=>{
  const samples=[120,240,350,700,900];
  return{ok:true,stage:'segment',code:'synthetic_hls_ts_verified',
    elapsedMs:samples[Math.floor(step++/2)]};
 }});
 for(let i=0;i<5;i++){await watch.check();now+=60000;}
 const snap=watch.snapshot();
 assert.equal(snap.engines.primary.syntheticHlsLatencyP50Ms,350);
 assert.equal(snap.engines.primary.syntheticHlsLatencyP95Ms,900);
 assert.equal(snap.engines.standby.syntheticHlsLatencyP95Ms,900);
 assert.equal(snap.realSourceVerified,false);
});

test('old successful samples remain historical but no longer prove readiness',async()=>{
 let now=1000000;
 const watch=createMediaHlsCanaryWatch({clock:()=>now,intervalMs:60000,
  verify:async()=>({ok:true,stage:'segment',code:'synthetic_hls_ts_verified'})});
 const complete=await watch.check();
 assert.equal(complete.running,false);
 assert.equal(complete.engines.primary.fresh,true);
 now+=160001;
 const stale=watch.snapshot();
 assert.equal(stale.readiness,'synthetic_transport_unverified');
 assert.equal(stale.engines.primary.fresh,false);
 assert.equal(stale.engines.primary.samples,1);
 assert.equal(stale.engines.primary.successRatePct,100);
});
test('paired observations publish only when both probes complete',async()=>{
 let round=0,release,entered;
 const wait=new Promise(resolve=>release=resolve);
 const standbyEntered=new Promise(resolve=>entered=resolve);
 const watch=createMediaHlsCanaryWatch({verify:async origin=>{
  if(round&&origin.includes('-standby.')){entered();await wait;}
  return{ok:!round,stage:'segment',code:round?'restream_smoke_segment_missing':'synthetic_hls_ts_verified'};
 }});
 await watch.check();round=1;
 const pending=watch.check();
 await standbyEntered;
 assert.equal(watch.snapshot().engines.primary.samples,1);
 assert.equal(watch.snapshot().engines.standby.samples,1);
 release();
 const done=await pending;
 assert.equal(done.running,false);
 assert.equal(done.readiness,'synthetic_transport_failure');
 assert.equal(done.engines.primary.samples,2);
 assert.equal(done.engines.standby.samples,2);
});

test('hung primary probe expires and standby still publishes independently',async()=>{
 let primarySignal,round=0;
 const watch=createMediaHlsCanaryWatch({probeDeadlineMs:30,verify:async(origin,{signal})=>{
  if(origin.includes('-standby.'))return {ok:true,stage:'segment',code:'synthetic_hls_ts_verified'};
  if(round===0){primarySignal=signal;return new Promise(()=>{});}
  return {ok:true,stage:'segment',code:'synthetic_hls_ts_verified'};
 }});
 const first=await watch.check();
 assert.equal(primarySignal.aborted,true);
 assert.equal(first.running,false);
 assert.equal(first.engines.primary.lastCode,'synthetic_probe_deadline');
 assert.equal(first.engines.standby.syntheticHlsState,'verified');
 assert.equal(first.readiness,'synthetic_transport_failure');
 round++;
 const second=await watch.check();
 assert.equal(second.readiness,'synthetic_transport_verified');
 assert.equal(second.engines.primary.samples,2);
});
test('deadline propagates to real synthetic smoke fetch signal',async()=>{
 let signal,requests=0;
 const watch=createMediaHlsCanaryWatch({probeDeadlineMs:30,fetchImpl:async(url,options)=>{
  requests++;signal=options.signal;
  return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 }});
 const result=await watch.check();
 assert.equal(requests,2);
 assert.equal(signal.aborted,true);
 assert.equal(result.engines.primary.lastCode,'synthetic_probe_deadline');
 assert.equal(result.engines.standby.lastCode,'synthetic_probe_deadline');
 assert.equal(result.running,false);
});
