import test from 'node:test';
import assert from 'node:assert/strict';
import {getMediaEngineStatus} from '../src/operator-media-status.mjs';

const root='http://blofy-stream-media.railway.internal:9997';
test('private MediaMTX API returns accurate active paths and session counts',async()=>{
  const paths={items:[{name:'smoke',ready:true},{name:'offline',ready:false}],itemCount:2};
  const sessions={items:[{id:'1'},{id:'2'}],itemCount:2};
  const fetchImpl=async url=>{
    if(url===root+'/v3/paths/list')return new Response(JSON.stringify(paths),{status:200});
    if(url===root+'/v3/hls/sessions/list')return new Response(JSON.stringify(sessions),{status:200});
    throw new Error('unexpected path');
  };
  const result=await getMediaEngineStatus({fetchImpl});
  assert.equal(result.controlAvailable,true);
  assert.equal(result.activePaths,1);
  assert.equal(result.configuredPaths,2);
  assert.equal(result.hlsSessions,2);
  assert.equal(Object.keys(result).some(k=>/password|sourceUrl/i.test(k)),false);
});
test('unreachable control API does not invent a zero viewer count',async()=>{
  const result=await getMediaEngineStatus({fetchImpl:async()=>{throw Error('unreachable')}});
  assert.equal(result.controlAvailable,false);
  assert.equal(result.activePaths,null);
  assert.equal(result.hlsSessions,null);
});
test('unexpected public or customer-supplied peer is rejected',async()=>{
  await assert.rejects(
    getMediaEngineStatus({controlOrigin:'https://untrusted.example'}),
    /mediamtx_control_peer_not_allowed/
  );
});
