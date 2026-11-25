// Read-only M3U pilot: reuse authoritative BLOFY authentication and catalog.
// Does not accept a user-selected origin, open provider media connections,
// provision subscriptions, or change existing connect/relay routes.
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const HOST='engine.blofyplayer.com';
const GATEWAY='https://blofy-activation-portal-production.up.railway.app';
const MAX_BYTES=64*1024*1024;
const headers={'cache-control':'no-store, private','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
function reply(res,status,message,extra={}){
  if(res.destroyed)return;
  res.writeHead(status,{...headers,'content-type':'text/plain; charset=utf-8',...extra});
  res.end(message);
}
export function createEngineM3uPilot({fetchImpl=fetch,enabled=false,maxConcurrent=4,timeoutMs=90000}={}){
  let active=0;
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
    if(active>=maxConcurrent)return reply(res,429,'Playlist pilot busy',{'retry-after':'5'});
    active++;
    const controller=new AbortController();
    const stop=()=>controller.abort();
    req.once('aborted',stop);res.once('close',stop);
    const timer=setTimeout(stop,timeoutMs);timer.unref?.();
    try{
      const target=new URL('/get.php',GATEWAY);
      target.search=new URLSearchParams({username,password,type:'m3u_plus',output:'ts'}).toString();
      const upstream=await fetchImpl(target,{method:'GET',redirect:'manual',signal:controller.signal,
        cache:'no-store',headers:{accept:'audio/x-mpegurl, application/x-mpegurl','accept-encoding':'identity'}});
      if(upstream.status!==200||!upstream.body||
        !/^(audio\/x-mpegurl|application\/(x-mpegurl|vnd\.apple\.mpegurl))(?:\s*;|$)/i.test(upstream.headers.get('content-type')||'')){
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
      // Intentionally keep original authorized media URLs: no cutover yet.
      res.writeHead(200,{...headers,'content-type':'audio/x-mpegurl; charset=utf-8',
        'content-disposition':'inline; filename="blofy.m3u"'});
      await pipeline(Readable.fromWeb(upstream.body),cap,res);
    }catch{
      if(!res.destroyed&&!res.headersSent)reply(res,503,'Playlist unavailable',{'retry-after':'5'});
      else if(!res.destroyed)res.destroy();
    }finally{
      clearTimeout(timer);stop();req.off('aborted',stop);res.off('close',stop);active--;
    }
  }
  return {handle(req,res){
    if(String(req.headers.host||'').toLowerCase().replace(/:443$/,'')!==HOST)return false;
    let url;try{url=new URL(req.url||'/','http://localhost')}catch{return false}
    if(url.pathname!=='/get.php')return false;
    void serve(req,res,url);return true;
  }};
}
