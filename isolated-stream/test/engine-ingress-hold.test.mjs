import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createRelayIngressHold} from '../src/engine-ingress-hold.mjs';
import {createLiveFanout} from '../src/live-fanout.mjs';
import {createRelayBroker} from '../src/relay-broker.mjs';
const source='https://licensed.example/live/a/b/123.ts';
const packet=Buffer.alloc(188*3,0x11);for(let i=0;i<packet.length;i+=188)packet[i]=0x47;
const wait=async(fn)=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10))}throw Error('condition timeout')};
test('a definitive denial opens no media and does not retire another hold',async()=>{
 const env={BLOFY_RELAY_INGRESS_HOLDS:'1',BLOFY_STREAM_RELAY_SHARED_TOKEN:'x'.repeat(40)};
 const requests=[];let status=200;
 const hold=createRelayIngressHold({env,fetchImpl:async(url,opt)=>{
  assert.equal(opt.redirect,'error');assert.equal(opt.headers.authorization,'Bearer '+env.BLOFY_STREAM_RELAY_SHARED_TOKEN);
  requests.push(JSON.parse(opt.body));return new Response('{"ok":true}',{status});
 }});
 status=409;assert.equal((await hold()).ok,false);
 status=200;const h=await hold();assert.equal(h.ok,true);
 assert.equal(await h.close(),true);assert.equal(await h.close(),true);
 assert.equal(requests.length,3);assert.equal(requests[1].holdId,requests[2].holdId);
});
test('an unacknowledged enter is abandoned with the same id and never grants access',async()=>{
 const env={BLOFY_RELAY_INGRESS_HOLDS:'1',BLOFY_STREAM_RELAY_SHARED_TOKEN:'x'.repeat(40)};
 const requests=[];
 const hold=createRelayIngressHold({env,sleep:async()=>{},fetchImpl:async(url,opt)=>{
  const operation=JSON.parse(opt.body);requests.push(operation);
  if(operation.operation==='enter'||requests.length===2)throw Error('response lost');
  return new Response('{"ok":true}');
 }});
 const denied=await hold();
 assert.equal(denied.ok,false);
 assert.equal(await denied.cleanup,true);
 assert.deepEqual(requests.map(x=>x.operation),['enter','abandon','abandon']);
 assert.equal(new Set(requests.map(x=>x.holdId)).size,1);
});
test('a lost close response retries the same hold and concurrent close calls share the attempt',async()=>{
 const env={BLOFY_RELAY_INGRESS_HOLDS:'1',BLOFY_STREAM_RELAY_SHARED_TOKEN:'x'.repeat(40)};
 const requests=[];
 const acquire=createRelayIngressHold({env,sleep:async()=>{},fetchImpl:async(url,opt)=>{
  requests.push(JSON.parse(opt.body));
  if(requests.length===2)throw Error('close response lost');
  return new Response('{"ok":true}');
 }});
 const hold=await acquire();
 assert.equal(hold.ok,true);
 assert.deepEqual(await Promise.all([hold.close(),hold.close()]),[true,true]);
 assert.equal(await hold.close(),true);
 assert.deepEqual(requests.map(x=>x.operation),['enter','close','close']);
 assert.equal(new Set(requests.map(x=>x.holdId)).size,1);
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
test('relay shutdown waits for acknowledgement after retiring the feed',async()=>{
 const token='x'.repeat(40);
 let closeStarted=false,finishClose;
 const closeAck=new Promise(resolve=>{finishClose=resolve;});
 const relay=createRelayBroker({sharedToken:token,sharedLiveEnabled:true,
  lookup:async()=>[{address:'8.8.8.8',family:4}],allowIngress:async()=>true,
  acquireIngressHold:async()=>({ok:true,close(){closeStarted=true;return closeAck;}}),
  fetchImpl:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(packet));}}),
   {headers:{'content-type':'video/mp2t'}})
 });
 const srv=http.createServer((req,res)=>void (req.method==='POST'?relay.issue(req,res):relay.relay(req,res)));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 try{
  const url='http://127.0.0.1:'+srv.address().port;
  const issued=await fetch(url+'/issue',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
   body:JSON.stringify({sourceUrl:source,kind:'live',sharedLive:true,
    licensedSourceId:'11111111-1111-4111-8111-111111111111',providerMaxConcurrentFeeds:1})});
  assert.equal(issued.status,201);
  const response=await fetch(url+(await issued.json()).path);
  assert.equal(response.status,200);
  let completed=false;
  const drain=relay.drain().then(result=>{completed=true;return result;});
  await wait(()=>closeStarted);
  assert.equal(relay.stats().pendingIngressHolds,1);
  assert.equal(completed,false);
  finishClose(true);
  assert.deepEqual(await drain,{unconfirmedIngressReleases:0});
  assert.equal(relay.stats().pendingIngressHolds,0);
  await response.arrayBuffer();
 }finally{
  finishClose(false);srv.closeAllConnections();await new Promise(r=>srv.close(r));
 }
});

test('engine ownership uses distinct admission token for enter and close, never falls back',async()=>{
 const env={BLOFY_RELAY_INGRESS_HOLDS:'1',BLOFY_RELAY_ENGINE_OWNERSHIP:'1',
  BLOFY_STREAM_RELAY_SHARED_TOKEN:'s'.repeat(40),BLOFY_RELAY_ENGINE_HOLD_TOKEN:'h'.repeat(40)};
 const calls=[];
 const fetchImpl=async(url,opt)=>{calls.push({auth:opt.headers.authorization,operation:JSON.parse(opt.body).operation});return new Response('{"ok":true}')};
 for(const patch of [{BLOFY_RELAY_ENGINE_HOLD_TOKEN:''},{BLOFY_RELAY_ENGINE_HOLD_TOKEN:env.BLOFY_STREAM_RELAY_SHARED_TOKEN},{BLOFY_RELAY_INGRESS_HOLDS:'0'}]){
  assert.equal((await createRelayIngressHold({env:{...env,...patch},fetchImpl})()).ok,false);
 }
 assert.equal(calls.length,0);
 const h=await createRelayIngressHold({env,fetchImpl})();assert.equal(h.ok,true);assert.equal(await h.close(),true);
 assert.deepEqual(calls,['enter','close'].map(operation=>({auth:'Bearer '+env.BLOFY_RELAY_ENGINE_HOLD_TOKEN,operation})));
});
