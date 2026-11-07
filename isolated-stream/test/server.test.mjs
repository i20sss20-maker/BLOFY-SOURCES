import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createStreamServer} from '../src/server.mjs';

const baseOpts={engineUrl:'http://blofy-stream-media.railway.internal:8888',runBootCanary:false};
async function withApp(handler){
  const {app}=createStreamServer({...baseOpts,port:3000});
  app.listen(0,'127.0.0.1');
  await once(app,'listening');
  const origin='http://127.0.0.1:'+app.address().port;
  try{await handler(origin)}finally{app.closeAllConnections();await new Promise(resolve=>app.close(resolve));}
}
test('standalone /health claims only isolated API, never real playback or subscriber migration',async()=>{
  await withApp(async url=>{
    const r=await fetch(url+'/health');
    assert.equal(r.status,200);
    const j=await r.json();
    assert.equal(j.service,'BLOFY-STREAM');
    assert.equal(j.customerTrafficEnabled,false);
    assert.equal(j.xtreamAccountMigrationComplete,false);
    assert.equal(j.realSourceVerified,false);
    assert.equal(r.headers.get('cache-control'),'no-store');
  });
});
test('no public proxy, client login, M3U or account admin can accidentally run',async()=>{
  await withApp(async url=>{
    for(const p of ['/player_api.php','/get.php','/live/demo/x/7.ts',
      '/admin','/stream','/internal/smoke']){
      const r=await fetch(url+p);
      assert.equal(r.status,404,p);
    }
    const r=await fetch(url+'/internal/smoke',{method:'POST'});
    assert.equal(r.status,401);
  });
});
test('unconfigured media health never claims success',async()=>{
  await withApp(async url=>{
    const r=await fetch(url+'/health/media');
    assert.equal(r.status,503);
    const j=await r.json();
    assert.equal(j.ok,false);
  });
});
test('reject cross-project/other origins by construction',()=>{
  assert.throws(()=>createStreamServer({...baseOpts,engineUrl:'http://blofy-restream-engine.railway.internal:8888'}),
    /blofy_stream_media_origin_not_private_peer/);
  assert.throws(()=>createStreamServer({...baseOpts,engineUrl:'https://outside.example'}),
    /blofy_restream_engine_invalid_private_url/);
});

test('public transport fixture is tiny, static, nonsensitive and not mistaken for decoded A/V',async()=>{
  await withApp(async url=>{
    const response=await fetch(url+'/synthetic/transport.ts');
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'video/mp2t');
    assert.equal(response.headers.get('cache-control'),'no-store');
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length,564);
    for(const offset of [0,188,376])assert.equal(bytes[offset],0x47);
  });
});
