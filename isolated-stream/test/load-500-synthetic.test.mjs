import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

test('500 isolated viewers share four fully synthetic licensed TS sources', {timeout:45000}, async()=>{
 const providerGets=[0,0,0,0],writers=[];
 const packet=Buffer.alloc(188*3,0x16);
 for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
 const streams=Array.from({length:4},(_,i)=>new ReadableStream({
  start(controller){writers[i]=controller}
 }));
 const fanout=createLiveFanout({
  maxFeeds:4,maxViewersPerFeed:128,initialTransientRetries:0,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async target=>{
   const match=/\/(\d)\.ts$/.exec(String(target.pathname));
   const i=Number(match?.[1]);
   if(!Number.isInteger(i)||i<0||i>3)throw Error('fixture_only');
   providerGets[i]++;
   return new Response(streams[i],{status:200,
    headers:{'content-type':'video/mp2t'}});
  }
 });
 const server=http.createServer((req,res)=>{
  const channel=Number(/^\/(\d)$/.exec(req.url)?.[1]);
  if(!Number.isInteger(channel)||channel<0||channel>3){
   res.writeHead(404);return res.end();
  }
  void fanout.handle(req,res,`https://licensed.example/live/qa/${channel}.ts`);
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const base='http://127.0.0.1:'+server.address().port;
  // Exactly four isolated streams; no real provider or customer requests.
  const requestPromises=Array.from({length:4},(_,i)=>
   Array.from({length:125},()=>fetch(base+'/'+i))).flat();
  let got500=false;
  for(let n=0;n<1500;n++){
   if(fanout.stats().viewers===500){got500=true;break}
   await new Promise(r=>setTimeout(r,10));
  }
  assert.equal(got500,true,'all synthetic requests must reach the fanout');
  writers.forEach(w=>w.enqueue(new Uint8Array(packet)));
  const responses=await Promise.all(requestPromises);
  assert.equal(responses.length,500);
  assert.ok(responses.every(r=>r.status===200));
  const readers=responses.map(x=>x.body.getReader());
  const received=await Promise.all(readers.map(x=>x.read()));
  assert.equal(received.filter(x=>!x.done&&
   Buffer.compare(Buffer.from(x.value),packet)===0).length,500);
  assert.deepEqual(providerGets,[1,1,1,1]);
  const m=fanout.stats();
  assert.equal(m.activeFeeds,4);
  assert.equal(m.viewers,500);
  assert.equal(m.upstreamSessionsOpened,4);
  assert.equal(m.slowViewerDisconnects,0);
  assert.equal(m.capacityRejections,0);
  assert.equal(m.channels.every(c=>c.viewers===125),true);
  assert.equal(m.channels.every(c=>c.sourceStarts===1),true);
  assert.equal(m.channels.reduce((n,c)=>n+c.viewers,0),500);
  await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));
 }finally{
  fanout.close();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
});
