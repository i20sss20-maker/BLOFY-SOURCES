import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import vm from 'node:vm';
import {createStreamOpsObservatory} from '../src/stream-ops-observatory.mjs';
import {createOperatorDashboard} from '../src/operator-dashboard.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const secret='smart-ops-readonly-operator-token-2026-test-long';
const auth='Basic '+Buffer.from('operator:'+secret).toString('base64');
const makeFanout=()=>({
  activeFeeds:1,viewers:9,maxViewersPerFeed:10,maxFeeds:8,
  providerFailures:5,upstreamReconnects:2,capacityRejections:4,
  slowViewerDisconnects:0,sourceBytesReceived:1000,viewerBytesQueued:9000,
  channels:[{channel:1,state:'ready',viewers:9,lastMediaAgeMs:46000,
    account:'never_report',sourceUrl:'https://example.org/media?password=do-not-leak'}]
});
const makeHealth=()=>({ok:true,paths:[
  {path:'live-123456789abc',status:'failed',
    title:'secret movie title',sourceUrl:'https://private.example/abc'},
  {path:'https://private.example/?password=secret',status:'failed'}
]});

test('read-only operator observability detects saturation and stalled transport without leaking source data',()=>{
  const fanout=makeFanout(),health=makeHealth();
  let now=123000;
  const observatory=createStreamOpsObservatory({
    relayStats:()=>({enabled:true,sharedLiveEnabled:true,fanout}),
    autoHealth:()=>health,clock:()=>now
  });
  const first=observatory.snapshot();
  assert.equal(first.scope,'shared_relay_and_operator_restream_only');
  assert.equal(first.isAllSubscribersMeasured,false);
  assert.equal(first.playbackQualityVerified,false);
  assert.equal(first.sourceRightsVerified,false);
  assert.equal(first.actionsTaken,0);
  assert.equal(first.capacity.activeViewers,9);
  assert.equal(first.channels[0].saturationPercent,90);
  assert.equal(first.hls.operatorPaths,1);
  assert.ok(first.alerts.some(x=>x.code==='feed_near_capacity'));
  assert.ok(first.alerts.some(x=>x.code==='feed_media_stalled'));
  assert.ok(first.alerts.some(x=>x.code==='operator_hls_probe_failed'));
  assert.equal(first.alerts.some(x=>x.code==='provider_failures_increased'),false,
    'boot should establish baseline, not fire an incident from historical totals');
  const result=JSON.stringify(first);
  for(const secret of ['do-not-leak','password','private.example','example.org','secret movie title','never_report'])
    assert.equal(result.includes(secret),false,'diagnostic leaked '+secret);
  assert.equal(first.recentChanges.length,3);
  assert.equal(observatory.snapshot().recentChanges.length,3,'no duplicate alerts on repeated polling');

  now+=60000;
  fanout.providerFailures+=2;
  fanout.capacityRejections+=3;
  fanout.slowViewerDisconnects+=1;
  const second=observatory.snapshot();
  assert.equal(second.deltas.providerFailures,2);
  assert.equal(second.deltas.capacityRejections,3);
  assert.equal(second.deltas.slowViewerDisconnects,1);
  assert.ok(second.alerts.some(x=>x.code==='provider_failures_increased'&&x.count===2));
  assert.equal(second.recentChanges.filter(x=>x.state==='raised').length,6);
  assert.ok(second.recentChanges.length<=50);

  now+=60000;
  fanout.channels[0].viewers=4;
  fanout.channels[0].lastMediaAgeMs=0;
  fanout.viewers=4;health.paths[0].status='healthy';
  const recovered=observatory.snapshot();
  assert.equal(recovered.alertCount,0);
  assert.ok(recovered.recentChanges.some(x=>x.state==='resolved'&&x.code==='feed_media_stalled'));
  assert.ok(recovered.recentChanges.some(x=>x.state==='resolved'&&x.code==='operator_hls_probe_failed'));
});

test('reset counters do not generate negative deltas or false outage alarms',()=>{
  let now=1000;
  const fanout=makeFanout();
  const obs=createStreamOpsObservatory({relayStats:()=>({fanout}),clock:()=>now});
  obs.snapshot();now+=1000;
  fanout.providerFailures=0;fanout.upstreamReconnects=0;
  fanout.capacityRejections=0;fanout.viewerBytesQueued=0;
  const afterRestart=obs.snapshot();
  assert.equal(afterRestart.deltas.providerFailures,0);
  assert.equal(afterRestart.deltas.upstreamReconnects,0);
  assert.equal(afterRestart.deltas.viewerBytesQueued,0);
});

test('bounded and sanitized input rejects malformed HLS ids and inflated values',()=>{
  const obs=createStreamOpsObservatory({
    relayStats:()=>({fanout:{maxViewersPerFeed:128,maxFeeds:8,
      activeFeeds:99999,viewers:Number.MAX_VALUE,
      channels:[{channel:0,viewers:1000},{channel:2,viewers:9000,
        state:'https://evil.example',lastMediaAgeMs:-1}]} }),
    autoHealth:()=>({ok:true,paths:[{path:'../private',status:'failed'},
      {path:'live-aaaaaaaaaaaa',status:'failed'}]})
  });
  const report=obs.snapshot();
  assert.equal(report.capacity.activeFeeds,64);
  assert.equal(report.capacity.activeViewers,0);
  assert.equal(report.channels.length,1);
  assert.equal(report.channels[0].state,'unknown');
  assert.equal(report.channels[0].viewers,512);
  assert.equal(report.hls.operatorPaths,1);
  assert.ok(!JSON.stringify(report).includes('evil.example'));
  assert.throws(()=>createStreamOpsObservatory({capacityWarningPercent:101}),
    /stream_ops_config_invalid/);
});

test('new Smart Ops API requires operator Basic auth and is read-only with sanitized responses',async()=>{
  const report=createStreamOpsObservatory({
    relayStats:()=>({fanout:makeFanout()}),autoHealth:makeHealth
  });
  const operator=createOperatorDashboard({adminToken:secret,streamOps:()=>report.snapshot(),
    engineOrigin:'http://127.0.0.1:9'});
  const server=createServer((req,res)=>{
    if(operator.handle(req,res))return;
    res.writeHead(404);res.end();
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const blocked=await fetch(base+'/operator/api/smart-ops');
    assert.equal(blocked.status,401);
    const denied=await fetch(base+'/operator/api/smart-ops',{
      method:'POST',headers:{authorization:auth}
    });
    assert.equal(denied.status,404);
    const response=await fetch(base+'/operator/api/smart-ops',{
      headers:{authorization:auth}
    });
    assert.equal(response.status,200);
    const json=await response.json();
    assert.equal(json.readOnly,true);
    assert.equal(json.alertCount,3);
    assert.equal(json.channels[0].channel,1);
    assert.ok(!JSON.stringify(json).includes('password'));
  }finally{
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});

test('single nonce-protected operator UI contains Smart Ops safety scope and valid JavaScript',()=>{
  const html=renderOperatorDashboard('qa-safe-nonce');
  for(const id of ['smart-ops-panel','smart-ops-refresh','smart-ops-status',
    'smart-ops-viewers','smart-ops-feeds','smart-ops-alerts',
    'smart-ops-critical','smart-ops-capacity-delta',
    'smart-ops-channels','smart-ops-issues'])
    assert.ok(html.includes('id="'+id+'"'),id+' missing');
  assert.match(html,/لا تشمل جميع المشتركين/);
  assert.match(html,/api\("smart-ops"\)/);
  const script=html.match(/<script nonce="qa-safe-nonce">([\s\S]*?)<\/script>/);
  assert.ok(script,'nonce script missing');
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
