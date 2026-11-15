import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import http from 'node:http';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {streamOperatorOwnerPreview} from '../src/operator-content-hub-preview.mjs';

const RUN='licensed_movie_timeline_001',KEY='K'.repeat(48);
const html=renderOperatorDashboard('owner_nonce');
test('stream /operator renders a whole-timeline window player with explicit limitations',()=>{
 for(const id of ['hub-owner-timeline','hub-timeline-media','hub-timeline-start',
   'hub-timeline-previous','hub-timeline-next','hub-timeline-stop',
   'hub-timeline-player','hub-timeline-seek','hub-timeline-status',
   'hub-timeline-clock'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/hub-timeline-seek[^>]*disabled/);
 assert.match(html,/ليس إثبات مشاهدة كاملة/);
 assert.match(html,/نوافذ الملف/);
 assert.match(html,/siteTimelineDiscardPrefetch/);
 assert.match(html,/URL.revokeObjectURL/);
 assert.match(html,/originalFullFilePlaybackVerified|fullFilePlaybackVerified/);
 assert.doesNotMatch(html,/stream.*customerCutover\s*:\s*true/i);
});
test('signed Portal only accepts static exact-run metadata and strictly indexed clips',async()=>{
 const calls=[];
 const client=createUnifiedPortalClient({secret:KEY,
  fetchImpl:async(url,options)=>{
   calls.push({url:String(url),options});
   if(String(url).endsWith('/meta'))return Response.json({
    ok:true,segmentSeconds:30,segmentCount:4,durationSeconds:91,
    customerCutover:false,fullFilePlaybackVerified:false});
   return new Response(Buffer.alloc(2048),{status:200,headers:{
    'content-type':'video/mp4','content-length':'2048'}});
  }});
 const m=await client.contentHubTimelineMeta({mediaKind:'movie',runId:RUN});
 assert.equal(m.status,200);
 assert.equal(m.body.segmentCount,4);
 await client.contentHubTimelineClipRaw({mediaKind:'movie',runId:RUN,index:3});
 assert.equal(calls.length,2);
 assert.ok(calls[0].url.endsWith('/content-hub/site-qa/timeline/movie/'+RUN+'/meta'));
 assert.ok(calls[1].url.endsWith('/content-hub/site-qa/timeline/movie/'+RUN+'/clip/3.mp4'));
 assert.equal(calls[0].options.headers.authorization,'Bearer '+KEY);
 assert.equal(calls[1].options.headers.authorization,'Bearer '+KEY);
 await assert.rejects(()=>client.contentHubTimelineClipRaw({
  mediaKind:'movie',runId:'../bad',index:1}));
 await assert.rejects(()=>client.contentHubTimelineClipRaw({
  mediaKind:'movie',runId:RUN,index:9999}));
 assert.equal(calls.length,2);
});
async function serve(getUpstream){
 const server=http.createServer((req,res)=>void streamOperatorOwnerPreview({
  req,res,timeoutMs:155000,maxBytes:18*1024*1024,getUpstream}));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 return {url:'http://127.0.0.1:'+server.address().port,
   close:()=>new Promise(resolve=>server.close(resolve))};
}
test('owner site can stream timeline MP4 with private no-store and strict known size',async()=>{
 const b=Buffer.alloc(4096);b.write('ftyp',4,'ascii');
 const s=await serve(async()=>new Response(b,{status:200,headers:{
  'content-type':'video/mp4','content-length':String(b.length)}}));
 try{
  const res=await fetch(s.url);
  assert.equal(res.status,200);
  assert.equal(res.headers.get('cache-control'),'private,no-store');
  assert.equal((await res.arrayBuffer()).byteLength,b.length);
 }finally{await s.close()}
});
test('owner refuses large or spoofed timeline MIME responses',async()=>{
 const s=await serve(async()=>new Response(Buffer.alloc(2048),{status:200,headers:{
  'content-type':'text/html','content-length':'2048'}}));
 try{assert.equal((await fetch(s.url)).status,503)}
 finally{await s.close()}
});
