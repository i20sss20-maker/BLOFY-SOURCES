import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {buildOperatorSupportBundle} from '../src/platform-support-bundle.mjs';
import {createStreamServer} from '../src/server.mjs';

test('bundle strips raw source/customer data and allows only non-identifying metrics',()=>{
 const data={
  ok:true,checkedAt:1794484800000,
  source:{id:'554e8400-e29b-41d4-a716-446655440000',name:'private-source'},
  checks:[
   {id:'sources',status:'warning',code:'sources_not_all_online',
    metrics:{total:2,enabled:1,online:0,password:'secret-password',
      customerPhone:'0561234567',providerUrl:'https://upstream.example/token'}},
   {id:'playback',status:'warning',code:'recent_playback_failures',
    metrics:{failed:12,started:8,source_id:'secret',unknownField:999,
      p95StartMs:9324,decodedOnClient:false}},
   {id:'some-dangerous-variable://credentials',status:'ok',
    code:'token=secret',metrics:{failed:999}}
  ],
  recommendations:[{checkId:'playback',code:'recent_playback_failures',
   priority:'high',recommendation:'raw token secret url',
   automatedChange:false}],
 };
 const output=buildOperatorSupportBundle(data);
 assert.equal(output.ok,true);
 assert.equal(output.schema,'blofy-stream-support-v1');
 assert.equal(output.sourceIdIncluded,false);
 assert.equal(output.customerIdentifiersIncluded,false);
 assert.equal(output.playbackOnDeviceVerified,false);
 assert.equal(output.checks.length,3);
 assert.equal(output.checks[0].metrics.total,2);
 assert.equal(output.checks[1].metrics.p95StartMs,9324);
 assert.equal(output.checks[1].metrics.decodedOnClient,false);
 assert.equal(output.checks[2].type,'unrecognized');
 assert.equal(output.checks[2].code,'unrecognized');
 assert.equal(output.recommendations[0].applied,false);
 assert.doesNotMatch(JSON.stringify(output),/private-source|0561234567|secret|password|source_id|providerUrl|upstream\.example/i);
 assert.equal(buildOperatorSupportBundle({ok:false}).ok,false);
});

test('support bundle endpoint enforces operator auth and GET-only, hides credentials',async()=>{
 const secret='blofy-safe-export-admin-password-123456789';
 const {app}=createStreamServer({adminToken:secret});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 try{
  const base='http://127.0.0.1:'+app.address().port;
  const unauthorized=await fetch(base+'/operator/api/support-bundle');
  assert.equal(unauthorized.status,401);
  const auth='Basic '+Buffer.from('operator:'+secret).toString('base64');
  const forbidden=await fetch(base+'/operator/api/support-bundle',
   {method:'POST',headers:{authorization:auth}});
  assert.equal(forbidden.status,404);
  const report=await fetch(base+'/operator/api/support-bundle',
   {headers:{authorization:auth}});
  assert.equal(report.status,200);
  const data=await report.json();
  assert.equal(data.schema,'blofy-stream-support-v1');
  assert.equal(data.ok,true);
  assert.equal(data.readOnly,true);
  assert.equal(data.sourceIdIncluded,false);
  assert.equal(data.credentialsIncluded,false);
  assert.equal(data.customerIdentifiersIncluded,false);
  assert.ok(data.checks.length>=20);
  assert.doesNotMatch(JSON.stringify(data),/secret-password|providerUrl|sourceId|customerPhone|bearer/i);
  const page=await(await fetch(base+'/operator',{headers:{authorization:auth}})).text();
  assert.match(page,/id="deep-audit-export"/);
  assert.match(page,/api\("support-bundle"\)/);
 }finally{await new Promise(resolve=>app.close(resolve))}
});
