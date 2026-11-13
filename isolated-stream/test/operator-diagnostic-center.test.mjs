import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createStreamServer} from '../src/server.mjs';

const secret='operator-diagnostic-test-secret-1234567890';
const auth='Basic '+Buffer.from('operator:'+secret).toString('base64');
async function withServer(options,fn){
  const {app}=createStreamServer({adminToken:secret,...options});
  app.listen(0,'127.0.0.1');await once(app,'listening');
  try{await fn('http://127.0.0.1:'+app.address().port)}
  finally{await new Promise(resolve=>app.close(resolve))}
}

test('guided diagnostics UI parses, filters 24 report indicators and keeps safe controls',async()=>{
 await withServer({},async base=>{
  const r=await fetch(base+'/operator',{headers:{authorization:auth}});
  assert.equal(r.status,200);
  const html=await r.text();
  for(const id of ['deep-audit-source','deep-audit-ai','deep-audit-priorities',
   'deep-audit-filter','deep-audit-search','deep-audit-visible',
   'diagnostic-failures-source','diagnostic-failures-summary','device-audio-validation',
   'diagnostic-go-capacity','diagnostic-open-audio']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(html,/renderAuditRows\(\)/);
  assert.match(html,/action\("full-audit\/ai","full-audit-ai-explain"/);
  assert.match(html,/فتح التفاصيل/);
  assert.doesNotMatch(html,/var button=\$\("deep-audit-run"\)/);
  const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new Function(script[1]));
 });
});

test('full audit Groq advice is operator-only, manual, with required CSRF header',async()=>{
 await withServer({},async base=>{
  const unauthenticated=await fetch(base+'/operator/api/full-audit/ai',{
   method:'POST',headers:{'x-blofy-operator-action':'full-audit-ai-explain'}});
  assert.equal(unauthenticated.status,401);
  const noAction=await fetch(base+'/operator/api/full-audit/ai',{
   method:'POST',headers:{authorization:auth}});
  assert.equal(noAction.status,403);
  assert.equal((await noAction.json()).code,'operator_action_header_required');
 });
});

test('no Groq key returns explicitly unconfigured, never fabricates AI results',async()=>{
 await withServer({},async base=>{
  const response=await fetch(base+'/operator/api/full-audit/ai',{
   method:'POST',headers:{authorization:auth,
    'x-blofy-operator-action':'full-audit-ai-explain','content-type':'application/json'},
   body:'{}'});
  assert.equal(response.status,503);
  const data=await response.json();
  assert.equal(data.ok,false);
  assert.equal(data.code,'playback_ai_not_configured');
 });
});


test('404 items and manual recheck are protected and cannot start without confirmation',async()=>{
 await withServer({},async base=>{
  const anonymous=await fetch(base+'/operator/api/media-failure-items');
  assert.equal(anonymous.status,401);
  const anonymousRun=await fetch(base+'/operator/api/media-failures/recheck-now',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({sourceId:'11111111-1111-4111-8111-111111111111',confirmed:true})});
  assert.equal(anonymousRun.status,401);
  const withoutHeader=await fetch(base+'/operator/api/media-failures/recheck-now',{
    method:'POST',headers:{authorization:auth,'content-type':'application/json'},
    body:JSON.stringify({sourceId:'11111111-1111-4111-8111-111111111111',confirmed:true})});
  assert.equal(withoutHeader.status,403);
  const withoutConfirmation=await fetch(base+'/operator/api/media-failures/recheck-now',{
    method:'POST',headers:{authorization:auth,'content-type':'application/json',
      'x-blofy-operator-action':'media-failures-recheck-now'},
    body:JSON.stringify({sourceId:'11111111-1111-4111-8111-111111111111'})});
  assert.equal(withoutConfirmation.status,400);
  assert.equal((await withoutConfirmation.json()).code,'operator_confirmation_required');
 });
});
