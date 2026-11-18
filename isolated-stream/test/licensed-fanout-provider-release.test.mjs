import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

const SALEH='d2bb0397-1c56-4751-adc9-1a17758022f6';
const OLD='https://licensed.example/live/old.ts';
const NEW='https://licensed.example/live/new.ts';
const ts=Buffer.alloc(188*3,0x45);
for(let i=0;i<ts.length;i+=188)ts[i]=0x47;
async function until(fn,wait=4500){
 const t=Date.now();
 while(Date.now()-t<wait){
  if(fn())return;
  await new Promise(r=>setTimeout(r,15));
 }
 throw Error('provider_release_test_timeout');
}
async function host(fetchImpl,callback,{readIdleTimeoutMs=400}={}){
 const fanout=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],fetchImpl,
  maxFeeds:3,maxViewersPerFeed:128,idleMs:3000,
  firstByteTimeoutMs:1000,readIdleTimeoutMs
 });
 const srv=http.createServer((req,res)=>void fanout.handle(req,res,
  req.url==='/new'?NEW:OLD,{licensedSourceId:SALEH,providerMaxConcurrentFeeds:1}));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 try{await callback('http://127.0.0.1:'+srv.address().port,fanout)}
 finally{
  fanout.close();srv.closeAllConnections();
  await new Promise(r=>srv.close(r));
 }
}
test('slow provider cancellation keeps the one-slot channel quarantined until it really settles', {timeout:14000},async()=>{
 let opened=0,oldClosedAt=0,newOpenedAt=0;
 const fetchImpl=async()=>{
  opened++;
  if(opened===1)return new Response(new ReadableStream({
   start(controller){controller.enqueue(new Uint8Array(ts))},
   cancel(){return new Promise(resolve=>setTimeout(()=>{
    oldClosedAt=Date.now();resolve();
   },2300))}
  }),{status:200,headers:{'content-type':'video/mp2t'}});
  newOpenedAt=Date.now();
  return new Response(new ReadableStream({
   start(controller){controller.enqueue(new Uint8Array(ts))}
  }),{status:200,headers:{'content-type':'video/mp2t'}});
 };
 await host(fetchImpl,async(base,fanout)=>{
  const first=await fetch(base+'/old');
  assert.equal(first.status,200);
  const oldReader=first.body.getReader();
  await oldReader.read();await oldReader.cancel();
  await until(()=>fanout.stats().viewers===0);
  const pendingRequest=fetch(base+'/new');
  await until(()=>fanout.stats().pendingSourceHandoffs>0,4000);
  const blocked=await pendingRequest;
  assert.equal(blocked.status,503);
  assert.equal((await blocked.json()).code,'fanout_source_handoff_pending');
  assert.equal(opened,1,'an unfinished upstream cannot be replaced');
  assert.ok(fanout.stats().sourceReleaseStalls>=1);
  await until(()=>oldClosedAt>0&&fanout.stats().pendingSourceHandoffs===0,4600);
  const started=await fetch(base+'/new');
  assert.equal(started.status,200);
  const r=started.body.getReader();await r.read();await r.cancel();
  assert.equal(opened,2);
  assert.ok(newOpenedAt>=oldClosedAt,'new source opens only after actual cancel completion');
 },{readIdleTimeoutMs:350});
});
test('provider rejects cancel: no second channel is opened on the one-slot source', {timeout:9500},async()=>{
 let opened=0;
 await host(async()=>{
  opened++;
  return new Response(new ReadableStream({
   start(controller){controller.enqueue(new Uint8Array(ts));},
   cancel(){return Promise.reject(Error('provider_cancel_failed'))}
  }),{status:200,headers:{'content-type':'video/mp2t'}});
 },async(base,fanout)=>{
  const first=await fetch(base+'/old');const r=first.body.getReader();
  await r.read();await r.cancel();
  await until(()=>fanout.stats().viewers===0);
  const second=await fetch(base+'/new');
  assert.equal(second.status,503);
  assert.equal((await second.json()).code,'fanout_source_handoff_pending');
  assert.equal(opened,1);
  assert.equal(fanout.stats().pendingSourceHandoffs,1);
  assert.ok(fanout.stats().sourceReleaseStalls>=1);
 },{readIdleTimeoutMs:300});
});
