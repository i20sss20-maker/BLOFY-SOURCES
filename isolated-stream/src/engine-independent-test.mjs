// Independent, locally generated H.264 test media. No provider or customer data.
// Fixture: ffmpeg color=blue:s=96x64:r=2:d=2, libx264, yuv420p, MPEG-TS.
// The finite clip tests public HTTPS delivery and decoding, not live stability.
import {gunzipSync} from 'node:zlib';
const host='engine.blofyplayer.com';
const bytes=gunzipSync(Buffer.from('H4sIAAAAAAAAA9VUzU8TQRSfRQFRCWzxK/EyargQaHfbWkuTTQoNtBcSEhNuuk53Z9u1+9XZLW3VkGo8GP8AjXrhT0AveiHBmxLiwZgIxoNeTLxoOXkxqW8qCdzkJOzs5u2bee/N++W93758VhxG0+1RJLxGqCN0kPC7daoQEfpmZ22PlgauUrZoalSS63dy653DtfJZNIzQymAXOxLaaOz50RcHDWqfKz8P2HtWIl3sX1Ebnefi9OrcwkEj+/fKTyGpfx6h2yeXeN2/INRq9V5A/ZuEbwfaXJam145/OvdMgAYdQV1R2L54k1vK74bewKevt9OZ+zzzffXbVuHlo/FNvHXpx89GPJXEE1hzGcUyqCwhS2mckKk8aUyCoRAFh9jc/Ex+IomnFnLgqVMNDDnXa1rUCHBckhITcSmegMNyEHiZWKxer0cXTZ26FnGieQGJLivFeKZoObAt8HO9wHQdP4M1UiSaImFGDUXGOi1arlZRpAw8mDjEavqU77BNFd0k2K8VQZOw5zfBHaTKdEWOSuACAttmg+oqv4tHqIw4JarIKayVmWsTFUJlHDBqWaYPHulGWtcCULSqDVKnRL/lOlSJy+OyjA3iBypgj3h+xfQgcOeSqqe6huFTHhiUGQT5YLRct0LKsFF3z3wLfuPdAwk7rJtGM20ScCimE1BmEXCC86JVY6Spaq7tkS4oqE/AiOnAFeDICPcxGLEpv6pOzVI58ECr0CaYleSOotqmw3NrFLAnRtF+2OVQrcZTdtPw8jHql3lTNEVjBraLUDNeddgo8URUwlWOUpGiKVA9nrD7JQ0lNQmKH1AP8JgeNADaDP1JQjOrioRawEL64H5GfIh65Ooayq2n0bHet3x9vFbbfa/ns6IY4hkphnhGiiGekcknMPfet5f2xfr/u/ZM7RNXtnen9tRTfGZ5A/geCTHfIyHmeyTEfL8MfBfGPhxyvg8+vruX79m/fB8JMd9HQsz3kRDzPcX5fu/VIef70C9xL99vnF3e+ANzLPti9A0AAA==','base64'));
const playlist=Buffer.from('#EXTM3U\n#EXTINF:2,BLOFY independent video test (2 seconds, no audio)\nhttps://'+host+'/engine/test.ts\n');
const routes=new Map([['/engine/test.m3u',['audio/x-mpegurl; charset=utf-8',playlist]],['/engine/test.ts',['video/mp2t',bytes]]]);
// Clock-derived rolling HLS window. No provider, transcoder or mutable
// per-viewer state. Each reused clip resets MPEG-TS timestamps, so every
// segment boundary explicitly signals a discontinuity.
const SEGMENT_SECONDS=2,WINDOW=6,RETENTION=30;
const EPOCH=Date.UTC(2026,0,1);
function latestSequence(now){return Math.max(WINDOW-1,Math.floor((now-EPOCH)/(SEGMENT_SECONDS*1000))-1);}
export function independentLiveManifest(now=Date.now()){
 const last=latestSequence(now),first=last-WINDOW+1;
 const lines=['#EXTM3U','#EXT-X-VERSION:3','#EXT-X-TARGETDURATION:'+SEGMENT_SECONDS,
  '#EXT-X-MEDIA-SEQUENCE:'+first,'#EXT-X-DISCONTINUITY-SEQUENCE:'+first,
  '#EXT-X-INDEPENDENT-SEGMENTS'];
 for(let seq=first;seq<=last;seq++){
  if(seq!==first)lines.push('#EXT-X-DISCONTINUITY');
  lines.push('#EXTINF:2.000,','seg-'+seq+'.ts');
 }
 return Buffer.from(lines.join('\n')+'\n');
}
const liveEntry=Buffer.from('#EXTM3U\n#EXTINF:-1,BLOFY continuous independent HLS test (silent)\nhttps://'+host+'/engine/live/index.m3u8\n');
export function handleIndependentEngineTest(req,res,{now=Date.now}={}){
 if(String(req.headers.host||'').toLowerCase().replace(/:443$/,'')!==host)return false;
 let route=routes.get(req.url),cache='public, max-age=300',status=200;
 if(req.url==='/engine/live.m3u')route=['audio/x-mpegurl; charset=utf-8',liveEntry];
 if(req.url==='/engine/live/index.m3u8'){
  route=['application/vnd.apple.mpegurl; charset=utf-8',independentLiveManifest(now())];
  cache='no-store';
 }
 const segment=/^\/engine\/live\/seg-([0-9]{1,12})\.ts$/.exec(req.url||'');
 if(segment){
  const seq=Number(segment[1]),last=latestSequence(now());
  if(seq>last||seq<Math.max(0,last-RETENTION+1)){
   status=404;cache='no-store';route=['text/plain; charset=utf-8',Buffer.from('Segment outside test window')];
  }else{
   cache='public, max-age=60, immutable';route=['video/mp2t',bytes];
  }
 }
 if(!route)return false;
 const head={'cache-control':cache,'x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{...head,allow:'GET, HEAD'});res.end();return true;}
 res.writeHead(status,{...head,'content-type':route[0],'content-length':route[1].length});
 res.end(req.method==='HEAD'?undefined:route[1]);return true;
}
