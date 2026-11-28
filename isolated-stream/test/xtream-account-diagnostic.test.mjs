import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createCrossProjectSourceDiagnostic,probeXtreamAccountOnce} from '../src/xtream-account-diagnostic.mjs';

const secret='r'.repeat(48);
async function fixture(handler,fn){
  const app=http.createServer(handler);
  app.listen(0,'127.0.0.1');
  await once(app,'listening');
  const origin='http://127.0.0.1:'+app.address().port;
  try{return await fn(origin)}finally{
    app.closeAllConnections();
    await new Promise(resolve=>app.close(resolve));
  }
}
const unsafeTestValidator=async v=>new URL(v); // local HTTP test only, NEVER shipped in production
test('only service bearer and a fixed allowlisted source can call the diagnostic',async()=>{
 await fixture((_req,res)=>res.end('hello'),async sourceOrigin=>{
  const diag=createCrossProjectSourceDiagnostic({
   sharedToken:secret,allowedOrigin:sourceOrigin,validateUrl:unsafeTestValidator
  });
  await fixture((req,res)=>diag.handle(req,res),async apiOrigin=>{
   const source=sourceOrigin+'/player_api.php?username=alice&password=redacted';
   const noAuth=await fetch(apiOrigin,{method:'POST',headers:{'content-type':'application/json'},
     body:JSON.stringify({accountUrl:source})});
   assert.equal(noAuth.status,401);
   const outsider=await fetch(apiOrigin,{method:'POST',headers:{
     'content-type':'application/json','authorization':'Bearer '+secret
   },body:JSON.stringify({accountUrl:'http://localhost:80/player_api.php?username=u&password=p'})});
   assert.equal(outsider.status,400);
   assert.equal((await outsider.json()).code,'origin_not_allowlisted');
  });
 });
});
test('real bounded account response is classified without exposing credentials',async()=>{
 await fixture((req,res)=>{
   assert.equal(req.method,'GET');
   assert.equal(req.headers['connection'],'close');
   assert.equal(req.headers['user-agent'],'BLOFY-Xtream/1.0');
   res.writeHead(200,{'content-type':'application/json'});
   res.end(JSON.stringify({user_info:{auth:1,status:'Active'},password:'NEVER_LEAK'}));
 },async origin=>{
   const url=origin+'/player_api.php?username=me&password=TOP_SECRET';
   const report=await probeXtreamAccountOnce(url,{validateUrl:unsafeTestValidator});
   assert.equal(report.ok,true);
   assert.equal(report.code,'account_verified');
   assert.equal(report.mediaVerified,false);
   assert.doesNotMatch(JSON.stringify(report),/TOP_SECRET|NEVER_LEAK|player_api|127.0.0.1/);
 });
});
test('redirects are not followed to a different host with credential query',async()=>{
 let called=0;
 await fixture((req,res)=>{called++;res.writeHead(302,{location:'https://other.example/collect'});res.end();},
 async origin=>{
  const report=await probeXtreamAccountOnce(origin+'/player_api.php?username=me&password=foo',
    {validateUrl:unsafeTestValidator});
  assert.equal(report.ok,false);
  assert.equal(report.httpStatus,302);
  assert.equal(called,1);
 });
});
test('failed account and wrong content are never reported as source working',async()=>{
 await fixture((_req,res)=>res.end('not JSON'),async origin=>{
   const r=await probeXtreamAccountOnce(origin+'/player_api.php?username=a&password=b',
   {validateUrl:unsafeTestValidator});
   assert.equal(r.code,'invalid_json');
   assert.equal(r.ok,false);
 });
});
