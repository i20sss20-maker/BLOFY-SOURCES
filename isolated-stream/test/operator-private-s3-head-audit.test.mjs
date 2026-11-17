import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('STREAM owner can inspect one verified S3 movie/episode in 8-part chunks',()=>{
 const html=renderOperatorDashboard('safe_owner_nonce');
 for(const id of ['library-mirror-head-panel','library-head-next',
  'library-head-status'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/فحص أول 8 أجزاء في S3/);
 assert.match(html,/لا يعيد حساب بصمة SHA-256/);
 assert.match(html,/HEAD_object_size_only/);
 assert.match(html,/contentSha256Recomputed!==false/);
 assert.match(html,/اتصال بالمصدر/);
 assert.match(html,/fetchedProviderUrlNotAllowed|mediaBytesTransferred!==0/);
 assert.match(html,/لا نعتبر هذا اختبار تشغيل فيديو/);
 assert.match(html,/row.appendChild\(headCell\)/);
});
test('signed Portal S3 audit client validates only exact media and partStart',async()=>{
 const requests=[];
 const client=createUnifiedPortalClient({secret:'T'.repeat(44),
  fetchImpl:async(url,opts)=>{
   requests.push({url:String(url),opts});
   return Response.json({ok:true});
  }});
 const one=await client.opsPhysicalHeadAudit({kind:'movie',id:'1349410',start:8});
 assert.equal(one.status,200);
 assert.equal(requests.length,1);
 const url=new URL(requests[0].url);
 assert.equal(url.pathname,'/internal/blofy-stream/ops/mirror-physical-head');
 assert.equal(url.searchParams.get('type'),'movie');
 assert.equal(url.searchParams.get('id'),'1349410');
 assert.equal(url.searchParams.get('start'),'8');
 assert.equal(requests[0].opts.method,'GET');
 assert.equal(requests[0].opts.headers.authorization,'Bearer '+'T'.repeat(44));
 for(const bad of [
  {kind:'movie',id:'https://evil.host/resource'},
  {kind:'episode',id:'../../1'},
  {kind:'movie',id:'1349410',start:7},
  {kind:'movie',id:'1349410',start:520},
  {kind:'series',id:'1',start:0}
 ]){
  assert.equal((await client.opsPhysicalHeadAudit(bad)).status,400);
 }
 assert.equal(requests.length,1);
});
test('private physical audit remains behind Basic-authenticated operator routes',async()=>{
 const source=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.ok(source.includes("'/operator/api/ops/mirror-physical-head'"));
 assert.ok(source.includes('portal.opsPhysicalHeadAudit('));
 const i=source.indexOf("'/operator/api/ops/mirror-physical-head'");
 assert.ok(i>source.indexOf('const readable={'));
 assert.ok(!source.includes('/public/mirror-physical-head'));
});
