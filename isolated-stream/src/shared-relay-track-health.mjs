// Privacy-safe, read-only quality hints from an existing shared-live fanout
// inspector. Read only data captured during authorized live transport. This is
// NOT an upstream probe, a decoder, or a count of unique subscribers.
import {diagnoseOperatorTsTracks} from './operator-ts-track-diagnosis.mjs';

const safe=(value,max)=>{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0||value>max)
    return null;
  return value;
};
export function summarizeSharedRelayTracks(fanout,{now=Date.now()}={}){
  if(!Number.isSafeInteger(now)||now<0)throw Error('relay_tracks_config_invalid');
  if(!fanout||!Array.isArray(fanout.channels))
    return {dataAvailable:false,scope:'stream_api_shared_fanout_only',
      feeds:null,viewers:null,audioNoTrackFeeds:null,
      audioCodecReviewFeeds:null,audioTransportAnomalyFeeds:null,
      videoTransportAnomalyFeeds:null,audioMissingPayloadFeeds:null,
      missingOrStaleEvidenceFeeds:null,channels:[],
      audioDecodedOnClient:false,measuredUniqueViewers:false};
  const channels=[],totals={
    audioNoTrackFeeds:0,audioCodecReviewFeeds:0,
    audioTransportAnomalyFeeds:0,videoTransportAnomalyFeeds:0,
    audioMissingPayloadFeeds:0,missingOrStaleEvidenceFeeds:0
  };
  for(const row of fanout.channels.slice(0,64)){
    const channel=safe(row?.channel,10000000);
    if(channel===null)continue;
    const views=safe(row?.viewers,512);
    const diagnosis=diagnoseOperatorTsTracks({
      mediaTracks:row?.audio,trackInspectedAt:row?.trackInspectedAt,
      audioMode:'copy'
    },{now});
    if(diagnosis.finding==='no_audio_declared_in_observed_pmt')
      totals.audioNoTrackFeeds++;
    if(diagnosis.finding==='audio_decoder_compatibility_review')
      totals.audioCodecReviewFeeds++;
    if(diagnosis.audioTransportState==='transport_anomaly_observed')
      totals.audioTransportAnomalyFeeds++;
    if(diagnosis.videoTransportState==='transport_anomaly_observed')
      totals.videoTransportAnomalyFeeds++;
    if(diagnosis.audioPacketEvidence==='not_seen_in_bounded_sample')
      totals.audioMissingPayloadFeeds++;
    if(diagnosis.finding==='stale'||diagnosis.finding==='not_measured'||
       diagnosis.finding==='track_metadata_incomplete')
      totals.missingOrStaleEvidenceFeeds++;
    channels.push({
      channel,attachedReaders:views,
      // The source URL, channel name/ID, tickets, provider and account never
      // leave the fanout. 'channel' is an ephemeral anonymous ordinal only.
      sourceRestartsSinceFeedStart:safe(row.sourceStarts,1000000),
      lastMediaAgeMs:safe(row.lastMediaAgeMs,86400000),
      diagnosis
    });
  }
  return {
    dataAvailable:true,scope:'stream_api_shared_fanout_only',
    feeds:channels.length,
    viewers:safe(fanout.viewers,32768),
    channelsTruncated:fanout.channels.length>64,
    audioDecodedOnClient:false,measuredUniqueViewers:false,
    sourceRightsVerified:false,noNewProviderRequests:true,
    ...totals,channels
  };
}
