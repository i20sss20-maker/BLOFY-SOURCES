// Opt-in live TS sharing for authenticated short-lived relay grants.
// A single validated provider HTTP response can be fanned out to multiple
// viewers. Never store source URLs or credentials in logs or public responses.
import {createHash} from 'node:crypto';
import {assertPublicMediaUrl} from './relay-guard.mjs';
import {createTsAudioInspector} from './ts-audio-inspector.mjs';

export function createLiveFanout({
  fetchImpl=fetch,lookup,maxFeeds=8,maxViewersPerFeed=128,
  minViewersToStart=1,
  firstByteTimeoutMs=12000,readIdleTimeoutMs=15000,idleMs=3000,clock=Date.now,
  providerCooldownMs=2000,maxProviderCooldownMs=30000,
  reconnectOnUpstreamEnd=false,maxReconnectAttempts=3,
  initialTransientRetries=0,redirectSourceOrigin='',onEvent=()=>{},
  lateJoinReplayBytes=256*1024
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
       initialTransientRetries>2||
     !Number.isInteger(lateJoinReplayBytes)||lateJoinReplayBytes<0||
       lateJoinReplayBytes>1024*1024)
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
  // Short-lived, credential-free diagnostics for the authenticated operator:
  // an ordinal per source feed (not source URL, account, token or IP).
  let feedSequence=0;
  const recentEvents=[];
  function event(row,kind,reason=''){
    const knownKinds=new Set(['connected','reconnecting','recovered','failed','idle']);
    if(!knownKinds.has(kind))return;
    const item={channel:row.channelNumber,kind,at:clock()};
    if(allowedReasons.has(reason))item.reason=reason;
    recentEvents.unshift(item);
    if(recentEvents.length>32)recentEvents.length=32;
    // Optional structured production log sink. Only the known fixed enums
    // and an ephemeral ordinal are transmitted; never the actual source URL.
    try{onEvent({...item})}catch{}
  }
  const counters={providerFailures:0,slowViewerDisconnects:0,
    capacityRejections:0,sourceLimitRejections:0,cooldownRejections:0,upstreamReconnects:0,
    reconnectExhaustions:0,upstreamSessionsOpened:0,
    sourceBytesReceived:0,viewerBytesQueued:0,viewersAccepted:0,
    initialRetries:0,reconnectRecovered:0,sourceOutages:0,
    lateJoinReplays:0,lateJoinReplayBytes:0};
  // Fixed allowlist of diagnostic categories. Never report upstream URL,
  // username/password, IP, ticket or exception message in public metrics.
  const failureReasons=Object.create(null);
  const allowedReasons=new Set(['provider_denied','provider_not_media',
    'provider_not_ts','provider_unavailable','fanout_upstream_ended',
    'fanout_read_idle_timeout','relay_private_origin','relay_origin_unresolved',
    'provider_redirect_denied']);
  const keyOf=url=>createHash('sha256').update(url).digest('hex');
  function admittedRetryAfterMs(header){
    // RFC 9110 Retry-After is delta seconds or an HTTP-date. Provider
    // throttling gets a bounded local cooldown; no response text is exposed.
    if(typeof header!=='string'||header.length>96)return 0;
    const value=header.trim();
    let wait=0;
    if(/^\d{1,8}$/.test(value))wait=Number(value)*1000;
    else if(/^[A-Za-z]{3},\s/.test(value)){
      const stamp=Date.parse(value);
      if(Number.isFinite(stamp))wait=stamp-clock();
    }
    return Number.isFinite(wait)&&wait>0?
      Math.min(120000,Math.ceil(wait)):0;
  }
  // Per-source failures are stored as non-reversible hashes only.
  // Limit both memory and upstream retries during source outages.
  function activeCooldown(key){
    const state=cooldowns.get(key);
    if(!state||state.retryAt<=clock())return null;
    return state;
  }
  function noteProviderFailure(key,providerRetryAfterMs=0){
    const last=cooldowns.get(key);
    const failures=Math.min(8,(last?.failures||0)+1);
    const exponential=Math.min(maxProviderCooldownMs,
      providerCooldownMs*Math.pow(2,failures-1));
    // Do not poll a rate-limited licensed source before its bounded
    // Retry-After, even if new viewers repeatedly reconnect.
    const delay=Math.max(exponential,
      Math.min(120000,Math.max(0,providerRetryAfterMs)));
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
    if(reason==='idle')event(row,'idle');
    for(const viewer of row.viewers){
      if(!viewer.destroyed&&!viewer.writableEnded)viewer.end();
    }
    row.viewers.clear();row.state=reason;
    row.recentChunks=[];row.recentBytes=0;
  }
  // A viewer joining an already running TS feed needs recent transport
  // packets (often PAT/PMT and a nearby keyframe). Keep only a small in-memory
  // tail of the CURRENT upstream session, never disk or a separate source GET.
  function rememberRecent(row,chunk){
    if(lateJoinReplayBytes===0)return;
    const value=chunk.length>lateJoinReplayBytes
      ?Buffer.from(chunk.subarray(chunk.length-lateJoinReplayBytes))
      :Buffer.from(chunk);
    row.recentChunks.push(value);
    row.recentBytes+=value.length;
    while(row.recentBytes>lateJoinReplayBytes&&row.recentChunks.length>1){
      row.recentBytes-=row.recentChunks.shift().length;
    }
    if(row.recentBytes>lateJoinReplayBytes){
      row.recentChunks=[Buffer.from(value.subarray(value.length-lateJoinReplayBytes))];
      row.recentBytes=row.recentChunks[0].length;
    }
  }
  function replayRecent(row,viewer){
    if(row.state!=='ready'||viewer.destroyed||viewer.writableEnded)return;
    for(const chunk of row.recentChunks){
      if(viewer.writableLength+chunk.length>512*1024){
        counters.slowViewerDisconnects++;
        if(!viewer.destroyed)viewer.destroy();
        return;
      }
      viewer.write(chunk);
      counters.viewerBytesQueued+=chunk.length;
      counters.lateJoinReplayBytes+=chunk.length;
    }
    if(row.recentChunks.length)counters.lateJoinReplays++;
  }
  function deliver(row,chunk){
    row.lastMediaAt=clock();
    // Parse only in-flight MPEG-TS metadata, with a strict memory/CPU cap.
    // Never decode, change a byte, or open an extra connection to the provider.
    if(row.trackInspector&&!row.trackBudgetComplete){
      try{
        const before=row.trackInspector.summary().inspectedBytes;
        const observed=row.trackInspector.push(chunk);
        if(observed.inspectedBytes>before)row.trackInspectedAt=clock();
        if(observed.samplingComplete)row.trackBudgetComplete=true;
      }catch{
        row.trackInspector=null;row.trackInspectedAt=null;
        row.trackBudgetComplete=true;
      }
    }
    // Aggregate-only bandwidth accounting: counts upstream bytes once,
    // outbound bytes as queued writes (not verified network delivery).
    counters.sourceBytesReceived+=chunk.length;
    rememberRecent(row,chunk);
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
  async function releaseUpstream(reader,response){
    // Some sources never settle ReadableStream.cancel() after a stalled read.
    // The fetch AbortController is already aborted by the caller; cleanup
    // must not indefinitely block the next single-source retry.
    let timer;
    try{
      await Promise.race([
        Promise.resolve().then(()=>reader?
          reader.cancel():response?.body?.cancel()).catch(()=>{}),
        new Promise(resolve=>{timer=setTimeout(resolve,250);})
      ]);
    }finally{
      if(timer)clearTimeout(timer);
      if(reader)try{reader.releaseLock()}catch{}
    }
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
            if([401,403,404,429,456].includes(response.status)){
              if(response.status===429)
                row.providerRetryAfterMs=admittedRetryAfterMs(
                  response.headers.get('retry-after'));
              throw Error('provider_denied');
            }
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
          row.sourceStarts++;
          // Every accepted upstream session may have a different MPEG-TS
          // program/codec after a permitted reconnect. Evidence is scoped
          // to current publisher only, not the previously connected origin.
          row.trackInspector=createTsAudioInspector();
          row.trackInspectedAt=null;
          row.trackBudgetComplete=false;
          // Never replay bytes from a previous provider session into a new
          // TS program/codec after reconnect.
          row.recentChunks=[];row.recentBytes=0;
          if(reopening){
            counters.reconnectRecovered++;reopening=false;
            event(row,'recovered');
          }else if(row.sourceStarts===1)event(row,'connected');
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
            row.reconnects++;
            event(row,'reconnecting',reason);
            counters.upstreamReconnects++;
          }else{
            if(canReconnect)counters.reconnectExhaustions++;
            if(row.viewers.size){
              noteProviderFailure(row.key,row.providerRetryAfterMs);counters.sourceOutages++;
              event(row,'failed',reason);
            }
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
          attemptController.abort();
          await releaseUpstream(reader,response);
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
  async function handle(req,res,sourceUrl,{allowProviderCdn=false,
    licensedSourceId=null,providerMaxConcurrentFeeds=null}={}){
    if(req.method==='HEAD'){
      res.writeHead(200,{'content-type':'video/mp2t','cache-control':'no-store',
        'referrer-policy':'no-referrer','x-frame-options':'DENY',
        'x-content-type-options':'nosniff'});res.end();return;
    }
    if(req.method!=='GET'){
      res.writeHead(405,{allow:'GET, HEAD'});res.end();return;
    }
    const url=await assertPublicMediaUrl(sourceUrl,{lookup});
    // Different signed provider-redirect scopes must NOT merge into the
    // same feed, even when their upstream URL is identical. Two granted
    // viewers still share exactly one feed under the same licensed scope.
    const sourceScope=typeof licensedSourceId==='string'&&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(licensedSourceId)&&
      Number.isSafeInteger(providerMaxConcurrentFeeds)&&
      providerMaxConcurrentFeeds>=1&&providerMaxConcurrentFeeds<=64
      ?licensedSourceId.toLowerCase():null;
    const sourceQuota=sourceScope?providerMaxConcurrentFeeds:null;
    // Channel identity includes source authorization scope, so unrelated
    // distributors can never accidentally merge on the same provider URL.
    const key=keyOf(url.href+'\\0'+(allowProviderCdn?'licensed':'ordinary')+
      (sourceScope?'\\0'+sourceScope:''));
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
    if(!row&&sourceScope){
      // A single-upstream Xtream subscription can share the SAME channel
      // across licensed viewers, but cannot promise a different live channel
      // concurrently. Protect the already playing channel: never evict it or
      // open a second connection using this known one-connection account.
      // The scope is trusted backend metadata; it is not read from clients.
      const existing=[...feeds.values()].filter(other=>
        other.licensedSourceId===sourceScope&&other.key!==key);
      // A cap that changes during a running session must never silently
      // expand older allocations. The stricter known cap wins until drained.
      const effectiveQuota=Math.min(sourceQuota,
        ...existing.map(other=>other.providerMaxConcurrentFeeds||sourceQuota));
      if(existing.length>=effectiveQuota){
        counters.sourceLimitRejections++;
        res.writeHead(503,{'retry-after':'2','cache-control':'no-store',
          'content-type':'application/json',
          'referrer-policy':'no-referrer'});
        res.end('{"ok":false,"code":"fanout_source_channel_limit"}');
        return;
      }
    }
    if(!row){
      // During rapid channel zapping, old feeds remain alive for idleMs
      // after their last viewer leaves. Reclaim ONLY those idle feeds if
      // the pool is full. Never evict a stream serving real viewers.
      if(feeds.size>=maxFeeds){
        for(const [oldKey,oldRow] of feeds){
          if(oldRow.viewers.size===0&&oldRow.idleTimer)
            closeFeed(oldKey,'idle',oldRow);
          if(feeds.size<maxFeeds)break;
        }
      }
      if(feeds.size>=maxFeeds){
        counters.capacityRejections++;
        res.writeHead(503,{'retry-after':'3'});res.end('fanout_capacity_reached');return;
      }
      row={key,sourceUrl:url.href,viewers:new Set(),controller:new AbortController(),
        allowProviderCdn:allowProviderCdn===true,
        licensedSourceId:sourceScope,
        providerMaxConcurrentFeeds:sourceQuota,
        // Numbers are temporary and reset on every deployment; the operator
        // can spot failures without exposing sensitive provider credentials.
        channelNumber:++feedSequence,reconnects:0,sourceStarts:0,lastMediaAt:null,
        state:'starting',idleTimer:null,startedAt:null,providerRetryAfterMs:0,
        trackInspector:createTsAudioInspector(),trackInspectedAt:null,
        trackBudgetComplete:false,recentChunks:[],recentBytes:0};
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
      replayRecent(row,res);
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
    // Up to maxFeeds (64) active sources and only 32 recent incidents:
    // no URLs, credentials, subscriber identifiers or IP addresses.
    channels:[...feeds.values()].map(row=>({
      channel:row.channelNumber,state:row.state,viewers:row.viewers.size,
      sourceStarts:row.sourceStarts,reconnects:row.reconnects,
      lastMediaAgeMs:row.lastMediaAt===null?null:Math.max(0,clock()-row.lastMediaAt),
      activeForMs:row.startedAt===null?null:Math.max(0,clock()-row.startedAt),
      trackInspectedAt:row.trackInspectedAt,
      audio:row.trackInspector?row.trackInspector.summary():{
        status:'unavailable',audioCodecs:[],videoCodecs:[],
        hasAudioStream:false,decodedAudio:false}
    })),
    events:recentEvents.map(item=>({...item})),
    maxFeeds,maxViewersPerFeed,lateJoinReplayLimitBytes:lateJoinReplayBytes,
    bufferedBootstrapBytes:[...feeds.values()].reduce((n,row)=>n+(row.recentBytes||0),0)}),
    close:()=>{for(const key of [...feeds.keys()])closeFeed(key)}};
}
