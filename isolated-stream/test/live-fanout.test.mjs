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

test('two-reader canary waits for both viewers before ONE authorized provider GET',async()=>{
 let providerCalls=0,controller;
 const source=new ReadableStream({start(c){controller=c;}});
 await service(async(base,fanout)=>{
  const first=fetch(base+'/live');
  for(let i=0;i<80&&fanout.stats().viewers!==1;i++)
   await new Promise(r=>setTimeout(r,10));
  assert.equal(fanout.stats().viewers,1);
  assert.equal(providerCalls,0);
  const second=fetch(base+'/live');
  for(let i=0;i<80&&fanout.stats().viewers!==2;i++)
   await new Promise(r=>setTimeout(r,10));
  assert.equal(fanout.stats().viewers,2);
  assert.equal(providerCalls,1);
  controller.enqueue(new Uint8Array(packet));
  const responses=await Promise.all([first,second]);
  assert.ok(responses.every(r=>r.status===200));
  const readers=responses.map(r=>r.body.getReader());
  const chunks=await Promise.all(readers.map(r=>r.read()));
  assert.ok(chunks.every(c=>Buffer.compare(Buffer.from(c.value),packet)===0));
  await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
 },{minViewersToStart:2,fetchImpl:async()=>{
  providerCalls++;
  return new Response(source,{headers:{'content-type':'video/mp2t'}});
 }});
});
test('canary viewer barrier cannot exceed per-feed reader capacity',()=>{
 assert.throws(()=>createLiveFanout({maxViewersPerFeed:1,minViewersToStart:2}),
  /fanout_capacity_invalid/);
});


test('one transient initial HTTP 503 recovers for two viewers without client 502',async()=>{
 let calls=0;
 await service(async(base,fanout)=>{
  const joined=[fetch(base+'/live'),fetch(base+'/live')];
  const results=await Promise.all(joined);
  assert.ok(results.every(r=>r.status===200));
  assert.equal(calls,2);
  assert.equal(fanout.stats().initialRetries,1);
  assert.equal(fanout.stats().providerFailures,0);
  assert.equal(fanout.stats().upstreamSessionsOpened,1);
  const readers=results.map(r=>r.body.getReader());
  const data=await Promise.all(readers.map(r=>r.read()));
  assert.ok(data.every(x=>Buffer.compare(Buffer.from(x.value),packet)===0));
  await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
 },{initialTransientRetries:1,fetchImpl:async()=>{
  calls++;
  if(calls===1)return new Response('temporary unavailable',{status:503});
  const media=new ReadableStream({start(c){c.enqueue(new Uint8Array(packet));}});
  return new Response(media,{headers:{'content-type':'video/mp2t'}});
 }});
});
test('two repeated provider failures stop after one retry and cool down only one feed',async()=>{
 let calls=0;
 await service(async(base,fanout)=>{
  const r=await fetch(base+'/live');
  assert.equal(r.status,502);
  assert.equal(calls,2);
  assert.equal(fanout.stats().initialRetries,1);
  assert.equal(fanout.stats().providerFailures,1);
  const cooldown=await fetch(base+'/live');
  assert.equal(cooldown.status,503);
  assert.equal(calls,2);
 },{initialTransientRetries:1,fetchImpl:async()=>{
  calls++;return new Response('temporary unavailable',{status:503});
 }});
});
test('provider authorization denial never triggers automatic retries',async()=>{
 let calls=0;
 await service(async base=>{
  const r=await fetch(base+'/live');
  assert.equal(r.status,502);
  assert.equal(calls,1);
 },{initialTransientRetries:2,fetchImpl:async()=>{
  calls++;return new Response('access denied',{status:403});
 }});
});
test('a viewer joining while shared feed reconnects gets headers only after media arrives',async()=>{
 let calls=0,readyTwo,releaseTwo;
 const barrier=new Promise(resolve=>{releaseTwo=resolve});
 const entered=new Promise(resolve=>{readyTwo=resolve});
 await service(async(base,fanout)=>{
  const a=await fetch(base+'/live');
  assert.equal(a.status,200);
  const readerA=a.body.getReader();
  assert.deepEqual(Buffer.from((await readerA.read()).value),packet);
  await entered;
  assert.equal(fanout.stats().upstreamReconnects,1);
  const b=fetch(base+'/live');
  for(let n=0;n<80&&fanout.stats().viewers<2;n++)
    await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(fanout.stats().viewers,2);
  releaseTwo();
  const rb=await b;
  assert.equal(rb.status,200);
  assert.equal(rb.headers.get('content-type'),'video/mp2t');
  const readerB=rb.body.getReader();
  const [vA,vB]=await Promise.all([readerA.read(),readerB.read()]);
  assert.ok([vA,vB].every(x=>Buffer.compare(Buffer.from(x.value),packet)===0));
  assert.equal(calls,2);
  assert.equal(fanout.stats().reconnectRecovered,1);
  await Promise.all([readerA.cancel(),readerB.cancel()]);
 },{reconnectOnUpstreamEnd:true,fetchImpl:async()=>{
  calls++;
  if(calls===1)return new Response(new ReadableStream({
   start(c){c.enqueue(new Uint8Array(packet));c.close();}
  }),{headers:{'content-type':'video/mp2t'}});
  readyTwo();await barrier;
  return new Response(new ReadableStream({
   start(c){c.enqueue(new Uint8Array(packet));}
  }),{headers:{'content-type':'video/mp2t'}});
 }});
});

test('source A outage and cooldown do not interrupt source B or its two viewers',async()=>{
 const a='https://licensed.example/live/a/b/dead.ts';
 const b='https://licensed.example/live/a/b/healthy.ts';
 let deadCalls=0,healthyCalls=0,healthyController;
 const healthyStream=new ReadableStream({start(c){healthyController=c;}});
 const serverFanout=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  initialTransientRetries:1,
  fetchImpl:async(url)=>{
   if(url.pathname.endsWith('dead.ts')){
    deadCalls++;
    return new Response('provider unavailable',{status:503});
   }
   healthyCalls++;
   return new Response(healthyStream,{headers:{'content-type':'video/mp2t'}});
  }
 });
 const srv=http.createServer((req,res)=>
  void serverFanout.handle(req,res,req.url==='/bad'?a:b));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 const base='http://127.0.0.1:'+srv.address().port;
 try{
  const good=[fetch(base+'/good'),fetch(base+'/good')];
  for(let n=0;n<100&&serverFanout.stats().viewers<2;n++)
    await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(serverFanout.stats().viewers,2);
  const dead=await fetch(base+'/bad');
  assert.equal(dead.status,502);
  const blocked=await fetch(base+'/bad');
  assert.equal(blocked.status,503);
  assert.equal(deadCalls,2);
  healthyController.enqueue(new Uint8Array(packet));
  const data=await Promise.all(good);
  assert.equal(healthyCalls,1);
  assert.ok(data.every(x=>x.status===200));
  const readers=data.map(x=>x.body.getReader());
  const chunks=await Promise.all(readers.map(x=>x.read()));
  assert.ok(chunks.every(x=>Buffer.compare(Buffer.from(x.value),packet)===0));
  assert.equal(serverFanout.stats().activeFeeds,1);
  await Promise.all(readers.map(x=>x.cancel().catch(()=>{})));
 }finally{
  serverFanout.close();srv.closeAllConnections();
  await new Promise(resolve=>srv.close(resolve));
 }
});

test('operator channel health is bounded, anonymous and records recovery without source credentials',async()=>{
 let upstreamCalls=0,controller,secondController;
 const input='https://licensed.example/live/password/secret/channel.ts';
 const fanout=createLiveFanout({lookup:async()=>[{address:'8.8.8.8',family:4}],
  reconnectOnUpstreamEnd:true,readIdleTimeoutMs:140,
  fetchImpl:async()=>{
   upstreamCalls++;
   const body=new ReadableStream({start(c){
    if(upstreamCalls===1){controller=c;c.enqueue(new Uint8Array(packet))}
    else {secondController=c;c.enqueue(new Uint8Array(packet))}
   }});
   return new Response(body,{headers:{'content-type':'video/mp2t'}});
  }});
 const server=http.createServer((req,res)=>void fanout.handle(req,res,input));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const base='http://127.0.0.1:'+server.address().port+'/live';
  const media=await fetch(base);
  const reader=media.body.getReader();
  await reader.read();
  const before=fanout.stats();
  assert.equal(before.channels.length,1);
  assert.equal(before.channels[0].state,'ready');
  assert.equal(before.channels[0].viewers,1);
  assert.ok(Number.isSafeInteger(before.channels[0].channel));
  assert.equal(before.channels[0].sourceStarts,1);
  assert.equal(before.events[0].kind,'connected');
  assert.ok(before.channels[0].lastMediaAgeMs>=0);
  controller.close();
  for(let n=0;n<100&&fanout.stats().reconnectRecovered===0;n++)
   await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(fanout.stats().reconnectRecovered,1);
  assert.equal(fanout.stats().channels[0].sourceStarts,2);
  assert.ok(fanout.stats().events.some(e=>e.kind==='reconnecting'));
  assert.ok(fanout.stats().events.some(e=>e.kind==='recovered'));
  const json=JSON.stringify(fanout.stats());
  assert.doesNotMatch(json,/licensed.example|password|secret|channel.ts|sourceUrl|cookie|token/);
  await reader.cancel();
 }finally{
  fanout.close();server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
});

test('channel zapping reclaims only zero-viewer idle feed when source slots are full',async()=>{
 const A='https://licensed.example/live/authorized/one.ts';
 const B='https://licensed.example/live/authorized/two.ts';
 const sources=[];
 const fanout=createLiveFanout({maxFeeds:1,idleMs:3000,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async url=>{
   sources.push(url.pathname.endsWith('one.ts')?'A':'B');
   return new Response(new ReadableStream({start(c){
    c.enqueue(new Uint8Array(packet));
   }}),{headers:{'content-type':'video/mp2t'}});
  }});
 const server=http.createServer((req,res)=>
  void fanout.handle(req,res,req.url==='/one'?A:B));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const a=await fetch(base+'/one');
  const readerA=a.body.getReader();await readerA.read();
  assert.equal(fanout.stats().activeFeeds,1);
  // With one ACTIVE viewer, the other channel MUST remain capped.
  const full=await fetch(base+'/two');
  assert.equal(full.status,503);
  assert.deepEqual(sources,['A']);
  await readerA.cancel();
  for(let n=0;n<70&&fanout.stats().viewers!==0;n++)
   await new Promise(r=>setTimeout(r,10));
  assert.equal(fanout.stats().viewers,0);
  assert.equal(fanout.stats().activeFeeds,1,'feed is still within idle grace');
  const next=await fetch(base+'/two');
  assert.equal(next.status,200);
  const readerB=next.body.getReader();await readerB.read();
  assert.deepEqual(sources,['A','B']);
  assert.equal(fanout.stats().activeFeeds,1);
  assert.equal(fanout.stats().viewers,1);
  assert.ok(fanout.stats().events.some(e=>e.kind==='idle'));
  await readerB.cancel();
 }finally{
  fanout.close();server.closeAllConnections();
  await new Promise(ok=>server.close(ok));
 }
});

test('viewers with different signed CDN scopes do not silently share a feed',async()=>{
 let upstreamCalls=0;
 const streamControllers=[];
 const broker=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async()=>{
   upstreamCalls++;
   return new Response(new ReadableStream({
    start(c){streamControllers.push(c)}
   }),{headers:{'content-type':'video/mp2t'}});
  }
 });
 const srv=http.createServer((req,res)=>void broker.handle(req,res,SOURCE,{
  allowProviderCdn:req.url==='/licensed'}));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 const base='http://127.0.0.1:'+srv.address().port;
 try{
  const r=[fetch(base+'/licensed'),fetch(base+'/ordinary')];
  for(let n=0;n<80&&broker.stats().viewers<2;n++)
   await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(broker.stats().activeFeeds,2);
  assert.equal(upstreamCalls,2);
  for(const c of streamControllers)c.enqueue(new Uint8Array(packet));
  const responses=await Promise.all(r);
  assert.ok(responses.every(x=>x.status===200));
  const readers=responses.map(x=>x.body.getReader());
  const bytes=await Promise.all(readers.map(x=>x.read()));
  assert.ok(bytes.every(x=>Buffer.compare(Buffer.from(x.value),packet)===0));
  await Promise.all(readers.map(x=>x.cancel().catch(()=>{})));
 }finally{
  broker.close();srv.closeAllConnections();await new Promise(done=>srv.close(done));
 }
});
test('sanitized connection lifecycle emits provider outage and recovery only',async()=>{
 let calls=0;
 const events=[];
 const fanout=createLiveFanout({
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  reconnectOnUpstreamEnd:true,readIdleTimeoutMs:100,
  onEvent:e=>events.push(e),
  fetchImpl:async()=>{
   calls++;
   return new Response(new ReadableStream({start(c){
    c.enqueue(new Uint8Array(packet));
    if(calls===1)c.close();
   }}),{headers:{'content-type':'video/mp2t'}});
  }
 });
 const srv=http.createServer((req,res)=>void fanout.handle(req,res,SOURCE));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 try{
  const res=await fetch('http://127.0.0.1:'+srv.address().port);
  const reader=res.body.getReader();await reader.read();
  for(let n=0;n<120&&fanout.stats().reconnectRecovered===0;n++)
   await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(fanout.stats().reconnectRecovered,1);
  assert.ok(events.some(e=>e.kind==='connected'));
  assert.ok(events.some(e=>e.kind==='reconnecting'));
  assert.ok(events.some(e=>e.kind==='recovered'));
  const serialized=JSON.stringify(events);
  assert.doesNotMatch(serialized,/licensed[.]example|channel[.]ts|password|sourceUrl|token/);
  await reader.cancel();
 }finally{fanout.close();srv.closeAllConnections();await new Promise(done=>srv.close(done))}
});

test('a source whose cancel promise hangs cannot block the next shared TS connection',async()=>{
 let attempts=0;
 const holdingCancel=new Promise(()=>{});
 await service(async(base,fanout)=>{
  const response=await fetch(base+'/live');
  assert.equal(response.status,200);
  const reader=response.body.getReader();
  const first=await reader.read();
  assert.equal(first.value[0],0x47);
  for(let n=0;n<180&&fanout.stats().reconnectRecovered===0;n++)
   await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(attempts,2,'source cancellation must not block source recovery');
  assert.equal(fanout.stats().reconnectRecovered,1);
  assert.equal(fanout.stats().activeFeeds,1);
  const second=await Promise.race([reader.read(),
   new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),900))]);
  assert.equal(second.timeout,undefined);
  assert.equal(second.value[0],0x47);
  await reader.cancel();
 },{readIdleTimeoutMs:90,reconnectOnUpstreamEnd:true,
  fetchImpl:async()=>{
   attempts++;
   return new Response(new ReadableStream({
    start(ctrl){ctrl.enqueue(new Uint8Array(packet));},
    cancel:attempts===1?()=>holdingCancel:()=>{}
   }),{headers:{'content-type':'video/mp2t'}});
  }});
});
