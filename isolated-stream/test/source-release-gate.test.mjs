import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createSourceReleaseGate,waitForSourceRelease} from '../src/source-release-gate.mjs';
const defer=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}};
const client=()=>({req:new EventEmitter(),res:new EventEmitter()});
test('disconnected and timed-out waiters are removed while provider release remains pending',async()=>{
 const d=defer(),gate=createSourceReleaseGate(null,d.promise,()=>{});
 const clients=Array.from({length:64},client);
 const waits=clients.map(({req,res})=>waitForSourceRelease(gate,req,res,20));
 assert.equal(gate.waiters.size,64);
 for(const {res} of clients.slice(0,32))res.emit('close');
 const results=await Promise.all(waits);
 assert.equal(results.filter(x=>x==='abandoned').length,32);
 assert.equal(results.filter(x=>x==='timeout').length,32);
 assert.equal(gate.waiters.size,0);
 assert.equal(gate.settled,false);
 for(const {req,res} of clients){assert.equal(req.listenerCount('aborted'),0);assert.equal(res.listenerCount('close'),0)}
 d.resolve();await gate.promise;
});
test('confirmed release wakes all remaining clients and cleans their listeners',async()=>{
 const d=defer();let calls=0;
 const gate=createSourceReleaseGate(null,d.promise,()=>calls++);
 const clients=Array.from({length:20},client);
 const waits=clients.map(({req,res})=>waitForSourceRelease(gate,req,res,1000));
 d.resolve();assert.deepEqual(await Promise.all(waits),Array(20).fill('released'));
 assert.equal(calls,1);assert.equal(gate.waiters.size,0);
 for(const {req,res} of clients){assert.equal(req.listenerCount('aborted'),0);assert.equal(res.listenerCount('close'),0)}
});
test('chained releases preserve oldest pending age and cannot open a source early',async()=>{
 const a=defer(),b=defer();
 const first=createSourceReleaseGate(null,a.promise,()=>{},()=>100);
 const next=createSourceReleaseGate(first,b.promise,()=>{},()=>500);
 assert.equal(next.since,100);
 b.resolve();await Promise.resolve();assert.equal(next.settled,false);
 const {req,res}=client(),wait=waitForSourceRelease(next,req,res,1000);
 a.resolve();assert.equal(await wait,'released');assert.equal(next.settled,true);
});
test('already disconnected and already released clients never install waiters',async()=>{
 const d=defer(),gate=createSourceReleaseGate(null,d.promise,()=>{});
 const {req,res}=client();req.aborted=true;
 assert.equal(await waitForSourceRelease(gate,req,res),'abandoned');
 d.resolve();await gate.promise;
 const alive=client();assert.equal(await waitForSourceRelease(gate,alive.req,alive.res),'released');
 assert.equal(gate.waiters.size,0);
});
