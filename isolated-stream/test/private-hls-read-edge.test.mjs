import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createPrivateHlsEdge} from '../read-replica/index.mjs';

const LIVE='live-abcdef012345';
const stream=Buffer.alloc(188*3,0x33);
for(let i=0;i<stream.length;i+=188)stream[i]=0x47;
const token='this-is-a-strong-private-blofy-hls-edge-secret-2026';

async function withEdge(options,fn){
 const edge=createPrivateHlsEdge(options);
 edge.server.listen(0,'127.0.0.1');await once(edge.server,'listening');
 try{await fn('http://127.0.0.1:'+edge.server.address().port,edge)}
 finally{edge.server.closeAllConnections();
   await new Promise(resolve=>edge.server.close(resolve))}
}
test('private HLS edge forwards origin cookie redirects and exact media bytes',async()=>{
 const requests=[];
 await withEdge({accessToken:token,fetchImpl:async(url,opts)=>{
   requests.push({path:url.pathname,query:url.search,cookie:opts.headers.cookie||''});
   if(url.pathname==='/smoke/index.m3u8'&&!url.search)
     return new Response(null,{status:307,headers:{
       location:'/smoke/index.m3u8?cookieCheck=1','set-cookie':'sid=ready; Path=/'}});
   if(url.pathname==='/smoke/index.m3u8')
     return new Response('#EXTM3U\n#EXTINF:2.0,\nseg1.ts\n',{
       status:200,headers:{'content-type':'application/vnd.apple.mpegurl'}});
   return new Response(stream,{status:200,headers:{'content-type':'video/mp2t'}});
 }},async(base,edge)=>{
   const first=await fetch(base+'/smoke/index.m3u8',{redirect:'manual'});
   assert.equal(first.status,307);
   assert.equal(first.headers.get('location'),'/smoke/index.m3u8?cookieCheck=1');
   assert.match(first.headers.get('set-cookie')||'',/^sid=ready;/,
     'HLS cookie negotiation must survive the read-through redirect');
   const second=await fetch(base+first.headers.get('location'),{
     headers:{cookie:'sid=ready'}});
   assert.equal(second.status,200);
   assert.match(await second.text(),/#EXTM3U/);
   const ts=await fetch(base+'/smoke/seg1.ts');
   assert.equal(ts.status,200);
   assert.deepEqual(Buffer.from(await ts.arrayBuffer()),stream);
   assert.equal(requests.length,3);
   assert.equal(requests[1].cookie,'sid=ready');
   assert.equal(edge.stats().providerConnectionsOpened,0);
   assert.equal(edge.stats().subscriberCutover,false);
   assert.equal(edge.stats().activeRequests,0);
 });
});
test('public or unlicensed live requests can never reach fixed Origin',async()=>{
 let upstreamHits=0;
 await withEdge({accessToken:token,fetchImpl:async()=>{
   upstreamHits++;return new Response(stream,{status:200})
 }},async(base)=>{
   const rejects=[
     '/any/index.m3u8','/smoke/%2e%2e/admin',
     '/smoke/../other/index.m3u8','/smoke/index.m3u8?sourceUrl=https://evil',
     '/smoke/index.m3u8?token=secret','/'+LIVE+'/../other.ts'
   ];
   for(const path of rejects){
     const reply=await fetch(base+path,{redirect:'manual'});
     assert.equal(reply.status,404,path);
   }
   const forbidden=await fetch(base+'/'+LIVE+'/index.m3u8');
   assert.equal(forbidden.status,401);
   const denied=await fetch(base+'/'+LIVE+'/index.m3u8',{headers:{
     authorization:'Bearer '+'invalid-token'.repeat(6)}});
   assert.equal(denied.status,401);
   assert.equal(upstreamHits,0);
   const allowed=await fetch(base+'/'+LIVE+'/seg1.ts',{
     headers:{authorization:'Bearer '+token}});
   assert.equal(allowed.status,200);
   assert.equal(upstreamHits,1);
   const health=await fetch(base+'/health');
   const info=await health.json();
   assert.equal(info.ok,true);
   assert.equal(info.providerConnectionsOpened,0);
 });
});
test('private edge rejects redirects to non-origin hosts and live-to-smoke confusion',async()=>{
 await withEdge({accessToken:token,fetchImpl:async()=>new Response(null,{
   status:307,headers:{location:'https://external.example/steal'}
 })},async(base)=>{
   const reply=await fetch(base+'/smoke/index.m3u8',{redirect:'manual'});
   assert.equal(reply.status,502);
   assert.equal((await reply.json()).code,'edge_redirect_denied');
 });
 await withEdge({accessToken:token,fetchImpl:async()=>new Response(null,{
   status:307,headers:{location:'/smoke/index.m3u8?cookieCheck=1'}
 })},async(base)=>{
   const reply=await fetch(base+'/'+LIVE+'/index.m3u8',{redirect:'manual',
     headers:{authorization:'Bearer '+token}});
   assert.equal(reply.status,502);
 });
});
test('edge origin and concurrency guards fail closed',()=>{
 assert.throws(()=>createPrivateHlsEdge({origin:'https://outside.example'}),/edge_origin_forbidden/);
 assert.throws(()=>createPrivateHlsEdge({maxConcurrent:0}),/edge_invalid_limits/);
 assert.throws(()=>createPrivateHlsEdge({timeoutMs:60001}),/edge_invalid_limits/);
});
