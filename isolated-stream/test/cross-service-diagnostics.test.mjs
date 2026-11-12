import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import vm from 'node:vm';
import {createStreamCrossServiceDiagnosis} from '../src/cross-service-diagnostics.mjs';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const sampleQuality={
  ok:true,windowMinutes:60,started:48,failed:8,interrupted:3,
  p95StartMs:7200,slowStarts:5,
  providerCodes:{'403':2,'429':3,'502':4,'504':1,
    '777':'SECRET_SOURCE_URL'},
  byReason:{upstream_http_403:2,upstream_http_429:3,
    catalog_item_unavailable:1,gateway_auth_denied:2,
    'token=https://secret.provider.private':'NEVER_REVEAL'},
  rawUrl:'https://secret.provider.private/stream?password=NEVER_REVEAL',
  recentIssues:[{itemId:41253,password:'NEVER_REVEAL'}]
};
const sampleCapacity={
  ok:true,sourceCount:3,accountCountsAvailable:true,
  directHttpTransferMeasurementAvailable:true,
  directHttpTransferCountsReliable:true,
  activeDirectHttpMediaTransfers:8,activeDirectLiveHttpTransfers:5,
  summary:{restricted:1,unknown:1},
  sources:[{name:'customer-password-NEVER_REVEAL',
    url:'https://secret.provider.private/stream?password=NEVER_REVEAL',
    activeGatewayAccounts:400}]
};
const fanout={
  enabled:true,sharedLiveEnabled:true,activeTickets:2,
  fanout:{activeFeeds:2,viewers:6,providerFailures:3,
    sourceUrl:'https://secret.provider.private?token=NEVER_REVEAL'}
};
const paths={ok:true,items:[
  {path:'live-aaaaaaaaaaaa',connections:1,sourceUrl:'https://secret.provider.private'},
  {path:'live-bbbbbbbbbbbb',connections:2,title:'NEVER_REVEAL'}]};

test('cross-service monitors real different layers without double counting or leaking secrets',async()=>{
  const ops=createStreamCrossServiceDiagnosis({
    portal:{
      mediaQuality:async()=>({status:200,body:sampleQuality}),
      sourceCapacity:async()=>({status:200,body:sampleCapacity})
    },relayStats:()=>fanout,restreamPaths:()=>paths
  });
  const report=await ops.snapshot();
  assert.equal(report.ok,true);
  assert.equal(report.status,'partial');
  assert.equal(report.observations.mediaMtx.dataAvailable,false);
  assert.equal(report.allServicesVerified,false);
  assert.equal(report.actualUniqueViewersMeasured,false);
  assert.equal(report.canSumAcrossLayers,false);
  assert.equal(report.observations.gateway.attemptedMediaStarts,48);
  assert.equal(report.observations.gateway.failed,8);
  assert.equal(report.observations.gateway.p95StartupMs,7200);
  assert.equal(report.observations.direct.activeMedia,8);
  assert.equal(report.observations.direct.activeLive,5);
  assert.equal(report.observations.relay.attachedReaders,6);
  assert.equal(report.observations.operatorHls.activePathReaders,3);
  assert.equal(report.observations.providerLimits.restricted,1);
  assert.equal(report.observations.edge.dataAvailable,false);
  assert.equal(report.observations.mediaMtx.dataAvailable,false);
  assert.equal(report.observations.gateway.providerCodes['777'],undefined);
  assert.ok(report.problems.some(x=>x.code==='provider_admission_refused'&&x.count===5));
  assert.ok(report.problems.some(x=>x.code==='provider_upstream_transient'&&x.count===5));
  assert.ok(report.problems.some(x=>x.code==='relay_provider_failures'&&x.count===3));
  const serialized=JSON.stringify(report);
  for(const secret of ['NEVER_REVEAL','secret.provider.private','password=','customer-password','token='])
    assert.ok(!serialized.includes(secret),'secret leak '+secret);
});

test('unavailable portal is unknown, not zero connections or a false healthy report',async()=>{
  const ops=createStreamCrossServiceDiagnosis({
    portal:{
      mediaQuality:async()=>{throw Error('SECRET: https://provider.example?password=bad')},
      sourceCapacity:async()=>({status:503,body:{ok:false,code:'source_offline'}})
    },relayStats:()=>({enabled:true,fanout:{viewers:2,activeFeeds:1}}),
    restreamPaths:()=>({ok:true,items:[]})
  });
  const result=await ops.snapshot();
  assert.equal(result.status,'partial');
  assert.equal(result.observations.direct.activeMedia,null);
  assert.equal(result.observations.gateway.failed,null);
  assert.equal(result.observations.relay.attachedReaders,2);
  assert.equal(result.observations.operatorHls.activePathReaders,0);
  assert.equal(result.allServicesVerified,false);
  assert.ok(!JSON.stringify(result).includes('provider.example'));
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});

test('fast concurrent operator refresh shares two fixed bridge calls and 15-second cache',async()=>{
  let now=10000,qualityReads=0,capacityReads=0;
  const ops=createStreamCrossServiceDiagnosis({
    portal:{
      mediaQuality:async()=>{qualityReads++;await new Promise(r=>setTimeout(r,10));
        return {status:200,body:sampleQuality}},
      sourceCapacity:async()=>{capacityReads++;await new Promise(r=>setTimeout(r,10));
        return {status:200,body:sampleCapacity}}
    },relayStats:()=>fanout,restreamPaths:()=>paths,
    clock:()=>now,cacheMs:15000
  });
  const burst=await Promise.all(Array.from({length:30},()=>ops.snapshot()));
  assert.equal(qualityReads,1);
  assert.equal(capacityReads,1);
  assert.ok(burst.every(x=>x===burst[0]));
  await ops.snapshot();assert.equal(qualityReads,1);
  now+=15001;
  await ops.snapshot();assert.equal(qualityReads,2);
  assert.equal(capacityReads,2);
});

test('zero failures never proves all layers healthy; missing relay/MediaMTX and edge stay unknown',async()=>{
  const ops=createStreamCrossServiceDiagnosis({
    portal:{
      mediaQuality:async()=>({status:200,body:{ok:true,started:0,failed:0,
        providerCodes:{},byReason:{}}}),
      sourceCapacity:async()=>({status:200,body:{ok:true,
        directHttpTransferMeasurementAvailable:true,activeDirectHttpMediaTransfers:0,
        activeDirectLiveHttpTransfers:0}})
    },relayStats:()=>null,restreamPaths:()=>null
  });
  const result=await ops.snapshot();
  assert.equal(result.status,'partial');
  assert.equal(result.observations.direct.activeMedia,0);
  assert.equal(result.observations.relay.attachedReaders,null);
  assert.equal(result.observations.operatorHls.activePathReaders,null);
  assert.equal(result.problems.length,0);
});

test('operator-only route enforces Basic auth; no POST/write and no raw bridge credentials in JSON',async()=>{
  const token='test-stream-operator-password-long-enough-2026';
  const bridge='test-portal-bridge-secret-at-least-forty-chars-2026';
  let calls=[];
  const dashboard=createOperatorDashboard({
    adminToken:token,unifiedSecret:bridge,engineOrigin:'http://127.0.0.1:9',
    sharedRelayStats:()=>fanout,
    liveSupervisor:{list:()=>paths},
    fetchImpl:async(url,opts)=>{
      calls.push({url:String(url),method:opts.method,
        bearer:opts.headers?.authorization});
      if(String(url).endsWith('/media-quality'))
        return new Response(JSON.stringify(sampleQuality),{status:200});
      if(String(url).endsWith('/source-capacity'))
        return new Response(JSON.stringify(sampleCapacity),{status:200});
      throw Error('unapproved_url');
    }
  });
  const server=createServer((req,res)=>{
    if(dashboard.handle(req,res))return;
    res.writeHead(404);res.end();
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const origin='http://127.0.0.1:'+server.address().port;
    const unauthenticated=await fetch(origin+'/operator/api/cross-service');
    assert.equal(unauthenticated.status,401);
    assert.equal(calls.length,0);
    const authorization='Basic '+Buffer.from('operator:'+token).toString('base64');
    const denied=await fetch(origin+'/operator/api/cross-service',{
      method:'POST',headers:{authorization,'content-type':'application/json'},
      body:'{}'});
    assert.equal(denied.status,404);
    const allowed=await fetch(origin+'/operator/api/cross-service',{headers:{authorization}});
    assert.equal(allowed.status,200);
    assert.equal(allowed.headers.get('cache-control'),'no-store');
    const payload=await allowed.json();
    assert.equal(payload.observations.direct.activeMedia,8);
    assert.equal(calls.length,2);
    assert.ok(calls.every(x=>x.url.startsWith(
      'https://blofy-activation-portal-production.up.railway.app/internal/blofy-stream/')));
    assert.ok(calls.every(x=>x.method==='GET'&&x.bearer==='Bearer '+bridge));
    assert.ok(!JSON.stringify(payload).includes(bridge));
    assert.ok(!JSON.stringify(payload).includes(token));
    assert.ok(!JSON.stringify(payload).includes('NEVER_REVEAL'));
  }finally{
    server.closeAllConnections();
    await new Promise(r=>server.close(r));
  }
});

test('Arabic operator panel gives distinct scope and valid CSP nonce JavaScript',()=>{
  const html=renderOperatorDashboard('cross-qa-nonce');
  for(const id of ['cross-service-panel','cross-service-refresh',
    'cross-service-status','cross-direct','cross-relay','cross-hls',
    'cross-started','cross-failed','cross-p95','cross-service-coverage',
    'cross-service-issues','cross-service-check'])
    assert.ok(html.includes('id="'+id+'"'),id+' absent');
  assert.match(html,/لا تجمع هذه الأعداد/);
  assert.match(html,/مؤشرات Edge تقيس طلبات HTTP/);
  for(const id of ['cross-mediamtx-hls','cross-mediamtx-paths','cross-mediamtx-status'])
    assert.ok(html.includes('id="'+id+'"'),id+' absent');
  assert.match(html,/mtx\.hlsSessions/);
  assert.match(html,/جلسة MediaMTX HLS ليست مشاهدًا فريدًا/);
  assert.match(html,/async function loadCrossService\(/);
  const script=html.match(/<script nonce="cross-qa-nonce">([\s\S]*?)<\/script>/);
  assert.ok(script,'CSP script missing');
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
