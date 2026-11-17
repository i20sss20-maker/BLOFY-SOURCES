import test from 'node:test';
import assert from 'node:assert/strict';
import {createDecoderLabReportClient} from '../src/decoder-lab-report-client.mjs';
const token='V'.repeat(64);
const now=Date.parse('2026-11-17T07:00:00.000Z');
const good={
  ok:true,scope:'synthetic_local_only',lastStartedAt:'2026-11-17T06:59:00.000Z',
  report:{
    ok:true,scope:'synthetic_local_only',
    audioDecoderExecuted:true,videoDecoderExecuted:true,
    audioFrames:8,videoFrames:8,
    audioCodec:'mp2',videoCodec:'mpeg2video',
    productionStreamVerified:false,
    secret:'must_never_be_reflected',
    path:'/tmp/blofy-decoder-private',
    providerUrl:'https://provider.invalid/password'
  }
};
test('only a fixed HTTPS synthetic status is queried with a hidden read-only token',async()=>{
  let calls=0;
  const client=createDecoderLabReportClient({
    viewToken:token,clock:()=>now,
    fetchImpl:async(uri,opts)=>{
      calls++;
      assert.equal(uri,'https://blofy-decoder-lab-test.up.railway.app/api/report');
      assert.equal(opts.method,'GET');
      assert.equal(opts.redirect,'manual');
      assert.equal(opts.headers.authorization,'Bearer '+token);
      return Response.json(good);
    }
  });
  const first=await client.snapshot();
  assert.equal(first.ok,true);
  assert.equal(first.state,'synthetic_verified');
  assert.equal(first.audioDecoded,true);
  assert.equal(first.videoDecoded,true);
  assert.equal(first.audioFrames,8);
  assert.equal(first.videoFrames,8);
  assert.equal(first.productionStreamVerified,false);
  assert.equal(first.customerRoutesModified,false);
  assert.equal(first.noSourceContentTested,true);
  assert.doesNotMatch(JSON.stringify(first),/must_never_be_reflected|\/tmp|provider.invalid|Bearer /);
  await client.snapshot();
  assert.equal(calls,1,'report GET is cached');
});
test('unconfigured view secret causes no fetch or media actions',async()=>{
  const c=createDecoderLabReportClient({
    viewToken:'',
    fetchImpl:async()=>{throw Error('no fetch permitted')}
  });
  const r=await c.snapshot();
  assert.equal(r.ok,false);
  assert.equal(r.state,'not_configured');
  assert.equal(r.productionStreamVerified,false);
});
test('stale synthetic proof cannot be displayed as verified',async()=>{
  const client=createDecoderLabReportClient({
    viewToken:token,clock:()=>now,
    fetchImpl:async()=>Response.json({...good,lastStartedAt:'2026-11-10T00:00:00Z'})
  });
  const r=await client.snapshot();
  assert.equal(r.ok,false);
  assert.equal(r.state,'invalid_or_stale');
});
test('malicious report claiming real-stream verification fails closed',async()=>{
  const client=createDecoderLabReportClient({
    viewToken:token,clock:()=>now,
    fetchImpl:async()=>Response.json({...good,
      report:{...good.report,productionStreamVerified:true}})
  });
  const r=await client.snapshot();
  assert.equal(r.ok,false);
});
test('incomplete decodes or invalid codecs never masquerade as verified source',async()=>{
  const client=createDecoderLabReportClient({
    viewToken:token,clock:()=>now,
    fetchImpl:async()=>Response.json({...good,
      report:{...good.report,audioFrames:0,audioCodec:'malicious'}})
  });
  const r=await client.snapshot();
  assert.equal(r.state,'synthetic_failed');
  assert.equal(r.ok,false);
  assert.equal(r.audioCodec,null);
});
test('non-200 upstream status never reflects secrets or Basic challenges',async()=>{
  const client=createDecoderLabReportClient({
    viewToken:token,
    fetchImpl:async()=>new Response('credential='+token,{status:401,
      headers:{'www-authenticate':'Basic realm="private"'}})
  });
  const r=await client.snapshot();
  assert.equal(r.state,'authentication_error');
  assert.doesNotMatch(JSON.stringify(r),/credential|Basic|V{20}/);
});
test('oversized remote reports are rejected and never sent to browser',async()=>{
  const client=createDecoderLabReportClient({
    viewToken:token,fetchImpl:async()=>new Response('x'.repeat(12000),{
      status:200,headers:{'content-type':'application/json'}
    })
  });
  const r=await client.snapshot();
  assert.equal(r.ok,false);
  assert.equal(r.state,'unavailable');
});


test('matrix is verified only for exactly one successful AAC, AC3 and E-AC3 decode each',async()=>{
  const matrix=['aac','ac3','eac3'].map(codec=>({
    codec,ok:true,stage:'complete',audioDecoded:true,audioFrames:8,
    providerUrl:'https://private-provider.invalid/?password=hidden'
  }));
  const client=createDecoderLabReportClient({
    viewToken:token,clock:()=>now,
    fetchImpl:async()=>Response.json({...good,report:{
      ...good.report,codecMatrix:matrix,codecMatrixAllVerified:true
    }})
  });
  const result=await client.snapshot();
  assert.equal(result.ok,true);
  assert.equal(result.codecMatrixVerified,true);
  assert.equal(result.allSyntheticCodecsVerified,true);
  assert.deepEqual(result.audioCodecMatrix.map(x=>x.codec),['aac','ac3','eac3']);
  assert.equal(result.audioCodecMatrix.every(x=>x.decoded),true);
  assert.doesNotMatch(JSON.stringify(result),/private-provider|password|hidden/);
});
test('duplicate codec entries and misleading matrix flag are rejected',async()=>{
  const client=createDecoderLabReportClient({
    viewToken:token,clock:()=>now,
    fetchImpl:async()=>Response.json({...good,report:{
      ...good.report,codecMatrix:[
        {codec:'aac',ok:true,stage:'complete',audioDecoded:true,audioFrames:8},
        {codec:'aac',ok:true,stage:'complete',audioDecoded:true,audioFrames:8},
        {codec:'eac3',ok:true,stage:'complete',audioDecoded:true,audioFrames:8}
      ],codecMatrixAllVerified:true
    }})
  });
  const result=await client.snapshot();
  assert.equal(result.codecMatrixVerified,false);
  assert.equal(result.allSyntheticCodecsVerified,false);
  assert.equal(result.audioCodecMatrix[0].decoded,false);
  assert.equal(result.audioCodecMatrix[1].decoded,false);
});
