import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const html=renderOperatorDashboard('test_nonce');
const start='// Website-only, owner-local playback evidence:';
const end='  if(tabs[location.hash.slice(1)]';
const begin=html.indexOf(start);
const finish=html.indexOf(end,begin);
assert.ok(begin>=0&&finish>begin,'test-only script segment found');
const qaSource=html.slice(begin,finish);

function mount(){
  const nodes=new Map();
  function el(id){
    if(!nodes.has(id)){
      const n={id,checked:false,value:'',paused:false,seeking:false,readyState:4,
        videoWidth:1280,videoHeight:720,currentTime:0,textContent:'',events:{},
        addEventListener(event,fn){(this.events[event]??=[]).push(fn)},
        fire(event){for(const fn of this.events[event]??[])fn.call(this,{})}};
      nodes.set(id,n);
    }
    return nodes.get(id);
  }
  const files=[];
  const doc={body:{append(){}},createElement(){return {click(){files.push('clicked')},remove(){}}}};
  let savedBlob;
  const sandbox={$:el,document:doc,Blob,JSON,Math,Number,Date,
    URL:{createObjectURL(blob){savedBlob=blob;return 'blob:only-test'},revokeObjectURL(){}},
    setTimeout(fn){fn()}};
  vm.runInNewContext(qaSource+'\n globalThis.qa={hubBrowserQa,hubBrowserQaVerdict,resetHubBrowserQa,refreshHubBrowserQa}',sandbox);
  return {el,qa:sandbox.qa,files,exported:()=>savedBlob};
}

test('web QA panel explicitly separates clip observations from full release proof',()=>{
  assert.match(html,/id="hub-browser-qa"/);
  assert.match(html,/id="hub-qa-platform"/);
  assert.match(html,/id="hub-qa-movie-picture"/);
  assert.match(html,/id="hub-qa-episode-audio"/);
  assert.match(html,/privateClipSeconds:12/);
  assert.match(html,/customerReleaseApproved:false/);
  assert.match(html,/fullLengthPlaybackVerified:false/);
  assert.match(html,/otherPlatformProvenByThisReport:false/);
});

test('no PASS without actual moving video + human picture/audio confirmation',()=>{
  const {el,qa}=mount();
  el('hub-qa-platform').value='windows_browser';
  const movie=el('content-hub-preview-player');
  el('hub-qa-movie-picture').checked=true;
  el('hub-qa-movie-audio').checked=true;
  assert.equal(qa.hubBrowserQaVerdict('movie'),false);
  movie.videoWidth=0;movie.currentTime=3;movie.fire('timeupdate');
  assert.equal(qa.hubBrowserQaVerdict('movie'),false);
  movie.videoWidth=1280;movie.currentTime=1;movie.fire('timeupdate');
  assert.equal(qa.hubBrowserQaVerdict('movie'),false);
  movie.currentTime=3;movie.fire('timeupdate');
  assert.equal(qa.hubBrowserQaVerdict('movie'),true);
  el('hub-qa-movie-audio').checked=false;
  assert.equal(qa.hubBrowserQaVerdict('movie'),false);
  el('hub-qa-movie-audio').checked=true;
  movie.fire('error');
  assert.equal(qa.hubBrowserQaVerdict('movie'),false);
  qa.resetHubBrowserQa('movie');
  assert.equal(el('hub-qa-movie-picture').checked,false);
  assert.equal(el('hub-qa-movie-audio').checked,false);
  assert.equal(qa.hubBrowserQa.movie.playedSeconds,0);
});

test('local export keeps denied/pass outcomes explicit and omits media source secrets',async()=>{
  const {el,files,exported}=mount();
  el('hub-qa-export').fire('click');
  assert.equal(files.length,0,'platform is mandatory');
  el('hub-qa-platform').value='android_tv_browser';
  el('hub-qa-export').fire('click');
  assert.equal(files.length,1);
  const json=await exported().text();
  const report=JSON.parse(json);
  assert.equal(report.platform,'android_tv_browser');
  assert.equal(report.bothClipsPassed,false);
  assert.equal(report.customerReleaseApproved,false);
  assert.equal(report.serverCopyOrFullMovieProvenByThisReport,false);
  assert.equal(report.movie.clipPass,false);
  assert.equal(report.episode.clipPass,false);
  assert.doesNotMatch(json,/Bearer|http:\/\/|https:\/\/|password|sourceToken/i);
});
