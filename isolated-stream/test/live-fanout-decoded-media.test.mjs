import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {createLiveFanout} from '../src/live-fanout.mjs';

const available=['ffmpeg','ffprobe'].every(bin=>spawnSync(bin,['-version'],{stdio:'ignore',timeout:5000}).status===0);
function tool(bin,args,input){
  const r=spawnSync(bin,args,{input,maxBuffer:8*1024*1024,timeout:15000});
  assert.equal(r.status,0,bin+': '+String(r.stderr||'').slice(0,1000));
  return r.stdout;
}
function fixture(color,frequency){
  const b=tool('ffmpeg',['-nostdin','-hide_banner','-loglevel','error',
    '-f','lavfi','-i','color=c='+color+':s=160x96:r=10',
    '-f','lavfi','-i','sine=frequency='+frequency+':sample_rate=48000',
    '-t','2','-c:v','mpeg2video','-g','10','-c:a','mp2','-f','mpegts','pipe:1']);
  assert.ok(b.length>0&&b.length%188===0&&b[0]===0x47);
  return b;
}
function verifyDecode(input){
  tool('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-xerror',
    '-i','pipe:0','-map','0:v:0','-map','0:a:0','-f','null','-'],input);
  const report=JSON.parse(tool('ffprobe',['-v','error','-select_streams','v:0',
    '-count_frames','-show_entries','stream=nb_read_frames','-of','json','pipe:0'],input));
  assert.equal(Number(report.streams[0].nb_read_frames),20);
}
async function listen(server){
  server.listen(0,'127.0.0.1');await once(server,'listening');
  return 'http://127.0.0.1:'+server.address().port;
}
async function close(server){
  server.closeAllConnections();await new Promise(r=>server.close(r));
}
async function until(fn){
  for(let i=0;i<300;i++){if(fn())return;await sleep(10)}
  assert.fail('expected transport state not reached');
}
function exactReader(reader){
  let remainder=Buffer.alloc(0);
  return async n=>{
    const chunks=[];let bytes=0;
    while(bytes<n){
      if(!remainder.length){
        const item=await reader.read();assert.equal(item.done,false);
        remainder=Buffer.from(item.value);
      }
      const take=Math.min(n-bytes,remainder.length);
      chunks.push(remainder.subarray(0,take));bytes+=take;
      remainder=remainder.subarray(take);
    }
    return Buffer.concat(chunks,n);
  };
}
test('two authorized synthetic channels deliver decodable audio and video across isolated EOF',
 {skip:available?false:'FFmpeg and ffprobe required',timeout:45000},async()=>{
  const a=fixture('red',440),b=fixture('blue',660);
  const split=Math.floor(b.length/376)*188;
  const calls={a:0,b:0},writers={};
  const origin=http.createServer((req,res)=>{
    const key=req.url==='/a.ts'?'a':'b';
    calls[key]++;writers[key]=res;
    res.writeHead(200,{'content-type':'video/mp2t'});
    res.write(key==='a'?a:b.subarray(0,split));
  });
  const upstream=await listen(origin);
  const relay=createLiveFanout({independentIngress:true,reconnectOnUpstreamEnd:true,
    maxFeeds:2,maxViewersPerFeed:4,maxTotalViewers:8,
    lookup:async()=>[{address:'8.8.8.8',family:4}],
    fetchImpl:(url,options)=>fetch(upstream+url.pathname,options)});
  const scope='550e8400-e29b-41d4-a716-446655440000';
  const edge=http.createServer((req,res)=>void relay.handle(req,res,
    'https://licensed.example'+req.url,
    {licensedSourceId:scope,providerMaxConcurrentFeeds:2}));
  const base=await listen(edge),abort=new AbortController();
  const deadline=setTimeout(()=>abort.abort(),12000);
  try{
    const responses=await Promise.all(['a','b'].map(k=>fetch(base+'/'+k+'.ts',{signal:abort.signal})));
    assert.ok(responses.every(r=>r.status===200));
    const [ra,rb]=responses.map(r=>r.body.getReader());
    const readA=exactReader(ra),readB=exactReader(rb);
    const firstA=await readA(a.length),firstB=await readB(split);
    assert.deepEqual(firstA,a);
    writers.a.end();
    await until(()=>relay.stats().sourceEofWhileViewing===1);
    writers.b.write(b.subarray(split));
    const fullB=Buffer.concat([firstB,await readB(b.length-split)]);
    await until(()=>calls.a===2);
    const recoveredA=await readA(a.length);
    assert.deepEqual(fullB,b);assert.deepEqual(recoveredA,a);
    assert.deepEqual(calls,{a:2,b:1});
    assert.equal(relay.stats().sourceLimitRejections,0);
    assert.equal(relay.stats().reconnectRecovered,1);
    // Decode individual A sessions and uninterrupted B. This does not claim
    // timestamp continuity across the concatenated A session boundary.
    verifyDecode(firstA);verifyDecode(recoveredA);verifyDecode(fullB);
    await Promise.all([ra.cancel(),rb.cancel()]);
  }finally{
    clearTimeout(deadline);abort.abort();relay.close();await close(edge);await close(origin);
  }
});
