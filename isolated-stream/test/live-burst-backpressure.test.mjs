import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';
const source='https://licensed.example/live/user/pass/1.ts';
const sourceId='12345678-1234-4234-8234-123456789abc';
const packet=Buffer.alloc(188*4096,0x11);
for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
function viewer(slow=false){
 const r=new EventEmitter();Object.assign(r,{writableLength:0,bytes:0,destroyed:false,writableEnded:false});
 r.writeHead=status=>{r.status=status;r.headersSent=true};
 r.write=b=>{r.bytes+=b.length;if(slow)r.writableLength+=b.length;return !slow};
 r.destroy=()=>{r.destroyed=true;r.emit('close')};
 r.end=()=>{r.writableEnded=true;r.emit('close')};
 return r;
}
async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10))}assert.fail('condition not reached')}
test('five healthy viewers survive a 752 KiB burst; one stalled viewer is isolated',{timeout:5000},async()=>{
 let calls=0,emitter;
 const upstream=new ReadableStream({start(c){emitter=c}});
 const f=createLiveFanout({lookup:async()=>[{address:'93.184.216.34',family:4}],
  fetchImpl:async()=>{calls++;return new Response(upstream,{headers:{'content-type':'video/mp2t'}})}});
 const good=Array.from({length:5},()=>viewer()),slow=viewer(true);
 try{
  await Promise.all([...good,slow].map(r=>f.handle({method:'GET'},r,source,{licensedSourceId:sourceId,providerMaxConcurrentFeeds:1})));
  await until(()=>calls===1);
  for(let n=1;n<=4;n++){emitter.enqueue(packet);await until(()=>good.every(r=>r.bytes>=n*packet.length))}
  assert.ok(good.every(r=>r.status===200&&!r.destroyed&&r.bytes===4*packet.length));
  assert.equal(slow.destroyed,true);
  const s=f.stats();assert.equal(s.viewers,5);assert.equal(s.activeFeeds,1);
  assert.equal(s.slowViewerDisconnects,1);assert.equal(s.maxViewerQueueBytes,2*1024*1024);assert.equal(calls,1);
 }finally{f.drain()}
});
test('viewer queue remains strictly bounded',()=>{
 assert.throws(()=>createLiveFanout({maxViewerQueueBytes:0}),/fanout_capacity_invalid/);
 assert.throws(()=>createLiveFanout({maxViewerQueueBytes:8*1024*1024}),/fanout_capacity_invalid/);
});

test('oversized input burst yields to draining sockets while an indefinitely stalled sink is removed',{timeout:5000},async()=>{
 let calls=0,emitter;
 const upstream=new ReadableStream({start(c){emitter=c}});
 const f=createLiveFanout({lookup:async()=>[{address:'93.184.216.34',family:4}],
  fetchImpl:async()=>{calls++;return new Response(upstream,{headers:{'content-type':'video/mp2t'}})}});
 const good=Array.from({length:5},()=>{
  const r=viewer();
  r.write=b=>{r.bytes+=b.length;r.writableLength+=b.length;
   setImmediate(()=>{r.writableLength-=b.length});return false};
  return r;
 }),slow=viewer(true);
 const burst=Buffer.alloc(188*20000,0x11);
 for(let i=0;i<burst.length;i+=188)burst[i]=0x47;
 try{
  await Promise.all([...good,slow].map(r=>f.handle({method:'GET'},r,source,{licensedSourceId:sourceId,providerMaxConcurrentFeeds:1})));
  await until(()=>calls===1);
  emitter.enqueue(burst);
  await until(()=>good.every(r=>r.bytes===burst.length));
  assert.ok(good.every(r=>!r.destroyed));
  assert.equal(slow.destroyed,true);
  const s=f.stats();
  assert.equal(s.viewers,5);assert.equal(s.activeFeeds,1);
  assert.equal(s.sourceBytesReceived,burst.length);
  assert.equal(s.maxInputChunkBytes,burst.length);
  assert.equal(s.slowViewerDisconnects,1);assert.equal(calls,1);
 }finally{f.drain()}
});

test('sole viewer tolerates repeated 64 KiB provider reads during temporary socket backpressure',{timeout:6000},async()=>{
 let calls=0,emitter;
 const upstream=new ReadableStream({start(c){emitter=c}});
 const f=createLiveFanout({lookup:async()=>[{address:'93.184.216.34',family:4}],
  fetchImpl:async()=>{calls++;return new Response(upstream,{headers:{'content-type':'video/mp2t'}})}});
 const r=viewer(true),chunk=Buffer.alloc(65536,0x47);
 // Valid MPEG TS at the start; test byte-for-byte transport, not decoding.
 const full=Buffer.alloc(188*60000,0x11);
 for(let i=0;i<full.length;i+=188)full[i]=0x47;
 let maxQueued=0;
 r.write=b=>{r.bytes+=b.length;r.writableLength+=b.length;maxQueued=Math.max(maxQueued,r.writableLength);return false};
 const drain=setInterval(()=>{r.writableLength=Math.max(0,r.writableLength-512*1024)},20);
 try{
  await f.handle({method:'GET'},r,source,{licensedSourceId:sourceId,providerMaxConcurrentFeeds:1});
  await until(()=>calls===1);
  for(let i=0;i<full.length;i+=chunk.length)emitter.enqueue(full.subarray(i,i+chunk.length));
  await until(()=>r.bytes===full.length);
  assert.equal(r.destroyed,false);assert.equal(calls,1);
  assert.equal(f.stats().slowViewerDisconnects,0);assert.ok(maxQueued<=2*1024*1024);
 }finally{clearInterval(drain);f.drain()}
});
test('sole permanently stalled viewer is still disconnected after bounded wait',{timeout:6000},async()=>{
 let calls=0,emitter;
 const upstream=new ReadableStream({start(c){emitter=c}});
 const f=createLiveFanout({lookup:async()=>[{address:'93.184.216.34',family:4}],
  fetchImpl:async()=>{calls++;return new Response(upstream,{headers:{'content-type':'video/mp2t'}})}});
 const r=viewer(true);
 try{
  await f.handle({method:'GET'},r,source,{licensedSourceId:sourceId,providerMaxConcurrentFeeds:1});
  await until(()=>calls===1);
  for(let i=0;i<4;i++)emitter.enqueue(packet);
  const deadline=Date.now()+3500;
  while(!r.destroyed&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(r.destroyed,true);assert.equal(f.stats().slowViewerDisconnects,1);
  assert.ok(r.writableLength<=2*1024*1024);
 }finally{f.drain()}
});
