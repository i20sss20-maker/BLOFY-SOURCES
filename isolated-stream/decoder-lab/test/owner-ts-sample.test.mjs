import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeOwnerTsSample,isMpegTsSample,readOwnerSampleRequest,
  classifySampleStreams,sampleCommands,MAX_SAMPLE_BYTES} from '../src/owner-ts-sample.mjs';
const path='/tmp/blofy-owner-sample-fixture/sample.ts';
function sample(packets=30){
  const bytes=Buffer.alloc(packets*188);
  for(let i=0;i<packets;i++){bytes[i*188]=0x47;bytes[i*188+3]=0x10;}
  return bytes;
}
const data=JSON.stringify({streams:[
  {codec_type:'video',codec_name:'mpeg2video',nb_read_packets:'12'},
  {codec_type:'audio',codec_name:'mp2',nb_read_packets:'42'}
]});
const frames='#tb 0: 1/30\n0,0,0,1,1024,0x0011aabb\n0,1,1,1,1024,0x1122aabb\n0,2,2,1,1024,0x2211aabb\n';
function testArgs(setup={}){
  const calls=[];
  return {calls,args:{
    createTemp:async()=>'/tmp/blofy-owner-sample-fixture',
    write:async(p,buf,opt)=>{
      assert.equal(p,path);
      assert.equal(opt.mode,0o600);
      assert.equal(opt.flag,'wx');
      assert.ok(isMpegTsSample(buf));
      calls.push('write');
    },
    remove:async()=>calls.push('delete'),
    execute:async(binary,args)=>{
      calls.push(binary);
      if(binary==='ffprobe')return data;
      return frames;
    },
    ...setup
  }};
}
test('packet-aligned TS data accepted; bad sync, M3U and oversized files denied',()=>{
  assert.equal(isMpegTsSample(sample()),true);
  const invalid=sample();invalid[188]=0x00;
  assert.equal(isMpegTsSample(invalid),false);
  assert.equal(isMpegTsSample(Buffer.from('#EXTM3U\n...')),false);
  assert.equal(isMpegTsSample(Buffer.alloc(MAX_SAMPLE_BYTES+1)),false);
  assert.equal(isMpegTsSample(sample().subarray(0,-1)),false);
});
test('external URLs and non-generated local paths cannot enter FFmpeg argv',()=>{
  const commands=sampleCommands(path);
  assert.equal(commands.probe.binary,'ffprobe');
  assert.equal(commands.audio.binary,'ffmpeg');
  assert.equal(commands.video.binary,'ffmpeg');
  for(const cmd of Object.values(commands)){
    assert.ok(cmd.args.includes(path));
    assert.ok(!cmd.args.some(arg=>/https?:\/\/|username|password/.test(arg)));
  }
  assert.throws(()=>sampleCommands('https://source.invalid/index.ts'));
  assert.throws(()=>sampleCommands('/etc/passwd'));
});
test('owner-provided short TS is analyzed without persisting file or source info',async()=>{
  const {args,calls}=testArgs();
  const report=await analyzeOwnerTsSample(sample(),args);
  assert.equal(report.ok,true);
  assert.equal(report.code,'short_sample_decoded');
  assert.equal(report.audioCodec,'mp2');
  assert.equal(report.videoCodec,'mpeg2video');
  assert.equal(report.decodedAudio,true);
  assert.equal(report.decodedVideo,true);
  assert.equal(report.audioFrames,3);
  assert.equal(report.videoFrames,3);
  assert.equal(report.audibleSoundVerified,false);
  assert.equal(report.productionStreamVerified,false);
  assert.equal(report.sampleRetained,false);
  assert.equal(report.sourceConnectionsCreated,0);
  assert.equal(report.customerRoutesChanged,false);
  assert.deepEqual(calls,['write','ffprobe','ffmpeg','ffmpeg','delete']);
  assert.doesNotMatch(JSON.stringify(report),/\/tmp\/|password|source\.invalid/);
});
test('audio absent in a small sample is not reported as permanent silence',async()=>{
  const {args}=testArgs({execute:async(binary)=>binary==='ffprobe'?
    JSON.stringify({streams:[{codec_type:'video',codec_name:'h264',nb_read_packets:'20'}]}):frames});
  const r=await analyzeOwnerTsSample(sample(),args);
  assert.equal(r.hasAudio,false);
  assert.equal(r.decodedAudio,null);
  assert.equal(r.code,'audio_stream_not_present_in_short_sample');
  assert.equal(r.audibleSoundVerified,false);
  assert.equal(r.ok,false);
});
test('decoder failure has a distinct code while video can still decode',async()=>{
  const {args}=testArgs({execute:async(binary,argv)=>{
    if(binary==='ffprobe')return data;
    if(argv.includes('0:a:0'))throw Error('private upstream password');
    return frames;
  }});
  const r=await analyzeOwnerTsSample(sample(),args);
  assert.equal(r.code,'audio_decoder_failed_on_sample');
  assert.equal(r.decodedAudio,false);
  assert.equal(r.decodedVideo,true);
  assert.doesNotMatch(JSON.stringify(r),/private upstream|password/);
});
test('even failed FFprobe deletes temporary TS sample',async()=>{
  const {args,calls}=testArgs({execute:async()=>{throw Error('ffprobe failed with provider token')}});
  const r=await analyzeOwnerTsSample(sample(),args);
  assert.equal(r.ok,false);
  assert.equal(r.code,'sample_analysis_failed');
  assert.equal(calls.at(-1),'delete');
  assert.doesNotMatch(JSON.stringify(r),/provider token/);
});
test('TS upload request must specify bounded Content-Length and exact video/mp2t',async()=>{
  const bytes=sample();
  const mock=(headers,parts=[bytes])=>({
    headers,async *[Symbol.asyncIterator](){for(const b of parts)yield b;}
  });
  const valid=await readOwnerSampleRequest(mock({
    'content-length':String(bytes.length),'content-type':'video/mp2t'
  },[bytes.subarray(0,900),bytes.subarray(900)]));
  assert.equal(valid.ok,true);
  assert.equal(valid.bytes.length,bytes.length);
  for(const headers of [
    {'content-type':'video/mp2t'},
    {'content-length':String(bytes.length),'content-type':'application/json'},
    {'content-length':String(bytes.length),'content-type':'video/mp2t','transfer-encoding':'chunked'},
    {'content-length':String(MAX_SAMPLE_BYTES+1),'content-type':'video/mp2t'}
  ]){
    const x=await readOwnerSampleRequest(mock(headers));
    assert.equal(x.ok,false);
  }
  const wrong=await readOwnerSampleRequest(mock({
    'content-length':String(bytes.length*2),'content-type':'video/mp2t'
  }));
  assert.equal(wrong.code,'sample_length_mismatch');
});
