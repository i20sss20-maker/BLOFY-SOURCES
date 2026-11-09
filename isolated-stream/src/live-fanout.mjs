// Opt-in live TS sharing for authenticated short-lived relay grants.
// A single validated provider HTTP response can be fanned out to multiple
// viewers. Never store source URLs or credentials in logs or public responses.
import {createHash} from 'node:crypto';
import {assertPublicMediaUrl} from './relay-guard.mjs';

export function createLiveFanout({
  fetchImpl=fetch,lookup,maxFeeds=8,maxViewersPerFeed=128,
  firstByteTimeoutMs=12000,idleMs=3000,clock=Date.now
}={}){
  if(!Number.isInteger(maxFeeds)||maxFeeds<1||maxFeeds>64||
     !Number.isInteger(maxViewersPerFeed)||maxViewersPerFeed<1||maxViewersPerFeed>512)
    throw new Error('fanout_capacity_invalid');
  const feeds=new Map();
  const keyOf=url=>createHash('sha256').update(url).digest('hex');
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
    for(const viewer of [...row.viewers]){
      if(viewer.destroyed||viewer.writableEnded){row.viewers.delete(viewer);continue;}
      // Never let a stalled receiver accumulate unbounded data in memory.
      if(viewer.writableLength>512*1024||!viewer.write(chunk)){
        row.viewers.delete(viewer);
        if(!viewer.destroyed)viewer.destroy();
      }
    }
    if(!row.viewers.size&&!row.idleTimer){
      row.idleTimer=setTimeout(()=>closeFeed(row.key,'idle',row),idleMs);
      row.idleTimer.unref?.();
    }
  }
  async function pump(row){
    let reader;
    try{
      const target=await assertPublicMediaUrl(row.sourceUrl,{lookup});
      const timer=setTimeout(()=>row.controller.abort(),firstByteTimeoutMs);
      let response;
      try{
        response=await fetchImpl(target,{redirect:'manual',signal:row.controller.signal,
          headers:{accept:'video/mp2t,application/octet-stream;q=0.9,*/*;q=0.5',
            'accept-encoding':'identity','user-agent':'BLOFY-STREAM-Fanout/1.0'}});
        if(!response.ok||!response.body)throw Error('provider_unavailable');
        const contentType=String(response.headers.get('content-type')||'').toLowerCase();
        if(/^(text\/|application\/(?:json|xml))/.test(contentType))
          throw Error('provider_not_media');
        reader=response.body.getReader();
        const first=await reader.read();
        if(first.done||!first.value?.length||first.value[0]!==0x47)
          throw Error('provider_not_ts');
        // Permit clients to start only after actual transport bytes arrive.
        row.state='ready';row.startedAt=clock();
        row.first=Buffer.from(first.value);
        for(const viewer of row.viewers){
          if(!viewer.headersSent)viewer.writeHead(200,{
            'content-type':'video/mp2t','cache-control':'no-store',
            'x-content-type-options':'nosniff'});
        }
        deliver(row,row.first);row.first=null;
      }finally{clearTimeout(timer);}
      while(!row.controller.signal.aborted){
        const part=await reader.read();
        if(part.done)break;
        if(part.value?.length)deliver(row,Buffer.from(part.value));
      }
    }catch{
      for(const viewer of row.viewers){
        if(!viewer.headersSent){viewer.writeHead(502,{'content-type':'application/json',
          'cache-control':'no-store'});viewer.end('{"ok":false,"code":"fanout_source_unavailable"}');}
        else if(!viewer.destroyed)viewer.end();
      }
    }finally{
      try{await reader?.cancel()}catch{}
      try{reader?.releaseLock()}catch{}
      closeFeed(row.key,'closed',row);
    }
  }
  async function handle(req,res,sourceUrl){
    if(req.method!=='GET'){
      res.writeHead(405,{allow:'GET'});res.end();return;
    }
    const url=await assertPublicMediaUrl(sourceUrl,{lookup});
    const key=keyOf(url.href);
    let row=feeds.get(key);
    if(!row){
      if(feeds.size>=maxFeeds){
        res.writeHead(503,{'retry-after':'3'});res.end('fanout_capacity_reached');return;
      }
      row={key,sourceUrl:url.href,viewers:new Set(),controller:new AbortController(),
        state:'starting',idleTimer:null,startedAt:null};
      feeds.set(key,row);
    }
    if(row.viewers.size>=maxViewersPerFeed){
      res.writeHead(503,{'retry-after':'3'});res.end('fanout_viewer_limit');return;
    }
    if(row.idleTimer){clearTimeout(row.idleTimer);row.idleTimer=null;}
    row.viewers.add(res);
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
        'x-content-type-options':'nosniff'});
    }
    if(row.state==='starting'&&!row.pumpStarted){
      row.pumpStarted=true;void pump(row);
    }
  }
  return {handle,stats:()=>({activeFeeds:feeds.size,
    viewers:[...feeds.values()].reduce((n,row)=>n+row.viewers.size,0),
    maxFeeds,maxViewersPerFeed}),close:()=>{for(const key of [...feeds.keys()])closeFeed(key)}};
}
