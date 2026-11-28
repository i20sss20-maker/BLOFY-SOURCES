import test from 'node:test';
import assert from 'node:assert/strict';
import {createPassiveTsRecorder} from '../src/passive-ts-recorder.mjs';
const path='live-123456abcdef';
const packet=()=>{const b=Buffer.alloc(188);b[0]=0x47;b[3]=0x10;return b;};
const payload=(n=24)=>Buffer.concat(Array.from({length:n},packet));
const recorder=(more={})=>createPassiveTsRecorder({
  timeoutMs:250,cooldownMs:30000,
  minBytes:188*12,targetBytes:188*20,...more
});
test('manual capture is inert until requested and never opens a provider connection',async()=>{
  const r=recorder();
  assert.equal(r.pending(),null);
  r.offer(path,1,payload());
  assert.equal(r.isBusy(),false);
  assert.equal((await r.request('../../etc',1)).status,400);
  assert.equal(r.pending(),null);
});
test('packet-aligned sample is captured from the same feed generation only',async()=>{
  const r=recorder();
  const p=r.request(path,6);
  assert.deepEqual(r.pending(),{path,session:6});
  r.offer(path,5,payload()); // stale or unrelated publisher
  assert.equal(r.isBusy(),true);
  r.offer('live-abcdef123456',6,payload()); // different channel
  assert.equal(r.isBusy(),true);
  const b=Buffer.concat([Buffer.from([0x30,0x00,0x12]),payload(24)]);
  r.offer(path,6,b.subarray(0,255));
  r.offer(path,6,b.subarray(255,1777));
  r.offer(path,6,b.subarray(1777));
  const result=await p;
  assert.equal(result.status,200);
  assert.equal(result.code,'passive_sample_complete');
  assert.equal(result.readFromExistingFeedOnly,true);
  assert.equal(result.providerRequestsCreated,0);
  assert.equal(result.operatorPathsCreated,0);
  assert.equal(result.customerRoutesChanged,false);
  assert.equal(result.bytes.length,20*188);
  for(let i=0;i<20;i++)assert.equal(result.bytes[i*188],0x47);
  assert.equal(r.isBusy(),false);
  result.bytes.fill(0);
});
test('only one sample request at a time and a cooldown after completion',async()=>{
  let now=100000;
  const r=recorder({clock:()=>now});
  const p=r.request(path,1);
  assert.equal((await r.request(path,1)).status,409);
  r.offer(path,1,payload());
  assert.equal((await p).status,200);
  assert.equal((await r.request(path,1)).status,429);
  now+=31000;
  const p2=r.request(path,1);
  r.abort(path,1);
  assert.equal((await p2).code,'passive_feed_session_ended');
});
test('wrong session abort is ignored; correct publisher end rejects safely',async()=>{
  const r=recorder();
  const pending=r.request(path,2);
  r.abort(path,3);
  assert.equal(r.isBusy(),true);
  r.offer(path,2,payload(8));
  r.abort(path,2);
  const result=await pending;
  assert.equal(result.status,409);
  assert.equal(result.bytes,undefined);
  assert.equal(r.isBusy(),false);
});
test('packet sync corruption rejects sample without raw content in output',async()=>{
  const r=recorder();
  const pending=r.request(path,1);
  const bytes=payload(24);bytes[15*188]=0x30;
  r.offer(path,1,bytes);
  const result=await pending;
  assert.equal(result.status,422);
  assert.equal(result.code,'passive_ts_sync_lost');
  assert.equal(result.bytes,undefined);
});
test('short timeout does not invent healthy channel; aligned partial is labeled',async()=>{
  const r=recorder({timeoutMs:100});
  const pending=r.request(path,1);
  r.offer(path,1,payload(13));
  await new Promise(resolve=>setTimeout(resolve,130));
  const result=await pending;
  assert.equal(result.status,200);
  assert.equal(result.code,'passive_sample_partial');
  assert.equal(result.bytes.length,13*188);
  assert.equal(result.customerRoutesChanged,false);
});
test('insufficient aligned bytes time out without returning an unsafe sample',async()=>{
  const r=recorder({timeoutMs:100});
  const pending=r.request(path,1);
  r.offer(path,1,payload(5));
  await new Promise(resolve=>setTimeout(resolve,130));
  const result=await pending;
  assert.equal(result.status,504);
  assert.equal(result.code,'passive_capture_timeout');
  assert.equal(result.bytes,undefined);
});
