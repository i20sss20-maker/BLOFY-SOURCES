import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

const source='https://licensed.example/live/synthetic/1.ts';
const packet=Buffer.alloc(188 * 3, 0x17);
for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function withLocalFanout(options,fn){
  let upstreamStarts=0;
  let writer;
  const stream=new ReadableStream({start(controller){writer=controller;}});
  const fanout=createLiveFanout({
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    firstByteTimeoutMs:12000,
    fetchImpl:async()=>{upstreamStarts++;return new Response(stream,{
      status:200,headers:{'content-type':'video/mp2t'}
    });},
    ...options
  });
  const server=http.createServer((req,res)=>void fanout.handle(req,res,source));
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  try{
    await fn({
      base:'http://127.0.0.1:'+server.address().port,
      fanout,upstreamStarts:()=>upstreamStarts,
      send:()=>writer.enqueue(new Uint8Array(packet))
    });
  }finally{
    fanout.close();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
}

async function until(predicate,{tries=600,delay=10}={}){
  for(let i=0;i<tries;i++){
    if(predicate())return true;
    await sleep(delay);
  }
  return predicate();
}

test('500 purely synthetic viewers on ONE channel share one upstream TS GET', {timeout:60000},async()=>{
  await withLocalFanout({maxFeeds:1,maxViewersPerFeed:512},async({base,fanout,upstreamStarts,send})=>{
    const requests=Array.from({length:500},()=>fetch(base+'/channel'));
    assert.equal(await until(()=>fanout.stats().viewers===500),true,
      'all synthetic viewers must attach before the first TS segment');
    send();
    const responses=await Promise.all(requests);
    assert.equal(responses.length,500);
    assert.ok(responses.every(response=>response.status===200));
    const readers=responses.map(response=>response.body.getReader());
    const segments=await Promise.all(readers.map(reader=>reader.read()));
    assert.ok(segments.every(chunk=>!chunk.done &&
      Buffer.compare(Buffer.from(chunk.value),packet)===0));
    const metrics=fanout.stats();
    assert.equal(upstreamStarts(),1);
    assert.equal(metrics.upstreamSessionsOpened,1);
    assert.equal(metrics.activeFeeds,1);
    assert.equal(metrics.viewers,500);
    assert.equal(metrics.capacityRejections,0);
    assert.equal(metrics.slowViewerDisconnects,0);
    assert.equal(metrics.maxViewersPerFeed,512);
    await Promise.all(readers.map(reader=>reader.cancel().catch(()=>{})));
  });
});

test('over-capacity join returns 503 without interrupting existing authorized viewers', {timeout:20000},async()=>{
  await withLocalFanout({maxFeeds:1,maxViewersPerFeed:16},async({base,fanout,upstreamStarts,send})=>{
    const requests=Array.from({length:16},()=>fetch(base+'/channel'));
    assert.equal(await until(()=>fanout.stats().viewers===16),true);
    const overflow=await fetch(base+'/channel');
    assert.equal(overflow.status,503);
    assert.equal(overflow.headers.get('retry-after'),'3');
    assert.equal(await overflow.text(),'fanout_viewer_limit');
    assert.equal(fanout.stats().capacityRejections,1);
    assert.equal(fanout.stats().viewers,16,
      'existing users must not be evicted when a new viewer exceeds the cap');
    send();
    const responses=await Promise.all(requests);
    assert.ok(responses.every(response=>response.status===200));
    const readers=responses.map(response=>response.body.getReader());
    const chunks=await Promise.all(readers.map(reader=>reader.read()));
    assert.ok(chunks.every(chunk=>!chunk.done &&
      Buffer.compare(Buffer.from(chunk.value),packet)===0));
    assert.equal(upstreamStarts(),1);
    await readers[0].cancel();
    assert.equal(await until(()=>fanout.stats().viewers===15),true);
    const next=fetch(base+'/channel');
    assert.equal(await until(()=>fanout.stats().viewers===16),true);
    send();
    const accepted=await next;
    assert.equal(accepted.status,200);
    const acceptedReader=accepted.body.getReader();
    const data=await acceptedReader.read();
    assert.deepEqual(Buffer.from(data.value),packet);
    assert.equal(upstreamStarts(),1,
      'replacing a disconnected viewer must reuse the still-running upstream');
    assert.equal(fanout.stats().viewers,16);
    await acceptedReader.cancel().catch(()=>{});
    await Promise.all(readers.slice(1).map(reader=>reader.cancel().catch(()=>{})));
  });
});
