import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

const SOURCE='https://licensed.example/live/a/b/channel.ts';
const packet=Buffer.alloc(188*3,0x11);
for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
async function service(fn,options={}){
  const broker=createLiveFanout({lookup:async()=>[{address:'8.8.8.8',family:4}],...options});
  const srv=http.createServer((req,res)=>void broker.handle(req,res,SOURCE));
  srv.listen(0,'127.0.0.1');await once(srv,'listening');
  try{await fn('http://127.0.0.1:'+srv.address().port,broker)}
  finally{broker.close();srv.closeAllConnections();await new Promise(ok=>srv.close(ok))}
}
test('two simultaneous viewers use one provider GET, with a bounded disconnect',async()=>{
  let upstreamCalls=0,emitter;
  const upstream=new ReadableStream({start(controller){emitter=controller}});
  await service(async(base,broker)=>{
    const a=fetch(base+'/live');
    // Give the source request a chance to attach before adding viewer B.
    await new Promise(resolve=>setTimeout(resolve,25));
    const b=fetch(base+'/live');
    await new Promise(resolve=>setTimeout(resolve,25));
    emitter.enqueue(new Uint8Array(packet));
    const [ra,rb]=await Promise.all([a,b]);
    assert.equal(ra.status,200);assert.equal(rb.status,200);
    assert.equal(upstreamCalls,1);
    assert.equal(broker.stats().activeFeeds,1);
    assert.equal(broker.stats().viewers,2);
    const readers=[ra.body.getReader(),rb.body.getReader()];
    const received=await Promise.all(readers.map(r=>r.read()));
    for(const result of received)assert.equal(Buffer.compare(Buffer.from(result.value),packet),0);
    await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
  },{fetchImpl:async(_url,opt)=>{
    upstreamCalls++;
    assert.equal(opt.redirect,'manual');
    return new Response(upstream,{status:200,headers:{'content-type':'video/mp2t'}});
  }});
});
test('invalid capacities and non-media provider replies fail closed',async()=>{
  assert.throws(()=>createLiveFanout({maxFeeds:0}),/fanout_capacity_invalid/);
  assert.throws(()=>createLiveFanout({maxViewersPerFeed:1000}),/fanout_capacity_invalid/);
  await service(async base=>{
    const r=await fetch(base+'/live');
    assert.equal(r.status,502);
    assert.doesNotMatch(await r.text(),/licensed\.example|channel\.ts/);
  },{fetchImpl:async()=>new Response('<html>denied</html>',{
    status:200,headers:{'content-type':'text/html'}
  })});
});
