// Media data plane only. BLOFY PLAYER issues an operator-authenticated, short-
// lived OPAQUE relay capability after checking a real subscriber and catalog.
// The provider URL is sent server-to-server through HTTPS, never into a browser.
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {assertPublicMediaUrl} from './relay-guard.mjs';
import {createLiveFanout} from './live-fanout.mjs';

const TTL=45_000,MAX_TICKETS=1024,MAX_ISSUE_BYTES=4096;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TICKET_PATH=/^\/relay\/([0-9a-f]{48})$/;
const mediaTypes=new Set(['live','movie','series']);
function sameBearer(header,secret){
  if(typeof secret!=='string'||secret.length<32||
      typeof header!=='string'||!header.startsWith('Bearer '))return false;
  const input=Buffer.from(header.slice(7));
  const target=Buffer.from(secret);
  return input.length===target.length&&timingSafeEqual(input,target);
}
function respond(res,status,payload,extraHeaders={}){
  const bytes=Buffer.from(JSON.stringify(payload));
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'referrer-policy':'no-referrer','x-frame-options':'DENY',
    'content-security-policy':"default-src 'none'",
    'content-length':bytes.length,...extraHeaders});
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
  maxTickets=MAX_TICKETS,redirectSourceOrigin='',firstByteTimeoutMs=12000,
  sharedLiveEnabled=false,maxIssuesPerSecond=256,maxIssuesPerMinute=2400,
  onSharedLiveEvent=()=>{}
}={}){
  if(!Number.isInteger(firstByteTimeoutMs)||firstByteTimeoutMs<10||firstByteTimeoutMs>12000)
    throw new Error('relay_first_byte_timeout_invalid');
  if(!Number.isInteger(maxTickets)||maxTickets<1||maxTickets>8192||
    !Number.isInteger(maxIssuesPerSecond)||maxIssuesPerSecond<1||maxIssuesPerSecond>2048||
    !Number.isInteger(maxIssuesPerMinute)||maxIssuesPerMinute<1||maxIssuesPerMinute>30000)
    throw new Error('relay_security_limits_invalid');
  const tickets=new Map();
  // Rate-limit only correctly authenticated bridge requests. Bad bearer
  // attempts cannot exhaust legitimate subscribers' issuance budget.
  const quota={secondStartedAt:clock(),minuteStartedAt:clock(),
    second:0,minute:0,grantsIssued:0,issuanceThrottled:0,
    capacityRejected:0,issuerAuthDenied:0};
  function issueAllowed(){
    const now=clock();
    if(now-quota.secondStartedAt>=1000){
      quota.secondStartedAt=now;quota.second=0;
    }
    if(now-quota.minuteStartedAt>=60000){
      quota.minuteStartedAt=now;quota.minute=0;
    }
    if(quota.second>=maxIssuesPerSecond||quota.minute>=maxIssuesPerMinute){
      quota.issuanceThrottled++;return false;
    }
    quota.second++;quota.minute++;return true;
  }
  // Aggregate sanitized failure reasons only: no ticket IDs, provider
  // hostnames, source credentials or customer IPs appear in the counters.
  const failureCounts=Object.create(null);
  const failRelay=(res,code,extra={})=>{
    failureCounts[code]=(failureCounts[code]||0)+1;
    return respond(res,502,{ok:false,code,...extra});
  };
  const fanout=createLiveFanout({fetchImpl,lookup,firstByteTimeoutMs,
    redirectSourceOrigin,reconnectOnUpstreamEnd:sharedLiveEnabled===true,
    initialTransientRetries:sharedLiveEnabled===true?1:0,
    onEvent:onSharedLiveEvent});
  const enabled=typeof sharedToken==='string'&&sharedToken.length>=32;
  // Cross-origin media hops are OFF unless explicitly allowed by operator for
  // one licensed source origin. The provider itself must issue the HTTP 302.
  let allowCrossOriginFrom='';
  try{
    const specified=new URL(String(redirectSourceOrigin||''));
    if(['http:','https:'].includes(specified.protocol)&&
       specified.href===specified.origin+'/'&&
       !specified.username&&!specified.password&&!specified.hash)
      allowCrossOriginFrom=specified.origin;
  }catch{}
  function prune(){
    for(const [id,row] of tickets){
      if(row.expiresAt<=clock()||row.uses>=5)tickets.delete(id);
    }
    // Never silently evict a valid active capability when capacity is full.
    // An attacker must not force other subscribers to lose valid tickets.
  }
  async function issue(req,res){
    if(!enabled)return respond(res,503,{ok:false,code:'relay_disabled'});
    if(!sameBearer(req.headers.authorization,sharedToken)){
      quota.issuerAuthDenied++;
      return respond(res,401,{ok:false,code:'relay_issuer_unauthorized'});
    }
    if(req.method!=='POST')return respond(res,405,{ok:false,code:'relay_bad_method'});
    if(!issueAllowed())return respond(res,429,
      {ok:false,code:'relay_issuer_rate_limited'},{'retry-after':'1'});
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
    if(tickets.size>=maxTickets){
      quota.capacityRejected++;
      return respond(res,429,{ok:false,code:'relay_grant_capacity_reached'},
        {'retry-after':'3'});
    }
    const id=issueToken();
    if(!/^[0-9a-f]{48}$/.test(id)||tickets.has(id))
      return respond(res,503,{ok:false,code:'relay_issue_unavailable'});
    const sharedLiveGranted=sharedLiveEnabled===true&&input.kind==='live'&&
      input.sharedLive===true;
    const grouped=sharedLiveGranted&&
      input.providerMaxConcurrentFeeds===1&&
      UUID.test(String(input.licensedSourceId||''));
    tickets.set(id,{sourceUrl:url.href,kind:input.kind,
      licensedSourceId:grouped?String(input.licensedSourceId).toLowerCase():null,
      providerMaxConcurrentFeeds:grouped?1:null,
      sharedLive:sharedLiveGranted,
      // Only an already licensed, explicitly shared, signed bridge grant
      // may follow one provider-issued public CDN redirect.
      approvedProviderRedirect:sharedLiveGranted&&input.licensedCdnRedirect===true,
      expiresAt:clock()+TTL,uses:0});
    quota.grantsIssued++;
    return respond(res,201,{ok:true,path:'/relay/'+id,expiresInSeconds:45,
      // This is a private, authenticated capability response, not an
      // assertion of upstream rights. The publisher must verify rights.
      ...(input.sharedLive===true?{sharedLiveGranted}:{})});
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
    if(row.sharedLive){
      try{return await fanout.handle(req,res,row.sourceUrl,{
        allowProviderCdn:row.approvedProviderRedirect===true,
        licensedSourceId:row.licensedSourceId,
        providerMaxConcurrentFeeds:row.providerMaxConcurrentFeeds
      })}
      catch{
        if(res.headersSent||res.destroyed)return;
        return failRelay(res,'relay_provider_unavailable');
      }
    }
    const controller=new AbortController();
    const onClose=()=>{if(!res.writableEnded)controller.abort()};
    const onAborted=()=>controller.abort();
    req.once('aborted',onAborted);
    res.once('close',onClose);
    let upstream;
    try{
      let target=await assertPublicMediaUrl(row.sourceUrl,{lookup});
      const originalOrigin=target.origin;
      let crossOriginRedirects=0;
      const headers={accept:'*/*','accept-encoding':'identity',
        'user-agent':'BLOFY-STREAM-Relay/1.0'};
      if(typeof req.headers.range==='string'&&/^bytes=\d*-\d*$/.test(req.headers.range))
        headers.range=req.headers.range;
      if(typeof req.headers['if-range']==='string'&&req.headers['if-range'].length<180)
        headers['if-range']=req.headers['if-range'];
      let ready=false,redirectCount=0,rangeFallbackUsed=false;
      // Certain Xtream VOD hosts wrongly reject an initial bytes=0- range
      // with 404/416 even though an ordinary GET works. Retry once without
      // Range only for the first byte of a movie/episode, never a seek or live.
      // Keep at most three validated provider redirects and five total calls.
      const firstByteRange=/^bytes=0-(?:[0-9]{0,12})$/i.test(headers.range||'');
      for(let i=0;i<5;i++){
        const timer=setTimeout(()=>controller.abort(),12000);
        try{
          upstream=await fetchImpl(target,{method:req.method,headers,redirect:'manual',
            signal:controller.signal});
        }finally{clearTimeout(timer)}
        if([301,302,303,307,308].includes(upstream.status)){
          const location=upstream.headers.get('location');
          await upstream.body?.cancel().catch(()=>{});
          if(!location||redirectCount>=3||i===4)throw new Error('relay_redirect_denied');
          const next=await assertPublicMediaUrl(new URL(location,target).href,{lookup});
          if(next.origin!==target.origin){
            // Only the explicitly selected source is allowed one public
            // provider-issued CDN hop. Never forward cookies, API bearer,
            // source Authorization or Referer to the target; only Range.
            if(originalOrigin!==allowCrossOriginFrom||crossOriginRedirects>=1)
              throw new Error('relay_redirect_denied');
            crossOriginRedirects++;
          }
          redirectCount++;
          target=next;continue;
        }
        if(req.method==='GET'&&row.kind!=='live'&&firstByteRange&&
           !rangeFallbackUsed&&[404,416].includes(upstream.status)&&i<4){
          await upstream.body?.cancel().catch(()=>{});
          rangeFallbackUsed=true;
          delete headers.range;
          delete headers['if-range'];
          continue;
        }
        ready=true;break;
      }
      if(!ready||!(upstream.ok||upstream.status===206)){
        await upstream?.body?.cancel().catch(()=>{});
        const upstreamStatus=Number.isInteger(upstream?.status)?upstream.status:null;
        return failRelay(res,upstreamStatus===404?'relay_provider_not_found':
          'relay_provider_unavailable',{
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
      // Some providers send HTTP 200 headers and then never send media bytes.
      // Bound this pre-playback stall without placing a timeout on a healthy
      // long-running live stream after its first chunk arrives.
      const firstByteTimer=setTimeout(()=>
        controller.abort(new Error('relay_first_byte_timeout')),firstByteTimeoutMs);
      try{first=await reader.read()}
      catch{throw new Error(controller.signal.reason?.message==='relay_first_byte_timeout'
        ?'relay_first_byte_timeout':'relay_upstream_read_failed')}
      finally{clearTimeout(firstByteTimer)}
      if(first.done||!inspect(first.value,mime,row.kind)){
        await reader.cancel().catch(()=>{});
        return failRelay(res,'relay_not_playable_media');
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
    }catch(error){
      const reason=String(error?.message||'');
      const transportCode=String(error?.cause?.code||error?.code||'');
      const code=reason==='relay_first_byte_timeout'?'relay_first_byte_timeout':
        reason==='relay_redirect_denied'?'relay_redirect_denied':
        reason==='relay_private_origin'?'relay_private_origin':
        reason==='relay_origin_unresolved'?'relay_origin_unresolved':
        ['ECONNRESET','EPIPE','UND_ERR_SOCKET'].includes(transportCode)?
          'relay_transport_connection_reset':
        ['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(transportCode)?
          'relay_transport_timeout':'relay_provider_unavailable';
      if(!res.headersSent)return failRelay(res,code);
      failureCounts.relay_interrupted_after_start=
        (failureCounts.relay_interrupted_after_start||0)+1;
      if(!res.destroyed)res.destroy();
    }finally{
      req.off('aborted',onAborted);res.off('close',onClose);
      controller.abort();
      if(upstream?.body&&!upstream.bodyUsed){try{await upstream.body.cancel()}catch{}}
    }
  }
  return {enabled,issue,relay,stats:()=>({enabled,activeTickets:tickets.size,
    sharedLiveEnabled,fanout:fanout.stats(),
    security:{grantsIssued:quota.grantsIssued,
      issuerAuthDenied:quota.issuerAuthDenied,
      issuanceThrottled:quota.issuanceThrottled,
      capacityRejected:quota.capacityRejected,
      maxTickets,maxIssuesPerSecond,maxIssuesPerMinute},
    relayFailureTotal:Object.values(failureCounts).reduce((a,b)=>a+b,0),
    relayFailureCounts:{...failureCounts}})};
}
