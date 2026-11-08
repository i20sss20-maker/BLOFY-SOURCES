// Isolated operator console. It cannot alter subscriber routes, Xtream
// credentials, source catalogs or production services. No API tokens in HTML.
import {timingSafeEqual,randomBytes} from 'node:crypto';
import {renderOperatorDashboard} from './operator-unified-view.mjs';
import {createMediaControlClient} from './mediamtx-private-control.mjs';
import {createUnifiedPortalClient} from './unified-portal-client.mjs';

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
  controlUsername='',controlPassword='',unifiedSecret='',liveSupervisor=null,vodBroker=null}={}){
  const control=createMediaControlClient({fetchImpl,username:controlUsername,password:controlPassword});
  const portal=createUnifiedPortalClient({fetchImpl,secret:unifiedSecret});
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
  const enabled=typeof adminToken==='string'&&adminToken.length>=32;
  const handle=(req,res)=>{
    const uri=new URL(req.url||'/', 'http://localhost');
    const path=uri.pathname;
    if(!(path==='/operator'||path==='/operator/'||path.startsWith('/operator/api/')))return false;
    if(!enabled){json(res,404,{ok:false,code:'operator_console_not_configured'});return true;}
    if(!authorized(req,adminToken)){
      res.writeHead(401,{'www-authenticate':'Basic realm="BLOFY STREAM Operator", charset="UTF-8"',
        'cache-control':'no-store','x-frame-options':'DENY'});
      res.end('Authorization required');return true;
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
    if(req.method==='GET'&&path==='/operator/api/state'){
      void Promise.all([engineStatus(),control.overview()])
        .then(([engine,mediaControl])=>json(res,200,{
          ok:true,service:'BLOFY-STREAM',role:'independent-control',
          customerTrafficEnabled:false,realSourceMediaVerified:false,
          engine,mediaControl:{
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
      '/operator/api/sources':()=>portal.sources(),
      '/operator/api/accounts':()=>portal.accounts(),
      '/operator/api/episodes':()=>portal.episodes({
        sourceId:uri.searchParams.get('sourceId'),
        seriesId:uri.searchParams.get('seriesId')
      }),
      '/operator/api/catalog':()=>portal.catalog({
        type:uri.searchParams.get('type'),serverId:uri.searchParams.get('serverId')||'',
        q:uri.searchParams.get('q')||'',offset:uri.searchParams.get('offset')||0
      })
    };
    if(req.method==='GET'&&readable[path]){
      void readable[path]().then(({status,body})=>json(res,status,body))
        .catch(()=>json(res,503,{ok:false,code:'control_bridge_unavailable'}));
      return true;
    }
    if(req.method==='POST'&&path.startsWith('/operator/api/')){
      const src=path.match(/^\/operator\/api\/source\/([0-9a-f-]{36})\/(test|sync|probe|pause|resume|publish|unpublish|cancel-sync)$/i);
      const acc=path.match(/^\/operator\/api\/account\/([0-9a-f-]{36})\/(enable|disable)$/i);
      const action=path==='/operator/api/sources'?'source-add':
        path==='/operator/api/accounts'?'account-add':
        src?'source-'+src[2]:acc?'account-'+acc[2]:null;
      if(!action)return json(res,404,{ok:false,code:'route_not_found'}),true;
      if(req.headers['x-blofy-operator-action']!==action)
        return json(res,403,{ok:false,code:'operator_action_header_required'}),true;
      void readAdminJson(req).then(data=>{
        if(action==='source-add')return portal.addSource(data);
        if(action==='account-add')return portal.addAccount(data);
        if(src)return portal.sourceAction(src[1],src[2],data);
        return portal.accountAction(acc[1],acc[2]);
      }).then(({status,body})=>json(res,status,body))
        .catch(error=>json(res,[400,413,415].includes(error?.status)?error.status:503,{
          ok:false,code:[400,413,415].includes(error?.status)?error.message:'operator_action_failed'
        }));
      return true;
    }
    json(res,404,{ok:false,code:'route_not_found'});return true;
  };
  return {enabled,handle};
}
