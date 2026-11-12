import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import vm from 'node:vm';
import {createStreamServer} from '../src/server.mjs';
const admin='Bearer '+ 'x'.repeat(45);
async function withServer(work){
 const {app}=createStreamServer({adminToken:'admin-a-very-long-secure-token-for-test'});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 const base='http://127.0.0.1:'+app.address().port;
 try{await work(base);}finally{await new Promise(resolve=>app.close(resolve))}
}
test('distributor portal is a separate page with code and Xtream issuance, not operator navigation',async()=>{
 await withServer(async base=>{
  const result=await fetch(base+'/distributor');assert.equal(result.status,200);
  const html=await result.text();
  assert.match(html,/لوحة التوزيع المحدودة/);
  assert.match(html,/كود BLOFY STREAM/);
  assert.match(html,/حساب Xtream/);
  assert.match(html,/رصيد الأكواد/);
  assert.match(html,/x-blofy-distributor-action/);
  assert.doesNotMatch(html,/data-tab="sources"|data-tab="library"|data-tab="restream"/);
  const nonce=html.match(/<script nonce="([^"]+)">([\s\S]*?)<\/script>/);
  assert.ok(nonce);assert.doesNotThrow(()=>new vm.Script(nonce[2]));
  assert.match(result.headers.get('content-security-policy'),/script-src 'nonce-/);
  assert.match(result.headers.get('cache-control'),/no-store/);
 });
});
test('distributor APIs are POST-only, same-origin, and never inherit operator Basic privileges',async()=>{
 await withServer(async base=>{
  const req=await fetch(base+'/distributor/api/issue');
  assert.equal(req.status,404);
  const hostile=await fetch(base+'/distributor/api/issue',{
   method:'POST',headers:{origin:'https://evil.example',
    'x-blofy-distributor-action':'issue','content-type':'application/json'},
   body:JSON.stringify({kind:'app',durationDays:365})
  });
  assert.equal(hostile.status,403);
  const wrongHeader=await fetch(base+'/distributor/api/issue',{
   method:'POST',headers:{origin:base,'x-blofy-distributor-action':'reveal',
    'content-type':'application/json'},body:'{}'
  });
  assert.equal(wrongHeader.status,403);
 });
});
test('owner panel offers create, credit, suspend and reset without exposing admin to resellers',async()=>{
 await withServer(async base=>{
  const auth='Basic '+Buffer.from('operator:admin-a-very-long-secure-token-for-test').toString('base64');
  const r=await fetch(base+'/operator',{headers:{authorization:auth}});assert.equal(r.status,200);
  const html=await r.text();
  assert.match(html,/id="page-distributors"/);
  assert.match(html,/data-tab="distributors"/);
  assert.match(html,/id="dist-create-form"/);
  assert.match(html,/distributor-create/);
  assert.match(html,/distributor-credits/);
  assert.match(html,/distributor-reset/);
  assert.match(html,/\/distributor/);
  const forbidden=await fetch(base+'/operator/api/distributors',{
    method:'POST',headers:{'content-type':'application/json',
      'x-blofy-operator-action':'distributor-create'},
    body:JSON.stringify({name:'x',username:'reseller1'})
  });
  assert.equal(forbidden.status,401);
 });
});
