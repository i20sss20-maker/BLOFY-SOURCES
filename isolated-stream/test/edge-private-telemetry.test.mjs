import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {createEdgeMetricsClient} from '../src/edge-metrics-client.mjs';
import {createStreamCrossServiceDiagnosis} from '../src/cross-service-diagnostics.mjs';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const secret='qa-edge-secret-do-not-deploy-as-a-credential-20261112';
const source=readFileSync(new URL('../edge-function/index.ts',import.meta.url),'utf8');
const base='https://bfy.up.railway.app';
const path='/__blofy_internal/edge-metrics';
const bearer={'x-blofy-edge-observer':secret};
const req=(path,options={})=>new Request(base+path,options);

function startEdge(fetchImpl,initialNow=1800000000000,key=secret){
  let handler,clock=initialNow;
  const Clock=class extends Date{
    static now(){return clock}
  };
  vm.runInNewContext(source,{
    Bun:{env:{PORT:'3000',BLOFY_PUBLIC_XTREAM_HOST:'bfy.up.railway.app',
      BLOFY_STREAM_EDGE_OBSERVABILITY_KEY:key},
      serve:options=>{handler=options.fetch;return {port:3000}}},
    console:{info:()=>{}},Date:Clock,URL,Headers,Request,Response,
    TextEncoder,crypto:webcrypto,fetch:fetchImpl,setTimeout,clearTimeout,
  },{timeout:2000});
  assert.equal(typeof handler,'function');
  return {request:(url,opts)=>handler(req(url,opts)),clock:set=>{clock=set}};
}

test('EDGE private aggregate route cannot be read without long matching key',async()=>{
  let calls=0;
  const edge=startEdge(async()=>{calls++;return new Response('ok',{status:200})});
  for(const options of [{}, {headers:{'x-blofy-edge-observer':'short'}},
    {headers:{'x-blofy-edge-observer':secret+'wrong'}}]){
    const r=await edge.request(path,options);
    assert.equal(r.status,404);
    assert.deepEqual(await r.json(),{error:'not_found'});
  }
  assert.equal((await edge.request(path,{method:'POST',headers:bearer})).status,404);
  const granted=await edge.request(path,{headers:bearer});
  assert.equal(granted.status,200);
  const data=await granted.json();
  assert.equal(data.ok,true);
  assert.equal(data.totalOriginRequestsSinceBoot,0);
  assert.equal(data.countsAreUniqueViewers,false);
  assert.equal(data.mediaBodyConsumptionMeasured,false);
  assert.equal(data.countsAreActiveVideoStreams,false);
  assert.equal(calls,0,'stats access never opens a media or portal request');
  assert.ok(!JSON.stringify(data).includes(secret));
});

test('EDGE measures real HTTP response headers and does not modify media bytes/routes',async()=>{
  const calls=[];
  const edge=startEdge(async(target,options)=>{
    calls.push({url:String(target),options});
    return new Response('test MPEG-TS bytes',{status:200,headers:{'content-type':'video/mp2t'}});
  });
  const movie=await edge.request('/live/secretuser/secretpass/123.ts');
  assert.equal(movie.status,200);
  assert.equal(movie.headers.get('content-type'),'video/mp2t');
  assert.equal(await movie.text(),'test MPEG-TS bytes');
  assert.ok(calls[0].url.includes('/live/secretuser/secretpass/123.ts'));
  assert.equal(calls[0].options.redirect,'manual');
  const legacy=await edge.request('/secretuser/secretpass/123');
  assert.equal(legacy.status,200);
  await legacy.text();
  assert.ok(calls[1].url.includes('/live/secretuser/secretpass/123.ts'));
  const api=await edge.request('/player_api.php?username=secretuser&password=secretpass');
  assert.equal(api.status,200);
  const hls=await edge.request('/hls/user1234/tokenvalue0123456789/1/'+('x'.repeat(60)));
  assert.equal(hls.status,200);
  assert.equal(calls.length,4);
  const stats=await (await edge.request(path,{headers:bearer})).json();
  assert.equal(stats.totalOriginRequestsSinceBoot,4);
  assert.equal(stats.byKind.live,2);
  assert.equal(stats.byKind.api,1);
  assert.equal(stats.byKind.hls,1);
  assert.equal(stats.responseClasses['2xx'],4);
  assert.equal(stats.activeOriginHeaderRequests,0);
  assert.equal(stats.lastFiveMinutes.requests,4);
  assert.equal(stats.p95OriginHeadersMs,0);
  assert.equal(stats.countsAcrossReplicas,false);
  for(const forbidden of ['secretuser','secretpass','123.ts','password=','x'.repeat(50),'tokenvalue'])
    assert.ok(!JSON.stringify(stats).includes(forbidden),'metric leak: '+forbidden);
});

test('EDGE respects no live replay, bounded single VOD retry, denial and no proxy redirect',async()=>{
  const count={};
  const edge=startEdge(async(target,options)=>{
    const kind=new URL(target).pathname.split('/')[1];
    count[kind]=(count[kind]||0)+1;
    if(kind==='live')return new Response('stop',{status:429});
    if(kind==='movie'&&count.movie===1)return new Response('temporary',{status:503});
    if(kind==='series')return new Response(null,{status:302,
      headers:{location:'https://leak.invalid?token=secret'}});
    if(kind==='get.php')throw Error('secret host unavailable');
    return new Response('ok',{status:200});
  });
  assert.equal((await edge.request('/live/u12345/secretpass/1.ts')).status,429);
  assert.equal(count.live,1,'source admission denial must not replay');
  const movie=await edge.request('/movie/u12345/secretpass/1.mp4');
  assert.equal(movie.status,200);
  assert.equal(count.movie,2,'only permitted VOD retry');
  const forbidden=await edge.request('/series/u12345/secretpass/2.mp4');
  assert.equal(forbidden.status,502);
  assert.deepEqual(await forbidden.json(),{error:'origin_redirect_denied'});
  assert.equal(count.series,1);
  const broken=await edge.request('/get.php?username=secretuser&password=secretpass');
  assert.equal(broken.status,502);
  const stats=await(await edge.request(path,{headers:bearer})).json();
  assert.equal(stats.totalOriginRequestsSinceBoot,4);
  assert.equal(stats.sourceAdmissionRefusalsSinceBoot,1);
  assert.equal(stats.upstream5xxSinceBoot,2);
  assert.equal(stats.responseClasses['5xx'],2);
  assert.equal(stats.responseClasses['4xx'],1);
  assert.equal(stats.responseClasses['2xx'],1);
  assert.equal(stats.activeOriginHeaderRequests,0);
  assert.equal(stats.lastFiveMinutes.errors5xx,2);
  assert.ok(!JSON.stringify(stats).includes('leak.invalid'));
  assert.equal((await edge.request('/does-not-exist')).status,404);
  assert.equal((await edge.request('/health')).status,200);
  assert.equal((await(await edge.request(path,{headers:bearer})).json()).totalOriginRequestsSinceBoot,4);
});

test('EDGE 5-minute window expires without losing safe per-instance since-boot totals',async()=>{
  let now=1800000000000;
  const edge=startEdge(async()=>new Response('ok',{status:200}),now);
  assert.equal((await edge.request('/live/u12345/secretpass/1.ts')).status,200);
  edge.clock(now+6*60000);
  const stats=await(await edge.request(path,{headers:bearer})).json();
  assert.equal(stats.lastFiveMinutes.requests,0);
  assert.equal(stats.totalOriginRequestsSinceBoot,1);
});

test('EDGE client uses fixed HTTPS origin and fails closed on missing/mismatched token',async()=>{
  const calls=[];
  const bad=createEdgeMetricsClient({
    fetchImpl:async()=>{throw Error('should not call')},
    key:''
  });
  assert.equal((await bad.snapshot()).code,'edge_metrics_not_configured');
  assert.throws(()=>createEdgeMetricsClient({origin:'http://127.0.0.1:9999/private'}),
    /edge_metrics_config_invalid/);
  const edge=startEdge(async()=>new Response('ok',{status:200}));
  const client=createEdgeMetricsClient({key:secret,
    fetchImpl:async(url,opts)=>{
      calls.push({url,method:opts.method,headers:opts.headers,redirect:opts.redirect});
      return edge.request(path,{method:opts.method,headers:opts.headers});
    }
  });
  const report=await client.snapshot();
  assert.equal(report.ok,true);
  assert.equal(report.body.scope,'one_xtream_edge_bun_instance_origin_headers_only');
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,base+path);
  assert.equal(calls[0].method,'GET');
  assert.equal(calls[0].redirect,'manual');
  assert.equal(calls[0].headers['x-blofy-edge-observer'],secret);
  const unavailable=createEdgeMetricsClient({key:secret,
    fetchImpl:async()=>new Response(JSON.stringify({error:'not_found'}),{status:404})});
  assert.equal((await unavailable.snapshot()).code,'edge_metrics_unavailable');
});

test('cross-service diagnosis only shows allowed EDGE counters, never raw edge payloads',async()=>{
  const injected={
    ok:true,scope:'one_xtream_edge_bun_instance_origin_headers_only',
    activeOriginHeaderRequests:1,lastFiveMinutes:{requests:14,errors5xx:2,admissionRefusals:1},
    p95OriginHeadersMs:140,headerSamples:14,
    username:'secretuser',remoteAddress:'198.51.100.1',
    originalUrl:'https://secrets.invalid/?password=do_not_leak'
  };
  const observer=createStreamCrossServiceDiagnosis({
    portal:{mediaQuality:async()=>({status:200,body:{ok:true,started:1,failed:0,
      providerCodes:{},byReason:{}}}),
      sourceCapacity:async()=>({status:200,body:{ok:true,
        directHttpTransferMeasurementAvailable:true,
        directHttpTransferCountsReliable:true,
        activeDirectHttpMediaTransfers:0,activeDirectLiveHttpTransfers:0}})},
    relayStats:()=>({enabled:true,fanout:{viewers:0,activeFeeds:0,providerFailures:0}}),
    restreamPaths:()=>({ok:true,items:[]}),
    mediaControl:{overview:async()=>({configured:true,online:true,readyPaths:0,hlsSessions:0})},
    edgeMetrics:async()=>({ok:true,body:injected})
  });
  const report=await observer.snapshot();
  assert.equal(report.status,'attention');
  assert.equal(report.observations.edge.dataAvailable,true);
  assert.equal(report.observations.edge.requestsLastFiveMinutes,14);
  assert.equal(report.observations.edge.errors5xxLastFiveMinutes,2);
  assert.equal(report.observations.edge.p95GatewayHeaderMs,140);
  assert.equal(report.observations.edge.measuredMediaViewers,false);
  assert.ok(report.problems.some(p=>p.code==='edge_gateway_5xx_last5m'&&p.count===2));
  for(const secret of ['secretuser','198.51.100.1','secrets.invalid','do_not_leak'])
    assert.ok(!JSON.stringify(report).includes(secret));
});

test('operator HTML shows explicitly non-viewer EDGE HTTP metrics with valid nonce script',()=>{
  const html=renderOperatorDashboard('edge-qa-nonce');
  for(const id of ['cross-edge-requests','cross-edge-errors','cross-edge-p95','cross-edge-status'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/مؤشرات Edge تقيس طلبات HTTP/);
  const script=html.match(/<script nonce="edge-qa-nonce">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
