import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createStreamOpsObservatory} from '../src/stream-ops-observatory.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('passive monitoring captures incidents without operator dashboard visits',()=>{
  let now=50000,reads=0;
  const f={
    activeFeeds:1,viewers:3,maxViewersPerFeed:4,maxFeeds:8,
    providerFailures:0,capacityRejections:0,upstreamReconnects:0,
    slowViewerDisconnects:0,sourceBytesReceived:0,viewerBytesQueued:0,
    channels:[{channel:1,state:'ready',viewers:3,lastMediaAgeMs:1000}]
  };
  const m=createStreamOpsObservatory({
    relayStats:()=>{reads++;return {enabled:true,sharedLiveEnabled:true,fanout:f}},
    autoHealth:()=>({ok:true,paths:[]}),clock:()=>now,
    capacityWarningPercent:90
  });
  try{
    m.start();
    assert.equal(reads,1,'boot creates a safe baseline');
    assert.equal(m.snapshot().backgroundSampling,true);
    assert.equal(m.snapshot().sampleIntervalMs,null);
    assert.equal(reads,1,'UI polling must NOT change counter deltas');
    assert.equal(m.snapshot().trend.length,1);
    now+=15000;
    f.providerFailures=2;f.capacityRejections=1;f.sourceBytesReceived=1024*75;
    f.channels[0].lastMediaAgeMs=35000;
    const incident=m.sample();
    assert.equal(incident.deltas.providerFailures,2);
    assert.equal(incident.trend.length,2);
    assert.equal(incident.trend[1].sourceBytes,1024*75);
    assert.equal(incident.trend[1].intervalMs,15000);
    assert.ok(incident.recentChanges.some(e=>e.code==='feed_media_stalled'&&e.state==='raised'));
    assert.ok(incident.recentChanges.some(e=>e.code==='provider_failures_increased'&&e.state==='raised'));
    assert.equal(reads,2);
    m.snapshot();m.snapshot();
    assert.equal(reads,2);
    now+=15000;
    f.channels[0].lastMediaAgeMs=0;
    f.channels[0].viewers=1;f.viewers=1;
    const resolved=m.sample();
    assert.ok(resolved.recentChanges.some(e=>e.code==='feed_media_stalled'&&e.state==='resolved'));
    assert.equal(resolved.trend.length,3);
    assert.ok(resolved.trend.every(t=>t.at>0&&t.viewers<=4));
    assert.equal(resolved.isAllSubscribersMeasured,false);
    assert.equal(resolved.actionsTaken,0);
  }finally{m.stop()}
  assert.equal(m.snapshot().backgroundSampling,false);
});

test('historical trend is bounded, empty metric failures fail closed and secrets never serialize',()=>{
  let now=1000,fail=false;
  const obs=createStreamOpsObservatory({
    relayStats:()=>{
      if(fail)throw Error('https://private.example?token=NEVER-LEAK');
      return {fanout:{activeFeeds:0,viewers:0,channels:[],providerFailures:0}}
    },
    clock:()=>now,trendLimit:10
  });
  try{
    obs.start();
    for(let i=0;i<25;i++){
      now+=15000;obs.sample();
    }
    const report=obs.snapshot();
    assert.equal(report.trend.length,10);
    assert.ok(report.trend[0].at<report.trend.at(-1).at);
    assert.equal(report.alertCount,0);
    fail=true;
    const broken=obs.sample();
    assert.equal(broken.ok,false,'data unavailable must never be reported as green');
    assert.equal(broken.code,'smart_ops_metrics_unavailable');
    assert.equal(broken.readOnly,true);
    assert.ok(!JSON.stringify(broken).includes('NEVER-LEAK'));
    assert.equal(broken.backgroundSampling,true);
  }finally{obs.stop()}
});

test('operator page offers real bounded incident history, passive trend and no account secrets',()=>{
  const html=renderOperatorDashboard('trend-test');
  for(const id of ['smart-ops-history','smart-ops-peak-viewers',
    'smart-ops-ingress','smart-ops-incidents'])
    assert.ok(html.includes('id="'+id+'"'));
  assert.match(html,/d\.backgroundSampling/);
  assert.match(html,/d\.recentChanges/);
  const script=html.match(/<script nonce="trend-test">([\s\S]*?)<\/script>/);
  assert.ok(script,'nonce-protected page script');
  assert.doesNotThrow(()=>new vm.Script(script[1]));
  assert.doesNotMatch(html,/api\("smart-ops"[^]*?method:"POST"/);
});
