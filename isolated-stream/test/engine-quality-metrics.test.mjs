import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createEngineQualityMetrics} from '../src/engine-quality-metrics.mjs';
import {readFile} from 'node:fs/promises';
test('quality metrics distinguish finished responses, refused requests and disconnected clients',()=>{
 let now=600000,mono=0;
 const m=createEngineQualityMetrics({clock:()=>now,monotonic:()=>mono});
 function req(channel,kind,status,duration,finished=true){
  const r=new EventEmitter();r.statusCode=status;r.writableFinished=finished;
  m.observe(r,channel,kind);mono+=duration;
  if(finished)r.emit('finish');r.emit('close');
 }
 req('hd','segment',200,15);req('hd','segment',200,4100);
 req('hd','segment',429,2);req('hd','segment',200,20,false);
 req('fhd','manifest',200,3);req('fhd','segment',404,1);
 req('fhd','segment',503,1);
 const report=m.snapshot();assert.equal(report.activeResponses,0);
 const hd=report.results.find(x=>x.scope==='hd:segment');
 assert.deepEqual([hd.finished,hd.ok,hd.overloaded,hd.aborted,hd.slowSegments,hd.p95UpperMs],[3,2,1,1,1,10000]);
 assert.equal(report.results.find(x=>x.scope==='fhd:segment').expired,1);
 assert.equal(report.results.find(x=>x.scope==='fhd:segment').unavailable,1);
 assert.equal(report.viewerPlaybackVerified,false);assert.equal(report.providerRequests,0);
 now+=15*60000;assert.deepEqual(m.snapshot().results,[]);
});
test('metrics are bounded to fixed synthetic scopes and authenticated diagnostics',async()=>{
 const m=createEngineQualityMetrics();const r=new EventEmitter();m.observe(r,'https://secret.example','segment');
 assert.equal(m.snapshot().activeResponses,0);
 const code=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
 const block=code.slice(code.indexOf("url.pathname==='/internal/engine-quality-metrics'"),code.indexOf("url.pathname==='/internal/media-engine-health'"));
 assert.match(block,/authorized\(req.headers.authorization,adminToken\)/);
 assert.match(block,/qualityMetrics.snapshot\(\)/);
});
