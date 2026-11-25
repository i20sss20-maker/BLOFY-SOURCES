import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createEngineM3uPilot} from '../src/engine-m3u-pilot.mjs';

async function withPilot(options,run){
 const pilot=createEngineM3uPilot(options);
 const server=http.createServer((req,res)=>{if(!pilot.handle(req,res)){res.writeHead(404);res.end('original route')}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address='http://127.0.0.1:'+server.address().port;
 const call=(path,host='engine.blofyplayer.com',method='GET')=>new Promise((resolve,reject)=>{
   const req=http.request(address+path,{method,headers:{host,'x-forwarded-proto':'https'}},res=>{
    let body='';res.setEncoding('utf8');res.on('data',s=>body+=s);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
   });req.on('error',reject);req.end();
 });
 try{await run(call)}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
const query='/get.php?username=pilot-user&password=pilot-secret&type=m3u_plus&output=ts';
test('authorized M3U stays on existing catalog and media routes, no external provider calls',async()=>{
 let calls=0;
 const fixture='#EXTM3U\n#EXTINF:-1,Test\nhttps://x.blofyplayer.com/live/pilot-user/pilot-secret/1.ts\n';
 await withPilot({enabled:true,fetchImpl:async(url,opts)=>{
  calls++;assert.equal(url.origin,'https://blofy-activation-portal-production.up.railway.app');
  assert.equal(url.pathname,'/get.php');assert.equal(url.searchParams.get('username'),'pilot-user');
  assert.equal(url.searchParams.get('password'),'pilot-secret');assert.equal(opts.redirect,'manual');
  return new Response(fixture,{headers:{'content-type':'audio/x-mpegurl; charset=utf-8'}});
 }},async call=>{
  const r=await call(query+'&host=https://evil.invalid');assert.equal(r.status,200);assert.equal(r.body,fixture);
  assert.match(r.headers['cache-control'],/no-store/);assert.equal(calls,1);
  assert.equal((await call(query,'connect.blofyplayer.com')).status,404);
  assert.equal((await call('/get.php?username=x&username=y&password=z')).status,400);
  assert.equal((await call(query,undefined,'POST')).status,405);assert.equal(calls,1);
 });
});
test('disabled pilot never requests gateway',async()=>{
 await withPilot({fetchImpl:async()=>{throw Error('unexpected')}},async call=>assert.equal((await call(query)).status,503));
});
test('denials and redirects are not forwarded with credentials or location',async()=>{
 for(const status of [401,429,302,200]){
  await withPilot({enabled:true,fetchImpl:async()=>new Response('private upstream body',{
   status,headers:{'content-type':'text/html','location':'https://evil.invalid/'}
  })},async call=>{
   const r=await call(query);
   assert.equal(r.status,status===401||status===429?status:502);
   assert.equal(r.headers.location,undefined);assert.doesNotMatch(r.body,/private upstream body/);
  });
 }
});
