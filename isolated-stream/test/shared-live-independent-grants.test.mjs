import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createRelayBroker} from '../src/relay-broker.mjs';
const secret='b'.repeat(64),sourceId='12345678-1234-4234-8234-123456789abc';
const packet=Buffer.alloc(188*8,0x11);
for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
test('ten independent authorized tickets join one live feed; different channel cannot consume another provider slot',{timeout:15000},async()=>{
 let calls=0,emitter;
 const source=new ReadableStream({start(c){emitter=c}});
 const broker=createRelayBroker({sharedToken:secret,sharedLiveEnabled:true,
  lookup:async()=>[{address:'93.184.216.34',family:4}],
  fetchImpl:async()=>{calls++;return new Response(source,{headers:{'content-type':'video/mp2t'}})}});
 const srv=http.createServer((req,res)=>{void (req.url==='/internal/relay-grants'?broker.issue(req,res):broker.relay(req,res))});
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 const base='http://127.0.0.1:'+srv.address().port;
 const controllers=[];
 const issue=async(channel)=>{
  const r=await fetch(base+'/internal/relay-grants',{method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({sourceUrl:'https://licensed.example/live/user/pass/'+channel+'.ts',kind:'live',sharedLive:true,licensedCdnRedirect:true,licensedSourceId:sourceId,providerMaxConcurrentFeeds:1})});
  assert.equal(r.status,201);return (await r.json()).path;
 };
 let timer;
 try{
  const paths=await Promise.all(Array.from({length:10},()=>issue('same')));
  assert.equal(new Set(paths).size,10);
  timer=setInterval(()=>{try{emitter.enqueue(packet)}catch{}},25);
  const responses=[];
  for(const path of paths){
   const controller=new AbortController();controllers.push(controller);
   const r=await fetch(base+path,{signal:controller.signal});
   assert.equal(r.status,200);responses.push(r);
  }
  for(const r of responses){const reader=r.body.getReader();const sample=await reader.read();assert.equal(sample.done,false);assert.ok(sample.value.length>0);reader.releaseLock();}
  let stats=broker.stats().fanout;
  assert.equal(stats.viewers,10);assert.equal(stats.activeFeeds,1);assert.equal(calls,1);assert.equal(stats.peakViewersOnOneFeed,10);
  const blocked=await fetch(base+await issue('different'));
  assert.equal(blocked.status,503);assert.equal((await blocked.json()).code,'fanout_source_channel_limit');
  stats=broker.stats().fanout;assert.equal(stats.viewers,10);assert.equal(stats.viewerLimitRejections,0);assert.equal(calls,1);
 }finally{
  clearInterval(timer);for(const c of controllers)c.abort();
  broker.drain();srv.closeAllConnections();await new Promise(resolve=>srv.close(resolve));
 }
});
