import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

const SALEH='d2bb0397-1c56-4751-adc9-1a17758022f6';
const A='https://licensed.example/live/channel-one.ts';
const B='https://licensed.example/live/channel-two.ts';
const TS=Buffer.alloc(188*3,0x33);
for(let i=0;i<TS.length;i+=188)TS[i]=0x47;
async function waitUntil(fn,limit=3500){
 const start=Date.now();
 while(Date.now()-start<limit){
  if(fn())return;
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 throw Error('handoff_condition_timeout');
}
async function withRelay(callback,{readIdleTimeoutMs=300,fetchImpl}={}){
 const fanout=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  maxViewersPerFeed:128,maxFeeds:3,idleMs:3000,
  firstByteTimeoutMs:1000,readIdleTimeoutMs,fetchImpl
 });
 const server=http.createServer((req,res)=>void fanout.handle(req,res,
  req.url==='/second'?B:A,{licensedSourceId:SALEH,providerMaxConcurrentFeeds:1}));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 try{await callback(base,fanout)}
 finally{
  fanout.close();server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
}
test('channel zap releases the old idle source before the next channel starts', {timeout:11000},async()=>{
 let open=0,peak=0,requests=0,closed=0;
 const fetchImpl=async()=>{
  requests++;open++;peak=Math.max(peak,open);
  return new Response(new ReadableStream({
   start(c){c.enqueue(new Uint8Array(TS))},
   cancel(){open--;closed++;}
  }),{status:200,headers:{'content-type':'video/mp2t'}});
 };
 await withRelay(async(base,fanout)=>{
  const first=await fetch(base+'/first');
  assert.equal(first.status,200);
  const reader=first.body.getReader();
  await reader.read();
  assert.equal(open,1);
  await reader.cancel();
  await waitUntil(()=>fanout.stats().viewers===0);
  assert.equal(fanout.stats().activeFeeds,1,
    'idle grace keeps channel registered before the zap');
  const next=await fetch(base+'/second');
  assert.equal(next.status,200,'new channel should use released one-slot source');
  const nextReader=next.body.getReader();
  const bytes=await nextReader.read();
  assert.equal(bytes.done,false);
  assert.equal(Buffer.from(bytes.value)[0],0x47);
  assert.equal(requests,2);
  assert.equal(peak,1,'upstream media sessions never overlap');
  assert.ok(closed>=1);
  assert.equal(fanout.stats().sourceHandoffs,1);
  assert.equal(fanout.stats().pendingSourceHandoffs,0);
  await nextReader.cancel();
 },{fetchImpl});
});
test('incomplete upstream teardown blocks second source GET rather than exceeding quota', {timeout:12000},async()=>{
 let requests=0,releaseFirst,cancelStarted=false;
 const releaseGate=new Promise(resolve=>releaseFirst=resolve);
 const fetchImpl=async()=>{
  requests++;
  if(requests===1)return new Response(new ReadableStream({
   start(c){c.enqueue(new Uint8Array(TS))},
   // Explicitly delay cancellation confirmation. A blocked read alone
   // is now promptly cancelled and is not evidence of incomplete teardown.
   cancel(){cancelStarted=true;return releaseGate}
  }),{status:200,headers:{'content-type':'video/mp2t'}});
  return new Response(new ReadableStream({
   start(c){c.enqueue(new Uint8Array(TS))}
  }),{status:200,headers:{'content-type':'video/mp2t'}});
 };
 try{await withRelay(async(base,fanout)=>{
  const old=await fetch(base+'/first'),reader=old.body.getReader();
  await reader.read();await reader.cancel();
  await waitUntil(()=>fanout.stats().viewers===0);
  const response=await fetch(base+'/second');
  assert.equal(response.status,503);
  assert.equal((await response.json()).code,'fanout_source_handoff_pending');
  assert.equal(response.headers.get('retry-after'),'1');
  assert.equal(requests,1,'must not open second upstream while old is stuck');
  assert.equal(fanout.stats().pendingSourceHandoffs,1);
  assert.equal(cancelStarted,true);
  releaseFirst();
  await waitUntil(()=>fanout.stats().pendingSourceHandoffs===0);
  const opened=await fetch(base+'/second');
  assert.equal(opened.status,200);
  const newReader=opened.body.getReader();
  await newReader.read();
  assert.equal(requests,2);
  await newReader.cancel();
 },{fetchImpl,readIdleTimeoutMs:4000});}finally{releaseFirst()}
});
