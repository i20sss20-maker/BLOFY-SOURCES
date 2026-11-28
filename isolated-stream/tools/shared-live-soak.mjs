// Isolated, loopback-only transport soak. No provider credentials or production traffic.
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {setTimeout as sleep} from 'node:timers/promises';
import {createRelayBroker} from '../src/relay-broker.mjs';
const count=Number(process.argv[2]||50),seconds=Number(process.argv[3]||30);
assert.ok(Number.isInteger(count)&&count>=5&&count<=128);
assert.ok(Number.isInteger(seconds)&&seconds>=10&&seconds<=120);
const secret='b'.repeat(64),sourceId='12345678-1234-4234-8234-123456789abc';
const bytes=188*100,packet=Buffer.alloc(bytes,0x11);
for(let i=0;i<bytes;i+=188)packet[i]=0x47;
let calls=0,emitter,produced=0,feedOpen=true;
const source=new ReadableStream({start(c){emitter=c}});
const broker=createRelayBroker({sharedToken:secret,sharedLiveEnabled:true,
 lookup:async()=>[{address:'93.184.216.34',family:4}],
 fetchImpl:async()=>{calls++;assert.equal(calls,1);return new Response(source,{headers:{'content-type':'video/mp2t'}})}});
const srv=http.createServer((req,res)=>{void(req.url==='/internal/relay-grants'?broker.issue(req,res):broker.relay(req,res))});
srv.listen(0,'127.0.0.1');await once(srv,'listening');
const base='http://127.0.0.1:'+srv.address().port,controllers=[],tasks=[],received=Array(count).fill(0),failures=[];
let timer,watchdog;
try{
 watchdog=setTimeout(()=>{console.error('SOAK_TIMEOUT');process.exit(1)},(seconds+45)*1000);
 const paths=await Promise.all(Array.from({length:count},async()=>{
  const r=await fetch(base+'/internal/relay-grants',{method:'POST',headers:{authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify({sourceUrl:'https://licensed.example/live/synthetic/test/1.ts',kind:'live',sharedLive:true,licensedCdnRedirect:true,licensedSourceId:sourceId,providerMaxConcurrentFeeds:1})});
  assert.equal(r.status,201);return (await r.json()).path;
 }));
 assert.equal(new Set(paths).size,count);
 timer=setInterval(()=>{if(feedOpen&&calls===1){emitter.enqueue(packet);produced+=bytes}},50);
 await Promise.all(paths.map(async(path,i)=>{
  const controller=new AbortController();controllers.push(controller);
  const r=await fetch(base+path,{signal:controller.signal});
  assert.equal(r.status,200);
  const task=(async()=>{try{for await(const chunk of r.body)received[i]+=chunk.length;
   if(feedOpen)failures.push('unexpected_eof');
  }catch{if(feedOpen)failures.push('unexpected_disconnect')}})();
  tasks.push(task);
 }));
 const begin=Date.now(),startBytes=produced,initial=received.slice();
 while(Date.now()-begin<seconds*1000){
  await sleep(1000);
  const s=broker.stats().fanout;
  assert.equal(s.activeFeeds,1);assert.equal(s.viewers,count);
  assert.equal(s.slowViewerDisconnects,0);assert.equal(s.sourceLimitRejections,0);
  assert.equal(calls,1);assert.equal(failures.length,0);
 }
 const delivered=received.map((v,i)=>v-initial[i]),offered=produced-startBytes;
 assert.ok(offered>0);
 assert.ok(delivered.every(v=>v>=offered*0.9),'each viewer must receive at least 90% of offered bytes during soak');
 console.log(JSON.stringify({result:'PASS',scope:'synthetic_loopback_transport_only',viewers:count,seconds:Math.round((Date.now()-begin)/1000),providerRequests:calls,sourceBytes:offered,minViewerBytes:Math.min(...delivered),slowDisconnects:0,realSourceVerified:false,decodedVideoVerified:false}));
}finally{
 feedOpen=false;clearInterval(timer);clearTimeout(watchdog);
 for(const c of controllers)c.abort();
 broker.drain();srv.closeAllConnections();await Promise.allSettled(tasks);await new Promise(resolve=>srv.close(resolve));
}
