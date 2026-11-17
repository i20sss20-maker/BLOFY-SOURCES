// Explicitly approved, single-flight HLS verification of *already active*
// operator-only restream paths. Never creates routes or picks Xtream URLs.
// All state is in process memory; restart marks historical work unavailable.
const LIVE_ID=/^live-[a-f0-9]{12}$/;
const CODE=/^restream_[a-z_]{1,62}$|^ok$|^unknown$|^timeout$/;
const AUDIO_CODEC=new Set(['mpeg-audio','aac','aac-latm','ac3','eac3','lpcm','dts','truehd']);
const VIDEO_CODEC=new Set(['mpeg1-video','mpeg2-video','mpeg4-video','h264','hevc','avs-video']);
const MAX_PATHS=2,COOLDOWN_MS=90_000,POLL_INTERVAL_MS=2000,MAX_POLL_ITERATIONS=27;
const safeCount=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max?x:null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const codeOf=v=>typeof v==='string'&&CODE.test(v)?v:'unknown';
function sanitizeTracks(tracks){
  if(!tracks||typeof tracks!=='object')return {
    audioCodecs:[],videoCodecs:[],audioTrackDeclared:null,
    audioPayloadPackets:null,videoPayloadPackets:null,
    transportAudioAnomalies:null,transportVideoAnomalies:null,
    observedPackets:null,decodedAudioVerified:false,decodedVideoVerified:false
  };
  const declared=['audio-stream-declared','no-audio-stream-declared'].includes(tracks.status);
  const missing=tracks.status==='no-audio-stream-declared';
  return {
    audioCodecs:(Array.isArray(tracks.audioCodecs)?tracks.audioCodecs:[])
      .filter(x=>AUDIO_CODEC.has(x)).slice(0,5),
    videoCodecs:(Array.isArray(tracks.videoCodecs)?tracks.videoCodecs:[])
      .filter(x=>VIDEO_CODEC.has(x)).slice(0,5),
    audioTrackDeclared:declared?!missing:null,
    audioPayloadPackets:safeCount(tracks.audioPayloadPackets,1000000),
    videoPayloadPackets:safeCount(tracks.videoPayloadPackets,1000000),
    transportAudioAnomalies:safeCount(tracks.audioContinuityGaps,1000000),
    transportVideoAnomalies:safeCount(tracks.videoContinuityGaps,1000000),
    observedPackets:safeCount(tracks.checkedPackets,1500),
    decodedAudioVerified:false,decodedVideoVerified:false
  };
}
function activePath(row){
  return row&&LIVE_ID.test(row.path)&&row.connections===1&&row.probePending!==true;
}
export function createOperatorLiveProbeQueue({
  supervisor,clock=Date.now,delay=sleep,
  pollIntervalMs=POLL_INTERVAL_MS,maxPollIterations=MAX_POLL_ITERATIONS
}={}){
  if(!supervisor||typeof supervisor.list!=='function'||typeof supervisor.probe!=='function'||
    typeof clock!=='function'||typeof delay!=='function'||
    !Number.isSafeInteger(pollIntervalMs)||pollIntervalMs<10||pollIntervalMs>5000||
    !Number.isSafeInteger(maxPollIterations)||maxPollIterations<1||maxPollIterations>30)
    throw Error('operator_live_probe_queue_invalid_configuration');
  let current=null,history=[],lastStartAt=-Infinity,sequence=0;
  function sourceRows(){
    const listing=supervisor.list();
    return listing?.ok===true&&Array.isArray(listing.items)?listing.items:null;
  }
  function available(){
    const list=sourceRows();
    if(!list)return null;
    return list.filter(activePath).slice(0,3).map(row=>({
      path:row.path,
      readyOnExistingSourceConnection:true,
      currentFeedConnections:1
    }));
  }
  function snapshot(){
    const candidates=available();
    const job=current?{
      id:current.id,state:current.state,startedAt:current.startedAt,
      completedAt:current.completedAt,requested:current.requested,
      completed:current.results.filter(r=>r.state!=='queued'&&r.state!=='running').length,
      cancelRequested:current.cancelRequested===true,
      results:current.results.map(row=>({...row}))
    }:null;
    const wait=lastStartAt===-Infinity?0:Math.max(0,COOLDOWN_MS-(clock()-lastStartAt));
    return {
      ok:true,readOnlyDashboard:true,requiresExplicitStart:true,
      service:'operator_existing_active_hls_queue',
      status:current?.state||'idle',
      eligiblePaths:candidates,available:candidates!==null,
      maxPerRun:MAX_PATHS,concurrentProbes:1,
      cooldownRemainingMs:wait,
      job,previous:history.map(run=>({
        id:run.id,state:run.state,startedAt:run.startedAt,
        completedAt:run.completedAt,
        results:run.results.map(row=>({...row}))
      })),
      newOperatorPathsCreated:0,upstreamSessionsCreated:null,
      customerRoutesModified:false,
      probeMayReuseOnDemandWorker:true,
      note:'لا يتم فتح مسارات Xtream جديدة. عند فحص مسار MediaMTX نشط قد يبدأ عامل الاستعادة اتصاله مجددًا إن انقطع المصدر أثناء الفحص. لا يُثبت هذا الاختبار سماع الصوت أو فك الصورة على جهاز العميل، ولا يتجاوز حدود المصدر.'
    };
  }
  function start({paths,rightsConfirmed=false,capacityAcknowledged=false}={}){
    if(rightsConfirmed!==true||capacityAcknowledged!==true)
      return {status:403,body:{ok:false,code:'operator_live_probe_confirmation_required'}};
    if(!Array.isArray(paths)||paths.length<1||paths.length>MAX_PATHS||
      new Set(paths).size!==paths.length||paths.some(p=>!LIVE_ID.test(p)))
      return {status:400,body:{ok:false,code:'operator_live_probe_invalid_selection'}};
    if(current?.state==='running')return {status:409,body:{ok:false,code:'operator_live_probe_busy'}};
    const wait=lastStartAt===-Infinity?0:COOLDOWN_MS-(clock()-lastStartAt);
    if(wait>0)return {status:429,body:{ok:false,code:'operator_live_probe_cooldown',retryAfterMs:wait}};
    const candidates=available();
    if(!candidates)return {status:503,body:{ok:false,code:'operator_live_probe_supervisor_unavailable'}};
    if(paths.some(path=>!candidates.some(row=>row.path===path)))
      return {status:409,body:{ok:false,code:'operator_live_probe_path_not_active'}};
    const now=clock();
    current={
      id:'scan-'+(++sequence),state:'running',startedAt:now,completedAt:null,
      requested:paths.length,cancelRequested:false,
      results:paths.map(path=>({path,state:'queued',code:null,
        transportVerified:false,audioVideoDecoded:false,tracks:null}))
    };
    lastStartAt=now;
    // Always do work after responding. The queue is not persistent and will
    // not schedule new work following a process restart.
    void Promise.resolve().then(async()=>{
      for(const row of current.results){
        if(current.cancelRequested){
          row.state='cancelled';row.code='cancelled';
          continue;
        }
        const before=sourceRows()?.find(x=>x.path===row.path);
        if(!activePath(before)){
          row.state='skipped';row.code='path_not_active';continue;
        }
        row.state='running';
        const started=clock();
        try{
          const response=await supervisor.probe(row.path);
          if(response?.status!==202||response.body?.ok!==true||
            response.body?.started!==true){
            row.state='failed';row.code='probe_not_started';
            continue;
          }
          let completed=false;
          for(let i=0;i<maxPollIterations;i++){
            await delay(pollIntervalMs);
            const latest=sourceRows()?.find(x=>x.path===row.path);
            if(!latest){row.state='failed';row.code='path_gone';completed=true;break;}
            const probe=latest.lastProbe;
            if(latest.probePending===false&&probe&&
              Number.isFinite(probe.at)&&probe.at>=started){
              row.transportVerified=probe.ok===true&&probe.firstMediaBytesVerified===true;
              row.state=row.transportVerified?'transport_verified':'transport_failed';
              row.code=codeOf(probe.code);
              row.audioVideoDecoded=false;
              row.tracks=sanitizeTracks(latest.mediaTracks);
              completed=true;break;
            }
          }
          if(!completed){row.state='unknown';row.code='timeout';}
        }catch{
          row.state='failed';row.code='probe_unavailable';
        }
      }
      current.completedAt=clock();
      current.state=current.cancelRequested?'cancelled':'completed';
      history.unshift({
        id:current.id,state:current.state,startedAt:current.startedAt,
        completedAt:current.completedAt,
        results:current.results.map(row=>({...row}))
      });
      history=history.slice(0,5);
    }).catch(()=>{
      if(current){current.state='failed';current.completedAt=clock();}
    });
    return {status:202,body:{
      ok:true,started:true,id:current.id,requested:paths.length,
      concurrency:1,noNewPaths:true,customerRoutesModified:false,
      completionPending:true
    }};
  }
  function cancel(){
    if(!current||current.state!=='running')
      return {status:409,body:{ok:false,code:'operator_live_probe_no_running_queue'}};
    current.cancelRequested=true;
    return {status:202,body:{ok:true,cancelRequested:true,
      note:'إيقاف جدولة المسارات التالية فقط؛ لا يقطع عينة HLS الجاري تنفيذها.'}};
  }
  return {snapshot,start,cancel};
}
