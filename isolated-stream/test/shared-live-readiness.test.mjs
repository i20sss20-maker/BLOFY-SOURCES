import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedLiveReadiness} from '../src/shared-live-readiness.mjs';

const SID='550e8400-e29b-41d4-a716-446655440000';
const CID='123456';
const secret='https://provider.example/live/user/hiddenpassword/123456.ts';
const probeProof={ok:true,code:'shared_single_upstream_verified',
  viewerSamples:2,upstreamSessions:1,reconnects:0,durationMs:26000,
  sampleBytes:[987654,987654],providerSecret:secret};
function fixture({names=['saleh'],titles=['4K: V SPORT UHD 3840p'],
  probe=async()=>probeProof,now=()=>100000}={}){
 const calls=[];
 const portal={
  configured:true,
  overview:async()=>({status:200,body:{ok:true,sources:
   names.map((name,i)=>({id:i===0?SID:'550e8400-e29b-41d4-a716-446655440001',
    name,enabled:true,publishCatalog:true}))}}),
  catalog:async args=>{calls.push({type:'catalog',args});
   return {status:200,body:{ok:true,items:titles.map((name,i)=>({
    enabled:true,name,id:String(Number(CID)+i)}))}};},
  liveChannel:async args=>{calls.push({type:'live',args});
   return {status:200,body:{ok:true,kind:'live',extension:'ts',
    sourceUrl:secret,sourceId:SID,channelId:CID}};}
 };
 const output=[];
 const state=createSharedLiveReadiness({portal,probe,now,onResult:v=>output.push(v)});
 return {state,calls,output,portal};
}
test('one authorized live channel runs one protected two-reader real-source test',async()=>{
 const f=fixture();
 const r=await f.state.auto();
 assert.equal(r.status,200);
 assert.equal(r.body.ok,true);
 assert.equal(r.body.code,'shared_single_upstream_verified');
 assert.equal(r.body.upstreamSessions,1);
 assert.equal(r.body.viewerSamples,2);
 assert.equal(f.calls.filter(x=>x.type==='live').length,1);
 assert.equal(f.calls.find(x=>x.type==='live').args.rightsConfirmed,true);
 assert.equal(f.state.snapshot().totalRuns,1);
 assert.equal(f.state.snapshot().last.customerTrafficChanged,false);
 assert.doesNotMatch(JSON.stringify(r),/hiddenpassword|provider.example|sourceUrl|providerSecret/);
 assert.doesNotMatch(JSON.stringify(f.output),/hiddenpassword|provider.example/);
});
test('source label must match saleh exactly, and ambiguous channels never fetch media',async()=>{
 const missing=fixture({names:['other']});
 assert.equal((await missing.state.auto()).body.code,'pilot_source_not_found');
 assert.equal(missing.calls.length,0);
 const duplicate=fixture({names:['saleh','saleh']});
 assert.equal((await duplicate.state.auto()).body.code,'pilot_source_ambiguous');
 assert.equal(duplicate.calls.length,0);
 const channels=fixture({titles:['4K: V SPORT UHD 3840p','4K: V SPORT 2 UHD 3840p']});
 assert.equal((await channels.state.auto()).body.code,'pilot_channel_ambiguous');
 assert.equal(channels.calls.filter(x=>x.type==='live').length,0);
});
test('manually chosen channel requires affirmative redistribution rights and safe identifiers',async()=>{
 const f=fixture();
 const invalid=await f.state.manual({sourceId:SID,channelId:CID,rightsConfirmed:false});
 assert.equal(invalid.status,403);
 assert.equal(invalid.body.code,'stream_rights_confirmation_required');
 assert.equal(f.calls.length,0);
 const malformed=await f.state.manual({sourceId:'*',channelId:CID,rightsConfirmed:true});
 assert.equal(malformed.status,400);
 assert.equal(malformed.body.code,'pilot_invalid_configuration');
 const valid=await f.state.manual({sourceId:SID,channelId:CID,rightsConfirmed:true});
 assert.equal(valid.body.ok,true);
 assert.equal(f.calls.filter(x=>x.type==='live').length,1);
});
test('two concurrent previews never open multiple source feeds; cooldown throttles repeats',async()=>{
 let release,started;
 const firstStarted=new Promise(r=>{started=r});
 const pending=new Promise(r=>{release=r});
 const f=fixture({probe:async()=>{started();await pending;return probeProof}});
 const a=f.state.manual({sourceId:SID,channelId:CID,rightsConfirmed:true});
 await firstStarted;
 assert.equal(f.state.snapshot().state,'running');
 assert.equal((await f.state.auto()).status,429);
 assert.equal(f.state.snapshot().totalRuns,1);
 release();
 const done=await a;assert.equal(done.body.ok,true);
 assert.equal((await f.state.manual({sourceId:SID,channelId:CID,rightsConfirmed:true})).status,429);
});
test('unexpected provider error details are never returned or emitted to logs',async()=>{
 const f=fixture({probe:async()=>({ok:false,code:'https://provider.example/private',
  failureCodes:['provider_denied','provider.example','other_transport'],
  upstreamSessions:100000,sampleBytes:[-42,90000000000],sourceUrl:secret})});
 const r=await f.state.auto();
 assert.equal(r.body.ok,false);
 assert.equal(r.body.code,'pilot_media_failure');
 assert.deepEqual(r.body.failureCodes,['provider_denied','other_transport']);
 assert.equal(r.body.upstreamSessions,100);
 assert.deepEqual(r.body.sampleBytes,[0,2000000000]);
 assert.doesNotMatch(JSON.stringify(f.output),/hiddenpassword|provider.example|sourceUrl/);
});
