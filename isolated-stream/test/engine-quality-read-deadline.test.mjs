import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import http from 'node:http';
import {createEngineHdTest} from '../src/engine-hd-test.mjs';
const root='/app/engine-fixtures';
test('stalled synthetic reads release admission after deadline, then valid reads recover',{skip:!existsSync(root),timeout:5000},async()=>{
 let stalled=true,opens=0,started;
 const opening=new Promise(resolve=>{started=resolve});
 const handle=createEngineHdTest({root,maxActiveReads:1,readDeadlineMs:150,
  openStream(file){opens++;if(stalled){started();return new Readable({read(){}});}return createReadStream(file)}});
 const server=http.createServer((req,res)=>{if(!handle(req,res)){res.writeHead(404);res.end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 function get(){
  return new Promise(resolve=>{
   const req=http.get('http://127.0.0.1:'+server.address().port+'/engine/quality/hd/seg-000.ts',{headers:{host:'engine.blofyplayer.com'},agent:false},res=>{
    let bytes=0;res.on('data',c=>bytes+=c.length);res.on('end',()=>resolve({status:res.statusCode,bytes}));res.on('error',()=>resolve({aborted:true}));
   });req.on('error',()=>resolve({aborted:true}));
  });
 }
 try{
  const first=get();await opening;
  assert.equal((await get()).status,429);assert.equal(opens,1);
  assert.equal((await first).aborted,true);
  stalled=false;
  await new Promise(resolve=>setTimeout(resolve,30));
  const recovered=await get();assert.equal(recovered.status,200);assert.ok(recovered.bytes>10000);assert.equal(opens,2);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
});
test('synthetic admission and timeout bounds reject invalid configurations',()=>{
 for(const options of [{maxActiveReads:0},{maxActiveReads:65},{readDeadlineMs:0},{readDeadlineMs:120001},{openStream:null}])
  assert.throws(()=>createEngineHdTest(options),/quality_read_configuration_invalid/);
});
