import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaHourBufferInspector} from '../src/media-hour-buffer-inspector.mjs';
const fakePassword='local-only-synthetic-control-credential-123';
test('inspector detects synthetic segments within last hour without media access',async()=>{
 let now=100000000;const requests=[];
 const inspector=createMediaHourBufferInspector({controlPassword:fakePassword,
  clock:()=>now,fetchImpl:async(url,opts)=>{
   requests.push({url,opts});return Response.json({
    itemCount:2,pageCount:1,items:[
     {name:'smoke',segments:[{start:new Date(now-1800000).toISOString()},
      {start:new Date(now-7200000).toISOString()}]},
     {name:'live-secret',segments:[{start:new Date(now-60000).toISOString()}]}
    ]
   });
  }
 });
 const v=await inspector.check();
 assert.equal(v.ok,true);
 assert.equal(v.syntheticSegmentsWithinHour,1);
 assert.equal(v.state,'synthetic_hour_buffer_has_segments');
 assert.equal(v.recordedMediaBytesRetrieved,0);
 assert.equal(v.providerRequests,0);
 assert.equal(v.realContentRecordingEnabledByInspector,false);
 assert.equal(requests.length,1);
 assert.equal(requests[0].opts.method,'GET');
 assert.equal(requests[0].url,'http://blofy-stream-media-standby.railway.internal:9997/v3/recordings/list');
 assert.doesNotMatch(JSON.stringify(v),/live-secret|local-only|authorization|recordPath/);
});
test('no credentials means no upstream fetch',async()=>{
 let count=0;const inspector=createMediaHourBufferInspector({
  controlPassword:'',fetchImpl:async()=>{count++;throw Error('should not fetch')}});
 const state=await inspector.check();
 assert.equal(state.state,'recording_control_unconfigured');
 assert.equal(count,0);
});
test('invalid and unauthorized recording API responses fail closed',async()=>{
 const bad=createMediaHourBufferInspector({controlPassword:fakePassword,
  fetchImpl:async()=>Response.json({bad:true})});
 assert.equal((await bad.check()).state,'recording_control_response_invalid');
 const denied=createMediaHourBufferInspector({controlPassword:fakePassword,
  fetchImpl:async()=>Response.json({}, {status:403})});
 assert.equal((await denied.check()).state,'recording_control_denied');
});
