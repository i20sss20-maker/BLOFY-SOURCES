import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

const SOURCE_ID='d9b0fcf1-0b7e-4209-b281-2b5cf1cef09a';
const URL_A='https://licensed.example/live/prov/secret/12.ts';
const URL_B='https://licensed.example/live/prov/secret/13.ts';
const packet=Buffer.alloc(188*3,0x22);
for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
test('one-connection licensed source shares same channel, protects it from other channel',async()=>{
 let upstreamCalls=0;
 const upstreams=[];
 const fanout=createLiveFanout({
   lookup:async()=>[{address:'8.8.8.8',family:4}],
   fetchImpl:async()=>{
     upstreamCalls++;
     const media=new ReadableStream({start(controller){
       upstreams.push(controller);
       controller.enqueue(new Uint8Array(packet));
     }});
     return new Response(media,{status:200,headers:{'content-type':'video/mp2t'}});
   }
 });
 const srv=http.createServer((req,res)=>{
   const url=req.url==='/b'?URL_B:URL_A;
   void fanout.handle(req,res,url,{
     licensedSourceId:SOURCE_ID,providerMaxConcurrentFeeds:1
   });
 });
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 try{
   const base='http://127.0.0.1:'+srv.address().port;
   const first=await fetch(base+'/a');
   assert.equal(first.status,200);
   assert.equal((await first.body.getReader().read()).done,false);
   const secondChannel=await fetch(base+'/b');
   assert.equal(secondChannel.status,503);
   assert.equal((await secondChannel.json()).code,'fanout_source_channel_limit');
   assert.equal(fanout.stats().sourceLimitRejections,1);
   assert.equal(fanout.stats().activeFeeds,1);
   assert.equal(upstreamCalls,1,'a second channel must not create a provider connection');
   // A second viewer on same channel joins the existing session.
   const secondViewer=fetch(base+'/a');
   for(let i=0;i<20&&fanout.stats().viewers<2;i++)
     await new Promise(ok=>setTimeout(ok,8));
   assert.equal(fanout.stats().viewers,2);
   upstreams[0].enqueue(new Uint8Array(packet));
   const joined=await secondViewer;
   assert.equal(joined.status,200);
   assert.equal(upstreamCalls,1);
   assert.ok(JSON.stringify(fanout.stats()).includes('secret')===false);
   await joined.body.cancel().catch(()=>{});
   await first.body.cancel().catch(()=>{});
 }finally{
   fanout.close();
   srv.closeAllConnections();
   await new Promise(resolve=>srv.close(resolve));
 }
});

test('source cap is ignored for unscoped grants, preserving legacy stream behavior',async()=>{
 let calls=0;
 const fanout=createLiveFanout({lookup:async()=>[{address:'8.8.8.8',family:4}],
   fetchImpl:async()=>{calls++;
     return new Response(new ReadableStream({start(c){
       c.enqueue(new Uint8Array(packet));
     }}),{headers:{'content-type':'video/mp2t'}});
   }});
 const srv=http.createServer((req,res)=>void fanout.handle(req,res,req.url==='/b'?URL_B:URL_A));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 try{
   const base='http://127.0.0.1:'+srv.address().port;
   const one=await fetch(base+'/a');
   const two=await fetch(base+'/b');
   assert.equal(one.status,200);assert.equal(two.status,200);
   assert.equal(calls,2,'no silent change to existing non-scoped routing');
   assert.equal(fanout.stats().sourceLimitRejections,0);
   await one.body.cancel().catch(()=>{});await two.body.cancel().catch(()=>{});
 }finally{
   fanout.close();srv.closeAllConnections();
   await new Promise(resolve=>srv.close(resolve));
 }
});
