import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

// Synthetic TS only: no customer accounts, IPTV credentials or provider traffic.
const SOURCE='https://licensed.example/live/test/test/channel.ts';
const packet=Buffer.alloc(188*3,0x11);
for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitFor(condition,label,attempts=150){
  for(let i=0;i<attempts;i++){
    if(condition())return;
    await sleep(15);
  }
  assert.fail('timed out waiting for '+label);
}
async function receiveAtLeast(reader,bytes){
  let total=0;
  const deadline=Date.now()+12000;
  while(total<bytes){
    assert.ok(Date.now()<deadline,'synthetic viewer stopped receiving TS');
    const result=await Promise.race([
      reader.read(),
      sleep(2000).then(()=>({timeout:true}))
    ]);
    assert.equal(result.timeout,undefined,'stalled viewer read');
    assert.equal(result.done,false,'viewer was disconnected during valid media');
    assert.ok(result.value.byteLength>0);
    total+=result.value.byteLength;
  }
  return total;
}

test('two continuous viewers share one TS upstream; one leaving never stops the other', {timeout:20000}, async()=>{
  let providerCalls=0;
  let sourceController;
  const source=new ReadableStream({
    start(controller){sourceController=controller;}
  });
  const fanout=createLiveFanout({
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    fetchImpl:async()=>{
      providerCalls++;
      return new Response(source,{status:200,
        headers:{'content-type':'video/mp2t'}});
    }
  });
  const server=http.createServer((req,res)=>void fanout.handle(req,res,SOURCE));
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  let firstReader=null,secondReader=null;
  try{
    const first=fetch(base+'/live');
    const second=fetch(base+'/live');
    await waitFor(()=>fanout.stats().viewers===2,'two joined viewers');
    sourceController.enqueue(new Uint8Array(packet));
    const [firstResponse,secondResponse]=await Promise.all([first,second]);
    assert.equal(firstResponse.status,200);
    assert.equal(secondResponse.status,200);
    firstReader=firstResponse.body.getReader();
    secondReader=secondResponse.body.getReader();
    await Promise.all([
      receiveAtLeast(firstReader,packet.length),
      receiveAtLeast(secondReader,packet.length)
    ]);

    // Keep both connections consuming for several seconds. The same source
    // must service both, and no slow-viewer isolation should be triggered.
    const bothA=receiveAtLeast(firstReader,packet.length*110);
    const bothB=receiveAtLeast(secondReader,packet.length*110);
    for(let i=0;i<110;i++){
      sourceController.enqueue(new Uint8Array(packet));
      await sleep(30);
    }
    await Promise.all([bothA,bothB]);
    assert.equal(providerCalls,1);
    assert.equal(fanout.stats().activeFeeds,1);
    assert.equal(fanout.stats().viewers,2);
    assert.equal(fanout.stats().slowViewerDisconnects,0);

    await firstReader.cancel();
    firstReader=null;
    await waitFor(()=>fanout.stats().viewers===1,'remaining viewer');
    const alone=receiveAtLeast(secondReader,packet.length*50);
    for(let i=0;i<50;i++){
      sourceController.enqueue(new Uint8Array(packet));
      await sleep(30);
    }
    await alone;
    assert.equal(providerCalls,1,'disconnecting one viewer must not reconnect source');
    assert.equal(fanout.stats().viewers,1,'second viewer stays attached');
    assert.equal(fanout.stats().activeFeeds,1);
  }finally{
    await Promise.allSettled([firstReader?.cancel(),secondReader?.cancel()]);
    fanout.close();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});


test('both continuous viewers survive one ended provider response and share its recovery', {timeout:12000}, async()=>{
  let providerCalls=0;
  const fanout=createLiveFanout({
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    minViewersToStart:2,
    reconnectOnUpstreamEnd:true,
    maxReconnectAttempts:2,
    readIdleTimeoutMs:1500,
    fetchImpl:async()=>{
      providerCalls++;
      const attempt=providerCalls;
      const source=new ReadableStream({
        start(controller){
          controller.enqueue(new Uint8Array(packet));
          // End the first response; the second remains available to viewers.
          if(attempt===1)controller.close();
        }
      });
      return new Response(source,{headers:{'content-type':'video/mp2t'}});
    }
  });
  const server=http.createServer((req,res)=>void fanout.handle(req,res,SOURCE));
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const url='http://127.0.0.1:'+server.address().port+'/live';
  let readerA=null,readerB=null;
  try{
    const joined=[fetch(url),fetch(url)];
    await waitFor(()=>fanout.stats().viewers===2,'two authorized relay viewers');
    const [responseA,responseB]=await Promise.all(joined);
    assert.equal(responseA.status,200);
    assert.equal(responseB.status,200);
    readerA=responseA.body.getReader();
    readerB=responseB.body.getReader();
    await Promise.all([
      receiveAtLeast(readerA,packet.length*2),
      receiveAtLeast(readerB,packet.length*2)
    ]);
    assert.equal(providerCalls,2);
    assert.equal(fanout.stats().activeFeeds,1);
    assert.equal(fanout.stats().viewers,2);
    assert.equal(fanout.stats().reconnectRecovered,1);
  }finally{
    await Promise.allSettled([readerA?.cancel(),readerB?.cancel()]);
    fanout.close();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});
