import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))});s.on('error',reject)})}
async function waitHealth(base,child){for(let i=0;i<80;i++){if(child.exitCode!=null)throw new Error(`server exited ${child.exitCode}`);try{const r=await fetch(`${base}/health`);if(r.ok)return await r.json()}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('health timeout')}

function sampleCatalog(){
  const now=new Date().toISOString();
  return {schemaVersion:2,lastSyncAt:now,sources:{test:{id:'test',count:3,syncedAt:now}},items:[
    {id:101,source:'test',sourceItemId:'live-1',kind:'live',title:'Arabic Test Live',description:'',icon:'',category:'عربي · السعودية',language:'ar',country:'SA',epgId:'ArabicTest.sa',licenseName:'Test',licenseUrl:'',attribution:'Test',publishedAt:now,stream:{resolver:'direct',url:'https://example.com/live.m3u8',extension:'m3u8'},rights:{arabic:true}},
    {id:102,source:'test',sourceItemId:'movie-1',kind:'movie',title:'Test Movie',description:'movie',icon:'',category:'Open Movies',language:'en',country:'',licenseName:'Test',licenseUrl:'',attribution:'Test',publishedAt:now,stream:{resolver:'direct',url:'https://example.com/movie.mp4',extension:'mp4'},rights:{}},
    {id:103,source:'test',sourceItemId:'ep-1',kind:'series_episode',title:'Test Show S01E01',seriesTitle:'Test Show',season:1,episode:1,description:'episode',icon:'',category:'Series',language:'en',country:'',licenseName:'Test',licenseUrl:'',attribution:'Test',publishedAt:now,stream:{resolver:'direct',url:'https://example.com/episode.mp4',extension:'mp4'},rights:{}}
  ]};
}

test('Xtream HTTP surface works end-to-end like a player',async()=>{
  const dataDir=mkdtempSync(path.join(os.tmpdir(),'blofy-http-'));mkdirSync(dataDir,{recursive:true});
  const port=await freePort(),base=`http://127.0.0.1:${port}`;
  writeFileSync(path.join(dataDir,'catalog.json'),JSON.stringify(sampleCatalog()));
  const child=spawn(process.execPath,['src/server.mjs'],{cwd:repoRoot,env:{...process.env,PORT:String(port),DATA_DIR:dataDir,PUBLIC_BASE_URL:base,XTREAM_PUBLIC_BASE_URL:base,ADMIN_PASSWORD:'AdminPass-123',SESSION_SECRET:'c'.repeat(64),XTREAM_USERNAME:'testuser',XTREAM_PASSWORD:'TestPass-123',SYNC_ON_START:'false',ACTIVATION_URL:'http://127.0.0.1:9',RELEASE_URL:'http://127.0.0.1:9'},stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
  try{
    const health=await waitHealth(base,child);assert.equal(health.ok,true);assert.equal(health.xtream.stats.totalItems,3);assert.equal(health.storage.mode,'filesystem');
    const authUrl=`${base}/player_api.php?username=testuser&password=TestPass-123`;
    let r=await fetch(authUrl);assert.equal(r.status,200);let j=await r.json();assert.equal(j.user_info.auth,1);assert.equal(j.user_info.status,'Active');assert.equal(j.server_info.server_protocol,'http');
    r=await fetch(`${base}/player_api.php?username=bad&password=bad`);j=await r.json();assert.equal(j.user_info.auth,0);
    r=await fetch(`${authUrl}&action=get_live_streams&category_id=0`);j=await r.json();assert.equal(j.length,1);assert.equal(j[0].stream_id,101);assert.equal(j[0].epg_channel_id,'ArabicTest.sa');
    r=await fetch(`${authUrl}&action=get_vod_streams&category_id=all`);j=await r.json();assert.equal(j.length,1);assert.equal(j[0].stream_id,102);
    r=await fetch(`${authUrl}&action=get_series`);j=await r.json();assert.equal(j.length,1);const seriesId=j[0].series_id;
    r=await fetch(`${authUrl}&action=get_series_info&series_id=${seriesId}`);j=await r.json();assert.equal(j.seasons.length,1);assert.equal(j.episodes['1'][0].id,'103');
    r=await fetch(`${base}/get.php?username=testuser&password=TestPass-123&type=m3u_plus&output=ts`);assert.equal(r.status,200);const m3u=await r.text();assert.match(m3u,/^#EXTM3U/);assert.match(m3u,new RegExp(`${base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/live/testuser/TestPass-123/101\\.ts`));assert.match(m3u,/\/movie\/testuser\/TestPass-123\/102\.mp4/);assert.match(m3u,/\/series\/testuser\/TestPass-123\/103\.mp4/);
    r=await fetch(`${base}/live/testuser/TestPass-123/101.ts`,{redirect:'manual'});assert.equal(r.status,302);assert.equal(r.headers.get('location'),'https://example.com/live.m3u8');
    r=await fetch(`${base}/xtream`);assert.equal(r.status,200);const html=await r.text();assert.match(html,/BLOFY XTREAM/);assert.match(html,/\/xtream-assets\/admin\.js/);
    r=await fetch(`${base}/xtream-assets/admin.js`);const js=await r.text();assert.match(js,/\/xtream-api\/accounts/);assert.doesNotMatch(js,/\/api\/admin\/accounts/);
  } finally {child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!=null)return resolve();child.once('exit',resolve);setTimeout(resolve,1500)});rmSync(dataDir,{recursive:true,force:true})}
},15000);
