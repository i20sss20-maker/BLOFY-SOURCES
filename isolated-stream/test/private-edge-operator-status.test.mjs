import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createStreamServer} from '../src/server.mjs';

test('operator sees only the bounded synthetic edge proof; customers never see provider data',async()=>{
 const adminToken='private-edge-operator-secret-long-enough-to-pass-2026';
 const service=createStreamServer({adminToken,fetchImpl:async()=>{
   return new Response('not found',{status:404,headers:{'content-type':'text/plain'}});
 }});
 service.recordReplicaProof({ok:true,code:'private_replica_synthetic_ts_verified',
   stage:'segment',transportVerified:true,bytesVerified:752,
   sourceUrl:'https://hidden.example/sensitive/username/password',
   customerDeviceId:'should-not-appear',elapsedMs:90,
   realSalehVerified:true});
 service.app.listen(0,'127.0.0.1');await once(service.app,'listening');
 const base='http://127.0.0.1:'+service.app.address().port;
 try{
   const anonymous=await fetch(base+'/operator/api/state');
   assert.equal(anonymous.status,401);
   const protectedReply=await fetch(base+'/operator/api/state',{headers:{
     authorization:'Basic '+Buffer.from('operator:'+adminToken).toString('base64')
   }});
   assert.equal(protectedReply.status,200);
   const raw=await protectedReply.text();
   const d=JSON.parse(raw);
   assert.equal(d.readReplicaSynthetic.ok,true);
   assert.equal(d.readReplicaSynthetic.transportVerified,true);
   assert.equal(d.readReplicaSynthetic.bytesVerified,752);
   assert.equal(d.readReplicaSynthetic.realSalehVerified,false);
   assert.equal(d.customerTrafficEnabled,false);
   assert.doesNotMatch(raw,/hidden\.example|should-not-appear|username\/password/);
   const health=await fetch(base+'/health');
   const healthText=await health.text();
   assert.doesNotMatch(healthText,/readReplicaSynthetic|sourceUrl/);
 }finally{await new Promise(resolve=>service.app.close(resolve))}
});
