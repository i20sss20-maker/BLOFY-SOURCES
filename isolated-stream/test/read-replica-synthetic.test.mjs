import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyReadReplicaSynthetic} from '../src/read-replica-synthetic.mjs';
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
   new Response('not found',{status:404})});
 assert.equal(report.ok,false);
 assert.equal(report.code,'replica_path_not_ready');
 assert.equal(report.realSalehVerified,false);
 assert.equal(report.audioVideoDecoded,false);
 assert.equal(report.customerTrafficChanged,false);
});
