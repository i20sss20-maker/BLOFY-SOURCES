import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

const SALEH='d2bb0397-1c56-4751-adc9-1a17758022f6';
const SOURCE='https://licensed.example/live/one.ts';
const NEXT='https://licensed.example/live/two.ts';
const TS=Buffer.alloc(188*3,0x42);
for(let i=0;i<TS.length;i+=188)TS[i]=0x47;
async function until(predicate,ms=3500){
 const start=Date.now();
 while(Date.now()-start<ms){
  if(predicate())return;
  await new Promise(r=>setTimeout(r,15));
 }
 throw Error('viewer_abandon_condition_timeout');
}
function startServer(fanout){
 const server=http.createServer((req,res)=>void fanout.handle(req,res,
  req.url==='/next'?NEXT:SOURCE,{
   licensedSourceId:SALEH,providerMaxConcurrentFeeds:1
  }));
 return server;
}
async function cleanup(server,fanout){
 fanout.close();server.closeAllConnections();
 await new Promise(r=>server.close(r));
}
test('abandoned client after slow DNS validation never starts an upstream stream', {timeout:8500},async()=>{
 let upstreamGets=0;
 const relay=createLiveFanout({
  lookup:async()=>{await new Promise(r=>setTimeout(r,200));return[{address:'8.8.8.8',family:4}];},
  fetchImpl:async()=>{upstreamGets++;throw Error('should_not_fetch');},
  firstByteTimeoutMs:1000,readIdleTimeoutMs:500
 });
 const server=startServer(relay);server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const controller=new AbortController();
  const aborted=fetch(base+'/same',{signal:controller.signal}).catch(()=>null);
  await new Promise(r=>setTimeout(r,45));controller.abort();
  await aborted;
  await until(()=>relay.stats().abandonedViewerRequests>=1);
  assert.equal(upstreamGets,0);
  assert.equal(relay.stats().activeFeeds,0);
  assert.equal(relay.stats().viewers,0);
 }finally{await cleanup(server,relay);}
});
test('viewer leaving during one-slot source handoff never consumes a new source session', {timeout:12500},async()=>{
 let gets=0;
 const relay=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async()=>{
   gets++;
   return new Response(new ReadableStream({
    start(c){c.enqueue(new Uint8Array(TS));},
    cancel(){return new Promise(r=>setTimeout(r,160));}
   }),{status:200,headers:{'content-type':'video/mp2t'}});
  },
  maxViewersPerFeed:128,maxFeeds:3,idleMs:3000,
  firstByteTimeoutMs:1200,readIdleTimeoutMs:3000
 });
 const server=startServer(relay);server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const current=await fetch(base+'/same');assert.equal(current.status,200);
  const reader=current.body.getReader();await reader.read();await reader.cancel();
  await until(()=>relay.stats().viewers===0);
  const controller=new AbortController();
  const abandoned=fetch(base+'/next',{signal:controller.signal}).catch(()=>null);
  await until(()=>relay.stats().sourceHandoffWaits>=1);
  controller.abort();await abandoned;
  await until(()=>relay.stats().abandonedViewerRequests>=1);
  assert.equal(gets,1,'cancelled viewer never starts second provider GET');
  assert.equal(relay.stats().viewers,0);
  await until(()=>relay.stats().pendingSourceHandoffs===0);
  const newViewer=await fetch(base+'/next');
  assert.equal(newViewer.status,200);
  const nextReader=newViewer.body.getReader();const got=await nextReader.read();
  assert.ok(!got.done&&got.value[0]===0x47);
  assert.equal(gets,2);
  await nextReader.cancel();
 }finally{await cleanup(server,relay);}
});
