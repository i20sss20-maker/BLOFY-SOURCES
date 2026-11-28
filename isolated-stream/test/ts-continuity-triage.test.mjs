import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createTsAudioInspector} from '../src/ts-audio-inspector.mjs';
import {diagnoseOperatorTsTracks} from '../src/operator-ts-track-diagnosis.mjs';
import {summarizeOperatorRestreamPaths} from '../src/restream-operator-health.mjs';
import {createStreamCrossServiceDiagnosis} from '../src/cross-service-diagnostics.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const PACKET=188,now=1800000000000;
const pat=()=>Buffer.from([0,0xb0,13,0,1,0xc1,0,0,0,1,0xe1,0,0,0,0,0]);
const pmt=()=>Buffer.from([2,0xb0,23,0,1,0xc1,0,0,0xe1,1,0xf0,0,
  0x1b,0xe1,0x20,0xf0,0,0x0f,0xe1,0x21,0xf0,0,0,0,0]);
function packet(pid,cc=0,{table=null,tei=false,adaptation=false,
  discontinuity=false,adaptOnly=false}={}){
  const b=Buffer.alloc(PACKET,0xff);
  b[0]=0x47;b[1]=((pid>>8)&31)|(table?0x40:0)|(tei?0x80:0);
  b[2]=pid&255;
  b[3]=(adaptOnly?0x20:(adaptation||discontinuity?0x30:0x10))|(cc&15);
  let start=4;
  if(adaptOnly){b[4]=183;b[5]=discontinuity?0x80:0;return b;}
  if(adaptation||discontinuity){b[4]=1;b[5]=discontinuity?0x80:0;start=6;}
  if(table){
    b[start++]=0;
    table.copy(b,start);
  }
  return b;
}
const patPacket=()=>packet(0,0,{table:pat()});
const pmtPacket=()=>packet(256,0,{table:pmt()});
function inspect(sequence,{maxPackets=120}={}){
  const inspector=createTsAudioInspector({maxBytes:maxPackets*PACKET});
  const all=Buffer.concat([...sequence,
    ...Array.from({length:Math.max(0,maxPackets-sequence.length)},
      ()=>packet(300,0))]);
  inspector.push(all.subarray(0,209));
  inspector.push(all.subarray(209,2147));
  inspector.push(all.subarray(2147));
  return inspector.summary();
}
const triage=track=>diagnoseOperatorTsTracks({
  mediaTracks:track,trackInspectedAt:now-1000},{now});
const portal=()=>({
  mediaQuality:async()=>({status:200,body:{ok:true,started:0,failed:0,
    providerCodes:{},byReason:{}}}),
  sourceCapacity:async()=>({status:200,body:{ok:true,
    directHttpTransferMeasurementAvailable:true,
    activeDirectHttpMediaTransfers:0,activeDirectLiveHttpTransfers:0}})
});

test('MPEG-TS CC wrap, gaps, duplicate counters, TEI and discontinuity flag work per declared PID',()=>{
  const summary=inspect([
    patPacket(),pmtPacket(),
    packet(289,14),packet(289,15),packet(289,0),
    packet(289,2), // missing 1 -> one audio CC gap
    packet(289,2), // duplicate counter -> distinct warning class
    packet(289,8,{adaptOnly:true}), // adaptation-only changes no CC
    packet(289,9,{discontinuity:true}), // signaled source reset
    packet(289,10), // now sequential
    packet(289,11,{tei:true}), // TEI -> corrupt, no payload, clears CC
    packet(289,4), // no second false gap after TEI
    packet(288,3),packet(288,5),packet(288,8), // two video CC gaps
    packet(300,15),packet(300,0), // other PID unrelated
  ]);
  assert.equal(summary.status,'audio-stream-declared');
  assert.equal(summary.samplingComplete,true);
  assert.equal(summary.audioContinuityGaps,1);
  assert.equal(summary.videoContinuityGaps,2);
  assert.equal(summary.audioTransportErrorPackets,1);
  assert.equal(summary.videoTransportErrorPackets,0);
  assert.equal(summary.audioDuplicateCounters,1);
  assert.equal(summary.videoDuplicateCounters,0);
  assert.equal(summary.audioPayloadPackets,8);
  assert.equal(summary.videoPayloadPackets,3);
  assert.equal(summary.continuityIndicatesPlaybackFailure,false);
  const classified=triage(summary);
  assert.equal(classified.audioTransportState,'transport_anomaly_observed');
  assert.equal(classified.videoTransportState,'transport_anomaly_observed');
  assert.equal(classified.continuityGapsArePacketLossProof,false);
  assert.equal(classified.decodedAudioVerified,false);
  assert.equal(classified.decodedVideoVerified,false);
  assert.equal(classified.soundAudibilityVerified,false);
  for(const secret of ['pid','sourceUrl','username','provider','url','packetPayload']){
    // Generic packet count labels are allowed; raw PID identifiers are not.
    assert.ok(!JSON.stringify(classified).includes('"'+secret+'"'),secret);
  }
});

test('periodic repeat PMT leaves continuity evidence; changed CC without announced reset is a gap',()=>{
  const media=inspect([patPacket(),pmtPacket(),packet(289,0),
    pmtPacket(),packet(289,1),pmtPacket(),packet(289,3)]);
  assert.equal(media.audioContinuityGaps,1,
    'periodic PMT must not clear continuity history of unchanged PID');
  assert.equal(media.audioPayloadPackets,3);
});

test('signalled TS discontinuity and adaptation-only packets never fabricate continuity loss',()=>{
  const media=inspect([patPacket(),pmtPacket(),
    packet(289,1),packet(289,13,{adaptOnly:true}),
    packet(289,6,{discontinuity:true}),packet(289,7),
    packet(288,14),packet(288,15),packet(288,0)]);
  assert.equal(media.audioContinuityGaps,0);
  assert.equal(media.videoContinuityGaps,0);
  assert.equal(media.audioTransportErrorPackets,0);
  assert.equal(media.videoDuplicateCounters,0);
  const audio=triage(media);
  assert.equal(audio.audioTransportState,'no_anomaly_in_bounded_sample');
  assert.equal(audio.videoTransportState,'no_anomaly_in_bounded_sample');
});

test('no TS error verdict if bounded sample is insufficient, stale, or track never declared',()=>{
  const early=inspect([patPacket(),pmtPacket(),packet(289,0),
    packet(289,7),packet(288,0)],{maxPackets:12});
  assert.equal(early.audioContinuityGaps,1);
  assert.equal(triage(early).audioTransportState,'unknown');
  const stale=diagnoseOperatorTsTracks({
    mediaTracks:inspect([patPacket(),pmtPacket(),packet(289,0),packet(289,5)]),
    trackInspectedAt:now-600000},{now});
  assert.equal(stale.audioTransportState,'unknown');
  assert.equal(stale.audioContinuityGaps,null);
  assert.equal(stale.videoTransportErrorPackets,null);
  assert.equal(stale.continuityGapsArePacketLossProof,false);
  const missing=diagnoseOperatorTsTracks({
    mediaTracks:{status:'waiting-for-pmt',hasAudioStream:false,
      samplingComplete:true,inspectedBytes:PACKET*120,
      audioPayloadPackets:0,videoPayloadPackets:0,
      audioContinuityGaps:4,videoContinuityGaps:5,
      audioTransportErrorPackets:2,videoTransportErrorPackets:1},
    trackInspectedAt:now-1000},{now});
  assert.equal(missing.audioTransportState,'unknown');
  assert.equal(missing.videoTransportState,'unknown');
});

test('malicious metadata cannot add private strings, oversized or negative CC counts',()=>{
  const bogus=diagnoseOperatorTsTracks({
    mediaTracks:{
      status:'audio-stream-declared',hasAudioStream:true,
      audioCodecs:['aac','password=NEVER_LEAK'],videoCodecs:['h264'],
      inspectedBytes:PACKET*120,samplingComplete:true,
      audioPayloadPackets:5,videoPayloadPackets:5,
      audioContinuityGaps:-1,videoContinuityGaps:10000000,
      audioTransportErrorPackets:'https://malicious.private',
      videoTransportErrorPackets:0,
      audioDuplicateCounters:'password=NEVER_LEAK'
    },trackInspectedAt:now-1000},{now});
  assert.equal(bogus.audioContinuityGaps,null);
  assert.equal(bogus.videoContinuityGaps,null);
  assert.equal(bogus.audioTransportErrorPackets,null);
  assert.equal(bogus.audioTransportState,'unknown');
  assert.equal(bogus.videoTransportState,'unknown');
  for(const secret of ['NEVER_LEAK','malicious.private','password='])
    assert.ok(!JSON.stringify(bogus).includes(secret));
});

test('cross-service alerts point to affected operator TS tracks without inferring customer blackscreen',async()=>{
  const erroredAudio=inspect([patPacket(),pmtPacket(),packet(289,0),
    packet(289,5),packet(289,8),packet(288,0)]);
  const erroredVideo=inspect([patPacket(),pmtPacket(),packet(288,0),
    packet(288,5),packet(288,8),packet(289,0)]);
  const valid=inspect([patPacket(),pmtPacket(),packet(289,0),
    packet(289,1),packet(288,0),packet(288,1)]);
  const paths={ok:true,items:[
    {name:'private-audio',connections:1,
      mediaTracks:erroredAudio,trackInspectedAt:now-1000},
    {name:'private-video',connections:1,
      mediaTracks:erroredVideo,trackInspectedAt:now-1000},
    {name:'private-valid',connections:0,
      mediaTracks:valid,trackInspectedAt:now-1000},
    {name:'private-stale',connections:0,
      mediaTracks:erroredAudio,trackInspectedAt:now-900000}
  ]};
  const perPath=summarizeOperatorRestreamPaths(paths,{now});
  assert.equal(perPath.audioTransportAnomalyPaths,1);
  assert.equal(perPath.videoTransportAnomalyPaths,1);
  assert.equal(perPath.activeOperatorReaders,2);
  assert.equal(perPath.paths[3].audioTrackDiagnosis.audioTransportState,'unknown');
  const unified=createStreamCrossServiceDiagnosis({
    portal:portal(),relayStats:()=>({enabled:true,
      fanout:{activeFeeds:0,viewers:0,providerFailures:0}}),
    restreamPaths:()=>paths,clock:()=>now,
    mediaControl:{overview:async()=>({configured:true,
      online:true,readyPaths:0,hlsSessions:0})},
    edgeMetrics:async()=>({ok:true,body:{ok:true,
      scope:'one_xtream_edge_bun_instance_origin_headers_only',
      lastFiveMinutes:{requests:0,errors5xx:0}}})
  });
  const result=await unified.snapshot();
  assert.equal(result.status,'attention');
  assert.ok(result.problems.some(x=>x.code==='operator_audio_ts_transport_anomaly'&&
    x.count===1));
  assert.ok(result.problems.some(x=>x.code==='operator_video_ts_transport_anomaly'&&
    x.count===1));
  assert.equal(result.actualUniqueViewersMeasured,false);
  assert.equal(result.decodedAudioVideoVerified,false);
  assert.ok(!JSON.stringify(result).includes('private-audio'));
});

test('Arabic operator TS warning labels and nonce JavaScript remain intact',()=>{
  const html=renderOperatorDashboard('continuity-nonce');
  for(const label of ['audioTransportAnomalyPaths','videoTransportAnomalyPaths',
    'audioTransportState','videoTransportState',
    'operator_audio_ts_transport_anomaly','operator_video_ts_transport_anomaly',
    'هذه المؤشرات لا تثبت فقدان الصوت أو الصورة']){
    assert.ok(html.includes(label),label);
  }
  const script=html.match(/<script nonce="continuity-nonce">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
