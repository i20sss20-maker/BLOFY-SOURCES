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
const MAX_PATHS=3,MAX_AGE_MS=75*60*1000;
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
  maxPaths=MAX_PATHS
}={}){
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
    const content=await readBoundedJson(reply);
    if(reply.status===404)return {status:404,body:content};
    if(!reply.ok)throw err('restream_control_unavailable');
    return {status:reply.status,body:content};
  }
  async function prune(){
    for(const [name,row] of [...paths]){
      if(clock()-row.createdAt>MAX_AGE_MS){
        await stop(name).catch(()=>{});
      }
    }
  }
  async function start({sourceId,channelId,rightsConfirmed}={}){
    if(!auth||!portal?.configured)return safe({ok:false,code:'restream_not_configured'},503);
    if(rightsConfirmed!==true)return safe({ok:false,code:'stream_rights_confirmation_required'},403);
    if(operation)return safe({ok:false,code:'restream_busy'},429);
    operation=true;
    try{
      await prune();
      if(paths.size>=maxPaths)return safe({ok:false,code:'restream_capacity_reached'},409);
      const upstream=await portal.liveChannel({sourceId,channelId,rightsConfirmed:true});
      if(upstream.status!==200||upstream.body?.ok!==true)
        return safe({ok:false,code:upstream.body?.code||'restream_source_unavailable'},
          upstream.status>=400&&upstream.status<600?upstream.status:503);
      if(upstream.body.kind!=='live'||upstream.body.extension!=='ts'||typeof upstream.body.sourceUrl!=='string')
        return safe({ok:false,code:'restream_source_invalid'},502);
      try{await assertPublicMediaUrl(upstream.body.sourceUrl,{lookup})}
      catch{return safe({ok:false,code:'restream_source_origin_invalid'},400)}
      const name='live-'+randomBytes(6).toString('hex'),ticket=randomBytes(24).toString('hex');
      const row={name,ticket,sourceUrl:upstream.body.sourceUrl,
        sourceId:upstream.body.sourceId,channelId:upstream.body.channelId,
        title:String(upstream.body.name||'').slice(0,160),
        createdAt:clock(),lastUsedAt:null,connections:0,lastError:null,lastProbe:null};
      const config={source:'publisher',runOnDemand:buildCommand(name,ticket),
        runOnDemandRestart:true,runOnDemandStartTimeout:'35s',
        runOnDemandCloseAfter:'15s',maxReaders:3};
      await mediamtx('POST','/v3/config/paths/add/'+name,config);
      paths.set(name,row);tokens.set(ticket,name);
      return safe({ok:true,path:name,title:row.title,sourceId:row.sourceId,
        channelId:row.channelId,onDemand:true,
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
    let report;
    try{
      report=await verifyRestreamSmoke(HLS,{fetchImpl,pathName:name,timeoutMs:21000});
    }catch{report={ok:false,code:'restream_hls_unavailable'}}
    row.lastProbe={at:clock(),ok:report.ok===true,code:String(report.code||'unknown').slice(0,70),
      firstMediaBytesVerified:report.ok===true};
    return safe({ok:report.ok===true,path:name,...row.lastProbe,
      audioVideoDecoded:false,customerTrafficChanged:false},report.ok?200:503);
  }
  function list(){
    return {ok:true,maxPaths,items:[...paths.values()].map(row=>({
      path:row.name,sourceId:row.sourceId,channelId:row.channelId,
      title:row.title,createdAt:row.createdAt,lastUsedAt:row.lastUsedAt,
      connections:row.connections,lastError:row.lastError,lastProbe:row.lastProbe,
      onDemand:true,playlist:'/operator/api/live/'+row.name+'/index.m3u8'
    })),customerTrafficChanged:false};
  }
  async function streamFeed(req,res,token){
    if(req.method!=='GET'||!TICKET.test(token)||!tokens.has(token))
      return response(res,404,{ok:false,code:'restream_feed_not_found'});
    const name=tokens.get(token),row=paths.get(name);
    if(!row||clock()-row.createdAt>MAX_AGE_MS)
      return response(res,410,{ok:false,code:'restream_feed_expired'});
    if(row.connections>=1)
      return response(res,429,{ok:false,code:'restream_feed_busy'});
    row.connections++;row.lastUsedAt=clock();
    const controller=new AbortController();
    const onClose=()=>{if(!res.writableEnded)controller.abort()};
    res.once('close',onClose);
    let upstream;
    try{
      let target=await assertPublicMediaUrl(row.sourceUrl,{lookup});
      let redirects=0,crossOrigin=0;
      for(let i=0;i<4;i++){
        const headerTimer=setTimeout(()=>controller.abort(),12000);
        try{
          upstream=await fetchImpl(target,{method:'GET',redirect:'manual',
            headers:{accept:'video/mp2t,application/octet-stream;q=0.9,*/*;q=0.5',
              'user-agent':'BLOFY-STREAM/1.0','accept-encoding':'identity'},
            signal:controller.signal
          });
        }finally{clearTimeout(headerTimer)}
        if([301,302,303,307,308].includes(upstream.status)){
          if(i>=3)throw err('restream_provider_redirect_denied');
          const location=upstream.headers.get('location');
          await upstream.body?.cancel().catch(()=>{});
          if(!location)throw err('restream_provider_redirect_denied');
          const next=await assertPublicMediaUrl(new URL(location,target).href,{lookup});
          if(target.protocol==='https:'&&next.protocol==='http:')
            throw err('restream_provider_redirect_denied');
          if(next.origin!==target.origin&&++crossOrigin>1)
            throw err('restream_provider_redirect_denied');
          target=next;redirects++;continue;
        }
        break;
      }
      if(!upstream.ok){
        const status=upstream.status;
        await upstream.body?.cancel().catch(()=>{});
        throw err(status===404?'restream_provider_not_found':
          [401,403,429,456].includes(status)?'restream_provider_denied':'restream_provider_unavailable');
      }
      if(!upstream.body)throw err('restream_invalid_media');
      const mime=String(upstream.headers.get('content-type')||'').toLowerCase();
      if(/^(text\/|application\/(?:json|xml))/.test(mime))
        throw err('restream_invalid_media');
      const reader=upstream.body.getReader();
      let first;
      const timer=setTimeout(()=>controller.abort(),13000);
      try{first=await reader.read()}finally{clearTimeout(timer)}
      if(first.done||!first.value||!first.value.byteLength)throw err('restream_invalid_media');
      const begin=Buffer.from(first.value).subarray(0,100).toString('utf8').trimStart();
      if(/^<(!doctype|html)|^\{|^#EXTM3U|^(unauthorized|not found)/i.test(begin))
        throw err('restream_invalid_media');
      res.writeHead(200,{'content-type':'video/mp2t','cache-control':'no-store',
        'x-content-type-options':'nosniff'});
      const stream=Readable.from((async function*(){
        yield Buffer.from(first.value);
        while(true){const next=await reader.read();if(next.done)return;
          if(next.value?.byteLength)yield Buffer.from(next.value);}
      })());
      try{await pipeline(stream,res,{signal:controller.signal})}
      finally{try{await reader.cancel()}catch{}try{reader.releaseLock()}catch{}}
      row.lastError=null;
    }catch(e){
      row.lastError=classify(e);
      if(!res.headersSent)response(res,502,{ok:false,code:row.lastError});
      else if(!res.destroyed)res.destroy();
    }finally{
      controller.abort();res.off('close',onClose);row.connections=Math.max(0,row.connections-1);
      if(upstream?.body&&!upstream.bodyUsed)
        await upstream.body.cancel().catch(()=>{});
    }
  }
  async function proxyHls(req,res,name,file){
    if(req.method!=='GET'||!safePath(name)||!paths.has(name)||!safeFile(file))
      return response(res,404,{ok:false,code:'restream_path_not_found'});
    // The caller must already have passed the operator Basic auth.
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),22000);
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
