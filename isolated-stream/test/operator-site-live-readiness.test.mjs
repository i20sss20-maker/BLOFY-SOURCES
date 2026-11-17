import test from 'node:test';
import assert from 'node:assert/strict';
import {readOnlyOperatorSiteProof} from '../src/operator-site-live-readiness.mjs';

function fixture(overrides={}){
 const calls=[];
 const run=id=>async options=>{
  calls.push({id,options});
  if(id in overrides)return overrides[id]();
  return {status:200,body:{ok:true,secret:'not-for-logs',
   items:[{customerName:'Private QA sample',sourceUrl:'secret'}]}};
 };
 const client={
  overview:run('sources'),
  catalog:run('movie_catalog'),
  contentHubStatus:run('private_content_hub'),
  contentHubSeasonHealth:run('season_queue_health'),
  opsDailyCatalogStatus:run('daily_catalog_metadata'),
  audioReadiness:run('radio_source_catalog'),
  ownerAdminReadiness:run('code_distributor_store')
 };
 return {calls,client};
}
test('seven real operator read routes are called without sending writes or private data',async()=>{
 const f=fixture();
 const report=await readOnlyOperatorSiteProof({client:f.client});
 assert.equal(report.ok,true);
 assert.equal(report.checked,7);
 assert.equal(report.connected,7);
 assert.equal(report.sourceMediaRequests,0);
 assert.equal(report.customerWrites,0);
 assert.equal(report.realMediaDecoded,false);
 assert.equal(report.realCodeIssuanceVerified,false);
 assert.equal(report.realDistributorWriteVerified,false);
 assert.deepEqual(f.calls.map(x=>x.id),[
  'sources','movie_catalog','private_content_hub',
  'season_queue_health','daily_catalog_metadata','radio_source_catalog','code_distributor_store']);
 assert.deepEqual(f.calls[1].options,{
  type:'movie',serverId:'',q:'',offset:0
 });
 const json=JSON.stringify(report);
 assert.doesNotMatch(json,/secret|customerName|sourceUrl|Private QA sample/i);
 assert.deepEqual(report.checks.map(x=>Object.keys(x)),
  Array(7).fill(['id','state','httpStatus','elapsedMs']));
});
test('a 401 is blocked, 503 unavailable, and server ok:false degraded',async()=>{
 const f=fixture({
  sources:()=>({status:401,body:{ok:false,token:'SECRET'}}),
  movie_catalog:()=>({status:503,body:{error:'private upstream URL'}}),
  private_content_hub:()=>({status:200,body:{ok:false,error:'secret'}})
 });
 const report=await readOnlyOperatorSiteProof({client:f.client});
 assert.equal(report.ok,false);
 assert.equal(report.connected,4);
 assert.equal(report.unavailable,2);
 assert.equal(report.degraded,1);
 assert.deepEqual(report.checks.slice(0,3).map(x=>x.state),
  ['blocked','unavailable','degraded']);
 assert.doesNotMatch(JSON.stringify(report),/SECRET|private upstream|token/i);
});
test('failed fetch is unavailable but other read endpoints remain independently checked',async()=>{
 const f=fixture({radio_source_catalog:()=>{throw Error('leaked credentials')}});
 const report=await readOnlyOperatorSiteProof({client:f.client});
 assert.equal(report.checked,7);
 assert.equal(report.unavailable,1);
 assert.equal(report.checks.find(x=>x.id==='radio_source_catalog').httpStatus,null);
 assert.doesNotMatch(JSON.stringify(report),/credentials/);
});
test('missing required authenticated client is refused before any calls',async()=>{
 await assert.rejects(()=>readOnlyOperatorSiteProof({client:{overview:async()=>{}}}),
  /site_readiness_client_missing/);
});

test('HTTP success without explicit application ok is reachable only',async()=>{
 const f=fixture({radio_source_catalog:()=>({status:200,body:{status:'unknown'}})});
 const r=await readOnlyOperatorSiteProof({client:f.client});
 assert.equal(r.ok,false);
 assert.equal(r.connected,6);
 assert.equal(r.reachable,1);
 assert.equal(r.checks.find(x=>x.id==='radio_source_catalog').state,'reachable');
});

test('code/distributor READ-ONLY store readiness failing leaves other modules connected',async()=>{
 const f=fixture({code_distributor_store:()=>({status:503,body:{
  ok:false,scope:'authoritative_owner_postgresql_read_only',
  stores:[{id:'codes',state:'columns_incomplete'}],
  sourcePassword:'PRIVATE_NEVER_LOG'
 }})});
 const result=await readOnlyOperatorSiteProof({client:f.client});
 assert.equal(result.checked,7);
 assert.equal(result.connected,6);
 assert.equal(result.unavailable,1);
 assert.equal(result.ok,false);
 assert.equal(result.checks.at(-1).id,'code_distributor_store');
 assert.equal(result.checks.at(-1).state,'unavailable');
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_NEVER_LOG|sourcePassword/);
});
