import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import http from 'node:http';
import {streamOperatorOriginalRange} from '../src/operator-original-range.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
const RUN='saleh_movie_1349410_20261114',BYTES=2934023949;
async function serve(getUpstream){
 const server=http.createServer((req,res)=>void streamOperatorOriginalRange({
  req,res,mediaKind:'movie',runId:RUN,getUpstream}));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 return {url:'http://127.0.0.1:'+server.address().port,
  close:()=>new Promise(resolve=>server.close(resolve))};
}
test('real owner original-file GET returns only exact requested 206 bytes, HEAD returns total',async()=>{
 let reqs=0;
 const app=await serve(async({method,range})=>{
  reqs++;
  if(method==='HEAD')return new Response(null,{status:200,
   headers:{'content-type':'video/x-matroska','content-length':String(BYTES)}});
  assert.equal(range,'bytes=16-21');
  return new Response(Buffer.from('BLOFY!'),{status:206,
   headers:{'content-type':'video/x-matroska','content-length':'6',
    'content-range':'bytes 16-21/'+BYTES}});
 });
 try{
  const h=await fetch(app.url,{method:'HEAD'});
  assert.equal(h.status,200);
  assert.equal(h.headers.get('content-length'),String(BYTES));
  const r=await fetch(app.url,{headers:{range:'bytes=16-21'}});
  assert.equal(r.status,206);
  assert.equal(r.headers.get('content-range'),'bytes 16-21/'+BYTES);
  assert.equal(r.headers.get('cache-control'),'private,no-store');
  assert.equal(await r.text(),'BLOFY!');
  assert.equal(reqs,2);
 }finally{await app.close()}
});
test('owner original-file Range relay blocks multi-range and upstream malformed metadata',async()=>{
 let count=0;
 const app=await serve(async()=>{count++;return new Response('ABCD',{status:206,
  headers:{'content-type':'text/html','content-length':'4',
   'content-range':'bytes 0-3/'+BYTES}})});
 try{
  assert.equal((await fetch(app.url,{headers:{range:'bytes=0-1,3-4'}})).status,416);
  assert.equal(count,0);
  assert.equal((await fetch(app.url,{headers:{range:'bytes=0-3'}})).status,503);
 }finally{await app.close()}
});
test('website source exposes QA-only original file controls with honest MKV compatibility warning',()=>{
 const page=renderOperatorDashboard('q_nonce');
 for(const id of ['hub-original-range-panel','hub-original-movie-check',
   'hub-original-episode-check','hub-original-browser-player','hub-original-range-status'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/3 قراءات حقيقية/);
 assert.match(page,/file.type!=="video\/mp4"/);
 assert.match(page,/Range وحده لا يكفي/);
});
test('signed portal client keeps original media path fixed, no custom URL or source secret exposed',async()=>{
 const calls=[];
 const portal=createUnifiedPortalClient({secret:'t'.repeat(48),
  fetchImpl:async(url,options)=>{
   calls.push({url:String(url),options});
   return new Response(null,{status:200,headers:{
    'content-type':'video/mp4','content-length':'2097152'}});
  }});
 await portal.contentHubOriginalRangeRaw({
  mediaKind:'movie',runId:RUN,method:'HEAD'});
 assert.equal(calls.length,1);
 assert.ok(calls[0].url.endsWith('/content-hub/site-qa/files/movie/'+RUN));
 assert.equal(calls[0].options.headers.authorization,'Bearer '+'t'.repeat(48));
 await assert.rejects(()=>portal.contentHubOriginalRangeRaw({
  mediaKind:'movie',runId:'../etc/passwd',method:'GET'}));
 assert.equal(calls.length,1);
});
