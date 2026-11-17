// One manually approved, short MPEG-TS sample: no arbitrary URLs, uploads
// stored after the request, or production stream playback changes.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {framecrcCount} from './decoder.mjs';

export const MAX_SAMPLE_BYTES=2_000_000;
const MIN_PACKETS=12;
const TS_SIZE=188;
const ALLOWED_AUDIO=new Set(['aac','ac3','eac3','mp2','mp3','opus','dts','truehd','pcm_s16le']);
const ALLOWED_VIDEO=new Set(['h264','hevc','mpeg2video','mpeg4','av1','vp9']);
const execAsync=promisify(execFile);
const integer=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max?value:null;
const samplePath=p=>typeof p==='string'&&
  /^\/tmp\/blofy-owner-sample-[A-Za-z0-9_-]+\/sample\.ts$/.test(p);

export function isMpegTsSample(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<MIN_PACKETS*TS_SIZE||
    bytes.length>MAX_SAMPLE_BYTES||bytes.length%TS_SIZE!==0)return false;
  // Deny HLS text playlists, arbitrary files and malformed packet alignment.
  const n=Math.min(bytes.length/TS_SIZE,48);
  for(let i=0;i<n;i++){
    const j=i*TS_SIZE;
    if(bytes[j]!==0x47)return false;
    const af=(bytes[j+3]&0x30)>>>4;
    if(af===0)return false;
  }
  return true;
}
export function classifySampleStreams(json){
  if(typeof json!=='string'||json.length>32768)return null;
  let parsed;
  try{parsed=JSON.parse(json)}catch{return null}
  const rows=parsed?.streams;
  if(!Array.isArray(rows)||rows.length>24)return null;
  const audio=rows.filter(s=>s?.codec_type==='audio');
  const video=rows.filter(s=>s?.codec_type==='video');
  if(audio.length>8||video.length>8)return null;
  const firstAudio=audio[0]||null,firstVideo=video[0]||null;
  const codec=(row,allowed)=>row&&allowed.has(row.codec_name)?row.codec_name:null;
  return {
    hasAudio:audio.length>0,hasVideo:video.length>0,
    audioCodec:codec(firstAudio,ALLOWED_AUDIO),
    videoCodec:codec(firstVideo,ALLOWED_VIDEO),
    audioPackets:integer(Number(firstAudio?.nb_read_packets),100000),
    videoPackets:integer(Number(firstVideo?.nb_read_packets),100000),
    audioStreamCount:audio.length,videoStreamCount:video.length,
    // This distinguishes 'absent in sample' from 'no sound on device'.
    audioAbsentInSample:audio.length===0
  };
}
export function sampleCommands(path){
  if(!samplePath(path))throw Error('invalid_local_sample_path');
  const shared=['-hide_banner','-nostdin','-loglevel','error'];
  const input=['-protocol_whitelist','file','-f','mpegts','-i',path];
  return {
    probe:{binary:'ffprobe',args:[
      '-v','error','-protocol_whitelist','file',
      '-f','mpegts','-probesize','1000000','-analyzeduration','1500000',
      '-count_packets','-show_entries',
      'stream=codec_type,codec_name,nb_read_packets',
      '-of','json',path
    ]},
    audio:{binary:'ffmpeg',args:[...shared,'-xerror',
      '-threads','1',...input,'-map','0:a:0',
      '-frames:a','8','-f','framecrc','pipe:1']},
    video:{binary:'ffmpeg',args:[...shared,'-xerror',
      '-threads','1',...input,'-map','0:v:0',
      '-frames:v','8','-f','framecrc','pipe:1']}
  };
}
async function run(binary,args){
  const {stdout}=await execAsync(binary,args,{
    encoding:'utf8',timeout:12000,killSignal:'SIGKILL',
    maxBuffer:32768,env:{PATH:process.env.PATH||'/usr/bin:/bin'}
  });
  return stdout;
}
const base={
  scope:'approved_short_ts_sample',productionStreamVerified:false,
  androidPlaybackVerified:false,windowsPlaybackVerified:false,
  audibleSoundVerified:false,customerRoutesChanged:false,
  sourceConnectionsCreated:0,providerUrlsAccepted:false,
  sampleRetained:false,automaticSourceFetch:false
};
export async function analyzeOwnerTsSample(bytes,{
  createTemp=()=>mkdtemp(join(tmpdir(),'blofy-owner-sample-')),
  write=writeFile,remove=rm,execute=run,now=Date.now
}={}){
  const start=now();
  if(!isMpegTsSample(bytes))return {
    ...base,ok:false,code:'invalid_mpegts_sample',
    recommendation:'صدّر مقطع TS قصيرًا من مصدر تملك حق اختباره، دون رفع ملف M3U أو رابط Xtream.'
  };
  let directory=null,stage='sample';
  try{
    directory=await createTemp();
    const localFile=join(directory,'sample.ts');
    const commands=sampleCommands(localFile);
    await write(localFile,bytes,{mode:0o600,flag:'wx'});
    stage='probe';
    const info=classifySampleStreams(await execute(
      commands.probe.binary,commands.probe.args
    ));
    if(info===null)throw Error('probe_invalid');
    // Missing streams are accurately recorded, not treated as decode errors.
    let decodedAudio=null,decodedVideo=null;
    let audioFrames=null,videoFrames=null;
    if(info.hasAudio){
      stage='audio_decode';
      try{
        audioFrames=framecrcCount(await execute(
          commands.audio.binary,commands.audio.args
        ));
        decodedAudio=audioFrames>=2;
      }catch{decodedAudio=false;audioFrames=0;}
    }
    if(info.hasVideo){
      stage='video_decode';
      try{
        videoFrames=framecrcCount(await execute(
          commands.video.binary,commands.video.args
        ));
        decodedVideo=videoFrames>=2;
      }catch{decodedVideo=false;videoFrames=0;}
    }
    const code=!info.hasAudio?'audio_stream_not_present_in_short_sample':
      decodedAudio===false?'audio_decoder_failed_on_sample':
      info.audioCodec===null?'audio_codec_unrecognized':
      info.hasVideo&&decodedVideo===false?'video_decoder_failed_on_sample':
      'short_sample_decoded';
    return {
      ...base,ok:code==='short_sample_decoded',code,
      bytesExamined:bytes.length,stage:'complete',
      ...info,decodedAudio,decodedVideo,audioFrames,videoFrames,
      elapsedMs:integer(Math.max(0,now()-start),120000),
      audioMeaning:info.hasAudio?
        'الترميز/فك الصوت يتعلق بهذه العينة فقط ولا يؤكد سماع الصوت في Android.':
        'لم يعلن الملف القصير صوتًا؛ لا يعني ذلك غياب الصوت عن القناة بالكامل.',
      recommendation:code==='short_sample_decoded'?
        'افحص الملف نفسه على Android 9 وWindows لتحديد فرق مشغل التطبيق.':
        code==='audio_decoder_failed_on_sample'?
        'راجع الترميز أو تلف العينة؛ لا تغيّر بث المشتركين تلقائيًا.':
        'راجع بيانات TS ومدّة العينة، وكرر يدويًا إن كان المصدر يسمح.'
    };
  }catch{
    return {...base,ok:false,stage,code:'sample_analysis_failed',
      recommendation:'تعذر تحليل الملف القصير بأمان؛ راجع صيغة TS أو سجلات المختبر.'};
  }finally{
    if(directory)try{await remove(directory,{recursive:true,force:true})}catch{}
  }
}
