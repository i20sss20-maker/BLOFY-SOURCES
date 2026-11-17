import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnifiedPortalClient} from '../src/unified-portal-client.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
import {readFile} from 'node:fs/promises';

test('BLOFY STREAM operator has a read-only 04:00 Riyadh receipt panel',()=>{
 const html=renderOperatorDashboard('test_nonce');
 for(const id of ['library-daily-catalog-panel',
  'library-daily-catalog-status','library-daily-catalog-refresh',
  'library-daily-catalog-receipts'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/ops\/daily-catalog/);
 assert.match(html,/4:00 صباحًا/);
 assert.match(html,/لا تنقل ملفات الأفلام والحلقات إلى S3/);
 assert.match(html,/جار استيراد الفهرس/);
 assert.match(html,/اكتمل جزئيًا/);
 assert.doesNotMatch(html,/daily-catalog.*POST/);
});
test('fixed signed daily receipt client never accepts user source URL',async()=>{
 const calls=[],KEY='t'.repeat(44);
 const api=createUnifiedPortalClient({secret:KEY,fetchImpl:async(url,opts)=>{
  calls.push({url:String(url),opts});
  return Response.json({ok:true,enabled:true,receipts:[],
   scope:'catalog_metadata_only_no_media_copy',
   mediaFilesCopied:0,customerCutover:false});
 }});
 const res=await api.opsDailyCatalogStatus();
 assert.equal(res.status,200);
 assert.equal(res.body.mediaFilesCopied,0);
 assert.equal(calls.length,1);
 assert.ok(calls[0].url.endsWith('/ops/daily-catalog'));
 assert.equal(calls[0].opts.headers.authorization,'Bearer '+KEY);
 assert.equal(calls[0].opts.method,'GET');
});
test('daily status is present only in Basic-authenticated operator route group',async()=>{
 const src=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.match(src,/\x27\/operator\/api\/ops\/daily-catalog\x27:/);
 const ix=src.indexOf("'/operator/api/ops/daily-catalog'");
 assert.ok(ix>src.indexOf("const readable={"));
 assert.equal(src.includes('app.get("/daily-catalog"'),false);
});

test('owner daily panel marks overdue queued/running receipts without suggesting automatic retries',()=>{
 const html=renderOperatorDashboard('test_nonce');
 assert.match(html,/queued_over_one_hour_review_required/);
 assert.match(html,/running_over_six_hours_review_required/);
 assert.match(html,/needsOperatorReview===true/);
 assert.match(html,/لم يبدأ فحص السجل أي استيراد جديد/);
 assert.match(html,/أكثر من 6 ساعات/);
 assert.doesNotMatch(html,/fetch\("\/operator\/api\/ops\/daily-catalog",\{method:"POST"/);
});
