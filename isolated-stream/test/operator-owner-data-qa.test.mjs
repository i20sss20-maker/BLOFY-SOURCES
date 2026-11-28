import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {Script} from 'node:vm';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const adminKey='synthetic-owner-admin-token-at-least-32-bytes';
const bridgeKey='synthetic-bridge-secret-at-least-40-characters-long';
const auth='Basic '+Buffer.from('operator:'+adminKey).toString('base64');
const report={
 ok:true,scope:'authoritative_owner_postgresql_read_only',
 stores:[
  {id:'codes',state:'readable',tablePresent:true,requiredColumnsPresent:true,selectReady:true},
  {id:'distributors',state:'readable',tablePresent:true,requiredColumnsPresent:true,selectReady:true}
 ],
 schemaMutations:0,customerWrites:0,tableRowsReturned:false,
 providerMediaRequests:0,codeIssuanceTested:false,
 distributorCreationTested:false,
 credential:'secret-value-must-not-appear-in-HTML'
};
test('site panel truthfully distinguishes table reads from actual code issuance or reseller mutations',()=>{
 const html=renderOperatorDashboard('owner-store-qa');
 for(const id of [
  'owner-code-distributor-qa-panel','owner-data-qa-refresh',
  'owner-data-qa-status','owner-data-qa-codes','owner-data-qa-distributors'
 ])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/\/operator\/api\/ops\/admin-readiness/);
 assert.match(html,/report\.schemaMutations!==0/);
 assert.match(html,/report\.customerWrites!==0/);
 assert.match(html,/report\.providerMediaRequests!==0/);
 const js=html.match(/<script nonce="owner-store-qa">([\s\S]*?)<\/script>/);
 assert.ok(js);assert.doesNotThrow(()=>new Script(js[1]));
 assert.doesNotMatch(html,/secret-value-must-not-appear-in-HTML/);
});
async function withServer(handler){
 const calls=[];
 const dashboard=createOperatorDashboard({
  adminToken:adminKey,unifiedSecret:bridgeKey,
  engineOrigin:'http://blofy-stream-media.railway.internal:8888',
  fetchImpl:async(target,options)=>{
   calls.push({target:String(target),options});
   const u=new URL(String(target));
   assert.equal(u.hostname,'blofy-activation-portal-production.up.railway.app');
   assert.equal(u.pathname,'/internal/blofy-stream/ops/admin-readiness');
   return new Response(JSON.stringify(report),{
    status:200,headers:{'content-type':'application/json'}
   });
  }
 });
 const server=createServer((req,res)=>{
  if(!dashboard.handle(req,res)){res.writeHead(404);res.end()}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{await handler('http://127.0.0.1:'+server.address().port,calls)}
 finally{await new Promise(resolve=>server.close(resolve))}
}
test('one owner Basic-protected GET uses fixed Portal path; no unauthenticated DB inspection or writes',async()=>{
 await withServer(async (base,calls)=>{
  assert.equal((await fetch(base+'/operator/api/ops/admin-readiness')).status,401);
  assert.equal(calls.length,0);
  const r=await fetch(base+'/operator/api/ops/admin-readiness',{
   headers:{authorization:auth}});
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.scope,'authoritative_owner_postgresql_read_only');
  assert.equal(body.customerWrites,0);
  assert.equal(body.codeIssuanceTested,false);
  assert.equal(calls.length,1);
  assert.equal(calls[0].options.method,'GET');
  assert.equal(calls[0].options.headers.authorization,'Bearer '+bridgeKey);
  assert.equal((await fetch(base+'/operator/api/ops/admin-readiness',{
   method:'POST',headers:{authorization:auth,
    'content-type':'application/json',
    'x-blofy-operator-action':'admin-readiness'},body:'{}'})).status,404);
  assert.equal(calls.length,1);
 });
});
