import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveFanout} from '../src/live-fanout.mjs';

// This uses native Node fetch + a real local streaming socket. A fabricated
// ReadableStream alone cannot reproduce Undici's AbortError when the signal
// is aborted before reader.cancel() on an in-flight response.
test('licensed source handoff confirms native fetch cancellation before abort, no permanent 503', {timeout:12000}, async()=>{
 const scope='550e8400-e29b-41d4-a716-446655440000';
 const packet=Buffer.alloc(188,0);packet[0]=0x47;
 let opened=0,closed=0;
 const origin=http.createServer((req,res)=>{
  opened++;
  res.writeHead(200,{'content-type':'video/mp2t'});
  res.write(packet);
  res.on('close',()=>{closed++});
 });
 origin.listen(0,'127.0.0.1');await once(origin,'listening');
 const broker=createLiveFanout({idleMs:30,readIdleTimeoutMs:5000,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:(target,opts)=>fetch('http://127.0.0.1:'+origin.address().port+
   target.pathname,{signal:opts.signal,redirect:'manual'})});
 const edge=http.createServer((req,res)=>void broker.handle(req,res,
  'https://licensed.example/live/a/b'+req.url,
  {licensedSourceId:scope,providerMaxConcurrentFeeds:1}));
 edge.listen(0,'127.0.0.1');await once(edge,'listening');
 const base='http://127.0.0.1:'+edge.address().port;
 async function until(condition,label){
  for(let i=0;i<180&&!condition();i++)await new Promise(r=>setTimeout(r,10));
  assert.ok(condition(),label)
 }
 try{
  const old=await fetch(base+'/old.ts',{signal:AbortSignal.timeout(5000)});
  assert.equal(old.status,200);
  const oldReader=old.body.getReader();
  assert.equal((await oldReader.read()).value[0],0x47);
  await oldReader.cancel();
  await until(()=>broker.stats().viewers===0,'old viewer detached');
  const fresh=await fetch(base+'/new.ts',{signal:AbortSignal.timeout(5000)});
  assert.equal(fresh.status,200,'new channel must not inherit an aborted reader false quarantine');
  const nextReader=fresh.body.getReader();
  assert.equal((await nextReader.read()).value[0],0x47);
  await until(()=>closed>=1,'first native fetch socket closed');
  assert.equal(opened,2);
  assert.equal(broker.stats().sourceReleaseStalls,0);
  assert.equal(broker.stats().pendingSourceHandoffs,0);
  await nextReader.cancel();
 }finally{
  broker.close();edge.closeAllConnections();origin.closeAllConnections();
  await Promise.all([new Promise(resolve=>edge.close(resolve)),
   new Promise(resolve=>origin.close(resolve))]);
 }
});
