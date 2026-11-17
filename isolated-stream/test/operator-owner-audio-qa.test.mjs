import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {Script} from 'node:vm';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const password='owner-operator-secret-must-be-longer-than-32';
const secret='portal-bridge-fixture-secret-longer-than-forty-characters';
const auth='Basic '+Buffer.from('operator:'+password).toString('base64');
const fixtures={
 tracks:[{id:'anis-max-2',label:'Anis Max 2'},
  {id:'anis-sport-4',label:'Anis Sport 4'}]
};
async function withLocalOperator(fn){
 const calls=[];
 const fetchImpl=async(url,opts={})=>{
  const uri=new URL(url);
  assert.equal(uri.hostname,'blofy-activation-portal-production.up.railway.app');
  assert.equal(opts.headers?.authorization,'Bearer '+secret);
  calls.push({method:opts.method,path:uri.pathname,
   body:opts.body?JSON.parse(opts.body):null});
  if(uri.pathname.endsWith('/audio/readiness'))
   return new Response(JSON.stringify({ok:true,configured:true,
    tracks:fixtures.tracks,latest:null,onlyConfiguredProvider:true,
    noProbeOnRead:true}),{status:200,headers:{'content-type':'application/json'}});
  if(uri.pathname.endsWith('/audio/probe'))
   return new Response(JSON.stringify({ok:true,checked:1,
    results:[{id:'anis-max-2',reason:'unrecognized_stream_bytes',
     payloadClass:'hls_playlist',receivedBytes:64,progressiveAudioDetected:false}],
    customerTrafficChanged:false,mediaPlaybackVerified:false}),
    {status:200,headers:{'content-type':'application/json'}});
  return new Response('{}',{status:404});
 };
 const dashboard=createOperatorDashboard({
  adminToken:password,unifiedSecret:secret,fetchImpl,
  engineOrigin:'http://blofy-stream-media.railway.internal:8888'
 });
 const server=createServer((req,res)=>{
  if(!dashboard.handle(req,res)){res.writeHead(404);res.end()}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{await fn('http://127.0.0.1:'+server.address().port,calls)}
 finally{await new Promise(resolve=>server.close(resolve))}
}
test('radio source QA UI is authenticated, compiles and never embeds source URL',()=>{
 const page=renderOperatorDashboard('audio-qa-test');
 for(const id of ['owner-radio-audio-qa-panel','owner-audio-qa-refresh',
  'owner-audio-qa-track-1','owner-audio-qa-track-2',
  'owner-audio-qa-probe','owner-audio-qa-output'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/action\("audio\/probe","audio-probe"/);
 assert.match(page,/api\("audio\/readiness"\)/);
 assert.match(page,/new Set\(ids\)\.size!==ids.length/);
 assert.match(page,/loadOwnerAudioReadiness\(\)/);
 assert.doesNotThrow(()=>new Script(page.match(
  /<script nonce="audio-qa-test">([\s\S]*?)<\/script>/)[1]));
 assert.doesNotMatch(page,/radio\.anisfm\.vip|token=secret-upstream/);
});
test('owner-only read and explicit POST are protected; no source streaming in browser',async()=>{
 await withLocalOperator(async(base,calls)=>{
  const unauth=await fetch(base+'/operator/api/audio/readiness');
  assert.equal(unauth.status,401);
  const r=await fetch(base+'/operator/api/audio/readiness',{
   headers:{authorization:auth}});
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.noProbeOnRead,true);
  assert.equal(data.tracks.length,2);
  assert.equal(calls.length,1);
  assert.equal(calls[0].method,'GET');
  const noAuth=await fetch(base+'/operator/api/audio/probe',{
   method:'POST',headers:{'x-blofy-operator-action':'audio-probe',
    'content-type':'application/json'},body:JSON.stringify({ids:['anis-max-2']})});
  assert.equal(noAuth.status,401);
  const noCsrf=await fetch(base+'/operator/api/audio/probe',{
   method:'POST',headers:{authorization:auth,'content-type':'application/json'},
   body:JSON.stringify({ids:['anis-max-2']})});
  assert.equal(noCsrf.status,403);
  assert.equal(calls.length,1);
  const probe=await fetch(base+'/operator/api/audio/probe',{
   method:'POST',headers:{authorization:auth,
    'x-blofy-operator-action':'audio-probe','content-type':'application/json'},
   body:JSON.stringify({ids:['anis-max-2']})});
  assert.equal(probe.status,200);
  const result=await probe.json();
  assert.equal(result.results[0].payloadClass,'hls_playlist');
  assert.equal(result.mediaPlaybackVerified,false);
  assert.equal(calls.length,2);
  assert.equal(calls[1].path,'/internal/blofy-stream/audio/probe');
  assert.deepEqual(calls[1].body,{ids:['anis-max-2']});
 });
});
test('invalid arbitrary tracks are rejected before the private backend',async()=>{
 await withLocalOperator(async(base,calls)=>{
  const r=await fetch(base+'/operator/api/audio/probe',{
   method:'POST',headers:{authorization:auth,
    'x-blofy-operator-action':'audio-probe','content-type':'application/json'},
   body:JSON.stringify({ids:['https://localhost/internal']})});
  assert.equal(r.status,400);
  assert.equal((await r.json()).code,'audio_probe_tracks_invalid');
  assert.equal(calls.length,0);
 });
});
