// Operator-triggered, boot-once egress probe. Uses no provider credentials
// and never sends source responses to browser clients. A 401/403 from an
// intentionally invalid Xtream login still confirms HTTP reachability.
import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import {assertPublicMediaUrl} from './relay-guard.mjs';

function limit(raw){
  const s=String(raw||'').trim();
  if(!/^[a-z0-9.-]{4,253}$/i.test(s)||s.includes('..')||s==='localhost')
    throw new Error('invalid_hostname');
  return s.toLowerCase();
}
export function connectTcp(host,port=80,{timeout=5500,socketConnect=net.connect}={}){
  return new Promise(resolve=>{
    const socket=socketConnect({host,port,family:4});
    let settled=false;
    const start=Date.now();
    const done=(state)=>{
      if(settled)return;settled=true;socket.destroy();
      resolve({state,elapsedMs:Date.now()-start});
    };
    socket.once('connect',()=>done('connected'));
    socket.once('timeout',()=>done('timeout'));
    socket.once('error',e=>done(e?.code==='ECONNRESET'?'reset':e?.code==='ECONNREFUSED'?'refused':'network_error'));
    socket.setTimeout(timeout);
  });
}
export function checkHttp(host,port=80,{timeout=6500,request=http.request}={}){
  return new Promise(resolve=>{
    const started=Date.now();
    let ended=false;
    let req;
    const finish=report=>{
      if(ended)return;ended=true;
      resolve({...report,elapsedMs:Date.now()-started});
      req?.destroy();
    };
    req=request({
      hostname:host,port,method:'GET',path:'/player_api.php?username=blofy_diag_invalid&password=blofy_diag_invalid',
      agent:false,family:4,headers:{'user-agent':'BLOFY-Xtream/1.0',
        'accept':'application/json,text/plain;q=0.8,*/*;q=0.1','connection':'close'}
    },res=>{
      const status=Number(res.statusCode)||null;
      // Do not parse, retain or log the origin's response body.
      res.once('data',()=>finish({result:'http_response',httpStatus:status}));
      res.once('end',()=>finish({result:'http_response',httpStatus:status}));
      res.once('error',()=>finish({result:'response_error',httpStatus:status}));
      res.resume();
    });
    req.setTimeout(timeout,()=>finish({result:'timeout'}));
    req.once('error',e=>{
      finish({result:e?.code==='ECONNRESET'?'connection_reset':
        e?.code==='ECONNREFUSED'?'connection_refused':'transport_error'});
    });
    req.end();
  });
}
export async function runOperatorEgressProbe(input,{
  validate=assertPublicMediaUrl,lookup=dns.lookup,doTcp=connectTcp,doHttp=checkHttp
}={}){
  let host;
  try{
    host=limit(input);
    const u=await validate('http://'+host+':80/player_api.php');
    if(u.port&&u.port!=='80')throw new Error('bad_port');
  }catch{return {ok:false,stage:'validation',code:'bad_source_host'};}
  const dnsResult=await lookup(host,{all:true,verbatim:true})
    .then(rows=>({resolved:rows.length>0,ipv4:rows.some(x=>x.family===4)}))
    .catch(()=>({resolved:false,ipv4:false}));
  if(!dnsResult.resolved)return {ok:false,stage:'dns',code:'no_dns_records'};
  const tcp=await doTcp(host);
  const http=await doHttp(host);
  return {ok:tcp.state==='connected'&&http.result==='http_response',
    stage:'network',environment:'isolated_railway_project',
    hasCredentials:false,realPlaybackVerified:false,
    dns:dnsResult,tcp,http};
}
