import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createXtreamCatalogRelay} from '../src/xtream-catalog-relay.mjs';
const secret='a'.repeat(48);
async function fixture(listener,fn){
 const server=http.createServer(listener);
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 const url='http://127.0.0.1:'+server.address().port;
 try{return await fn(url)}finally{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
}
test('catalog is securely streamed to control plane without exposing source credentials',async()=>{
 let sourceCalls=0;
 await fixture((req,res)=>{
  sourceCalls++;
  const url=new URL(req.url,'http://localhost');
  assert.equal(url.pathname,'/player_api.php');
  assert.equal(url.searchParams.get('action'),'get_live_categories');
  assert.equal(url.searchParams.get('username'),'alice');
  assert.equal(url.searchParams.get('password'),'secret');
  assert.equal(req.headers['connection'],'close');
  res.writeHead(200,{'content-type':'application/json'});
  res.write('[{"category_id":"1","category_name":"News"}');
  setTimeout(()=>res.end(']'),10);
 },async sourceOrigin=>{
  const broker=createXtreamCatalogRelay({sharedToken:secret,allowedOrigin:sourceOrigin,
    validate:async url=>new URL(url)});
  await fixture((req,res)=>broker.handle(req,res),async gatewayOrigin=>{
   const sourceUrl=sourceOrigin+'/player_api.php?username=alice&password=secret&action=get_live_categories';
   const received=await fetch(gatewayOrigin,{method:'POST',
    headers:{authorization:'Bearer '+secret,'content-type':'application/json'},
    body:JSON.stringify({sourceUrl})});
   assert.equal(received.status,200);
   assert.deepEqual(await received.json(),[{category_id:'1',category_name:'News'}]);
   assert.equal(received.headers.get('cache-control'),'no-store');
   assert.equal(sourceCalls,1);
  });
 });
});
test('no arbitrary origin or action and missing bearer rejected before egress',async()=>{
 let calls=0;
 await fixture((_req,res)=>{calls++;res.end('never');},async origin=>{
  const broker=createXtreamCatalogRelay({sharedToken:secret,allowedOrigin:origin,
   validate:async url=>new URL(url)});
  await fixture((req,res)=>broker.handle(req,res),async base=>{
   const sourceUrl=origin+'/player_api.php?username=alice&password=secret&action=get_live_categories';
   const denied=await fetch(base,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({sourceUrl})});
   assert.equal(denied.status,401);
   const badAction=await fetch(base,{method:'POST',headers:{
     authorization:'Bearer '+secret,'content-type':'application/json'
   },body:JSON.stringify({sourceUrl:sourceUrl.replace('get_live_categories','delete_subscriber')})});
   assert.equal(badAction.status,400);
   const privatePath=await fetch(base,{method:'POST',headers:{
     authorization:'Bearer '+secret,'content-type':'application/json'
   },body:JSON.stringify({sourceUrl:sourceUrl.replace('player_api.php','../../etc/passwd')})});
   assert.equal(privatePath.status,400);
   assert.equal(calls,0);
  });
 });
});
test('upstream redirects are refused without forwarding secret credentials',async()=>{
 let calls=0;
 await fixture((_req,res)=>{
  calls++;res.writeHead(302,{location:'https://external.example/collect'});res.end();
 },async origin=>{
  const broker=createXtreamCatalogRelay({sharedToken:secret,allowedOrigin:origin,
   validate:async url=>new URL(url)});
  await fixture((req,res)=>broker.handle(req,res),async base=>{
   const res=await fetch(base,{method:'POST',headers:{
    authorization:'Bearer '+secret,'content-type':'application/json'
   },body:JSON.stringify({sourceUrl:origin+'/player_api.php?username=user&password=private'})});
   assert.equal(res.status,302);
   const body=await res.text();
   assert.doesNotMatch(body,/external.example|private/);
   assert.equal(calls,1);
  });
 });
});
