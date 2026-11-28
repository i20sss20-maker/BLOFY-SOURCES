import test from 'node:test';
import assert from 'node:assert/strict';
import {runOperatorEgressProbe} from '../src/operator-egress-probe.mjs';

const services={
  validate:async url=>new URL(url),
  lookup:async()=>[{address:'93.184.216.34',family:4}],
  doTcp:async()=>({state:'connected',elapsedMs:8}),
  doHttp:async()=>({result:'http_response',httpStatus:401,elapsedMs:12})
};
test('successful denied anonymous Xtream request is HTTP reachability not video',async()=>{
  const p=await runOperatorEgressProbe('provider.example',services);
  assert.equal(p.ok,true);
  assert.equal(p.http.httpStatus,401);
  assert.equal(p.realPlaybackVerified,false);
  assert.equal(p.hasCredentials,false);
  assert.doesNotMatch(JSON.stringify(p),/provider.example|username|password|sourceUrl/);
});
test('socket can succeed while provider resets the HTTP request',async()=>{
  const p=await runOperatorEgressProbe('provider.example',{
    ...services,doHttp:async()=>({result:'connection_reset',elapsedMs:9})
  });
  assert.equal(p.ok,false);
  assert.equal(p.tcp.state,'connected');
  assert.equal(p.http.result,'connection_reset');
});
test('invalid destination rejected before DNS or socket',async()=>{
  let calls=0;
  const result=await runOperatorEgressProbe('http://127.0.0.1:80',{...services,
    lookup:async()=>{calls++;return[];}
  });
  assert.equal(result.ok,false);
  assert.equal(result.stage,'validation');
  assert.equal(calls,0);
});
test('unresolved DNS prevents any provider request',async()=>{
  let calls=0;
  const p=await runOperatorEgressProbe('provider.example',{
    ...services,lookup:async()=>[],doHttp:async()=>{calls++;return{}}
  });
  assert.equal(p.ok,false);
  assert.equal(p.stage,'dns');
  assert.equal(calls,0);
});
