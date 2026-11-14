import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import http from 'node:http';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';

const secret='operator-owner-verified-preview-secret-long';
const bridge='private-stream-portal-bridge-secret-longer-than-forty-characters';
const auth='Basic '+Buffer.from('operator:'+secret).toString('base64');
async function withServer(options,cb){
 const operator=createOperatorDashboard({
  adminToken:secret,unifiedSecret:bridge,
  engineOrigin:'http://blofy-stream-media.railway.internal:8888',
  ...options});
 const app=http.createServer((req,res)=>{
  if(!operator.handle(req,res)){res.writeHead(404);res.end()}
 });
 app.listen(0,'127.0.0.1');
 await once(app,'listening');
 try{return await cb('http://127.0.0.1:'+app.address().port)}
 finally{await new Promise(resolve=>app.close(resolve))}
}
test('owner video preview cannot bypass the STREAM operator Basic auth',async()=>{
 let requested=0;
 await withServer({adminToken:secret,unifiedSecret:bridge,fetchImpl:async()=>{
  requested++;return new Response(Buffer.alloc(2200),{status:200,
   headers:{'content-type':'video/mp4','content-length':'2200'}})
 }},async base=>{
  const url=base+'/operator/api/content-hub/preview';
  assert.equal((await fetch(url)).status,401);
  assert.equal((await fetch(url,{headers:{authorization:'Basic '+
   Buffer.from('operator:wrong').toString('base64')}})).status,401);
  assert.equal(requested,0);
  assert.equal((await fetch(url+'?unsafe=1',{headers:{authorization:auth}})).status,400);
  assert.equal(requested,0);
  assert.equal((await fetch(url,{method:'POST',headers:{authorization:auth}})).status,405);
  assert.equal(requested,0);
 });
});
test('owner video preview streams a bounded same-origin MP4 without tokens or public links',async()=>{
 const mp4=Buffer.concat([
  Buffer.from([0,0,0,24]),Buffer.from('ftyp'),Buffer.alloc(4096,88)
 ]);
 const calls=[];
 await withServer({adminToken:secret,unifiedSecret:bridge,
  fetchImpl:async(url,opts)=>{
   calls.push({url:String(url),opts});
   if(String(url).includes('/content-hub/preview'))
    return new Response(mp4,{status:200,headers:{
     'content-type':'video/mp4',
     'content-length':String(mp4.length)
    }});
   return new Response('',{status:404});
  }
 },async base=>{
  const response=await fetch(base+'/operator/api/content-hub/preview',{
   headers:{authorization:auth}});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('content-type'),'video/mp4');
  assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');
  assert.equal(response.headers.get('cache-control'),'private,no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),mp4);
  assert.equal(calls.length,1);
  assert.ok(calls[0].url.endsWith('/internal/blofy-stream/content-hub/preview'));
  assert.equal(calls[0].opts.method,'GET');
  assert.equal(calls[0].opts.headers.authorization,'Bearer '+bridge);
  const html=await fetch(base+'/operator',{headers:{authorization:auth}});
  assert.equal(html.status,200);
  assert.match(html.headers.get('content-security-policy'),/media-src 'self'/);
  const page=await html.text();
  assert.match(page,/id="content-hub-preview-player"/);
  assert.match(page,/id="content-hub-owner-preview"/);
  assert.doesNotMatch(page,/blofy-content-hub\.railway\.internal/);
  assert.doesNotMatch(page,/private-stream-portal-bridge-secret/);
 });
});
test('oversized private preview rejected before any browser bytes',async()=>{
 await withServer({adminToken:secret,unifiedSecret:bridge,
  fetchImpl:async()=>new Response(Buffer.alloc(2200),{status:200,
   headers:{'content-type':'video/mp4',
    'content-length':String(13*1024*1024)}})},async base=>{
  const res=await fetch(base+'/operator/api/content-hub/preview',{
   headers:{authorization:auth}});
  assert.equal(res.status,503);
  assert.equal((await res.json()).code,'owner_preview_payload_invalid');
 });
});
