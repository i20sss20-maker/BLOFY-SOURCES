// Real localhost HTTP routes with a disposable, in-memory Portal fixture.
// No production DB, credentials, Xtream source, or subscriber write is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';

const ID='123e4567-e89b-42d3-a456-426614174000';
const ID2='123e4567-e89b-42d3-a456-426614174001';
const operator='test-operator-secret-with-more-than-32-characters';
const gateway='test-unified-portal-secret-with-more-than-40-characters';
const auth='Basic '+Buffer.from('operator:'+operator).toString('base64');
function fixture(){
 const data={codes:[],distributors:[],calls:[]};
 const response=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json'}
 });
 const fetchImpl=async(url,options={})=>{
  const uri=new URL(url);
  if(uri.hostname!=='blofy-activation-portal-production.up.railway.app'||
     !uri.pathname.startsWith('/internal/blofy-stream/'))
   return new Response('',{status:404});
  const method=options.method||'GET',path=uri.pathname;
  data.calls.push({path,method,auth:options.headers?.authorization||''});
  const body=options.body?JSON.parse(options.body):{};
  if(path==='/internal/blofy-stream/codes'&&method==='GET')
   return response({ok:true,codes:data.codes.map(c=>({
    id:c.id,codeHint:c.codeHint,active:c.active}))});
  if(path==='/internal/blofy-stream/codes'&&method==='POST'){
   const code={id:ID,codeHint:'QA-***-000',active:true};
   data.codes.push(code);
   return response({ok:true,issued:[{...code,code:'FAKE-QA-CODE'}]});
  }
  if(path==='/internal/blofy-stream/codes/'+ID+'/revoke'&&method==='POST'){
   data.codes[0].active=false;return response({ok:true,code:'code_revoked'});
  }
  if(path==='/internal/blofy-stream/distributors'&&method==='GET')
   return response({ok:true,distributors:data.distributors.map(x=>({...x}))});
  if(path==='/internal/blofy-stream/distributors'&&method==='POST'){
   data.distributors.push({id:ID2,username:body.username,credits:body.credits});
   return response({ok:true,distributorId:ID2});
  }
  if(path==='/internal/blofy-stream/distributors/'+ID2+'/credits'&&method==='POST'){
   data.distributors[0].credits+=Number(body.credits||0);
   return response({ok:true,credits:data.distributors[0].credits});
  }
  if(path==='/internal/blofy-stream/content-hub/status'&&method==='GET')
   return response({ok:true,privateOnly:true,customerCutover:false});
  if(path==='/internal/blofy-stream/catalog'&&method==='GET')
   return response({ok:true,items:[{id:7,title:'Licensed QA sample'}],total:1});
  return response({ok:false,code:'fixture_route_unhandled'},404);
 };
 return {data,fetchImpl};
}
async function withSite(f,fn){
 const dashboard=createOperatorDashboard({adminToken:operator,
  unifiedSecret:gateway,fetchImpl:f.fetchImpl,
  engineOrigin:'http://blofy-stream-media.railway.internal:8888'});
 const app=createServer((req,res)=>{
  if(!dashboard.handle(req,res)){res.writeHead(404);res.end()}
 });
 app.listen(0,'127.0.0.1');await once(app,'listening');
 try{return await fn('http://127.0.0.1:'+app.address().port)}
 finally{await new Promise(resolve=>app.close(resolve))}
}
async function api(base,path,{method='GET',action,body,authorization=auth}={}){
 return fetch(base+'/operator/api/'+path,{
  method,headers:{
   ...(authorization?{authorization}:{}),
   ...(action?{'x-blofy-operator-action':action}:{}),
   ...(body?{'content-type':'application/json'}:{})
  },...(body?{body:JSON.stringify(body)}:{})
 });
}
test('operator reads codes, distributors, library and storage through the fixed authenticated bridge',async()=>{
 const f=fixture();
 await withSite(f,async base=>{
  for(const path of ['codes','distributors','catalog?type=movie',
    'content-hub/status']){
   const missing=await api(base,path,{authorization:''});
   assert.equal(missing.status,401,path);
  }
  assert.equal(f.data.calls.length,0);
  const routes=['codes','distributors','catalog?type=movie','content-hub/status'];
  for(const path of routes){
   const res=await api(base,path);
   assert.equal(res.status,200,path);
   assert.equal((await res.json()).ok,true,path);
  }
  assert.equal(f.data.calls.length,4);
  for(const x of f.data.calls){
   assert.equal(x.method,'GET');
   assert.equal(x.auth,'Bearer '+gateway);
   assert.match(x.path,/^\/internal\/blofy-stream\//);
  }
 });
});
test('issue, list, revoke and distributor credits work end-to-end with disposable backend only',async()=>{
 const f=fixture();
 await withSite(f,async base=>{
  const before=f.data.calls.length;
  const denied=await api(base,'codes',{method:'POST',
   body:{label:'QA',durationDays:1,quantity:1}});
  assert.equal(denied.status,403);
  assert.equal(f.data.calls.length,before);
  const issued=await api(base,'codes',{method:'POST',action:'code-issue',
   body:{label:'QA',durationDays:1,quantity:1,maxConnections:1,channel:'xtream'}});
  assert.equal(issued.status,200);
  assert.equal((await issued.json()).issued[0].code,'FAKE-QA-CODE');
  const list=await api(base,'codes');
  assert.equal((await list.json()).codes.length,1);
  assert.equal(f.data.codes[0].active,true);
  const revoke=await api(base,'code/'+ID+'/revoke',{
   method:'POST',action:'code-revoke',body:{}});
  assert.equal(revoke.status,200);
  assert.equal((await revoke.json()).code,'code_revoked');
  assert.equal(f.data.codes[0].active,false);
  const created=await api(base,'distributors',{
   method:'POST',action:'distributor-create',
   body:{name:'Fixture Reseller',username:'qa-fixture',credits:1}});
  assert.equal(created.status,200);
  assert.equal((await created.json()).distributorId,ID2);
  const credited=await api(base,'distributors/'+ID2+'/credits',{
   method:'POST',action:'distributor-credits',body:{credits:2}});
  assert.equal(credited.status,200);
  assert.equal((await credited.json()).credits,3);
  const sellers=await api(base,'distributors');
  assert.equal((await sellers.json()).distributors[0].credits,3);
  assert.equal(f.data.calls.filter(x=>x.method==='POST').length,4);
 });
});
