import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const html=renderOperatorDashboard('test_nonce');
const start='// Website-only, authenticated owner evidence.';
const end='  if(tabs[location.hash.slice(1)]';
const begin=html.indexOf(start);
const finish=html.indexOf(end,begin);
assert.ok(begin>=0&&finish>begin,'test-only script segment found');
const qaSource=html.slice(begin,finish);

const movieId='saleh_movie_1349410_20261114';
const episodeId='saleh_episode_127434_20261114';
function hub(){
  return {ok:true,ownerPreviewEnabled:true,ownerEpisodePreviewEnabled:true,
    runs:[{runId:movieId,format:'private_chunks',state:'verified',
      expectedBytes:2934023949,bytesCopied:2934023949}],
    episodeRuns:[{runId:episodeId,format:'private_episode_chunks',
      state:'verified',expectedBytes:1444843431,bytesCopied:1444843431}]};
}
function mount(storage=hub()){
  const nodes=new Map();
  function el(id){
    if(!nodes.has(id)){
      const n={id,checked:false,value:'',paused:false,seeking:false,readyState:4,
        videoWidth:1280,videoHeight:720,currentTime:0,volume:1,muted:false,
        src:'',textContent:'',events:{},files:[],
        getAttribute(name){return name==='src'?this.src:null},
        addEventListener(event,fn){(this.events[event]??=[]).push(fn)},
        fire(event){for(const fn of this.events[event]??[])fn.call(this,{})}};
      nodes.set(id,n);
    }
    return nodes.get(id);
  }
  const files=[];
  const doc={body:{append(){}},createElement(){return {
    click(){files.push('clicked')},remove(){}}}};
  let savedBlob;
  const sandbox={$:el,hubState:storage,document:doc,Blob,JSON,Math,Number,Date,
    URL:{createObjectURL(blob){savedBlob=blob;return 'blob:only-test'},
      revokeObjectURL(){}},setTimeout(fn){fn()}};
  vm.runInNewContext(qaSource+
    '\n globalThis.qa={hubBrowserQa,hubBrowserQaVerdict,resetHubBrowserQa,hubQaIdentity,compareHubQaReports,refreshHubBrowserQa}',sandbox);
  return {el,qa:sandbox.qa,sandbox,files,exported:()=>savedBlob};
}
function startClip(el,qa,kind,platform='windows_browser'){
  el('hub-qa-platform').value=platform;
  qa.resetHubBrowserQa(kind);
  const video=el(kind==='movie'?'content-hub-preview-player':
    'content-hub-episode-preview-player');
  video.src=kind==='movie'?'/operator/api/content-hub/preview':
    '/operator/api/content-hub/episodes/preview';
  el('hub-qa-'+kind+'-picture').checked=true;
  el('hub-qa-'+kind+'-audio').checked=true;
  video.currentTime=0;video.fire('timeupdate');
  video.currentTime=1.1;video.fire('timeupdate');
  video.currentTime=2.2;video.fire('timeupdate');
  video.fire('seeking');
  video.currentTime=7;video.fire('seeked');
  video.fire('timeupdate');
  video.currentTime=7.6;video.fire('timeupdate');
  return video;
}
function report(platform='windows_browser'){
  const row=(mediaKind)=>({mediaKind,privateClipSeconds:12,
    storedManifest:mediaKind==='movie'?
      {runId:movieId,expectedBytes:2934023949}:
      {runId:episodeId,expectedBytes:1444843431},
    videoFrameObserved:true,videoFrameEvidence:'rendered_frames',
    playedSeconds:3.2,browserErrors:0,bufferEvents:0,
    seekCompleted:1,resumedAfterSeek:true,muted:false,volume:1,
    pictureConfirmedByHuman:true,audibleAudioConfirmedByHuman:true,
    clipPass:true,fullLengthPlaybackVerified:false});
  return {schema:'blofy.stream.website.private-clip-qa.v2',
    platform,checkedAt:new Date().toISOString(),movie:row('movie'),
    episode:row('episode'),bothClipsPassed:true,
    sourceRightsProvenByThisReport:false,fullFilePlaybackVerified:false,
    otherPlatformProvenByThisReport:false,customerReleaseApproved:false,
    hardwarePlatformAttested:false};
}

test('website QA has separate player evidence, per-device export and local compare only',()=>{
  assert.match(html,/id="hub-browser-qa"/);
  assert.match(html,/id="hub-qa-platform"/);
  assert.match(html,/id="hub-qa-import"/);
  assert.match(html,/id="hub-qa-movie-picture"/);
  assert.match(html,/id="hub-qa-episode-audio"/);
  assert.match(html,/privateClipSeconds:12/);
  assert.match(html,/customerReleaseApproved:false/);
  assert.match(html,/fullLengthPlaybackVerified:false/);
  assert.match(html,/hardwarePlatformAttested:false/);
  assert.doesNotMatch(html,/autostart.*customer|enable.*subscriber/i);
});

test('a browser clip PASS needs verified exact manifest, continuous video, seek/resume and manual AV',()=>{
  const {el,qa,sandbox}=mount();
  const movie=el('content-hub-preview-player');
  el('hub-qa-platform').value='windows_browser';
  qa.resetHubBrowserQa('movie');
  el('hub-qa-movie-picture').checked=true;
  el('hub-qa-movie-audio').checked=true;
  assert.equal(qa.hubBrowserQaVerdict('movie'),false);
  movie.src='/operator/api/content-hub/preview';
  movie.videoWidth=0;movie.currentTime=3;movie.fire('timeupdate');
  assert.equal(qa.hubBrowserQaVerdict('movie'),false,'no video dimension');
  movie.videoWidth=1280;movie.currentTime=0;movie.fire('timeupdate');
  movie.currentTime=8;movie.fire('timeupdate');
  assert.equal(qa.hubBrowserQaVerdict('movie'),false,'jump cannot count playback');
  movie.currentTime=9;movie.fire('timeupdate');
  movie.currentTime=10.1;movie.fire('timeupdate');
  assert.equal(qa.hubBrowserQaVerdict('movie'),false,'no seek/resume');
  movie.fire('seeking');
  movie.currentTime=5;movie.fire('seeked');
  movie.fire('timeupdate');
  movie.currentTime=5.8;movie.fire('timeupdate');
  assert.equal(qa.hubBrowserQaVerdict('movie'),true);
  movie.muted=true;assert.equal(qa.hubBrowserQaVerdict('movie'),false);
  movie.muted=false;movie.volume=0;
  assert.equal(qa.hubBrowserQaVerdict('movie'),false);
  movie.volume=1;movie.src='/operator/api/content-hub/episodes/preview';
  assert.equal(qa.hubBrowserQaVerdict('movie'),false,'wrong media URL');
  movie.src='/operator/api/content-hub/preview';
  el('hub-qa-platform').value='android_tv_browser';
  assert.equal(qa.hubBrowserQaVerdict('movie'),false,'platform switched');
  el('hub-qa-platform').value='windows_browser';
  sandbox.hubState.runs[0].expectedBytes=100;
  assert.equal(qa.hubBrowserQaVerdict('movie'),false,'manifest changed');
  sandbox.hubState.runs[0].expectedBytes=2934023949;
  movie.fire('error');
  assert.equal(qa.hubBrowserQaVerdict('movie'),false,'player error');
  qa.resetHubBrowserQa('movie');
  assert.equal(el('hub-qa-movie-picture').checked,false);
  assert.equal(el('hub-qa-movie-audio').checked,false);
  assert.equal(qa.hubBrowserQa.movie.playedSeconds,0);
});

test('two episodes or a missing SHA-verified manifest block accidental identification',()=>{
  const s=hub();
  s.episodeRuns.push({...s.episodeRuns[0],runId:'another_verified_episode'});
  const {qa}=mount(s);
  assert.equal(qa.hubQaIdentity('episode'),null);
  assert.notEqual(qa.hubQaIdentity('movie'),null);
  s.episodeRuns.splice(1);
  s.episodeRuns[0].state='staged';
  assert.equal(qa.hubQaIdentity('episode'),null);
});

test('rendered-frame callback is enforced on capable browsers; metadata alone does not pass',()=>{
  const {qa,el}=mount();
  const p=el('content-hub-preview-player');
  let frameCb=null;
  p.requestVideoFrameCallback=(fn)=>{frameCb=fn};
  el('hub-qa-platform').value='windows_browser';
  qa.resetHubBrowserQa('movie');
  p.src='/operator/api/content-hub/preview';
  el('hub-qa-movie-picture').checked=true;
  el('hub-qa-movie-audio').checked=true;
  p.fire('playing');
  p.currentTime=0;p.fire('timeupdate');
  p.currentTime=1.1;p.fire('timeupdate');
  p.currentTime=2.2;p.fire('timeupdate');
  p.fire('seeking');p.currentTime=7;p.fire('seeked');p.fire('timeupdate');
  p.currentTime=7.7;p.fire('timeupdate');
  assert.equal(qa.hubBrowserQaVerdict('movie'),false,'metadata cannot impersonate actual rendered frames');
  assert.equal(typeof frameCb,'function');
  frameCb(1,{mediaTime:7.1});
  frameCb(2,{mediaTime:7.3});
  frameCb(3,{mediaTime:7.5});
  assert.equal(qa.hubBrowserQa.movie.frameEvidence,'rendered_frames');
  assert.equal(qa.hubBrowserQaVerdict('movie'),true);
});

test('two device reports can be combined only for matching stored files and recent fully observed clips',()=>{
  const {qa,sandbox}=mount();
  const win=report('windows_browser'),tv=report('android_tv_browser');
  assert.equal(qa.compareHubQaReports([win,tv]).ok,true);
  assert.equal(qa.compareHubQaReports([win,report('windows_browser')]).ok,false);
  tv.episode.storedManifest.runId='another_valid_episode';
  assert.equal(qa.compareHubQaReports([win,tv]).code,'different_stored_media');
  tv.episode.storedManifest.runId=episodeId;
  tv.movie.seekCompleted=0;
  assert.equal(qa.compareHubQaReports([win,tv]).ok,false);
  tv.movie.seekCompleted=1;
  tv.checkedAt='2026-01-01T00:00:00.000Z';
  assert.equal(qa.compareHubQaReports([win,tv]).ok,false,'stale report');
  tv.checkedAt=new Date().toISOString();
  sandbox.hubState.episodeRuns[0].state='staged';
  assert.equal(qa.compareHubQaReports([win,tv]).code,'stored_media_changed_since_test');
});

test('local export is fail-closed without device selection and never contains provider URLs/tokens',async()=>{
  const {el,files,exported}=mount();
  el('hub-qa-export').fire('click');
  assert.equal(files.length,0,'platform must be chosen before export');
  el('hub-qa-platform').value='android_tv_browser';
  el('hub-qa-export').fire('click');
  assert.equal(files.length,1);
  const json=await exported().text(),data=JSON.parse(json);
  assert.equal(data.platform,'android_tv_browser');
  assert.equal(data.bothClipsPassed,false);
  assert.equal(data.customerReleaseApproved,false);
  assert.equal(data.fullFilePlaybackVerified,false);
  assert.equal(data.movie.clipPass,false);
  assert.equal(data.episode.clipPass,false);
  assert.doesNotMatch(json,/Bearer|http:\/\/|https:\/\/|password|sourceToken|privateKey/i);
});
