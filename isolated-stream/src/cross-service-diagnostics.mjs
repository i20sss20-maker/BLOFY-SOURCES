// Read-only cross-service STREAM diagnosis. Each input is an existing internal
// snapshot. Never opens media/source URLs, never assumes unique human viewers,
// and never sums incompatible gateway/relay/MediaMTX connection counters.
const KNOWN_CODES=new Set(['403','404','408','429','456','500','502','503','504']);
const KNOWN_CAUSES=new Set([
  'upstream_http_403','upstream_http_404','upstream_http_408',
  'upstream_http_429','upstream_http_456','upstream_http_500',
  'upstream_http_502','upstream_http_503','upstream_http_504',
  'headers_timeout','media_read_timeout','upstream_unreachable',
  'upstream_empty_media','upstream_non_media_response',
  'xtream_transport_connection_reset'
]);
const safeCount=value=>{
  if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>=0&&n<=10000000?n:null;
};
const measured=value=>safeCount(value)??0;
const limitCount=(value,max)=>Math.min(max,measured(value));
const good=answer=>answer?.status===200&&answer?.body?.ok===true?answer.body:null;
const pure=(value)=>Number.isFinite(value)&&value>=0?Math.round(value):null;

export function createStreamCrossServiceDiagnosis({
  portal,relayStats=()=>null,restreamPaths=()=>null,
  streamOps=()=>null,mediaControl=null,
  edgeMetrics=async()=>null,clock=Date.now,cacheMs=15000
}={}){
  if(!portal||typeof portal.mediaQuality!=='function'||
    typeof portal.sourceCapacity!=='function'||
    typeof relayStats!=='function'||typeof restreamPaths!=='function'||
    typeof streamOps!=='function'||typeof edgeMetrics!=='function'||
    (mediaControl!==null&&typeof mediaControl?.overview!=='function')||
    typeof clock!=='function'||
    !Number.isInteger(cacheMs)||cacheMs<5000||cacheMs>60000)
    throw Error('stream_cross_service_config_invalid');
  let cache=null,expiresAt=0,inflight=null;
  async function collect(){
    // Both requests go through the existing fixed-origin authenticated bridge.
    // Media health is in-memory; capacity is a single read-only DB aggregate.
    const [qualityResult,capacityResult,mediaMtxResult,edgeResult]=await Promise.allSettled([
      portal.mediaQuality(),portal.sourceCapacity(),
      mediaControl?mediaControl.overview():Promise.resolve(null),
      edgeMetrics()
    ]);
    const media=qualityResult.status==='fulfilled'?good(qualityResult.value):null;
    const capacity=capacityResult.status==='fulfilled'?good(capacityResult.value):null;
    // MediaMTX overview comes only from the fixed internal private Control
    // peer. Never forward path names, source URLs, session IDs or client IPs.
    const edgeReply=edgeResult.status==='fulfilled'?edgeResult.value:null;
    const edge=edgeReply?.ok===true&&edgeReply.body?.ok===true&&
      edgeReply.body?.scope==='one_xtream_edge_bun_instance_origin_headers_only'?
        edgeReply.body:null;
    const edgeMeasured=!!edge;
    const mtx=mediaMtxResult.status==='fulfilled'?mediaMtxResult.value:null;
    const mtxConfigured=mtx?.configured===true;
    const mtxOnline=mtxConfigured&&mtx?.online===true;
    const mtxReady=mtxOnline?safeCount(mtx.readyPaths):null;
    const mtxHls=mtxOnline?safeCount(mtx.hlsSessions):null;
    const mtxDiagnostic=mtxConfigured&&!mtxOnline?
      mtx?.diagnostics==='mediamtx_auth_failed'?'media_engine_auth_failure':
        'media_engine_control_unavailable':null;
    let relay=null,restream=null,ops=null;
    try{relay=relayStats()}catch{}
    try{restream=restreamPaths()}catch{}
    try{ops=streamOps()}catch{}
    const fanout=relay?.fanout||null;
    const relayed=relay?.enabled===true&&fanout&&typeof fanout==='object';
    const gatewayMeasured=capacity?.directHttpTransferMeasurementAvailable===true;
    const qualityMeasured=!!media;
    const sharedMeasured=!!relayed;
    const hlsMeasured=restream?.ok===true&&Array.isArray(restream?.items);
    const sourceCounts=capacity?.summary||null;
    const codes={};
    for(const [key,value] of Object.entries(media?.providerCodes||{}).slice(0,40)){
      if(KNOWN_CODES.has(key)&&safeCount(value)!==null)codes[key]=measured(value);
    }
    const causes={};
    for(const [key,value] of Object.entries(media?.byReason||{}).slice(0,60)){
      if(KNOWN_CAUSES.has(key)&&safeCount(value)!==null)causes[key]=measured(value);
    }
    const list=hlsMeasured?restream.items.slice(0,32):[];
    const hlsConnections=hlsMeasured?list.reduce((n,item)=>
      n+limitCount(item?.connections,64),0):null;
    const faults=[
      {code:'provider_admission_refused',scope:'gateway_last_hour',
        count:measured(codes['403'])+measured(codes['429'])+measured(codes['456']),
        severity:'warning'},
      {code:'provider_upstream_transient',scope:'gateway_last_hour',
        count:measured(codes['408'])+measured(codes['500'])+
          measured(codes['502'])+measured(codes['503'])+measured(codes['504']),
        severity:'warning'},
      {code:'gateway_media_interrupted',scope:'gateway_last_hour',
        count:measured(media?.interrupted),severity:'warning'},
      {code:'gateway_catalog_missing',scope:'gateway_last_hour',
        count:measured(media?.byReason?.catalog_item_unavailable),severity:'notice'},
      {code:'gateway_auth_rejected',scope:'gateway_last_hour',
        count:measured(media?.byReason?.gateway_auth_denied),severity:'notice'},
      {code:'relay_provider_failures',scope:'relay_since_boot',
        count:measured(fanout?.providerFailures),severity:'warning'},
      {code:mtxDiagnostic||'media_engine_control_unavailable',
        scope:'mediamtx_current',
        count:mtxDiagnostic?1:0,severity:'warning'},
      {code:'edge_gateway_5xx_last5m',scope:'edge_last_5m',
        count:edgeMeasured?measured(edge.lastFiveMinutes?.errors5xx):0,
        severity:'warning'},
      {code:'edge_gateway_denied_last5m',scope:'edge_last_5m',
        count:edgeMeasured?measured(edge.lastFiveMinutes?.admissionRefusals):0,
        severity:'notice'}
    ].filter(row=>row.count>0&&
      ((row.scope==='gateway_last_hour'&&qualityMeasured)||
       (row.scope==='relay_since_boot'&&sharedMeasured)||
       (row.scope==='mediamtx_current'&&mtxConfigured)||
       (row.scope==='edge_last_5m'&&edgeMeasured)));
    // Unknown must never be rendered as green or turned into zero.
    const unknown=!qualityMeasured||!gatewayMeasured||!sharedMeasured||
      !hlsMeasured||!mtxOnline||mtxReady===null||mtxHls===null||!edgeMeasured;
    const observations={
      gateway:{
        dataAvailable:qualityMeasured,scope:'portal_process_bounded_last_hour',
        attemptedMediaStarts:qualityMeasured?measured(media.started):null,
        failed:qualityMeasured?measured(media.failed):null,
        interrupted:qualityMeasured?measured(media.interrupted):null,
        slowStarts:qualityMeasured?measured(media.slowStarts):null,
        p95StartupMs:qualityMeasured?pure(media.p95StartMs):null,
        providerCodes:codes,causes,
        sampleMayBeTruncated:true,eventsRetainedMax:400,
        upstreamGrantedNotPlaybackVerified:true
      },
      direct:{
        dataAvailable:gatewayMeasured,
        scope:'one_portal_process_direct_http_media_only',
        activeMedia:gatewayMeasured?safeCount(capacity.activeDirectHttpMediaTransfers):null,
        activeLive:gatewayMeasured?safeCount(capacity.activeDirectLiveHttpTransfers):null,
        countsReliable:gatewayMeasured?capacity.directHttpTransferCountsReliable===true:null
      },
      providerLimits:{
        dataAvailable:!!capacity,scope:'cached_provider_claims_not_verified_live',
        sourceCount:capacity?limitCount(capacity.sourceCount,60):null,
        restricted:capacity?limitCount(sourceCounts?.restricted,60):null,
        unknown:capacity?limitCount(sourceCounts?.unknown,60):null,
        gatewayAccountsMeasured:capacity?.accountCountsAvailable===true
      },
      relay:{
        dataAvailable:sharedMeasured,scope:'one_stream_api_process_shared_fanout_only',
        sharedLiveEnabled:relay?.sharedLiveEnabled===true,
        activeFeeds:sharedMeasured?limitCount(fanout.activeFeeds,64):null,
        attachedReaders:sharedMeasured?limitCount(fanout.viewers,32768):null,
        upstreamFailuresSinceBoot:sharedMeasured?
          measured(fanout.providerFailures):null,
        activeTickets:relay?limitCount(relay.activeTickets,65536):null
      },
      operatorHls:{
        dataAvailable:hlsMeasured,scope:'operator_only_hls_paths_not_public_subscribers',
        configuredPaths:hlsMeasured?list.length:null,
        activePathReaders:hlsConnections,
        pathsCountMayBeTruncated:hlsMeasured&&restream.items.length>32
      },
      edge:{
        dataAvailable:edgeMeasured,
        scope:'one_edge_bun_instance_origin_header_responses_only',
        // These counts are requests to the authoritative gateway, never
        // media-body consumption or real simultaneous customers.
        activeOriginHeaderRequests:edgeMeasured?
          safeCount(edge.activeOriginHeaderRequests):null,
        requestsLastFiveMinutes:edgeMeasured?
          safeCount(edge.lastFiveMinutes?.requests):null,
        errors5xxLastFiveMinutes:edgeMeasured?
          safeCount(edge.lastFiveMinutes?.errors5xx):null,
        sourceAdmissionRefusalsLastFiveMinutes:edgeMeasured?
          safeCount(edge.lastFiveMinutes?.admissionRefusals):null,
        p95GatewayHeaderMs:edgeMeasured?pure(edge.p95OriginHeadersMs):null,
        headerSamples:edgeMeasured?safeCount(edge.headerSamples):null,
        measuredMediaViewers:false,measuredMediaBodyLifetime:false,
        otherRailwayReplicasIncluded:false
      },
      mediaMtx:{
        dataAvailable:mtxOnline&&mtxReady!==null&&mtxHls!==null,
        scope:'isolated_stream_mediamtx_control_api_hls_sessions_only',
        controlConfigured:mtx?.configured===false?false:mtxConfigured?true:null,
        online:mtxConfigured?mtxOnline:null,
        readyPaths:mtxReady,
        hlsSessions:mtxHls,
        hlsSessionsAreUniqueViewers:false,
        includesWebRtcOrRtspSessions:false,
        includesIndependentRestreamEngine:false,
        decodedAudioVideoVerified:false,
        diagnostic:mtxDiagnostic
      }
    };
    const at=clock();
    return {
      ok:true,checkedAt:at,readOnly:true,actionsTaken:0,
      status:unknown?'partial':faults.length?'attention':'observed_no_recent_faults',
      allServicesVerified:false,actualUniqueViewersMeasured:false,
      canSumAcrossLayers:false,actualSourceRightsVerified:false,
      decodedAudioVideoVerified:false,
      freshness:'cached_15_seconds_or_less',observations,
      problems:faults,
      note:'Do not sum gateway direct HTTP transfers, STREAM fanout readers, operator HLS path readers, MediaMTX HLS sessions or subscriptions. Edge counts only request attempts and response headers at one Railway Function instance, NOT active video sessions or media body completion. MediaMTX covers only isolated STREAM media, not independent restream engine, WebRTC/RTSP clients or unique people. Portal media logs retain max 400 events per process.'
    };
  }
  async function snapshot(){
    const now=clock();
    if(cache&&now<expiresAt)return cache;
    if(inflight)return inflight;
    inflight=collect().then(report=>{
      cache=report;expiresAt=clock()+cacheMs;return report;
    }).catch(()=>{
      // Never reveal transport errors or accidentally show zero as healthy.
      cache={ok:false,status:'unknown',code:'cross_service_telemetry_unavailable',
        readOnly:true,allServicesVerified:false,actualUniqueViewersMeasured:false,
        canSumAcrossLayers:false};
      expiresAt=clock()+cacheMs;
      return cache;
    }).finally(()=>{inflight=null});
    return inflight;
  }
  return {snapshot};
}
