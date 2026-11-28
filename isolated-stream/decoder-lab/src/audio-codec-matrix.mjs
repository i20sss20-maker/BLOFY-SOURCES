// Separate, deterministic synthetic audio decode matrix. No provider URLs,
// user-selected codec, uploaded file or input data ever reaches a process.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {framecrcCount} from './decoder.mjs';

const execAsync=promisify(execFile);
export const MATRIX_CODECS=Object.freeze(['aac','ac3','eac3']);
const LOCAL=/^\/tmp\/blofy-matrix-[A-Za-z0-9_-]+\/(aac|ac3|eac3)\.ts$/;
const MAX_FILE_BYTES=900_000;
const safePackets=v=>Number.isSafeInteger(v)&&v>0&&v<=100000?v:null;

export function matrixCommands(path,codec){
  if(!MATRIX_CODECS.includes(codec)||!LOCAL.test(path)||
    !path.endsWith('/'+codec+'.ts'))throw Error('invalid_synthetic_codec_fixture');
  return {
    generate:{binary:'ffmpeg',args:[
      '-hide_banner','-nostdin','-loglevel','error','-y',
      '-f','lavfi','-i','sine=frequency=440:sample_rate=48000',
      '-t','1.2','-threads','1','-c:a',codec,'-b:a','96k',
      '-f','mpegts',path
    ]},
    probe:{binary:'ffprobe',args:[
      '-v','error','-count_packets',
      '-show_entries','stream=codec_type,codec_name,nb_read_packets',
      '-of','json',path
    ]},
    decode:{binary:'ffmpeg',args:[
      '-hide_banner','-nostdin','-loglevel','error','-xerror',
      '-threads','1','-i',path,'-map','0:a:0',
      '-frames:a','8','-f','framecrc','pipe:1'
    ]}
  };
}
export function verifyMatrixProbe(data,codec){
  if(typeof data!=='string'||data.length>32768||!MATRIX_CODECS.includes(codec))
    return null;
  try{
    const parsed=JSON.parse(data);
    if(!Array.isArray(parsed?.streams)||parsed.streams.length!==1)return null;
    const row=parsed.streams[0];
    if(row.codec_type!=='audio'||row.codec_name!==codec)return null;
    return safePackets(Number(row.nb_read_packets));
  }catch{return null}
}
async function execute(binary,args){
  const {stdout}=await execAsync(binary,args,{
    timeout:15000,killSignal:'SIGKILL',encoding:'utf8',
    maxBuffer:32768,env:{PATH:process.env.PATH||'/usr/bin:/bin'}
  });
  return stdout;
}
export async function runSyntheticAudioMatrix({
  executeCommand=execute,
  makeTemp=()=>mkdtemp(join(tmpdir(),'blofy-matrix-')),
  getStat=stat,remove=rm
}={}){
  let directory=null;
  const tests=[];
  try{
    directory=await makeTemp();
    for(const codec of MATRIX_CODECS){
      const result={codec,ok:false,stage:'generation',audioDecoded:false,
        audioFrames:0,observedPackets:null,code:null};
      tests.push(result);
      const commands=matrixCommands(join(directory,codec+'.ts'),codec);
      try{
        await executeCommand(commands.generate.binary,commands.generate.args);
        const f=await getStat(join(directory,codec+'.ts'));
        if(!f?.isFile?.()||f.size<188*2||f.size>MAX_FILE_BYTES)
          throw Error('invalid_fixture_size');
        result.stage='probe';
        const packets=verifyMatrixProbe(await executeCommand(commands.probe.binary,commands.probe.args),codec);
        if(packets===null)throw Error('missing_audio_packets');
        result.observedPackets=packets;
        result.stage='decode';
        const frames=framecrcCount(await executeCommand(commands.decode.binary,commands.decode.args));
        if(frames<2)throw Error('no_audio_frames');
        result.stage='complete';result.ok=true;result.audioDecoded=true;
        result.audioFrames=frames;
      }catch{
        result.code=result.stage==='generation'?'synthetic_generation_failed':
          result.stage==='probe'?'synthetic_probe_failed':'synthetic_decode_failed';
      }
    }
  }catch{
    // On failure to create a temporary directory, report all codecs as
    // unavailable rather than pretending that the sample was decoded.
    for(const codec of MATRIX_CODECS)if(!tests.some(t=>t.codec===codec))
      tests.push({codec,ok:false,stage:'unavailable',audioDecoded:false,
        audioFrames:0,observedPackets:null,code:'synthetic_worker_unavailable'});
  }finally{
    if(directory!==null)try{await remove(directory,{recursive:true,force:true})}catch{}
  }
  return {
    scope:'synthetic_local_only',sourceContentTested:false,
    productionStreamVerified:false,customerRoutesChanged:false,
    codecsPlanned:MATRIX_CODECS.length,
    codecsDecoded:tests.filter(t=>t.ok&&t.audioDecoded).length,
    allVerified:tests.length===MATRIX_CODECS.length&&tests.every(t=>t.ok&&t.audioDecoded),
    tests
  };
}
