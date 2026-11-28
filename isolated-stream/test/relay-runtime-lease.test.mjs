import test from 'node:test';
import assert from 'node:assert/strict';
import {createRelayRuntimeLease} from '../src/relay-runtime-lease.mjs';
test('standby remains idle until an authenticated grant; expiry is irreversible in this process',async()=>{
 let now=100,granted=false,revoked=0;
 const lease=createRelayRuntimeLease({enabled:true,configured:true,readPermit:async()=>granted,clock:()=>now,autoStart:false,onExpired:()=>revoked++});
 assert.equal(lease.allows(),false);assert.equal(await lease.refresh(),false);assert.equal(revoked,0);
 granted=true;assert.equal(await lease.refresh(),true);assert.equal(lease.allows(),true);
 now=8100;assert.equal(await lease.refresh(),true);
 now=12000;granted=false;assert.equal(await lease.refresh(),true);
 now=18100;assert.equal(lease.allows(),false);assert.equal(revoked,1);
 granted=true;assert.equal(await lease.refresh(),false);assert.equal(revoked,1);
});
test('delayed response cannot extend the permit past its request-start deadline',async()=>{
 let now=0;
 const lease=createRelayRuntimeLease({enabled:true,configured:true,clock:()=>now,autoStart:false,readPermit:async()=>{now=10001;return true}});
 assert.equal(await lease.refresh(),false);assert.equal(lease.allows(),false);
});
test('an inflight response cannot resurrect an expired permit',async()=>{
 let now=0,read=0,resolve;
 const lease=createRelayRuntimeLease({enabled:true,configured:true,clock:()=>now,autoStart:false,readPermit:()=>++read===1?true:new Promise(r=>resolve=r)});
 assert.equal(await lease.refresh(),true);now=9000;const p=lease.refresh();now=10001;
 assert.equal(lease.allows(),false);resolve(true);assert.equal(await p,false);
});
test('defaults preserve production behavior and misconfiguration fails closed',async()=>{
 assert.equal(createRelayRuntimeLease().allows(),true);
 const lease=createRelayRuntimeLease({enabled:true,configured:false});
 assert.equal(lease.allows(),false);assert.equal(await lease.refresh(),false);
});
