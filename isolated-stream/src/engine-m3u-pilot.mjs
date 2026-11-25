// Read-only M3U pilot: reuse authoritative BLOFY authentication and catalog.
// Does not accept a user-selected origin, open provider media connections,
// provision subscriptions, or change existing connect/relay routes.
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {assertPublicMediaUrl} from './relay-guard.mjs';
const HOST='engine.blofyplayer.com';
const GATEWAY='https://blofy-activation-portal-production.up.railway.app';
const MAX_BYTES=64*1024*1024;
const headers={'cache-control':'no-store, private','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
function reply(res,status,message,extra={}){
  if(res.destroyed)return;
  res.writeHead(status,{...headers,'content-type':'text/plain; charset=utf-8',...extra});
  res.end(message);
}
// The provider route is explicitly selected: never retry a BLOFY password
// against a third party. Only an operator-configured HTTPS origin and one
// approved test username are accepted. No automatic enrollment.
export function createEngineM3uPilot({fetchImpl=fetch,enabled=false,maxConcurrent=4,timeoutMs=90000,
  providerOrigin='',providerUsername='',validateProvider=assertPublicMediaUrl}={}){
  let pinned=null;
  try{
    const u=new URL(providerOrigin);
    if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'&&
       u.hostname.includes('.')&&u.hostname!==HOST&&u.origin!==GATEWAY&&
       !/(^|\.)blofyplayer\.com$/i.test(u.hostname))pinned=u.origin;
  }catch{}
  let active=0,providerActive=false,providerLast=0;
  async function serve(req,res,url){
    if(!enabled)return reply(res,503,'M3U pilot disabled');
    if(req.method!=='GET')return reply(res,405,'Method not allowed',{allow:'GET'});
    if(String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()!=='https'&&!req.socket?.encrypted)
      return reply(res,400,'Use HTTPS for playlist credentials');
    // Never forward arbitrary parameters, duplicate credentials or credentials
    // to a second host. The old gateway owns all entitlement decisions.
    const q=url.searchParams;
    const username=q.get('username')||'',password=q.get('password')||'';
    if(q.getAll('username').length!==1||q.getAll('password').length!==1||
      !username||!password||username.length>128||password.length>256||
      /[\x00-\x1f\x7f]/.test(username+password))
      return reply(res,400,'Missing or invalid BLOFY credentials');
    const selected=q.get('provider');
    if(q.getAll('provider').length>1||(selected!==null&&selected!=='8k'))
      return reply(res,400,'Invalid provider selection');
    const provider=selected==='8k';
    if(provider&&(!pinned||!providerUsername))return reply(res,503,'Provider pilot not configured');
    if(provider&&username!==providerUsername)return reply(res,401,'Unauthorized');
    if(active>=maxConcurrent||(provider&&(providerActive||Date.now()-providerLast<15000)))
      return reply(res,429,'Playlist pilot busy',{'retry-after':'15'});
    active++;
    if(provider){providerActive=true;providerLast=Date.now();}
    const controller=new AbortController();
    const stop=()=>controller.abort();
    req.once('aborted',stop);res.once('close',stop);
    const timer=setTimeout(stop,timeoutMs);timer.unref?.();
    try{
      const target=new URL('/get.php',provider?pinned:GATEWAY);
      if(provider){
        const checked=await validateProvider(target.href);
        if(checked.origin!==pinned||controller.signal.aborted)
          return reply(res,503,'Provider unavailable');
      }
      target.search=new URLSearchParams({username,password,type:'m3u_plus',output:'ts'}).toString();
      const upstream=await fetchImpl(target,{method:'GET',redirect:'manual',signal:controller.signal,
        cache:'no-store',headers:{accept:'audio/x-mpegurl, application/x-mpegurl','accept-encoding':'identity'}});
      if(upstream.status!==200||!upstream.body||
        !/^(audio\/x-mpegurl|application\/(x-mpegurl|vnd\.apple\.mpegurl|octet-stream))(?:\s*;|$)/i.test(upstream.headers.get('content-type')||'')){
        void upstream.body?.cancel().catch(()=>{});
        const status=[401,403,429,503].includes(upstream.status)?upstream.status:502;
        return reply(res,status,status===401||status===403?'Unauthorized':'Playlist unavailable',
          status===429||status===503?{'retry-after':'5'}:{});
      }
      if(Number(upstream.headers.get('content-length')||0)>MAX_BYTES){
        void upstream.body.cancel().catch(()=>{});return reply(res,502,'Playlist too large');
      }
      let bytes=0;
      const cap=new Transform({transform(chunk,_encoding,done){
        bytes+=chunk.length;
        done(bytes>MAX_BYTES?Error('playlist_limit'):null,chunk);
      }});
      // Validate playlist magic before sending a provider response. Bound the
      // first read and never publish a provider HTML/login/error document.
      let stream=Readable.fromWeb(upstream.body);
      if(provider){
        const iterator=stream[Symbol.asyncIterator]();
        const head=[];let size=0;
        while(size<7){
          const part=await iterator.next();if(part.done)break;
          head.push(Buffer.from(part.value));size+=part.value.length;
          if(size>MAX_BYTES){await iterator.return?.();return reply(res,502,'Playlist too large');}
        }
        if(!/^\s*#EXTM3U(?:\s|$)/.test(Buffer.concat(head).subarray(0,128).toString('utf8'))){
          await iterator.return?.();return reply(res,401,'Provider playlist not authorized');
        }
        stream=Readable.from((async function*(){try{yield* head;for(;;){const part=await iterator.next();if(part.done)break;yield part.value;}}finally{await iterator.return?.();}})());
      }
      // Intentionally keep original authorized media URLs: no cutover yet.
      res.writeHead(200,{...headers,'content-type':'audio/x-mpegurl; charset=utf-8',
        'content-disposition':'inline; filename="blofy.m3u"'});
      await pipeline(stream,cap,res);
    }catch{
      if(!res.destroyed&&!res.headersSent)reply(res,503,'Playlist unavailable',{'retry-after':'5'});
      else if(!res.destroyed)res.destroy();
    }finally{
      clearTimeout(timer);stop();req.off('aborted',stop);res.off('close',stop);active--;if(provider)providerActive=false;
    }
  }
  return {handle(req,res){
    if(String(req.headers.host||'').toLowerCase().replace(/:443$/,'')!==HOST)return false;
    let url;try{url=new URL(req.url||'/','http://localhost')}catch{return false}
    if(url.pathname!=='/get.php')return false;
    void serve(req,res,url);return true;
  }};
}
