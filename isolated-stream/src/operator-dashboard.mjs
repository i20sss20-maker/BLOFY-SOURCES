// Isolated operator console. It cannot alter subscriber routes, Xtream
// credentials, source catalogs or production services. No API tokens in HTML.
import {timingSafeEqual,randomBytes} from 'node:crypto';
import {renderOperatorDashboard} from './operator-control-view.mjs';
import {createMediaControlClient} from './mediamtx-private-control.mjs';

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
export function createOperatorDashboard({adminToken='',engineOrigin,fetchImpl=fetch,
  getSmokeState=()=>({}),runSmoke=async()=>({status:503,body:{ok:false,code:'not_ready'}}),
  runDemoProbe=async()=>({status:503,body:{ok:false,code:'demo_not_ready'}}),
  controlUsername='',controlPassword=''}={}){
  const control=createMediaControlClient({fetchImpl,username:controlUsername,password:controlPassword});
  async function engineStatus(){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),1800);
    try{
      const response=await fetchImpl(engineOrigin+'/',{method:'GET',redirect:'manual',signal:controller.signal});
      try{await response.body?.cancel?.();}catch{}
      return {reachable:response.status>=200&&response.status<500,httpStatus:response.status};
    }catch{return {reachable:false,httpStatus:null};}
    finally{clearTimeout(timeout);}
  }
  const enabled=typeof adminToken==='string'&&adminToken.length>=32;
  const handle=(req,res)=>{
    const pathname=new URL(req.url||'/', 'http://localhost').pathname;
    if(!(pathname==='/operator'||pathname==='/operator/'||pathname.startsWith('/operator/api/')))return false;
    if(!enabled){json(res,404,{ok:false,code:'operator_console_not_configured'});return true;}
    if(!authorized(req,adminToken)){
      res.writeHead(401,{'www-authenticate':'Basic realm="BLOFY STREAM Operator", charset="UTF-8"',
        'cache-control':'no-store','x-frame-options':'DENY'});
      res.end('Authorization required');return true;
    }
    if(req.method==='GET'&&(pathname==='/operator'||pathname==='/operator/')){
      const nonce=randomBytes(16).toString('base64');
      const body=Buffer.from(renderOperatorDashboard(nonce));
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store',
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'x-frame-options':'DENY','x-content-type-options':'nosniff',
        'referrer-policy':'no-referrer','content-length':body.length});
      res.end(body);return true;
    }
    if(req.method==='GET'&&pathname==='/operator/api/state'){
      void Promise.all([
        engineStatus(),control.overview()
      ]).then(([engine,managed])=>json(res,200,{
        ok:true,service:'BLOFY-STREAM',role:'isolated-control',
        customerTrafficEnabled:false,realSourceVerified:false,
        engine,mediaControl:{
          controlAvailable:managed.online,activePaths:managed.readyPaths,
          hlsSessions:managed.hlsSessions,diagnostics:managed.diagnostics,
          demo:managed.demo,paths:managed.paths||[]
        },smoke:getSmokeState()
      })).catch(()=>json(res,503,{ok:false,code:'engine_status_unavailable'}));
      return true;
    }
    if(req.method==='POST'&&pathname==='/operator/api/smoke'){
      // A custom same-origin header prevents cross-site form POSTs with cached Basic credentials.
      if(req.headers['x-blofy-operator-action']!=='smoke')
        json(res,403,{ok:false,code:'operator_action_header_required'});
      else void runSmoke().then(({status,body})=>json(res,status,body))
        .catch(()=>json(res,503,{ok:false,code:'smoke_unavailable'}));
      return true;
    }
    const demoMatch=/^\/operator\/api\/(demo-start|demo-stop|demo-restart|demo-probe)$/.exec(pathname);
    if(req.method==='POST'&&demoMatch){
      if(req.headers['x-blofy-operator-action']!==demoMatch[1])
        return json(res,403,{ok:false,code:'operator_action_header_required'}),true;
      const action=demoMatch[1].slice(5);
      const task=action==='probe'?runDemoProbe():control.demoAction(action);
      void task.then(({status,body})=>json(res,status,body))
        .catch(()=>json(res,503,{ok:false,code:'demo_operation_failed'}));
      return true;
    }
    json(res,404,{ok:false,code:'route_not_found'});return true;
  };
  return {enabled,handle};
}
