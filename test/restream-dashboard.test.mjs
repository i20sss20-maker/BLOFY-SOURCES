import test from 'node:test';
import assert from 'node:assert/strict';
import { isOpenRestreamCandidate, restreamOverview } from '../src/restream-dashboard.mjs';

const rights={redistributable:true,commercialCompatible:true};
const video={
  id:101,source:'wikimedia',kind:'movie',title:'Creative Commons short film',
  category:'Open video',licenseName:'CC BY',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
  attribution:'Creator',rights,
  stream:{resolver:'direct',url:'https://upload.wikimedia.org/wikipedia/commons/test.webm',extension:'webm'}
};

test('restream inventory separates reusable video from view-only channels and private metadata',()=>{
  const viewOnly={...video,id:102,source:'free-tv',kind:'live',stream:{resolver:'direct',url:'https://example.org/playlist.m3u8'},
    rights:{redistributable:false,commercialCompatible:false}};
  const openArchive={...video,id:103,source:'internet-archive',
    stream:{resolver:'internet-archive',identifier:'archive-id'}};
  const providers=[
    {id:'wikimedia',name:'Commons',enabled:()=>true,rights:'Creative Commons'},
    {id:'internet-archive',name:'Archive',enabled:()=>true,rights:'Open licenses'},
    {id:'free-tv',name:'TV',enabled:()=>true,rights:'Free to watch only'}
  ];
  const result=restreamOverview({
    items:[video,viewOnly,openArchive],
    providers,
    selection:{total:54665,counts:{live:5174,vod:33676,series:15815}},
    sessions:{total:2,users:[{username:'user-test',activeConnections:2}]},
    syncing:false,enabled:true
  });
  assert.equal(result.catalog.total,3);
  assert.equal(result.catalog.candidates,2);
  assert.equal(result.privateSelection.total,54665);
  assert.equal(result.privateSelection.playbackConnected,false);
  assert.equal(result.connections.total,2);
  assert.equal(result.sources.find(x=>x.id==='free-tv').candidates,0);
  assert.equal(result.sources.find(x=>x.id==='wikimedia').candidates,1);
  assert.equal(result.samples.length,2);
  assert.ok(!JSON.stringify(result).includes('password'));
});

test('missing licensing details and untrusted CDN URLs are never eligible',()=>{
  assert.equal(isOpenRestreamCandidate(video),true);
  assert.equal(isOpenRestreamCandidate({...video,licenseUrl:'https://creativecommons.org/licenses/by-nc/4.0/'}),false);
  assert.equal(isOpenRestreamCandidate({...video,stream:{...video.stream,url:'https://unknown.example/film.webm'}}),false);
  assert.equal(isOpenRestreamCandidate({...video,rights:{...rights,redistributable:false}}),false);
  assert.equal(isOpenRestreamCandidate({...video,source:'authorized-partners'}),false);
  assert.equal(isOpenRestreamCandidate({...video,kind:'live'}),false);
});

test('monitoring does not conflate configured relay and playback verification',()=>{
  const result=restreamOverview({
    items:[video],providers:[],selection:{total:0},sessions:{total:0,users:[]},
    enabled:false,syncing:false
  });
  assert.equal(result.enabled,false);
  assert.equal(result.catalog.candidates,1);
  assert.equal(result.privateSelection.playbackConnected,false);
  assert.equal(result.streamingMode,'redirect-only');
});
