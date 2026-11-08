import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createStreamServer} from '../src/server.mjs';

const secret='operator-dashboard-test-token-1234567890-long';
async function withServer(options,fn){
  const {app}=createStreamServer(options);
  app.listen(0,'127.0.0.1');
  await once(app,'listening');
  try{await fn('http://127.0.0.1:'+app.address().port);}
  finally{await new Promise(resolve=>app.close(resolve));}
}
const auth='Basic '+Buffer.from('operator:'+secret).toString('base64');

test('console stays disabled when no operator secret is configured',async()=>{
  await withServer({},async base=>{
    const response=await fetch(base+'/operator');
    assert.equal(response.status,404);
    assert.equal((await response.json()).code,'operator_console_not_configured');
  });
});

test('console requires operator authentication for page and status',async()=>{
  await withServer({adminToken:secret,fetchImpl:async()=>new Response('',{status:404})},async base=>{
    const denied=await fetch(base+'/operator');
    assert.equal(denied.status,401);
    assert.match(denied.headers.get('www-authenticate'),/Basic/);
    const wrong=await fetch(base+'/operator/api/state',{headers:{authorization:'Basic '+Buffer.from('operator:wrong').toString('base64')}});
    assert.equal(wrong.status,401);
    const view=await fetch(base+'/operator',{headers:{authorization:auth}});
    assert.equal(view.status,200);
    assert.match(await view.text(),/مركز التحكم/);
    assert.match(view.headers.get('content-security-policy'),/script-src/);
    const status=await fetch(base+'/operator/api/state',{headers:{authorization:auth}});
    assert.equal(status.status,200);
    const data=await status.json();
    assert.equal(data.customerTrafficEnabled,false);
    assert.equal(data.realSourceVerified,false);
    assert.equal(data.engine.reachable,true); // MediaMTX root 404 still means listener responded
    assert.equal(data.engine.httpStatus,404);
  });
});

test('mutating operator request rejects missing action header',async()=>{
  await withServer({adminToken:secret},async base=>{
    const rejected=await fetch(base+'/operator/api/smoke',{method:'POST',headers:{authorization:auth}});
    assert.equal(rejected.status,403);
    assert.equal((await rejected.json()).code,'operator_action_header_required');
  });
});

test('demo mutations require Basic auth and exact anti-CSRF header',async()=>{
  await withServer({adminToken:secret},async base=>{
    const denied=await fetch(base+'/operator/api/demo-start',{method:'POST'});
    assert.equal(denied.status,401);
    const forbidden=await fetch(base+'/operator/api/demo-start',{
      method:'POST',headers:{authorization:auth}
    });
    assert.equal(forbidden.status,403);
    assert.equal((await forbidden.json()).code,'operator_action_header_required');
    const unavailable=await fetch(base+'/operator/api/demo-start',{
      method:'POST',headers:{authorization:auth,'x-blofy-operator-action':'demo-start'}
    });
    assert.equal(unavailable.status,503); // No private MediaMTX auth configured
    assert.equal((await unavailable.json()).code,'mediamtx_auth_unconfigured');
  });
});
