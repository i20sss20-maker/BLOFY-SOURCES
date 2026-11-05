import test from 'node:test';
import assert from 'node:assert/strict';
import {
  probeOne,playbackObservations,recordPlaybackEvent,
  resetPlaybackObservationsForTest,unexpectedMediaResponse,runPlaybackProbe
} from '../src/playback-health.mjs';

const item={
  id:1201,source:'managed-xtream',title:'Authorized sample',
  kind:'live',stream:{resolver:'authorized-xtream'}
};
const target={url:'https://provider.example/live/demo/token/42.ts',proxy:true};

test('bounded probe detects actual media first bytes without leaking provider credentials',async()=>{
  const result=await probeOne(item,{
    resolve:async()=>target,
    fetchFn:async (url,options)=>{
      assert.equal(url,target.url);
      assert.equal(options.headers.range,'bytes=0-1023');
      return new Response(new Uint8Array([0x47,0x00,0x00,0x10]),{status:206,headers:{'content-type':'video/mp2t'}});
    }
  });
  assert.equal(result.state,'ok');
  assert.equal(result.httpStatus,206);
  assert.ok(result.startupMs>=0);
  assert.equal(JSON.stringify(result).includes('token'),false);
  assert.equal(JSON.stringify(result).includes('provider.example'),false);
});

test('upstream errors, empty streams, invalid HTML and HLS-as-TS report meaningful results',async()=>{
  const resolve=async()=>target;
  let result=await probeOne(item,{resolve,fetchFn:async()=>new Response('Forbidden',{status:403})});
  assert.equal(result.state,'failed');
  assert.equal(result.reason,'upstream_http_403');

  result=await probeOne(item,{resolve,fetchFn:async()=>new Response(null,{status:200})});
  assert.equal(result.state,'failed');
  assert.equal(result.reason,'empty_stream');

  result=await probeOne(item,{resolve,fetchFn:async()=>new Response('<!doctype html><html>bad stream</html>',{status:200,headers:{'content-type':'text/html'}})});
  assert.equal(result.state,'failed');
  assert.equal(result.reason,'upstream_not_media');

  result=await probeOne(item,{resolve,fetchFn:async()=>new Response('#EXTM3U\\n#EXTINF:6,\\nsegment.ts',{status:200,headers:{'content-type':'application/vnd.apple.mpegurl'}})});
  assert.equal(result.state,'failed');
  assert.equal(result.reason,'upstream_hls_not_ts');

  assert.equal(unexpectedMediaResponse('video/mp2t',Buffer.from([0x47,0]),'live'),'');
});

test('probe disallows arbitrary or untrusted playback resolver URLs',async()=>{
  const result=await probeOne({...item,stream:{resolver:'direct',url:'https://example.org'}},{
    resolve:async()=>{throw new Error('unexpected')},
    fetchFn:async()=>{throw new Error('unexpected')}
  });
  assert.equal(result.state,'unsupported');
  assert.equal(result.reason,'not_managed_xtream');
});

test('observations are aggregate and never contain subscriber or upstream secrets',()=>{
  resetPlaybackObservationsForTest();
  recordPlaybackEvent(item,'started',{startupMs:2300,attempts:1,status:200});
  recordPlaybackEvent(item,'finished',{durationMs:5200,status:200});
  recordPlaybackEvent(item,'failed',{reason:'upstream_http_403',status:403});
  recordPlaybackEvent(item,'limited',{reason:'connection_limit',status:429});
  const stats=playbackObservations();
  assert.equal(stats.starts,1);
  assert.equal(stats.failures,1);
  assert.equal(stats.limits,1);
  assert.equal(stats.medianStartMs,2300);
  assert.equal(stats.failureReasons.upstream_http_403,1);
  assert.ok(!JSON.stringify(stats).includes('username'));
  assert.ok(!JSON.stringify(stats).includes('password'));
  resetPlaybackObservationsForTest();
});

test('probe input validation rejects invalid IDs before any upstream request',async()=>{
  let result=await runPlaybackProbe(['../../../etc/passwd']);
  assert.equal(result.status,400);
  result=await runPlaybackProbe(['1','2','3','4','5']);
  assert.equal(result.status,400);
});
