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

const providerQuery=query+'&provider=8k';
const providerConfig={enabled:true,providerOrigin:'https://provider.example.com',
 providerUsername:'pilot-user',validateProvider:async url=>new URL(url)};
test('explicit provider manifest uses only pinned origin, validates prefix and retains official media routes',async()=>{
 const fixture='#EXTM3U\n#EXTINF:-1,Test\nhttps://provider.example.com/live/pilot-user/pilot-secret/1.ts\n';
 const calls=[];
 await withPilot({...providerConfig,fetchImpl:async(url,options)=>{
  calls.push(url.origin);assert.equal(options.redirect,'manual');
  assert.equal(url.searchParams.get('username'),'pilot-user');
  return new Response(fixture,{headers:{'content-type':'application/octet-stream'}});
 }},async call=>{
  assert.equal((await call(providerQuery.replace('pilot-user','other-user'))).status,401);
  assert.equal((await call(providerQuery+'&provider=8k')).status,400);
  assert.equal(calls.length,0);
  const r=await call(providerQuery+'&host=https://evil.invalid');
  assert.equal(r.status,200);assert.equal(r.body,fixture);
  assert.deepEqual(calls,['https://provider.example.com']);
  assert.equal((await call(providerQuery)).status,429);
 });
});
test('provider selection fails closed without configured HTTPS origin and never falls back',async()=>{
 for(const origin of ['', 'http://provider.example.com','https://engine.blofyplayer.com']){
  await withPilot({...providerConfig,providerOrigin:origin,fetchImpl:async()=>{throw Error('unexpected')}},async call=>{
   assert.equal((await call(providerQuery)).status,503);
  });
 }
});
test('local credentials are never forwarded to provider after gateway rejects them',async()=>{
 const calls=[];
 await withPilot({...providerConfig,fetchImpl:async url=>{calls.push(url.origin);return new Response('no',{status:401});}},async call=>{
  assert.equal((await call(query)).status,401);
  assert.deepEqual(calls,['https://blofy-activation-portal-production.up.railway.app']);
 });
});
test('provider error document and redirect rejected before delivering manifest',async()=>{
 for(const [status,expected] of [[200,401],[302,502]]){
  await withPilot({...providerConfig,fetchImpl:async()=>new Response('private provider error',{status,
   headers:{'content-type':'text/plain','location':'https://evil.invalid'}})},async call=>{
   const r=await call(providerQuery);assert.equal(r.status,expected);assert.equal(r.headers.location,undefined);
   assert.doesNotMatch(r.body,/private provider error/);
  });
 }
});
