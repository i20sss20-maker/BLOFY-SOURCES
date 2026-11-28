import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createXtreamCatalogRelay,createXtreamManifestRelay} from '../src/xtream-catalog-relay.mjs';
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

test('protected manifest relay streams only the official M3U over independent HTTP/1.1 egress',async()=>{
 let calls=0;
 await fixture((req,res)=>{
  calls++;const url=new URL(req.url,'http://localhost');
  assert.equal(req.method,'GET');
  assert.equal(url.pathname,'/get.php');
  assert.equal(url.searchParams.get('type'),'m3u_plus');
  assert.equal(url.searchParams.get('output'),'ts');
  res.writeHead(200,{'content-type':'audio/x-mpegurl'});
  res.end('#EXTM3U\n#EXTINF:-1,Film\nhttp://redacted.example/movie/u/p/10.mp4');
 },async sourceOrigin=>{
  const broker=createXtreamManifestRelay({sharedToken:secret,
    allowedOrigin:sourceOrigin,validate:async u=>new URL(u)});
  await fixture((req,res)=>broker.handle(req,res),async gateway=>{
   const sourceUrl=sourceOrigin+'/get.php?username=u&password=p&type=m3u_plus&output=ts';
   const response=await fetch(gateway,{method:'POST',
    headers:{authorization:'Bearer '+secret,'content-type':'application/json'},
    body:JSON.stringify({sourceUrl})});
   assert.equal(response.status,200);
   assert.match(response.headers.get('content-type'),/audio\/x-mpegurl/);
   assert.match(await response.text(),/^#EXTM3U/);
   assert.equal(calls,1);
   // The catalog JSON endpoint retains its narrow player_api.php policy.
   const catalog=createXtreamCatalogRelay({sharedToken:secret,
     allowedOrigin:sourceOrigin,validate:async u=>new URL(u)});
   await fixture((req,res)=>catalog.handle(req,res),async normalGateway=>{
    const rejected=await fetch(normalGateway,{method:'POST',
     headers:{authorization:'Bearer '+secret,'content-type':'application/json'},
     body:JSON.stringify({sourceUrl})});
    assert.equal(rejected.status,400);
   });
   assert.equal(calls,1);
  });
 });
});
test('manifest relay does not allow arbitrary query, destinations or unauthenticated access',async()=>{
 let calls=0;
 await fixture((_req,res)=>{calls++;res.end('should-not-fetch');},async sourceOrigin=>{
  const broker=createXtreamManifestRelay({sharedToken:secret,
   allowedOrigin:sourceOrigin,validate:async u=>new URL(u)});
  await fixture((req,res)=>broker.handle(req,res),async gateway=>{
   const sourceUrl=sourceOrigin+'/get.php?username=u&password=p&type=m3u_plus&output=ts';
   const send=async(u,bearer=true)=>fetch(gateway,{method:'POST',
    headers:{...(bearer?{authorization:'Bearer '+secret}:{}),
      'content-type':'application/json'},body:JSON.stringify({sourceUrl:u})});
   assert.equal((await send(sourceUrl,false)).status,401);
   assert.equal((await send(sourceUrl+'&action=delete')).status,400);
   assert.equal((await send(sourceUrl.replace('output=ts','output=m3u8'))).status,400);
   assert.equal((await send(sourceUrl.replace('/get.php','/movie/u/p/2.mp4'))).status,400);
   assert.equal((await send('https://other.example/get.php?username=u&password=p&type=m3u_plus&output=ts')).status,400);
   assert.equal(calls,0);
  });
 });
});

test('get_vod_info is authorized for one safe ID and does not expose raw secrets in errors',async()=>{
 let sourceCalls=0;
 await fixture((req,res)=>{
  sourceCalls++;
  const u=new URL(req.url,'http://localhost');
  assert.equal(u.pathname,'/player_api.php');
  assert.equal(u.searchParams.get('action'),'get_vod_info');
  assert.equal(u.searchParams.get('vod_id'),'1234');
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({movie_data:{stream_id:1234,
    container_extension:'mkv',direct_source:'https://cdn.example/signed?token=TOPSECRET'}}));
 },async sourceOrigin=>{
  const relay=createXtreamCatalogRelay({sharedToken:secret,allowedOrigin:sourceOrigin,
   validate:async x=>new URL(x)});
  await fixture((req,res)=>relay.handle(req,res),async endpoint=>{
   const start=sourceOrigin+'/player_api.php?username=u&password=p&action=get_vod_info&vod_id=1234';
   const send=async url=>fetch(endpoint,{method:'POST',
    headers:{authorization:'Bearer '+secret,'content-type':'application/json'},
    body:JSON.stringify({sourceUrl:url})});
   const ok=await send(start);
   assert.equal(ok.status,200);
   const data=await ok.json();
   assert.equal(data.movie_data.stream_id,1234);
   assert.equal(sourceCalls,1);
   for(const unsafe of [start.replace('vod_id=1234','vod_id=../../bad'),
     start.replace('vod_id=1234','vod_id='),
     start+'&action=delete',start+'&extra=yes']){
    const response=await send(unsafe);
    assert.equal(response.status,400);
    const body=await response.text();
    assert.doesNotMatch(body,/TOPSECRET|cdn.example|password=p/);
   }
   assert.equal(sourceCalls,1);
  });
 });
});

test('disconnect during source validation opens no upstream and frees the catalog slot',async()=>{
 let calls=0,validations=0,release,entered,done,serverClosed;
 const paused=new Promise(resolve=>release=resolve);
 const validationEntered=new Promise(resolve=>entered=resolve);
 const firstDone=new Promise(resolve=>done=resolve);
 const downstreamClosed=new Promise(resolve=>serverClosed=resolve);
 await fixture((_req,res)=>{calls++;res.end('[]');},async origin=>{
  const relay=createXtreamCatalogRelay({sharedToken:secret,allowedOrigin:origin,maxConcurrent:1,
   validate:async u=>{if(++validations===1){entered();await paused;}return new URL(u);}});
  let requests=0;
  await fixture((req,res)=>{
   const n=++requests;
   const handled=relay.handle(req,res);
   if(n===1){res.once('close',serverClosed);void handled.then(done);}
  },async gateway=>{
   const body=JSON.stringify({sourceUrl:origin+'/player_api.php?username=u&password=p'});
   const headers={authorization:'Bearer '+secret,'content-type':'application/json'};
   const client=http.request(gateway,{method:'POST',headers});
   client.on('error',()=>{});
   client.end(body);
   await validationEntered;
   // ECONNRESET is expected when we deliberately destroy the client.
   // Await the server's close event, not events.once(client,'close'),
   // which rejects on that expected error.
   client.destroy();
   await downstreamClosed;
   release();
   await Promise.race([firstDone,new Promise((_,reject)=>{
    const timer=setTimeout(()=>reject(new Error('catalog slot leaked')),1500);
    timer.unref();
   })]);
   assert.equal(calls,0);
   const response=await fetch(gateway,{method:'POST',headers,body,signal:AbortSignal.timeout(2000)});
   assert.equal(response.status,200);
   assert.deepEqual(await response.json(),[]);
   assert.equal(calls,1);
  });
 });
});

test('maintenance account-only relay rejects all catalog, media and extra query requests',async()=>{
 let calls=0;
 await fixture((req,res)=>{
   calls++;
   assert.deepEqual([...new URL(req.url,'http://localhost').searchParams.keys()].sort(),['password','username']);
   res.end(JSON.stringify({user_info:{auth:1,active_cons:'0',max_connections:'1'}}));
 },async origin=>{
   const relay=createXtreamCatalogRelay({sharedToken:secret,allowedOrigin:origin,accountOnly:true,validate:async x=>new URL(x)});
   await fixture((req,res)=>relay.handle(req,res),async gateway=>{
     const url=origin+'/player_api.php?username=u&password=p';
     const send=(sourceUrl,auth=true)=>fetch(gateway,{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+secret}:{})},body:JSON.stringify({sourceUrl})});
     assert.equal((await send(url,false)).status,401);
     for(const bad of [url+'&action=get_live_streams',url+'&action=',url+'&username=second',url+'&extra=1',url.replace('player_api.php','get.php')]){
       assert.equal((await send(bad)).status,400);
     }
     assert.equal(calls,0);
     const r=await send(url);assert.equal(r.status,200);
     assert.equal((await r.json()).user_info.active_cons,'0');
     assert.equal(calls,1);
   });
 });
});
