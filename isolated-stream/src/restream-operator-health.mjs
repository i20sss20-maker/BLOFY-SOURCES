import {diagnoseOperatorTsTracks} from './operator-ts-track-diagnosis.mjs';

// BLOFY STREAM read-only operator path diagnostics.
// Uses only already-materialized supervisor.list() state; never probes a
// provider, creates FFmpeg workers, discloses source/channel/customer IDs,
// or mislabels operator HLS readers as all IPTV viewers.
const MAX_PATHS=32;
const ERRORS=new Set([
  'restream_provider_not_found','restream_provider_denied',
  'restream_provider_unavailable','restream_invalid_upstream',
  'restream_invalid_media','restream_first_byte_timeout','restream_busy',
  'restream_hls_unavailable','restream_provider_redirect_denied',
  'restream_control_unavailable','restream_path_not_found',
  'restream_audio_mode_invalid','restream_audio_transcode_capacity_reached',
  'restream_short_primary_disconnect','restream_switched_source',
  'restream_hls_invalid','restream_cancelled','restream_internal_error',
]);
const bounded=(v,max)=>{
  if(v===null||v===undefined||v===''||typeof v==='boolean')return null;
  const n=Number(v);
  return Number.isSafeInteger(n)&&n>=0&&n<=max?n:null;
};
const age=(when,now)=>{
  if(typeof when!=='number'||!Number.isSafeInteger(when)||when<=0||
     when>now)return null;
  return Math.min(86400000,now-when);
};
export function summarizeOperatorRestreamPaths(report,{now=Date.now(),
  maxProbeAgeMs=300000}={}){
  if(!Number.isSafeInteger(now)||now<0||
      !Number.isInteger(maxProbeAgeMs)||maxProbeAgeMs<60000||
      maxProbeAgeMs>3600000)throw Error('restream_health_config_invalid');
  if(report?.ok!==true||!Array.isArray(report.items))
    return {dataAvailable:false,scope:'operator_supervisor_paths_only',
      monitoredPaths:null,activeOperatorReaders:null,failedRecentPaths:null,
      pendingProbes:null,unverifiedPaths:null,staleProbePaths:null,
      audioDeclaredPaths:null,audioNoTrackPaths:null,
      audioCodecReviewPaths:null,audioEvidenceUnavailablePaths:null,
      backupConfiguredPaths:null,failoversSinceBoot:null,paths:[],
      readOnly:true,decodedAudioVideoVerified:false,
      independentEngineMonitored:false};
  const paths=[];
  const counts={activeOperatorReaders:0,failedRecentPaths:0,pendingProbes:0,
    unverifiedPaths:0,staleProbePaths:0,backupConfiguredPaths:0,
    audioDeclaredPaths:0,audioNoTrackPaths:0,
    audioCodecReviewPaths:0,audioEvidenceUnavailablePaths:0,
    failoversSinceBoot:0};
  const listed=report.items.slice(0,MAX_PATHS);
  for(let i=0;i<listed.length;i++){
    const original=listed[i]&&typeof listed[i]==='object'?listed[i]:{};
    const active=bounded(original.connections,2048);
    const ageMs=age(original.lastProbe?.at,now);
    const pending=original.probePending===true;
    const recent=ageMs!==null&&ageMs<=maxProbeAgeMs;
    const verified=original.lastProbe?.ok===true;
    const failed=original.lastProbe?.ok===false;
    let state='unverified';
    if(pending)state='checking';
    else if(recent&&verified)state='first_bytes_verified';
    else if(recent&&failed)state='probe_failed';
    else if(ageMs!==null)state='probe_stale';
    const error=ERRORS.has(original.lastProbe?.code)?original.lastProbe.code:
      ERRORS.has(original.lastError)?original.lastError:null;
    const failovers=bounded(original.failovers,1000000);
    const track=diagnoseOperatorTsTracks(original,{now});
    counts.activeOperatorReaders+=(active??0);
    counts.failoversSinceBoot+=(failovers??0);
    if(original.backupConfigured===true)counts.backupConfiguredPaths++;
    if(pending)counts.pendingProbes++;
    if(state==='probe_failed')counts.failedRecentPaths++;
    if(state==='unverified')counts.unverifiedPaths++;
    if(state==='probe_stale')counts.staleProbePaths++;
    if(track.finding==='no_audio_declared_in_observed_pmt')
      counts.audioNoTrackPaths++;
    else if(track.finding==='audio_decoder_compatibility_review'){
      counts.audioCodecReviewPaths++;counts.audioDeclaredPaths++;
    }else if(track.finding==='audio_track_declared')
      counts.audioDeclaredPaths++;
    else counts.audioEvidenceUnavailablePaths++;
    // Index only, not a media path, title, sourceId, URL, token or channelId.
    paths.push({slot:i+1,state,activeOperatorReaders:active,
      latestProbeAgeSeconds:ageMs===null?null:Math.round(ageMs/1000),
      backupConfigured:original.backupConfigured===true,
      failoversSinceBoot:failovers,
      lastErrorCode:error,
      mediaFirstBytesVerified:state==='first_bytes_verified',
      audioTrackDiagnosis:track,
      decodedAudioVideoVerified:false,
      sourceTransportIndependentlyVerified:false});
  }
  return {dataAvailable:true,scope:'operator_supervisor_paths_only',
    monitoredPaths:paths.length,
    totalPathsReported:bounded(report.items.length,100000),
    pathsTruncated:report.items.length>MAX_PATHS,
    maxProbeAgeSeconds:Math.round(maxProbeAgeMs/1000),
    maxSharedReadersPerPath:bounded(report.maxSharedReaders,2048),
    readOnly:true,customerTrafficChanged:false,
    decodedAudioVideoVerified:false,independentEngineMonitored:false,
    countsAreUniqueViewers:false,
    ...counts,paths};
}
