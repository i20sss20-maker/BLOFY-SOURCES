import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyReadReplicaSynthetic} from '../src/read-replica-synthetic.mjs';
import {createStreamServer} from '../src/server.mjs';
import {once} from 'node:events';
const packets=Buffer.alloc(188*12,0x33);
for(let i=0;i<packets.length;i+=188)packets[i]=0x47;
const playlist='#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:3.000,\nseg1.ts\n';
test('synthetic replica verifies HLS manifest and first TS frames only, not provider video',async()=>{
 const requests=[];
 const report=await verifyReadReplicaSynthetic({fetchImpl:async(url,args)=>{
   requests.push({url:String(url),method:args.method,redirect:args.redirect});
   if(url.pathname.endsWith('index.m3u8'))
     return new Response(playlist,{status:200,headers:{'content-type':'application/vnd.apple.mpegurl'}});
   return new Response(packets,{status:200,headers:{
     'content-type':'video/mp2t','content-length':String(packets.length)}});
 }});
 assert.equal(report.ok,true);
 assert.equal(report.transportVerified,true);
 assert.equal(report.realSalehVerified,false);
 assert.equal(report.customerTrafficChanged,false);
 assert.equal(report.bytesVerified,188*4);
 assert.equal(report.requests,2);
 assert.ok(requests.every(x=>x.url.startsWith(
   'http://blofy-stream-read-replica.railway.internal:8888/smoke/')));
 assert.ok(requests.every(x=>x.method==='GET'&&x.redirect==='manual'));
});
test('malicious HLS segment cannot escape isolated synthetic path',async()=>{
 const requests=[];
 const report=await verifyReadReplicaSynthetic({fetchImpl:async(url)=>{
   requests.push(String(url));
   return new Response('#EXTM3U\n#EXTINF:2.0,\nhttps://evil.example/live/credentials.ts',
     {status:200});
 }});
 assert.equal(report.ok,false);
 assert.equal(report.code,'replica_invalid_segment');
 assert.equal(requests.length,1);
});
test('missing replica media does not claim channel or code readiness',async()=>{
 const report=await verifyReadReplicaSynthetic({fetchImpl:async()=>
   new Response('not found',{status:404}),wait:async()=>{}});
 assert.equal(report.ok,false);
 assert.equal(report.code,'replica_path_not_ready');
 assert.equal(report.realSalehVerified,false);
 assert.equal(report.audioVideoDecoded,false);
 assert.equal(report.customerTrafficChanged,false);
});

test('synthetic probe requires operator credentials and action, never accepts source input',async()=>{
 const key='operator-read-replica-test-password-very-long-2026';
 const {app}=createStreamServer({adminToken:key});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 const url='http://127.0.0.1:'+app.address().port+
   '/operator/api/read-replica/synthetic-probe';
 const auth='Basic '+Buffer.from('operator:'+key).toString('base64');
 try{
  const unauth=await fetch(url,{method:'POST',headers:{
   'content-type':'application/json','x-blofy-operator-action':'replica-synthetic-probe'},
   body:'{}'});
  assert.equal(unauth.status,401);
  const noAction=await fetch(url,{method:'POST',headers:{
   authorization:auth,'content-type':'application/json'},body:'{}'});
  assert.equal(noAction.status,403);
  const arbitrary=await fetch(url,{method:'POST',headers:{
   authorization:auth,'content-type':'application/json',
   'x-blofy-operator-action':'replica-synthetic-probe'},
   body:JSON.stringify({sourceUrl:'https://untrusted.example/live.ts'})});
  assert.equal(arbitrary.status,400);
  assert.equal((await arbitrary.json()).code,'replica_probe_no_inputs');
 }finally{await new Promise(resolve=>app.close(resolve))}
});

test('on-demand replica HLS startup can recover from transient 500 without a provider GET',async()=>{
 let hits=0;
 const report=await verifyReadReplicaSynthetic({wait:async()=>{},
  fetchImpl:async(url)=>{
   hits++;
   if(url.pathname.endsWith('.m3u8')&&hits<4)
     return new Response('muxer warming',{status:500});
   if(url.pathname.endsWith('.m3u8'))
     return new Response(playlist,{status:200});
   return new Response(packets,{status:200});
  }});
 assert.equal(report.ok,true);
 assert.equal(report.realSalehVerified,false);
 assert.equal(report.transportVerified,true);
 assert.equal(hits,5);
});

test('synthetic verifier follows MediaMTX master and private session-scoped variant',async()=>{
 const seen=[];
 const master='#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1800000\nstream.m3u8?session=abcd\n';
 const variant='#EXTM3U\n#EXTINF:2.0,\nseg2.ts?session=abcd\n';
 const reply=await verifyReadReplicaSynthetic({fetchImpl:async url=>{
   seen.push(url.pathname+url.search);
   if(url.pathname.endsWith('/index.m3u8'))return new Response(master,{status:200});
   if(url.pathname.endsWith('/stream.m3u8'))return new Response(variant,{status:200});
   return new Response(packets,{status:200});
 }});
 assert.equal(reply.ok,true,JSON.stringify(reply));
 assert.equal(reply.deliveryMode,'private_hls_read_through');
 assert.equal(reply.requestCount,undefined);
 assert.deepEqual(seen,['/smoke/index.m3u8',
  '/smoke/stream.m3u8?session=abcd',
  '/smoke/seg2.ts?session=abcd']);
});
test('synthetic verifier blocks child playlist from another host',async()=>{
 const reply=await verifyReadReplicaSynthetic({fetchImpl:async()=>new Response(
  '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nhttps://outside.example/bad.m3u8\n',
  {status:200})});
 assert.equal(reply.ok,false);
 assert.equal(reply.code,'replica_invalid_segment');
 assert.equal(reply.realSalehVerified,false);
});
