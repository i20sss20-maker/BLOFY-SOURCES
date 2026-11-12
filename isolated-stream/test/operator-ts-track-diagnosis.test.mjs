import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createTsAudioInspector} from '../src/ts-audio-inspector.mjs';
import {diagnoseOperatorTsTracks} from '../src/operator-ts-track-diagnosis.mjs';
import {summarizeOperatorRestreamPaths} from '../src/restream-operator-health.mjs';
import {createStreamCrossServiceDiagnosis} from '../src/cross-service-diagnostics.mjs';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const now=1800000000000,PACKET=188;
const pat=()=>Buffer.from([0,0xb0,13,0,1,0xc1,0,0,0,1,0xe1,0,0,0,0,0]);
const pmt=types=>Buffer.from([2,0xb0,13+types.length*5,
  0,1,0xc1,0,0,0xe1,1,0xf0,0,
  ...types.flatMap((t,i)=>[t,0xe1,0x20+i,0xf0,0]),0,0,0,0]);
function ts(pid,content){
  const b=Buffer.alloc(PACKET,0xff);
  b[0]=0x47;b[1]=0x40|((pid>>8)&31);b[2]=pid&255;b[3]=0x10;
  Buffer.concat([Buffer.from([0]),content]).copy(b,4);
  return b;
}
const sample=types=>{
  const inspector=createTsAudioInspector();
  return inspector.push(Buffer.concat([ts(0,pat()),ts(256,pmt(types))]));
};
const input=(tracks,props={})=>({mediaTracks:tracks,trackInspectedAt:now-1000,
  audioMode:'copy',...props});

test('real passive MPEG-TS samples distinguish missing audio PMT, AAC and AC3 without decoding',()=>{
  const noAudio=diagnoseOperatorTsTracks(input(sample([0x1b])),{now});
  assert.equal(noAudio.finding,'no_audio_declared_in_observed_pmt');
  assert.equal(noAudio.pmtAudioDeclared,false);
  assert.equal(noAudio.soundAudibilityVerified,false);
  assert.equal(noAudio.decodedVideoVerified,false);
  assert.deepEqual(noAudio.audioCodecs,[]);
  assert.deepEqual(noAudio.videoCodecs,['h264']);

  const aac=diagnoseOperatorTsTracks(input(sample([0x1b,0x0f])),{now});
  assert.equal(aac.finding,'audio_track_declared');
  assert.deepEqual(aac.audioCodecs,['aac']);
  assert.equal(aac.pmtAudioDeclared,true);
  assert.equal(aac.decodedAudioVerified,false);

  const dolby=diagnoseOperatorTsTracks(input(sample([0x1b,0x81])),{now});
  assert.equal(dolby.finding,'audio_decoder_compatibility_review');
  assert.deepEqual(dolby.audioCodecs,['ac3']);
  assert.equal(dolby.codecSupportDependsOnClient,true);
  assert.equal(dolby.soundAudibilityVerified,false);
});

test('an incomplete PMT is unknown, NOT confirmed silent sound',()=>{
  const inspector=createTsAudioInspector({maxBytes:PACKET*2});
  const unknown=inspector.push(ts(0,pat()));
  const result=diagnoseOperatorTsTracks(input(unknown),{now});
  assert.equal(result.finding,'track_metadata_incomplete');
  assert.equal(result.pmtAudioDeclared,null);
  const empty=diagnoseOperatorTsTracks({mediaTracks:unknown},{now});
  assert.equal(empty.finding,'not_measured');
  assert.equal(empty.pmtAudioDeclared,null);
});

test('stale source codec evidence is dropped and cannot be confused with current backup',()=>{
  const old=diagnoseOperatorTsTracks(input(sample([0x1b,0x81]),{
    trackInspectedAt:now-500001}),{now});
  assert.equal(old.finding,'stale');
  assert.deepEqual(old.audioCodecs,[]);
  assert.equal(old.pmtAudioDeclared,null);
  assert.equal(old.metadataFresh,false);
  const onBackup=diagnoseOperatorTsTracks({
    mediaTracks:null,trackInspectedAt:null,audioMode:'aac'
  },{now});
  assert.equal(onBackup.finding,'not_measured');
  assert.equal(onBackup.selectedOutputMode,'aac_transcode_configured');
  assert.equal(onBackup.outputTranscodeVerified,false);
});

test('only recognized metadata and allowed codec labels are exposed, never raw provider payload',()=>{
  const dangerous=diagnoseOperatorTsTracks(input({
    status:'audio-stream-declared',hasAudioStream:true,
    audioCodecs:['eac3','aac','password=SUPRSECR3T',
      'https://video.private.invalid/source?token=secret'],
    videoCodecs:['hevc','script','provider.private.invalid'],
    inspectedBytes:3000,title:'password=SUPRSECR3T',providerUrl:'https://secret'
  }),{now});
  assert.equal(dangerous.finding,'audio_decoder_compatibility_review');
  assert.deepEqual(dangerous.audioCodecs,['eac3','aac']);
  assert.deepEqual(dangerous.videoCodecs,['hevc']);
  for(const secret of ['SUPRSECR3T','video.private.invalid','password','providerUrl','script'])
    assert.ok(!JSON.stringify(dangerous).includes(secret),secret);
  assert.throws(()=>diagnoseOperatorTsTracks(input(null),{now,maxTrackAgeMs:5}),
    /ts_track_health_config_invalid/);
});

test('operator scope reports audio metadata triage counts but never total unique viewers',()=>{
  const report={ok:true,items:[
    {name:'live-secret000001',mediaTracks:sample([0x1b,0x81]),
      trackInspectedAt:now-1500,audioMode:'copy',connections:1},
    {name:'live-secret000002',mediaTracks:sample([0x1b]),
      trackInspectedAt:now-1600,audioMode:'copy',connections:1},
    {name:'live-secret000003',mediaTracks:sample([0x1b,0x0f]),
      trackInspectedAt:now-2200,audioMode:'aac',connections:0},
    {name:'live-secret000004',mediaTracks:sample([0x1b,0x81]),
      trackInspectedAt:now-600000,audioMode:'copy',connections:0},
    {name:'live-secret000005',mediaTracks:null,
      trackInspectedAt:null,audioMode:'copy',connections:0}
  ]};
  const result=summarizeOperatorRestreamPaths(report,{now});
  assert.equal(result.audioDeclaredPaths,2);
  assert.equal(result.audioNoTrackPaths,1);
  assert.equal(result.audioCodecReviewPaths,1);
  assert.equal(result.audioEvidenceUnavailablePaths,2);
  assert.equal(result.activeOperatorReaders,2);
  assert.equal(result.paths[2].audioTrackDiagnosis.selectedOutputMode,
    'aac_transcode_configured');
  assert.equal(result.paths[2].audioTrackDiagnosis.outputTranscodeVerified,false);
  assert.equal(result.countsAreUniqueViewers,false);
  assert.ok(!JSON.stringify(result).includes('live-secret'));
});

test('cross-layer operator warnings distinguish PMT missing audio from device codec support',async()=>{
  const restream={ok:true,items:[
    {name:'live-private01',mediaTracks:sample([0x1b]),
      trackInspectedAt:now-1000},
    {name:'live-private02',mediaTracks:sample([0x1b,0x87]),
      trackInspectedAt:now-1000}
  ]};
  const monitor=createStreamCrossServiceDiagnosis({
    portal:{mediaQuality:async()=>({status:200,body:{ok:true,started:0,failed:0,
      providerCodes:{},byReason:{}}}),
      sourceCapacity:async()=>({status:200,body:{ok:true,
        directHttpTransferMeasurementAvailable:true,
        activeDirectHttpMediaTransfers:0,activeDirectLiveHttpTransfers:0}})},
    relayStats:()=>({enabled:true,fanout:{viewers:0,activeFeeds:0,providerFailures:0}}),
    restreamPaths:()=>restream,clock:()=>now,
    mediaControl:{overview:async()=>({configured:true,online:true,
      readyPaths:0,hlsSessions:0})},
    edgeMetrics:async()=>({ok:true,body:{ok:true,
      scope:'one_xtream_edge_bun_instance_origin_headers_only',
      lastFiveMinutes:{requests:0,errors5xx:0}}})
  });
  const snapshot=await monitor.snapshot();
  assert.equal(snapshot.status,'attention');
  assert.ok(snapshot.problems.some(p=>p.code==='operator_input_pmt_no_audio'&&
    p.count===1&&p.severity==='warning'));
  assert.ok(snapshot.problems.some(p=>p.code==='operator_audio_codec_support_review'&&
    p.count===1&&p.severity==='notice'));
  assert.equal(snapshot.observations.operatorRestream.audioNoTrackPaths,1);
  assert.equal(snapshot.observations.operatorRestream.audioCodecReviewPaths,1);
  assert.equal(snapshot.decodedAudioVideoVerified,false);
});

test('Arabic operator dashboard never presents PMT classification as audible sound',()=>{
  const html=renderOperatorDashboard('audio-triage-csp-nonce');
  for(const label of ['audioTrackDiagnosis','audioNoTrackPaths','audioCodecReviewPaths',
    'لا يثبت سماعه','دعم AC3/EAC3/DTS','codec','operator_input_pmt_no_audio'])
    assert.ok(html.includes(label),'missing audio triage text '+label);
  const script=html.match(/<script nonce="audio-triage-csp-nonce">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
