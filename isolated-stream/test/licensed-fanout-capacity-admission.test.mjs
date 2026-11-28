import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';
import {createRelayBroker} from '../src/relay-broker.mjs';

const SALEH='d2bb0397-1c56-4751-adc9-1a17758022f6';
const SOURCE_A='https://licensed.example/live/channel-a.ts';
const SOURCE_B='https://licensed.example/live/channel-b.ts';
const TS=Buffer.alloc(188*3,0x34);
for(let i=0;i<TS.length;i+=188)TS[i]=0x47;
async function waitFor(check){
 const start=Date.now();
 while(Date.now()-start<7500){
  if(check())return;
  await new Promise(r=>setTimeout(r,15));
 }
 throw Error('synthetic_license_capacity_timeout');
}
test('one licensed upstream carries 40 clients of SAME channel, unrelated channel is blocked', {timeout:22000},async()=>{
 let upstreamGets=0,upstream;
 const src=new ReadableStream({start(c){upstream=c}});
 const fanout=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async()=>{upstreamGets++;return new Response(src,{
   status:200,headers:{'content-type':'video/mp2t'}});},
  maxViewersPerFeed:128,maxFeeds:3,idleMs:40,
  firstByteTimeoutMs:6000,readIdleTimeoutMs:6000
 });
 const server=http.createServer((req,res)=>void fanout.handle(req,res,
  req.url==='/other'?SOURCE_B:SOURCE_A,{
   licensedSourceId:SALEH,providerMaxConcurrentFeeds:1
  }));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const incoming=Array.from({length:40},()=>fetch(base+'/same'));
  await waitFor(()=>fanout.stats().viewers===40);
  assert.equal(upstreamGets,1,'one provider HTTP request for all 40 viewers');
  const rejected=await fetch(base+'/other');
  assert.equal(rejected.status,503);
  assert.match(await rejected.text(),/fanout_source_channel_limit/);
  assert.equal(rejected.headers.get('retry-after'),'2');
  assert.equal(fanout.stats().viewers,40,
    'denying second channel must never disconnect first channel viewers');
  assert.equal(upstreamGets,1,'second channel did not open upstream');
  upstream.enqueue(new Uint8Array(TS));
  const responses=await Promise.all(incoming);
  assert.ok(responses.every(x=>x.status===200));
  const readers=responses.map(x=>x.body.getReader());
  const pieces=await Promise.all(readers.map(x=>x.read()));
  assert.ok(pieces.every(x=>!x.done&&
   Buffer.compare(Buffer.from(x.value),TS)===0));
  const s=fanout.stats();
  assert.equal(s.activeFeeds,1);
  assert.equal(s.sourceLimitRejections,1);
  assert.equal(s.upstreamSessionsOpened,1);
  assert.equal(s.viewersAccepted,40);
  assert.equal(s.quotaScope,'one_media_process');
  assert.equal(s.crossReplicaQuotaGuaranteed,false);
  await Promise.all(readers.map(x=>x.cancel().catch(()=>{})));
  await waitFor(()=>fanout.stats().viewers===0);
 }finally{
  fanout.close();
  server.closeAllConnections();
  await new Promise(done=>server.close(done));
 }
});

test('shared relay grant fails closed when upstream capacity or source ID is not verified',async()=>{
 const KEY='safe-relay-test-key-abcdef0123456789abcdef0123456789';
 const broker=createRelayBroker({sharedToken:KEY,sharedLiveEnabled:true,
  lookup:async()=>[{address:'8.8.8.8',family:4}]});
 const server=http.createServer((req,res)=>void broker.issue(req,res));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 const issue=body=>fetch(origin+'/internal/relay-grants',{method:'POST',
  headers:{authorization:'Bearer '+KEY,'content-type':'application/json'},
  body:JSON.stringify({kind:'live',sourceUrl:SOURCE_A,sharedLive:true,...body})});
 try{
  const noScope=await issue({});
  assert.equal(noScope.status,409);
  assert.equal((await noScope.json()).code,'relay_shared_source_quota_required');
  const noQuota=await issue({licensedSourceId:SALEH});
  assert.equal(noQuota.status,409);
  const invalidQuota=await issue({licensedSourceId:SALEH,providerMaxConcurrentFeeds:0});
  assert.equal(invalidQuota.status,409);
  const valid=await issue({licensedSourceId:SALEH,providerMaxConcurrentFeeds:1});
  assert.equal(valid.status,201);
  const ticket=await valid.json();
  assert.equal(ticket.sharedLiveGranted,true);
  assert.match(ticket.path,/^\/relay\/[a-f0-9]{48}$/);
 }finally{
  broker.close?.();
  server.closeAllConnections();
  await new Promise(done=>server.close(done));
 }
});


test('media relay process feed budget is configurable and bounded',()=>{
 assert.equal(createRelayBroker().stats().fanout.maxFeeds,8);
 for(const n of [5,8,16,32,64])
  assert.equal(createRelayBroker({sharedLiveMaxFeeds:n}).stats().fanout.maxFeeds,n);
 for(const n of [0,65,-1,8.5,NaN,Infinity])
  assert.throws(()=>createRelayBroker({sharedLiveMaxFeeds:n}));
});

test('sixteen simulated distinct authorized feeds coexist and the seventeenth is rejected', {timeout:22000},async()=>{
 let calls=0;
 const fanout=createLiveFanout({lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async()=>{calls++;return new Response(new ReadableStream({start(c){
    c.enqueue(new Uint8Array(TS));
  }}),{headers:{'content-type':'video/mp2t'}});},
  maxFeeds:16
 });
 const srv=http.createServer((req,res)=>{
  const channel=Number(req.url.slice(1));
  void fanout.handle(req,res,'https://licensed.example/live/channel-'+channel+'.ts',{
   licensedSourceId:SALEH,providerMaxConcurrentFeeds:16
  });
 });
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 const responses=[];
 try{
  const base='http://127.0.0.1:'+srv.address().port;
  for(let i=1;i<=16;i++){
   const response=await fetch(base+'/'+i);
   responses.push(response);
   assert.equal(response.status,200);
  }
  const rejected=await fetch(base+'/17');
  assert.equal(rejected.status,503);
  assert.equal((await rejected.json()).code,'fanout_source_channel_limit');
  assert.equal(calls,16);
  assert.equal(fanout.stats().activeFeeds,16);
  assert.equal(fanout.stats().viewers,16);
 }finally{
  await Promise.all(responses.map(x=>x.body.cancel().catch(()=>{})));
  fanout.close();srv.closeAllConnections();await new Promise(r=>srv.close(r));
 }
});


for(const channels of [1,16]){
 test('150 simulated concurrent viewers across '+channels+' channels receive media and retain capacity', {timeout:60000},async()=>{
  const upstreams=new Map();
  let calls=0;
  const fanout=createLiveFanout({
   lookup:async()=>[{address:'8.8.8.8',family:4}],
   fetchImpl:async(url)=>{
    calls++;
    const key=String(url);
    return new Response(new ReadableStream({start(controller){
     upstreams.set(key,controller);
    }}),{headers:{'content-type':'video/mp2t'}});
   },
   maxFeeds:16,maxViewersPerFeed:160,maxTotalViewers:150,
   firstByteTimeoutMs:25000,readIdleTimeoutMs:25000
  });
  const server=http.createServer((req,res)=>void fanout.handle(req,res,
   'https://licensed.example/live/channel-'+Number(req.url.slice(1))+'.ts',{
    licensedSourceId:SALEH,providerMaxConcurrentFeeds:16
   }));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  const readers=[];
  const requests=[];
  try{
   for(let i=0;i<150;i++)requests.push(fetch(base+'/'+(i%channels+1)));
   await waitFor(()=>fanout.stats().viewers===150&&upstreams.size===channels);
   const rejected=await fetch(base+'/1');
   assert.equal(rejected.status,503);
   assert.equal(await rejected.text(),'fanout_total_viewer_limit');
   assert.equal(fanout.stats().viewers,150);
   assert.equal(calls,channels);
   for(const c of upstreams.values())c.enqueue(new Uint8Array(TS));
   const responses=await Promise.all(requests);
   for(const response of responses){
    assert.equal(response.status,200);
    readers.push(response.body.getReader());
   }
   const first=await Promise.all(readers.map(reader=>reader.read()));
   assert.ok(first.every(x=>!x.done&&Buffer.compare(Buffer.from(x.value),TS)===0));
   for(const c of upstreams.values())c.enqueue(new Uint8Array(TS));
   const second=await Promise.all(readers.map(reader=>reader.read()));
   assert.ok(second.every(x=>!x.done&&Buffer.compare(Buffer.from(x.value),TS)===0));
   const s=fanout.stats();
   assert.equal(s.activeFeeds,channels);
   assert.equal(s.peakTotalViewers,150);
   assert.equal(s.totalViewerLimitRejections,1);
   assert.equal(s.sourceLimitRejections,0);
   assert.equal(s.slowViewerDisconnects,0);
  }finally{
   fanout.close();
   server.closeAllConnections();
   await Promise.allSettled(requests);
   await Promise.allSettled(readers.map(reader=>reader.cancel()));
   await new Promise(resolve=>server.close(resolve));
  }
 });
}
