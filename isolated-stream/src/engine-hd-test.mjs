// Fixed synthetic test media only. No remote URL handling, account or provider access.
import {createReadStream,statSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';
const HOST='engine.blofyplayer.com';
const EPOCH=Date.UTC(2026,0,1),WINDOW=6,RETENTION=18,STEP=4000;
function liveSequence(now){return Math.max(WINDOW-1,Math.floor((now-EPOCH)/STEP)-1);}
// A new discontinuity is needed only at the 24-second fixture loop boundary,
// not at every segment. The original encoded A/V timeline stays intact.
export function qualityLiveManifest(now){
 const last=liveSequence(now),first=last-WINDOW+1;
 const lines=['#EXTM3U','#EXT-X-VERSION:3','#EXT-X-TARGETDURATION:4',
  '#EXT-X-MEDIA-SEQUENCE:'+first,'#EXT-X-DISCONTINUITY-SEQUENCE:'+Math.floor(first/6),
  '#EXT-X-INDEPENDENT-SEGMENTS'];
 for(let n=first;n<=last;n++){
  if(n!==first&&n%6===0)lines.push('#EXT-X-DISCONTINUITY');
  lines.push('#EXTINF:4.000,','seg-'+n+'.ts');
 }
 return Buffer.from(lines.join('\n')+'\n');
}
export function createEngineHdTest({root='/app/engine-fixtures',now=Date.now,maxActiveReads=16}={}){
 let activeReads=0;
 const files=new Map();
 for(const channel of ['hd','fhd']){
  try{
   const dir=join(root,channel),manifest=readFileSync(join(dir,'index.m3u8'),'utf8');
   const refs=manifest.split(/\r?\n/).filter(x=>x&&!x.startsWith('#'));
   if(!manifest.startsWith('#EXTM3U')||!manifest.includes('#EXT-X-ENDLIST')||refs.length!==6||
       refs.some(x=>!/^seg-00[0-5]\.ts$/.test(x))||new Set(refs).size!==6)continue;
   const entries=new Map();
   for(const name of ['index.m3u8',...refs]){
    const file=join(dir,name),stat=statSync(file);
    if(!stat.isFile()||stat.size<1||stat.size>16*1024*1024)throw Error('fixture unavailable');
    entries.set('/engine/quality/'+channel+'/'+name,{file,size:stat.size,mime:name.endsWith('.ts')?'video/mp2t':'application/vnd.apple.mpegurl'});
   }
   for(const [key,value] of entries)files.set(key,value);
  }catch{}
 }
 const playlist=Buffer.from('#EXTM3U\n'+['hd','fhd'].filter(c=>files.has('/engine/quality/'+c+'/index.m3u8')).map(c=>'#EXTINF:24,BLOFY '+c.toUpperCase()+' audio and video test\nhttps://'+HOST+'/engine/quality/'+c+'/index.m3u8').join('\n')+'\n');
 return function handle(req,res){
  if(String(req.headers.host||'').toLowerCase().replace(/:443$/,'')!==HOST)return false;
  let entry=files.get(req.url),list=req.url==='/engine/quality/test.m3u';
  const live=/^\/engine\/quality-live\/(hd|fhd)\/(index\.m3u8|seg-([0-9]{1,10})\.ts)$/.exec(req.url||'');
  if(!entry&&!list&&!live)return false;
  const h={'cache-control':'public, max-age=60','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{...h,allow:'GET, HEAD'});res.end();return true;}
  if(live){
   const channel=live[1],prefix='/engine/quality/'+channel+'/';
   if(!files.has(prefix+'index.m3u8')){
    res.writeHead(503,{...h,'cache-control':'no-store'});res.end();return true;
   }
   if(live[2]==='index.m3u8'){
    const body=qualityLiveManifest(now());
    res.writeHead(200,{...h,'cache-control':'no-store','content-type':'application/vnd.apple.mpegurl','content-length':body.length});
    res.end(req.method==='HEAD'?undefined:body);return true;
   }
   const seq=Number(live[3]),last=liveSequence(now());
   if(seq>last||seq<Math.max(0,last-RETENTION+1)){
    res.writeHead(404,{...h,'cache-control':'no-store'});res.end();return true;
   }
   entry=files.get(prefix+'seg-'+String(seq%6).padStart(3,'0')+'.ts');
  }
  if(list){
   res.writeHead(files.size?200:503,{...h,'content-type':'audio/x-mpegurl; charset=utf-8','content-length':playlist.length});
   res.end(req.method==='HEAD'?undefined:playlist);return true;
  }
  if(req.method==='GET'&&activeReads>=maxActiveReads){res.writeHead(429,{...h,'cache-control':'no-store','retry-after':'2'});res.end();return true;}
  res.writeHead(200,{...h,'content-type':entry.mime,'content-length':entry.size});
  if(req.method==='HEAD'){res.end();return true;}
  activeReads++;
  void pipeline(createReadStream(entry.file),res).catch(()=>{if(!res.destroyed)res.destroy()}).finally(()=>{activeReads--});
  return true;
 };
}
