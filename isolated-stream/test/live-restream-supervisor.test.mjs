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
    const observed=service.list().items[0];
    const meta=observed.mediaTracks;
    assert.ok(Number.isSafeInteger(observed.trackInspectedAt)&&
      observed.trackInspectedAt>0,'track sample must have an actual transfer timestamp');
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

test('AAC audio compatibility is never enabled without explicit operator consent',async()=>{
 const {service,calls}=createFixture();
 const missing=await service.start({...row(),audioMode:'aac'});
 assert.equal(missing.status,403);
 assert.equal(missing.body.code,'restream_audio_transcode_confirmation_required');
 assert.equal(calls.length,0);
 const bad=await service.start({...row(),audioMode:'shell;secret',audioTranscodeConfirmed:true});
 assert.equal(bad.status,400);
 assert.equal(calls.length,0);
});
test('AAC compat path converts audio only and never changes customer streams',async()=>{
 const {service,calls}=createFixture();
 const started=await service.start({...row(),audioMode:'aac',audioTranscodeConfirmed:true});
 assert.equal(started.status,201);
 assert.equal(started.body.audioMode,'aac');
 assert.equal(started.body.customerTrafficChanged,false);
 const settings=JSON.parse(calls.find(x=>x.method==='POST'&&mediaName.test(x.url)).body);
 const cmd=settings.runOnDemand;
 assert.match(cmd,/ -map 0:v:0\? -map 0:a:0\? -c:v copy -c:a aac -b:a 128k -ac 2 -ar 48000 /);
 assert.doesNotMatch(cmd,/provider\.example|secret-password|sourceUrl|bash -c/);
 assert.equal(service.list().items[0].audioMode,'aac');
 const same=await service.start({...row(),audioMode:'aac',audioTranscodeConfirmed:true});
 assert.equal(same.status,200);
 assert.equal(same.body.reused,true);
 assert.equal(calls.filter(x=>x.method==='POST'&&mediaName.test(x.url)).length,1);
 const conflict=await service.start({...row(),audioMode:'copy'});
 assert.equal(conflict.status,409,'a second source connection is never created');
 assert.equal(conflict.body.code,'restream_duplicate_source_options');
 assert.equal(calls.filter(x=>x.method==='POST'&&mediaName.test(x.url)).length,1);
 const another=await service.start({...row(),channelId:'999',audioMode:'aac',
  audioTranscodeConfirmed:true});
 assert.equal(another.status,429);
 assert.equal(another.body.code,'restream_audio_transcode_capacity_reached');
});
test('standard operator mode remains a bitwise pass-through without AAC encoding',async()=>{
 const {service,calls}=createFixture();
 const started=await service.start(row());
 assert.equal(started.status,201);
 assert.equal(started.body.audioMode,'copy');
 const cmd=JSON.parse(calls.find(x=>x.method==='POST'&&mediaName.test(x.url)).body).runOnDemand;
 assert.match(cmd,/ -map 0:v:0\? -map 0:a:0\? -c copy -f rtsp /);
 assert.doesNotMatch(cmd,/-c:a aac|-ac 2/);
 assert.equal(service.list().items[0].audioMode,'copy');
});


test('manual passive TS capture reuses original publisher bytes with zero extra provider fetches',async()=>{
  const records=[],configs=[];
  let producer;
  const live=new ReadableStream({start(controller){producer=controller}});
  const portal={configured:true,liveChannel:async()=>({
    status:200,body:{
      ok:true,kind:'live',extension:'ts',sourceId:UUID,channelId:'88',
      sourceUrl:'https://provider.example/owner-live/88.ts',name:'Test only'
    }
  })};
  const service=createLiveRestreamSupervisor({
    portal,mediaPassword:password,
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    fetchImpl:async(url,options={})=>{
      const target=String(url);records.push(target);
      if(target.includes(':9997/')){
        if(options.method==='POST')configs.push(JSON.parse(options.body));
        return Response.json({});
      }
      if(target.startsWith('https://provider.example/'))
        return new Response(live,{status:200,
          headers:{'content-type':'video/mp2t'}});
      throw Error('unexpected fetch');
    }
  });
  const start=await service.start(row());
  assert.equal(start.status,201);
  const path=start.body.path;
  assert.equal((await service.captureActiveTs({name:path,rightsConfirmed:false})).status,403);
  assert.equal((await service.captureActiveTs({name:path,rightsConfirmed:true})).status,409);
  assert.equal(records.filter(u=>u.startsWith('https://provider.example/')).length,0);
  const token=configs[0].runOnDemand.match(/\/internal\/live-feed\/([a-f0-9]{48})/)[1];
  const server=http.createServer((req,res)=>service.streamFeed(req,res,token));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  function transport(count){
    const bytes=Buffer.alloc(188*count);
    for(let i=0;i<count;i++){bytes[188*i]=0x47;bytes[188*i+3]=0x10;}
    return bytes;
  }
  try{
    const responsePromise=fetch('http://127.0.0.1:'+server.address().port+
      '/internal/live-feed/'+token);
    producer.enqueue(transport(5)); // publisher is now opening
    const response=await responsePromise;
    assert.equal(response.status,200);
    const consuming=response.arrayBuffer();
    const reading=service.list().items[0];
    assert.equal(reading.connections,1);
    const cap=service.captureActiveTs({name:path,rightsConfirmed:true});
    producer.enqueue(transport(6100)); // no new upstream GET; same body stream
    const result=await cap;
    assert.equal(result.status,200);
    assert.equal(result.code,'passive_sample_complete');
    assert.equal(result.bytes.length,188*6000);
    assert.equal(result.providerRequestsCreated,0);
    assert.equal(result.customerRoutesChanged,false);
    assert.equal(records.filter(u=>u.startsWith('https://provider.example/')).length,1);
    assert.equal(records.filter(u=>u.includes(':8888')).length,0,
      'passive capture does not fetch MediaMTX HLS or restart an on-demand worker');
    result.bytes.fill(0);
    producer.close();
    assert.equal((await consuming).byteLength,188*(5+6100));
  }finally{
    try{producer.close()}catch{}
    await new Promise(resolve=>server.close(resolve));
  }
  const final=await service.stop(path);
  assert.equal(final.status,200);
});


test('private MediaMTX health uses only one control-plane GET, no media',async()=>{
 const {service,calls}=createFixture();
 const n=calls.length;
 const health=await service.mediaEngineHealth();
 assert.equal(health.ok,true);
 assert.equal(health.providerRequests,0);
 assert.equal(health.customerTrafficChanged,false);
 assert.equal(calls.length,n+1);
 assert.equal(calls.at(-1).method,'GET');
 assert.ok(calls.at(-1).url.endsWith('/v3/config/paths/list'));
});


test('cold standby engine accepts new operator path when primary control 503s',async()=>{
 const seen=[];
 const portal={configured:true,liveChannel:async()=>({
  status:200,body:{ok:true,kind:'live',extension:'ts',sourceId:UUID,
   channelId:'88',name:'Licensed preview',sourceUrl}
 })};
 const service=createLiveRestreamSupervisor({
  portal,mediaPassword:password,standbyEnabled:true,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async(url,options={})=>{
   const target=String(url);seen.push({url:target,method:options.method||'GET'});
   if(target.includes('media-standby.railway.internal:9997')){
    return Response.json(target.endsWith('/paths/list')?{items:[]}:{});
   }
   if(target.includes('media.railway.internal:9997'))
    return Response.json({error:'unavailable'},{status:503});
   throw Error('unexpected outgoing fetch');
  }
 });
 const result=await service.start(row());
 assert.equal(result.status,201);
 assert.equal(result.body.engine,'standby');
 assert.equal(result.body.customerTrafficChanged,false);
 assert.equal(service.list().items[0].engine,'standby');
 assert.ok(seen.some(x=>x.url.includes('media-standby.railway.internal:9997/v3/config/paths/add/')));
 assert.equal(seen.filter(x=>x.url.includes('provider.example')).length,0);
 const stopped=await service.stop(result.body.path);
 assert.equal(stopped.status,200);
 assert.ok(seen.some(x=>x.method==='DELETE'&&x.url.includes('media-standby.railway.internal')));
});
test('MediaMTX authorization denial never triggers standby or extra origin connection',async()=>{
 let backupRequests=0;
 const portal={configured:true,liveChannel:async()=>({
  status:200,body:{ok:true,kind:'live',extension:'ts',sourceId:UUID,
   channelId:'88',name:'Test preview',sourceUrl}
 })};
 const service=createLiveRestreamSupervisor({
  portal,mediaPassword:password,standbyEnabled:true,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async url=>{
   if(String(url).includes('standby')){
    backupRequests++;
    return Response.json({items:[]});
   }
   return Response.json({error:'unauthorized'},{status:401});
  }
 });
 const result=await service.start(row());
 assert.equal(result.status,503);
 assert.equal(result.body.code,'restream_control_denied');
 assert.equal(backupRequests,0);
});
test('standby engine is disabled unless the operator explicitly enables it',async()=>{
 let second=0;
 const portal={configured:true,liveChannel:async()=>({
  status:200,body:{ok:true,kind:'live',extension:'ts',sourceId:UUID,
   channelId:'88',name:'Test preview',sourceUrl}
 })};
 const service=createLiveRestreamSupervisor({
  portal,mediaPassword:password,standbyEnabled:false,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async url=>{
   if(String(url).includes('standby'))second++;
   return Response.json({error:'unavailable'},{status:503});
  }
 });
 assert.equal((await service.start(row())).status,503);
 assert.equal(second,0);
});

test('hour recording requires separate rights and opt-in; no provider requests when disabled',async()=>{
 const {service,calls}=createFixture();
 const denied=await service.start({...row(),recordOneHour:true});
 assert.equal(denied.status,403);
 assert.equal(denied.body.code,'hour_recording_rights_confirmation_required');
 assert.equal(calls.length,0);
 const unavailable=await service.start({...row(),recordOneHour:true,
   recordingRightsConfirmed:true});
 assert.equal(unavailable.status,409);
 assert.equal(unavailable.body.code,'hour_recording_feature_disabled');
 assert.equal(calls.length,0);
});
test('one-hour recording is isolated on standby, bounded and only configured on-demand',async()=>{
 const calls=[];
 const portal={configured:true,liveChannel:async()=>({
  status:200,body:{ok:true,kind:'live',extension:'ts',sourceId:UUID,
   channelId:'88',name:'Licensed pilot',sourceUrl}
 })};
 const service=createLiveRestreamSupervisor({portal,mediaPassword:password,
  standbyEnabled:true,recordHourEnabled:true,
  lookup:async()=>[{address:'8.8.8.8',family:4}],
  fetchImpl:async(url,options={})=>{
   calls.push({url:String(url),method:options.method,body:options.body});
   return Response.json(String(url).endsWith('/paths/list')?{items:[]}:{});
  }
 });
 const result=await service.start({...row(),recordOneHour:true,
  recordingRightsConfirmed:true});
 assert.equal(result.status,201);
 assert.equal(result.body.engine,'standby');
 assert.equal(result.body.recordOneHour,true);
 assert.equal(result.body.recordingVerified,false);
 const post=calls.find(x=>x.method==='POST'&&x.url.includes('media-standby.'));
 assert.ok(post);
 const config=JSON.parse(post.body);
 assert.equal(config.record,true);
 assert.equal(config.recordDeleteAfter,'1h');
 assert.equal(config.recordSegmentDuration,'15s');
 assert.equal(config.recordPartDuration,'1s');
 assert.equal(config.recordPath,'/recordings/%path/%Y-%m-%d_%H-%M-%S-%f_%z');
 assert.ok(!post.body.includes('provider.example'));
 assert.equal(calls.filter(x=>x.url.includes('media.railway.internal:9997')).length,0,
  'licensed recording must never be configured on the unmounted primary');
 const duplicate=await service.start({...row(),recordOneHour:false});
 assert.equal(duplicate.status,409);
});

test('operator opt-in quick start reduces FFmpeg input analysis without changing video/audio codecs',async()=>{
 const {service,calls}=createFixture();
 const start=await service.start({...row(),fastStart:true});
 assert.equal(start.status,201);
 assert.equal(start.body.fastStart,true);
 const m=calls.find(x=>x.method==='POST'&&mediaName.test(x.url));
 assert.ok(m);
 const config=JSON.parse(m.body);
 assert.match(config.runOnDemand,/-probesize 262144 -analyzeduration 2000000 /);
 assert.match(config.runOnDemand,/-map 0:v:0\?/);
 assert.match(config.runOnDemand,/-map 0:a:0\?/);
 assert.match(config.runOnDemand,/-c copy/);
 assert.doesNotMatch(config.runOnDemand,/provider\.example|secret-password/);
 const incompatible=await service.start({...row(),fastStart:false});
 assert.equal(incompatible.status,409,'cannot silently change an active profile');
 assert.equal(calls.filter(x=>x.method==='POST'&&mediaName.test(x.url)).length,1);
});
test('regular licensed operator path retains full FFmpeg input probing for compatibility',async()=>{
 const {service,calls}=createFixture();
 const first=await service.start(row());
 assert.equal(first.body.fastStart,false);
 const config=JSON.parse(calls.find(x=>x.method==='POST'&&mediaName.test(x.url)).body);
 assert.doesNotMatch(config.runOnDemand,/-probesize 262144/);
 assert.doesNotMatch(config.runOnDemand,/-analyzeduration 2000000/);
 const invalid=await service.start({...row(),fastStart:'true'});
 assert.equal(invalid.status,400);
});

test('synthetic source access and quota refusals do not open a backup or become retryable 502',async()=>{
 for(const status of [401,403,429,456]){
  const {portal,ts}=createFixture();const calls=[];let token;
  const service=createLiveRestreamSupervisor({portal,mediaPassword:password,
   lookup:async()=>[{address:'8.8.8.8',family:4}],
   fetchImpl:async(url,opts={})=>{
    const target=String(url);
    if(target.includes(':9997/')){
     if(opts.method==='POST')token=JSON.parse(opts.body).runOnDemand.match(/\/internal\/live-feed\/([a-f0-9]{48})/)[1];
     return new Response('{}',{status:200,headers:{'content-type':'application/json'}});
    }
    calls.push(new URL(target).hostname);
    if(target.startsWith('https://provider.example/'))return new Response('Denied',{status});
    if(target.startsWith('https://backup.example/'))return new Response(ts,{status:200,headers:{'content-type':'video/mp2t'}});
    throw Error('unexpected target');
   }});
  const started=await service.start({...row(),backupSourceId:'550e8400-e29b-41d4-a716-446655440001',backupChannelId:'99'});
  assert.equal(started.status,201);
  const server=http.createServer((req,res)=>service.streamFeed(req,res,token));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
   const result=await fetch('http://127.0.0.1:'+server.address().port+'/');
   assert.equal(result.status,status===429?429:403);
   assert.equal((await result.json()).code,'restream_provider_denied');
   assert.deepEqual(calls,['provider.example']);
   const info=service.list().items[0];
   assert.equal(info.preferredSource,'primary');
   assert.equal(info.failovers,0);
   assert.equal(info.lastError,'restream_provider_denied');
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await service.stop(started.body.path);}
 }
});
