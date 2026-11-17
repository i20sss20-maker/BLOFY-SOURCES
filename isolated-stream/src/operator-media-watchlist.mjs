// BLOFY STREAM operator media quality watchlist — passive milestone.
// Bounded reads of existing database history and in-memory telemetry only.
// This does NOT test every catalog channel, decode video/audio, or touch provider media.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['live','movie','series','episode']);
const STATES=new Set(['missing','recovered']);
const FEED_STATES=new Set(['ready','starting','idle','reconnecting','failed']);
const number=(v,max=10000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max?v:null;
const yesCount=v=>number(v)??0;
const audioArea=new Set(['audio','decoder']);
const videoArea=new Set(['video']);
const safeIssues=new Set([
  'operator_input_pmt_no_audio','operator_audio_packets_not_seen_in_sample',
  'operator_audio_ts_transport_anomaly','operator_audio_codec_support_review',
  'relay_pmt_audio_missing','relay_audio_ts_transport_anomaly',
  'relay_audio_codec_support_review','operator_video_packets_not_seen_in_sample',
  'operator_video_ts_transport_anomaly','relay_video_ts_transport_anomaly'
]);
const safeDate=value=>{
  if(typeof value!=='string'||value.length>40)return null;
  const timestamp=Date.parse(value);
  return Number.isFinite(timestamp)&&timestamp>=0?new Date(timestamp).toISOString():null;
};
const sanitizeItem=row=>{
  if(!row||!STATES.has(row.state)||!['movie','series','episode','live'].includes(row.kind))return null;
  const id=String(row.itemId||'');
  if(!/^[0-9]{1,15}$/.test(id))return null;
  const source=String(row.sourceId||'');
  return {
    kind:row.kind,state:row.state,itemId:id,
    sourceId:UUID.test(source)?source:null,
    lastCheckedAt:safeDate(row.lastCheckedAt),
    nextCheckAt:safeDate(row.nextCheckAt)
  };
};
export function createOperatorMediaWatchlist({
  portal,playback=()=>null,ops=()=>null,clock=Date.now,cacheMs=45000
}={}){
  if(!portal||typeof portal.mediaFailures!=='function'||
      typeof portal.mediaFailureItems!=='function'||
      typeof playback!=='function'||typeof ops!=='function'||
      typeof clock!=='function'||!Number.isInteger(cacheMs)||
      cacheMs<15000||cacheMs>300000)throw Error('operator_media_watchlist_invalid_configuration');
  const cache=new Map(),pending=new Map();
  async function snapshot({sourceId=''}={}){
    if(sourceId!==''&&!UUID.test(String(sourceId)))
      return {ok:false,code:'operator_media_watchlist_invalid_source'};
    const key=String(sourceId);
    const now=clock();
    const current=cache.get(key);
    if(current && now-current.at<cacheMs)return current.report;
    if(pending.has(key))return pending.get(key);
    const work=(async()=>{
      // Exactly two previously existing, authenticated, read-only database
      // endpoints. No Xtream GET, FFmpeg, start/stop, or provider probes.
      const [groupsReply,itemsReply]=await Promise.allSettled([
        portal.mediaFailures({sourceId:key}),
        portal.mediaFailureItems({sourceId:key})
      ]);
      const groups=groupsReply.status==='fulfilled'&&groupsReply.value?.status===200&&
        groupsReply.value?.body?.ok!==false&&
        Array.isArray(groupsReply.value?.body?.entries)?groupsReply.value.body.entries:null;
      const rows=itemsReply.status==='fulfilled'&&itemsReply.value?.status===200&&
        itemsReply.value?.body?.ok!==false&&
        Array.isArray(itemsReply.value?.body?.items)?itemsReply.value.body.items:null;
      let playbackSnapshot=null,opsSnapshot=null;
      try{playbackSnapshot=playback()}catch{}
      try{opsSnapshot=ops()}catch{}
      const fresh=playbackSnapshot?.dataFresh===true&&
        playbackSnapshot?.assessment?.ok===true;
      const incidents=fresh&&Array.isArray(playbackSnapshot.assessment.incidents)?
        playbackSnapshot.assessment.incidents:[];
      const issueCounts={audio:fresh?0:null,video:fresh?0:null};
      const codeCounts=[];
      if(fresh)for(const row of incidents.slice(0,30)){
        const code=String(row?.code||'');
        if(!safeIssues.has(code))continue;
        const n=number(row.count,1000000)??1;
        const area=audioArea.has(row.area)?'audio':videoArea.has(row.area)?'video':null;
        if(area){issueCounts[area]++;codeCounts.push({code,area,count:n});}
      }
      const monitorReady=opsSnapshot?.ok===true&&Array.isArray(opsSnapshot?.channels);
      const channels=monitorReady?opsSnapshot.channels.slice(0,64).map(row=>{
        const channel=number(row?.channel,100000000);
        if(!channel||channel===0)return null;
        return {
          channel,
          state:FEED_STATES.has(row?.state)?row.state:'unknown',
          viewers:number(row?.viewers,512),
          lastMediaAgeMs:number(row?.lastMediaAgeMs,86400000)
        };
      }).filter(Boolean):[];
      // Historical error counter is not a live failure count; never count
      // recovery as success unless recorded explicitly by the source log.
      let historicalMissing=null,recovered=null,due=null;
      const grouped=[];
      if(groups!==null){
        historicalMissing=0;recovered=0;due=0;
        for(const item of groups.slice(0,150)){
          const state=STATES.has(item?.state)?item.state:null;
          const kind=KINDS.has(item?.kind)?item.kind:null;
          const count=number(item?.count,10000000),toReview=number(item?.due,10000000);
          const rowSource=String(item?.sourceId||'');
          if(!state||!kind||count===null||!UUID.test(rowSource))continue;
          if(key&&rowSource!==key)continue;
          if(state==='missing'){historicalMissing+=count;due+=toReview??0;}
          if(state==='recovered')recovered+=count;
          grouped.push({sourceId:rowSource,kind,state,count,due:toReview});
        }
      }
      const items=rows===null?null:rows.slice(0,80).map(sanitizeItem).filter(Boolean)
        .filter(item=>!key||item.sourceId===key);
      const limited=groups?.length>150||rows?.length>80;
      const coverage={
        historicalRecordGroups:groups!==null,
        historicalItems:rows!==null,
        liveTelemetry:monitorReady,
        recentAudioVideoSignals:fresh,
        fullCatalogChannelScan:false,
        providerAudioDecoded:false,
        providerVideoDecoded:false,
        audibleSoundConfirmed:false,
        licensedSourceMediaProbed:false
      };
      const missingInputs=Object.entries(coverage).filter(([name,ok])=>
        ['historicalRecordGroups','historicalItems','liveTelemetry','recentAudioVideoSignals'].includes(name)&&!ok)
        .map(([name])=>name);
      const report={
        ok:groups!==null||rows!==null||monitorReady||fresh,
        readOnly:true,scope:'existing_404_history_plus_active_fanout_and_server_telemetry',
        observedAt:new Date(now).toISOString(),sourceId:key||null,
        noProviderRequestsTriggered:true,mediaBytesRequested:0,
        actionsExecuted:0,allChannelsScanned:false,
        // Unknown is different from no issues; channel list is only currently
        // active shared fanout, NOT the source's entire channel catalogue.
        status:missingInputs.length?'partial':
          (historicalMissing>0||due>0||issueCounts.audio>0||issueCounts.video>0||
            channels.some(c=>['failed','reconnecting'].includes(c.state)))?'review':'observed_no_flags_in_limited_sample',
        counters:{
          historical404Missing:historicalMissing,recordedRecovered:recovered,
          historicalDueForRecheck:due,
          activeSharedFeeds:monitorReady?number(opsSnapshot?.capacity?.activeFeeds,64):null,
          observedSharedFeedRows:monitorReady?channels.length:null,
          flaggedAudioSignals:issueCounts.audio,flaggedVideoSignals:issueCounts.video,
          decodedAudioVerified:0,decodedVideoVerified:0,
          totalChannelCount:null,channelsScannedNow:0
        },
        missingInputs,resultsMayBeTruncated:!!limited,
        channelObservations:channels,recordGroups:grouped,
        historicalItems:items,signalCodes:codeCounts.slice(0,20),
        note:'هذا جرد للسجلات التاريخية ومراقبة القنوات النشطة فقط؛ لا يختبر كل قناة، ولا يثبت أن الصوت مسموع أو الفيديو قابل للفك، ولا يحمّل وسائط من المزود. فحص عينة مصرّح بها يحتاج إذن المشرف وحدود مصدر مؤكدة.'
      };
      cache.set(key,{at:clock(),report});
      // Bound one cached report per source to avoid unbounded growth.
      while(cache.size>20)cache.delete(cache.keys().next().value);
      return report;
    })().finally(()=>pending.delete(key));
    pending.set(key,work);
    return work;
  }
  return {snapshot};
}
