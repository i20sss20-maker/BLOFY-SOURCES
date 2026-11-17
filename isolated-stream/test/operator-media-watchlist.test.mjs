import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorMediaWatchlist} from '../src/operator-media-watchlist.mjs';
const source='729ac26a-a2b8-4e61-bdc0-5e0f0f3bd9f0';
const entry={sourceId:source,kind:'live',state:'missing',count:3,due:2};
const fakePortal=(calls=[])=>({
  async mediaFailures({sourceId}={}){calls.push('failures:'+sourceId);return {status:200,body:{
    ok:true,entries:[entry,{...entry,kind:'movie',state:'recovered',count:1,due:0}]
  }};},
  async mediaFailureItems({sourceId}={}){calls.push('items:'+sourceId);return {status:200,body:{
    ok:true,items:[{sourceId:source,itemId:'4321',kind:'live',state:'missing',
      lastCheckedAt:'2026-11-17T06:00:00Z',nextCheckAt:'2026-11-18T06:00:00Z',
      sourceUrl:'https://danger.example/watch?password=secret'}]
  }};}
});
const playback=()=>({dataFresh:true,assessment:{ok:true,incidents:[
  {code:'relay_pmt_audio_missing',area:'audio',count:2},
  {code:'operator_video_packets_not_seen_in_sample',area:'video',count:1},
  {code:'not_approved',area:'audio',count:999}
]}});
const ops=()=>({ok:true,capacity:{activeFeeds:1},channels:[{channel:35,state:'reconnecting',
  viewers:2,lastMediaAgeMs:39000,sourceUrl:'https://private.example/?pass=secret'}]});
test('merges existing historical failures and fresh audio/video observations without source reads',async()=>{
  const calls=[];
  const scan=createOperatorMediaWatchlist({
    portal:fakePortal(calls),playback,ops,clock:()=>1794895555000
  });
  const r=await scan.snapshot();
  assert.equal(r.ok,true);
  assert.equal(r.noProviderRequestsTriggered,true);
  assert.equal(r.mediaBytesRequested,0);
  assert.equal(r.allChannelsScanned,false);
  assert.equal(r.counters.channelsScannedNow,0);
  assert.equal(r.counters.historical404Missing,3);
  assert.equal(r.counters.recordedRecovered,1);
  assert.equal(r.counters.historicalDueForRecheck,2);
  assert.equal(r.counters.flaggedAudioSignals,1);
  assert.equal(r.counters.flaggedVideoSignals,1);
  assert.equal(r.counters.activeSharedFeeds,1);
  assert.equal(r.counters.observedSharedFeedRows,1);
  assert.deepEqual(calls,['failures:','items:']);
  assert.deepEqual(r.channelObservations,[{channel:35,state:'reconnecting',viewers:2,lastMediaAgeMs:39000}]);
  assert.equal(r.historicalItems[0].itemId,'4321');
  assert.doesNotMatch(JSON.stringify(r),/private.example|danger.example|password|secret|not_approved/);
  assert.equal(r.status,'review');
});
test('cached repeat does not issue new backend or provider requests',async()=>{
  const calls=[],scan=createOperatorMediaWatchlist({
    portal:fakePortal(calls),playback,ops,clock:()=>1800000000000
  });
  const [r1,r2]=await Promise.all([scan.snapshot({sourceId:source}),scan.snapshot({sourceId:source})]);
  assert.deepEqual(r1,r2);
  await scan.snapshot({sourceId:source});
  assert.deepEqual(calls,['failures:'+source,'items:'+source]);
});
test('source UUID validation fails closed before database reads',async()=>{
  const calls=[],scan=createOperatorMediaWatchlist({portal:fakePortal(calls)});
  const r=await scan.snapshot({sourceId:'../../etc/passwd'});
  assert.equal(r.ok,false);
  assert.equal(r.code,'operator_media_watchlist_invalid_source');
  assert.deepEqual(calls,[]);
});
test('stale audio observations remain unknown, not a false zero',async()=>{
  const scan=createOperatorMediaWatchlist({
    portal:fakePortal(),playback:()=>({dataFresh:false}),ops:()=>null
  });
  const r=await scan.snapshot();
  assert.equal(r.counters.flaggedAudioSignals,null);
  assert.equal(r.counters.flaggedVideoSignals,null);
  assert.equal(r.counters.activeSharedFeeds,null);
  assert.ok(r.missingInputs.includes('liveTelemetry'));
  assert.ok(r.missingInputs.includes('recentAudioVideoSignals'));
  assert.equal(r.status,'partial');
});
test('inaccessible history is visibly incomplete and never marked as healthy',async()=>{
  const scan=createOperatorMediaWatchlist({
    portal:{
      mediaFailures:async()=>{throw new Error('private gateway credentials');},
      mediaFailureItems:async()=>({status:503,body:{ok:false,code:'unavailable'}})
    },
    playback:()=>null,ops:()=>({ok:false})
  });
  const r=await scan.snapshot();
  assert.equal(r.ok,false);
  assert.equal(r.counters.historical404Missing,null);
  assert.equal(r.counters.historicalDueForRecheck,null);
  assert.equal(r.counters.recordedRecovered,null);
  assert.equal(r.status,'partial');
  assert.doesNotMatch(JSON.stringify(r),/credentials/);
});
test('empty recorded errors are explicitly zero, but never equal full catalog verification',async()=>{
  const scan=createOperatorMediaWatchlist({
    portal:{
      mediaFailures:async()=>({status:200,body:{ok:true,entries:[]}}),
      mediaFailureItems:async()=>({status:200,body:{ok:true,items:[]}})
    },
    playback:()=>({dataFresh:true,assessment:{ok:true,incidents:[]}}),
    ops:()=>({ok:true,channels:[]})
  });
  const r=await scan.snapshot();
  assert.equal(r.counters.historical404Missing,0);
  assert.equal(r.counters.flaggedAudioSignals,0);
  assert.equal(r.counters.totalChannelCount,null);
  assert.equal(r.allChannelsScanned,false);
  assert.equal(r.status,'observed_no_flags_in_limited_sample');
});
test('invalid history items and long untrusted media fields are dropped',async()=>{
  const scan=createOperatorMediaWatchlist({
    portal:{
      mediaFailures:async()=>({status:200,body:{ok:true,entries:[{...entry,count:-1}]}}),
      mediaFailureItems:async()=>({status:200,body:{ok:true,items:[
        {sourceId:source,itemId:'http://upstream/secret',kind:'live',state:'missing'},
        {sourceId:source,itemId:'1',kind:'episode',state:'recovered'},
        {sourceId:source,itemId:'4',kind:'live',state:'missing',
          name:'https://secret.example/?key=SECRET'}
      ]}})
    }
  });
  const r=await scan.snapshot();
  assert.equal(r.historicalItems.length,2);
  assert.equal(r.counters.historical404Missing,0);
  assert.doesNotMatch(JSON.stringify(r),/secret.example|SECRET/);
});


test('idle historical rows never count as active feed capacity',async()=>{
  const scanner=createOperatorMediaWatchlist({
    portal:{
      mediaFailures:async()=>({status:200,body:{ok:true,entries:[]}}),
      mediaFailureItems:async()=>({status:200,body:{ok:true,items:[]}})
    },
    ops:()=>({ok:true,capacity:{activeFeeds:0},
      channels:[{channel:12,state:'idle',viewers:0,lastMediaAgeMs:null}]}),
    playback:()=>({dataFresh:true,assessment:{ok:true,incidents:[]}})
  });
  const result=await scanner.snapshot();
  assert.equal(result.counters.activeSharedFeeds,0);
  assert.equal(result.counters.observedSharedFeedRows,1);
  assert.equal(result.channelObservations[0].state,'idle');
});
