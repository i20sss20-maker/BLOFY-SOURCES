import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaControlClient} from '../src/mediamtx-private-control.mjs';

const origin='http://blofy-stream-media.railway.internal:9997';
const password='valid-long-secret-for-private-control-api-000001';
const auth='Basic '+Buffer.from('blofy-control:'+password).toString('base64');
function reply(status,content){
  return new Response(content===undefined?'':JSON.stringify(content),{
    status,headers:{'content-type':'application/json'}
  });
}
test('private MediaMTX control fails closed without configuration',async()=>{
  const client=createMediaControlClient();
  assert.equal(client.enabled,false);
  const overview=await client.overview();
  assert.equal(overview.readyPaths,null);
  assert.equal((await client.demoAction('start')).status,503);
});
test('MediaMTX overview is real and redacts provider URLs and passwords',async()=>{
  const seen=[];
  const fetchImpl=async(url,opt)=>{
    seen.push({url:String(url),authorization:opt.headers.authorization});
    if(String(url).endsWith('/v3/info'))return reply(200,{version:'1.19.2'});
    if(String(url).endsWith('/v3/paths/list'))return reply(200,{
      items:[{name:'smoke',ready:true,readers:[{}],source:{url:'http://secret.example/live?pass=secret'}},
        {name:'blofy-demo',ready:false,readers:[]}],
      itemCount:2
    });
    if(String(url).endsWith('/v3/hls/sessions/list'))return reply(200,{items:[{path:'smoke'}],itemCount:1});
    if(String(url).endsWith('/v3/config/paths/get/blofy-demo'))return reply(200,{source:'rtsp://127.0.0.1:8554/smoke'});
    throw Error('unexpected operation');
  };
  const client=createMediaControlClient({fetchImpl,username:'blofy-control',password});
  const state=await client.overview();
  assert.equal(state.online,true);
  assert.equal(state.readyPaths,1);
  assert.equal(state.hlsSessions,1);
  assert.deepEqual(state.paths.map(x=>x.name),['smoke','blofy-demo']);
  assert.deepEqual(state.paths.map(x=>x.hlsViewers),[0,0]);
  assert.equal(JSON.stringify(state).includes('secret'),false);
  assert.ok(seen.every(x=>x.url.startsWith(origin+'/v3/')&&x.authorization===auth));
  assert.equal(state.customerTrafficEnabled,false);
});
test('start, stop and restart only dedicated demo path',async()=>{
  let exists=false,time=10000;
  const received=[];
  const fetchImpl=async(url,opt)=>{
    received.push({url:String(url),method:opt.method,data:opt.body});
    if(String(url).endsWith('/v3/config/paths/get/blofy-demo'))
      return exists?reply(200,{source:'rtsp://127.0.0.1:8554/smoke'}):reply(404,{error:'not found'});
    if(String(url).endsWith('/v3/config/paths/add/blofy-demo')&&opt.method==='POST'){
      const value=JSON.parse(opt.body);
      assert.equal(value.source,'rtsp://127.0.0.1:8554/smoke');
      assert.equal(value.sourceOnDemand,true);
      exists=true;return reply(200,{});
    }
    if(String(url).endsWith('/v3/config/paths/delete/blofy-demo')&&opt.method==='DELETE'){
      exists=false;return reply(200,{});
    }
    throw Error('unexpected path '+url);
  };
  const client=createMediaControlClient({fetchImpl,username:'blofy-control',password,clock:()=>time});
  assert.equal((await client.demoAction('start')).body.ok,true);
  assert.equal(exists,true);
  assert.equal((await client.demoAction('start')).status,429);
  time+=4000;
  assert.equal((await client.demoAction('restart')).body.ok,true);
  assert.equal(exists,true);
  time+=4000;
  assert.equal((await client.demoAction('stop')).body.ok,true);
  assert.equal(exists,false);
  assert.ok(received.every(x=>x.url.startsWith(origin+'/v3/config/paths/')));
  assert.ok(received.every(x=>!x.data||!x.data.includes('annkel')));
});
test('media API auth failure does not produce invented counters',async()=>{
  const client=createMediaControlClient({
    fetchImpl:async()=>reply(401,{error:'no'}),username:'blofy-control',password
  });
  const info=await client.overview();
  assert.equal(info.online,false);
  assert.equal(info.readyPaths,null);
  assert.equal(info.diagnostics,'mediamtx_auth_failed');
  assert.equal((await client.demoAction('start')).status,503);
});

test('per-path HLS viewer counts are aggregated without exposing IDs or tokens',async()=>{
  const fetchImpl=async url=>{
    if(String(url).endsWith('/v3/info'))return reply(200,{version:'1.19.2'});
    if(String(url).endsWith('/v3/paths/list'))return reply(200,{
      items:[{name:'live-abcdef123456',ready:true,readers:[{}]},
        {name:'live-abcdef123457',ready:true,readers:[]}],itemCount:2
    });
    if(String(url).endsWith('/v3/hls/sessions/list'))return reply(200,{
      items:[
        {path:'live-abcdef123456',id:'sensitive-session-one',remoteAddr:'127.0.0.1'},
        {pathName:'live-abcdef123456',id:'sensitive-session-two'},
        {path:'live-abcdef123457',id:'sensitive-session-three'}
      ],itemCount:3
    });
    throw Error('unexpected path');
  };
  const state=await createMediaControlClient({
    fetchImpl,username:'blofy-control',password
  }).overview();
  assert.equal(state.hlsSessions,3);
  assert.deepEqual(state.paths.map(x=>x.hlsViewers),[2,1]);
  assert.equal(JSON.stringify(state).includes('sensitive-session'),false);
  assert.equal(JSON.stringify(state).includes('remoteAddr'),false);
});

test('unlabeled sessions do not produce misleading per-channel zeroes',async()=>{
  const fetchImpl=async url=>{
    if(String(url).endsWith('/v3/info'))return reply(200,{version:'1.19.2'});
    if(String(url).endsWith('/v3/paths/list'))return reply(200,{
      items:[{name:'live-abcdef123456',ready:true,readers:[]}],itemCount:1
    });
    if(String(url).endsWith('/v3/hls/sessions/list'))return reply(200,{
      items:[{id:'no-path-data'}],itemCount:1
    });
    throw Error('unexpected');
  };
  const state=await createMediaControlClient({
    fetchImpl,username:'blofy-control',password
  }).overview();
  assert.equal(state.hlsSessions,1);
  assert.equal(state.paths[0].hlsViewers,null);
});
