// BLOFY STREAM dedicated control-plane bootstrap. This service has NO
// subscriber database, Xtream source secrets or production media paths.
// Do not move customer traffic until an authenticated bridge and canary exist.
import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {verifyRestreamSmoke} from './restream-smoke.mjs';
import {createOperatorDashboard} from './operator-dashboard.mjs';
import {createMediaControlClient} from './mediamtx-private-control.mjs';
import {normalizePrivateRestreamOrigin} from './restream-engine-core.mjs';
import {createRelayBroker} from './relay-broker.mjs';
import {runOperatorEgressProbe} from './operator-egress-probe.mjs';
import {probeOutboundIpv4} from './outbound-ip-proof.mjs';
import {createCrossProjectSourceDiagnostic} from './xtream-account-diagnostic.mjs';
import {createXtreamCatalogRelay,createXtreamManifestRelay} from './xtream-catalog-relay.mjs';
import {createOfficialM3uDiagnostic} from './xtream-playlist-route-diagnostic.mjs';
import {createXtreamMediaClientProfileDiagnostic} from './xtream-media-client-profile-diagnostic.mjs';

const DEFAULT_ENGINE='http://blofy-stream-media.railway.internal:8888';
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
  relaySharedToken='',
  relayFetchImpl=fetch,
  relayLookup=undefined,
  relayRedirectSourceOrigin='',
  relayFirstByteTimeoutMs=12000,
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
    firstByteTimeoutMs:relayFirstByteTimeoutMs});
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
  const operatorDashboard=createOperatorDashboard({
    adminToken,engineOrigin:cfg.origin,fetchImpl,
    controlUsername:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_USER||'',
    controlPassword:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD||'',
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
  const app=http.createServer((req,res)=>{
    if(operatorDashboard.handle(req,res))return;
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
    if(url.pathname==='/internal/relay-health'&&req.method==='GET'){
      if(!relayBroker.enabled||!authorized(req.headers.authorization,relaySharedToken))
        return safeResponse(res,401,{ok:false,code:'relay_not_authorized'});
      return safeResponse(res,200,{ok:true,service:'BLOFY-STREAM',
        role:'media_plane',relayReady:true,customerTrafficEnabled:false});
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
  return {app,config:cfg,startBootCanary,canary};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const service=createStreamServer({
    engineUrl:process.env.BLOFY_RESTREAM_ENGINE_URL||DEFAULT_ENGINE,
    adminToken:process.env.BLOFY_STREAM_ADMIN_TOKEN||'',
    relaySharedToken:process.env.BLOFY_STREAM_RELAY_SHARED_TOKEN||'',
    relayRedirectSourceOrigin:process.env.BLOFY_STREAM_MEDIA_REDIRECT_SOURCE_ORIGIN||'',
    diagnosticAllowedOrigin:process.env.BLOFY_STREAM_DIAGNOSTIC_ALLOW_ORIGIN||'',
    port:process.env.PORT||3000,
    runBootCanary:process.env.BLOFY_STREAM_CANARY_ON_BOOT==='1'
  });
  service.app.listen(service.config.port,'0.0.0.0',()=>{
    console.info('BLOFY STREAM isolated control API ready on :'+service.config.port);
    service.startBootCanary();
    // Operator-approved isolated demo start and proof; safe for the dedicated
    // FFmpeg synthetic channel only. Never changes BLOFY PLAYER sources.
    if(process.env.BLOFY_STREAM_DEMO_BOOT_VERIFY==='1'){
      const timer=setTimeout(()=>{
        const control=createMediaControlClient({
          username:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_USER||'',
          password:process.env.BLOFY_STREAM_MEDIAMTX_CONTROL_PASSWORD||''
        });
        void control.demoAction('start').then(async result=>{
          console.info('BLOFY_STREAM_DEMO_LIFECYCLE',JSON.stringify({
            ok:result.body.ok,code:result.body.code,
            customerTrafficChanged:false
          }));
          if(!result.body.ok)return;
          const probe=await verifyRestreamSmoke(DEFAULT_ENGINE,{pathName:'blofy-demo'});
          console.info('BLOFY_STREAM_DEMO_TRANSPORT',JSON.stringify({
            ok:probe.ok,code:probe.code,elapsedMs:probe.elapsedMs??null,
            audioVideoDecoded:false,realProviderVerified:false,
            customerTrafficChanged:false
          }));
        }).catch(()=>console.info('BLOFY_STREAM_DEMO_LIFECYCLE',
          JSON.stringify({ok:false,code:'demo_boot_probe_unavailable'})));
      },17500);
      timer.unref?.();
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
  process.on('SIGTERM',()=>service.app.close(()=>process.exit(0)));
}
