import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createStreamServer} from '../src/server.mjs';
import {assertPublicMediaUrl} from '../src/relay-guard.mjs';
import {createRelayBroker} from '../src/relay-broker.mjs';

const shared='isolated-relay-test-secret-abcdefghijklmnopqrstuvwxyz123456789';
const ts=Buffer.alloc(188*3,0x11);
for(let i=0;i<ts.length;i+=188)ts[i]=0x47;

async function host(fn,{token=shared,fetchImpl=async()=>new Response(ts,{headers:{'content-type':'video/mp2t','accept-ranges':'bytes'}}),clock,redirectSourceOrigin='',firstByteTimeoutMs=12000,sharedLiveEnabled=false}={}){
  const server=createStreamServer({relaySharedToken:token,
    relayRedirectSourceOrigin:redirectSourceOrigin,
    relayFirstByteTimeoutMs:firstByteTimeoutMs,
    sharedLiveEnabled,
    relayFetchImpl:fetchImpl,
    relayLookup:async()=>[{address:'93.184.216.34',family:4}],
    fetchImpl:async()=>{throw new Error('mock only')},
    port:3000,runBootCanary:false});
  server.app.listen(0,'127.0.0.1');await once(server.app,'listening');
  const origin='http://127.0.0.1:'+server.app.address().port;
  try{await fn(origin)}finally{
    server.app.closeAllConnections();
    await new Promise(resolve=>server.app.close(resolve));
  }
}
async function issue(base,body={kind:'live',sourceUrl:'https://allowed.example/live/u/p/3.ts'},token=shared){
  return fetch(base+'/internal/relay-grants',{method:'POST',
    headers:{authorization:'Bearer '+token,'content-type':'application/json'},
    body:JSON.stringify(body)});
}
test('relay grant path is opaque, short-lived and does not expose provider credentials',async()=>{
  const calls=[];
  await host(async origin=>{
    const granted=await issue(origin);
    assert.equal(granted.status,201);
    const j=await granted.json();
    assert.equal(j.ok,true);
    assert.match(j.path,/^\/relay\/[0-9a-f]{48}$/);
    assert.doesNotMatch(JSON.stringify(j),/allowed\.example|\/u\/p\/|BLOFY_STREAM/);
    const result=await fetch(origin+j.path,{headers:{Range:'bytes=30-'}});
    assert.equal(result.status,200);
    assert.equal(result.headers.get('content-type'),'video/mp2t');
    assert.deepEqual(Buffer.from(await result.arrayBuffer()),ts);
    assert.equal(result.headers.get('cache-control'),'no-store');
    assert.equal(calls.length,1);
    assert.equal(calls[0].headers.range,'bytes=30-');
    assert.equal(calls[0].headers.cookie,undefined);
  },{fetchImpl:async(url,opts)=>{
    calls.push({path:url.pathname,headers:opts.headers});
    return new Response(ts,{headers:{'content-type':'video/mp2t'}});
  }});
});
test('issue endpoint requires service-to-service secret; no token means disabled',async()=>{
  await host(async origin=>{
    const attempt=await issue(origin,undefined,'incorrect');
    assert.equal(attempt.status,401);
    assert.equal((await attempt.json()).code,'relay_issuer_unauthorized');
  });
  await host(async origin=>{
    const attempt=await issue(origin);
    assert.equal(attempt.status,503);
    const health=await fetch(origin+'/health').then(r=>r.json());
    assert.equal(health.relayCapabilityReady,false);
  },{token:''});
});
test('provider URLs and player-controlled arbitrary URL are never accepted',async()=>{
  let calls=0;
  await host(async origin=>{
    for(const url of ['http://127.0.0.1:3000/x.ts','http://169.254.169.254/metadata',
      'http://10.0.0.1/play','http://blofy-stream-media.railway.internal:8888/smoke/seg.ts',
      'file:///etc/passwd','https://localhost:443/private',
      'http://allowed.example/player\nuser=abc']){
      const res=await issue(origin,{kind:'live',sourceUrl:url});
      assert.equal(res.status,400,url);
    }
    const unknown=await fetch(origin+'/relay/'+('a'.repeat(48))+'?url=http://localhost/');
    assert.equal(unknown.status,410);
    assert.equal(calls,0);
  },{fetchImpl:async()=>{calls++;return new Response(ts)}});
});
test('provider HTML/HLS denials cannot be passed as video',async()=>{
  await host(async origin=>{
    const a=await issue(origin);
    const g=await a.json();
    const r=await fetch(origin+g.path);
    assert.equal(r.status,502);
    assert.equal((await r.json()).code,'relay_not_playable_media');
  },{fetchImpl:async()=>new Response('#EXTM3U\n#EXTINF:-1\nhttps://outside.example/x.ts')});
});
test('reader does not follow cross-origin 302 and cannot leak a source credential',async()=>{
  let calls=0;
  await host(async origin=>{
    const granted=await issue(origin);
    const j=await granted.json();
    const resp=await fetch(origin+j.path);
    assert.equal(resp.status,502);
    assert.equal(calls,1);
    const body=await resp.text();
    assert.doesNotMatch(body,/u\/p|allowed\.example|private\.example/);
  },{fetchImpl:async()=>{
    calls++;return new Response(null,{status:302,headers:{location:'http://private.example/secure'}});
  }});
});
test('HEAD responds without copying upstream body; canary never changes old subscriber routes',async()=>{
  let lastMethod='';
  await host(async origin=>{
    const granted=await issue(origin,{kind:'movie',sourceUrl:'https://allowed.example/movie/u/p/7.mp4'});
    const j=await granted.json();
    const resp=await fetch(origin+j.path,{method:'HEAD'});
    assert.equal(resp.status,206);
    assert.equal(lastMethod,'HEAD');
    assert.equal(resp.headers.get('content-range'),'bytes 0-99/100');
    assert.equal(resp.headers.get('cache-control'),'no-store');
    const nonexistent=await fetch(origin+'/player_api.php');
    assert.equal(nonexistent.status,404);
  },{fetchImpl:async(_url,opts)=>{
    lastMethod=opts.method;
    return new Response(null,{status:206,headers:{'content-range':'bytes 0-99/100'}});
  }});
});
test('isolated relay rejects private DNS answers even for valid public hostnames',async()=>{
  await assert.rejects(assertPublicMediaUrl('https://provider.example/video.ts',
    {lookup:async()=>[{address:'192.168.1.2',family:4}]}),/relay_private_origin/);
  await assert.rejects(assertPublicMediaUrl('https://provider.example/video.ts',
    {lookup:async()=>[{address:'8.8.8.8',family:4},{address:'10.0.0.1',family:4}]}),
    /relay_private_origin/);
});

test('cross-project bridge health checks bearer without source data',async()=>{
  await host(async origin=>{
    const denied=await fetch(origin+'/internal/relay-health');
    assert.equal(denied.status,401);
    const ok=await fetch(origin+'/internal/relay-health',
      {headers:{authorization:'Bearer '+shared}});
    assert.equal(ok.status,200);
    const body=await ok.json();
    assert.equal(body.role,'media_plane');
    assert.equal(body.customerTrafficEnabled,false);
    assert.equal(body.relayReady,true);
    assert.doesNotMatch(JSON.stringify(body),/token|secret|sourceUrl/);
  });
});

test('provider-issued public CDN redirect is followed ONLY for an explicit approved source origin',async()=>{
  const visited=[];
  await host(async origin=>{
    const issued=await issue(origin,{kind:'live',
      sourceUrl:'http://annkel.com/live/account/password/42.ts'});
    assert.equal(issued.status,201);
    const {path}=await issued.json();
    const response=await fetch(origin+path);
    assert.equal(response.status,200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),ts);
    assert.equal(visited.length,2);
    assert.equal(visited[0].host,'annkel.com');
    assert.equal(visited[1].host,'cdn.example');
    assert.equal(visited[1].headers.authorization,undefined);
    assert.equal(visited[1].headers.cookie,undefined);
    assert.equal(visited[1].headers.referer,undefined);
  },{
    redirectSourceOrigin:'http://annkel.com',
    fetchImpl:async(url,opts)=>{
      visited.push({host:url.hostname,headers:opts.headers});
      if(visited.length===1)
        return new Response(null,{status:302,headers:{location:'https://cdn.example/authorized/42.ts'}});
      return new Response(ts,{status:200,headers:{'content-type':'video/mp2t'}});
    }
  });
});
test('unrelated providers cannot use approved cross-origin policy',async()=>{
  let calls=0;
  await host(async origin=>{
    const created=await issue(origin,{kind:'live',sourceUrl:'http://other.example/live/u/p/42.ts'});
    const {path}=await created.json();
    const res=await fetch(origin+path);
    assert.equal(res.status,502);
    assert.equal((await res.json()).code,'relay_redirect_denied');
    assert.equal(calls,1);
  },{
    redirectSourceOrigin:'http://annkel.com',
    fetchImpl:async()=>{
      calls++;
      return new Response(null,{status:302,headers:{location:'https://cdn.example/item.ts'}});
    }
  });
});
test('SSRF guard denies private redirect destination even for allowlisted source',async()=>{
  let calls=0;
  await host(async origin=>{
    const created=await issue(origin,{kind:'live',sourceUrl:'http://annkel.com/live/u/p/42.ts'});
    const {path}=await created.json();
    const res=await fetch(origin+path);
    assert.equal(res.status,502);
    assert.equal((await res.json()).code,'relay_private_origin');
    assert.equal(calls,1);
  },{
    redirectSourceOrigin:'http://annkel.com',
    fetchImpl:async()=>{
      calls++;return new Response(null,{status:302,
        headers:{location:'http://169.254.169.254/metadata'}});
    }
  });
});
test('bounded CDN policy prevents chains spanning two additional public origins',async()=>{
  let calls=0;
  await host(async origin=>{
    const created=await issue(origin,{kind:'live',sourceUrl:'http://annkel.com/live/u/p/42.ts'});
    const {path}=await created.json();
    const res=await fetch(origin+path);
    assert.equal(res.status,502);
    assert.equal((await res.json()).code,'relay_redirect_denied');
    assert.equal(calls,2);
  },{
    redirectSourceOrigin:'http://annkel.com',
    fetchImpl:async()=>{
      calls++;
      const host=calls===1?'cdn-a.example':'cdn-b.example';
      return new Response(null,{status:302,headers:{location:'https://'+host+'/media.ts'}});
    }
  });
});

test('HTTP 200 with stalled first media byte returns a bounded sanitized 502',async()=>{
  let aborted=false;
  await host(async origin=>{
    const created=await issue(origin);
    const {path}=await created.json();
    const res=await fetch(origin+path);
    assert.equal(res.status,502);
    const body=await res.json();
    assert.equal(body.code,'relay_first_byte_timeout');
    assert.equal(aborted,true);
    assert.equal(JSON.stringify(body).includes('allowed.example'),false);
    assert.equal(JSON.stringify(body).includes('/u/p/'),false);
  },{firstByteTimeoutMs:35,fetchImpl:async(_url,opts)=>{
    const stream=new ReadableStream({start(controller){
      opts.signal.addEventListener('abort',()=>{
        aborted=true;
        controller.error(new Error('upstream aborted'));
      },{once:true});
    }});
    return new Response(stream,{status:200,headers:{'content-type':'video/mp2t'}});
  }});
});

test('confirmed provider 404 is distinguished from generic 502 without leaking provider URL',async()=>{
  await host(async origin=>{
    const created=await issue(origin);
    const {path}=await created.json();
    const res=await fetch(origin+path);
    assert.equal(res.status,502);
    const body=await res.json();
    assert.equal(body.code,'relay_provider_not_found');
    assert.equal(body.upstreamStatus,404);
    assert.equal(JSON.stringify(body).includes('allowed.example'),false);
    assert.equal(JSON.stringify(body).includes('/u/p/'),false);
  },{fetchImpl:async()=>new Response('Not found',{status:404})});
});
test('other provider failures retain bounded generic classification',async()=>{
  await host(async origin=>{
    const created=await issue(origin);
    const {path}=await created.json();
    const res=await fetch(origin+path);
    assert.equal(res.status,502);
    const body=await res.json();
    assert.equal(body.code,'relay_provider_unavailable');
    assert.equal(body.upstreamStatus,503);
  },{fetchImpl:async()=>new Response('Unavailable',{status:503})});
});

test('first-byte movie Range 404 retries once as a plain GET and streams valid media',async()=>{
  const visited=[];
  await host(async origin=>{
    const issued=await issue(origin,{kind:'movie',sourceUrl:'https://allowed.example/movie/u/p/7.mp4'});
    const {path}=await issued.json();
    const response=await fetch(origin+path,{headers:{range:'bytes=0-1023','if-range':'etag'}});
    assert.equal(response.status,200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),ts);
    assert.deepEqual(visited.map(x=>x.range),['bytes=0-1023',undefined]);
    assert.equal(visited[1].ifRange,undefined);
  },{fetchImpl:async(_url,opts)=>{
    visited.push({range:opts.headers.range,ifRange:opts.headers['if-range']});
    return visited.length===1?new Response('range unsupported',{status:404}):
      new Response(ts,{status:200,headers:{'content-type':'video/mp2t'}});
  }});
});
test('first-byte episode Range 416 gets one bounded plain GET',async()=>{
  let calls=0;
  await host(async origin=>{
    const issued=await issue(origin,{kind:'series',sourceUrl:'https://allowed.example/series/u/p/7.mp4'});
    const {path}=await issued.json();
    const response=await fetch(origin+path,{headers:{range:'bytes=0-2047'}});
    assert.equal(response.status,200);
    assert.equal(calls,2);
  },{fetchImpl:async(_url,opts)=>{
    calls++;
    if(calls===1)return new Response('bad range',{status:416});
    assert.equal(opts.headers.range,undefined);
    return new Response(ts,{status:200,headers:{'content-type':'video/mp2t'}});
  }});
});
test('confirmed 404 remains 404 when plain GET also fails; never retry indefinitely',async()=>{
  let calls=0;
  await host(async origin=>{
    const issued=await issue(origin,{kind:'movie',sourceUrl:'https://allowed.example/movie/u/p/7.mp4'});
    const {path}=await issued.json();
    const response=await fetch(origin+path,{headers:{range:'bytes=0-1023'}});
    assert.equal(response.status,502);
    assert.equal((await response.json()).code,'relay_provider_not_found');
    assert.equal(calls,2);
  },{fetchImpl:async()=>{calls++;return new Response('missing',{status:404})}});
});
test('seek, live and provider denials never use Range bypass',async()=>{
 for(const [kind,range,status] of [
  ['movie','bytes=500-1000',404],['live','bytes=0-1023',404],
  ['movie','bytes=0-1023',403],['movie','bytes=0-1023',456]
 ]){
  let calls=0;
  await host(async origin=>{
    const sourceUrl='https://allowed.example/'+(kind==='live'?'live':'movie')+'/u/p/7.ts';
    const issued=await issue(origin,{kind,sourceUrl});
    const {path}=await issued.json();
    const response=await fetch(origin+path,{headers:{range}});
    assert.equal(response.status,502);
    assert.equal(calls,1,kind+' '+range+' '+status);
  },{fetchImpl:async()=>{calls++;return new Response('denied',{status})}});
 }
});

test('ten independent authorized relay grants share a single TS source and tolerate viewer exits',async()=>{
  let upstreamCalls=0,controller,ticker;
  const upstream=new ReadableStream({
    start(c){
      controller=c;
      ticker=setInterval(()=>{try{c.enqueue(new Uint8Array(ts))}catch{}},20);
    },
    cancel(){clearInterval(ticker)}
  });
  try{
    await host(async origin=>{
      const grants=await Promise.all(Array.from({length:10},()=>issue(origin,{
        kind:'live',sourceUrl:'https://allowed.example/live/u/p/3.ts',sharedLive:true
      })));
      assert.ok(grants.every(g=>g.status===201));
      const issued=await Promise.all(grants.map(g=>g.json()));
      assert.equal(new Set(issued.map(g=>g.path)).size,10,
        'each subscriber has a distinct limited capability');
      const responses=await Promise.all(issued.map(g=>fetch(origin+g.path)));
      assert.ok(responses.every(r=>r.status===200));
      const readers=responses.map(r=>r.body.getReader());
      const first=await Promise.all(readers.map(r=>r.read()));
      assert.ok(first.every(x=>!x.done&&x.value.length>=188));
      assert.equal(upstreamCalls,1,'one source session for ten separate grants');
      await readers[0].cancel();
      const remaining=await Promise.all(readers.slice(1).map(r=>r.read()));
      assert.ok(remaining.every(x=>!x.done&&x.value.length>=188),
        'disconnecting one viewer must not disconnect remaining viewers');
      assert.equal(upstreamCalls,1);
      await Promise.all(readers.slice(1).map(r=>r.cancel().catch(()=>{})));
    },{sharedLiveEnabled:true,fetchImpl:async()=>{
      upstreamCalls++;
      return new Response(upstream,{headers:{'content-type':'video/mp2t'}});
    }});
  }finally{
    clearInterval(ticker);
    try{await controller?.close()}catch{}
  }
});

test('bridge issuance throttles authenticated floods without revealing any secret',async()=>{
  const {createServer}=await import('node:http');
  const broker=createRelayBroker({
    sharedToken:shared,maxTickets:8,maxIssuesPerSecond:2,maxIssuesPerMinute:3,
    lookup:async()=>[{address:'93.184.216.34',family:4}]
  });
  const server=createServer((req,res)=>void broker.issue(req,res));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  try{
    for(let i=0;i<2;i++)assert.equal((await issue(origin)).status,201);
    const flood=await issue(origin);
    assert.equal(flood.status,429);
    assert.equal(flood.headers.get('retry-after'),'1');
    assert.equal((await flood.json()).code,'relay_issuer_rate_limited');
    const stats=broker.stats();
    assert.equal(stats.security.grantsIssued,2);
    assert.equal(stats.security.issuanceThrottled,1);
    assert.doesNotMatch(JSON.stringify(stats),/allowed.example|password|account/);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});
test('invalid bearer flood never spends the valid bridge issuance quota',async()=>{
  const {createServer}=await import('node:http');
  const broker=createRelayBroker({
    sharedToken:shared,maxIssuesPerSecond:1,maxIssuesPerMinute:2,
    lookup:async()=>[{address:'93.184.216.34',family:4}]
  });
  const server=createServer((req,res)=>void broker.issue(req,res));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  try{
    for(let i=0;i<15;i++)assert.equal((await issue(origin,undefined,'wrong')).status,401);
    assert.equal((await issue(origin)).status,201);
    assert.equal(broker.stats().security.issuerAuthDenied,15);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});
test('full ticket capacity rejects new grants without revoking existing viewer token',async()=>{
  const {createServer}=await import('node:http');
  const broker=createRelayBroker({
    sharedToken:shared,maxTickets:1,
    lookup:async()=>[{address:'93.184.216.34',family:4}],
    fetchImpl:async()=>new Response(ts,{headers:{'content-type':'video/mp2t'}})
  });
  const server=createServer((req,res)=>{
    if(req.url?.startsWith('/internal/relay-grants'))void broker.issue(req,res);
    else void broker.relay(req,res);
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin='http://127.0.0.1:'+server.address().port;
  try{
    const first=await issue(origin);
    assert.equal(first.status,201);
    const token=await first.json();
    const second=await issue(origin);
    assert.equal(second.status,429);
    assert.equal((await second.json()).code,'relay_grant_capacity_reached');
    const media=await fetch(origin+token.path);
    assert.equal(media.status,200);
    assert.deepEqual(Buffer.from(await media.arrayBuffer()),ts);
    assert.equal(broker.stats().security.capacityRejected,1);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});
