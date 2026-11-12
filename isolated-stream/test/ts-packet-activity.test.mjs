import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createTsAudioInspector} from '../src/ts-audio-inspector.mjs';
import {diagnoseOperatorTsTracks} from '../src/operator-ts-track-diagnosis.mjs';
import {summarizeOperatorRestreamPaths} from '../src/restream-operator-health.mjs';
import {createStreamCrossServiceDiagnosis} from '../src/cross-service-diagnostics.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const PACKET=188,MAX=PACKET*120,now=1800000000000;
const pat=()=>Buffer.from([0,0xb0,13,0,1,0xc1,0,0,0,1,0xe1,0,0,0,0,0]);
const pmt=()=>Buffer.from([2,0xb0,23,0,1,0xc1,0,0,0xe1,1,0xf0,0,
  0x1b,0xe1,0x20,0xf0,0,0x0f,0xe1,0x21,0xf0,0,0,0,0,0]);
function pkt(pid,payload=Buffer.alloc(40,0x33)){
  const b=Buffer.alloc(PACKET,0xff);
  b[0]=0x47;b[1]=0x40|((pid>>8)&31);b[2]=pid&255;b[3]=0x10;
  Buffer.concat([Buffer.from([0]),payload]).copy(b,4);
  return b;
}
function inspected({audio=0,video=0,extra=0,maxBytes=MAX}={}){
  const data=Buffer.concat([pkt(0,pat()),pkt(256,pmt()),
    ...Array.from({length:audio},()=>pkt(289)),
    ...Array.from({length:video},()=>pkt(288)),
    ...Array.from({length:extra},()=>pkt(300))]);
  const probe=createTsAudioInspector({maxBytes});
  // Deliberately split across TS boundaries to verify bounded carry and
  // incremental packet counts as bytes already cross the existing proxy.
  probe.push(data.subarray(0,197));
  probe.push(data.subarray(197,2112));
  probe.push(data.subarray(2112));
  return probe.summary();
}
const assessment=tracks=>diagnoseOperatorTsTracks({
  mediaTracks:tracks,trackInspectedAt:now-1000},{now});

test('video-only payload with declared audio is a transport sample warning, not confirmed silence',()=>{
  const media=inspected({video:118});
  assert.equal(media.status,'audio-stream-declared');
  assert.deepEqual(media.audioCodecs,['aac']);
  assert.deepEqual(media.videoCodecs,['h264']);
  assert.equal(media.audioPayloadPackets,0);
  assert.equal(media.videoPayloadPackets,118);
  assert.equal(media.samplingComplete,true);
  const report=assessment(media);
  assert.equal(report.finding,'audio_track_declared');
  assert.equal(report.audioPacketEvidence,'not_seen_in_bounded_sample');
  assert.equal(report.videoPacketEvidence,'observed_payload');
  assert.equal(report.packetsProveAudibleSound,false);
  assert.equal(report.decodedAudioVerified,false);
  assert.equal(report.decodedVideoVerified,false);
});

test('audio-only payload with video declared flags missing VIDEO sample, not certain black screen',()=>{
  const media=inspected({audio:118});
  assert.equal(media.audioPayloadPackets,118);
  assert.equal(media.videoPayloadPackets,0);
  const report=assessment(media);
  assert.equal(report.audioPacketEvidence,'observed_payload');
  assert.equal(report.videoPacketEvidence,'not_seen_in_bounded_sample');
  assert.equal(report.packetsProveDecodedVideo,false);
});

test('observed AAC audio and H264 video payload activity remains separate from actual decoder output',()=>{
  const media=inspected({audio:60,video:58});
  assert.equal(media.audioPayloadPackets,60);
  assert.equal(media.videoPayloadPackets,58);
  const report=assessment(media);
  assert.equal(report.finding,'audio_track_declared');
  assert.equal(report.audioPacketEvidence,'observed_payload');
  assert.equal(report.videoPacketEvidence,'observed_payload');
  assert.equal(report.soundAudibilityVerified,false);
  assert.equal(report.packetsProveDecodedVideo,false);
  assert.equal(report.samplesAreSourceBytesNotPlayerOutput,true);
});

test('short incomplete TS evidence does not invent missing audio just from 0 audio packets',()=>{
  const tiny=inspected({video:10,maxBytes:PACKET*12});
  assert.equal(tiny.samplingComplete,true);
  assert.equal(tiny.audioPayloadPackets,0);
  assert.equal(tiny.videoPayloadPackets,10);
  const report=assessment(tiny);
  assert.equal(report.audioPacketEvidence,'insufficient_sample');
  assert.equal(report.videoPacketEvidence,'observed_payload');
  assert.equal(report.pmtAudioDeclared,true);
});

test('stale or unknown packet sample must return unknown, no false zero-video allegation',()=>{
  const media=inspected({audio:118});
  const stale=diagnoseOperatorTsTracks({
    mediaTracks:media,trackInspectedAt:now-500000},{now});
  assert.equal(stale.finding,'stale');
  assert.equal(stale.audioPayloadPackets,null);
  assert.equal(stale.videoPayloadPackets,null);
  assert.equal(stale.audioPacketEvidence,'unknown');
  assert.equal(stale.videoPacketEvidence,'unknown');
  const missing=diagnoseOperatorTsTracks({
    mediaTracks:{status:'audio-stream-declared',audioCodecs:['aac'],
      videoCodecs:['h264'],hasAudioStream:true,
      audioPayloadPackets:'0',videoPayloadPackets:0,
      samplingComplete:true,inspectedBytes:MAX},
    trackInspectedAt:now-1000},{now});
  assert.equal(missing.audioPayloadPackets,null);
  assert.equal(missing.audioPacketEvidence,'unknown');
});

test('bounded inspector keeps no raw MPEG-TS payloads, PID numbers, URLs or subscriber IDs',()=>{
  const input=inspected({audio:118,extra:900});
  assert.ok(input.inspectedBytes<=MAX);
  assert.equal(input.samplingComplete,true);
  assert.equal(input.checkedPackets,120);
  assert.equal(input.audioPayloadPackets,118);
  assert.equal(input.videoPayloadPackets,0);
  const out=assessment(input);
  for(const secret of ['password','sourceId','sessionId','providerUrl','payload','username']){
    // 'payload' is a generic field label, but raw TS bytes must not be present.
    if(secret==='payload')continue;
    assert.equal(JSON.stringify(out).includes(secret),false);
  }
  assert.equal(Object.prototype.hasOwnProperty.call(input,'pid'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(out,'sourceUrl'),false);
});

test('operator cross-service warnings are restricted to fully sampled media only',async()=>{
  const data={ok:true,items:[
    {name:'live-secret001',mediaTracks:inspected({video:118}),
      trackInspectedAt:now-1000,connections:1},
    {name:'live-secret002',mediaTracks:inspected({audio:118}),
      trackInspectedAt:now-1000,connections:1},
    {name:'live-secret003',mediaTracks:inspected({audio:60,video:58}),
      trackInspectedAt:now-1000,connections:0},
    {name:'live-secret004',mediaTracks:inspected({audio:118}),
      trackInspectedAt:now-600000,connections:0},
    {name:'live-secret005',mediaTracks:inspected({video:10,maxBytes:PACKET*12}),
      trackInspectedAt:now-1000,connections:0}
  ]};
  const rest=summarizeOperatorRestreamPaths(data,{now});
  assert.equal(rest.audioPayloadNotObservedPaths,1);
  assert.equal(rest.videoPayloadNotObservedPaths,1);
  assert.equal(rest.audioPayloadObservedPaths,2);
  assert.equal(rest.videoPayloadObservedPaths,1);
  assert.equal(rest.audioNoTrackPaths,0);
  assert.equal(rest.audioCodecReviewPaths,0);
  assert.equal(rest.countsAreUniqueViewers,false);

  const monitor=createStreamCrossServiceDiagnosis({
    portal:{mediaQuality:async()=>({status:200,body:{ok:true,started:0,failed:0,
      providerCodes:{},byReason:{}}}),
      sourceCapacity:async()=>({status:200,body:{ok:true,
        directHttpTransferMeasurementAvailable:true,activeDirectHttpMediaTransfers:0,
        activeDirectLiveHttpTransfers:0}})},
    relayStats:()=>({enabled:true,fanout:{viewers:0,activeFeeds:0,providerFailures:0}}),
    restreamPaths:()=>data,clock:()=>now,
    mediaControl:{overview:async()=>({configured:true,online:true,readyPaths:0,hlsSessions:0})},
    edgeMetrics:async()=>({ok:true,body:{ok:true,
      scope:'one_xtream_edge_bun_instance_origin_headers_only',
      lastFiveMinutes:{requests:0,errors5xx:0}}})
  });
  const result=await monitor.snapshot();
  assert.equal(result.status,'attention');
  assert.ok(result.problems.some(r=>r.code==='operator_audio_packets_not_seen_in_sample'&&r.count===1));
  assert.ok(result.problems.some(r=>r.code==='operator_video_packets_not_seen_in_sample'&&r.count===1));
  assert.equal(result.canSumAcrossLayers,false);
  assert.equal(result.decodedAudioVideoVerified,false);
  assert.ok(!JSON.stringify(result).includes('live-secret001'));
});

test('nonce-protected operator UI explains uncertain packet evidence in Arabic',()=>{
  const html=renderOperatorDashboard('ts-packet-nonce');
  for(const label of ['audioPacketEvidence','videoPacketEvidence',
    'audioPayloadNotObservedPaths','videoPayloadNotObservedPaths',
    'لا يثبت سماع الصوت','operator_audio_packets_not_seen_in_sample'])
    assert.ok(html.includes(label),'missing '+label);
  const script=html.match(/<script nonce="ts-packet-nonce">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
