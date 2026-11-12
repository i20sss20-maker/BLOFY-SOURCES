import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreamReleaseInspector} from '../src/stream-release-inspector.mjs';

const manifest={release:{app:{
 versionCode:2000089,
 versionName:'2.0.0-rc07.55.8.12-STREAM',
 minSupportedVersionCode:1,
 packageName:'tv.blofy.player.v2.stream',
 sha256:'a'.repeat(64),apkSizeBytes:135509813,
 downloadUrl:'https://updates.blofyplayer.com/d/blofy-stream'
}}};
test('release checker verifies format and remains honest about untested APK bytes',async()=>{
 let calls=0,now=1000;
 const checker=createStreamReleaseInspector({clock:()=>now,cacheMs:1000,
  fetchImpl:async(url,init)=>{
   assert.equal(url,'https://updates.blofyplayer.com/stream/release.json');
   assert.equal(init.redirect,'manual');
   assert.equal(init.method,'GET');
   assert.equal(init.headers.authorization,undefined);
   calls++;return new Response(JSON.stringify(manifest),{
    status:200,headers:{'content-type':'application/json'}});
  }
 });
 const [a,b]=await Promise.all([checker.inspect(),checker.inspect()]);
 assert.deepEqual(a,b);
 assert.equal(calls,1);
 assert.equal(a.metadataConsistent,true);
 assert.equal(a.packageName,'tv.blofy.player.v2.stream');
 assert.equal(a.versionCode,2000089);
 assert.equal(a.sha256FieldPresent,true);
 assert.equal(a.apkBytesVerified,false);
 assert.equal(a.signatureVerified,false);
 assert.equal(a.deviceUpdateTested,false);
 assert.equal((await checker.inspect()).cacheHit,true);
 now+=1001;await checker.inspect();
 assert.equal(calls,2);
});
test('wrong package, wrong hash and stale redirect cannot be mistaken for valid STREAM release',async()=>{
 for(const patch of [{packageName:'tv.blofy.player.v2'},
  {sha256:'not-a-hash'}, {downloadUrl:'https://evil.example/bad.apk'},
  {versionCode:2000000,minSupportedVersionCode:2000001}]){
  const data={release:{app:{...manifest.release.app,...patch}}};
  const r=await createStreamReleaseInspector({fetchImpl:async()=>
   new Response(JSON.stringify(data),{status:200})}).inspect();
  assert.equal(r.ok,true);
  assert.equal(r.metadataConsistent,false);
  assert.equal(r.apkBytesVerified,false);
 }
 for(const code of [302,404,503]){
  const r=await createStreamReleaseInspector({fetchImpl:async()=>
   new Response(null,{status:code})}).inspect();
  assert.equal(r.ok,false);
  assert.equal(r.metadataConsistent,false);
 }
});
test('oversized untrusted release body and invalid JSON fail closed',async()=>{
 const tooLarge=await createStreamReleaseInspector({fetchImpl:async()=>
  new Response('x'.repeat(17000),{status:200})}).inspect();
 assert.equal(tooLarge.ok,false);
 assert.equal(tooLarge.code,'stream_release_metadata_oversized');
 const badJson=await createStreamReleaseInspector({fetchImpl:async()=>
  new Response('this-is-not-json',{status:200})}).inspect();
 assert.equal(badJson.code,'stream_release_metadata_invalid');
 assert.throws(()=>createStreamReleaseInspector({timeoutMs:20000}),
  /release_inspector_invalid_configuration/);
});
