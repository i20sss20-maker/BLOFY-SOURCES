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
