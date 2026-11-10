import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';
import {createRelayBroker} from '../src/relay-broker.mjs';
const SOURCE='https://licensed.example/live/licensed/source/12.ts';
const packet=Buffer.alloc(188*5,0x22);
for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function serve(fanout,callback){
 const server=http.createServer((req,res)=>void fanout.handle(req,res,SOURCE));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try {await callback('http://127.0.0.1:'+server.address().port)}
 finally{fanout.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
}
test('110 synthetic authorized viewers on ONE channel use one open upstream TS session',async()=>{
 let upstreamCalls=0,emitter;
 const stream=new ReadableStream({start(ctrl){emitter=ctrl}});
 const fanout=createLiveFanout({
   lookup:async()=>[{address:'8.8.8.8',family:4}],
   fetchImpl:async()=>{upstreamCalls++;return new Response(stream,{
     headers:{'content-type':'video/mp2t'}})},
   maxViewersPerFeed:128
 });
 await serve(fanout,async base=>{
  const requests=Array.from({length:110},()=>fetch(base+'/live'));
  for(let i=0;i<250&&fanout.stats().viewers<110;i++)await sleep(12);
  assert.equal(fanout.stats().viewers,110,'all viewers must attach to same feed');
  emitter.enqueue(new Uint8Array(packet));
  const responses=await Promise.all(requests);
  assert.ok(responses.every(r=>r.status===200));
  const readers=responses.map(r=>r.body.getReader());
  const chunks=await Promise.all(readers.map(r=>r.read()));
  assert.ok(chunks.every(c=>!c.done&&Buffer.compare(Buffer.from(c.value),packet)===0));
  assert.equal(upstreamCalls,1);
  assert.equal(fanout.stats().activeFeeds,1);
  assert.equal(fanout.stats().viewers,110);
  await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
 });
});
test('a 20-second-equivalent provider EOF reopens one source sequentially while viewers remain',async()=>{
 let calls=0;
 const controllers=[];
 const fanout=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  reconnectOnUpstreamEnd:true,firstByteTimeoutMs:1000,
  fetchImpl:async()=>{
   calls++;
   const source=new ReadableStream({
    start(ctrl){controllers.push(ctrl);ctrl.enqueue(new Uint8Array(packet))}
   });
   return new Response(source,{headers:{'content-type':'video/mp2t'}});
  }
 });
 await serve(fanout,async base=>{
  const response=await fetch(base+'/live');assert.equal(response.status,200);
  const reader=response.body.getReader();
  assert.deepEqual(Buffer.from((await reader.read()).value),packet);
  controllers[0].close();
  for(let i=0;i<65&&calls<2;i++)await sleep(15);
  assert.equal(calls,2,'exactly one replacement upstream request');
  const next=await Promise.race([reader.read(),sleep(1700).then(()=>({timeout:true}))]);
  assert.equal(next.timeout,undefined);
  assert.equal(next.done,false);
  assert.deepEqual(Buffer.from(next.value),packet);
  assert.equal(fanout.stats().viewers,1,'viewer HTTP response remains open');
  assert.equal(fanout.stats().upstreamReconnects,1);
  await reader.cancel();
 });
});
test('shared grant reports explicit true only when configured at the media plane',async()=>{
 const sharedToken='test-secret-abcdefghijklmnopqrstuvwxyz-123456789';
 for(const enabled of [false,true]){
  const broker=createRelayBroker({
    sharedToken,sharedLiveEnabled:enabled,
    lookup:async()=>[{address:'8.8.8.8',family:4}]
  });
  const server=http.createServer((req,res)=>void broker.issue(req,res));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const res=await fetch('http://127.0.0.1:'+server.address().port+'/grant',{
      method:'POST',headers:{authorization:'Bearer '+sharedToken,
        'content-type':'application/json'},
      body:JSON.stringify({kind:'live',sharedLive:true,sourceUrl:SOURCE})
    });
    assert.equal(res.status,201);
    const body=await res.json();
    assert.equal(body.sharedLiveGranted,enabled);
    assert.match(body.path,/^\/relay\/[0-9a-f]{48}$/);
    assert.ok(!JSON.stringify(body).includes('licensed.example'));
  }finally{
    server.closeAllConnections();await new Promise(r=>server.close(r));
  }
 }
});
