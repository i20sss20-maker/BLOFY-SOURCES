import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import http from 'node:http';
import {
  createOfficialM3uDiagnostic,compareOfficialM3uOrigin
} from '../src/xtream-playlist-route-diagnostic.mjs';

const secret='u'.repeat(50);
const validateLocal=async str=>new URL(str); // ONLY local tests, production uses SSRF guard
async function fixture(handler,fn){
 const server=http.createServer(handler);
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 try{return await fn(origin)}finally{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
 }
}
test('compares real advertised M3U media without returning credentials or source hostname',async()=>{
 await fixture((req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/get.php'){
   res.writeHead(200,{'content-type':'audio/x-mpegurl'});
   res.end('#EXTM3U\n#EXTINF:-1,News\nhttp://127.0.0.1:'+u.searchParams.get('port')+'/live/alicename/secret/10.ts\n');
  }else if(u.pathname.startsWith('/live/')){
   const chunk=Buffer.alloc(188*3);
   for(const k of [0,188,376])chunk[k]=0x47;
   res.writeHead(200,{'content-type':'video/mp2t'});
   res.end(chunk);
  }else{res.writeHead(404);res.end();}
 },async origin=>{
  const port=new URL(origin).port;
  const m3u=origin+'/get.php?username=alicename&password=secret&type=m3u_plus&output=ts&port='+port;
  const result=await compareOfficialM3uOrigin(m3u,{allowedOrigin:origin,validate:validateLocal});
  assert.equal(result.ok,true);
  assert.equal(result.playlistMediaUrlsFound,1);
  assert.equal(result.checks[0].format,'mpegts');
  assert.equal(result.checks[0].mediaBytesPresent,true);
  assert.equal(result.anyDifferentMediaOrigin,false);
  assert.equal(result.audioVideoDecoded,false);
  assert.doesNotMatch(JSON.stringify(result),/alicename|secret|127\.0\.0\.1|\/live\//);
 });
});
test('refuses unknown host and denies unauthenticated service calls',async()=>{
 await fixture((req,res)=>res.end('NO_STREAM_REQUEST'),async origin=>{
  const service=createOfficialM3uDiagnostic({
    sharedToken:secret,allowedOrigin:origin,validate:validateLocal});
  await fixture((req,res)=>service.handle(req,res),async gateway=>{
   const url=origin+'/get.php?username=alice&password=secret&type=m3u_plus&output=ts';
   const noBearer=await fetch(gateway,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({manifestUrl:url})});
   assert.equal(noBearer.status,401);
   const wrongOrigin=await fetch(gateway,{method:'POST',
    headers:{authorization:'Bearer '+secret,'content-type':'application/json'},
    body:JSON.stringify({manifestUrl:'http://outside.example/get.php?username=alice&password=p&type=m3u_plus&output=ts'})});
   assert.equal(wrongOrigin.status,200);
   const response=await wrongOrigin.json();
   assert.equal(response.ok,false);
   assert.equal(response.code,'manifest_not_allowlisted');
  });
 });
});
test('does not follow media redirects or leak URLs into result',async()=>{
 await fixture((req,res)=>{
  if(req.url.startsWith('/get.php')){
   const port=req.headers.host.split(':').at(-1);
   return res.end('#EXTM3U\n#EXTINF:-1,First\nhttp://127.0.0.1:'+port+'/live/u/pass/1.ts');
  }
  res.writeHead(302,{location:'https://outside.example/redirect?password=secret'});
  res.end();
 },async origin=>{
  const r=await compareOfficialM3uOrigin(origin+'/get.php?username=u&password=p&type=m3u_plus&output=ts',
    {allowedOrigin:origin,validate:validateLocal});
  assert.equal(r.ok,true);
  assert.equal(r.mediaTransportVerified,false);
  assert.equal(r.checks[0].httpStatus,302);
  assert.doesNotMatch(JSON.stringify(r),/outside|password|\/live\/u\/pass/);
 });
});
test('unplayable M3U fails distinctly from transient media connection errors',async()=>{
 await fixture((_req,res)=>res.end('{"error":"not a playlist"}'),async origin=>{
  const r=await compareOfficialM3uOrigin(origin+'/get.php?username=u&password=p&type=m3u_plus&output=ts',
    {allowedOrigin:origin,validate:validateLocal});
  assert.equal(r.ok,false);
  assert.equal(r.code,'no_advertised_media_url');
 });
});
