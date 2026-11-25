import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

// Deterministic response sinks: fast sinks drain immediately, the slow sink
// never drains. This exercises the real fanout pump without relying on OS
// socket buffer sizes or contacting any provider.
class Sink extends EventEmitter{
 constructor(slow=false){super();this.slow=slow;this.writableLength=0;
  this.headersSent=false;this.destroyed=false;this.writableEnded=false;
  this.bytes=0;this.peak=0;this.last=null}
 writeHead(status){this.status=status;this.headersSent=true;return this}
 write(chunk){
  assert.equal(this.destroyed,false);
  this.bytes+=chunk.length;this.last=chunk[10];
  if(this.slow)this.writableLength+=chunk.length;
  this.peak=Math.max(this.peak,this.writableLength);
  return !this.slow;
 }
 end(){if(this.writableEnded)return;this.writableEnded=true;this.emit('close')}
 destroy(){if(this.destroyed)return;this.destroyed=true;this.emit('close')}
}
test('127 draining viewers survive one stalled viewer with bounded queue and cache',{timeout:15000},async()=>{
 let writer,calls=0,now=100000;
 const upstream=new ReadableStream({start(c){writer=c}});
 const broker=createLiveFanout({maxViewersPerFeed:128,clock:()=>now,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async()=>{calls++;return new Response(upstream,{headers:{'content-type':'video/mp2t'}})}});
 const fast=Array.from({length:127},()=>new Sink()),slow=new Sink(true);
 const viewers=[...fast,slow];
 const url='https://licensed.example/live/test.ts';
 async function until(fn){
  for(let i=0;i<500&&!fn();i++)await new Promise(r=>setTimeout(r,5));
  assert.ok(fn(),'expected pump progress');
 }
 try{
  await Promise.all(viewers.map(res=>broker.handle({method:'GET'},res,url)));
  await until(()=>calls===1);
  assert.equal(broker.stats().viewers,128);
  const length=188*256;
  // 20 distinct batches, each ~48 KiB; slow sink crosses 512 KiB
  // while the remaining viewers drain every batch without delay.
  for(let i=0;i<20;i++){
    const bytes=Buffer.alloc(length,i+1);
    for(let p=0;p<bytes.length;p+=188)bytes[p]=0x47;
    now+=200;
    writer.enqueue(bytes);
    await until(()=>fast.every(v=>v.bytes===(i+1)*length));
    assert.ok(fast.every(v=>!v.destroyed&&v.last===i+1));
    assert.ok(broker.stats().bufferedBootstrapBytes<=256*1024);
    assert.ok(slow.peak<=512*1024);
  }
  const report=broker.stats();
  assert.equal(report.viewers,127);
  assert.equal(report.slowViewerDisconnects,1);
  assert.equal(report.sourceBytesReceived,20*length);
  assert.equal(report.upstreamSessionsOpened,1);
  assert.equal(calls,1);
  assert.equal(slow.destroyed,true);
  now+=3001;
  assert.equal(broker.stats().bufferedBootstrapBytes,0);
  assert.equal(broker.stats().viewers,127);
 }finally{broker.close()}
});


test('repeated licensed session churn releases feeds and cached bytes across a simulated hour',{timeout:30000},async()=>{
 let now=100000,calls=0,writer;
 const scope='550e8400-e29b-41d4-a716-446655440000';
 const broker=createLiveFanout({maxFeeds:2,maxViewersPerFeed:16,
  idleMs:20,clock:()=>now,lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async()=>{
   calls++;
   return new Response(new ReadableStream({start(c){writer=c}}),
     {headers:{'content-type':'video/mp2t'}});
  }});
 async function until(fn){
   for(let i=0;i<500&&!fn();i++)await new Promise(r=>setTimeout(r,5));
   assert.ok(fn(),'expected bounded session lifecycle');
 }
 const options={licensedSourceId:scope,providerMaxConcurrentFeeds:1};
 try{
  for(let cycle=0;cycle<60;cycle++){
   now+=60000;
   const viewers=Array.from({length:16},()=>new Sink());
   const url='https://licensed.example/live/'+cycle+'.ts';
   await Promise.all(viewers.map(res=>broker.handle({method:'GET'},res,url,options)));
   await until(()=>calls===cycle+1);
   assert.equal(broker.stats().viewers,16);
   const length=188*128;
   for(let batch=0;batch<4;batch++){
    const bytes=Buffer.alloc(length,batch+1);
    for(let p=0;p<length;p+=188)bytes[p]=0x47;
    writer.enqueue(bytes);
    await until(()=>viewers.every(v=>v.bytes===(batch+1)*length));
    assert.ok(viewers.every(v=>!v.destroyed&&v.last===batch+1));
    assert.ok(broker.stats().bufferedBootstrapBytes<=256*1024);
   }
   for(const viewer of viewers)viewer.destroy();
   await until(()=>broker.stats().activeFeeds===0&&broker.stats().pendingSourceHandoffs===0);
   const report=broker.stats();
   assert.equal(report.viewers,0);
   assert.equal(report.bufferedBootstrapBytes,0);
   assert.equal(report.upstreamSessionsOpened,cycle+1);
   assert.equal(report.sourceLimitRejections,0);
   assert.equal(report.slowViewerDisconnects,0);
   assert.equal(report.events.length<=32,true);
   assert.equal(report.mediaLatency.admissionToFirstBytes.samples<=64,true);
  }
  assert.equal(calls,60);
  assert.equal(broker.stats().viewersAccepted,960);
  assert.equal(broker.stats().sourceBytesReceived,60*4*188*128);
  console.log('PASS: 60 sequential licensed sessions; 960 simulated joins; zero residual feeds, viewers, cache bytes or pending source releases');
 }finally{broker.close()}
});
