import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

const SOURCE='https://licensed.example/live/approved/source/23.ts';
const makePackets=n=>{
 const bytes=Buffer.alloc(188*n,0x47);
 for(let i=0;i<bytes.length;i+=188)bytes[i]=0x47;
 return bytes;
};
async function withFanout(options,run){
 let calls=0,controller;
 const fanout=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async()=>{calls++;return new Response(new ReadableStream({
   start(c){controller=c}
  }),{headers:{'content-type':'video/mp2t'}});},
  ...options
 });
 const server=http.createServer((req,res)=>void fanout.handle(req,res,SOURCE,{
  licensedSourceId:'d9b0fcf1-0b7e-4209-b281-2b5cf1cef09a',
  providerMaxConcurrentFeeds:1
 }));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{await run({base:'http://127.0.0.1:'+server.address().port,
  fanout,calls:()=>calls,controller:()=>controller});}
 finally{
  fanout.close();server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
}
test('late viewer immediately receives current TS tail from existing origin, without a new upstream',async()=>{
 await withFanout({lateJoinReplayBytes:2048},async({base,fanout,calls,controller})=>{
  const firstFetch=fetch(base+'/live');
  for(let i=0;i<50&&!controller();i++)
   await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(controller(),'first source must connect');
  const initial=makePackets(4);
  controller().enqueue(new Uint8Array(initial));
  const first=await firstFetch;
  assert.equal(first.status,200);
  const firstReader=first.body.getReader();
  assert.equal(Buffer.compare(Buffer.from((await firstReader.read()).value),initial),0);
  // No new bytes sent by provider; warm join must already have TS metadata.
  const second=await fetch(base+'/live');
  assert.equal(second.status,200);
  const joined=await second.body.getReader().read();
  assert.equal(Buffer.compare(Buffer.from(joined.value),initial),0);
  assert.equal(calls(),1);
  assert.equal(fanout.stats().lateJoinReplays,1);
  assert.equal(fanout.stats().lateJoinReplayBytes,initial.length);
  assert.ok(fanout.stats().bufferedBootstrapBytes<=2048);
  await firstReader.cancel().catch(()=>{});
  await second.body.cancel().catch(()=>{});
 });
});
test('bootstrap memory stays capped and can be disabled for strict low-memory origin',async()=>{
 await withFanout({lateJoinReplayBytes:188*4},async({base,fanout,controller})=>{
  const connected=fetch(base+'/live');
  for(let i=0;i<50&&!controller();i++)await new Promise(r=>setTimeout(r,10));
  controller().enqueue(new Uint8Array(makePackets(12)));
  const res=await connected;assert.equal(res.status,200);
  await res.body.getReader().read();
  assert.ok(fanout.stats().bufferedBootstrapBytes<=188*4);
  await res.body.cancel().catch(()=>{});
 });
 assert.throws(()=>createLiveFanout({lateJoinReplayBytes:1024*1024+1}),
  /fanout_capacity_invalid/);
 const disabled=createLiveFanout({lateJoinReplayBytes:0});
 assert.equal(disabled.stats().bufferedBootstrapBytes,0);
 disabled.close();
});
