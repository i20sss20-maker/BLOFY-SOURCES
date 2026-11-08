// Operator-only VOD first-party preview. One-time source resolution is
// authenticated server-to-server, and only randomized handles reach the HTML.
// The browser never learns the upstream Xtream host, username or password.
import {randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {assertPublicMediaUrl} from './relay-guard.mjs';
const TTL=25*60*1000,MAX=8,TOKEN=/^[0-9a-f]{48}$/;
const TYPES=new Set(['movie','episode']);
const CONTENT={
  mp4:'video/mp4',m4v:'video/mp4',mov:'video/quicktime',
  webm:'video/webm',mkv:'video/x-matroska',avi:'video/x-msvideo',ts:'video/mp2t'
};
function respond(res,status,data){
  const bytes=Buffer.from(JSON.stringify(data));
  res.writeHead(status,{'content-type':'application/json',
    'cache-control':'no-store','x-content-type-options':'nosniff',
    'content-length':bytes.length});
  res.end(bytes);
}
function classify(error){
  return ['vod_upstream_not_found','vod_upstream_denied','vod_upstream_unavailable',
    'vod_invalid_media','vod_invalid_redirect','vod_upstream_timeout',
    'vod_preview_expired'].includes(error?.message)?error.message:'vod_transport_unavailable';
}
export function createVodPreviewBroker({portal,fetchImpl=fetch,lookup,clock=Date.now}={}){
  const tickets=new Map();
  function clean(){
    for(const [token,row] of tickets){
      if(row.expiresAt<=clock())tickets.delete(token);
    }
  }
  const cleaner=setInterval(clean,60000);cleaner.unref?.();
  async function create({sourceId,itemId,type,rightsConfirmed}={}){
    if(!portal?.configured)return {status:503,body:{ok:false,code:'vod_bridge_not_ready'}};
    if(rightsConfirmed!==true)return {status:403,body:{ok:false,code:'stream_rights_confirmation_required'}};
    if(!TYPES.has(type))return {status:400,body:{ok:false,code:'vod_type_invalid'}};
    clean();
    if(tickets.size>=MAX)return {status:429,body:{ok:false,code:'vod_preview_limit_reached'}};
    const found=await portal.vodItem({sourceId,itemId,type,rightsConfirmed:true});
    if(found.status!==200||found.body?.ok!==true)
      return {status:found.status,body:{ok:false,code:found.body?.code||'vod_source_unavailable'}};
    const item=found.body;
    if(item.type!==type||typeof item.sourceUrl!=='string'||!CONTENT[item.extension])
      return {status:502,body:{ok:false,code:'vod_media_type_not_supported'}};
    try{await assertPublicMediaUrl(item.sourceUrl,{lookup})}
    catch{return {status:400,body:{ok:false,code:'vod_origin_invalid'}}}
    const token=randomBytes(24).toString('hex');
    tickets.set(token,{sourceUrl:item.sourceUrl,type,title:String(item.title||'').slice(0,160),
      extension:item.extension,sourceId:item.sourceId,itemId:item.itemId,
      expiresAt:clock()+TTL,lastError:null});
    return {status:201,body:{ok:true,token,type,title:String(item.title||'').slice(0,160),
      extension:item.extension,expiresAt:clock()+TTL,
      browserPlayable:['mp4','m4v','mov','webm'].includes(item.extension),
      playerUrl:'/operator/api/vod/'+token,customerTrafficChanged:false}};
  }
  function list(){
    clean();
    return {ok:true,maxSessions:MAX,items:[...tickets].map(([token,row])=>({
      token,title:row.title,type:row.type,extension:row.extension,
      expiresAt:row.expiresAt,lastError:row.lastError,
      playerUrl:'/operator/api/vod/'+token
    }))};
  }
  async function open(url,method,range,signal){
    let target=await assertPublicMediaUrl(url,{lookup});
    let moved=0;const origin=target.origin;
    for(let i=0;i<4;i++){
      const response=await fetchImpl(target,{method,redirect:'manual',signal,
        headers:{accept:'*/*','accept-encoding':'identity',
          'user-agent':'BLOFY-STREAM-VOD/1.0',...(range?{range}:{})}});
      if(![301,302,303,307,308].includes(response.status))return response;
      const location=response.headers.get('location');
      await response.body?.cancel().catch(()=>{});
      if(!location||i===3)throw Error('vod_invalid_redirect');
      const next=await assertPublicMediaUrl(new URL(location,target).href,{lookup});
      if(target.protocol==='https:'&&next.protocol==='http:')throw Error('vod_invalid_redirect');
      if(next.origin!==origin&&++moved>1)throw Error('vod_invalid_redirect');
      target=next;
    }
    throw Error('vod_invalid_redirect');
  }
  async function play(req,res,token){
    clean();
    const row=TOKEN.test(token)?tickets.get(token):null;
    if(!row)return respond(res,404,{ok:false,code:'vod_preview_expired'});
    if(!['GET','HEAD'].includes(req.method))
      return respond(res,405,{ok:false,code:'vod_method_not_allowed'});
    const range=typeof req.headers.range==='string'&&/^bytes=\d*-\d*$/.test(req.headers.range)?
      req.headers.range:null;
    const controller=new AbortController();
    const onClose=()=>{if(!res.writableEnded)controller.abort()};
    res.once('close',onClose);
    let upstream;
    try{
      const timer=setTimeout(()=>controller.abort(),13000);
      try{
        upstream=await open(row.sourceUrl,req.method,range,controller.signal);
        // Some Xtream movie endpoints incorrectly return 404/416 for the
        // initial bytes=0- request. Retry exactly once with a plain GET.
        if(req.method==='GET'&&range&&/^bytes=0-(?:[0-9]*)$/.test(range)&&
            [404,416].includes(upstream.status)){
          await upstream.body?.cancel().catch(()=>{});
          upstream=await open(row.sourceUrl,'GET',null,controller.signal);
        }
      }finally{clearTimeout(timer)}
      if(!upstream.ok){
        const code=upstream.status===404?'vod_upstream_not_found':
          [401,403,429,456].includes(upstream.status)?'vod_upstream_denied':
            'vod_upstream_unavailable';
        throw Error(code);
      }
      const mime=String(upstream.headers.get('content-type')||'').toLowerCase();
      if(/^(text\/|application\/(?:json|xml|xhtml))/.test(mime))
        throw Error('vod_invalid_media');
      const responseHeaders={'content-type':mime&&mime!=='application/octet-stream'?mime:CONTENT[row.extension],
        'cache-control':'no-store','x-content-type-options':'nosniff'};
      for(const key of ['content-length','content-range','accept-ranges']){
        const value=upstream.headers.get(key);
        if(value)responseHeaders[key]=value;
      }
      if(req.method==='HEAD'){
        res.writeHead(upstream.status,responseHeaders);
        await upstream.body?.cancel().catch(()=>{});
        return res.end();
      }
      if(!upstream.body)throw Error('vod_invalid_media');
      const reader=upstream.body.getReader();
      let first;
      const timeout=setTimeout(()=>controller.abort(),13000);
      try{first=await reader.read()}finally{clearTimeout(timeout)}
      if(first.done||!first.value?.byteLength)throw Error('vod_invalid_media');
      const lead=Buffer.from(first.value).subarray(0,140).toString('utf8').trimStart();
      if(/^<(!doctype|html)|^\{|^#EXTM3U|^(unauthorized|not found|access denied)/i.test(lead))
        throw Error('vod_invalid_media');
      res.writeHead(upstream.status,responseHeaders);
      const readable=Readable.from((async function*(){
        yield Buffer.from(first.value);
        while(true){
          const next=await reader.read();if(next.done)return;
          if(next.value?.byteLength)yield Buffer.from(next.value);
        }
      })());
      try{await pipeline(readable,res,{signal:controller.signal})}
      finally{try{await reader.cancel()}catch{}try{reader.releaseLock()}catch{}}
      row.lastError=null;
    }catch(e){
      if(!res.headersSent){
        row.lastError=classify(e);
        respond(res,502,{ok:false,code:row.lastError});
      }else if(!res.destroyed)res.destroy();
    }finally{
      res.off('close',onClose);controller.abort();
      if(upstream?.body&&!upstream.bodyUsed)await upstream.body.cancel().catch(()=>{});
    }
  }
  return {create,list,play};
}
