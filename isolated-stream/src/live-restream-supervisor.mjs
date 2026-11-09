// Real operator-scoped live restream supervisor. Sources resolve through the
// authoritative, authenticated BLOFY PLAYER bridge; no operator-supplied URLs,
// no subscriber migration, no exposed Xtream passwords. MAX 3 live paths.
// MediaMTX + FFmpeg start only when an authorized operator opens the HLS path.
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {assertPublicMediaUrl} from './relay-guard.mjs';
import {verifyRestreamSmoke} from './restream-smoke.mjs';

const MTX='http://blofy-stream-media.railway.internal:9997';
const HLS='http://blofy-stream-media.railway.internal:8888';
const INTERNAL='http://blofy-stream-api.railway.internal:3000';
const MAX_PATHS=3,MAX_IDLE_MS=20*60*1000;
// Reader capacity is per shared MediaMTX path, not per upstream connection.
// Keep the number of distinct upstream paths bounded separately.
const MAX_SHARED_READERS=256;
const ID=/^live-[0-9a-f]{12}$/;
const TICKET=/^[0-9a-f]{48}$/;
const USERNAME='blofy-control';
const safe=(body,status=200)=>({status,body});
const err=code=>Object.assign(new Error(code),{code});
const classify=e=>[
  'restream_provider_not_found','restream_provider_denied','restream_provider_unavailable',
  'restream_invalid_upstream','restream_invalid_media','restream_first_byte_timeout',
  'restream_busy','restream_hls_unavailable','restream_provider_redirect_denied',
  'restream_control_unavailable','restream_path_not_found'
].includes(e?.code)?e.code:'restream_internal_error';
const response=(res,status,payload)=>{
  const bytes=Buffer.from(JSON.stringify(payload));
  res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',
    'x-content-type-options':'nosniff','content-length':bytes.length});
  res.end(bytes);
};
function optsAuth(secret){
  if(typeof secret!=='string'||secret.length<32)return null;
  return 'Basic '+Buffer.from(USERNAME+':'+secret).toString('base64');
}
async function readBoundedJson(reply,max=8192){
  const size=Number(reply.headers?.get?.('content-length')||0);
  if(size>max)throw err('restream_control_unavailable');
  const raw=await reply.text();
  if(Buffer.byteLength(raw)>max)throw err('restream_control_unavailable');
  try{return raw?JSON.parse(raw):null}catch{throw err('restream_control_unavailable')}
}
function safePath(p){
  return typeof p==='string'&&ID.test(p);
}
function safeFile(p){
  // Internal HLS resources only, with no traversal, query-based origin, or
  // cross-origin URL injection into the browser or MediaMTX backend.
  return typeof p==='string'&&p.length<=175&&/^[a-zA-Z0-9_.-]+$/.test(p)&&
    !p.includes('..')&&/\.(?:m3u8|ts|mp4|m4s|aac|vtt)$/.test(p);
}
function buildCommand(name,ticket){
  if(!safePath(name)||!TICKET.test(ticket))throw err('restream_invalid_path');
  // ALL interpolated values are strictly hex. No provider URL is added to
  // the FFmpeg shell command or to MediaMTX's public HLS path.
  return 'ffmpeg -nostdin -hide_banner -loglevel error '+
    '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 3 '+
    '-rw_timeout 14000000 -i '+INTERNAL+'/internal/live-feed/'+ticket+
    ' -map 0:v:0? -map 0:a:0? -c copy -f rtsp '+
    '-rtsp_transport tcp rtsp://127.0.0.1:8554/'+name;
}
export function createLiveRestreamSupervisor({
  portal,fetchImpl=fetch,lookup,mediaPassword='',clock=Date.now,
  maxPaths=MAX_PATHS,maxSharedReaders=MAX_SHARED_READERS,onUnexpectedError=()=>{}
}={}){
  if(!Number.isInteger(maxSharedReaders)||maxSharedReaders<1||maxSharedReaders>2048)
    throw new Error('restream_shared_readers_invalid');
  const auth=optsAuth(mediaPassword);
  const paths=new Map(),tokens=new Map();
  let operation=false,cleanupAt=0;
  async function mediamtx(method,route,data){
    if(!auth)throw err('restream_control_unavailable');
    if(!/^\/v3\/config\/paths\/(?:add|delete|list)(?:\/live-[a-f0-9]{12})?$/.test(route))
      throw err('restream_control_unavailable');
    let reply;
    try{
      reply=await fetchImpl(MTX+route,{method,redirect:'manual',
        signal:AbortSignal.timeout(6500),
        headers:{authorization:auth,accept:'application/json',
          ...(data?{'content-type':'application/json'}:{})},
        ...(data?{body:JSON.stringify(data)}:{})});
    }catch{throw err('restream_control_unavailable')}
    // Path listings grow with operator-created channels. Keep individual
    // mutations tightly bounded, but allow a larger authenticated listing
    // so orphaned FFmpeg workers can always be recovered after deployment.
    const content=await readBoundedJson(reply,
      route==='/v3/config/paths/list'?128*1024:8192);
    if(reply.status===404)return {status:404,body:content};
    if(!reply.ok)throw err('restream_control_unavailable');
    return {status:reply.status,body:content};
  }
  async function prune(){
    if(operation)return;
    for(const [name,row] of [...paths]){
      if(row.connections===0&&clock()-(row.lastUsedAt||row.createdAt)>MAX_IDLE_MS){
        await stop(name).catch(()=>{});
      }
    }
  }
  const idleTimer=setInterval(()=>{void prune().catch(()=>{})},60_000);
  idleTimer.unref?.();
  async function start({sourceId,channelId,backupSourceId,backupChannelId,rightsConfirmed}={}){
    if(!auth||!portal?.configured)return safe({ok:false,code:'restream_not_configured'},503);
    if(rightsConfirmed!==true)return safe({ok:false,code:'stream_rights_confirmation_required'},403);
    if(operation)return safe({ok:false,code:'restream_busy'},429);
    operation=true;
    try{
      // Reuse one FFmpeg/MediaMTX path when the same licensed channel is opened
      // again. Otherwise each start would consume a separate upstream stream.
      const existing=[...paths.values()].find(row=>
        row.sourceId===sourceId&&String(row.channelId)===String(channelId)&&
        (!backupSourceId||row.candidateUrls.length>1));
      if(existing)return safe({ok:true,path:existing.name,title:existing.title,
        sourceId:existing.sourceId,channelId:existing.channelId,
        onDemand:true,backupConfigured:existing.backupConfigured,
        playbackVerified:false,customerTrafficChanged:false,
        reused:true,playlist:'/operator/api/live/'+existing.name+'/index.m3u8'});
      if(paths.size>=maxPaths)return safe({ok:false,code:'restream_capacity_reached'},409);
      const upstream=await portal.liveChannel({sourceId,channelId,rightsConfirmed:true});
      if(upstream.status!==200||upstream.body?.ok!==true)
        return safe({ok:false,code:upstream.body?.code||'restream_source_unavailable'},
          upstream.status>=400&&upstream.status<600?upstream.status:503);
      if(upstream.body.kind!=='live'||upstream.body.extension!=='ts'||typeof upstream.body.sourceUrl!=='string')
        return safe({ok:false,code:'restream_source_invalid'},502);
      try{await assertPublicMediaUrl(upstream.body.sourceUrl,{lookup})}
      catch{return safe({ok:false,code:'restream_source_origin_invalid'},400)}
      const candidates=[upstream.body.sourceUrl];
      if(backupSourceId||backupChannelId){
        if(!backupSourceId||!backupChannelId||
           (backupSourceId===sourceId&&String(backupChannelId)===String(channelId)))
          return safe({ok:false,code:'restream_backup_invalid'},400);
        const secondary=await portal.liveChannel({
          sourceId:backupSourceId,channelId:backupChannelId,rightsConfirmed:true
        });
        if(secondary.status!==200||secondary.body?.ok!==true||
           secondary.body.kind!=='live'||secondary.body.extension!=='ts'||
           typeof secondary.body.sourceUrl!=='string')
          return safe({ok:false,code:'restream_backup_unavailable'},409);
        try{await assertPublicMediaUrl(secondary.body.sourceUrl,{lookup})}
        catch{return safe({ok:false,code:'restream_backup_invalid'},400)}
        if(secondary.body.sourceUrl===upstream.body.sourceUrl)
          return safe({ok:false,code:'restream_backup_duplicate'},400);
        candidates.push(secondary.body.sourceUrl);
      }
      const name='live-'+randomBytes(6).toString('hex'),ticket=randomBytes(24).toString('hex');
      const row={name,ticket,sourceUrl:upstream.body.sourceUrl,
        sourceId:upstream.body.sourceId,channelId:upstream.body.channelId,
        title:String(upstream.body.name||'').slice(0,160),
        createdAt:clock(),lastUsedAt:null,connections:0,lastError:null,lastProbe:null,
        candidateUrls:candidates,preferredIndex:0,failovers:0,backupConfigured:candidates.length>1};
      const config={source:'publisher',runOnDemand:buildCommand(name,ticket),
        runOnDemandRestart:true,runOnDemandStartTimeout:'35s',
        runOnDemandCloseAfter:'15s',maxReaders:maxSharedReaders};
      await mediamtx('POST','/v3/config/paths/add/'+name,config);
      paths.set(name,row);tokens.set(ticket,name);
      return safe({ok:true,path:name,title:row.title,sourceId:row.sourceId,
        channelId:row.channelId,onDemand:true,backupConfigured:row.backupConfigured,
        playbackVerified:false,customerTrafficChanged:false,
        playlist:'/operator/api/live/'+name+'/index.m3u8'},201);
    }catch(e){return safe({ok:false,code:classify(e)},503)}
    finally{operation=false}
  }
  async function stop(name){
    if(!safePath(name))return safe({ok:false,code:'restream_path_not_found'},404);
    const row=paths.get(name);
    if(!row)return safe({ok:false,code:'restream_path_not_found'},404);
    if(operation)return safe({ok:false,code:'restream_busy'},429);
    // Immediately invalidate feed token, even if MTX deletion errors.
    tokens.delete(row.ticket);paths.delete(name);
    try{await mediamtx('DELETE','/v3/config/paths/delete/'+name)}
    catch(e){return safe({ok:false,code:classify(e),feedDisabled:true},503)}
    return safe({ok:true,stopped:true,path:name,customerTrafficChanged:false});
  }
  async function probe(name){
    if(!safePath(name)||!paths.has(name))
      return safe({ok:false,code:'restream_path_not_found'},404);
    const row=paths.get(name);
    if(row.probePending)
      return safe({ok:true,path:name,started:false,probePending:true},202);
    row.probePending=true;
    // The on-demand FFmpeg worker may need more time than a Railway HTTP
    // proxy timeout. Return 202 immediately, then expose the final
    // transport result in the authenticated GET /operator/api/live listing.
    void verifyRestreamSmoke(HLS,{fetchImpl,pathName:name,timeoutMs:48000})
      .then(report=>{
        row.lastProbe={at:clock(),ok:report.ok===true,
          code:String(report.code||'unknown').slice(0,70),
          firstMediaBytesVerified:report.ok===true,
          audioVideoDecoded:false};
      }).catch(()=>{
        row.lastProbe={at:clock(),ok:false,code:'restream_hls_unavailable',
          firstMediaBytesVerified:false,audioVideoDecoded:false};
      }).finally(()=>{row.probePending=false});
    return safe({ok:true,path:name,started:true,probePending:true,
      customerTrafficChanged:false},202);
  }
  function list(){
    return {ok:true,maxPaths,maxSharedReaders,items:[...paths.values()].map(row=>({
      path:row.name,sourceId:row.sourceId,channelId:row.channelId,
      title:row.title,createdAt:row.createdAt,lastUsedAt:row.lastUsedAt,
      connections:row.connections,lastError:row.lastError,lastProbe:row.lastProbe,
      probePending:row.probePending===true,
      onDemand:true,backupConfigured:row.backupConfigured,failovers:row.failovers,
      preferredSource:row.preferredIndex===0?'primary':'backup',
      playlist:'/operator/api/live/'+row.name+'/index.m3u8'
    })),customerTrafficChanged:false};
  }
  async function streamFeed(req,res,token){
    if(req.method!=='GET'||!TICKET.test(token)||!tokens.has(token))
      return response(res,404,{ok:false,code:'restream_feed_not_found'});
    const name=tokens.get(token),row=paths.get(name);
    if(!row)return response(res,410,{ok:false,code:'restream_feed_expired'});
    if(row.connections>=1)return response(res,429,{ok:false,code:'restream_feed_busy'});
    row.connections++;row.lastUsedAt=clock();
    const controllers=new Set();
    let closedByReader=false,startedAt=clock();
    const onClose=()=>{
      if(!res.writableEnded){
        closedByReader=true;
        for(const controller of controllers)controller.abort();
      }
    };
    res.once('close',onClose);
    async function acquire(src){
      const controller=new AbortController();
      controllers.add(controller);
      let upstream,reader;
      try{
        let target=await assertPublicMediaUrl(src,{lookup}),crossOrigin=0;
        for(let hop=0;hop<=3;hop++){
          const timer=setTimeout(()=>controller.abort(),12000);
          try{
            upstream=await fetchImpl(target,{
              method:'GET',redirect:'manual',signal:controller.signal,
              headers:{accept:'video/mp2t,application/octet-stream;q=0.9,*/*;q=0.5',
                'user-agent':'BLOFY-STREAM/1.0','accept-encoding':'identity'}
            });
          }finally{clearTimeout(timer)}
          if(![301,302,303,307,308].includes(upstream.status))break;
          if(hop===3)throw err('restream_provider_redirect_denied');
          const location=upstream.headers.get('location');
          await upstream.body?.cancel().catch(()=>{});
          if(!location)throw err('restream_provider_redirect_denied');
          const next=await assertPublicMediaUrl(new URL(location,target).href,{lookup});
          if(target.protocol==='https:'&&next.protocol==='http:')
            throw err('restream_provider_redirect_denied');
          if(next.origin!==target.origin&&++crossOrigin>1)
            throw err('restream_provider_redirect_denied');
          target=next;
        }
        if(!upstream.ok){
          const status=upstream.status;
          throw err(status===404?'restream_provider_not_found':
            [401,403,429,456].includes(status)?'restream_provider_denied':
              'restream_provider_unavailable');
        }
        if(!upstream.body)throw err('restream_invalid_media');
        const mime=String(upstream.headers.get('content-type')||'').toLowerCase();
        if(/^(text\/|application\/(?:json|xml))/.test(mime))
          throw err('restream_invalid_media');
        reader=upstream.body.getReader();
        let first;
        const timer=setTimeout(()=>controller.abort(),13000);
        try{first=await reader.read()}finally{clearTimeout(timer)}
        if(first.done||!first.value?.byteLength)throw err('restream_invalid_media');
        const leading=Buffer.from(first.value).subarray(0,100).toString('utf8').trimStart();
        if(/^<(!doctype|html)|^\{|^#EXTM3U|^(unauthorized|not found)/i.test(leading))
          throw err('restream_invalid_media');
        return {controller,reader,first};
      }catch(e){
        try{await reader?.cancel?.()}catch{}
        try{reader?.releaseLock?.()}catch{}
        if(upstream?.body&&!upstream.bodyUsed)await upstream.body.cancel().catch(()=>{});
        controllers.delete(controller);controller.abort();
        throw e;
      }
    }
    let active=null,sourceIndex=0;
    try{
      const primary=Number.isInteger(row.preferredIndex)?row.preferredIndex:0;
      const order=[primary,...row.candidateUrls.map((_,i)=>i).filter(i=>i!==primary)];
      let lastError;
      for(const index of order){
        try{
          active=await acquire(row.candidateUrls[index]);
          sourceIndex=index;break;
        }catch(e){lastError=e;if(closedByReader)throw e;}
      }
      if(!active)throw lastError||err('restream_provider_unavailable');
      if(sourceIndex!==row.preferredIndex){
        row.preferredIndex=sourceIndex;row.failovers++;row.lastError='restream_switched_source';
      }
      res.writeHead(200,{'content-type':'video/mp2t','cache-control':'no-store',
        'x-content-type-options':'nosniff'});
      const stream=Readable.from((async function*(){
        yield Buffer.from(active.first.value);
        while(true){
          const next=await active.reader.read();
          if(next.done)return;
          if(next.value?.byteLength)yield Buffer.from(next.value);
        }
      })());
      try{
        await pipeline(stream,res,{signal:active.controller.signal});
        if(!closedByReader&&row.backupConfigured&&sourceIndex===0&&
           clock()-startedAt<10000){
          // Only switch away from a short-lived PRIMARY feed. Once the
          // operator-selected backup takes over, do not bounce to a known-bad source.
          row.preferredIndex=1;
          row.lastError='restream_short_primary_disconnect';
        }else row.lastError=null;
      }finally{
        try{await active.reader.cancel()}catch{}
        try{active.reader.releaseLock()}catch{}
      }
    }catch(e){
      if(!closedByReader){
        row.lastError=classify(e);
        if(row.backupConfigured)
          row.preferredIndex=sourceIndex===0?1:0;
      }
      // A test injection may observe exception classes without ever writing
      // raw upstream URLs, tokens or provider credentials to production logs.
      if(row.lastError==='restream_internal_error'){
        try{onUnexpectedError({name:String(e?.name||'Error'),code:String(e?.code||''),
          message:String(e?.message||'').slice(0,170)})}catch{}
      }
      if(!res.headersSent)
        response(res,502,{ok:false,code:closedByReader?'restream_cancelled':
          row.lastError||'restream_provider_unavailable'});
      else if(!res.destroyed)res.destroy();
    }finally{
      for(const controller of controllers)controller.abort();
      res.off('close',onClose);
      row.connections=Math.max(0,row.connections-1);
      row.lastUsedAt=clock();
    }
  }
  async function proxyHls(req,res,name,file){
    if(req.method!=='GET'||!safePath(name)||!paths.has(name)||!safeFile(file))
      return response(res,404,{ok:false,code:'restream_path_not_found'});
    // The caller must already have passed the operator Basic auth.
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),60000);
    const onClose=()=>{if(!res.writableEnded)controller.abort()};
    res.once('close',onClose);
    try{
      const privateBase=HLS+'/'+name+'/';
      const reply=await fetchImpl(privateBase+file,{redirect:'manual',
        cache:'no-store',signal:controller.signal,
        headers:{accept:'*/*',...(typeof req.headers.range==='string'&&
          /^bytes=\d*-\d*$/.test(req.headers.range)?{range:req.headers.range}:{})}});
      if(!reply.ok||!reply.body)return response(res,502,{ok:false,code:'restream_hls_unavailable'});
      const manifest=file.endsWith('.m3u8');
      if(manifest){
        const raw=await reply.text();
        if(raw.length>192000||!raw.trimStart().startsWith('#EXTM3U'))
          return response(res,502,{ok:false,code:'restream_hls_invalid'});
        let bad=false;
        const rewritten=raw.replace(/^([^#\r\n][^\r\n]*)$/gm,(line)=>{
          let url;try{url=new URL(line,privateBase)}catch{bad=true;return ''};
          const suffix=url.pathname.slice(('/'+name+'/').length);
          if(url.origin!==new URL(HLS).origin||
             !url.pathname.startsWith('/'+name+'/')||!safeFile(suffix)){
            bad=true;return '';
          }
          return '/operator/api/live/'+name+'/'+suffix;
        });
        if(bad)return response(res,502,{ok:false,code:'restream_hls_invalid'});
        const body=Buffer.from(rewritten);
        res.writeHead(200,{'content-type':'application/vnd.apple.mpegurl',
          'cache-control':'no-store','content-length':body.length,
          'x-content-type-options':'nosniff'});
        return res.end(body);
      }
      res.writeHead(reply.status,{'content-type':reply.headers.get('content-type')||
        (file.endsWith('.ts')?'video/mp2t':'application/octet-stream'),
        'cache-control':'no-store','x-content-type-options':'nosniff'});
      await pipeline(Readable.fromWeb(reply.body),res,{signal:controller.signal});
    }catch{
      if(!res.headersSent)return response(res,502,{ok:false,code:'restream_hls_unavailable'});
      if(!res.destroyed)res.destroy();
    }finally{clearTimeout(timeout);res.off('close',onClose);controller.abort();}
  }
  async function recoverOldPaths(){
    if(!auth)return {ok:false,code:'restream_control_unavailable'};
    // Only names in this service's reserved pattern; requires single replica.
    let removed=0;
    try{
      const listing=await mediamtx('GET','/v3/config/paths/list');
      for(const item of listing.body?.items||[]){
        if(safePath(item?.name)&&!paths.has(item.name)){
          await mediamtx('DELETE','/v3/config/paths/delete/'+item.name);
          removed++;
        }
      }
      cleanupAt=clock();
      return {ok:true,removed};
    }catch{return {ok:false,code:'restream_control_unavailable'}}
  }
  return {start,stop,probe,list,streamFeed,proxyHls,recoverOldPaths};
}
