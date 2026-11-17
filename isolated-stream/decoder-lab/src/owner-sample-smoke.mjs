// Real container smoke for the owner-sample path. Generates a local TS.
// No external media, credentials, uploaded bytes or provider connections.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {analyzeOwnerTsSample} from './owner-ts-sample.mjs';
const exec=promisify(execFile);
const dir=await mkdtemp('/tmp/blofy-smoke-');
try{
  const file=join(dir,'fixture.ts');
  await exec('ffmpeg',[
    '-hide_banner','-nostdin','-loglevel','error','-y',
    '-f','lavfi','-i','testsrc2=size=160x90:rate=10',
    '-f','lavfi','-i','sine=frequency=440:sample_rate=16000',
    '-t','1.4','-threads','1','-filter_threads','1',
    '-c:v','mpeg2video','-b:v','250k','-c:a','mp2','-b:a','64k',
    '-shortest','-f','mpegts',file
  ],{timeout:18000,maxBuffer:8192});
  const bytes=await readFile(file);
  const result=await analyzeOwnerTsSample(bytes);
  console.log(JSON.stringify({
    event:'short_owner_ts_smoke',scope:result.scope,
    ok:result.ok,code:result.code,decodedAudio:result.decodedAudio,
    decodedVideo:result.decodedVideo,audioFrames:result.audioFrames,
    videoFrames:result.videoFrames
  }));
  if(result.ok!==true||result.decodedAudio!==true||
    result.decodedVideo!==true||result.sampleRetained!==false)
    process.exitCode=1;
}finally{await rm(dir,{recursive:true,force:true})}
