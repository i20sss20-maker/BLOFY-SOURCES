import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
const KEY='P'.repeat(44);
function client(){
 const calls=[];
 return {calls,p:createUnifiedPortalClient({
  secret:KEY,fetchImpl:async(url,opts)=>{
   calls.push({url:String(url),opts});
   return Response.json({ok:true,code:'mirror_intake_staged_metadata_only',
    mediaCopyStarted:false,mediaBytesTransferred:0,
    copyWorkerEnabled:false,customerCutover:false});
  }})};
}
test('website uses fixed signed paths for staging, reading and cancellation',async()=>{
 const {p,calls}=client();
 await p.opsMirrorIntakeList();
 await p.opsMirrorIntakeStage({kind:'movie',id:'1349410',ownerConfirmed:true});
 await p.opsMirrorIntakeCancel({kind:'episode',id:'127434',ownerConfirmed:true});
 assert.equal(calls.length,3);
 assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[
  '/internal/blofy-stream/ops/mirror-intake',
  '/internal/blofy-stream/ops/mirror-intake',
  '/internal/blofy-stream/ops/mirror-intake/cancel'
 ]);
 assert.deepEqual(calls.map(c=>c.opts.method),['GET','POST','POST']);
 assert.ok(calls.every(x=>x.opts.headers.authorization==='Bearer '+KEY));
 assert.deepEqual(JSON.parse(calls[1].opts.body),
  {kind:'movie',id:'1349410',ownerConfirmed:true});
 assert.deepEqual(JSON.parse(calls[2].opts.body),
  {kind:'episode',id:'127434',ownerConfirmed:true});
});
test('source URL, invalid IDs and unconfirmed writes cannot reach Portal',async()=>{
 const {p,calls}=client();
 for(const selection of [
  {kind:'movie',id:'https://evil.invalid/file',ownerConfirmed:true},
  {kind:'episode',id:'../123',ownerConfirmed:true},
  {kind:'live',id:'1',ownerConfirmed:true},
  {kind:'movie',id:'123',ownerConfirmed:false}
 ]){
  assert.equal((await p.opsMirrorIntakeStage(selection)).status,400);
 }
 assert.equal(calls.length,0);
});
test('owner library clearly describes non-executable copy intake with cancel and size/rights gates',()=>{
 const html=renderOperatorDashboard('owner_intake_test_nonce');
 for(const id of ['library-mirror-intake-panel','library-mirror-intake-status',
  'library-mirror-intake-refresh','library-mirror-intake-items'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/جهّز سجل النقل/);
 assert.match(html,/لا يبدأ تحميل/);
 assert.match(html,/awaiting_size_and_license/);
 assert.match(html,/metadata_only_awaiting_preflight/);
 assert.match(html,/ops-mirror-stage/);
 assert.match(html,/ops-mirror-cancel/);
 assert.match(html,/mediaBytesTransferred!==0/);
 assert.match(html,/copyWorkerEnabled!==false/);
 assert.doesNotMatch(html,/copyWorkerEnabled\s*:\s*true/);
});
test('all new copy-intake routes remain in the authenticated operator group',async()=>{
 const src=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.match(src,/operator\/api\/ops\/mirror-intake/);
 assert.match(src,/portal\.opsMirrorIntakeList/);
 assert.match(src,/portal\.opsMirrorIntakeStage/);
 assert.match(src,/portal\.opsMirrorIntakeCancel/);
 assert.match(src,/x-blofy-operator-action/);
 assert.ok(src.indexOf("'/operator/api/ops/mirror-intake'")>
  src.indexOf('const readable={'));
});
