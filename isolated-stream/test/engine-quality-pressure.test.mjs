// Bounded loopback-only load test. Never targets the public service or provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {createEngineHdTest,qualityLiveManifest} from '../src/engine-hd-test.mjs';
const root='/app/engine-fixtures',clock=Date.UTC(2026,10,25),host='engine.blofyplayer.com';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const digest=b=>createHash('sha256').update(b).digest('hex');
test('bounded synthetic load at 10, 25 and 50 clients; retry and disconnect recovery',{skip:!existsSync(root),timeout:45000},async()=>{
 const handle=createEngineHdTest({root,now:()=>clock,maxActiveReads:16});
 const server=http.createServer((req,res)=>{if(!handle(req,res)){res.writeHead(404);res.end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const seq=Number(qualityLiveManifest(clock).toString().match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/)[1])+5;
 const targets=['hd','fhd'].map(channel=>{
  const path='/engine/quality-live/'+channel+'/seg-'+seq+'.ts';
  const expected=readFileSync(root+'/'+channel+'/seg-'+String(seq%6).padStart(3,'0')+'.ts');
  return {path,size:expected.length,hash:digest(expected)};
 });
 function read(target){
  return new Promise((resolve,reject)=>{
   const req=http.get(origin+target.path,{headers:{host},agent:false},res=>{
    const hash=createHash('sha256');let size=0;
    res.on('data',b=>{size+=b.length;hash.update(b)});
    res.on('error',reject);
    res.on('end',()=>resolve({status:res.statusCode,size,hash:hash.digest('hex'),retry:res.headers['retry-after']}));
   });
   req.setTimeout(5000,()=>req.destroy(Error('loopback_timeout')));req.on('error',reject);
  });
 }
 function verify(r,t){assert.equal(r.status,200);assert.equal(r.size,t.size);assert.equal(r.hash,t.hash)}
 try{
  for(const count of [10,25,50]){
   const start=performance.now();
   const work=Array.from({length:count},(_,i)=>targets[i%2]);
   const first=await Promise.all(work.map(read));let retries=0,bytes=0;
   const pending=[];
   for(let i=0;i<count;i++){
    if(first[i].status===429){assert.equal(first[i].retry,'2');pending.push(work[i]);retries++;}
    else{verify(first[i],work[i]);bytes+=first[i].size;}
   }
   // Respect the advertised cooldown, then retry only the refused requests.
   if(pending.length)await sleep(2000);
   for(let i=0;i<pending.length;i+=8){
    const wave=pending.slice(i,i+8),results=await Promise.all(wave.map(read));
    results.forEach((r,j)=>{verify(r,wave[j]);bytes+=r.size;});
   }
   console.log('BLOFY_ENGINE_LOOPBACK_LOAD '+JSON.stringify({clients:count,initial200:count-retries,initial429:retries,completed:count,bytes,elapsedMs:Math.round(performance.now()-start)}));
  }
  // Disconnect before consuming the response, then verify the read budget recovers.
  await Promise.all(Array.from({length:12},(_,i)=>new Promise((resolve,reject)=>{
   const req=http.get(origin+targets[i%2].path,{headers:{host},agent:false},res=>{res.destroy();resolve()});
   req.setTimeout(5000,()=>req.destroy(Error('loopback_timeout')));req.on('error',reject);
  })));
  await sleep(250);
  const after=await Promise.all(Array.from({length:8},(_,i)=>read(targets[i%2])));
  after.forEach((r,i)=>verify(r,targets[i%2]));
  console.log('BLOFY_ENGINE_LOOPBACK_RECOVERY '+JSON.stringify({closed:12,completedAfter:8}));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
});
