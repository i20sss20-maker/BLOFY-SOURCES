// BLOFY STREAM dedicated control-plane bootstrap. This service has NO
// subscriber database, Xtream source secrets or production media paths.
// Do not move customer traffic until an authenticated bridge and canary exist.
import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {verifyRestreamSmoke} from './restream-smoke.mjs';
import {createOperatorDashboard} from './operator-dashboard.mjs';
import {createDistributorDashboard} from './distributor-dashboard.mjs';
import {handleStreamConnect} from './stream-connect-page.mjs';
import {createConnectIssuer,connectPilotAuthorized,connectPilotChallenge} from './stream-connect-issuer.mjs';
import {createMediaControlClient} from './mediamtx-private-control.mjs';
import {createUnifiedPortalClient} from './unified-portal-client.mjs';
import {createLiveRestreamSupervisor} from './live-restream-supervisor.mjs';
import {createVodPreviewBroker} from './vod-preview-broker.mjs';
import {normalizePrivateRestreamOrigin} from './restream-engine-core.mjs';
import {createRelayBroker} from './relay-broker.mjs';
import {createIdleFanoutReleaseRecovery} from './idle-fanout-release-recovery.mjs';
import {createLiveAutoHealth} from './live-auto-health.mjs';
import {createStreamOpsObservatory,summarizeMediaHour} from './stream-ops-observatory.mjs';
import {createMediaEngineRedundancyWatch} from './media-engine-redundancy-watch.mjs';
import {createMediaHlsCanaryWatch} from './media-hls-canary-watch.mjs';
import {createMediaHourBufferInspector} from './media-hour-buffer-inspector.mjs';
import {probeLicensedSharedLive} from './shared-live-canary.mjs';
import {createSharedLiveReadiness} from './shared-live-readiness.mjs';
import {runOperatorEgressProbe} from './operator-egress-probe.mjs';
import {probeOutboundIpv4} from './outbound-ip-proof.mjs';
import {createCrossProjectSourceDiagnostic} from './xtream-account-diagnostic.mjs';
import {createXtreamCatalogRelay,createXtreamManifestRelay} from './xtream-catalog-relay.mjs';
import {createOfficialM3uDiagnostic} from './xtream-playlist-route-diagnostic.mjs';
import {createXtreamMediaClientProfileDiagnostic} from './xtream-media-client-profile-diagnostic.mjs';
import {createReadReplicaObserver} from './read-replica-observer.mjs';
import {readOnlyOperatorSiteProof} from './operator-site-live-readiness.mjs';
import {verifyReadReplicaSynthetic} from './read-replica-synthetic.mjs';

const DEFAULT_ENGINE='http://blofy-stream-media.railway.internal:8888';
const STANDBY_ENGINE='http://blofy-stream-media-standby.railway.internal:8888';
const startedAt=new Date().toISOString();
const safeResponse=(res,status,data)=>{
  const body=Buffer.from(JSON.stringify(data));
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'x-frame-options':'DENY','referrer-policy':'no-referrer',
    'content-length':body.length
  });
  res.end(body);
};
function authorized(header,expected){
  if(typeof expected!=='string'||expected.length<32)return false;
  if(typeof header!=='string'||!header.startsWith('Bearer '))return false;
  const actual=Buffer.from(header.slice(7)),secret=Buffer.from(expected);
  return actual.length===secret.length&&timingSafeEqual(actual,secret);
}
function safeEnvironment({port,engineUrl}){
  const n=Number(port??3000);
  if(!Number.isInteger(n)||n<1024||n>65535)throw new Error('blofy_stream_port_invalid');
  const origin=normalizePrivateRestreamOrigin(engineUrl??DEFAULT_ENGINE);
  if(origin!=='http://blofy-stream-media.railway.internal:8888')
    throw new Error('blofy_stream_media_origin_not_private_peer');
  return {port:n,origin};
}
export function createStreamServer({
  engineUrl=DEFAULT_ENGINE,
  adminToken='',
  operatorProxyToken='',
  relaySharedToken='',
  relayFetchImpl=fetch,
  relayLookup=undefined,
  relayRedirectSourceOrigin='',
  relayFirstByteTimeoutMs=12000,
  sharedLiveEnabled=false,
  autoHealthProbeEnabled=false,
  realSourceReadinessOnBoot=false,
  diagnosticAllowedOrigin='',
  fetchImpl=fetch,
  runBootCanary=false,
  port=3000,
  log=console
}={}){
  const cfg=safeEnvironment({port,engineUrl});
  const relayBroker=createRelayBroker({sharedToken:relaySharedToken,
    fetchImpl:relayFetchImpl,lookup:relayLookup,
    redirectSourceOrigin:relayRedirectSourceOrigin,
    firstByteTimeoutMs:relayFirstByteTimeoutMs,sharedLiveEnabled,
    onSharedLiveEvent:evt=>{
      // Persist bounded, sanitized connection lifecycle via Railway logs
      // across restarts while retaining zero URLs or customer identifiers.
      const payload=JSON.stringify(evt);
      if(evt.kind==='failed'||evt.kind==='reconnecting')
        log.warn('BLOFY_STREAM_SHARED_LIVE_EVENT',payload);
      else log.info('BLOFY_STREAM_SHARED_LIVE_EVENT',payload);
    }});
  const sourceDiagnostic=createCrossProjectSourceDiagnostic({
    sharedToken:relaySharedToken,allowedOrigin:diagnosticAllowedOrigin
  });
  const catalogRelay=createXtreamCatalogRelay({
    sharedToken:relaySharedToken,allowedOrigin:diagnosticAllowedOrigin
  });
  const manifestRelay=createXtreamManifestRelay({
    sharedToken:relaySharedToken,allowedOrigin:diagnosticAllowedOrigin
  });
  const officialM3uDiagnostic=createOfficialM3uDiagnostic({
    sharedToken:relaySharedToken,allowedOrigin:diagnosticAllowedOrigin
  });
  const clientProfiles=createXtreamMediaClientProfileDiagnostic({
    sharedToken:relaySharedToken,allowedOrigin:diagnosticAllowedOrigin,
    allowRedirectFrom:relayRedirectSourceOrigin,fetchImpl:relayFetchImpl,
    lookup:relayLookup
  });
  let checking=false,checkedAt=0,lastCanary=null;
  async function canary(){
    if(checking)return {ok:false,code:'canary_in_progress',realSourceVerified:false};
    checking=true;checkedAt=Date.now();
    try{
      const report=await verifyRestreamSmoke(cfg.origin,{fetchImpl});
      lastCanary=report;
      return report;
    }finally{checking=false;}
  }
  const unifiedPortal=createUnifiedPortalClient({
    secret:process.env.BLOFY_STREAM_UNIFIED_BRIDGE_KEY||'',fetchImpl
  });
  const sharedReadiness=createSharedLiveReadiness({
    portal:unifiedPortal,sourceName:'saleh',search:'V SPORT',
    probe:({sourceUrl})=>probeLicensedSharedLive({
      sourceUrl,fetchImpl:relayFetchImpl,lookup:relayLookup,
      redirectSourceOrigin:relayRedirectSourceOrigin,
      approvedProviderRedirect:true,durationMs:26000
    }),
    onResult:report=>{
      // Aggregate only. Do not include source names, URLs, account details,
      // provider response bodies, customer IDs or auth tickets in logs.
      log.info('BLOFY_STREAM_SHARED_SOURCE_READINESS',JSON.stringify({
        ok:report.ok,code:report.code,mode:report.mode,
        durationMs:report.durationMs,
        upstreamSessions:report.upstreamSessions,
        viewerSamples:report.viewerSamples,
        reconnects:report.reconnects,
        failureCodes:report.failureCodes,phase:report.phase,
        transportCode:report.transportCode,
        customerTrafficChanged:false
      }));
    }
  });
  const liveSupervisor=createLiveRestreamSupervisor({
    portal:unifiedPortal,fetchImpl,
    httpEofReconnect:process.env.BLOFY_STREAM_HLS_EOF_RECONNECT_EXPERIMENT==='1',
    mediaPassword:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD||'',
    standbyEnabled:process.env.BLOFY_STREAM_MEDIAMTX_STANDBY_PATH_FAILOVER==='1',
    recordHourEnabled:process.env.BLOFY_STREAM_OPERATOR_HOUR_RECORDING_ENABLED==='1',
    // Requires explicit admin activation after a verified saleh source pilot.
    // Existing subscriber routing remains untouched by this operator control.
    salehOnlyOrigin:process.env.BLOFY_STREAM_SALEH_ORIGIN_ENABLED==='1',
    salehUpstreamChannelLimit:1
  });
  const vodBroker=createVodPreviewBroker({portal:unifiedPortal,fetchImpl});
  const autoHealth=createLiveAutoHealth({liveSupervisor,
    relayStats:()=>relayBroker.stats(),recoveryProbeEnabled:autoHealthProbeEnabled});
  const streamOps=createStreamOpsObservatory({
    relayStats:()=>relayBroker.stats(),autoHealth:()=>autoHealth.snapshot()});
  const mediaHlsCanary=createMediaHlsCanaryWatch({
    fetchImpl,logger:event=>console.info('BLOFY_MEDIA_SYNTHETIC_HEALTH',JSON.stringify(event))
  });
  const mediaHourBuffer=createMediaHourBufferInspector({
    fetchImpl,controlPassword:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD||'',
    logger:event=>console.info('BLOFY_MEDIA_HOUR_BUFFER',JSON.stringify(event))
  });
  const mediaRedundancy=createMediaEngineRedundancyWatch({
    fetchImpl,controlPassword:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD||'',
    logger:record=>console.info('BLOFY_MEDIA_REDUNDANCY_WATCH',JSON.stringify(record))
  });
  let replicaBootProof=null;
  const operatorDashboard=createOperatorDashboard({
    liveSupervisor,vodBroker,sharedReadiness,streamOps:()=>streamOps.snapshot(),
    mediaRedundancy:()=>mediaRedundancy.snapshot(),
    mediaHlsCanary:()=>mediaHlsCanary.snapshot(),
    mediaHourBuffer:()=>mediaHourBuffer.snapshot(),
    getReplicaSynthetic:()=>replicaBootProof,
    sharedRelayStats:()=>relayBroker.stats(),
    autoHealth:()=>autoHealth.snapshot(),
    adminToken,operatorProxyToken,engineOrigin:cfg.origin,fetchImpl,
    controlUsername:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_USER||'',
    controlPassword:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD||'',
    unifiedSecret:process.env.BLOFY_STREAM_UNIFIED_BRIDGE_KEY||'',
    edgeObservabilityKey:process.env.BLOFY_STREAM_EDGE_OBSERVABILITY_KEY||'',
    playbackGroqApiKey:process.env.BLOFY_STREAM_GROQ_API_KEY||'',
    getSmokeState:()=>({
      checked:Boolean(lastCanary),checking,mediaVerified:Boolean(lastCanary?.mediaVerified),
      code:lastCanary?.code??null,elapsedMs:lastCanary?.elapsedMs??null,
      realSourceVerified:false,audioVideoDecoded:false
    }),
     runSmoke:async()=>{
      if(checking||(checkedAt&&Date.now()-checkedAt<30_000))
        return {status:429,body:{ok:false,code:'canary_rate_limited'}};
      const report=await canary();
      return {status:report.ok?200:503,body:report};
    },
    runDemoProbe:async()=>{
      const report=await verifyRestreamSmoke(cfg.origin,{fetchImpl,pathName:'blofy-demo'});
      return {status:report.ok?200:503,body:{...report,
        customerTrafficChanged:false,realSourceVerified:false}};
    }
  });
  const distributorDashboard=createDistributorDashboard({bridge:unifiedPortal,log});
  const connectPilotToken=process.env.BLOFY_CONNECT_PILOT_TOKEN||'';
  const connectEnabled=process.env.BLOFY_CONNECT_WEB_ENABLED==='1'&&unifiedPortal.configured&&connectPilotToken.length>=32;
  const connectPublicEnabled=connectEnabled&&process.env.BLOFY_CONNECT_PUBLIC_BETA==='1';
  const connectIssuer=createConnectIssuer({bridge:unifiedPortal,enabled:connectEnabled,publicEnabled:connectPublicEnabled,pilotToken:connectPilotToken});
  const app=http.createServer((req,res)=>{
    const privateLive=req.url?.split('?')[0].match(/^\/internal\/live-feed\/([a-f0-9]{48})$/);
    if(privateLive)return void liveSupervisor.streamFeed(req,res,privateLive[1]);
    if(operatorDashboard.handle(req,res))return;
    if(distributorDashboard.handle(req,res))return;
    if(connectIssuer.handle(req,res))return;
    if((req.url||'').split('?')[0]==='/connect/pilot'){
      if(!connectEnabled){res.writeHead(503,{'cache-control':'no-store'});res.end('CONNECT pilot is disabled');return;}
      if(!connectPilotAuthorized(req,connectPilotToken)){connectPilotChallenge(res);return;}
      return handleStreamConnect(req,res,{enabled:true,pilot:true});
    }
    if(handleStreamConnect(req,res,{enabled:connectPublicEnabled,publicBeta:connectPublicEnabled}))return;
    const url=new URL(req.url||'/', 'http://localhost');
    if(url.pathname==='/internal/xtream-account-diagnostic')
      return void sourceDiagnostic.handle(req,res);
    if(url.pathname==='/internal/xtream-catalog-relay')
      return void catalogRelay.handle(req,res);
    if(url.pathname==='/internal/xtream-manifest-relay')
      return void manifestRelay.handle(req,res);
    if(url.pathname==='/internal/xtream-official-m3u-diagnostic')
      return void officialM3uDiagnostic.handle(req,res);
    if(url.pathname==='/internal/xtream-media-client-profiles')
      return void clientProfiles.handle(req,res);
    if(url.pathname==='/internal/media-engine-health'&&req.method==='GET'){
      if(!authorized(req.headers.authorization,adminToken))
        return safeResponse(res,401,{ok:false,code:'not_authorized'});
      void liveSupervisor.mediaEngineHealth().then(report=>
        safeResponse(res,report.ok?200:503,report)).catch(()=>
        safeResponse(res,503,{ok:false,code:'restream_control_unavailable',
          customerTrafficChanged:false,providerRequests:0}));
      return;
    }
    // Last-hour operator transport report; read-only, no IPTV media reads.
    if(url.pathname==='/internal/media-hour-report'&&req.method==='GET'){
      if(!authorized(req.headers.authorization,adminToken))
        return safeResponse(res,401,{ok:false,code:'not_authorized'});
      const report=summarizeMediaHour(streamOps.snapshot());
      return safeResponse(res,report.ok?200:503,report);
    }
    if(url.pathname==='/internal/relay-health'&&req.method==='GET'){
      if(!relayBroker.enabled||!authorized(req.headers.authorization,relaySharedToken))
        return safeResponse(res,401,{ok:false,code:'relay_not_authorized'});
      const f=relayBroker.stats().fanout;
      return safeResponse(res,200,{ok:true,service:'BLOFY-STREAM',
        role:'media_plane',relayReady:true,customerTrafficEnabled:false,
        sharedLiveConfigured:relayBroker.stats().sharedLiveEnabled,
        // Aggregate counters ONLY. Source URL, ticket, provider identity,
        // subscriber IP and secrets are not disclosed by this endpoint.
        fanout:{activeFeeds:f.activeFeeds,viewers:f.viewers,
          maxViewersPerFeed:f.maxViewersPerFeed,maxFeeds:f.maxFeeds,
          upstreamReconnects:f.upstreamReconnects,
          initialRetries:f.initialRetries,
          reconnectRecovered:f.reconnectRecovered,
          sourceOutages:f.sourceOutages,
          reconnectExhaustions:f.reconnectExhaustions,
          slowViewerDisconnects:f.slowViewerDisconnects,
          sourceBytesReceived:f.sourceBytesReceived,
          viewerBytesQueued:f.viewerBytesQueued,
          viewersAccepted:f.viewersAccepted,
          // Authenticated aggregate timings only; null without observations.
          mediaLatency:f.mediaLatency,
          pendingSourceHandoffs:f.pendingSourceHandoffs,
          bufferedBootstrapBytes:f.bufferedBootstrapBytes}});
    }
    if(url.pathname==='/internal/relay-grants')
      return void relayBroker.issue(req,res);
    if(url.pathname.startsWith('/relay/'))
      return void relayBroker.relay(req,res);
    if(req.method==='GET'&&url.pathname==='/synthetic/transport.ts'){
      // Small deterministic transport-layer fixture. Not decodable video;
      // never associate with an Xtream provider or subscriber.
      const bytes=Buffer.alloc(188*3,0x00);
      for(let offset=0;offset<bytes.length;offset+=188){
        bytes[offset]=0x47;
        bytes[offset+1]=0x1f;
        bytes[offset+2]=0xff;
        bytes[offset+3]=0x10;
      }
      res.writeHead(200,{'content-type':'video/mp2t','content-length':bytes.length,
        'cache-control':'no-store','x-content-type-options':'nosniff',
        'referrer-policy':'no-referrer'});
      return res.end(bytes);
    }
    if(req.method==='GET'&&url.pathname==='/health'){
      return safeResponse(res,200,{
        ok:true,service:'BLOFY-STREAM',independentProject:true,stage:'media_canary',
        customerTrafficEnabled:false,xtreamAccountMigrationComplete:false,
        relayCapabilityReady:relayBroker.enabled,
        realSourceVerified:false,startedAt
      });
    }
    if(req.method==='GET'&&url.pathname==='/health/media'){
      return safeResponse(res,lastCanary?.ok?200:503,{
        ok:Boolean(lastCanary?.ok),service:'BLOFY-STREAM',checks: lastCanary ? {
          mediaVerified:Boolean(lastCanary.mediaVerified),
          realSourceVerified:false,audioVideoDecoded:false,
          code:lastCanary.code||'canary_failed',elapsedMs:lastCanary.elapsedMs??null
        }:null
      });
    }
    if(req.method==='POST'&&url.pathname==='/internal/smoke'){
      if(!authorized(req.headers.authorization,adminToken))
        return safeResponse(res,401,{ok:false,code:'not_authorized'});
      if(checking||(checkedAt&&Date.now()-checkedAt<30_000))
        return safeResponse(res,429,{ok:false,code:'canary_rate_limited'});
      void canary().then(report=>safeResponse(res,report.ok?200:503,report))
        .catch(()=>safeResponse(res,503,{ok:false,code:'canary_failed'}));
      return;
    }
    return safeResponse(res,404,{ok:false,code:'route_not_found'});
  });
  app.on('clientError',(_err,socket)=>{
    if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
  });
  function startBootCanary(){
    if(!runBootCanary)return;
    const t=setTimeout(()=>{
      void canary().then(report=>log.info('BLOFY_STREAM_ISOLATED_SMOKE',JSON.stringify(report)))
        .catch(()=>log.error('BLOFY_STREAM_ISOLATED_SMOKE',JSON.stringify({
          ok:false,code:'canary_failed',realSourceVerified:false
        })));
    },9000);
    t.unref?.();
  }
  function startBootSourceReadiness(){
    if(!realSourceReadinessOnBoot)return;
    // Only the uniquely named licensed 'saleh' source and a uniquely matching
    // 4K V SPORT channel are eligible for this single two-reader, 26s probe.
    // It does NOT publish a MediaMTX path or redirect any paying customer.
    const timer=setTimeout(()=>{
      void sharedReadiness.auto().catch(()=>{
        log.warn('BLOFY_STREAM_SHARED_SOURCE_READINESS',JSON.stringify({
          ok:false,code:'pilot_internal_error',customerTrafficChanged:false
        }));
      });
    },20000);
    timer.unref?.();
  }
  return {app,config:cfg,startBootCanary,startBootSourceReadiness,canary,
    recordReplicaProof:proof=>{replicaBootProof={
      ok:proof?.ok===true,code:String(proof?.code||'replica_probe_failed').slice(0,65),
      stage:String(proof?.stage||'unknown').slice(0,32),
      transportVerified:proof?.transportVerified===true,
      bytesVerified:Number.isSafeInteger(proof?.bytesVerified)?proof.bytesVerified:0,
      elapsedMs:Number.isSafeInteger(proof?.elapsedMs)?proof.elapsedMs:null,
      checkedAt:new Date().toISOString(),realSalehVerified:false
    }},
    liveSupervisor,autoHealth,streamOps,mediaRedundancy,mediaHlsCanary,mediaHourBuffer,operatorDashboard,sharedReadiness,
    relayStats:()=>relayBroker.stats()};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const service=createStreamServer({
    engineUrl:process.env.BLOFY_RESTREAM_ENGINE_URL||DEFAULT_ENGINE,
    adminToken:process.env.BLOFY_STREAM_ADMIN_TOKEN||'',
    operatorProxyToken:process.env.BLOFY_STREAM_OPERATOR_PROXY_TOKEN||'',
    relaySharedToken:process.env.BLOFY_STREAM_RELAY_SHARED_TOKEN||'',
    sharedLiveEnabled:process.env.BLOFY_STREAM_SHARED_LIVE_ENABLED==='1',
    autoHealthProbeEnabled:process.env.BLOFY_STREAM_AUTO_HEALTH_REPROBE_ENABLED==='1',
    realSourceReadinessOnBoot:process.env.BLOFY_STREAM_SHARED_REAL_SOURCE_PROBE_ON_BOOT==='1',
    relayRedirectSourceOrigin:process.env.BLOFY_STREAM_MEDIA_REDIRECT_SOURCE_ORIGIN||'',
    diagnosticAllowedOrigin:process.env.BLOFY_STREAM_DIAGNOSTIC_ALLOW_ORIGIN||'',
    port:process.env.PORT||3000,
    runBootCanary:process.env.BLOFY_STREAM_CANARY_ON_BOOT==='1'
  });
  service.app.listen(service.config.port,'0.0.0.0',()=>{
    console.info('BLOFY STREAM isolated control API ready on :'+service.config.port);
    service.startBootCanary();
    service.startBootSourceReadiness();
    service.autoHealth.start();
    // Contact only the MediaMTX replica's private, non-media HLS root.
    // 404 is expected and means transport is reachable. No source stream
    // path, Xtream credential, subscriber or public media URL is requested.
    const edgeObserver=createReadReplicaObserver();
    void edgeObserver.check().then(report=>console.info(
      'BLOFY_STREAM_PRIVATE_READ_REPLICA',JSON.stringify({
        reachable:report.reachable,code:report.code,
        httpStatus:report.httpStatus,providerRequests:0,
        customerTrafficChanged:false,mediaVerified:false
      })
    )).catch(()=>console.warn('BLOFY_STREAM_PRIVATE_READ_REPLICA',
      JSON.stringify({reachable:false,code:'probe_exception',
        customerTrafficChanged:false,providerRequests:0})));
    // Optional one-shot QA: ONLY /smoke HLS via the private MediaMTX edge.
    // No saleh provider request, channel IDs or client playback path.
    if(process.env.BLOFY_STREAM_REPLICA_SYNTHETIC_ON_BOOT==='1'){
      const smokeTimer=setTimeout(()=>{
        void verifyReadReplicaSynthetic({timeoutMs:20000}).then(proof=>{
          service.recordReplicaProof(proof);
          console.info('BLOFY_STREAM_READ_REPLICA_SYNTHETIC',JSON.stringify({
            ok:proof.ok,code:proof.code,stage:proof.stage,
            bytesVerified:proof.bytesVerified||0,httpStatus:proof.httpStatus,
            lastSafePath:proof.lastSafePath,redirectCount:proof.redirectCount,
            elapsedMs:proof.elapsedMs,requestCount:proof.requests,
            realSalehVerified:false,customerTrafficChanged:false
          }));
        }).catch(()=>console.warn('BLOFY_STREAM_READ_REPLICA_SYNTHETIC',
          JSON.stringify({ok:false,code:'replica_probe_failed',
            customerTrafficChanged:false})));
      },5500);
      smokeTimer.unref?.();
    }
    // Passive in-memory snapshots continue while the admin page is closed.
    // No extra source/media requests, no customer cutover, no account writes.
    service.streamOps.start();
    service.mediaRedundancy.start();
    service.mediaHlsCanary.start({delayMs:40000});
    service.mediaHourBuffer.start({delayMs:90000});
    // Independently prove HLS transport on the standby with an internal
    // synthetic 2-track source; this is NOT a real provider or customer test.
    // No customer cutover, source credential, or recording is performed.
    if(process.env.BLOFY_STREAM_STANDBY_SYNTHETIC_ON_BOOT==='1'){
      const standbySmokeTimer=setTimeout(()=>{
        void verifyRestreamSmoke(STANDBY_ENGINE,{
          pathName:'smoke',timeoutMs:22000
        }).then(report=>console.info('BLOFY_MEDIA_STANDBY_SYNTHETIC',
          JSON.stringify({
            ok:report.ok,code:report.code,stage:report.stage,
            elapsedMs:report.elapsedMs,
            bytesVerified:report.bytesVerified||0,
            providerRequests:0,customerTrafficChanged:false,
            audioVideoDecoded:false,realSourceVerified:false
          })))
        .catch(()=>console.warn('BLOFY_MEDIA_STANDBY_SYNTHETIC',
          JSON.stringify({ok:false,code:'standby_synthetic_probe_failed',
            providerRequests:0,customerTrafficChanged:false})));
      },17000);
      standbySmokeTimer.unref?.();
    }
    // Read-only Smart Playback Health runs while admin UI is closed.
    // Samples only fixed internal monitoring APIs once per minute.
    service.operatorDashboard.start();
    // Coarse on-instance media failure diagnosis; log aggregate-only reason
    // buckets when counts change. Never emit token paths, provider hosts,
    // subscriber IPs or upstream credentials.
    let lastRelayFailureReport='';
    const mediaAudit=setInterval(()=>{
      const f=service.relayStats().fanout;
      if(!f?.providerFailures&&!f?.cooldownRejections)return;
      const audit={providerFailures:f.providerFailures,
        cooldownRejections:f.cooldownRejections,
        initialRetries:f.initialRetries,
        reconnectRecovered:f.reconnectRecovered,
        sourceOutages:f.sourceOutages,
        reconnectExhaustions:f.reconnectExhaustions,
        failureReasons:f.failureReasons};
      const key=JSON.stringify(audit);
      if(key!==lastRelayFailureReport){
        lastRelayFailureReport=key;
        console.warn('BLOFY_STREAM_MEDIA_FAILURE_AGGREGATE',key);
      }
    },60000);
    mediaAudit.unref?.();
    // A crashed/aborted licensed source can leave its body.cancel() Promise
    // unresolved even after all viewers leave. Its one-slot admission must
    // never be bypassed by starting a second provider connection. If ONLY
    // an orphaned release remains for >=60s, no active feeds and zero
    // viewers, let Railway close our real sockets by restarting this
    // isolated API. Healthy streams are NEVER interrupted by this guard.
    // Emergency rollback: BLOFY_STREAM_IDLE_FANOUT_RECOVERY_DISABLED=1.
    const verifyStaleRelease=createIdleFanoutReleaseRecovery({
      minStallMs:60000,minSamples:3
    });
    const releaseGuard=setInterval(()=>{
      const snapshot=service.relayStats();
      if(snapshot?.sharedLiveEnabled!==true||
         process.env.BLOFY_STREAM_IDLE_FANOUT_RECOVERY_DISABLED==='1')return;
      const decision=verifyStaleRelease(snapshot.fanout);
      if(!decision.restart)return;
      console.error('BLOFY_STREAM_LICENSED_SOURCE_RELEASE_RECOVERY',JSON.stringify({
        code:'orphaned_provider_release_requires_process_socket_close',
        pendingSourceHandoffs:snapshot.fanout.pendingSourceHandoffs,
        activeFeeds:0,viewers:0,
        reason:'only_after_60s_with_zero_customers',
        customerConnectionsInterrupted:false,
        providerQuotaBypassed:false
      }));
      // No privileged force-free: termination actually closes the process
      // sockets. Railway restarts the stateless control service normally.
      process.exit(76)
    },5000);
    releaseGuard.unref?.();
    // Restore safety after app restarts: the prior process held short-lived
    // private feed credentials only in memory. Clear orphaned worker configs.
    let recoveryAttempts=0;
    const recoverStalePaths=()=>{
      recoveryAttempts++;
      void service.liveSupervisor.recoverOldPaths().then(result=>{
        console.info('BLOFY_STREAM_LIVE_RECOVERY',JSON.stringify({
          ...result,attempt:recoveryAttempts
        }));
        if(!result.ok&&recoveryAttempts<4){
          const retry=setTimeout(recoverStalePaths,Math.min(30000,4000*recoveryAttempts));
          retry.unref?.();
        }
      }).catch(()=>{
        console.warn('BLOFY_STREAM_LIVE_RECOVERY',JSON.stringify({
          ok:false,code:'restream_control_unavailable',attempt:recoveryAttempts
        }));
        if(recoveryAttempts<4){
          const retry=setTimeout(recoverStalePaths,Math.min(30000,4000*recoveryAttempts));
          retry.unref?.();
        }
      });
    };
    const staleTimer=setTimeout(recoverStalePaths,6500);staleTimer.unref?.();
    // Retire the old synthetic dashboard path from MediaMTX once. The normal
    // path 'smoke' remains internal-only for health checks, not the UI.
    if(process.env.BLOFY_STREAM_PURGE_DEMO_PATH_ON_BOOT==='1'){
      const timer=setTimeout(()=>{
        const control=createMediaControlClient({
          username:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_USER||'',
          password:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD||''
        });
        void control.demoAction('stop').then(result=>
          console.info('BLOFY_STREAM_LEGACY_PATH_CLEANUP',JSON.stringify({
            ok:result.body.ok,code:result.body.code,customerTrafficChanged:false
          }))
        ).catch(()=>console.warn('BLOFY_STREAM_LEGACY_PATH_CLEANUP',
          JSON.stringify({ok:false,code:'cleanup_unavailable'})));
      },8000);timer.unref?.();
    }
    // Prove the unified admin bridge talks to the authoritative database.
    // Only source/account aggregate counts are logged; no customer identities.
    if(process.env.BLOFY_STREAM_UNIFIED_PROBE_ON_BOOT==='1'){
      const timer=setTimeout(()=>{
        const portal=createUnifiedPortalClient({
          secret:process.env.BLOFY_STREAM_UNIFIED_BRIDGE_KEY||''
        });
        void portal.overview().then(({status,body})=>{
          console.info('BLOFY_STREAM_UNIFIED_BRIDGE_PROOF',JSON.stringify({
            ok:status===200&&body?.ok===true,
            code:status===200?'connected':String(body?.code||'unavailable').slice(0,70),
            sources:Number.isInteger(body?.totals?.servers)?body.totals.servers:null,
            credentialsLogged:false,customerTrafficChanged:false
          }));
        }).catch(()=>console.warn('BLOFY_STREAM_UNIFIED_BRIDGE_PROOF',
          JSON.stringify({ok:false,code:'bridge_probe_error'})));
        // Authenticate through the SAME fixed Portal bridge and check six
        // operator modules against real production read endpoints. The
        // result contains only HTTP status classes and timing, never DB rows.
        // Code and reseller GET are excluded since they may initialize
        // database schema; no real writes are performed by this proof.
        void readOnlyOperatorSiteProof({client:portal})
          .then(report=>console.info('BLOFY_STREAM_SITE_READINESS',JSON.stringify(report)))
          .catch(()=>console.warn('BLOFY_STREAM_SITE_READINESS',
            JSON.stringify({ok:false,code:'site_readiness_error',
              sourceMediaRequests:0,customerCutover:false})));
        // Metadata-only season bridge proof. Never reads upstream media or
        // reveals object keys, credentials, title names or subscriber data.
        void portal.contentHubSeasonQueue().then(({status,body})=>{
          const rows=Array.isArray(body?.episodes)?body.episodes:[];
          console.info('BLOFY_STREAM_SEASON_BRIDGE_PROOF',JSON.stringify({
            ok:status===200&&body?.ok===true,
            ready:body?.readiness?.ready===true,
            blockedBy:Array.isArray(body?.readiness?.blockedBy)?
              body.readiness.blockedBy.slice(0,12):[],
            queued:rows.filter(x=>x.state==='queued').length,
            verified:rows.filter(x=>x.state==='verified').length,
            active:body?.worker?.active===true,
            providerMediaRequests:0,customerCutover:false
          }));
        }).catch(()=>console.warn('BLOFY_STREAM_SEASON_BRIDGE_PROOF',
          JSON.stringify({ok:false,code:'season_bridge_unavailable',
            providerMediaRequests:0,customerCutover:false})));
      },15000);timer.unref?.();
    }
    // Operator-triggered once per deployment. No provider credentials and
    // no subscriber traffic. Railway's three-IP egress can load balance, so
    // observed IPs must be checked against the full Networking assignment.
    if(process.env.BLOFY_OPERATOR_EGRESS_IP_ON_BOOT==='1'){
      const timer=setTimeout(()=>{
        void probeOutboundIpv4().then(report=>
          console.info('BLOFY_STREAM_OUTBOUND_IP_PROOF',JSON.stringify(report))
        ).catch(()=>console.warn('BLOFY_STREAM_OUTBOUND_IP_PROOF',
          JSON.stringify({ok:false,code:'egress_echo_unavailable'})));
      },11000);
      timer.unref?.();
    }
    if(process.env.BLOFY_OPERATOR_EGRESS_PROBE_ON_BOOT==='1'){
      const timer=setTimeout(()=>{
        void runOperatorEgressProbe(process.env.BLOFY_OPERATOR_EGRESS_HOST||'').then(report=>{
          // No provider hostname, IP, accounts, response body or full URL in logs.
          console.info('BLOFY_OPERATOR_EGRESS_PROBE',JSON.stringify(report));
        }).catch(()=>{
          console.warn('BLOFY_OPERATOR_EGRESS_PROBE',JSON.stringify({ok:false,code:'probe_failed'}));
        });
      },4000);
      timer.unref?.();
    }
  });
  process.on('SIGTERM',()=>{
    service.operatorDashboard.stop();
    service.streamOps.stop();service.autoHealth.stop();
    service.app.close(()=>process.exit(0));
  });
}
