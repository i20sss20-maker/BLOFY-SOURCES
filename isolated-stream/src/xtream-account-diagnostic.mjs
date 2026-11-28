// Only the original BLOFY PLAYER control-plane may run this account-only
// diagnostic. The request is not a player endpoint: it is service-to-service
// HTTPS, bearer authenticated, opt-in and never logs/saves provider secrets.
// This request never loads categories, streams or media. No source failover.
import http from 'node:http';
import https from 'node:https';
import {timingSafeEqual} from 'node:crypto';
import {assertPublicMediaUrl} from './relay-guard.mjs';

const MAX_PAYLOAD=4096,MAX_REPLY=131072,MAX_ACCOUNT_BODY=131072;
function equals(a,b){
 const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));
 return x.length===y.length&&timingSafeEqual(x,y);
}
function output(res,status,body){
 const data=Buffer.from(JSON.stringify(body));
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':data.length,
 'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'});
 res.end(data);
}
function classify(e){
 const code=String(e?.code||'');
 if(code==='ECONNRESET'||code==='EPIPE'||code==='UND_ERR_SOCKET')return 'connection_reset';
 if(code==='ETIMEDOUT'||code==='ESOCKETTIMEDOUT'||code==='UND_ERR_CONNECT_TIMEOUT')
   return 'timeout';
 if(code==='ECONNREFUSED')return 'connection_refused';
 if(code==='ENOTFOUND'||code==='EAI_AGAIN')return 'dns_failed';
 if(code==='xtream_reply_too_large')return 'reply_too_large';
 return 'network_error';
}
export async function probeXtreamAccountOnce(url,{
 httpRequest=http.request,httpsRequest=https.request,validateUrl=assertPublicMediaUrl,
 timeoutMs=8500}={}){
 let parsed;
 try{
  parsed=await validateUrl(url);
  if(!parsed.pathname.endsWith('/player_api.php')||!parsed.searchParams.has('username')||
    !parsed.searchParams.has('password')||!parsed.searchParams.get('username')||
    !parsed.searchParams.get('password'))
    return {ok:false,code:'invalid_account_url',stage:'validation'};
 }catch{return {ok:false,code:'invalid_source_host',stage:'validation'};}
 return new Promise(resolve=>{
  let done=false;
  const start=Date.now();
  let req,bytes=0,parts=[],httpStatus=null;
  const finish=(r)=>{
   if(done)return;done=true;req?.destroy();
   resolve({...r,elapsedMs:Date.now()-start,mediaVerified:false});
  };
  try{
   const fn=parsed.protocol==='https:'?httpsRequest:httpRequest;
   req=fn(parsed,{method:'GET',agent:false,timeout:timeoutMs,
    headers:{'connection':'close','accept':'application/json,text/plain;q=0.8,*/*;q=0.1',
      'user-agent':'BLOFY-Xtream/1.0'}},response=>{
     httpStatus=Number(response.statusCode)||null;
     // Redirects not followed: no credentials forwarded to another host.
     if(httpStatus!==200){
       response.resume();return finish({ok:false,code:'upstream_http_status',httpStatus,stage:'http'});
     }
     response.on('data',chunk=>{
       bytes+=chunk.length;
       if(bytes>MAX_ACCOUNT_BODY){
         return finish({ok:false,code:'reply_too_large',httpStatus,stage:'http'});
       }
       parts.push(Buffer.from(chunk));
     });
     response.once('end',()=>{
       try{
         const json=JSON.parse(Buffer.concat(parts).toString('utf8'));
         const auth=json?.user_info?.auth===1||json?.user_info?.auth==='1';
         const status=String(json?.user_info?.status||'').slice(0,20);
         finish({ok:auth,code:auth?'account_verified':'account_rejected',
           accountStatus:['Active','active','Disabled','disabled','Expired','expired','Banned','banned'].includes(status)?status.toLowerCase():'other',
           httpStatus,stage:'http'});
       }catch{finish({ok:false,code:'invalid_json',httpStatus,stage:'http'});}
     });
     response.once('error',err=>finish({ok:false,code:classify(err),httpStatus,stage:'body'}));
   });
   req.once('timeout',()=>{req.destroy(Object.assign(new Error('request_timed_out'),{code:'ETIMEDOUT'}));});
   req.once('error',err=>finish({ok:false,code:classify(err),httpStatus,stage:'connect'}));
   req.end();
  }catch(e){finish({ok:false,code:classify(e),httpStatus,stage:'connect'});}
 });
}
async function jsonSmall(req){
 let bytes=0,chunks=[];
 for await (const chunk of req){
  bytes+=chunk.length;
  if(bytes>MAX_PAYLOAD)throw new Error('too_large');
  chunks.push(chunk);
 }
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createCrossProjectSourceDiagnostic({
 sharedToken='',allowedOrigin='',httpRequest=http.request,httpsRequest=https.request,
 validateUrl=assertPublicMediaUrl
}={}){
 const enabled=sharedToken.length>=32&&/^https?:\/\/[a-z0-9.-]+(?::\d{2,5})?$/i.test(allowedOrigin);
 let lastCall=0,inFlight=false;
 return {
  enabled,
  async handle(req,res){
   if(!enabled||!equals(req.headers.authorization,'Bearer '+sharedToken))
     return output(res,401,{ok:false,code:'not_authorized'});
   if(req.method!=='POST')return output(res,405,{ok:false,code:'method_not_allowed'});
   if(inFlight||Date.now()-lastCall<25000)
     return output(res,429,{ok:false,code:'diagnostic_cooldown'});
   inFlight=true;lastCall=Date.now();
   try{
    if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))
      return output(res,415,{ok:false,code:'json_required'});
    const body=await jsonSmall(req);
    if(typeof body?.accountUrl!=='string'||body.accountUrl.length>2500)
      return output(res,400,{ok:false,code:'account_url_invalid'});
    const url=await validateUrl(body.accountUrl);
    if(url.origin.toLowerCase()!==allowedOrigin.toLowerCase())
      return output(res,400,{ok:false,code:'origin_not_allowlisted'});
    const result=await probeXtreamAccountOnce(body.accountUrl,
      {httpRequest,httpsRequest,validateUrl});
    return output(res,200,{...result,environment:'independent_stream_railway',
      sourceCredentialsStored:false,customerTrafficChanged:false});
   }catch{
    return output(res,400,{ok:false,code:'diagnostic_request_invalid'});
   }finally{inFlight=false;}
  }
 };
}
