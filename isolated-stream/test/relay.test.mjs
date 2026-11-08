import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createStreamServer} from '../src/server.mjs';
import {assertPublicMediaUrl} from '../src/relay-guard.mjs';

const shared='isolated-relay-test-secret-abcdefghijklmnopqrstuvwxyz123456789';
const ts=Buffer.alloc(188*3,0x11);
for(let i=0;i<ts.length;i+=188)ts[i]=0x47;

async function host(fn,{token=shared,fetchImpl=async()=>new Response(ts,{headers:{'content-type':'video/mp2t','accept-ranges':'bytes'}}),clock,redirectSourceOrigin='',firstByteTimeoutMs=12000}={}){
  const server=createStreamServer({relaySharedToken:token,
    relayRedirectSourceOrigin:redirectSourceOrigin,
    relayFirstByteTimeoutMs:firstByteTimeoutMs,
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
