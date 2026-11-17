import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {Script} from 'node:vm';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const operatorKey='local-test-operator-key-over-32-characters';
const bridgeKey='local-test-private-bridge-key-at-least-forty-characters-long';
const auth='Basic '+Buffer.from('operator:'+operatorKey).toString('base64');
const response={ok:true,scope:'this_instance',windowMinutes:60,started:22,
 failed:21,interrupted:3,reasonCountWindow:'bounded_hourly_samples',
 byReason:{xtream_transport_connection_reset:21,xtream_transport_timeout:3},
 reasonByKind:{live:{},movie:{xtream_transport_connection_reset:1},
 series:{xtream_transport_connection_reset:20,xtream_transport_timeout:3}},
 decodedOnClient:false,sourceCredentialsExposed:false};
async function withOperator(fn){
 const requests=[];
 const fetchImpl=async (url,options={})=>{
  const u=new URL(url);
  requests.push({hostname:u.hostname,path:u.pathname,method:options.method||'GET',
   auth:options.headers?.authorization});
  if(u.hostname!=='blofy-activation-portal-production.up.railway.app')throw Error('bad host');
  if(u.pathname==='/internal/blofy-stream/media-quality')
   return new Response(JSON.stringify(response),
    {status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({ok:false,code:'not_found'}),{status:404});
 };
 const dashboard=createOperatorDashboard({
  adminToken:operatorKey,unifiedSecret:bridgeKey,fetchImpl,
  engineOrigin:'http://blofy-stream-media.railway.internal:8888'
 });
 const app=createServer((req,res)=>{if(!dashboard.handle(req,res)){
  res.writeHead(404);res.end('not found');
 }});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 try{await fn('http://127.0.0.1:'+app.address().port,requests)}
 finally{await new Promise(resolve=>app.close(resolve))}
}
test('owner dashboard includes a safe full-hour 502 reason panel with valid JavaScript',()=>{
 const html=renderOperatorDashboard('transport-qa');
 for(const id of ['transport-502-health-panel','transport-502-refresh',
  'transport-502-started','transport-502-failed','transport-502-interrupted',
  'transport-502-resets','transport-502-reasons','transport-502-status'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/api\("media-quality"\)/);
 assert.match(html,/reasonCountWindow==="bounded_hourly_samples"/);
 assert.match(html,/byKind\.series/);
 const script=html.match(/<script nonce="transport-qa">([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new Script(script[1]));
 assert.doesNotMatch(html,/fake-provider-secret|real-provider-password/);
});
test('real operator HTTP transport diagnostics only read fixed private Portal endpoint',async()=>{
 await withOperator(async (base,requests)=>{
  let result=await fetch(base+'/operator/api/media-quality');
  assert.equal(result.status,401);
  assert.equal(requests.length,0);
  result=await fetch(base+'/operator/api/media-quality',{
   headers:{authorization:auth}});
  assert.equal(result.status,200);
  const data=await result.json();
  assert.equal(data.byReason.xtream_transport_connection_reset,21);
  assert.equal(data.reasonByKind.series.xtream_transport_connection_reset,20);
  assert.equal(data.decodedOnClient,false);
  assert.deepEqual(requests,[{
   hostname:'blofy-activation-portal-production.up.railway.app',
   path:'/internal/blofy-stream/media-quality',method:'GET',
   auth:'Bearer '+bridgeKey
  }]);
  const denied=await fetch(base+'/operator/api/media-quality',{
   method:'POST',headers:{authorization:auth,
    'x-blofy-operator-action':'media-quality','content-type':'application/json'},
   body:'{}'});
  assert.equal(denied.status,404);
  assert.equal(requests.length,1);
 });
});
