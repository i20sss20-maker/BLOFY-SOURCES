import test from 'node:test';
import assert from 'node:assert/strict';
import {probeLicensedSharedLive} from '../src/shared-live-canary.mjs';
const SOURCE='https://licensed.example/live/u/p/99.ts';
const media=Buffer.alloc(188*5);
for(let i=0;i<media.length;i+=188)media[i]=0x47;
test('operator-only source canary shares one real TS upstream with two local viewers',async()=>{
 let calls=0;
 const timers=new Set();
 try{
  const proof=await probeLicensedSharedLive({sourceUrl:SOURCE,durationMs:280,
   lookup:async()=>[{address:'8.8.8.8',family:4}],
   fetchImpl:async()=>{
    calls++;
    let ticker;
    const stream=new ReadableStream({
     start(c){c.enqueue(new Uint8Array(media));
      ticker=setInterval(()=>{try{c.enqueue(new Uint8Array(media))}catch{}},20);
      ticker.unref?.();timers.add(ticker);
     },
     cancel(){clearInterval(ticker);timers.delete(ticker)}
    });
    return new Response(stream,{headers:{'content-type':'video/mp2t'}});
   }});
  assert.equal(proof.ok,true,JSON.stringify(proof));
  assert.equal(proof.customerTrafficChanged,false);
  assert.equal(proof.viewerSamples,2);
  assert.equal(proof.upstreamSessions,1);
  assert.equal(calls,1);
  assert.ok(proof.sampleBytes.every(n=>n>0));
  assert.doesNotMatch(JSON.stringify(proof),/licensed.example|\/u\/p\//);
 }finally{for(const t of timers)clearInterval(t)}
});
test('source canary fails closed without a true TS provider stream',async()=>{
 const proof=await probeLicensedSharedLive({sourceUrl:SOURCE,durationMs:250,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async()=>new Response('no media',{status:403})});
 assert.equal(proof.ok,false);
 assert.equal(proof.customerTrafficChanged,false);
 assert.doesNotMatch(JSON.stringify(proof),/licensed.example|\/u\/p\//);
});
test('source canary never attempts private or malformed provider origin',async()=>{
 let requests=0;
 const proof=await probeLicensedSharedLive({
  sourceUrl:'http://169.254.169.254/metadata',durationMs:250,
  fetchImpl:async()=>{requests++;throw Error('source request should not be made')}
 });
 assert.equal(proof.ok,false);
 assert.equal(requests,0);
});
