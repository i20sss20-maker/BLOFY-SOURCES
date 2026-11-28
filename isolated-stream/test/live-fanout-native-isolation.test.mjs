import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once,EventEmitter} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
import {createLiveFanout} from '../src/live-fanout.mjs';

const packet=mark=>{
  const b=Buffer.alloc(188*3,mark);
  for(let i=0;i<b.length;i+=188)b[i]=0x47;
  return b;
};
async function listen(server){
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  return 'http://127.0.0.1:'+server.address().port;
}
async function close(server){
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
async function until(predicate){
  for(let i=0;i<300;i++){
    if(predicate())return;
    await sleep(10);
  }
  assert.fail('timed out awaiting expected transport state');
}

for(const independentIngress of [false,true])test('native HTTP: two channels under one authorized scope remain independent on EOF; independentIngress='+independentIngress,{timeout:12000},async()=>{
  const requests={a:0,b:0},writers={};
  const origin=http.createServer((req,res)=>{
    const key=req.url==='/a.ts'?'a':'b';
    requests[key]++;
    writers[key]=res;
    res.writeHead(200,{'content-type':'video/mp2t'});
    res.write(packet(key==='a'?0x21:0x31));
  });
  const upstream=await listen(origin);
  // Test-only transport injection. All media is generated on loopback;
  // production DNS/URL validation and provider limits are unchanged.
  const relay=createLiveFanout({
    maxFeeds:2,maxViewersPerFeed:4,maxTotalViewers:8,independentIngress,
    reconnectOnUpstreamEnd:true,
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    fetchImpl:(url,options)=>fetch(upstream+url.pathname,options)
  });
  const scope='550e8400-e29b-41d4-a716-446655440000';
  const edge=http.createServer((req,res)=>void relay.handle(req,res,
    'https://licensed.example'+req.url,
    {licensedSourceId:scope,providerMaxConcurrentFeeds:2}));
  const base=await listen(edge);
  const abort=new AbortController();
  const deadline=setTimeout(()=>abort.abort(),9000);
  try{
    const responses=await Promise.all(['a','b'].map(x=>fetch(base+'/'+x+'.ts',{signal:abort.signal})));
    assert.ok(responses.every(r=>r.status===200));
    const [a,b]=responses.map(r=>r.body.getReader());
    assert.deepEqual(Buffer.from((await a.read()).value),packet(0x21));
    assert.deepEqual(Buffer.from((await b.read()).value),packet(0x31));
    assert.deepEqual(requests,{a:1,b:1});
    writers.a.end();
    await until(()=>relay.stats().sourceEofWhileViewing===1);
    writers.b.write(packet(0x32));
    assert.deepEqual(Buffer.from((await b.read()).value),packet(0x32));
    await until(()=>requests.a===2);
    assert.deepEqual(Buffer.from((await a.read()).value),packet(0x21));
    const stats=relay.stats();
    assert.equal(stats.activeFeeds,2);
    assert.equal(stats.sourceEofWhileViewing,1);
    if(independentIngress)assert.ok(stats.ingressQueuePeakBytes>0);
    assert.equal(stats.reconnectRecovered,1);
    assert.equal(stats.downstreamPaceCount,0);
    assert.equal(stats.sourceLimitRejections,0);
    assert.ok(stats.sourceReadBytes>=188*3*4);
    assert.deepEqual(stats.channels.map(c=>c.sourceEofs).sort(),[0,1]);
    assert.ok(stats.channels.every(c=>Number.isFinite(c.lastSourceReadAgeMs)));
    assert.deepEqual(requests,{a:2,b:1});
    await Promise.all([a.cancel(),b.cancel()]);
  }finally{
    clearTimeout(deadline);abort.abort();relay.close();
    await close(edge);await close(origin);
  }
});

test('QA zero pacing isolates an overloaded viewer without changing source admission',{timeout:8000},async()=>{
  assert.throws(()=>createLiveFanout({soleViewerPaceMs:2001}),/fanout_capacity_invalid/);
  const calls={a:0,b:0},writers={};
  class Viewer extends EventEmitter {
    constructor(backlogged=false){super();this.writableLength=backlogged?512*1024:0;this.chunks=[];}
    writeHead(){this.headersSent=true;}
    write(chunk){this.chunks.push(Buffer.from(chunk));return true;}
    end(){this.writableEnded=true;this.emit('close');}
    destroy(){this.destroyed=true;this.emit('close');}
  }
  const relay=createLiveFanout({soleViewerPaceMs:0,maxViewerQueueBytes:512*1024,
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    fetchImpl:async url=>{
      const k=url.pathname==='/a.ts'?'a':'b';calls[k]++;
      return new Response(new ReadableStream({start(c){writers[k]=c;}}),
        {headers:{'content-type':'video/mp2t'}});
    }});
  const options={licensedSourceId:'550e8400-e29b-41d4-a716-446655440000',providerMaxConcurrentFeeds:2};
  const a=new Viewer(true),b=new Viewer();
  try{
    await Promise.all([relay.handle({method:'GET'},a,'https://licensed.example/a.ts',options),
      relay.handle({method:'GET'},b,'https://licensed.example/b.ts',options)]);
    await until(()=>writers.a&&writers.b);
    writers.a.enqueue(packet(0x21));writers.b.enqueue(packet(0x31));
    await until(()=>a.destroyed&&b.chunks.length===1);
    writers.b.enqueue(packet(0x32));
    await until(()=>b.chunks.length===2);
    assert.deepEqual(b.chunks,[packet(0x31),packet(0x32)]);
    assert.equal(relay.stats().slowViewerDisconnects,1);
    assert.equal(relay.stats().downstreamPaceCount,0);
    assert.equal(relay.stats().sourceLimitRejections,0);
    assert.deepEqual(calls,{a:1,b:1});
  }finally{relay.close();}
});
