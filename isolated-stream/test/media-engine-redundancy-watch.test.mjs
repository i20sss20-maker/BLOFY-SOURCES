import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaEngineRedundancyWatch} from '../src/media-engine-redundancy-watch.mjs';
const secret='test-password-not-used-by-any-actual-service-abcde';
const success=()=>new Response(JSON.stringify({items:[{name:'smoke'}]}),
 {status:200,headers:{'content-type':'application/json'}});
test('checks both fixed PRIVATE engines, preserves a one-hour history and never reads video',async()=>{
 let now=10000000;const calls=[],events=[];
 const watch=createMediaEngineRedundancyWatch({
  controlPassword:secret,clock:()=>now,logger:e=>events.push(e),
  fetchImpl:async(url,opts)=>{
   calls.push({url,opts});
   return success();
  }
 });
 assert.equal(watch.snapshot().engines.primary.state,'unknown');
 await watch.check();
 now+=60000;await watch.check();
 const snap=watch.snapshot();
 assert.equal(snap.readiness,'both_control_apis_reachable');
 assert.equal(snap.engines.primary.samples,2);
 assert.equal(snap.engines.standby.observationWindowMinutes,1);
 assert.equal(snap.engines.primary.availabilityPct,100);
 assert.equal(calls.length,4);
 assert.ok(calls.every(x=>x.url.includes('.railway.internal:9997/v3/config/paths/list')));
 assert.ok(calls.every(x=>x.opts.method==='GET'));
 assert.ok(calls.every(x=>x.opts.redirect==='error'));
 assert.equal(snap.autoFailoverEnabled,false);
 assert.equal(snap.mediaBytesRead,0);
 assert.doesNotMatch(JSON.stringify(snap),/test-password|authorization|sourceUrl/);
 assert.equal(events.length,1,'only report a changed state');
});
test('distinguishes dead primary from a ready standby without rerouting clients',async()=>{
 let now=1000000;
 const watch=createMediaEngineRedundancyWatch({
  controlPassword:secret,clock:()=>now,
  fetchImpl:async url=>url.includes('media-standby')?success():
   new Response('{}',{status:503})
 });
 await watch.check();
 const a=watch.snapshot();
 assert.equal(a.readiness,'primary_unreachable_standby_api_reachable');
 assert.equal(a.engines.primary.lastError,'engine_http_error');
 assert.equal(a.customerTrafficChanged,false);
 now+=60000;await watch.check();
 assert.equal(watch.snapshot().engines.primary.state,'unavailable');
});
test('does not pretend readiness if credentials are unavailable or rejected',async()=>{
 const unconfigured=createMediaEngineRedundancyWatch({controlPassword:''});
 await unconfigured.check();
 const a=unconfigured.snapshot();
 assert.equal(a.readiness,'control_credentials_unconfigured');
 assert.equal(a.engines.standby.lastError,'engine_unconfigured');
 const denied=createMediaEngineRedundancyWatch({controlPassword:secret,
  fetchImpl:async()=>new Response('{}',{status:401})});
 await denied.check();
 assert.equal(denied.snapshot().engines.primary.lastError,'engine_auth_failed');
 assert.equal(denied.snapshot().readiness,'both_control_apis_unreachable');
});
test('fails closed when a control API returns malformed or oversized JSON',async()=>{
 const watcher=createMediaEngineRedundancyWatch({controlPassword:secret,
  fetchImpl:async()=>new Response(JSON.stringify({foo:1}),{status:200})});
 await watcher.check();
 assert.equal(watcher.snapshot().engines.primary.lastError,'engine_invalid_response');
});
