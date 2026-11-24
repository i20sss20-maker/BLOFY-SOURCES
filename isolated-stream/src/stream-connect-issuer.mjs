// Browser pairing endpoint. No raw provider fetch, no query credentials,
// no logs, no redirects. Off until a compatible app release is available.
const ORIGINS=new Set(['https://blofy-stream-api-production.up.railway.app','https://connect.blofyplayer.com']);
const ERRORS=new Set(['connect_host_invalid','connect_input_invalid','connect_capacity','connect_rate_limited','connect_disabled']);
function json(res,status,data){
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(JSON.stringify(data));
}
export function createConnectIssuer({bridge,enabled=false,clock=Date.now}={}){
 let global={until:0,count:0};const clients=new Map();
 function permit(req){
  const now=clock(),key=String(req.socket?.remoteAddress||'unknown').slice(0,128)+'|'+String(req.headers?.['x-forwarded-for']||'').split(',')[0].trim().slice(0,128);
  if(global.until<=now)global={until:now+60000,count:0};
  if(++global.count>40)return false;
  for(const [id,v] of clients)if(v.until<=now)clients.delete(id);
  if(!clients.has(key)&&clients.size>=500)return false;
  if(!clients.has(key))clients.set(key,{until:now+60000,count:0});
  return ++clients.get(key).count<=5;
 }
 async function issue(req,res){
  if(req.method!=='POST'||req.url!=='/connect/api/issue'){json(res,405,{ok:false,code:'connect_method_denied'});return}
  if(enabled!==true||!bridge?.configured){json(res,503,{ok:false,code:'connect_disabled'});return}
  const origin=String(req.headers?.origin||'');
  if(!ORIGINS.has(origin)||origin!=='https://'+String(req.headers?.host||'')||
     req.headers?.['x-blofy-connect-action']!=='issue'||
     (req.headers?.['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')){
   json(res,403,{ok:false,code:'connect_origin_denied'});return
  }
  if(!permit(req)){json(res,429,{ok:false,code:'connect_rate_limited'});return}
  if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers?.['content-type']||''))){json(res,415,{ok:false,code:'connect_json_required'});return}
  try{
   const chunks=[];let size=0;
   for await(const raw of req){const buf=Buffer.from(raw);size+=buf.length;if(size>4096){json(res,413,{ok:false,code:'connect_payload_too_large'});return}chunks.push(buf)}
   let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{json(res,400,{ok:false,code:'connect_input_invalid'});return}
   if(!data||typeof data.host!=='string'||data.host.length>512||typeof data.username!=='string'||data.username.length<1||data.username.length>256||
      typeof data.password!=='string'||data.password.length<1||data.password.length>256||data.authorized!==true){json(res,400,{ok:false,code:'connect_input_invalid'});return}
   const result=await bridge.connectIssue({host:data.host,username:data.username,password:data.password}),body=result.body||{};
   if(result.status!==201||body.ok!==true){
    const code=ERRORS.has(body.code)?body.code:'connect_pairing_unavailable';
    json(res,[400,429,503].includes(result.status)?result.status:503,{ok:false,code});return
   }
   const remaining=Number(body.expiresAt)-clock();
   if(!/^BC-[A-Za-z0-9_-]{24}$/.test(String(body.code||''))||body.oneTime!==true||body.providerVerified!==false||!Number.isFinite(remaining)||remaining<=0||remaining>16*60000){
    json(res,503,{ok:false,code:'connect_pairing_unavailable'});return
   }
   json(res,201,{ok:true,code:body.code,expiresAt:body.expiresAt,oneTime:true,providerVerified:false});
  }catch{json(res,503,{ok:false,code:'connect_pairing_unavailable'})}
 }
 return {handle(req,res){if((req.url||'').split('?')[0]!=='/connect/api/issue')return false;void issue(req,res);return true;}};
}
