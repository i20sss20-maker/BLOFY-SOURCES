import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSyntheticCommands,framecrcCount,inspectProbeOutput,runSyntheticDecoder}
  from '../src/decoder.mjs';
const file='/tmp/blofy-decoder-abc123/synthetic.ts';
const frame='#software: Lavf\n#tb 0: 1/10\n0,0,0,1,1024,0x0011aabb\n0,1,1,1,1024,0x1122aabb\n0,2,2,1,1024,0x2211aabb\n';
const streamInfo=JSON.stringify({streams:[
  {codec_type:'video',codec_name:'mpeg2video',nb_read_packets:'15'},
  {codec_type:'audio',codec_name:'mp2',nb_read_packets:'35'}
]});
function fixture(){
  const called=[];
  const opts={
    createTemp:async()=>'/tmp/blofy-decoder-abc123',
    fileStat:async()=>({isFile:()=>true,size:155000}),
    cleanup:async()=>{called.push('cleanup')},
    execute:async(binary,args)=>{
      called.push({binary,args});
      if(binary==='ffprobe')return streamInfo;
      if(args.includes('framecrc'))return frame;
      return '';
    },now:()=>1000
  };
  return {called,opts};
}
test('hardcoded commands accept only local generated /tmp fixture',()=>{
  const commands=buildSyntheticCommands(file);
  for(const c of Object.values(commands)){
    assert.match(c.binary,/^ffmpeg|ffprobe$/);
    assert.equal(c.args.includes(file),true);
    assert.ok(!c.args.some(x=>/https?:\/\/|ftp:|file:\/\//.test(x)));
  }
  assert.throws(()=>buildSyntheticCommands('https://provider.invalid/auth'),/invalid_local_fixture/);
  assert.throws(()=>buildSyntheticCommands('/etc/passwd'),/invalid_local_fixture/);
});
test('framecrc verifies actual frame rows, not headers or decoders merely starting',()=>{
  assert.equal(framecrcCount(frame),3);
  assert.equal(framecrcCount('#software: yes\n#tb 0: 1/10\n'),0);
  assert.equal(framecrcCount({}),0);
});
test('FFprobe must show one recognized audio and video stream',()=>{
  assert.deepEqual(inspectProbeOutput(streamInfo),{
    valid:true,videoCodec:'mpeg2video',audioCodec:'mp2',
    videoPackets:15,audioPackets:35
  });
  assert.equal(inspectProbeOutput('not json').valid,false);
  assert.equal(inspectProbeOutput(JSON.stringify({streams:[
    {codec_type:'video',codec_name:'mpeg2video'},
    {codec_type:'audio',codec_name:'evil-proprietary'}
  ]})).valid,false);
});
test('synthetic worker requires generated file size and decoded frames from both streams',async()=>{
  const {called,opts}=fixture();
  const report=await runSyntheticDecoder(opts);
  assert.equal(report.ok,true);
  assert.equal(report.result,'synthetic_audio_video_decoded');
  assert.equal(report.audioDecoderExecuted,true);
  assert.equal(report.videoDecoderExecuted,true);
  assert.equal(report.audioFrames,3);
  assert.equal(report.videoFrames,3);
  assert.equal(report.audioPackets,35);
  assert.equal(report.productionStreamVerified,false);
  assert.equal(report.providerConnections,0);
  assert.equal(report.customerRoutesChanged,false);
  assert.equal(called.filter(c=>typeof c==='object').length,4);
  assert.equal(called.at(-1),'cleanup');
  assert.doesNotMatch(JSON.stringify(report),/\/tmp|provider.invalid/);
});
test('audio-only and video-only evidence must not falsely verify both',async()=>{
  const {opts}=fixture();
  opts.execute=async(binary,args)=>{
    if(binary==='ffprobe')return streamInfo;
    if(args.includes('framecrc')&&args.includes('0:a:0'))return '#tb 0: 1/10';
    if(args.includes('framecrc'))return frame;
    return '';
  };
  const report=await runSyntheticDecoder(opts);
  assert.equal(report.ok,false);
  assert.equal(report.code,'synthetic_audio_decode_failed');
  assert.equal(report.audioDecoderExecuted,false);
  assert.equal(report.productionStreamVerified,false);
});
test('missing output and raised process errors fail closed without exposing path or logs',async()=>{
  const {opts}=fixture();
  opts.execute=async()=>{throw new Error('upstream password=supersecret /tmp/source')};
  const report=await runSyntheticDecoder(opts);
  assert.equal(report.ok,false);
  assert.equal(report.code,'synthetic_generation_failed');
  assert.doesNotMatch(JSON.stringify(report),/supersecret|upstream|source/);
});
test('oversized synthetic output fails without invoking decoders',async()=>{
  const {opts}=fixture();
  opts.fileStat=async()=>({isFile:()=>true,size:5_000_000});
  let commands=0;
  opts.execute=async()=>{commands++;return ''};
  const result=await runSyntheticDecoder(opts);
  assert.equal(result.ok,false);
  assert.equal(result.stage,'generation');
  assert.equal(commands,1);
});
