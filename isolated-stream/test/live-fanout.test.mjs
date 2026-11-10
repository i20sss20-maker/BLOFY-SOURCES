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

test('ten simulated viewers receive the same source media from one upstream call',async()=>{
  let upstreamCalls=0,emitter;
  const upstream=new ReadableStream({start(controller){emitter=controller}});
  await service(async(base,broker)=>{
    const viewers=Array.from({length:10},()=>fetch(base+'/live'));
    for(let n=0;n<100&&broker.stats().viewers<10;n++){
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(broker.stats().viewers,10);
    emitter.enqueue(new Uint8Array(packet));
    const responses=await Promise.all(viewers);
    assert.ok(responses.every(r=>r.status===200));
    const readers=responses.map(r=>r.body.getReader());
    const chunks=await Promise.all(readers.map(r=>r.read()));
    assert.ok(chunks.every(x=>Buffer.compare(Buffer.from(x.value),packet)===0));
    assert.equal(upstreamCalls,1);
    await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
  },{fetchImpl:async()=>{upstreamCalls++;
    return new Response(upstream,{headers:{'content-type':'video/mp2t'}});
  }});
});

test('fifty concurrent simulated viewers share exactly one provider response',async()=>{
  let upstreamCalls=0,emitter;
  const upstream=new ReadableStream({start(controller){emitter=controller}});
  await service(async(base,broker)=>{
    const requests=Array.from({length:50},()=>fetch(base+'/live'));
    for(let n=0;n<150&&broker.stats().viewers<50;n++)
      await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(broker.stats().viewers,50);
    emitter.enqueue(new Uint8Array(packet));
    const responses=await Promise.all(requests);
    assert.ok(responses.every(r=>r.status===200));
    const readers=responses.map(r=>r.body.getReader());
    const data=await Promise.all(readers.map(r=>r.read()));
    assert.ok(data.every(d=>Buffer.compare(Buffer.from(d.value),packet)===0));
    assert.equal(upstreamCalls,1);
    assert.equal(broker.stats().activeFeeds,1);
    await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
  },{maxViewersPerFeed:128,fetchImpl:async()=>{
    upstreamCalls++;return new Response(upstream,{
      headers:{'content-type':'video/mp2t'}
    });
  }});
});
test('stalled TS provider is evicted and does not pin viewer sessions',async()=>{
  let controller;
  await service(async(base,broker)=>{
    const response=await fetch(base+'/live');
    assert.equal(response.status,200);
    await response.body.getReader().read();
    for(let n=0;n<80&&broker.stats().activeFeeds>0;n++)
      await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(broker.stats().activeFeeds,0);
  },{readIdleTimeoutMs:75,fetchImpl:async()=>{
    const source=new ReadableStream({start(c){
      controller=c;c.enqueue(new Uint8Array(packet));
    }});
    return new Response(source,{headers:{'content-type':'video/mp2t'}});
  }});
});

test('provider failure cools only its shared feed, prevents retry storms and limits disclosure',async()=>{
  let calls=0,now=1000;
  await service(async(base,broker)=>{
    const first=await fetch(base+'/live');
    assert.equal(first.status,502);
    assert.equal((await first.json()).code,'fanout_source_unavailable');
    assert.equal(calls,1);
    const fastRetry=await fetch(base+'/live');
    assert.equal(fastRetry.status,503);
    assert.equal(fastRetry.headers.get('retry-after'),'1');
    assert.equal((await fastRetry.json()).code,'fanout_source_cooling_down');
    assert.equal(calls,1);
    assert.equal(broker.stats().providerFailures,1);
    assert.equal(broker.stats().cooldownRejections,1);
    assert.equal(broker.stats().cooldownFeeds,1);
    assert.equal(JSON.stringify(broker.stats()).includes('licensed.example'),false);
    now+=50;
    const attemptedAgain=await fetch(base+'/live');
    assert.equal(attemptedAgain.status,502);
    assert.equal(calls,2);
    assert.equal(broker.stats().providerFailures,2);
    now+=50;
    const exponential=await fetch(base+'/live');
    assert.equal(exponential.status,503);
    assert.equal(calls,2,'second failure must back off longer');
    now+=51;
    const third=await fetch(base+'/live');
    assert.equal(third.status,502);
    assert.equal(calls,3);
  },{clock:()=>now,providerCooldownMs:50,maxProviderCooldownMs:500,
    fetchImpl:async()=>{calls++;return new Response('unavailable',{status:503})}});
});
test('provider cool-down settings are strictly bounded',()=>{
  assert.throws(()=>createLiveFanout({providerCooldownMs:0}),/fanout_capacity_invalid/);
  assert.throws(()=>createLiveFanout({
    providerCooldownMs:3000,maxProviderCooldownMs:1000}),/fanout_capacity_invalid/);
});

test('fanout failure report classifies provider denials without leaking source details',async()=>{
 const {createServer}=await import('node:http');
 const fanout=createLiveFanout({
   fetchImpl:async()=>new Response('denied',{status:403}),
   lookup:async()=>[{address:'8.8.8.8',family:4}]
 });
 const server=createServer((req,res)=>void fanout.handle(req,res,
   'https://provider.example/live/account/private/12.ts'));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
   const res=await fetch('http://127.0.0.1:'+server.address().port+'/live');
   assert.equal(res.status,502);
   const stats=fanout.stats();
   assert.equal(stats.failureReasons.provider_denied,1);
   assert.doesNotMatch(JSON.stringify(stats),/provider.example|account|private|12.ts/);
 }finally{
   fanout.close();server.closeAllConnections();await new Promise(r=>server.close(r));
 }
});


test('provider same-origin redirect preserves one shared live TS feed',async()=>{
 const visited=[];let feed;
 const upstream=new ReadableStream({start(c){feed=c;}});
 await service(async(base,fanout)=>{
  const promises=[fetch(base+'/live'),fetch(base+'/live')];
  for(let n=0;n<100&&fanout.stats().viewers<2;n++)
   await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(fanout.stats().viewers,2);
  feed.enqueue(new Uint8Array(packet));
  const responses=await Promise.all(promises);
  assert.ok(responses.every(r=>r.status===200));
  assert.equal(visited.length,2);
  assert.ok(visited[1].endsWith('/index.ts'));
  const readers=responses.map(r=>r.body.getReader());
  const parts=await Promise.all(readers.map(r=>r.read()));
  assert.ok(parts.every(x=>Buffer.compare(Buffer.from(x.value),packet)===0));
  await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
 },{fetchImpl:async(url)=>{
  visited.push(url.href);
  if(visited.length===1)return new Response(null,{status:302,
   headers:{location:'/live/a/b/index.ts'}});
  return new Response(upstream,{headers:{'content-type':'video/mp2t'}});
 }});
});
test('licensed TS sharing follows one approved provider-issued public CDN hop',async()=>{
 const visited=[];
 await service(async(base,fanout)=>{
  const r=await fetch(base+'/live');
  assert.equal(r.status,200);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()),packet);
  assert.equal(visited.length,2);
  assert.equal(visited[1].host,'approved-cdn.example');
  assert.equal(fanout.stats().upstreamSessionsOpened,1);
 },{redirectSourceOrigin:'https://licensed.example',
  fetchImpl:async(url,opts)=>{
   visited.push({host:url.hostname,headers:opts.headers});
   if(visited.length===1)return new Response(null,{status:302,
    headers:{location:'https://approved-cdn.example/media/abc.ts'}});
   assert.equal(opts.headers.authorization,undefined);
   assert.equal(opts.headers.cookie,undefined);
   return new Response(packet,{headers:{'content-type':'video/mp2t'}});
 }});
});
test('unapproved CDN and private host redirects never fetch a second origin',async()=>{
 for(const redirect of ['https://unknown.example/media.ts',
  'http://169.254.169.254/metadata']){
  let calls=0;
  await service(async(base,fanout)=>{
   const res=await fetch(base+'/live');
   assert.equal(res.status,502);
   assert.equal(calls,1);
   assert.equal(fanout.stats().upstreamSessionsOpened,0);
  },{fetchImpl:async()=>{
   calls++;return new Response(null,{status:302,headers:{location:redirect}});
  }});
 }
});
test('an idle provider can reconnect without aborting all shared viewers',async()=>{
 let calls=0;
 await service(async(base,fanout)=>{
  const r=await fetch(base+'/live');
  assert.equal(r.status,200);
  const reader=r.body.getReader();
  assert.deepEqual(Buffer.from((await reader.read()).value),packet);
  for(let n=0;n<120&&calls<2;n++)
   await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(calls,2);
  const next=await Promise.race([
   reader.read(),new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),1500))
  ]);
  assert.equal(next.timeout,undefined);
  assert.equal(next.done,false);
  assert.deepEqual(Buffer.from(next.value),packet);
  assert.equal(fanout.stats().upstreamReconnects,1);
  await reader.cancel();
 },{readIdleTimeoutMs:100,reconnectOnUpstreamEnd:true,
  fetchImpl:async()=>{
   calls++;
   return new Response(new ReadableStream({
    start(ctrl){ctrl.enqueue(new Uint8Array(packet))}
   }),{headers:{'content-type':'video/mp2t'}});
  }});
});
