// Opt-in live TS sharing for authenticated short-lived relay grants.
// A single validated provider HTTP response can be fanned out to multiple
// viewers. Never store source URLs or credentials in logs or public responses.
import {createHash} from 'node:crypto';
import {assertPublicMediaUrl} from './relay-guard.mjs';

export function createLiveFanout({
  fetchImpl=fetch,lookup,maxFeeds=8,maxViewersPerFeed=128,
  minViewersToStart=1,
  firstByteTimeoutMs=12000,readIdleTimeoutMs=15000,idleMs=3000,clock=Date.now,
  providerCooldownMs=2000,maxProviderCooldownMs=30000,
  reconnectOnUpstreamEnd=false,maxReconnectAttempts=3,
  initialTransientRetries=0,redirectSourceOrigin=''
}={}){
  if(!Number.isInteger(maxFeeds)||maxFeeds<1||maxFeeds>64||
     !Number.isInteger(maxViewersPerFeed)||maxViewersPerFeed<1||maxViewersPerFeed>512||
     !Number.isInteger(minViewersToStart)||minViewersToStart<1||
       minViewersToStart>maxViewersPerFeed||
     !Number.isInteger(readIdleTimeoutMs)||readIdleTimeoutMs<50||readIdleTimeoutMs>120000||
     !Number.isInteger(providerCooldownMs)||providerCooldownMs<20||providerCooldownMs>60000||
     !Number.isInteger(maxProviderCooldownMs)||maxProviderCooldownMs<providerCooldownMs||
       maxProviderCooldownMs>180000||
     !Number.isInteger(maxReconnectAttempts)||maxReconnectAttempts<0||maxReconnectAttempts>5||
     !Number.isInteger(initialTransientRetries)||initialTransientRetries<0||
       initialTransientRetries>2)
    throw new Error('fanout_capacity_invalid');
  let approvedRedirectOrigin='';
  try{
    const base=new URL(String(redirectSourceOrigin||''));
    if(['http:','https:'].includes(base.protocol)&&base.href===base.origin+'/'&&
      !base.username&&!base.password&&!base.hash)
      approvedRedirectOrigin=base.origin;
  }catch{}
  const feeds=new Map();
  const cooldowns=new Map();
  const counters={providerFailures:0,slowViewerDisconnects:0,
    capacityRejections:0,cooldownRejections:0,upstreamReconnects:0,
    reconnectExhaustions:0,upstreamSessionsOpened:0,
    sourceBytesReceived:0,viewerBytesQueued:0,viewersAccepted:0,
    initialRetries:0,reconnectRecovered:0,sourceOutages:0};
  // Fixed allowlist of diagnostic categories. Never report upstream URL,
  // username/password, IP, ticket or exception message in public metrics.
  const failureReasons=Object.create(null);
  const allowedReasons=new Set(['provider_denied','provider_not_media',
    'provider_not_ts','provider_unavailable','fanout_upstream_ended',
    'fanout_read_idle_timeout','relay_private_origin','relay_origin_unresolved',
    'provider_redirect_denied']);
  const keyOf=url=>createHash('sha256').update(url).digest('hex');
  // Per-source failures are stored as non-reversible hashes only.
  // Limit both memory and upstream retries during source outages.
  function activeCooldown(key){
    const state=cooldowns.get(key);
    if(!state||state.retryAt<=clock())return null;
    return state;
  }
  function noteProviderFailure(key){
    const last=cooldowns.get(key);
    const failures=Math.min(8,(last?.failures||0)+1);
    const delay=Math.min(maxProviderCooldownMs,
      providerCooldownMs*Math.pow(2,failures-1));
    cooldowns.delete(key);
    cooldowns.set(key,{failures,retryAt:clock()+delay});
    while(cooldowns.size>64)cooldowns.delete(cooldowns.keys().next().value);
    counters.providerFailures++;
  }
  function closeFeed(key,reason='closed',expectedRow=null){
    const row=feeds.get(key);
    if(!row||(expectedRow&&row!==expectedRow))return;
    feeds.delete(key);clearTimeout(row.idleTimer);
    row.controller.abort();
    for(const viewer of row.viewers){
      if(!viewer.destroyed&&!viewer.writableEnded)viewer.end();
    }
    row.viewers.clear();row.state=reason;
  }
  function deliver(row,chunk){
    // Aggregate-only bandwidth accounting: counts upstream bytes once,
    // outbound bytes as queued writes (not verified network delivery).
    counters.sourceBytesReceived+=chunk.length;
    for(const viewer of [...row.viewers]){
      if(viewer.destroyed||viewer.writableEnded){row.viewers.delete(viewer);continue;}
      // Never let a stalled receiver accumulate unbounded data in memory.
      if(viewer.writableLength+chunk.length>512*1024){
        counters.slowViewerDisconnects++;
        row.viewers.delete(viewer);
        if(!viewer.destroyed)viewer.destroy();
        continue;
      }
      // write() returning false only signals backpressure, not a dropped
      // client. Retain the connection while its bounded queue drains.
      viewer.write(chunk);
      counters.viewerBytesQueued+=chunk.length;
    }
    if(!row.viewers.size&&!row.idleTimer){
      row.idleTimer=setTimeout(()=>closeFeed(row.key,'idle',row),idleMs);
      row.idleTimer.unref?.();
    }
  }
  function nextChunk(reader,limitMs,attemptController){
    // A provider that opens a connection but never sends more TS data must
    // not hold viewers forever. End this feed; the player can re-request it.
    let timer;
    const timeout=new Promise((_,reject)=>{
      timer=setTimeout(()=>{
        attemptController.abort();
        reject(new Error('fanout_read_idle_timeout'));
      },limitMs);
      timer.unref?.();
    });
    return Promise.race([reader.read(),timeout]).finally(()=>clearTimeout(timer));
  }
  async function pump(row){
    let everDelivered=false,failedAttempts=0,initialFailures=0;
    let reopening=false;
    try{
      while(!row.controller.signal.aborted&&row.viewers.size){
        let reader=null,response=null,retry=false,connectedAt=clock();
        const attemptController=new AbortController();
        const stopAttempt=()=>attemptController.abort();
        row.controller.signal.addEventListener('abort',stopAttempt,{once:true});
        try{
          // Provider-issued TS redirects are validated at every hop; no
          // arbitrary origin hops and no source credential headers.
          let target=await assertPublicMediaUrl(row.sourceUrl,{lookup});
          const originalOrigin=target.origin;
          let crossOriginHops=0,redirectCount=0;
          while(true){
            const headerTimer=setTimeout(()=>attemptController.abort(),firstByteTimeoutMs);
            headerTimer.unref?.();
            try{
              response=await fetchImpl(target,{redirect:'manual',signal:attemptController.signal,
                headers:{accept:'video/mp2t,application/octet-stream;q=0.9,*/*;q=0.5',
                  'accept-encoding':'identity','user-agent':'BLOFY-STREAM-Fanout/1.0'}});
            }finally{clearTimeout(headerTimer)}
            if(![301,302,303,307,308].includes(response.status))break;
            const location=response.headers.get('location');
            if(!location||redirectCount>=3)throw Error('provider_redirect_denied');
            const next=await assertPublicMediaUrl(new URL(location,target).href,{lookup});
            // A licensed CDN redirect must never reduce HTTPS transport
            // security or point back into Railway/private address space.
            if(target.protocol==='https:'&&next.protocol!=='https:')
              throw Error('provider_redirect_denied');
            if(next.origin!==target.origin){
              const allowedOrigin=row.allowProviderCdn===true?
                originalOrigin:approvedRedirectOrigin;
              if(originalOrigin!==allowedOrigin||crossOriginHops>=1)
                throw Error('provider_redirect_denied');
              crossOriginHops++;
            }
            await response.body?.cancel().catch(()=>{});
            response=null;target=next;redirectCount++;
          }
          if(!response.ok||!response.body){
            if([401,403,404,429,456].includes(response.status))
              throw Error('provider_denied');
            throw Error('provider_unavailable');
          }
          const contentType=String(response.headers.get('content-type')||'').toLowerCase();
          if(/^(text\/|application\/(?:json|xml))/.test(contentType))
            throw Error('provider_not_media');
          reader=response.body.getReader();
          const first=await nextChunk(reader,firstByteTimeoutMs,attemptController);
          if(first.done||!first.value?.length||first.value[0]!==0x47)
            throw Error('provider_not_ts');
          counters.upstreamSessionsOpened++;
          if(reopening){counters.reconnectRecovered++;reopening=false;}
          // Viewers retain their HTTP response during a permitted sequential
          // upstream reconnect, preventing an automatic full-screen exit.
          row.state='ready';
          if(!row.startedAt)row.startedAt=clock();
          // A single initial packet does not prove the provider is healthy.
          // Preserve exponential cool-down across short 1-2s flap loops.
          for(const viewer of row.viewers){
            if(!viewer.headersSent)viewer.writeHead(200,{
              'content-type':'video/mp2t','cache-control':'no-store',
              'referrer-policy':'no-referrer','x-frame-options':'DENY',
              'x-content-type-options':'nosniff'});
          }
          deliver(row,Buffer.from(first.value));
          everDelivered=true;
          while(!row.controller.signal.aborted){
            const part=await nextChunk(reader,readIdleTimeoutMs,attemptController);
            if(part.done){
              if(row.viewers.size)throw Error('fanout_upstream_ended');
              break;
            }
            if(part.value?.length)deliver(row,Buffer.from(part.value));
            if(clock()-connectedAt>=8000)cooldowns.delete(row.key);
          }
          if(!row.viewers.size||row.controller.signal.aborted)break;
        }catch(error){
          if(row.controller.signal.aborted||!row.viewers.size)break;
          const message=String(error?.message||'');
          const reason=allowedReasons.has(message)?message:'other_transport';
          failureReasons[reason]=(failureReasons[reason]||0)+1;
          const forbidden=['provider_denied','provider_not_media','provider_not_ts',
            'provider_redirect_denied'];
          // A transient initial upstream 5xx or transport reset may succeed
          // on ONE bounded sequential retry. Never retry source access denial,
          // malformed media, private addresses or redirect violations.
          const transientInitial=!everDelivered&&
            ['provider_unavailable','other_transport','fanout_read_idle_timeout']
              .includes(reason)&&initialFailures<initialTransientRetries;
          const canReconnect=reconnectOnUpstreamEnd===true&&
            everDelivered&&maxReconnectAttempts>0&&!forbidden.includes(message);
          // A healthy 8s+ upstream session resets short-failure budget;
          // a series of fast failures stops after three attempts.
          if(clock()-connectedAt>=8000)failedAttempts=0;
          if(transientInitial){
            initialFailures++;retry=true;counters.initialRetries++;
          }else if(canReconnect&&failedAttempts<maxReconnectAttempts){
            failedAttempts++;retry=true;reopening=true;
            row.state='reconnecting';
            counters.upstreamReconnects++;
          }else{
            if(canReconnect)counters.reconnectExhaustions++;
            if(row.viewers.size){noteProviderFailure(row.key);counters.sourceOutages++;}
            for(const viewer of row.viewers){
              if(!viewer.headersSent){
                viewer.writeHead(502,{'content-type':'application/json',
                  'cache-control':'no-store'});
                viewer.end('{"ok":false,"code":"fanout_source_unavailable"}');
              }else if(!viewer.destroyed)viewer.end();
            }
          }
        }finally{
          // Source reader is released BEFORE a replacement source GET.
          try{await reader?.cancel()}catch{}
          try{reader?.releaseLock()}catch{}
          if(!reader)await response?.body?.cancel().catch(()=>{});
          attemptController.abort();
          row.controller.signal.removeEventListener('abort',stopAttempt);
        }
        if(!retry)break;
        const retryNumber=everDelivered?failedAttempts:initialFailures;
        const delay=Math.min(2000,250*Math.pow(2,retryNumber-1));
        await new Promise(resolve=>setTimeout(resolve,delay));
      }
    }finally{
      closeFeed(row.key,'closed',row);
    }
  }
  async function handle(req,res,sourceUrl,{allowProviderCdn=false}={}){
    if(req.method==='HEAD'){
      res.writeHead(200,{'content-type':'video/mp2t','cache-control':'no-store',
        'referrer-policy':'no-referrer','x-frame-options':'DENY',
        'x-content-type-options':'nosniff'});res.end();return;
    }
    if(req.method!=='GET'){
      res.writeHead(405,{allow:'GET, HEAD'});res.end();return;
    }
    const url=await assertPublicMediaUrl(sourceUrl,{lookup});
    const key=keyOf(url.href);
    let row=feeds.get(key);
    // Existing healthy readers are never affected by a cool-down
    // recorded for a previous failed feed.
    if(!row){
      const block=activeCooldown(key);
      if(block){
        counters.cooldownRejections++;
        const retrySeconds=Math.max(1,Math.ceil((block.retryAt-clock())/1000));
        res.writeHead(503,{'retry-after':String(retrySeconds),
          'cache-control':'no-store','content-type':'application/json'});
        res.end('{"ok":false,"code":"fanout_source_cooling_down"}');
        return;
      }
    }
    if(!row){
      if(feeds.size>=maxFeeds){
        counters.capacityRejections++;
        res.writeHead(503,{'retry-after':'3'});res.end('fanout_capacity_reached');return;
      }
      row={key,sourceUrl:url.href,viewers:new Set(),controller:new AbortController(),
        allowProviderCdn:allowProviderCdn===true,
        state:'starting',idleTimer:null,startedAt:null};
      feeds.set(key,row);
    }
    if(row.viewers.size>=maxViewersPerFeed){
      counters.capacityRejections++;
      res.writeHead(503,{'retry-after':'3'});res.end('fanout_viewer_limit');return;
    }
    if(row.idleTimer){clearTimeout(row.idleTimer);row.idleTimer=null;}
    row.viewers.add(res);
    counters.viewersAccepted++;
    const onClose=()=>{
      row.viewers.delete(res);
      if(!row.viewers.size&&!row.idleTimer){
        row.idleTimer=setTimeout(()=>closeFeed(row.key,'idle',row),idleMs);
        row.idleTimer.unref?.();
      }
    };
    res.once('close',onClose);
    if(row.state==='ready'){
      res.writeHead(200,{'content-type':'video/mp2t','cache-control':'no-store',
        'referrer-policy':'no-referrer','x-frame-options':'DENY',
        'x-content-type-options':'nosniff'});
    }
    if(row.state==='starting'&&!row.pumpStarted&&
      row.viewers.size>=minViewersToStart){
      row.pumpStarted=true;void pump(row);
    }
  }
  return {handle,stats:()=>({activeFeeds:feeds.size,
    viewers:[...feeds.values()].reduce((n,row)=>n+row.viewers.size,0),
    cooldownFeeds:[...cooldowns.values()].filter(v=>v.retryAt>clock()).length,
    ...counters,failureReasons:{...failureReasons},
    maxFeeds,maxViewersPerFeed}),
    close:()=>{for(const key of [...feeds.keys()])closeFeed(key)}};
}
