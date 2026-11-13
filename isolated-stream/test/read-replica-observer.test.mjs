import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadReplicaObserver} from '../src/read-replica-observer.mjs';

test('private replica health uses a non-stream path and cannot start saleh source playback',async()=>{
 const calls=[];
 const observer=createReadReplicaObserver({timeoutMs:700,
  fetchImpl:async(url,opts)=>{
   calls.push({url,method:opts.method,redirect:opts.redirect});
   return new Response('not found',{status:404});
  }});
 assert.equal(observer.snapshot().reachable,null);
 const result=await observer.check();
 assert.equal(result.reachable,true);
 assert.equal(result.httpStatus,404);
 assert.equal(result.actualVideoVerified,false);
 assert.equal(result.customersRouted,false);
 assert.equal(result.providerRequests,0);
 assert.equal(result.originPathsRequested,0);
 assert.equal(result.privateNetworkOnly,true);
 assert.deepEqual(calls,[{
  url:'http://blofy-stream-read-replica.railway.internal:8888/',
  method:'GET',redirect:'manual'
 }]);
});
test('unreachable replica is reported as unverified and never breaks operator state',async()=>{
 const observer=createReadReplicaObserver({fetchImpl:async()=>{throw Error('no route')}});
 const result=await observer.check();
 assert.equal(result.reachable,false);
 assert.equal(result.code,'private_edge_unreachable');
 assert.equal(result.actualVideoVerified,false);
 assert.equal(result.customersRouted,false);
 assert.throws(()=>createReadReplicaObserver({timeoutMs:100}),/read_replica_timeout_invalid/);
});
