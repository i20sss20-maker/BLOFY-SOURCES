import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {summarizeOperatorRestreamPaths} from '../src/restream-operator-health.mjs';
import {createStreamCrossServiceDiagnosis} from '../src/cross-service-diagnostics.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const now=1_800_000_000_000;
const secretPath='live-deadbeef0042';
const sourceUrl='https://secret-source.invalid/get.php?username=privateuser&password=NEVERLEAK';
const fake={
 ok:true,maxSharedReaders:24,
 items:[
  {name:secretPath,title:sourceUrl,sourceId:sourceUrl,
   channelId:854923,url:sourceUrl,playlist:'/operator/api/live/'+secretPath,
   connections:3,failovers:2,backupConfigured:true,
   lastError:'restream_switched_source',
   lastProbe:{at:now-1000,ok:true,code:'ok',rawResponse:sourceUrl}},
  {name:'live-secret2',connections:1,failovers:0,backupConfigured:false,
   lastError:sourceUrl,lastProbe:{at:now-10000,ok:false,
     code:'restream_provider_denied',password:'NEVERLEAK'}},
  {name:'live-secret3',connections:0,failovers:0,probePending:true,
   lastProbe:{at:now-100,ok:false,code:'restream_invalid_media'}},
  {name:'live-secret4',connections:0,failovers:1,
   lastProbe:{at:now-500001,ok:false,code:'restream_hls_unavailable'}},
  {name:'live-secret5',connections:0,failovers:0,
   lastProbe:null}
 ]};

test('read-only path snapshot counts actual operator-only readers, recent failures and backup/failovers',()=>{
 const result=summarizeOperatorRestreamPaths(fake,{now});
 assert.equal(result.dataAvailable,true);
 assert.equal(result.monitoredPaths,5);
 assert.equal(result.activeOperatorReaders,4);
 assert.equal(result.failedRecentPaths,1);
 assert.equal(result.pendingProbes,1);
 assert.equal(result.unverifiedPaths,1);
 assert.equal(result.staleProbePaths,1);
 assert.equal(result.backupConfiguredPaths,1);
 assert.equal(result.failoversSinceBoot,3);
 assert.equal(result.maxSharedReadersPerPath,24);
 assert.deepEqual(result.paths.map(x=>x.state),[
   'first_bytes_verified','probe_failed','checking','probe_stale','unverified']);
 assert.deepEqual(result.paths.map(x=>x.slot),[1,2,3,4,5]);
 assert.equal(result.paths[0].mediaFirstBytesVerified,true);
 assert.equal(result.paths[1].lastErrorCode,'restream_provider_denied');
 assert.equal(result.paths[0].decodedAudioVideoVerified,false);
 assert.equal(result.countsAreUniqueViewers,false);
 assert.equal(result.independentEngineMonitored,false);
 assert.equal(result.customerTrafficChanged,false);
 const serialized=JSON.stringify(result);
 for(const forbidden of ['NEVERLEAK','secret-source.invalid','privateuser',
   '854923',secretPath,'playlist','channelId','sourceId'])
   assert.ok(!serialized.includes(forbidden),'unredacted restream data: '+forbidden);
});

test('failed probe turns stale after 5min; a pending probe does not count as failure',()=>{
 let snapshot=summarizeOperatorRestreamPaths(fake,{now:now+300000});
 assert.equal(snapshot.failedRecentPaths,0);
 assert.equal(snapshot.staleProbePaths,2);
 assert.equal(snapshot.pendingProbes,1);
 assert.equal(snapshot.paths[1].lastErrorCode,'restream_provider_denied');
 assert.equal(snapshot.paths[1].state,'probe_stale');
});

test('invalid supervisor data fails closed and never becomes zero active readers',()=>{
 const result=summarizeOperatorRestreamPaths({ok:false,items:fake.items},{now});
 assert.equal(result.dataAvailable,false);
 assert.equal(result.activeOperatorReaders,null);
 assert.equal(result.failedRecentPaths,null);
 assert.deepEqual(result.paths,[]);
 assert.throws(()=>summarizeOperatorRestreamPaths(fake,{now,maxProbeAgeMs:10}),
   /restream_health_config_invalid/);
});

test('bounded output never lets more than 32 supervisor rows or corrupt counts into reports',()=>{
 const many={ok:true,maxSharedReaders:2048,items:Array.from({length:200},(_,i)=>({
   name:secretPath+i,connections:9999999,failovers:-1,
   lastProbe:{at:now-70000,ok:false,code:'restream_unknown_secret_NEVERLEAK'},
   lastError:sourceUrl
 }))};
 const result=summarizeOperatorRestreamPaths(many,{now});
 assert.equal(result.paths.length,32);
 assert.equal(result.monitoredPaths,32);
 assert.equal(result.pathsTruncated,true);
 assert.equal(result.activeOperatorReaders,0);
 assert.equal(result.failoversSinceBoot,0);
 assert.equal(result.failedRecentPaths,32);
 assert.equal(result.paths[0].lastErrorCode,null);
 assert.ok(!JSON.stringify(result).includes('NEVERLEAK'));
});

test('cross-service alerts count recent operator failures separately from provider or HTTP errors',async()=>{
 const monitor=createStreamCrossServiceDiagnosis({
   portal:{mediaQuality:async()=>({status:200,body:{ok:true,started:0,failed:0,providerCodes:{},byReason:{}}}),
     sourceCapacity:async()=>({status:200,body:{ok:true,
       directHttpTransferMeasurementAvailable:true,activeDirectHttpMediaTransfers:1}})},
   relayStats:()=>({enabled:true,fanout:{viewers:1,activeFeeds:1,providerFailures:0}}),
   restreamPaths:()=>fake,clock:()=>now,
   mediaControl:{overview:async()=>({configured:true,online:true,readyPaths:1,hlsSessions:1})},
   edgeMetrics:async()=>({ok:true,body:{ok:true,
     scope:'one_xtream_edge_bun_instance_origin_headers_only',lastFiveMinutes:{requests:0,errors5xx:0}}})
 });
 const report=await monitor.snapshot();
 assert.equal(report.ok,true);
 assert.equal(report.observations.operatorRestream.activeOperatorReaders,4);
 assert.equal(report.observations.operatorHls.activePathReaders,4);
 assert.equal(report.observations.operatorRestream.failedRecentPaths,1);
 assert.equal(report.status,'attention');
 assert.ok(report.problems.some(x=>x.scope==='operator_restream_recent'&&
   x.code==='operator_restream_recent_probe_failure'&&x.count===1));
 assert.equal(report.canSumAcrossLayers,false);
 assert.ok(!JSON.stringify(report).includes('NEVERLEAK'));
});

test('operator page is CSP-safe, Arabic and displays only enumerated restream rows',()=>{
 const html=renderOperatorDashboard('restream-health-nonce');
 for(const id of ['restream-path-diagnostics','restream-health-summary','restream-health-rows'])
   assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/p\.latestProbeAgeSeconds/);
 assert.match(html,/p\.failoversSinceBoot/);
 assert.match(html,/لا يجري فحص فيديو جديدًا/);
 assert.match(html,/operator_restream_recent_probe_failure/);
 const s=html.match(/<script nonce="restream-health-nonce">([\s\S]*?)<\/script>/);
 assert.ok(s);
 assert.doesNotThrow(()=>new vm.Script(s[1]));
});
