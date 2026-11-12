// Safe passive codec hints from MPEG-TS PAT/PMT metadata already inspected
// on the *same existing* authorized operator publisher transfer. Never tries
// to decode audio, infer audible sound, or open a new provider connection.
const KNOWN_AUDIO=new Set(['mpeg-audio','aac','aac-latm','ac3','eac3','lpcm','dts','truehd']);
const KNOWN_VIDEO=new Set(['mpeg1-video','mpeg2-video','mpeg4-video','h264','hevc','avs-video']);
const PMT_STATES=new Set(['audio-stream-declared','no-audio-stream-declared',
  'pmt-not-observed','waiting-for-pmt','waiting-for-pat','not-observed']);
const DEVICE_REVIEW=new Set(['aac-latm','ac3','eac3','lpcm','dts','truehd']);
const safeInteger=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max?x:null;
export function diagnoseOperatorTsTracks({
  mediaTracks=null,trackInspectedAt=null,audioMode='copy'
}={}, {now=Date.now(),maxTrackAgeMs=120000}={}){
  if(!Number.isSafeInteger(now)||now<0||
    !Number.isSafeInteger(maxTrackAgeMs)||maxTrackAgeMs<30000||
    maxTrackAgeMs>3600000)throw Error('ts_track_health_config_invalid');
  const age=Number.isSafeInteger(trackInspectedAt)&&trackInspectedAt>0&&
    trackInspectedAt<=now?now-trackInspectedAt:null;
  const current=age!==null&&age<=maxTrackAgeMs;
  const info=mediaTracks&&typeof mediaTracks==='object'&&!Array.isArray(mediaTracks)?
    mediaTracks:null;
  const state=PMT_STATES.has(info?.status)?info.status:'not-observed';
  const audio=[...new Set((Array.isArray(info?.audioCodecs)?
    info.audioCodecs:[]).slice(0,12).filter(c=>KNOWN_AUDIO.has(c)))].slice(0,5);
  const video=[...new Set((Array.isArray(info?.videoCodecs)?
    info.videoCodecs:[]).slice(0,12).filter(c=>KNOWN_VIDEO.has(c)))].slice(0,5);
  const inspectedBytes=safeInteger(info?.inspectedBytes,188*1500);
  const audioPayloadPackets=safeInteger(info?.audioPayloadPackets,1500);
  const videoPayloadPackets=safeInteger(info?.videoPayloadPackets,1500);
  const complete=info?.samplingComplete===true&&inspectedBytes!==null;
  // A PMT followed only by a few transport packets is NOT meaningful
  // absence evidence. Require at least 100 packets and an active other track
  // before even flagging "not seen in this sample".
  const sufficientlySampled=current&&complete&&
    inspectedBytes>=188*100;
  const trustedAudio=current&&state==='audio-stream-declared'&&
    info?.hasAudioStream===true;
  const audioPacketEvidence=!trustedAudio||audioPayloadPackets===null?
    'unknown':audioPayloadPackets>0?'observed_payload':
    sufficientlySampled&&videoPayloadPackets!==null&&
      videoPayloadPackets>=3?'not_seen_in_bounded_sample':'insufficient_sample';
  const videoPacketEvidence=!current||video.length===0||
      videoPayloadPackets===null?'unknown':
    videoPayloadPackets>0?'observed_payload':
    sufficientlySampled&&audioPayloadPackets!==null&&
      audioPayloadPackets>=3?'not_seen_in_bounded_sample':'insufficient_sample';
  let finding='not_measured';
  if(age!==null&&!current)finding='stale';
  else if(current&&state==='no-audio-stream-declared'&&info?.hasAudioStream===false)
    finding='no_audio_declared_in_observed_pmt';
  else if(current&&state==='audio-stream-declared'&&info?.hasAudioStream===true){
    finding=audio.some(c=>DEVICE_REVIEW.has(c))?
      'audio_decoder_compatibility_review':'audio_track_declared';
  }else if(current&&['waiting-for-pmt','waiting-for-pat','not-observed',
      'pmt-not-observed'].includes(state))finding='track_metadata_incomplete';
  const trusted=current&&state==='audio-stream-declared'&&
    info?.hasAudioStream===true;
  const lastObservedAgeSeconds=age===null?null:Math.round(Math.min(age,86400000)/1000);
  return {
    finding,metadataFresh:current,
    lastObservedAgeSeconds,
    pmtAudioDeclared:current&&state==='no-audio-stream-declared'?false:
      trusted?true:null,
    audioCodecs:current?audio:[],
    videoCodecs:current?video:[],
    inspectedBytes:current?inspectedBytes:null,
    audioPayloadPackets:current?audioPayloadPackets:null,
    videoPayloadPackets:current?videoPayloadPackets:null,
    boundedSampleCompleted:current?complete:null,
    audioPacketEvidence,videoPacketEvidence,
    packetsProveAudibleSound:false,
    packetsProveDecodedVideo:false,
    selectedOutputMode:audioMode==='aac'?'aac_transcode_configured':'copy_configured',
    outputTranscodeVerified:false,
    decodedAudioVerified:false,decodedVideoVerified:false,
    soundAudibilityVerified:false,
    samplesAreSourceBytesNotPlayerOutput:true,
    codecSupportDependsOnClient:true
  };
}
