import test from 'node:test';
import assert from 'node:assert/strict';
import {readOperatorSample,createOwnerSampleBridge,
  sanitizeOwnerSampleResult,MAX_OWNER_SAMPLE_BYTES} from '../src/owner-ts-sample-bridge.mjs';
const secret='TEST_ONLY_UPLOAD_TOKEN_'.padEnd(64,'X');
function sample(n=30){const b=Buffer.alloc(188*n);for(let i=0;i<n;i++){b[188*i]=0x47;b[188*i+3]=0x10;}return b;}
const reply={
  ok:true,scope:'approved_short_ts_sample',code:'short_sample_decoded',
  productionStreamVerified:false,customerRoutesChanged:false,
  hasAudio:true,hasVideo:true,decodedAudio:true,decodedVideo:true,
  audioFrames:8,videoFrames:8,audioPackets:50,videoPackets:20,
  audioCodec:'mp2',videoCodec:'mpeg2video',bytesExamined:188*30,
  sourceUrl:'https://provider.invalid/watch?password=SECRET',
  localPath:'/tmp/private/filename.ts'
};
test('sample bridge has fixed endpoint and hides lab token and source',async()=>{
  let hits=0;
  const b=createOwnerSampleBridge({
    uploadToken:secret,clock:()=>100000,
    fetchImpl:async(url,args)=>{
      hits++;
      assert.equal(url,'https://blofy-decoder-lab-test.up.railway.app/api/owner-sample');
      assert.equal(args.method,'POST');
      assert.equal(args.redirect,'manual');
      assert.equal(args.headers.authorization,'Bearer '+secret);
      assert.equal(args.headers['x-blofy-sample-rights'],'confirmed');
      assert.equal(args.headers['content-type'],'video/mp2t');
      assert.equal(args.headers['content-length'],String(188*30));
      assert.ok(Buffer.isBuffer(args.body));
      return Response.json(reply);
    }
  });
  const r=await b.submit(sample());
  assert.equal(r.status,200);
  assert.equal(r.body.ok,true);
  assert.equal(r.body.decodedAudio,true);
  assert.equal(r.body.decodedVideo,true);
  assert.equal(r.body.audioCodec,'mp2');
  assert.equal(r.body.androidPlaybackVerified,false);
  assert.equal(r.body.windowsPlaybackVerified,false);
  assert.equal(r.body.productionStreamVerified,false);
  assert.equal(r.body.noAutomaticRepairs,true);
  assert.doesNotMatch(JSON.stringify(r.body),/SECRET|provider.invalid|localPath|\/tmp\/|Bearer/);
  assert.equal(hits,1);
  const cooldown=await b.submit(sample());
  assert.equal(cooldown.status,429);
  assert.equal(hits,1);
});
test('missing upload token and oversized sample never connect to lab',async()=>{
  const bad=createOwnerSampleBridge({
    uploadToken:'',fetchImpl:async()=>{throw Error('should not execute')}
  });
  assert.equal((await bad.submit(sample())).status,503);
  const b=createOwnerSampleBridge({
    uploadToken:secret,fetchImpl:async()=>{throw Error('should not execute')}
  });
  assert.equal((await b.submit(Buffer.alloc(MAX_OWNER_SAMPLE_BYTES+1))).status,413);
});
test('unrecognized upstream fields and falsified production claims are denied',()=>{
  assert.equal(sanitizeOwnerSampleResult({...reply,
    productionStreamVerified:true}).code,'sample_response_invalid');
  const clean=sanitizeOwnerSampleResult({...reply,audioCodec:'script:alert(1)',
    explanation:'secret',providerPassword:'topsecret'});
  assert.equal(clean.audioCodec,null);
  assert.doesNotMatch(JSON.stringify(clean),/topsecret|script:alert|providerPassword/);
});
test('brief missing audio is distinguished from confirmed silence',()=>{
  const r=sanitizeOwnerSampleResult({...reply,ok:false,
    code:'audio_stream_not_present_in_short_sample',
    decodedAudio:null,hasAudio:false,hasVideo:true});
  assert.equal(r.ok,false);
  assert.equal(r.decodedAudio,false);
  assert.equal(r.audibleSoundVerified,undefined);
  assert.match(r.explanation,/العينة/);
});
test('readOperatorSample requires exact content length and MPEG-TS body',async()=>{
  const body=sample();
  const req=(headers,parts=[body])=>({
    headers,async *[Symbol.asyncIterator](){for(const part of parts)yield part;}
  });
  const ok=await readOperatorSample(req({
    'content-type':'video/mp2t','content-length':String(body.length)
  },[body.subarray(0,1128),body.subarray(1128)]));
  assert.equal(ok.ok,true);
  assert.equal(ok.bytes.length,body.length);
  const denied=await readOperatorSample(req({
    'content-type':'application/json','content-length':String(body.length)
  }));
  assert.equal(denied.status,415);
  const overflow=await readOperatorSample(req({
    'content-type':'video/mp2t','content-length':String(body.length)
  },[body,body]));
  assert.equal(overflow.status,413);
});
