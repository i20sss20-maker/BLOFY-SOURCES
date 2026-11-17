// Isolated, synthetic-only FFmpeg decoder acceptance test.
// This module never accepts arbitrary URLs, provider credentials, or file paths.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const execAsync=promisify(execFile);
const BINARY_TIMEOUT_MS=18_000;
const ALLOWED_AUDIO=new Set(['mp2','aac','ac3','eac3']);
const ALLOWED_VIDEO=new Set(['mpeg2video','h264','hevc']);
const MAX_FIXTURE_BYTES=2_000_000;
const STATUS=['generation','probe','decode_video','decode_audio'];
const safeInt=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max?value:null;
export function framecrcCount(output){
  if(typeof output!=='string'||output.length>32768)return 0;
  return output.split('\n').filter(line=>/^\s*\d+,\s*-?\d+,\s*-?\d+,\s*\d+,\s*\d+,\s*0x[a-f0-9]{8}/i.test(line)).length;
}
export function inspectProbeOutput(output){
  if(typeof output!=='string'||output.length>32768)return {valid:false};
  let parsed;
  try{parsed=JSON.parse(output)}catch{return {valid:false}}
  if(!Array.isArray(parsed?.streams)||parsed.streams.length>8)return {valid:false};
  const video=parsed.streams.filter(s=>s.codec_type==='video'&&ALLOWED_VIDEO.has(s.codec_name));
  const audio=parsed.streams.filter(s=>s.codec_type==='audio'&&ALLOWED_AUDIO.has(s.codec_name));
  if(video.length!==1||audio.length!==1)return {valid:false};
  return {
    valid:true,videoCodec:video[0].codec_name,audioCodec:audio[0].codec_name,
    videoPackets:safeInt(Number(video[0].nb_read_packets),100_000),
    audioPackets:safeInt(Number(audio[0].nb_read_packets),100_000)
  };
}
export function buildSyntheticCommands(localFile){
  if(typeof localFile!=='string'||!/^\/tmp\/blofy-decoder-[a-zA-Z0-9_-]+\/synthetic\.ts$/.test(localFile))
    throw Error('invalid_local_fixture_path');
  return {
    generate:{binary:'ffmpeg',args:[
      '-hide_banner','-nostdin','-loglevel','error','-y',
      '-f','lavfi','-i','testsrc2=size=160x90:rate=10',
      '-f','lavfi','-i','sine=frequency=440:sample_rate=16000',
      '-t','1.4','-threads','1','-filter_threads','1',
      '-c:v','mpeg2video','-b:v','250k',
      '-c:a','mp2','-b:a','64k','-shortest','-f','mpegts',localFile
    ]},
    probe:{binary:'ffprobe',args:[
      '-v','error','-count_packets','-show_entries',
      'stream=codec_type,codec_name,nb_read_packets','-of','json',localFile
    ]},
    video:{binary:'ffmpeg',args:[
      '-hide_banner','-nostdin','-loglevel','error','-xerror',
      '-threads','1','-i',localFile,
      '-map','0:v:0','-frames:v','8','-f','framecrc','pipe:1'
    ]},
    audio:{binary:'ffmpeg',args:[
      '-hide_banner','-nostdin','-loglevel','error','-xerror',
      '-threads','1','-i',localFile,
      '-map','0:a:0','-frames:a','8','-f','framecrc','pipe:1'
    ]}
  };
}
async function runProcess(binary,args){
  const {stdout}=await execAsync(binary,args,{
    encoding:'utf8',timeout:BINARY_TIMEOUT_MS,killSignal:'SIGKILL',
    maxBuffer:32768,windowsHide:true,env:{PATH:process.env.PATH||'/usr/bin:/bin'}
  });
  return stdout;
}
export async function runSyntheticDecoder({
  execute=runProcess,createTemp=()=>mkdtemp(join(tmpdir(),'blofy-decoder-')),
  fileStat=stat,cleanup=rm,now=Date.now
}={}){
  const started=now();
  let dir=null,stage='generation';
  try{
    dir=await createTemp();
    const file=join(dir,'synthetic.ts');
    const commands=buildSyntheticCommands(file);
    await execute(commands.generate.binary,commands.generate.args);
    const details=await fileStat(file);
    if(!details.isFile()||details.size<188*5||details.size>MAX_FIXTURE_BYTES)
      throw Error('synthetic_size_invalid');
    stage='probe';
    const probed=inspectProbeOutput(await execute(commands.probe.binary,commands.probe.args));
    if(!probed.valid||!probed.audioPackets||!probed.videoPackets)
      throw Error('synthetic_probe_missing_streams');
    stage='decode_video';
    const videoFrames=framecrcCount(await execute(commands.video.binary,commands.video.args));
    if(videoFrames<2)throw Error('synthetic_video_decode_failed');
    stage='decode_audio';
    const audioFrames=framecrcCount(await execute(commands.audio.binary,commands.audio.args));
    if(audioFrames<2)throw Error('synthetic_audio_decode_failed');
    return {
      ok:true,scope:'synthetic_local_only',stage:'complete',
      mediaSource:'generated_lavfi',providerConnections:0,
      userUploadsAccepted:false,customerRoutesChanged:false,
      audioDecoderExecuted:true,videoDecoderExecuted:true,
      audioCodec:probed.audioCodec,videoCodec:probed.videoCodec,
      audioFrames,videoFrames,
      audioPackets:probed.audioPackets,videoPackets:probed.videoPackets,
      bytesTested:details.size,
      elapsedMs:safeInt(Math.max(0,now()-started),180000),
      productionStreamVerified:false,
      result:'synthetic_audio_video_decoded'
    };
  }catch(error){
    const codes={
      generation:'synthetic_generation_failed',probe:'synthetic_probe_failed',
      decode_video:'synthetic_video_decode_failed',
      decode_audio:'synthetic_audio_decode_failed'
    };
    return {
      ok:false,scope:'synthetic_local_only',stage:STATUS.includes(stage)?stage:'unknown',
      code:codes[stage]||'synthetic_decode_failed',
      audioDecoderExecuted:false,videoDecoderExecuted:false,
      productionStreamVerified:false,providerConnections:0,customerRoutesChanged:false,
      elapsedMs:safeInt(Math.max(0,now()-started),180000)
    };
  }finally{
    if(dir!==null)try{await cleanup(dir,{recursive:true,force:true})}catch{}
  }
}
