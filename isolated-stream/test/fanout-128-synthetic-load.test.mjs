import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

const SOURCE='https://licensed.example/live/authorized/stream.ts';
const packet=Buffer.alloc(188*4,0x11);
for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
async function serve(callback,options={}){
  const fanout=createLiveFanout({
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    firstByteTimeoutMs:5000,readIdleTimeoutMs:5000,idleMs:50,
    ...options
  });
  const server=http.createServer((req,res)=>
    void fanout.handle(req,res,SOURCE));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{await callback('http://127.0.0.1:'+server.address().port,fanout)}
  finally{
    fanout.close();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
}
async function waitUntil(fn,{maxMs=8000}={}){
  const at=Date.now();
  while(Date.now()-at<maxMs){
    if(fn())return;
    await new Promise(resolve=>setTimeout(resolve,15));
  }
  throw Error('mock_fanout_concurrency_timeout');
}
test('128 synthetic HTTP readers share ONE upstream response, 129th rejected without kicking anyone', {timeout:20000},async()=>{
  let originGets=0,controller;
  const stream=new ReadableStream({start(c){controller=c}});
  await serve(async(base,relay)=>{
    const clients=Array.from({length:128},()=>fetch(base+'/live'));
    await waitUntil(()=>relay.stats().viewers===128);
    assert.equal(relay.stats().activeFeeds,1);
    const overflow=await fetch(base+'/live');
    assert.equal(overflow.status,503);
    assert.match(await overflow.text(),/fanout_viewer_limit/);
    assert.equal(overflow.headers.get('retry-after'),'3');
    assert.equal(relay.stats().viewers,128);
    controller.enqueue(new Uint8Array(packet));
    const responses=await Promise.all(clients);
    assert.ok(responses.every(r=>r.status===200));
    const readers=responses.map(r=>r.body.getReader());
    const pieces=await Promise.all(readers.map(r=>r.read()));
    assert.ok(pieces.every(p=>!p.done&&Buffer.compare(Buffer.from(p.value),packet)===0));
    const state=relay.stats();
    assert.equal(originGets,1,'test proves source reuse not provider concurrency entitlement');
    assert.equal(state.activeFeeds,1);
    assert.equal(state.viewers,128);
    assert.equal(state.viewersAccepted,128);
    assert.equal(state.capacityRejections,1);
    assert.equal(state.upstreamSessionsOpened,1);
    assert.equal(state.sourceBytesReceived,packet.length);
    assert.equal(state.viewerBytesQueued,128*packet.length);
    assert.equal(state.slowViewerDisconnects,0);
    await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
    await waitUntil(()=>relay.stats().viewers===0);
  },{maxFeeds:1,maxViewersPerFeed:128,
    fetchImpl:async()=>{originGets++;return new Response(stream,{
      status:200,headers:{'content-type':'video/mp2t'}
    })}});
});

const pat=()=>Buffer.from([0,0xb0,13,0,1,0xc1,0,0,0,1,0xe1,0,0,0,0,0]);
function pmt(audioType){
  return Buffer.from([2,0xb0,23,0,1,0xc1,0,0,0xe1,1,0xf0,0,
    0x1b,0xe1,0x20,0xf0,0,audioType,0xe1,0x21,0xf0,0,0,0,0,0]);
}
function section(pid,content){
  const out=Buffer.alloc(188,0xff);
  out[0]=0x47;out[1]=0x40|((pid>>8)&31);out[2]=pid&255;out[3]=0x10;
  Buffer.concat([Buffer.from([0]),content]).copy(out,4);
  return out;
}
const transport=kind=>Buffer.concat([section(0,pat()),section(256,pmt(kind)),
  ...Array.from({length:118},(_,i)=>{
    const part=Buffer.alloc(188,0xff);part[0]=0x47;
    part[1]=((i%2?289:288)>>8)&31;
    part[2]=(i%2?289:288)&255;
    part[3]=0x10|((Math.floor(i/2))&15);
    return part;
  })]);
test('sequential source reconnect resets OLD PMT/audio evidence without dropping attached viewer', {timeout:15000},async()=>{
  let originGets=0,first;
  let now=1800000000000;
  const original=transport(0x0f),replacement=transport(0x81);
  await serve(async(base,relay)=>{
    const media=await fetch(base+'/live');
    assert.equal(media.status,200);
    const reader=media.body.getReader();
    const initial=await reader.read();
    assert.equal(Buffer.from(initial.value).subarray(0,188).equals(original.subarray(0,188)),true);
    assert.equal(relay.stats().channels[0].audio.audioCodecs[0],'aac');
    const timeA=relay.stats().channels[0].trackInspectedAt;
    assert.equal(timeA,now);
    now+=10000;
    first.close();
    await waitUntil(()=>relay.stats().channels[0]?.sourceStarts===2,{maxMs:5000});
    // Still attached while a permitted upstream reconnect happens.
    assert.equal(relay.stats().viewers,1);
    const after=await reader.read();
    assert.equal(Buffer.from(after.value).subarray(0,188).equals(replacement.subarray(0,188)),true);
    const result=relay.stats().channels[0];
    assert.deepEqual(result.audio.audioCodecs,['ac3']);
    assert.equal(result.trackInspectedAt,now);
    assert.equal(result.sourceStarts,2);
    assert.equal(originGets,2);
    assert.equal(result.audio.decodedAudio,false);
    await reader.cancel();
  },{
    clock:()=>now,readIdleTimeoutMs:3000,reconnectOnUpstreamEnd:true,
    maxReconnectAttempts:1,
    fetchImpl:async()=>{
      originGets++;
      return new Response(new ReadableStream({start(c){
        if(originGets===1){first=c;c.enqueue(new Uint8Array(original))}
        else c.enqueue(new Uint8Array(replacement));
      }}),{status:200,headers:{'content-type':'video/mp2t'}});
    }
  });
});
