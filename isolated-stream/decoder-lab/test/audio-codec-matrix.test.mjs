import test from 'node:test';
import assert from 'node:assert/strict';
import {MATRIX_CODECS,matrixCommands,verifyMatrixProbe,runSyntheticAudioMatrix}
  from '../src/audio-codec-matrix.mjs';
const base='/tmp/blofy-matrix-testsafe';
const mkProbe=(codec)=>JSON.stringify({streams:[{
  codec_type:'audio',codec_name:codec,nb_read_packets:'25'
}]});
const crc='#tb 0: 1/48000\n0,0,0,1,2048,0x11223344\n0,1,1,1,2048,0x11223355\n0,2,2,1,2048,0x11223366\n';
function fakeOptions(calls,override={}){
  return {
    makeTemp:async()=>base,
    getStat:async()=>({isFile:()=>true,size:35000}),
    remove:async()=>{calls.push({kind:'cleanup'})},
    executeCommand:async(binary,args)=>{
      const codec=MATRIX_CODECS.find(c=>args.some(a=>a===base+'/'+c+'.ts'));
      calls.push({binary,codec,args});
      if(binary==='ffprobe')return mkProbe(codec);
      if(args.includes('framecrc'))return crc;
      return '';
    },...override
  };
}
test('only three fixed synthetic audio codecs and local generated TS files are allowed',()=>{
  assert.deepEqual(MATRIX_CODECS,['aac','ac3','eac3']);
  for(const codec of MATRIX_CODECS){
    const commands=matrixCommands(base+'/'+codec+'.ts',codec);
    assert.equal(commands.generate.binary,'ffmpeg');
    assert.ok(commands.generate.args.includes(codec));
    for(const {args} of Object.values(commands)){
      assert.ok(args.includes(base+'/'+codec+'.ts'));
      assert.ok(!args.some(a=>/https?:\/\/|username|password/.test(a)));
    }
  }
  assert.throws(()=>matrixCommands('http://malicious.invalid/test.ts','aac'));
  assert.throws(()=>matrixCommands(base+'/eac3.ts','aac'));
  assert.throws(()=>matrixCommands(base+'/aac.ts','illegal_codec'));
});
test('ffprobe must identify the expected codec and positive packets',()=>{
  assert.equal(verifyMatrixProbe(mkProbe('aac'),'aac'),25);
  assert.equal(verifyMatrixProbe(mkProbe('ac3'),'aac'),null);
  assert.equal(verifyMatrixProbe('not-json','aac'),null);
  assert.equal(verifyMatrixProbe(JSON.stringify({streams:[]}),'aac'),null);
  assert.equal(verifyMatrixProbe(JSON.stringify({streams:[{
    codec_type:'audio',codec_name:'aac',nb_read_packets:'0'
  }]}),'aac'),null);
});
test('all three codecs independently perform generate probe and decode',async()=>{
  const calls=[];
  const report=await runSyntheticAudioMatrix(fakeOptions(calls));
  assert.equal(report.allVerified,true);
  assert.equal(report.codecsPlanned,3);
  assert.equal(report.codecsDecoded,3);
  assert.deepEqual(report.tests.map(t=>t.codec),MATRIX_CODECS);
  assert.ok(report.tests.every(t=>t.ok&&t.audioDecoded&&t.audioFrames===3));
  assert.equal(report.productionStreamVerified,false);
  assert.equal(report.sourceContentTested,false);
  assert.equal(report.customerRoutesChanged,false);
  assert.equal(calls.filter(c=>c.kind!=='cleanup').length,9);
  assert.equal(calls.at(-1).kind,'cleanup');
  assert.doesNotMatch(JSON.stringify(report),/tmp|username|password/);
});
test('one failed audio decoder does not hide other results or report all verified',async()=>{
  const calls=[];
  const opts=fakeOptions(calls,{});
  const original=opts.executeCommand;
  opts.executeCommand=async(binary,args)=>{
    if(args.includes('framecrc')&&args.includes(base+'/ac3.ts'))return '#no frames';
    return original(binary,args);
  };
  const result=await runSyntheticAudioMatrix(opts);
  assert.equal(result.allVerified,false);
  assert.equal(result.codecsDecoded,2);
  assert.equal(result.tests.find(r=>r.codec==='ac3').code,'synthetic_decode_failed');
  assert.ok(result.tests.find(r=>r.codec==='aac').ok);
  assert.ok(result.tests.find(r=>r.codec==='eac3').ok);
  assert.equal(calls.at(-1).kind,'cleanup');
});
test('oversized generated fixture fails only that codec with no decoding',async()=>{
  let decodes=0;
  const opts=fakeOptions([],{getStat:async path=>({
    isFile:()=>true,size:path.includes('/aac.ts')?2000000:30000
  })});
  const original=opts.executeCommand;
  opts.executeCommand=async(binary,args)=>{
    if(args.includes('framecrc'))decodes++;
    return original(binary,args);
  };
  const result=await runSyntheticAudioMatrix(opts);
  assert.equal(result.tests[0].stage,'generation');
  assert.equal(result.tests[0].ok,false);
  assert.equal(decodes,2);
  assert.equal(result.codecsDecoded,2);
});
test('errors and missing temp dir are sanitized and never pass as decoder success',async()=>{
  const report=await runSyntheticAudioMatrix({
    makeTemp:async()=>{throw Error('private password /tmp/upstream')},
    executeCommand:async()=>{throw Error('should not run')}
  });
  assert.equal(report.allVerified,false);
  assert.equal(report.codecsDecoded,0);
  assert.equal(report.tests.length,3);
  assert.ok(report.tests.every(x=>x.code==='synthetic_worker_unavailable'));
  assert.doesNotMatch(JSON.stringify(report),/password|upstream/);
});
