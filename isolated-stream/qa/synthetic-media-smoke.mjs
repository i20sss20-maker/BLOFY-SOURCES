// QA-only: generates self-contained video and AAC audio. No provider requests or customer data.
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,stat,rm} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {spawn} from 'node:child_process';

function run(program,args,timeoutMs=30000){
 return new Promise((resolve,reject)=>{
  const child=spawn(program,args,{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',settled=false;
  const timer=setTimeout(()=>{
   if(!settled){child.kill('SIGKILL');reject(Error(program+' timeout'))}
  },timeoutMs);
  child.stdout.on('data',d=>{if(stdout.length<32768)stdout+=d});
  child.stderr.on('data',d=>{if(stderr.length<32768)stderr+=d});
  child.on('error',err=>{settled=true;clearTimeout(timer);reject(err)});
  child.on('close',code=>{
   settled=true;clearTimeout(timer);
   if(code)reject(Error(program+' exit '+code+': '+stderr.slice(-1500)));
   else resolve({stdout,stderr});
  });
 });
}
const ff=['-hide_banner','-loglevel','error','-nostdin','-y'];
const video=['-f','lavfi','-i','testsrc2=size=160x90:rate=12'];
const audio=['-f','lavfi','-i','sine=frequency=440:sample_rate=44100'];
const work=await mkdtemp(path.join(tmpdir(),'blofy-synthetic-av-'));
const routes=new Map();
let server=null;
async function register(route,file){
 const size=(await stat(file)).size;
 assert.ok(size>(route.endsWith('.m3u8')?10:500),route+' empty');
 routes.set(route,{file,size});
}
function handler(req,res){
 const route=new URL(req.url,'http://127.0.0.1').pathname;
 const target=routes.get(route);
 if(!target){res.writeHead(404);return res.end()}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
 const mime=route.endsWith('.mp4')?'video/mp4':
  route.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp2t';
 const range=req.headers.range;
 let start=0,end=target.size-1,status=200;
 if(range){
  const match=/^bytes=(\d+)-(\d*)$/.exec(range);
  if(!match||Number(match[1])>=target.size){
   res.writeHead(416,{'content-range':'bytes */'+target.size});return res.end();
  }
  start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;
  if(end<start){res.writeHead(416);return res.end()}
  status=206;
 }
 const headers={'content-type':mime,'content-length':end-start+1,
   'accept-ranges':'bytes','cache-control':'no-store'};
 if(status===206)headers['content-range']='bytes '+start+'-'+end+'/'+target.size;
 res.writeHead(status,headers);
 if(req.method==='HEAD')return res.end();
 const input=createReadStream(target.file,{start,end});
 input.on('error',()=>res.destroy());input.pipe(res);
}
try{
 const movie=path.join(work,'movie.mp4'),episode=path.join(work,'episode.mp4');
 const live=path.join(work,'live.ts'),hlsDir=path.join(work,'hls');
 await mkdir(hlsDir);
 const hls=path.join(hlsDir,'index.m3u8');
 for(const [file,freq] of [[movie,440],[episode,550]]){
  await run('ffmpeg',[...ff,...video,'-f','lavfi','-i',
   'sine=frequency='+freq+':sample_rate=44100',
   '-t','2.5','-c:v','mpeg4','-q:v','9','-c:a','aac',
   '-b:a','48k','-movflags','+faststart',file]);
 }
 await run('ffmpeg',[...ff,...video,...audio,'-t','2.5',
   '-c:v','mpeg2video','-g','12','-c:a','aac','-b:a','48k',
   '-f','mpegts',live]);
 await run('ffmpeg',[...ff,...video,...audio,'-t','3',
   '-c:v','mpeg2video','-g','12','-c:a','aac','-b:a','48k',
   '-f','hls','-hls_time','1','-hls_list_size','0',
   '-hls_playlist_type','vod','-hls_segment_filename',
   path.join(hlsDir,'segment%d.ts'),hls]);
 await Promise.all([
  register('/movie.mp4',movie),
  register('/series/1/episode/1.mp4',episode),
  register('/live.ts',live),register('/hls/index.m3u8',hls)
 ]);
 for(let i=0;i<10;i++){
  const file=path.join(hlsDir,'segment'+i+'.ts');
  if(await stat(file).catch(()=>null))await register('/hls/segment'+i+'.ts',file);
 }
 server=http.createServer(handler);
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 const seek=await fetch(base+'/movie.mp4',{headers:{range:'bytes=128-511'}});
 assert.equal(seek.status,206);
 assert.match(seek.headers.get('content-range'),/^bytes 128-511\//);
 assert.equal((await seek.arrayBuffer()).byteLength,384);
 const invalid=await fetch(base+'/movie.mp4',{headers:{range:'bytes=999999999-'}});
 assert.equal(invalid.status,416);await invalid.arrayBuffer();
 for(const [route,label] of [
  ['/live.ts','live TS'],['/hls/index.m3u8','HLS'],
  ['/movie.mp4','VOD movie'],['/series/1/episode/1.mp4','series episode']
 ]){
  const url=base+route;
  const probe=await run('ffprobe',['-v','error','-show_entries',
   'stream=codec_type,codec_name','-of','json',url]);
  const streams=JSON.parse(probe.stdout).streams||[];
  assert.ok(streams.some(s=>s.codec_type==='video'),label+' video missing');
  assert.ok(streams.some(s=>s.codec_type==='audio'&&s.codec_name==='aac'),
   label+' AAC audio missing');
  await run('ffmpeg',['-hide_banner','-v','error','-nostdin',
   '-i',url,'-map','0:v:0','-map','0:a:0','-t','1','-f','null','-']);
  process.stdout.write('PASS '+label+': decoded video + AAC from local HTTP\n');
 }
 process.stdout.write('PASS movie seek: HTTP 206, range bounds, and rejection 416\n');
 process.stdout.write('NOT VERIFIED: Android 9 hardware audio, authorized source, deployed services\n');
}finally{
 if(server){server.closeAllConnections();await new Promise(ok=>server.close(ok));}
 await rm(work,{recursive:true,force:true});
}
