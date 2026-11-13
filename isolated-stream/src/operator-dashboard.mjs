// Isolated operator console. It cannot alter subscriber routes, Xtream
// credentials, source catalogs or production services. No API tokens in HTML.
import {timingSafeEqual,randomBytes} from 'node:crypto';
import {renderOperatorDashboard} from './operator-unified-view.mjs';
import {createMediaControlClient} from './mediamtx-private-control.mjs';
import {createUnifiedPortalClient} from './unified-portal-client.mjs';
import {createPlatformSystemAudit} from './platform-system-audit.mjs';
import {createStreamReleaseInspector} from './stream-release-inspector.mjs';
import {buildOperatorSupportBundle} from './platform-support-bundle.mjs';
import {createStreamCrossServiceDiagnosis} from './cross-service-diagnostics.mjs';
import {createEdgeMetricsClient} from './edge-metrics-client.mjs';
import {createSmartPlaybackMonitor} from './smart-playback-monitor.mjs';
import {createSmartPlaybackAi} from './smart-playback-ai.mjs';
import {createReadReplicaObserver} from './read-replica-observer.mjs';

const json=(res,status,payload)=>{
  const body=Buffer.from(JSON.stringify(payload));
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'x-frame-options':'DENY','referrer-policy':'no-referrer',
    'content-length':body.length});
  res.end(body);
};
function authorized(req,token){
  if(typeof token!=='string'||token.length<32)return false;
  const header=req.headers.authorization;
  if(typeof header!=='string'||!header.startsWith('Basic '))return false;
  try{
    const value=Buffer.from(header.slice(6),'base64').toString('utf8');
    const colon=value.indexOf(':');
    if(colon<0||value.slice(0,colon)!=='operator')return false;
    const actual=Buffer.from(value.slice(colon+1));
    const expected=Buffer.from(token);
    return actual.length===expected.length&&timingSafeEqual(actual,expected);
  }catch{return false;}
}
async function readAdminJson(req){
  if(!String(req.headers['content-type']||'').includes('application/json'))
    throw Object.assign(new Error('json_required'),{status:415});
  let size=0,parts=[];
  for await(const part of req){
    size+=part.length;
    if(size>8192)throw Object.assign(new Error('request_too_large'),{status:413});
    parts.push(part);
  }
  try{
    const body=JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');
    if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid');
    return body;
  }catch{throw Object.assign(new Error('invalid_json'),{status:400})}
}
export function createOperatorDashboard({adminToken='',engineOrigin,fetchImpl=fetch,
  getSmokeState=()=>({}),runSmoke=async()=>({status:503,body:{ok:false,code:'not_ready'}}),
  controlUsername='',controlPassword='',unifiedSecret='',edgeObservabilityKey='',
  playbackGroqApiKey='',
  liveSupervisor=null,vodBroker=null,
  sharedRelayStats=()=>null,autoHealth=()=>({ok:false,code:'not_configured'}),
  streamOps=()=>({ok:false,code:'not_configured'}),
  sharedReadiness=null}={}){
  const control=createMediaControlClient({fetchImpl,username:controlUsername,password:controlPassword});
  const portal=createUnifiedPortalClient({fetchImpl,secret:unifiedSecret});
  const edgeClient=createEdgeMetricsClient({fetchImpl,key:edgeObservabilityKey});
  const crossService=createStreamCrossServiceDiagnosis({portal,
    relayStats:sharedRelayStats,
    restreamPaths:()=>liveSupervisor?.list?.()||null,
    mediaControl:control,edgeMetrics:()=>edgeClient.snapshot(),streamOps});
  const smartPlayback=createSmartPlaybackMonitor({
    collect:()=>crossService.snapshot()});
  const playbackAi=createSmartPlaybackAi({key:playbackGroqApiKey,fetchImpl});
  const readReplica=createReadReplicaObserver({fetchImpl});
  async function engineStatus(){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),1800);
    try{
      const response=await fetchImpl(engineOrigin+'/',{
        method:'GET',redirect:'manual',signal:controller.signal
      });
      try{await response.body?.cancel?.()}catch{}
      return {reachable:response.status>=200&&response.status<500,httpStatus:response.status};
    }catch{return {reachable:false,httpStatus:null}}
    finally{clearTimeout(timeout)}
  }
  const releaseInspector=createStreamReleaseInspector({fetchImpl});
  const platformAudit=createPlatformSystemAudit({
    portal,engineStatus,mediaControl:control,autoHealth,
    liveSupervisor,relayStats:sharedRelayStats,releaseInspector
  });
  const enabled=typeof adminToken==='string'&&adminToken.length>=32;

  // Basic auth is protected against brute-force without lockout of a valid
  // operator. Only invalid credentials are limited; do not trust spoofable
  // X-Forwarded-For. Keep at most 256 anonymous buckets in memory.
  const rejectedByPeer=new Map();
  const security={failedAuthAttempts:0,throttledAuthAttempts:0};
  const MAX_BAD_AUTH=12,AUTH_WINDOW_MS=60000;
  function rejectInvalidOperator(req,res){
    security.failedAuthAttempts++;
    const now=Date.now();
    const peer=String(req.socket?.remoteAddress||'unknown').slice(0,64);
    let bucket=rejectedByPeer.get(peer);
    if(!bucket||now-bucket.startedAt>=AUTH_WINDOW_MS)
      bucket={startedAt:now,attempts:0};
    bucket.attempts++;
    rejectedByPeer.delete(peer);rejectedByPeer.set(peer,bucket);
    while(rejectedByPeer.size>256)
      rejectedByPeer.delete(rejectedByPeer.keys().next().value);
    if(bucket.attempts>MAX_BAD_AUTH){
      security.throttledAuthAttempts++;
      json(res,429,{ok:false,code:'operator_auth_rate_limited'});
      return;
    }
    res.writeHead(401,{'www-authenticate':'Basic realm="BLOFY STREAM Operator", charset="UTF-8"',
      'cache-control':'no-store','x-frame-options':'DENY',
      'x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
    res.end('Authorization required');
  }
  const handle=(req,res)=>{
    const uri=new URL(req.url||'/', 'http://localhost');
    const path=uri.pathname;
    if(!(path==='/operator'||path==='/operator/'||path.startsWith('/operator/api/')))return false;
    if(!enabled){json(res,404,{ok:false,code:'operator_console_not_configured'});return true;}
    if(!authorized(req,adminToken)){
      rejectInvalidOperator(req,res);return true;
    }
    if(req.method==='GET'&&(path==='/operator'||path==='/operator/')){
      const nonce=randomBytes(16).toString('base64');
      const body=Buffer.from(renderOperatorDashboard(nonce));
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'x-frame-options':'DENY','x-content-type-options':'nosniff',
        'referrer-policy':'no-referrer','content-length':body.length});
      res.end(body);return true;
    }
    if(req.method==='GET'&&path==='/operator/api/stream-release'){
      void releaseInspector.inspect().then(report=>json(res,200,report))
        .catch(()=>json(res,503,{ok:false,code:'stream_release_inspector_unavailable'}));
      return true;
    }
    if(req.method==='GET'&&path==='/operator/api/support-bundle'){
      void platformAudit.audit().then(report=>json(res,report.ok?200:503,
        buildOperatorSupportBundle(report)))
        .catch(()=>json(res,503,{ok:false,code:'audit_not_available'}));
      return true;
    }
    if(req.method==='GET'&&path==='/operator/api/full-audit'){
      const sourceId=uri.searchParams.get('sourceId')||'';
      void platformAudit.audit({sourceId}).then(result=>
        json(res,result.ok?200:result.code==='platform_audit_source_invalid'?400:503,result))
        .catch(()=>json(res,503,{ok:false,code:'platform_audit_unavailable'}));
      return true;
    }
    if(req.method==='POST'&&path==='/operator/api/full-audit/ai'){
      if(req.headers['x-blofy-operator-action']!=='full-audit-ai-explain'){
        json(res,403,{ok:false,code:'operator_action_header_required'});return true;
      }
      // Groq receives ONLY fixed anonymous check codes. No URLs, source IDs,
      // account details, secrets, raw metrics, media bytes or device identifiers.
      // This is a manual advisory request; it never executes a repair.
      const allowed=new Set(['bridge','sources','catalog_live','catalog_movie',
        'catalog_series','media404','codes','libraryAI','subscribers','engine',
        'mediamtx','restream','fanout','quality_live','quality_movie',
        'quality_series','quality_startup','playback','sourceCapacity',
        'appUpdates','audio','episodes','subtitles','backup']);
      void readAdminJson(req).then(body=>{
        const sourceId=body.sourceId===undefined?'':String(body.sourceId||'');
        if(sourceId&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(sourceId))
          return {ok:false,code:'platform_audit_source_invalid'};
        return platformAudit.audit({sourceId}).then(report=>{
        if(report?.ok!==true)return {ok:false,code:'platform_audit_unavailable'};
        const relevant=(report.checks||[]).filter(c=>
          allowed.has(c.id)&&['warning','unknown'].includes(c.status))
          .sort((a,b)=>Number(b.status==='warning')-Number(a.status==='warning'))
          .slice(0,8);
        if(!relevant.length)return {ok:true,provider:null,priorityCode:'none',
          explanationAr:'لا توجد تحذيرات في الفحص الحالي؛ استجابة الخدمات لا تثبت نجاح التشغيل على الأجهزة.',
          advisoryOnly:true,decodedAudioVideoVerified:false,actionsExecuted:0};
        const assessment={ok:true,incidents:relevant.map(c=>({
          code:'audit_'+c.id+'_'+c.status,count:1,
          severity:c.status==='warning'?'warning':'unknown',
          actionCode:'manual_review'
        })),coverage:{}};
        return playbackAi.explain(assessment);
        });
      }).then(result=>json(res,result.ok?200:
        result.code==='platform_audit_source_invalid'?400:
        result.code==='playback_ai_cooldown'||result.code==='playback_ai_busy'?429:503,result))
        .catch(error=>json(res,[400,413,415].includes(error?.status)?error.status:503,{
          ok:false,code:[400,413,415].includes(error?.status)?error.message:'platform_audit_ai_unavailable'}));
      return true;
    }
    if(req.method==='POST'&&path==='/operator/api/media-failures/recheck-now'){
      if(req.headers['x-blofy-operator-action']!=='media-failures-recheck-now'){
        json(res,403,{ok:false,code:'operator_action_header_required'});return true;
      }
      void readAdminJson(req).then(body=>{
        if(body.confirmed!==true)
          return {status:400,body:{ok:false,code:'operator_confirmation_required'}};
        return portal.mediaFailuresRecheck({sourceId:body.sourceId,confirmed:true});
      }).then(result=>json(res,result.status,result.body))
        .catch(error=>json(res,[400,413,415].includes(error?.status)?error.status:503,
          {ok:false,code:[400,413,415].includes(error?.status)?
            error.message:'unavailable_recheck_unavailable'}));
      return true;
    }
    if(req.method==='GET'&&path==='/operator/api/auto-health'){
      json(res,200,autoHealth());return true;
    }
    if(req.method==='GET'&&path==='/operator/api/smart-ops'){
      // The operator auth gate above applies to this endpoint. This
      // snapshot never triggers real media probes or changes subscriptions.
      try{json(res,200,streamOps())}
      catch{json(res,503,{ok:false,code:'smart_ops_unavailable'})}
      return true;
    }
    if(req.method==='GET'&&path==='/operator/api/cross-service'){
      // Auth already verified: only cached service counters, no new media
      // requests, no source/edge probes and no subscriber information.
      void crossService.snapshot().then(report=>json(res,report.ok?200:503,report))
        .catch(()=>json(res,503,{ok:false,code:'cross_service_telemetry_unavailable'}));
      return true;
    }
    if(req.method==='GET'&&path==='/operator/api/playback-health'){
      // Precomputed in-memory minute samples, no on-demand media or provider
      // request, no customer identifiers or source credentials.
      json(res,200,{...smartPlayback.snapshot(),ai:playbackAi.status()});
      return true;
    }
    if(req.method==='POST'&&path==='/operator/api/playback-health/ai'){
      if(req.headers['x-blofy-operator-action']!=='playback-ai-explain'){
        json(res,403,{ok:false,code:'operator_action_header_required'});return true;
      }
      // Optional explicit manual click only. Only anonymous, allowlisted
      // metric codes go to Groq, never raw URLs/account/stream evidence.
      void playbackAi.explain(smartPlayback.snapshot().assessment)
        .then(result=>json(res,result.ok?200:result.code==='playback_ai_cooldown'||
          result.code==='playback_ai_busy'?429:503,result))
        .catch(()=>json(res,503,{ok:false,code:'playback_ai_unavailable'}));
      return true;
    }
    if(req.method==='GET'&&path==='/operator/api/security'){
      const relay=sharedRelayStats()||{};
      const metrics=relay.security||{};
      // Aggregate-only dashboard: never expose source URLs, client IPs,
      // token bytes, media tickets or subscriber account identities.
      json(res,200,{ok:true,service:'BLOFY-STREAM',
        protection:{operatorBruteForce:true,relayIssuanceThrottle:true,
          shortLivedTickets:true,authenticatedOperatorOnly:true},
        operator:{failedAuthAttempts:security.failedAuthAttempts,
          throttledAuthAttempts:security.throttledAuthAttempts},
        relay:{activeTickets:Number(relay.activeTickets||0),
          grantsIssued:Number(metrics.grantsIssued||0),
          issuerAuthDenied:Number(metrics.issuerAuthDenied||0),
          issuanceThrottled:Number(metrics.issuanceThrottled||0),
          capacityRejected:Number(metrics.capacityRejected||0),
          maxTickets:Number(metrics.maxTickets||0)},
        media:{providerFailures:Number(relay.fanout?.providerFailures||0),
          activeFeeds:Number(relay.fanout?.activeFeeds||0),
          viewers:Number(relay.fanout?.viewers||0),
          upstreamSessionsOpened:Number(relay.fanout?.upstreamSessionsOpened||0),
          upstreamReconnects:Number(relay.fanout?.upstreamReconnects||0),
          initialRetries:Number(relay.fanout?.initialRetries||0),
          reconnectRecovered:Number(relay.fanout?.reconnectRecovered||0),
          sourceOutages:Number(relay.fanout?.sourceOutages||0),
          cooldownRejections:Number(relay.fanout?.cooldownRejections||0),
          sourceBytesReceived:Number(relay.fanout?.sourceBytesReceived||0),
          viewerBytesQueued:Number(relay.fanout?.viewerBytesQueued||0),
          viewersAccepted:Number(relay.fanout?.viewersAccepted||0),
          // Operator-only ephemeral channel IDs: no source URL,
          // source name, device, account, IP, ticket, or credentials.
          channels:Array.isArray(relay.fanout?.channels)?
            relay.fanout.channels.slice(0,64):[],
          events:Array.isArray(relay.fanout?.events)?
            relay.fanout.events.slice(0,32):[],
          failureReasons:relay.fanout?.failureReasons||{}}
      });return true;
    }
    if(req.method==='GET'&&path==='/operator/api/state'){
      void Promise.all([engineStatus(),control.overview(),readReplica.check()])
        .then(([engine,mediaControl,readReplicaState])=>json(res,200,{
          ok:true,service:'BLOFY-STREAM',role:'independent-control',
          customerTrafficEnabled:false,realSourceMediaVerified:false,
          engine,sharedRelay:sharedRelayStats(),readReplica:readReplicaState,mediaControl:{
            controlAvailable:mediaControl.online,activePaths:mediaControl.readyPaths,
            hlsSessions:mediaControl.hlsSessions,diagnostics:mediaControl.diagnostics,
            paths:mediaControl.paths||[]
          }
        })).catch(()=>json(res,503,{ok:false,code:'engine_state_unavailable'}));
      return true;
    }
    // Protected VOD: every byte request is authenticated with operator Basic,
    // and media originates from an entitlement-checked authoritative catalog.
    if(vodBroker){
      if(req.method==='GET'&&path==='/operator/api/vod'){
        json(res,200,vodBroker.list());return true;
      }
      const vodMatch=path.match(/^\/operator\/api\/vod\/([a-f0-9]{48})$/);
      if(['GET','HEAD'].includes(req.method)&&vodMatch){
        void vodBroker.play(req,res,vodMatch[1]);return true;
      }
      if(req.method==='POST'&&path==='/operator/api/vod'){
        if(req.headers['x-blofy-operator-action']!=='vod-create'){
          json(res,403,{ok:false,code:'operator_action_header_required'});return true;
        }
        void readAdminJson(req).then(body=>vodBroker.create(body))
          .then(({status,body})=>json(res,status,body))
          .catch(e=>json(res,503,{ok:false,code:'vod_action_failed'}));
        return true;
      }
    }
    // Sanitized two-reader proof, with one gate shared by manual checks and
    // the optional one-shot boot probe; never allow broad subscriber cutover.
    if(req.method==='GET'&&path==='/operator/api/shared-live/status'){
      json(res,200,sharedReadiness?sharedReadiness.snapshot():{
        ok:true,state:'not_configured',customerTrafficChanged:false,last:null
      });return true;
    }
    if(req.method==='POST'&&path==='/operator/api/shared-live/probe'){
      if(req.headers['x-blofy-operator-action']!=='shared-live-probe'){
        json(res,403,{ok:false,code:'operator_action_header_required'});return true;
      }
      if(!sharedReadiness){
        json(res,503,{ok:false,code:'pilot_not_configured'});return true;
      }
      void readAdminJson(req)
        .then(body=>sharedReadiness.manual(body))
        .then(({status,body})=>json(res,status,body))
        .catch(e=>json(res,[400,413,415].includes(e?.status)?e.status:503,
          {ok:false,code:[400,413,415].includes(e?.status)?
            e.message:'pilot_validation_unavailable'}));
      return true;
    }
    // Live video and HLS segments remain behind the SAME operator Basic auth
    // as the page. There are no public media URLs and no customer cutover.
    if(liveSupervisor){
      if(req.method==='GET'&&path==='/operator/api/live'){
        json(res,200,liveSupervisor.list());return true;
      }
      const media=path.match(/^\/operator\/api\/live\/(live-[a-f0-9]{12})\/([a-zA-Z0-9_.-]+)$/);
      if(req.method==='GET'&&media){
        void liveSupervisor.proxyHls(req,res,media[1],media[2]);
        return true;
      }
      const management=path.match(/^\/operator\/api\/live\/(live-[a-f0-9]{12})\/(stop|probe)$/);
      if(req.method==='POST'&&(path==='/operator/api/live/start'||management)){
        const command=path==='/operator/api/live/start'?'start':management[2];
        if(req.headers['x-blofy-operator-action']!=='live-'+command){
          json(res,403,{ok:false,code:'operator_action_header_required'});return true;
        }
        void readAdminJson(req).then(body=>{
          if(command==='start')return liveSupervisor.start(body);
          return command==='stop'?liveSupervisor.stop(management[1]):
            liveSupervisor.probe(management[1]);
        }).then(({status,body})=>json(res,status,body))
          .catch(e=>json(res,[400,413,415].includes(e?.status)?e.status:503,{
            ok:false,code:[400,413,415].includes(e?.status)?e.message:'restream_action_failed'
          }));
        return true;
      }
    }
    const readable={
      '/operator/api/overview':()=>portal.overview(),
      // Operator Basic auth enforced above; portal Bearer key never returned
      // to the client. No player source details or credentials are serialized.
      '/operator/api/source-capacity':()=>portal.sourceCapacity(),
      '/operator/api/sources':()=>portal.sources(),
      '/operator/api/accounts':()=>portal.accounts({offset:uri.searchParams.get('offset')||0}),
      '/operator/api/codes':()=>portal.codes({offset:uri.searchParams.get('offset')||0}),
      '/operator/api/distributors':()=>portal.distributorAdmins(),
      '/operator/api/sales-summary':()=>portal.salesSummary(),
      '/operator/api/media-failures':()=>portal.mediaFailures({
        sourceId:uri.searchParams.get('sourceId')||''
      }),
      '/operator/api/media-failure-items':()=>portal.mediaFailureItems({
        sourceId:uri.searchParams.get('sourceId')||''
      }),
      '/operator/api/episodes':()=>portal.episodes({
        sourceId:uri.searchParams.get('sourceId'),
        seriesId:uri.searchParams.get('seriesId')
      }),
      '/operator/api/ops/schedule':()=>portal.opsScheduleStatus({sourceId:uri.searchParams.get('sourceId')||''}),
      '/operator/api/ops/snapshots':()=>portal.opsSnapshots({sourceId:uri.searchParams.get('sourceId')||''}),
      '/operator/api/ops/source-stats':()=>portal.opsSourceStats({sourceId:uri.searchParams.get('sourceId')||''}),
      '/operator/api/library-ai/status':()=>portal.libraryAIStatus(),
      '/operator/api/library-ai/publish-status':()=>portal.libraryAIPublishStatus({sourceId:uri.searchParams.get('sourceId')||''}),
      '/operator/api/library-ai/scan-progress':()=>portal.libraryAIScanProgress({sourceId:uri.searchParams.get('sourceId')||'',type:uri.searchParams.get('type')||''}),
      '/operator/api/library-review':()=>portal.libraryReview({
        sourceId:uri.searchParams.get('sourceId')||'',type:uri.searchParams.get('type')||''
      }),
      '/operator/api/catalog':()=>portal.catalog({
        type:uri.searchParams.get('type'),serverId:uri.searchParams.get('serverId')||'',
        q:uri.searchParams.get('q')||'',offset:uri.searchParams.get('offset')||0
      })
    };
    const codeReveal=path.match(/^\/operator\/api\/code\/([0-9a-f-]{36})\/reveal$/i);
    if(req.method==='GET'&&codeReveal){
      void portal.codeReveal(codeReveal[1]).then(({status,body})=>json(res,status,body))
        .catch(()=>json(res,503,{ok:false,code:'control_bridge_unavailable'}));
      return true;
    }
    const detail=path.match(/^\/operator\/api\/account\/([0-9a-f-]{36})\/credentials$/i);
    if(req.method==='GET'&&detail){
      void portal.accountCredentials(detail[1]).then(({status,body})=>json(res,status,body))
        .catch(()=>json(res,503,{ok:false,code:'control_bridge_unavailable'}));
      return true;
    }
    const compatibility=path.match(/^\/operator\/api\/account\/([0-9a-f-]{36})\/compatibility$/i);
    if(req.method==='GET'&&compatibility){
      void portal.accountCompatibility(compatibility[1]).then(({status,body})=>json(res,status,body))
        .catch(()=>json(res,503,{ok:false,code:'control_bridge_unavailable'}));
      return true;
    }
    if(req.method==='GET'&&readable[path]){
      void readable[path]().then(({status,body})=>json(res,status,body))
        .catch(()=>json(res,503,{ok:false,code:'control_bridge_unavailable'}));
      return true;
    }
    if(req.method==='POST'&&path.startsWith('/operator/api/')){
      const src=path.match(/^\/operator\/api\/source\/([0-9a-f-]{36})\/(test|sync|probe|pause|resume|publish|unpublish|cancel-sync)$/i);
      const acc=path.match(/^\/operator\/api\/account\/([0-9a-f-]{36})\/(enable|disable|reset)$/i);
      const code=path.match(/^\/operator\/api\/code\/([0-9a-f-]{36})\/(revoke|sell|extend|transfer|relogin)$/i);
      const distributor=path.match(/^\/operator\/api\/distributors\/([0-9a-f-]{36})\/(credits|status|reset|limits)$/i);
      const action=path==='/operator/api/ops/schedule'?'ops-schedule':
        path==='/operator/api/ops/snapshot'?'ops-snapshot':
        path==='/operator/api/library-ai/rollback'?'library-ai-rollback':
        path==='/operator/api/library-ai/chat'?'library-ai-chat':
        path==='/operator/api/library-ai/apply'?'library-ai-apply':
        path==='/operator/api/library-ai/test'?'library-ai-test':
        path==='/operator/api/library-ai'?'library-ai':
        path==='/operator/api/library-title'?'library-title':
        path==='/operator/api/sources'?'source-add':
        path==='/operator/api/accounts'?'account-add':
        path==='/operator/api/codes'?'code-issue':
        path==='/operator/api/distributors'?'distributor-create':
        distributor?'distributor-'+distributor[2]:
        src?'source-'+src[2]:acc?'account-'+acc[2]:code?'code-'+code[2]:null;
      if(!action)return json(res,404,{ok:false,code:'route_not_found'}),true;
      if(req.headers['x-blofy-operator-action']!==action)
        return json(res,403,{ok:false,code:'operator_action_header_required'}),true;
      void readAdminJson(req).then(data=>{
        if(action==='ops-schedule')return portal.opsSchedule(data);
        if(action==='ops-snapshot')return portal.opsSnapshot(data);
        if(action==='library-ai-rollback')return portal.libraryAIRollback(data);
        if(action==='library-ai-chat')return portal.libraryAIChat(data);
        if(action==='library-ai-apply')return portal.libraryAIApply(data);
        if(action==='library-ai-test')return portal.libraryAIConnectionTest();
        if(action==='library-ai')return portal.libraryAISuggest(data);
        if(action==='library-title')return portal.libraryTitle(data);
        if(action==='source-add')return portal.addSource(data);
        if(action==='account-add')return portal.addAccount(data);
        if(action==='code-issue')return portal.issueCodes(data);
        if(action==='distributor-create')return portal.createDistributor(data);
        if(distributor)return portal.distributorAdminAction(distributor[1],distributor[2],data);
        if(code)return code[2]==='revoke'?portal.revokeCode(code[1]):
          portal.codeAction(code[1],code[2],data);
        if(src)return portal.sourceAction(src[1],src[2],data);
        if(acc&&acc[2]==='reset')return portal.resetAccount(acc[1]);
        return portal.accountAction(acc[1],acc[2]);
      }).then(({status,body})=>json(res,status,body))
        .catch(error=>json(res,[400,413,415].includes(error?.status)?error.status:503,{
          ok:false,code:[400,413,415].includes(error?.status)?error.message:'operator_action_failed'
        }));
      return true;
    }
    json(res,404,{ok:false,code:'route_not_found'});return true;
  };
  return {enabled,handle,smartPlayback,
    start:()=>smartPlayback.start(),stop:()=>smartPlayback.stop()};
}
