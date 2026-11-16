import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
const KEY='q'.repeat(48);
function fixture(){
 const calls=[];
 const portal=createUnifiedPortalClient({secret:KEY,
  fetchImpl:async(url,opts)=>{
   calls.push({url:String(url),opts});
   return Response.json({ok:true,code:'mirror_preflight_size_recorded_blocked',
    expectedBytes:8388608,copyWorkerEnabled:false,
    mediaBytesTransferred:0,customerCutover:false});
  }});
 return {calls,portal};
}
test('signed owner preflight only targets fixed Portal path with exact action header',async()=>{
 const {calls,portal}=fixture();
 const r=await portal.opsMirrorIntakePreflight({
  kind:'episode',id:'123456',ownerConfirmed:true,
  licenseReference:'licensed-storage-2026'});
 assert.equal(r.status,200);
 assert.equal(calls.length,1);
 const {url,opts}=calls[0];
 assert.equal(new URL(url).pathname,
  '/internal/blofy-stream/ops/mirror-intake/preflight');
 assert.equal(opts.method,'POST');
 assert.equal(opts.headers.authorization,'Bearer '+KEY);
 assert.equal(opts.headers['x-blofy-owner-action'],'probe-private-mirror-intake');
 assert.deepEqual(JSON.parse(opts.body),{
  kind:'episode',id:'123456',ownerConfirmed:true,
  licenseReference:'licensed-storage-2026'});
 assert.equal(r.body.mediaBytesTransferred,0);
});
test('stage and cancel now send their REQUIRED private owner headers',async()=>{
 const {calls,portal}=fixture();
 await portal.opsMirrorIntakeStage({kind:'movie',id:'555',ownerConfirmed:true});
 await portal.opsMirrorIntakeCancel({kind:'movie',id:'555',ownerConfirmed:true});
 assert.deepEqual(calls.map(x=>x.opts.headers['x-blofy-owner-action']),[
  'stage-private-mirror-intake',
  'cancel-private-mirror-intake'
 ]);
});
test('invalid body cannot reach Portal and cannot fake provider URLs',async()=>{
 const {calls,portal}=fixture();
 for(const body of [
  {kind:'movie',id:'../../bad',ownerConfirmed:true,licenseReference:'licensed-storage-2026'},
  {kind:'live',id:'1',ownerConfirmed:true,licenseReference:'licensed-storage-2026'},
  {kind:'episode',id:'123',ownerConfirmed:false,licenseReference:'licensed-storage-2026'},
  {kind:'movie',id:'133',ownerConfirmed:true,licenseReference:'pw'},
  {kind:'movie',id:'133',ownerConfirmed:true,licenseReference:'http://evil.invalid/?pw=secret'}
 ]){
  const result=await portal.opsMirrorIntakePreflight(body);
  assert.equal(result.status,400);
 }
 assert.equal(calls.length,0);
});
test('owner UI has size probe action but NO automatic copy permission',async()=>{
 const html=renderOperatorDashboard('mirror-preflight-nonce');
 for(const text of ['فحص الحجم والتخزين','ops-mirror-preflight',
  'ops/mirror-intake/preflight','مرجع تصريح التخزين',
  'لم يبدأ تنزيل أي ملف','out.copyWorkerEnabled!==false'])
  assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/copyWorkerEnabled\s*:\s*true/);
 const code=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.ok(code.includes("path==='/operator/api/ops/mirror-intake/preflight'?'ops-mirror-preflight'"));
 assert.ok(code.includes("portal.opsMirrorIntakePreflight(data)"));
 assert.ok(code.indexOf("ops-mirror-preflight")>
  code.indexOf("if(req.method==='POST'&&path.startsWith('/operator/api/')"));
});

test('bounded mirror start and pause are owner-confirmed and strongly signed',async()=>{
 const {calls,portal}=fixture();
 const start=await portal.opsMirrorIntakeStart({
  kind:'movie',id:'2222',ownerConfirmed:true});
 const pause=await portal.opsMirrorIntakePause({ownerConfirmed:true});
 assert.equal(start.status,200);assert.equal(pause.status,200);
 assert.deepEqual(calls.slice(-2).map(x=>x.opts.headers['x-blofy-owner-action']),[
  'start-licensed-private-mirror','pause-licensed-private-mirror']);
 assert.deepEqual(calls.slice(-2).map(x=>new URL(x.url).pathname),[
  '/internal/blofy-stream/ops/mirror-intake/start',
  '/internal/blofy-stream/ops/mirror-intake/pause']);
 for(const bad of [
  {kind:'movie',id:'../../etc',ownerConfirmed:true},
  {kind:'episode',id:'abc',ownerConfirmed:true},
  {kind:'movie',id:'2222',ownerConfirmed:false}
 ])assert.equal((await portal.opsMirrorIntakeStart(bad)).status,400);
 assert.equal((await portal.opsMirrorIntakePause({ownerConfirmed:false})).status,400);
 assert.equal(calls.length,2);
});
test('operator endpoint and UI never auto-trigger customer playback cutover',async()=>{
 const code=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 for(const x of [
  "path==='/operator/api/ops/mirror-intake/start'?'ops-mirror-start'",
  "path==='/operator/api/ops/mirror-intake/pause'?'ops-mirror-pause'",
  "portal.opsMirrorIntakeStart(data)",
  "portal.opsMirrorIntakePause(data)"
 ])assert.ok(code.includes(x),x);
 const page=renderOperatorDashboard('test-nonce');
 for(const x of ['ops-mirror-start','ops-mirror-pause',
  'library-mirror-copy-pause','بدء نقل 16 جزءًا كحد أقصى',
  'لا تتغير أكواد العملاء'])assert.ok(page.includes(x),x);
});

test('daily readiness planner is strictly GET, owner-only and never copies video',async()=>{
 const {calls,portal}=fixture();
 const out=await portal.opsMirrorDailyPlan();
 assert.equal(out.status,200);
 assert.equal(calls.length,1);
 assert.equal(new URL(calls[0].url).pathname,
  '/internal/blofy-stream/ops/mirror-intake/daily-plan');
 assert.equal(calls[0].opts.method,'GET');
 assert.equal(calls[0].opts.headers.authorization,'Bearer '+KEY);
 assert.equal(calls[0].opts.body,undefined);
 const src=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.ok(src.includes("'/operator/api/ops/mirror-intake/daily-plan':()=>portal.opsMirrorDailyPlan()"));
 const html=renderOperatorDashboard('nonce-test-plan');
 assert.ok(html.includes('library-mirror-daily-plan-refresh'));
 assert.ok(html.includes('library-mirror-daily-plan-status'));
 assert.ok(html.includes('api("ops/mirror-intake/daily-plan")'));
 assert.ok(html.includes('data.automaticDownload!==false'));
});

test('private copy history is signed GET and owner UI shows persisted progress',async()=>{
 const {calls,portal}=fixture();
 await portal.opsMirrorCopyHistory();
 assert.equal(calls.length,1);
 assert.equal(new URL(calls[0].url).pathname,
  '/internal/blofy-stream/ops/mirror-intake/history');
 assert.equal(calls[0].opts.method,'GET');
 assert.equal(calls[0].opts.headers.authorization,'Bearer '+KEY);
 assert.equal(calls[0].opts.body,undefined);
 const src=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.ok(src.includes("'/operator/api/ops/mirror-intake/history':()=>portal.opsMirrorCopyHistory()"));
 const html=renderOperatorDashboard('history-ui-nonce');
 for(const value of ['library-mirror-history-refresh',
  'library-mirror-history-status','ops/mirror-intake/history',
  'state.providerRequests!==0','state.customerCutover!==false'])
  assert.ok(html.includes(value),value);
});
