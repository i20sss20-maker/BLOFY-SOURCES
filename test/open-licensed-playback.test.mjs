import test from 'node:test';
import assert from 'node:assert/strict';
import { openLicensedMediaProxyAllowed } from '../src/open-licensed-playback.mjs';

const openRights={redistributable:true,commercialCompatible:true};
const common={kind:'movie',rights:openRights,licenseUrl:'https://creativecommons.org/licenses/by/4.0/'};

test('open licensed Wikimedia videos can be routed through the media proxy when opted in',()=>{
  const item={...common,source:'wikimedia',stream:{resolver:'direct'}};
  const url='https://upload.wikimedia.org/wikipedia/commons/example.webm';
  assert.equal(openLicensedMediaProxyAllowed(item,url,true),true);
  assert.equal(openLicensedMediaProxyAllowed(item,url,false),false);
  assert.equal(openLicensedMediaProxyAllowed({...item,rights:{...openRights,redistributable:false}},url,true),false);
  assert.equal(openLicensedMediaProxyAllowed({...item,rights:{...openRights,commercialCompatible:false}},url,true),false);
  assert.equal(openLicensedMediaProxyAllowed({...item,licenseUrl:'https://creativecommons.org/licenses/by-nc/4.0/'},url,true),false);
  assert.equal(openLicensedMediaProxyAllowed({...item,licenseUrl:''},url,true),false);
  assert.equal(openLicensedMediaProxyAllowed(item,'http://upload.wikimedia.org/example.webm',true),false);
  assert.equal(openLicensedMediaProxyAllowed(item,'https://private.example/example.webm',true),false);
});

test('Archive videos require an explicit permissive Creative Commons license',()=>{
  const item={...common,source:'internet-archive',stream:{resolver:'internet-archive'}};
  assert.equal(openLicensedMediaProxyAllowed(item,'https://archive.org/download/sample/sample.mp4',true),true);
  assert.equal(openLicensedMediaProxyAllowed({...item,licenseUrl:'https://archive.org/details/something'},'https://archive.org/download/sample',true),false);
  assert.equal(openLicensedMediaProxyAllowed({...item,kind:'live'},'https://archive.org/download/sample',true),false);
  assert.equal(openLicensedMediaProxyAllowed({...item,stream:{resolver:'direct'}},'https://archive.org/download/sample',true),false);
});

test('Free-watch playlists and the unrelated original Xtream provider are excluded',()=>{
  const freeTv={...common,kind:'live',source:'free-tv',rights:{redistributable:false,commercialCompatible:false},stream:{resolver:'direct'}};
  assert.equal(openLicensedMediaProxyAllowed(freeTv,'https://free.example/live.ts',true),false);
  const unrelated={...common,source:'authorized-partners',stream:{resolver:'authorized-xtream'}};
  assert.equal(openLicensedMediaProxyAllowed(unrelated,'https://partner.example/video.mp4',true),false);
});
