import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

const html=renderOperatorDashboard('timeline_test_nonce');
const start=html.indexOf('  // Website /operator owner-only trial:');
const finish=html.indexOf('  refreshHubBrowserQa();',start);
assert.ok(start>=0&&finish>start);
const source=html.slice(start,finish);
const RUN='test_verified_movie_timeline_0001';
function harness(fetchImpl){
 const nodes=new Map(),downloads=[];
 function $(id){
  if(!nodes.has(id)){
   const n={
    id,value:'',textContent:'',disabled:false,checked:false,
    src:'',style:{},currentTime:0,duration:30,paused:true,events:new Map(),
    addEventListener(name,fn){const list=this.events.get(name)||[];
      list.push(fn);this.events.set(name,list)},
    fire(name){for(const fn of this.events.get(name)||[])fn.call(this)},
    pause(){this.paused=true},load(){},removeAttribute(key){
      if(key==='src')this.src=''},
    play(){this.paused=false;return Promise.resolve()},
    matches(){return false}
   };
   nodes.set(id,n);
  }
  return nodes.get(id);
 }
 const sandbox={
  $,Blob,Date,JSON,Number,Math,Promise,AbortController,Response,
  Set,Map,Error,
  fetch:fetchImpl,
  URL:{
   createObjectURL:()=>'blob:private-test',
   revokeObjectURL:()=>{}
  },
  document:{
   body:{append(){}},
   createElement:()=>({href:'',download:'',click(){
     downloads.push({href:this.href,download:this.download})},remove(){}})
  },
  setTimeout:(fn)=>setTimeout(fn,0),
  clearTimeout
 };
 vm.runInNewContext(source+
  '\n globalThis.timelineTest={state:siteTimeline,fetch:siteTimelineFetch,'+
  'load:siteTimelineLoad,stop:siteTimelineStop,render:siteTimelineQoS,'+
  'retry:()=>$("hub-timeline-retry").fire("click"),'+
  'export:()=>$("hub-timeline-export").fire("click"),'+
  'evidence:()=>siteTimelineEvidence};',sandbox);
 const state=sandbox.timelineTest.state;
 state.meta={durationSeconds:90,segmentSeconds:30,segmentCount:3};
 state.kind='movie';state.runId=RUN;state.playing=true;
 return {state,$,sandbox,downloads,timeline:sandbox.timelineTest};
}
function movieClip(index=0,bytesOk=true){
 const b=Buffer.alloc(4096,0);
 b.write(bytesOk?'ftyp':'NOPE',4,'ascii');
 return new Response(b,{status:200,headers:{
  'content-type':'video/mp4','content-length':'4096',
  'x-blofy-timeline-source':'verified-private-s3',
  'x-blofy-timeline-index':String(index),
  'x-blofy-timeline-offset':String(index*30)
 }});
}
test('site timeline recovers from temporary 429 with bounded retries',async()=>{
 let requests=0;
 const h=harness(async()=>{
  requests++;return requests===1?
   new Response(null,{status:429}):movieClip(0);
 });
 const url=await h.timeline.fetch(0,new AbortController().signal);
 assert.match(url,/^blob:private-test/);
 assert.equal(requests,2);
});
test('timeline refuses tampered MP4 even when origin proof headers appear valid',async()=>{
 const h=harness(async()=>movieClip(1,false));
 await assert.rejects(()=>h.timeline.fetch(1,new AbortController().signal),/MP4/);
});
test('timeline refuses mismatched verified media segment positions',async()=>{
 const h=harness(async()=>movieClip(2,true));
 await assert.rejects(()=>h.timeline.fetch(1,new AbortController().signal),/تخزين BLOFY/);
});
test('timeline aborts before issuing a new private media request',async()=>{
 let called=0;
 const h=harness(async()=>{called++;return movieClip(0)});
 const ctl=new AbortController();ctl.abort();
 await assert.rejects(()=>h.timeline.fetch(0,ctl.signal),/إلغاء/);
 assert.equal(called,0);
});
test('timeline UI offers privacy-preserving retry and local QA report',()=>{
 for(const id of ['hub-timeline-qos','hub-timeline-retry','hub-timeline-export',
   'hub-timeline-picture','hub-timeline-audio'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/fullFilePlaybackVerified:false/);
 assert.match(html,/sourceRightsProvenByThisReport:false/);
 assert.match(html,/failed speculative prefetch/);
 assert.match(html,/siteTimelineEvidence\.reachedLastWindow/);
 assert.match(html,/siteTimelineEvidence\.bufferWaitEvents/);
 assert.doesNotMatch(html,/customerReleaseApproved:true/);
});
