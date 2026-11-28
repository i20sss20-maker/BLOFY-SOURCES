import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createPlatformSystemAudit} from '../src/platform-system-audit.mjs';
import {createStreamServer} from '../src/server.mjs';
const sourceId='f60487ab-a652-4639-a4ae-855de68e7802';
const ok=body=>({status:200,body:{ok:true,...body}});
function fixture(){
 let calls={},clockMs=Date.parse('2026-11-12T09:00:00Z');
 const count=name=>{calls[name]=(calls[name]||0)+1};
 const portal={
  async overview(){count('overview');return ok({
   sources:[{id:sourceId,name:'saleh',enabled:true,status:'online'},
    {id:'5b92ef45-3552-4ef3-a622-36b37653c99f',name:'backup',enabled:false,status:'offline'}],
   totals:{servers:2,enabled:1,online:1,live:9000,movie:24000,series:5000},
   subscribers:{gateway:{total:120,active:105}}
  })},
  async mediaFailures(){count('mediaFailures');return ok({entries:[
    {kind:'movie',state:'missing',count:4,due:2},
    {kind:'series',state:'recovered',count:6,due:0}
   ]})},
  async salesSummary(){count('salesSummary');return ok({totals:{total:30},expiring_soon:4})},
  async libraryAIStatus(){count('libraryAIStatus');return ok({configured:false})},
  async mediaQuality(){count('mediaQuality');return ok({
    started:38,failed:7,p95StartMs:9200,slowStarts:9,
    byKind:{
      live:{started:24,failed:5,interrupted:2},
      movie:{started:10,failed:1,interrupted:0},
      series:{started:4,failed:1,interrupted:0}
    }
  })},
  async opsSourceStats({sourceId:id}){count('opsSourceStats');assert.equal(id,sourceId);
    return ok({liveSourceCapacity:{maxConnections:1,activeConnections:1,
      restreamer:true,sourceAccountSharedByCodes:true},
      livePlayback:{started:20,failed:5,interrupted:2,
      slowStarts:3,p95StartMs:8200,clientOrProxyClosed:4}})}
 };
 const audit=createPlatformSystemAudit({
  portal,
  engineStatus:async()=>{count('engineStatus');return {reachable:true,httpStatus:404}},
  mediaControl:{overview:async()=>{count('mediaControl');return {online:true,readyPaths:3,hlsSessions:2}}},
  autoHealth:()=>({ok:true,totals:{paths:3,healthy:2,failed:1,warning:0}}),
  relayStats:()=>({enabled:true,fanout:{activeFeeds:2,viewers:10,providerFailures:1}}),
  clock:()=>clockMs,
  cacheMs:30000
 });
 return {audit,calls,advance:ms=>{clockMs+=ms}};
}
test('full audit aggregates existing safe summaries without media playback or mutations',async()=>{
 const f=fixture();
 const [a,b]=await Promise.all([f.audit.audit(),f.audit.audit()]);
 assert.equal(a.ok,true);assert.equal(a.readOnly,true);
 assert.equal(a.customerTrafficChanged,false);
 assert.equal(a.mediaBytesFetched,false);
 assert.equal(a.checks.length,24);
 assert.deepEqual(a,b,'concurrent callers coalesce into one audit');
 assert.equal(f.calls.overview,1);
 assert.equal(f.calls.opsSourceStats,1);
 assert.equal(a.source.id,sourceId);
 const c=id=>a.checks.find(x=>x.id===id);
 assert.equal(c('sources').status,'ok');
 assert.equal(c('catalog_movie').metrics.items,24000);
 assert.equal(c('media404').status,'warning');
 assert.equal(c('media404').metrics.missing,4);
 assert.equal(c('playback').status,'warning');
 assert.equal(c('playback').metrics.failed,5);
 assert.equal(c('sourceCapacity').status,'warning');
 assert.equal(c('sourceCapacity').metrics.maxConnections,1);
 assert.equal(c('sourceCapacity').metrics.activeConnections,1);
 assert.equal(c('quality_live').status,'warning');
 assert.equal(c('quality_live').metrics.started,24);
 assert.equal(c('quality_movie').status,'ok');
 assert.equal(c('quality_series').status,'ok');
 assert.equal(c('quality_startup').status,'warning');
 assert.equal(c('quality_startup').metrics.p95StartMs,9200);
 assert.equal(c('restream').status,'warning');
 assert.equal(c('engine').status,'ok');
 assert.equal(c('mediamtx').status,'ok');
 assert.equal(c('audio').status,'unknown');
 assert.equal(c('subtitles').status,'unknown');
 assert.equal(c('episodes').status,'unknown');
 assert.equal(c('backup').status,'unknown');
 assert.ok(a.summary.warning>=3);
 assert.doesNotMatch(JSON.stringify(a),/password|authToken|secret|bearer|api_key/i);
 assert.equal((await f.audit.audit()).cacheHit,true);
 assert.equal(f.calls.overview,1);
 f.advance(31000);
 await f.audit.audit();
 assert.equal(f.calls.overview,2);
});
test('failure to connect never presents healthy playback or false-green diagnostics',async()=>{
 const audit=createPlatformSystemAudit({
  portal:{
   overview:async()=>({status:503,body:{ok:false,code:'service_unreachable'}}),
   mediaFailures:async()=>({status:503,body:{ok:false}}),
   salesSummary:async()=>({status:502,body:{ok:false}}),
   libraryAIStatus:async()=>({status:503,body:{ok:false}}),
   mediaQuality:async()=>({status:503,body:{ok:false}}),
   opsSourceStats:async()=>{throw Error('must not be called')}
  },
  engineStatus:async()=>({reachable:false,httpStatus:null}),
  mediaControl:{overview:async()=>({online:false})},
  autoHealth:()=>({ok:false}),
  relayStats:()=>({enabled:false})
 });
 const result=await audit.audit();
 assert.equal(result.ok,true);
 for(const id of ['bridge','sources','playback','quality_live','quality_startup',
  'catalog_live','catalog_series','episodes'])
  assert.equal(result.checks.find(x=>x.id===id).status,'unknown');
 assert.equal(result.checks.find(x=>x.id==='engine').status,'warning');
 assert.equal(result.checks.find(x=>x.id==='mediamtx').status,'warning');
 assert.equal(result.summary.ok,0);
 assert.equal((await audit.audit({sourceId:'../../admin'})).code,'platform_audit_source_invalid');
});
test('full operational audit is operator-authenticated, read-only and never exposes credentials',async()=>{
 const secret='blofy-nextgen-test-operator-credential-1234567890';
 const {app}=createStreamServer({adminToken:secret});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 const url='http://127.0.0.1:'+app.address().port;
 try{
  const no=await fetch(url+'/operator/api/full-audit');
  assert.equal(no.status,401);
  const basic='Basic '+Buffer.from('operator:'+secret).toString('base64');
  const bad=await fetch(url+'/operator/api/full-audit?sourceId=evil',{headers:{authorization:basic}});
  assert.equal(bad.status,400);
  const r=await fetch(url+'/operator/api/full-audit',{headers:{authorization:basic}});
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.readOnly,true);
  assert.equal(body.mediaBytesFetched,false);
  assert.equal(body.checks.find(x=>x.id==='audio').status,'unknown');
  assert.doesNotMatch(JSON.stringify(body),/username|password|sourceUrl|secret|credential|m3u/i);
  const page=await(await fetch(url+'/operator',{headers:{authorization:basic}})).text();
  for(const id of ['deep-audit-panel','deep-audit-run','deep-audit-items','deep-audit-status'])
    assert.ok(page.includes('id="'+id+'"'));
  assert.match(page,/api\("full-audit"/);
  assert.match(page,/renderChecks\(\)/);
  assert.equal((await fetch(url+'/operator/api/full-audit',{method:'POST',
    headers:{authorization:basic}})).status,404);
 }finally{await new Promise(resolve=>app.close(resolve))}
});

test('incident recommendations are bounded, evidence-based and never auto-apply changes',async()=>{
 const f=fixture(),data=await f.audit.audit();
 assert.ok(data.recommendations.length>=2);
 assert.equal(data.recommendations[0].priority,'high');
 assert.ok(data.recommendations.some(x=>x.code==='recent_playback_failures'));
 assert.equal(data.recommendations.every(x=>x.requiresApproval&&x.automatedChange===false),true);
 assert.doesNotMatch(JSON.stringify(data.recommendations),
   /https?:\/\/|password|secret|token|credentials|userName/i);
 const html=await (async()=>{
   const {renderOperatorDashboard}=await import('../src/operator-unified-view.mjs');
   return renderOperatorDashboard('examplenonce');
 })();
 assert.match(html,/id="deep-audit-recommendations"/);
 assert.match(html,/result\.recommendations/);
 assert.match(html,/لا توجد توصيات جديدة/);
});

test('series diagnostic is bounded to one validated source and mapped episode IDs',async()=>{
 const {renderOperatorDashboard}=await import('../src/operator-unified-view.mjs');
 const html=renderOperatorDashboard('noncecheck');
 for(const id of ['series-episode-diagnostic-panel','diagnostic-series-id',
   'diagnostic-episode-map-run','diagnostic-episode-map-status','diagnostic-episode-map-results'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/\/\^\[A-Za-z0-9\._-\]\{1,100\}\$\/\.test\(seriesId\)/);
 assert.match(html,/api\("episodes\?"/);
 assert.match(html,/items\.slice\(0,120\)/);
 assert.match(html,/لا يثبت تشغيل كل حلقة/);
 const sc=html.match(/<script nonce="noncecheck">([\s\S]*?)<\/script>/);
 assert.ok(sc);assert.doesNotThrow(()=>new Function(sc[1]));
});

test('release metadata is diagnostic only, even when the manifest matches the app',async()=>{
 const releaseInspector={inspect:async()=>({ok:true,metadataConsistent:true,
   packageName:'tv.blofy.player.v2.stream',versionName:'2.0.0-rc07.55.8.12-STREAM',
   versionCode:2000089,sha256FieldPresent:true,apkBytesVerified:false,
   deviceUpdateTested:false,signatureVerified:false})};
 const noCalls=async()=>({status:503,body:{ok:false}});
 const report=await createPlatformSystemAudit({
  portal:{overview:noCalls,mediaFailures:noCalls,salesSummary:noCalls,
   libraryAIStatus:noCalls,mediaQuality:noCalls},
  releaseInspector,engineStatus:async()=>({reachable:false}),
  mediaControl:{overview:async()=>({online:false})},autoHealth:()=>null
 }).audit();
 const update=report.checks.find(x=>x.id==='appUpdates');
 assert.equal(update.status,'unknown');
 assert.equal(update.code,'release_manifest_consistent_apk_unverified');
 assert.equal(update.metrics.versionCode,2000089);
 assert.equal(update.metrics.apkBytesVerified,false);
});
test('release metadata mismatch is flagged, never treated as a valid app update',async()=>{
 const noCalls=async()=>({status:503,body:{ok:false}});
 const report=await createPlatformSystemAudit({
  portal:{overview:noCalls,mediaFailures:noCalls,salesSummary:noCalls,
   libraryAIStatus:noCalls,mediaQuality:noCalls},
  releaseInspector:{inspect:async()=>({ok:true,metadataConsistent:false,
    versionCode:2000089})},
  engineStatus:async()=>({reachable:false}),
  mediaControl:{overview:async()=>({online:false})},autoHealth:()=>null
 }).audit();
 assert.equal(report.checks.find(x=>x.id==='appUpdates').status,'warning');
});
test('STREAM release safety check requires owner auth and has no mutation endpoint',async()=>{
 const {app}=createStreamServer({adminToken:'blofy-nextgen-release-admin-credential-123456'});
 app.listen(0,'127.0.0.1');await once(app,'listening');
 try{
  const base='http://127.0.0.1:'+app.address().port;
  const denied=await fetch(base+'/operator/api/stream-release');
  assert.equal(denied.status,401);
  const auth='Basic '+Buffer.from('operator:blofy-nextgen-release-admin-credential-123456').toString('base64');
  const notAllowed=await fetch(base+'/operator/api/stream-release',{method:'POST',
   headers:{authorization:auth}});
  assert.equal(notAllowed.status,404);
  const html=await(await fetch(base+'/operator',{headers:{authorization:auth}})).text();
  assert.match(html,/id="stream-release-inspector-panel"/);
  assert.match(html,/id="stream-release-check"/);
  assert.match(html,/id="stream-release-info"/);
  assert.match(html,/api\("stream-release"\)/);
  assert.match(html,/توقيع وبصمة ملفات APK الفعلية/);
 }finally{await new Promise(resolve=>app.close(resolve))}
});
