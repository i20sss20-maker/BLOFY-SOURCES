import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {streamOperatorOwnerPreview} from '../src/operator-content-hub-preview.mjs';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const RUN='stored_movie_00000001',SECRET='K'.repeat(45);
async function serve(getUpstream,seekPosition='middle'){
 const srv=http.createServer((req,res)=>void streamOperatorOwnerPreview({
  req,res,getUpstream,seekPosition,timeoutMs:110000}));
 srv.listen(0,'127.0.0.1');await once(srv,'listening');
 return {url:'http://127.0.0.1:'+srv.address().port,
  close:()=>new Promise(resolve=>srv.close(resolve))};
}
function clip(position='middle'){
 const bytes=Buffer.alloc(4000);bytes.write('ftyp',4,'ascii');
 return new Response(bytes,{status:200,headers:{
  'content-type':'video/mp4','content-length':String(bytes.length),
  'x-blofy-clip-position':position,'x-blofy-clip-start-seconds':'842',
  'x-blofy-clip-source':'verified-private-s3'}});
}
test('operator accepts private S3 proof and streams short MP4, never changes customer routes',async()=>{
 const s=await serve(async()=>clip());
 try{
  const response=await fetch(s.url);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'video/mp4');
  assert.equal(response.headers.get('cache-control'),'private,no-store');
  assert.equal(response.headers.get('x-blofy-clip-position'),'middle');
  assert.equal(response.headers.get('x-blofy-clip-start-seconds'),'842');
  assert.equal((await response.arrayBuffer()).byteLength,4000);
 }finally{await s.close()}
});
test('operator refuses fake/incorrect seek position proof and queries',async()=>{
 const s=await serve(async()=>clip('near_end'),'middle');
 try{
  const r=await fetch(s.url);assert.equal(r.status,503);
  assert.equal((await r.json()).code,'owner_seek_private_proof_invalid');
  const q=await fetch(s.url+'?evil=1');assert.equal(q.status,400);
 }finally{await s.close()}
});
test('Portal client accepts only fixed mediaKind, runId and seek position',async()=>{
 const seen=[];
 const client=createUnifiedPortalClient({
  secret:SECRET,fetchImpl:async(url,options)=>{
   seen.push({url:String(url),options});return clip();
  }});
 await client.contentHubSeekPreviewRaw({
  mediaKind:'movie',runId:RUN,position:'middle'});
 assert.equal(seen.length,1);
 assert.ok(seen[0].url.endsWith(
  '/content-hub/site-qa/seek-preview/movie/'+RUN+'/middle'));
 assert.equal(seen[0].options.headers.authorization,'Bearer '+SECRET);
 await assert.rejects(()=>client.contentHubSeekPreviewRaw({
  mediaKind:'episode',runId:'../bad',position:'middle'}));
 await assert.rejects(()=>client.contentHubSeekPreviewRaw({
  mediaKind:'movie',runId:RUN,position:'random_position'}));
 assert.equal(seen.length,1);
});
test('website owner has separate MKV middle/end sample panel and honest playback warning',()=>{
 const html=renderOperatorDashboard('nonce_test');
 for(const id of ['hub-private-seek-sample','hub-seek-media',
  'hub-seek-position','hub-seek-preview-play','hub-seek-preview-player',
  'hub-seek-preview-status'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/site-qa\/seek-preview/);
 assert.match(html,/10 ثوانٍ/);
 assert.match(html,/لا يُعتبر هذا تشغيلًا كاملًا/);
});
