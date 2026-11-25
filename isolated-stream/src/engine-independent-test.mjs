// Independent, locally generated H.264 test media. No provider or customer data.
// Fixture: ffmpeg color=blue:s=96x64:r=2:d=2, libx264, yuv420p, MPEG-TS.
// The finite clip tests public HTTPS delivery and decoding, not live stability.
import {gunzipSync} from 'node:zlib';
const host='engine.blofyplayer.com';
const bytes=gunzipSync(Buffer.from('H4sIAAAAAAAAA9VUzU8TQRSfRQFRCWzxK/EyargQaHfbWkuTTQoNtBcSEhNuuk53Z9u1+9XZLW3VkGo8GP8AjXrhT0AveiHBmxLiwZgIxoNeTLxoOXkxqW8qCdzkJOzs5u2bee/N++W93758VhxG0+1RJLxGqCN0kPC7daoQEfpmZ22PlgauUrZoalSS63dy653DtfJZNIzQymAXOxLaaOz50RcHDWqfKz8P2HtWIl3sX1Ebnefi9OrcwkEj+/fKTyGpfx6h2yeXeN2/INRq9V5A/ZuEbwfaXJam145/OvdMgAYdQV1R2L54k1vK74bewKevt9OZ+zzzffXbVuHlo/FNvHXpx89GPJXEE1hzGcUyqCwhS2mckKk8aUyCoRAFh9jc/Ex+IomnFnLgqVMNDDnXa1rUCHBckhITcSmegMNyEHiZWKxer0cXTZ26FnGieQGJLivFeKZoObAt8HO9wHQdP4M1UiSaImFGDUXGOi1arlZRpAw8mDjEavqU77BNFd0k2K8VQZOw5zfBHaTKdEWOSuACAttmg+oqv4tHqIw4JarIKayVmWsTFUJlHDBqWaYPHulGWtcCULSqDVKnRL/lOlSJy+OyjA3iBypgj3h+xfQgcOeSqqe6huFTHhiUGQT5YLRct0LKsFF3z3wLfuPdAwk7rJtGM20ScCimE1BmEXCC86JVY6Spaq7tkS4oqE/AiOnAFeDICPcxGLEpv6pOzVI58ECr0CaYleSOotqmw3NrFLAnRtF+2OVQrcZTdtPw8jHql3lTNEVjBraLUDNeddgo8URUwlWOUpGiKVA9nrD7JQ0lNQmKH1AP8JgeNADaDP1JQjOrioRawEL64H5GfIh65Ooayq2n0bHet3x9vFbbfa/ns6IY4hkphnhGiiGekcknMPfet5f2xfr/u/ZM7RNXtnen9tRTfGZ5A/geCTHfIyHmeyTEfL8MfBfGPhxyvg8+vruX79m/fB8JMd9HQsz3kRDzPcX5fu/VIef70C9xL99vnF3e+ANzLPti9A0AAA==','base64'));
const playlist=Buffer.from('#EXTM3U\n#EXTINF:2,BLOFY independent video test (2 seconds, no audio)\nhttps://'+host+'/engine/test.ts\n');
const routes=new Map([['/engine/test.m3u',['audio/x-mpegurl; charset=utf-8',playlist]],['/engine/test.ts',['video/mp2t',bytes]]]);
export function handleIndependentEngineTest(req,res){
 if(String(req.headers.host||'').toLowerCase().replace(/:443$/,'')!==host)return false;
 const route=routes.get(req.url);
 if(!route)return false;
 const head={'cache-control':'public, max-age=300','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{...head,allow:'GET, HEAD'});res.end();return true;}
 res.writeHead(200,{...head,'content-type':route[0],'content-length':route[1].length});
 res.end(req.method==='HEAD'?undefined:route[1]);return true;
}
