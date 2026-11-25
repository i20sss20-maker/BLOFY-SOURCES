import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import http from 'node:http';
import {createEngineHdTest,qualityLiveManifest} from '../src/engine-hd-test.mjs';
const root='/app/engine-fixtures';
test('both generated quality channels serve complete HLS and segments concurrently without shared session state',{skip:!existsSync(root)},async()=>{
 const clock=Date.UTC(2026,10,25);
 const handle=createEngineHdTest({root,now:()=>clock});
 const server=http.createServer((req,res)=>{if(!handle(req,res)){res.writeHead(404);res.end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const request=(path,method='GET',host='engine.blofyplayer.com')=>new Promise((resolve,reject)=>{
  const req=http.request(origin+path,{method,headers:{host}},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));res.on('error',reject);
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
  });req.on('error',reject);req.end();
 });
 try{
  const playlist=await request('/engine/quality/test.m3u');
  assert.equal(playlist.status,200);assert.match(playlist.body.toString(),/BLOFY HD/);assert.match(playlist.body.toString(),/BLOFY FHD/);
  const work=[];
  for(const c of ['hd','fhd']){
   const prefix='/engine/quality/'+c+'/';
   const m=await request(prefix+'index.m3u8');
   assert.equal(m.status,200);assert.match(m.body.toString(),/#EXT-X-ENDLIST/);
   const refs=m.body.toString().split(/\r?\n/).filter(x=>x.endsWith('.ts'));
   assert.equal(refs.length,6);
   for(const ref of refs)work.push(prefix+ref,prefix+ref);
  }
  // Four parallel clients per wave, including repeated reads of each channel.
  for(let i=0;i<work.length;i+=4){
   const results=await Promise.all(work.slice(i,i+4).map(p=>request(p)));
   for(const r of results){
    assert.equal(r.status,200);assert.equal(r.headers['content-type'],'video/mp2t');
    assert.equal(r.body.length,Number(r.headers['content-length']));
    assert.equal(r.body.length%188,0);assert.ok(r.body.length>10000);
    for(let offset=0;offset<r.body.length;offset+=188)assert.equal(r.body[offset],0x47);
   }
  }
  const master=await request('/engine/quality-live/index.m3u8');
  assert.equal(master.status,200);
  assert.equal(master.headers['access-control-allow-origin'],'*');
  assert.match(master.body.toString(),/RESOLUTION=1280x720,FRAME-RATE=25.000\nhd\/index.m3u8/);
  assert.match(master.body.toString(),/RESOLUTION=1920x1080,FRAME-RATE=25.000\nfhd\/index.m3u8/);
  assert.equal((master.body.toString().match(/#EXT-X-STREAM-INF:/g)||[]).length,2);
  for(const match of master.body.toString().matchAll(/BANDWIDTH=(\d+),AVERAGE-BANDWIDTH=(\d+)/g))assert.ok(Number(match[1])>=Number(match[2]));
  const liveList=await request('/engine/quality-live/test.m3u');
  assert.equal(liveList.status,200);
  assert.equal((liveList.body.toString().match(/https:\/\/engine.blofyplayer.com\/engine\/quality-live\//g)||[]).length,3);
  assert.equal((await request('/engine/quality-live/index.m3u8','GET','connect.blofyplayer.com')).status,404);
  const livePaths=[];
  for(const channel of ['hd','fhd']){
   const prefix='/engine/quality-live/'+channel+'/';
   const r=await request(prefix+'index.m3u8');
   assert.equal(r.status,200);assert.equal(r.headers['cache-control'],'no-store');
   const manifest=r.body.toString(),refs=manifest.split(/\r?\n/).filter(x=>x.endsWith('.ts'));
   assert.equal(refs.length,6);assert.doesNotMatch(manifest,/#EXT-X-ENDLIST/);
   const seq=Number(manifest.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)[1]);
   assert.equal((await request(prefix+'seg-'+(seq+6)+'.ts')).status,404);
   assert.equal((await request(prefix+'seg-'+(seq-20)+'.ts')).status,404);
   for(const ref of refs)livePaths.push(prefix+ref);
  }
  // Eight concurrent downloads covering both independent channels.
  for(let i=0;i<livePaths.length;i+=4){
   const batch=livePaths.slice(i,i+4);
   const responses=await Promise.all([...batch,...batch].map(p=>request(p)));
   for(let j=0;j<batch.length;j++){
    assert.equal(responses[j].status,200);assert.ok(responses[j].body.length>10000);
    assert.deepEqual(responses[j].body,responses[j+batch.length].body);
   }
  }
  assert.equal((await request('/engine/quality/fhd/index.m3u8','HEAD')).body.length,0);
  assert.equal((await request('/engine/quality/hd/index.m3u8','POST')).status,405);
  assert.equal((await request('/engine/quality/hd/index.m3u8','GET','connect.blofyplayer.com')).status,404);
  assert.equal((await request('/engine/quality/fhd/seg-999.ts')).status,404);
  assert.equal((await request('/engine/quality/fhd/index.m3u8?url=external')).status,404);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
});
test('missing synthetic fixture fails closed without fetching an external source',()=>{
 const handle=createEngineHdTest({root:'/nonexistent-engine-fixture'});
 let status;assert.equal(handle({headers:{host:'engine.blofyplayer.com'},method:'GET',url:'/engine/quality/test.m3u'},{writeHead(n){status=n},end(){}}),true);assert.equal(status,503);
});

test('quality live loop retains original AV timing within each six-segment cycle',()=>{
 const epoch=Date.UTC(2026,0,1),a=qualityLiveManifest(epoch+24000).toString(),b=qualityLiveManifest(epoch+28000).toString();
 assert.match(a,/#EXT-X-MEDIA-SEQUENCE:0\n/);assert.doesNotMatch(a,/#EXT-X-DISCONTINUITY\n/);
 assert.match(b,/#EXT-X-MEDIA-SEQUENCE:1\n/);assert.match(b,/#EXT-X-DISCONTINUITY\n#EXTINF:4.000,\nseg-6.ts/);
 const next=qualityLiveManifest(epoch+48000).toString();
 assert.match(next,/#EXT-X-DISCONTINUITY-SEQUENCE:1\n/);assert.doesNotMatch(next,/#EXT-X-DISCONTINUITY\n/);
});
