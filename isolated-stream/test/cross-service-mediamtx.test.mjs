import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createStreamCrossServiceDiagnosis} from '../src/cross-service-diagnostics.mjs';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';

const gateway={ok:true,started:12,failed:0,interrupted:0,
  providerCodes:{},byReason:{}};
const capacity={ok:true,directHttpTransferMeasurementAvailable:true,
  directHttpTransferCountsReliable:true,
  activeDirectHttpMediaTransfers:3,activeDirectLiveHttpTransfers:2};
const relay={enabled:true,sharedLiveEnabled:true,activeTickets:1,
  fanout:{activeFeeds:1,viewers:2,providerFailures:0}};
const operatorPaths={ok:true,items:[{path:'live-aaaaaaaaaaaa',connections:1}]};
function portal(){
  return {mediaQuality:async()=>({status:200,body:gateway}),
    sourceCapacity:async()=>({status:200,body:capacity})};
}
test('MediaMTX HLS sessions measured using the private controller are not unique viewers',async()=>{
  let probes=0;
  const observer=createStreamCrossServiceDiagnosis({
    portal:portal(),relayStats:()=>relay,restreamPaths:()=>operatorPaths,
    mediaControl:{overview:async()=>{probes++;
      return {configured:true,online:true,diagnostics:'connected',
        readyPaths:2,hlsSessions:5,
        paths:[{name:'https://provider.invalid/?password=DO_NOT_LEAK',
          source:{url:'https://private.invalid/token=DO_NOT_LEAK'},
          readers:[{remoteAddr:'192.168.0.3',id:'DO_NOT_LEAK'}]}]};}}
  });
  const out=await observer.snapshot();
  assert.equal(probes,1);
  assert.equal(out.status,'observed_no_recent_faults');
  assert.equal(out.observations.mediaMtx.dataAvailable,true);
  assert.equal(out.observations.mediaMtx.online,true);
  assert.equal(out.observations.mediaMtx.hlsSessions,5);
  assert.equal(out.observations.mediaMtx.readyPaths,2);
  assert.equal(out.observations.mediaMtx.hlsSessionsAreUniqueViewers,false);
  assert.equal(out.observations.mediaMtx.includesWebRtcOrRtspSessions,false);
  assert.equal(out.observations.mediaMtx.includesIndependentRestreamEngine,false);
  assert.equal(out.observations.operatorHls.activePathReaders,1);
  assert.equal(out.observations.relay.attachedReaders,2);
  assert.equal(out.observations.direct.activeMedia,3);
  assert.equal(out.canSumAcrossLayers,false);
  assert.equal(out.actualUniqueViewersMeasured,false);
  assert.equal(out.observations.edge.dataAvailable,false);
  assert.equal(out.allServicesVerified,false);
  for(const secret of ['DO_NOT_LEAK','provider.invalid','private.invalid',
      '192.168.0.3','remoteAddr','token='])
    assert.ok(!JSON.stringify(out).includes(secret),'private controller leak '+secret);
});

test('MediaMTX private auth failure is alert, never fabricated zero sessions',async()=>{
  const observer=createStreamCrossServiceDiagnosis({
    portal:portal(),relayStats:()=>relay,restreamPaths:()=>operatorPaths,
    mediaControl:{overview:async()=>({configured:true,online:false,
      diagnostics:'mediamtx_auth_failed',readyPaths:null,hlsSessions:null,
      error:'https://dont-leak.invalid/?password=SECRET'})}
  });
  const out=await observer.snapshot();
  assert.equal(out.status,'partial');
  assert.equal(out.observations.mediaMtx.online,false);
  assert.equal(out.observations.mediaMtx.hlsSessions,null);
  assert.equal(out.observations.mediaMtx.readyPaths,null);
  assert.equal(out.observations.mediaMtx.diagnostic,'media_engine_auth_failure');
  assert.ok(out.problems.some(row=>row.scope==='mediamtx_current'&&
    row.code==='media_engine_auth_failure'&&row.count===1));
  assert.equal(out.allServicesVerified,false);
  assert.ok(!JSON.stringify(out).includes('dont-leak.invalid'));
  assert.ok(!JSON.stringify(out).includes('SECRET'));
});

test('unconfigured/partial MediaMTX control stays unknown, never zero HLS sessions',async()=>{
  const states=[
    {configured:false,online:false,readyPaths:null,hlsSessions:null},
    {configured:true,online:true,readyPaths:1,hlsSessions:null}
  ];
  for(const state of states){
    const monitor=createStreamCrossServiceDiagnosis({
      portal:portal(),relayStats:()=>relay,restreamPaths:()=>operatorPaths,
      mediaControl:{overview:async()=>state}
    });
    const out=await monitor.snapshot();
    assert.equal(out.status,'partial');
    assert.equal(out.observations.mediaMtx.dataAvailable,false);
    assert.equal(out.observations.mediaMtx.hlsSessions,null);
  }
});

test('Basic-protected endpoint accesses MediaMTX by fixed internal peer only, without returning secrets',async()=>{
  const secret='operator-test-private-auth-strong-enough-for-basic';
  const bridge='bridge-test-private-secret-at-least-forty-characters';
  const pwd='control-private-password-long-enough-for-tests';
  const visited=[];
  const app=createOperatorDashboard({
    adminToken:secret,unifiedSecret:bridge,
    controlUsername:'blofy-control',controlPassword:pwd,
    engineOrigin:'http://127.0.0.1:9',
    sharedRelayStats:()=>relay,liveSupervisor:{list:()=>operatorPaths},
    fetchImpl:async(url,opts)=>{
      const u=String(url);
      visited.push({url:u,method:opts.method,auth:opts.headers?.authorization});
      if(u.endsWith('/media-quality'))
        return new Response(JSON.stringify(gateway),{status:200});
      if(u.endsWith('/source-capacity'))
        return new Response(JSON.stringify(capacity),{status:200});
      if(u.endsWith('/v3/info'))
        return new Response(JSON.stringify({version:'1.19.2',token:'PRIVATE'}),{status:200});
      if(u.endsWith('/v3/paths/list'))
        return new Response(JSON.stringify({items:[
          {name:'live-aaaaaaaaaaaa',ready:true,readers:[{ip:'PRIVATE'}]},
          {name:'demo',ready:false,source:'https://provider.invalid?password=PRIVATE'}],
          itemCount:2}),{status:200});
      if(u.endsWith('/v3/hls/sessions/list'))
        return new Response(JSON.stringify({items:[
          {id:'PRIVATE',path:'live-aaaaaaaaaaaa'}],itemCount:1}),{status:200});
      throw Error('unexpected-url');
    }
  });
  const server=createServer((req,res)=>{
    if(app.handle(req,res))return;
    res.writeHead(404);res.end();
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const origin='http://127.0.0.1:'+server.address().port;
    assert.equal((await fetch(origin+'/operator/api/cross-service')).status,401);
    assert.equal(visited.length,0);
    const authorization='Basic '+Buffer.from('operator:'+secret).toString('base64');
    const result=await fetch(origin+'/operator/api/cross-service',{headers:{authorization}});
    assert.equal(result.status,200);
    const body=await result.json();
    assert.equal(body.observations.mediaMtx.dataAvailable,true);
    assert.equal(body.observations.mediaMtx.readyPaths,1);
    assert.equal(body.observations.mediaMtx.hlsSessions,1);
    assert.equal(visited.length,5,'exactly two fixed portal GET and three private MediaMTX GET');
    assert.ok(visited.every(x=>x.method==='GET'));
    assert.ok(visited.filter(x=>x.url.includes('/v3/')).every(x=>
      x.url.startsWith('http://blofy-stream-media.railway.internal:9997/v3/')&&
      x.auth?.startsWith('Basic ')));
    assert.ok(visited.filter(x=>x.url.includes('/internal/')).every(x=>
      x.url.startsWith('https://blofy-activation-portal-production.up.railway.app/')&&
      x.auth==='Bearer '+bridge));
    const serialized=JSON.stringify(body);
    for(const token of ['PRIVATE','provider.invalid','192.168.0.3',pwd,secret,bridge])
      assert.ok(!serialized.includes(token),'response leaked '+token);
    const again=await fetch(origin+'/operator/api/cross-service',{headers:{authorization}});
    assert.equal(again.status,200);
    assert.equal(visited.length,5,'cache prevents repeated control API load');
    const rejected=await fetch(origin+'/operator/api/cross-service',{
      method:'POST',headers:{authorization,'content-type':'application/json'},
      body:'{}'});
    assert.equal(rejected.status,404);
    assert.equal(visited.length,5);
  }finally{
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});
