import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseOperatorHlsResult,summarizeOperatorHlsRuns}
  from '../src/operator-hls-triage.mjs';
const base={
  state:'transport_verified',transportVerified:true,
  tracks:{
    observedPackets:400,
    audioTrackDeclared:true,audioCodecs:['aac'],videoCodecs:['h264'],
    audioPayloadPackets:30,videoPayloadPackets:100,
    transportAudioAnomalies:0,transportVideoAnomalies:0
  },
  providerUrl:'https://source.example/?password=should-not-leak'
};
const diagnosis=changes=>diagnoseOperatorHlsResult({...base,...changes});
test('successful HLS and audio/video payload are transport observations only',()=>{
  const item=diagnosis({});
  assert.equal(item.level,'observed');
  assert.equal(item.code,'transport_packets_observed');
  assert.equal(item.audioDecoded,false);
  assert.equal(item.videoDecoded,false);
  assert.doesNotMatch(JSON.stringify(item),/source\.example|password/);
});
test('confirmed no PMT audio has a distinct human-readable cause',()=>{
  const result=diagnosis({tracks:{...base.tracks,audioTrackDeclared:false,
    audioCodecs:[],audioPayloadPackets:0}});
  assert.equal(result.code,'pmt_no_audio');
  assert.equal(result.level,'review');
  assert.match(result.title,/PMT/);
});
test('short or incomplete PMT sample is unknown instead of false missing audio',()=>{
  const result=diagnosis({tracks:{...base.tracks,observedPackets:120,
    audioTrackDeclared:null,audioCodecs:[],audioPayloadPackets:null}});
  assert.equal(result.level,'unknown');
  assert.equal(result.code,'track_evidence_incomplete');
  assert.equal(diagnosis({tracks:null}).code,'ts_metadata_unavailable');
});
test('audio packets and video packets absent from sufficient samples are separate codes',()=>{
  assert.equal(diagnosis({tracks:{...base.tracks,audioPayloadPackets:0}}).code,
    'audio_packets_not_observed');
  assert.equal(diagnosis({tracks:{...base.tracks,videoPayloadPackets:0}}).code,
    'video_packets_not_observed');
});
test('packet continuity and device codec compatibility are evidence, not automatic repairs',()=>{
  assert.equal(diagnosis({tracks:{...base.tracks,transportAudioAnomalies:1}}).code,
    'ts_continuity_anomaly');
  assert.equal(diagnosis({tracks:{...base.tracks,audioCodecs:['eac3']}}).code,
    'audio_codec_compatibility');
});
test('failed transport is not marked as a source-absent audio track',()=>{
  const r=diagnosis({state:'transport_failed',transportVerified:false,
    code:'restream_hls_unavailable'});
  assert.equal(r.level,'review');
  assert.equal(r.code,'transport_failed');
  assert.match(r.title,/HLS/);
});
test('cancelled, pending, skipped and unknown preserve diagnostic uncertainty',()=>{
  assert.equal(diagnosis({state:'running'}).level,'pending');
  assert.equal(diagnosis({state:'cancelled'}).level,'unknown');
  assert.equal(diagnosis({state:'skipped'}).level,'unknown');
  assert.equal(diagnosis({state:'unknown'}).level,'unknown');
});
test('history summary stays at five runs/two paths and is not a catalog count',()=>{
  const passed={...base,path:'live-123456abcdef'};
  const failed={...base,state:'transport_failed',transportVerified:false,
    code:'restream_hls_unavailable'};
  const runs=Array.from({length:8},(_,id)=>({
    id:'scan-'+id,results:[passed,failed,passed]
  }));
  const s=summarizeOperatorHlsRuns(runs);
  assert.deepEqual({
    runs:s.runs,paths:s.paths,review:s.review,observed:s.observed,
    completeCatalogVerified:s.completeCatalogVerified,
    decodedAudioVerified:s.decodedAudioVerified
  },{runs:5,paths:10,review:5,observed:5,completeCatalogVerified:false,
    decodedAudioVerified:0});
});
test('invalid results never execute actions or stringify untrusted unknown codes',()=>{
  assert.equal(diagnoseOperatorHlsResult({state:'weird',
    url:'https://private.invalid/secret'}).code,'result_unavailable');
});
