import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createLiveRestreamSupervisor} from '../src/live-restream-supervisor.mjs';

const password='private-control-password-with-over-32-characters';
const UUID='550e8400-e29b-41d4-a716-446655440000';
const sourceUrl='https://provider.example/live/user/secret-password/88.ts';
const mediaName=/\/v3\/config\/paths\/(?:add|delete)\/(live-[a-f0-9]{12})/;
function createFixture({maxPaths=3,failPrimary=false,hlsIndex='#EXTM3U\n#EXTINF:2.0,\nseg1.ts\n'}={}){
  const calls=[],portal={configured:true,
    liveChannel:async ({rightsConfirmed,sourceId})=>({
      status:200,body:{ok:true,kind:'live',extension:'ts',
        sourceUrl:sourceId===UUID?sourceUrl:'https://backup.example/live/user/pwd/99.ts',
        sourceId,channelId:sourceId===UUID?'88':'99',name:'News',rightsConfirmed}
    })
  };
  const ts=Buffer.alloc(188*3);for(let i=0;i<3;i++)ts[i*188]=0x47;
  const fetchImpl=async (url,options={})=>{
    const target=String(url);
    calls.push({url:target,method:options.method||'GET',body:options.body});
    if(target.includes(':9997/'))return new Response(
      target.endsWith('paths/list')?JSON.stringify({items:[]}):'{}',
      {status:200,headers:{'content-type':'application/json'}}
    );
    if(target.includes(':8888/')){
      return new Response(target.endsWith('.m3u8')?hlsIndex:ts,
        {status:200,headers:{'content-type':target.endsWith('.m3u8')?
          'application/vnd.apple.mpegurl':'video/mp2t'}})
    }
    if(target.startsWith('https://provider.example/'))
      return new Response(failPrimary?'Not Found':ts,{status:failPrimary?404:200,
        headers:{'content-type':failPrimary?'text/plain':'video/mp2t'}});
    if(target.startsWith('https://backup.example/'))
      return new Response(ts,{status:200,headers:{'content-type':'video/mp2t'}});
    throw Error('unexpected fetch: '+target);
  };
  const unexpected=[];
  const service=createLiveRestreamSupervisor({portal,fetchImpl,
    mediaPassword:password,maxPaths,onUnexpectedError:e=>unexpected.push(e),
    lookup:async()=>[{address:'8.8.8.8',family:4}]});
  return {service,calls,ts,portal,unexpected};
}
const row=()=>({sourceId:UUID,channelId:'88',rightsConfirmed:true});
test('real live start requires explicit redistribution rights confirmation',async()=>{
  const {service,calls}=createFixture();
  const denied=await service.start({...row(),rightsConfirmed:false});
  assert.equal(denied.status,403);
  assert.equal(calls.length,0);
});
test('operator starts only server-resolved channel and creates secret-free MediaMTX HLS path',async()=>{
  const {service,calls}=createFixture({maxPaths:1});
  const start=await service.start(row());
  assert.equal(start.status,201);
  assert.match(start.body.path,/^live-[a-f0-9]{12}$/);
  const config=calls.find(x=>mediaName.test(x.url)&&x.method==='POST');
  assert.ok(config);
  const body=JSON.parse(config.body);
  assert.equal(body.source,'publisher');
  assert.equal(body.runOnDemandRestart,true);
  assert.equal(body.runOnDemand.includes('sourceUrl'),false);
  assert.equal(body.runOnDemand.includes('secret-password'),false);
  assert.ok(body.runOnDemand.includes('/internal/live-feed/'));
  assert.equal(start.body.playlist.endsWith('/index.m3u8'),true);
  assert.equal(JSON.stringify(start.body).includes('provider.example'),false);
  const reused=await service.start(row());
  assert.equal(reused.status,200);
  assert.equal(reused.body.reused,true);
  assert.equal(reused.body.path,start.body.path);
  assert.equal(calls.filter(x=>x.method==='POST'&&mediaName.test(x.url)).length,1);
  assert.equal(service.list().items.length,1);
  const stopped=await service.stop(start.body.path);
  assert.equal(stopped.status,200);
  assert.equal(service.list().items.length,0);
  assert.ok(calls.some(x=>x.method==='DELETE'&&x.url.includes(start.body.path)));
});
test('shared live path permits 256 readers while keeping one upstream path',async()=>{
  const {service,calls}=createFixture();
  const first=await service.start(row());
  assert.equal(first.status,201);
  const second=await service.start(row());
  assert.equal(second.body.reused,true);
  assert.equal(service.list().items.length,1);
  assert.equal(service.list().maxSharedReaders,256);
  const config=JSON.parse(calls.find(x=>x.method==='POST'&&mediaName.test(x.url)).body);
  assert.equal(config.maxReaders,256);
  assert.equal(calls.filter(x=>x.method==='POST'&&mediaName.test(x.url)).length,1);
});

test('invalid shared reader capacity is rejected before control-plane changes',()=>{
  assert.throws(()=>createLiveRestreamSupervisor({maxSharedReaders:2049}),
    /restream_shared_readers_invalid/);
});

test('HLS playlist is rewritten to protected operator URL, rejects external references',async()=>{
  const {service,portal}=createFixture();
  const s=(await service.start(row())).body;
  async function call(method,file){
    const server=http.createServer((req,res)=>service.proxyHls(req,res,s.path,file));
    server.listen(0,'127.0.0.1');await once(server,'listening');
    try{
      const reply=await fetch('http://127.0.0.1:'+server.address().port+'/p',{method});
      return {status:reply.status,body:await reply.text()};
    }finally{await new Promise(resolve=>server.close(resolve))}
  }
  const playlist=await call('GET','index.m3u8');
  assert.equal(playlist.status,200);
  assert.ok(playlist.body.includes('/operator/api/live/'+s.path+'/seg1.ts'));
  assert.equal((await call('GET','../../unsafe.m3u8')).status,404);
  assert.equal((await call('POST','index.m3u8')).status,404);
  portal.configured=false;
});
test('invalid live IDs cannot mutate MediaMTX paths',async()=>{
  const {service,calls}=createFixture();
  assert.equal((await service.stop('smoke')).status,404);
  assert.equal((await service.probe('../admin')).status,404);
  assert.equal(calls.length,0);
});
test('real transport feed is private-token scoped and carries TS bytes only',async()=>{
  const {service,calls,ts,unexpected}=createFixture();
  const s=(await service.start(row())).body;
  const cmd=JSON.parse(calls.find(x=>x.method==='POST').body).runOnDemand;
  const token=cmd.match(/\/internal\/live-feed\/([a-f0-9]{48})/)[1];
  const server=http.createServer((req,res)=>{
    const match=/^\/internal\/live-feed\/([0-9a-f]{48})$/.exec(req.url);
    service.streamFeed(req,res,match?.[1]||'');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const reply=await fetch('http://127.0.0.1:'+server.address().port+
      '/internal/live-feed/'+token);
    const body=Buffer.from(await reply.arrayBuffer());
    assert.equal(reply.status,200,body.toString('utf8').slice(0,240)+' '+JSON.stringify(unexpected));
    assert.equal(body.byteLength,ts.byteLength);
    const meta=service.list().items[0].mediaTracks;
    assert.ok(meta.inspectedBytes>=ts.byteLength);
    assert.equal(meta.decodedAudio,false);
    assert.equal(meta.hasAudioStream,false);
    assert.equal(meta.status,'waiting-for-pat',
      'without PAT/PMT, do not mistake missing metadata for confirmed silent audio');
    assert.doesNotMatch(JSON.stringify(meta),/provider.example|password|secret/i);
  }finally{await new Promise(resolve=>server.close(resolve))}
  assert.equal((await service.stop(s.path)).status,200);
});

test('explicit backup live channel takes over when primary returns provider 404',async()=>{
  const {service,calls,ts}=createFixture({failPrimary:true});
  const b=await service.start({...row(),backupSourceId:'550e8400-e29b-41d4-a716-446655440001',
    backupChannelId:'99'});
  assert.equal(b.status,201);
  assert.equal(b.body.backupConfigured,true);
  const cmd=JSON.parse(calls.find(x=>x.method==='POST').body).runOnDemand;
  const token=cmd.match(new RegExp('/internal/live-feed/([a-f0-9]{48})'))[1];
  const server=http.createServer((req,res)=>service.streamFeed(req,res,token));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const reply=await fetch('http://127.0.0.1:'+server.address().port+'/internal/live-feed/'+token);
    assert.equal(reply.status,200);
    assert.equal((await reply.arrayBuffer()).byteLength,ts.length);
  }finally{await new Promise(resolve=>server.close(resolve))}
  const live=service.list().items[0];
  assert.equal(live.preferredSource,'backup');
  assert.equal(live.failovers,1);
  assert.ok(calls.some(x=>x.url.startsWith('https://backup.example/')));
  assert.equal(JSON.stringify(live).includes('secret-password'),false);
});

test('operator-only HTTP EOF recovery is opt-in and bounded without forwarding provider credentials',async()=>{
 const {calls,portal}=createFixture();
 const sourceSettings=[];
 const fetchImpl=async(url,options={})=>{
  if(String(url).includes(':9997/')&&options.method==='POST'){
   sourceSettings.push(JSON.parse(options.body));
  }
  if(String(url).includes(':9997/'))
   return new Response('{}',{status:200,headers:{'content-type':'application/json'}});
  throw Error('network not expected');
 };
 const experimental=createLiveRestreamSupervisor({portal,fetchImpl,
  httpEofReconnect:true,mediaPassword:password,
  lookup:async()=>[{address:'8.8.8.8',family:4}]});
 const response=await experimental.start(row());
 assert.equal(response.status,201);
 assert.equal(sourceSettings.length,1);
 const command=sourceSettings[0].runOnDemand;
 assert.match(command,/ -reconnect_at_eof 1 /);
 assert.match(command,/ -reconnect_on_network_error 1 /);
 assert.match(command,/ -reconnect_on_http_error 500,502,503,504 /);
 assert.match(command,/ -reconnect_max_retries 3 /);
 assert.match(command,/ -reconnect_delay_total_max 12 /);
 assert.match(command,/reconnect_on_http_error 500,502,503,504/);
 assert.doesNotMatch(command,/provider.example|secret-password|sourceUrl/);
 assert.ok(command.includes('/internal/live-feed/'));
 const standard=createLiveRestreamSupervisor({portal,fetchImpl,mediaPassword:password,
  lookup:async()=>[{address:'8.8.8.8',family:4}]});
 const other=await standard.start(row());
 assert.equal(other.status,201);
 assert.doesNotMatch(sourceSettings[1].runOnDemand,/reconnect_at_eof/);
 assert.equal(response.body.customerTrafficChanged,false);
});
