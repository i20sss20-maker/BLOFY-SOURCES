import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createTsAudioInspector} from '../src/ts-audio-inspector.mjs';
import {summarizeSharedRelayTracks} from '../src/shared-relay-track-health.mjs';
import {createStreamCrossServiceDiagnosis} from '../src/cross-service-diagnostics.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const PACKET=188,now=1800000000000;
const pat=()=>Buffer.from([0,0xb0,13,0,1,0xc1,0,0,0,1,0xe1,0,0,0,0,0]);
const pmt=()=>Buffer.from([2,0xb0,23,0,1,0xc1,0,0,0xe1,1,0xf0,0,
  0x1b,0xe1,0x20,0xf0,0,0x87,0xe1,0x21,0xf0,0,0,0,0]);
function packet(pid,cc=0,section=null){
  const out=Buffer.alloc(PACKET,0xff);
  out[0]=0x47;out[1]=((pid>>8)&31)|(section?0x40:0);
  out[2]=pid&255;out[3]=0x10|(cc&15);
  if(section)Buffer.concat([Buffer.from([0]),section]).copy(out,4);
  return out;
}
function audioSummary({gap=false}={}){
  const inspector=createTsAudioInspector({maxBytes:PACKET*120});
  const packets=[packet(0,0,pat()),packet(256,0,pmt())];
  for(let i=0;i<118;i++)packets.push(packet(i%2===0?289:288,
    gap&&i<10?i*3:i));
  inspector.push(Buffer.concat(packets));
  return inspector.summary();
}
function stats(channels){
  return {enabled:true,sharedLiveEnabled:true,activeTickets:2,
    fanout:{activeFeeds:channels.length,viewers:channels.reduce((n,c)=>n+c.viewers,0),
      providerFailures:0,channels}};
}

test('shared relay audio diagnosis is based on real bounded TS metadata, no decoder claims',()=>{
  const good=audioSummary({gap:false});
  const problematic=audioSummary({gap:true});
  const report=summarizeSharedRelayTracks({
    viewers:7,channels:[
      {channel:1,viewers:4,sourceStarts:1,lastMediaAgeMs:1000,
        trackInspectedAt:now-1500,audio:good,sourceUrl:'https://private.invalid?password=EXPOSE'},
      {channel:2,viewers:3,sourceStarts:2,lastMediaAgeMs:1000,
        trackInspectedAt:now-2000,audio:problematic,
        account:{token:'EXPOSE'},customerIp:'192.0.2.1'}
    ]
  },{now});
  assert.equal(report.dataAvailable,true);
  assert.equal(report.feeds,2);
  assert.equal(report.viewers,7);
  assert.equal(report.audioCodecReviewFeeds,2); // EAC3: client support varies.
  assert.equal(report.audioTransportAnomalyFeeds,1);
  assert.equal(report.videoTransportAnomalyFeeds,1);
  assert.equal(report.missingOrStaleEvidenceFeeds,0);
  assert.equal(report.channels[1].sourceRestartsSinceFeedStart,2);
  assert.equal(report.audioDecodedOnClient,false);
  assert.equal(report.measuredUniqueViewers,false);
  for(const secret of ['EXPOSE','private.invalid','192.0.2.1','sourceUrl','customerIp','account'])
    assert.ok(!JSON.stringify(report).includes(secret),secret);
});

test('relay track samples expire when publisher later streams without new sample bytes',()=>{
  const report=summarizeSharedRelayTracks({
    viewers:1,channels:[{channel:3,viewers:1,sourceStarts:1,
      trackInspectedAt:now-300000,audio:audioSummary()}]
  },{now});
  assert.equal(report.audioCodecReviewFeeds,0);
  assert.equal(report.missingOrStaleEvidenceFeeds,1);
  assert.equal(report.channels[0].diagnosis.finding,'stale');
  assert.equal(report.channels[0].diagnosis.audioTransportState,'unknown');
  assert.deepEqual(report.channels[0].diagnosis.audioCodecs,[]);
});

test('partial or unavailable relay monitoring fails unknown, never invents zero feeds',()=>{
  const unknown=summarizeSharedRelayTracks(null,{now});
  assert.equal(unknown.dataAvailable,false);
  assert.equal(unknown.feeds,null);
  assert.equal(unknown.viewers,null);
  assert.deepEqual(unknown.channels,[]);
  const bad=summarizeSharedRelayTracks({channels:[
    {channel:'https://private.invalid',audio:{audioCodecs:['SECRET']},viewers:7},
    {channel:1,viewers:4,trackInspectedAt:null,
      audio:{status:'audio-stream-declared',audioCodecs:['SECRET']}}
  ]},{now});
  assert.equal(bad.channels.length,1);
  assert.equal(bad.missingOrStaleEvidenceFeeds,1);
  assert.ok(!JSON.stringify(bad).includes('SECRET'));
  assert.throws(()=>summarizeSharedRelayTracks({channels:[]},{now:-1}),
    /relay_tracks_config_invalid/);
});

test('Cross-Service warns for SHARED relay audio and video input separately from operator HLS',async()=>{
  const origin=stats([
    {channel:2,viewers:4,trackInspectedAt:now-1000,audio:audioSummary({gap:true})}
  ]);
  const cross=createStreamCrossServiceDiagnosis({
    portal:{
      mediaQuality:async()=>({status:200,body:{ok:true,started:0,failed:0,
        providerCodes:{},byReason:{}}}),
      sourceCapacity:async()=>({status:200,body:{ok:true,
        directHttpTransferMeasurementAvailable:true,
        activeDirectHttpMediaTransfers:1,activeDirectLiveHttpTransfers:1}})
    },relayStats:()=>origin,restreamPaths:()=>({ok:true,items:[]}),
    mediaControl:{overview:async()=>({configured:true,online:true,
      readyPaths:0,hlsSessions:0})},
    edgeMetrics:async()=>({ok:true,body:{ok:true,
      scope:'one_xtream_edge_bun_instance_origin_headers_only',
      lastFiveMinutes:{requests:0,errors5xx:0}}}),
    clock:()=>now
  });
  const result=await cross.snapshot();
  assert.equal(result.status,'attention');
  assert.equal(result.observations.sharedRelayTracks.feeds,1);
  assert.equal(result.observations.sharedRelayTracks.channels[0].attachedReaders,4);
  assert.equal(result.observations.operatorRestream.monitoredPaths,0);
  assert.ok(result.problems.some(x=>x.scope==='relay_input_sample'&&
    x.code==='relay_audio_ts_transport_anomaly'&&x.count===1));
  assert.ok(result.problems.some(x=>x.code==='relay_audio_codec_support_review'&&x.count===1));
  assert.equal(result.actualUniqueViewersMeasured,false);
  assert.equal(result.decodedAudioVideoVerified,false);
});

test('Arabic shared-relay panel has CSP-valid script and clear viewer scope',()=>{
  const html=renderOperatorDashboard('shared-relay-csp');
  for(const id of ['shared-relay-audio-diagnostics','shared-relay-audio-rows',
    'shared-relay-audio-summary'])
    assert.ok(html.includes('id="'+id+'"'),id);
  for(const phrase of ['audioTransportAnomalyFeeds','sharedRelayTracks',
    'لا يثبت سماعها في Android 9','relay_audio_ts_transport_anomaly'])
    assert.ok(html.includes(phrase),phrase);
  const script=html.match(/<script nonce="shared-relay-csp">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
