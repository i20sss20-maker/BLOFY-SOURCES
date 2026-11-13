import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import vm from 'node:vm';
import {createDistributorDashboard} from '../src/distributor-dashboard.mjs';

async function withMerchant(work){
 const calls=[],session='A'.repeat(43);
 const bridge={async distributorRequest(action,data){
   calls.push({action,data});
   if(action==='login')return {status:200,body:{ok:true,token:session}};
   if(action==='me')return {status:200,body:{ok:true,item:{name:'My Shop',username:'myshop',credits:8,used:2,enabled:true}}};
   return {status:200,body:{ok:true,items:[],categories:[],updated:0}};
 }};
 const dashboard=createDistributorDashboard({bridge});
 const app=createServer((req,res)=>{
   if(!dashboard.handle(req,res)){res.writeHead(404);res.end()}
 });
 app.listen(0,'127.0.0.1');await once(app,'listening');
 const base='http://127.0.0.1:'+app.address().port;
 const origin='https://127.0.0.1:'+app.address().port;
 const headers={'content-type':'application/json'};
 async function action(name,data={},cookie=''){
   return fetch(base+'/distributor/api/'+name,{method:'POST',
     headers:{...headers,origin,'x-blofy-distributor-action':name,...(cookie?{cookie}:{})},
     body:JSON.stringify(data)});
 }
 try{await work({base,action,calls,headers,origin})}
 finally{await new Promise(resolve=>app.close(resolve))}
}

test('merchant page contains complete scoped account, credential and category batch controls',async()=>{
 await withMerchant(async({base})=>{
  const r=await fetch(base+'/distributor');assert.equal(r.status,200);
  const html=await r.text();
  for(const id of ['account-card','merchant-username','merchant-password-dialog',
    'merchant-current-password','merchant-new-password','merchant-password-confirm',
    'manage-copy','manage-rotate','manage-relogin','library-category','library-total',
    'library-select-all','library-select-clear','library-bulk-show',
    'library-bulk-hide','library-bulk-group','library-bulk-group-save'])
    assert.match(html,new RegExp('id="'+id+'"'),id);
  assert.match(html,/href="#library-panel"/);
  assert.match(html,/request\('rotate-xtream'/);
  assert.match(html,/request\('change-password'/);
  assert.match(html,/request\('organize-bulk'/);
  assert.match(html,/library-categories/);
  assert.match(html,/item\.codeHint/);
  const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(script);assert.doesNotThrow(()=>new vm.Script(script[1]));
  assert.match(r.headers.get('content-security-policy'),/script-src 'nonce-/);
  assert.doesNotMatch(html,/private_api_key|upstream_password|password_hash/);
 });
});

test('new merchant routes reject unauthorized and cross-origin access before reaching portal',async()=>{
 await withMerchant(async({base,action,calls,headers,origin})=>{
  for(const name of ['rotate-xtream','change-password','organize-bulk','library-categories']){
    const unauth=await action(name,{issueId:'x'});
    assert.equal(unauth.status,401,name);
    const csrf=await fetch(base+'/distributor/api/'+name,{method:'POST',
      headers:{...headers,origin:'https://evil.invalid',
        'x-blofy-distributor-action':name},
      body:'{}'});
    assert.equal(csrf.status,403,name);
  }
  assert.equal(calls.length,0);
  const login=await action('login',{username:'myshop',password:'test-secret'});
  const cookie=login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  await action('rotate-xtream',{issueId:'9'.repeat(36),
    requestId:'a'.repeat(36),acknowledgeDisconnect:true,sourceId:'other-source',
    upstreamPassword:'do-not-send'},cookie);
  const rotation=calls.find(x=>x.action==='rotate-xtream');
  assert.equal(rotation.data.sessionToken,'A'.repeat(43));
  assert.equal(rotation.data.acknowledgeDisconnect,true);
  assert.equal('sourceId' in rotation.data,false);
  assert.equal('upstreamPassword' in rotation.data,false);
  await action('organize-bulk',{type:'live',itemIds:['42'],hidden:true,
    providerUrl:'https://evil.invalid'},cookie);
  const bulk=calls.find(x=>x.action==='organize-bulk');
  assert.deepEqual(bulk.data.itemIds,['42']);
  assert.equal(bulk.data.providerUrl,undefined);
  assert.equal(bulk.data.sessionToken,'A'.repeat(43));
 });
});
