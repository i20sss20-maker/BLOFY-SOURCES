// Media data plane only. BLOFY PLAYER issues an operator-authenticated, short-
// lived OPAQUE relay capability after checking a real subscriber and catalog.
// The provider URL is sent server-to-server through HTTPS, never into a browser.
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {assertPublicMediaUrl} from './relay-guard.mjs';

const TTL=45_000,MAX_TICKETS=1024,MAX_ISSUE_BYTES=4096;
const TICKET_PATH=/^\/relay\/([0-9a-f]{48})$/;
const mediaTypes=new Set(['live','movie','series']);
function sameBearer(header,secret){
  if(typeof secret!=='string'||secret.length<32||
      typeof header!=='string'||!header.startsWith('Bearer '))return false;
  const input=Buffer.from(header.slice(7));
  const target=Buffer.from(secret);
  return input.length===target.length&&timingSafeEqual(input,target);
}
function respond(res,status,payload){
  const bytes=Buffer.from(JSON.stringify(payload));
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer','content-length':bytes.length});
  res.end(bytes);
}
async function readSmallJson(req){
  const chunks=[];let size=0;
  for await (const part of req){
    size+=part.length;
    if(size>MAX_ISSUE_BYTES)throw new Error('relay_issue_too_large');
    chunks.push(part);
  }
  let value;
  try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'))}
  catch{throw new Error('relay_issue_invalid_json')}
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new Error('relay_issue_invalid_json');
  return value;
}
function inspect(bytes,mime,kind){
  const b=Buffer.from(bytes||[]);
  if(!b.length)return false;
  const prefix=b.subarray(0,256).toString('utf8').trimStart().toLowerCase();
  if(prefix.startsWith('#extm3u'))return false; // HLS segment URI rewriting not ready
  if(/^(text\/|application\/(?:json|xml|xhtml\+xml))/.test(String(mime||'').toLowerCase()))
    return false;
  if(/^<(!doctype|html)|^\{\s*"(error|message|status|code)"|^(not found|unauthorized|access denied)/i.test(prefix))
    return false;
  return true;
}
function permittedReturnHeaders(response){
  const headers={'cache-control':'no-store','x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer','access-control-allow-origin':'none'};
  for(const name of ['content-type','content-length','content-range','accept-ranges',
    'etag','last-modified']){
    const v=response.headers.get(name);
    if(v)headers[name]=v;
  }
  return headers;
}
export function createRelayBroker({
  sharedToken='',fetchImpl=fetch,lookup,clock=Date.now,issueToken=()=>randomBytes(24).toString('hex'),
  maxTickets=MAX_TICKETS
}={}){
  const tickets=new Map();
  const enabled=typeof sharedToken==='string'&&sharedToken.length>=32;
  function prune(){
    for(const [id,row] of tickets){
      if(row.expiresAt<=clock()||row.uses>=5)tickets.delete(id);
    }
    while(tickets.size>=maxTickets)tickets.delete(tickets.keys().next().value);
  }
  async function issue(req,res){
    if(!enabled)return respond(res,503,{ok:false,code:'relay_disabled'});
    if(!sameBearer(req.headers.authorization,sharedToken))
      return respond(res,401,{ok:false,code:'relay_issuer_unauthorized'});
    if(req.method!=='POST')return respond(res,405,{ok:false,code:'relay_bad_method'});
    let input,url;
    try{
      if(!String(req.headers['content-type']||'').includes('application/json'))
        throw new Error('relay_bad_content_type');
      input=await readSmallJson(req);
      if(!mediaTypes.has(input.kind)||typeof input.sourceUrl!=='string')
        throw new Error('relay_bad_origin');
      url=await assertPublicMediaUrl(input.sourceUrl,{lookup});
      if(!url.pathname||url.pathname==='/')throw new Error('relay_bad_origin');
    }catch(error){
      const code=['relay_issue_too_large','relay_issue_invalid_json','relay_bad_content_type',
        'relay_bad_origin','relay_private_origin','relay_origin_unresolved'].includes(error.message)
        ?error.message:'relay_issue_invalid';
      return respond(res,400,{ok:false,code});
    }
    prune();
    const id=issueToken();
    if(!/^[0-9a-f]{48}$/.test(id)||tickets.has(id))
      return respond(res,503,{ok:false,code:'relay_issue_unavailable'});
    tickets.set(id,{sourceUrl:url.href,kind:input.kind,expiresAt:clock()+TTL,uses:0});
    return respond(res,201,{ok:true,path:'/relay/'+id,expiresInSeconds:45});
  }
  async function relay(req,res){
    if(!enabled)return respond(res,503,{ok:false,code:'relay_disabled'});
    if(!['GET','HEAD'].includes(req.method))
      return respond(res,405,{ok:false,code:'relay_bad_method'});
    const path=(req.url||'').split('?')[0];
    const match=TICKET_PATH.exec(path);
    if(!match)return respond(res,404,{ok:false,code:'relay_not_found'});
    const row=tickets.get(match[1]);
    if(!row||row.expiresAt<=clock()||row.uses>=5){
      tickets.delete(match[1]);
      return respond(res,410,{ok:false,code:'relay_ticket_expired'});
    }
    row.uses++;
    if(row.uses>=5)tickets.delete(match[1]);
    const controller=new AbortController();
    const onClose=()=>{if(!res.writableEnded)controller.abort()};
    const onAborted=()=>controller.abort();
    req.once('aborted',onAborted);
    res.once('close',onClose);
    let upstream;
    try{
      let target=await assertPublicMediaUrl(row.sourceUrl,{lookup});
      const headers={accept:'*/*','accept-encoding':'identity',
        'user-agent':'BLOFY-STREAM-Relay/1.0'};
      if(typeof req.headers.range==='string'&&/^bytes=\d*-\d*$/.test(req.headers.range))
        headers.range=req.headers.range;
      if(typeof req.headers['if-range']==='string'&&req.headers['if-range'].length<180)
        headers['if-range']=req.headers['if-range'];
      let ready=false;
      for(let i=0;i<4;i++){
        const timer=setTimeout(()=>controller.abort(),12000);
        try{
          upstream=await fetchImpl(target,{method:req.method,headers,redirect:'manual',
            signal:controller.signal});
        }finally{clearTimeout(timer)}
        if([301,302,303,307,308].includes(upstream.status)){
          const location=upstream.headers.get('location');
          await upstream.body?.cancel().catch(()=>{});
          if(!location||i===3)throw new Error('relay_redirect_denied');
          const next=await assertPublicMediaUrl(new URL(location,target).href,{lookup});
          if(next.origin!==target.origin)throw new Error('relay_redirect_denied');
          target=next;continue;
        }
        ready=true;break;
      }
      if(!ready||!(upstream.ok||upstream.status===206)){
        await upstream?.body?.cancel().catch(()=>{});
        const upstreamStatus=Number.isInteger(upstream?.status)?upstream.status:null;
        return respond(res,502,{ok:false,code:'relay_provider_unavailable',
          upstreamStatus:upstreamStatus>=100&&upstreamStatus<=599?upstreamStatus:null});
      }
      const mime=upstream.headers.get('content-type')||'';
      if(req.method==='HEAD'){
        res.writeHead(upstream.status,permittedReturnHeaders(upstream));
        await upstream.body?.cancel().catch(()=>{});
        return res.end();
      }
      if(!upstream.body)throw new Error('relay_upstream_empty');
      const reader=upstream.body.getReader();
      let first;
      try{first=await reader.read()}catch{throw new Error('relay_upstream_read_failed')}
      if(first.done||!inspect(first.value,mime,row.kind)){
        await reader.cancel().catch(()=>{});
        return respond(res,502,{ok:false,code:'relay_not_playable_media'});
      }
      res.writeHead(upstream.status,permittedReturnHeaders(upstream));
      const generator=Readable.from((async function*(){
        yield Buffer.from(first.value);
        while(true){
          const n=await reader.read();
          if(n.done)return;
          if(n.value?.byteLength)yield Buffer.from(n.value);
        }
      })());
      try{await pipeline(generator,res,{signal:controller.signal})}
      finally{try{await reader.cancel()}catch{}try{reader.releaseLock()}catch{}}
    }catch{
      if(!res.headersSent)return respond(res,502,{ok:false,code:'relay_provider_unavailable'});
      if(!res.destroyed)res.destroy();
    }finally{
      req.off('aborted',onAborted);res.off('close',onClose);
      controller.abort();
      if(upstream?.body&&!upstream.bodyUsed){try{await upstream.body.cancel()}catch{}}
    }
  }
  return {enabled,issue,relay,stats:()=>({enabled,activeTickets:tickets.size})};
}
