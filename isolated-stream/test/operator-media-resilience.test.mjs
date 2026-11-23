import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readWithMediaDeadline,nextOperatorSourcePreference}
 from '../src/operator-media-resilience.mjs';
const options={backupConfigured:true,sourceIndex:0,preferredIndex:0};
test('never switch without explicitly authorized backup',()=>{
 assert.equal(nextOperatorSourcePreference({...options,backupConfigured:false,durationMs:1000}).switched,false);
});
test('sub-10-second clean source end selects configured backup on next restart',()=>{
 assert.equal(nextOperatorSourcePreference({...options,now:50000,durationMs:5000}).preferredIndex,1);
});
test('two short primary ends in 5 minutes pick backup; a healthy interval resets',()=>{
 const first=nextOperatorSourcePreference({...options,now:50000,durationMs:70000});
 assert.equal(first.switched,false);
 const second=nextOperatorSourcePreference({...options,now:90000,durationMs:80000,
  priorShortEndAt:first.shortEndAt,priorShortEndCount:first.shortEndCount});
 assert.equal(second.switched,true);
 const healthy=nextOperatorSourcePreference({...options,durationMs:300000,
  priorShortEndAt:first.shortEndAt,priorShortEndCount:1,now:90000});
 assert.equal(healthy.shortEndCount,0);
});
test('stall aborts current provider request with bounded error',async()=>{
 const controller=new AbortController();
 await assert.rejects(()=>readWithMediaDeadline({
  read:()=>new Promise(()=>{})},controller,{timeoutMs:20}),/restream_provider_stalled/);
 assert.equal(controller.signal.aborted,true);
});
test('healthy TS bytes pass unchanged',async()=>{
 const controller=new AbortController();
 const packet=Buffer.from([0x47,0x40,0x00,0x10]);
 const read=await readWithMediaDeadline({read:async()=>({value:packet,done:false})},
  controller,{timeoutMs:100});
 assert.equal(read.value,packet);
 assert.equal(controller.signal.aborted,false);
});
test('private engine health and hour window never expose anonymous routes publicly',async()=>{
 const s=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
 assert.match(s,/pathname==='\/internal\/media-engine-health'/);
 assert.match(s,/pathname==='\/internal\/media-hour-report'/);
 assert.match(s,/authorized\(req.headers.authorization,adminToken\)/);
 const sup=await readFile(new URL('../src/live-restream-supervisor.mjs',import.meta.url),'utf8');
 assert.match(sup,/readWithMediaDeadline\(active.reader,active.controller/);
 assert.match(sup,/providerRequests:0/);
});
