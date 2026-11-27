import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createRelayIngressHold} from '../src/engine-ingress-hold.mjs';
import {createLiveFanout} from '../src/live-fanout.mjs';
const source='https://licensed.example/live/a/b/123.ts';
const packet=Buffer.alloc(188*3,0x11);for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
const wait=async(fn)=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('condition timeout')};
test('hold client rejects ambiguous or denied admission; idempotent local close',async()=>{
 const env={BLOFY_RELAY_INGRESS_HOLDS:'1',BLOFY_STREAM_RELAY_SHARED_TOKEN:'x'.repeat(40)};
 const requests=[];let status=200;
 const hold=createRelayIngressHold({env,fetchImpl:async(url,opt)=>{
  assert.equal(opt.redirect,'error');assert.equal(opt.headers.authorization,'Bearer '+env.BLOFY_STREAM_RELAY_SHARED_TOKEN);
  requests.push(JSON.parse(opt.body));return new Response('{"ok":true}',{status});
 }});
 status=503;assert.equal((await hold()).ok,false);
 status=200;const h=await hold();assert.equal(h.ok,true);
 assert.equal(await h.close(),true);assert.equal(await h.close(),true);
 assert.equal(requests.length,3);assert.equal(requests[1].holdId,requests[2].holdId);
});
test('shared feed cannot access upstream before hold; two viewers share one hold until cleanup',async()=>{
 let admissions=0,closed=0,media=0,emitter,releaseAdmission;
 const pending=new Promise(r=>{releaseAdmission=r});
 const fanout=createLiveFanout({lookup:async()=>[{address:'8.8.8.8',family:4}],idleMs:30,
  acquireIngressHold:async()=>{admissions++;await pending;return {ok:true,close:async()=>{closed++;return true}}},
  fetchImpl:async()=>{media++;return new Response(new ReadableStream({start(c){emitter=c}}),{headers:{'content-type':'video/mp2t'}})}});
 const srv=http.createServer((req,res)=>void fanout.handle(req,res,source));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 try{
  const url='http://127.0.0.1:'+srv.address().port+'/live';
  const a=fetch(url),b=fetch(url);
  await wait(()=>fanout.stats().viewers===2);assert.equal(admissions,1);assert.equal(media,0);
  releaseAdmission();await wait(()=>!!emitter);emitter.enqueue(new Uint8Array(packet));
  const responses=await Promise.all([a,b]);assert.ok(responses.every(r=>r.status===200));
  assert.equal(media,1);assert.equal(closed,0);
  const readers=responses.map(r=>r.body.getReader());await Promise.all(readers.map(r=>r.read()));
  await Promise.all(readers.map(r=>r.cancel().catch(()=>{})));await wait(()=>closed===1);
  assert.equal(admissions,1);assert.equal(media,1);
 }finally{releaseAdmission();fanout.close();srv.closeAllConnections();await new Promise(r=>srv.close(r))}
});
test('denied hold opens no upstream media request',async()=>{
 let calls=0;
 const fanout=createLiveFanout({lookup:async()=>[{address:'8.8.8.8',family:4}],acquireIngressHold:async()=>({ok:false}),fetchImpl:async()=>{calls++;throw Error('unexpected')}});
 const srv=http.createServer((req,res)=>void fanout.handle(req,res,source));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 try{const r=await fetch('http://127.0.0.1:'+srv.address().port+'/live');assert.equal(r.status,503);await r.text();assert.equal(calls,0)}
 finally{fanout.close();srv.closeAllConnections();await new Promise(r=>srv.close(r))}
});
