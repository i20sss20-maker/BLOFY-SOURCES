import {createServer} from 'node:http';
import {createDistributorDashboard} from '../src/distributor-dashboard.mjs';
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

test('distributor login sets private cookie and never returns session token to browser scripts',async()=>{
 const secretToken='A'.repeat(43),calls=[];
 const bridge={async distributorRequest(action,data){
   calls.push({action,data});
   if(action==='login')return {status:200,body:{ok:true,token:secretToken,
     expiresIn:43200,item:{name:'Distribution Test'}}};
   if(action==='me')return {status:200,body:{ok:true,item:{
     name:'Distribution Test',username:'dist-demo',credits:5,used:0,enabled:true}}};
   if(action==='issue')return {status:200,body:{ok:true,code:'12345678'}};
   return {status:404,body:{ok:false,code:'route_not_found'}};
 }};
 const dashboard=createDistributorDashboard({bridge});
 const server=createServer((req,res)=>{
  if(!dashboard.handle(req,res)){res.writeHead(404);res.end()}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 const origin='https://127.0.0.1:'+server.address().port;
 try{
  const login=await fetch(base+'/distributor/api/login',{method:'POST',
   headers:{origin,'content-type':'application/json','x-blofy-distributor-action':'login'},
   body:JSON.stringify({username:'dist-demo',password:'not-logged-secret'})});
  assert.equal(login.status,200);
  const body=await login.text();
  assert.doesNotMatch(body,/AAAAAA/);
  assert.doesNotMatch(body,/not-logged-secret/);
  const cookie=login.headers.get('set-cookie');
  assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);
  assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Path=\/distributor/);
  const me=await fetch(base+'/distributor/api/me',{method:'POST',
    headers:{origin,'content-type':'application/json',
      'x-blofy-distributor-action':'me',cookie:cookie.split(';')[0]},body:'{}'});
  assert.equal(me.status,200);
  assert.equal(calls[1].data.sessionToken,secretToken);
  const forbidden=await fetch(base+'/distributor/api/me',{method:'POST',
    headers:{origin,'content-type':'application/json','x-blofy-distributor-action':'me'},
    body:'{}'});
  assert.equal(forbidden.status,401);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
