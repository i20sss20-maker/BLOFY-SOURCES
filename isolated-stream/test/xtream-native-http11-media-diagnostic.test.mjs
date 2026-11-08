import test from 'node:test';
import assert from 'node:assert/strict';
import {compareXtreamNativeHttp11} from '../src/xtream-native-http11-media-diagnostic.mjs';
import {compareXtreamMediaClientProfiles} from '../src/xtream-media-client-profile-diagnostic.mjs';
const origin='http://provider.example:80',url=origin+'/movie/u/p/12.mkv';
const validate=async u=>new URL(u);
test('native HTTP/1.1 offers safe same-item comparison after three fetch 404s',async()=>{
 const calls=[];
 const report=await compareXtreamMediaClientProfiles([{kind:'movie',sourceUrl:url}],{
  allowedOrigin:origin,validate,compareHttp11:true,
  fetchImpl:async()=>new Response('not found',{status:404}),
  http11Read:async input=>{calls.push(input.href);return{
    status:200,code:'first_bytes',mime:'video/x-matroska',
    first:Buffer.from([0x1a,0x45,0xdf,0xa3,0x42])
  }}
 });
 assert.equal(calls.length,1);
 assert.equal(report.samples[0].checks[3].profile,'http11_plain');
 assert.equal(report.samples[0].checks[3].mediaBytes,true);
 assert.equal(report.samples[0].checks[3].status,200);
 assert.doesNotMatch(JSON.stringify(report),/provider\.example|\/movie\/u|\/p\//);
});
test('HTTP/1.1 comparison never follows a 403/456 denial',async()=>{
 let native=0;
 const report=await compareXtreamMediaClientProfiles([{kind:'movie',sourceUrl:url}],{
  allowedOrigin:origin,validate,compareHttp11:true,
  fetchImpl:async()=>new Response('forbidden',{status:403}),
  http11Read:async()=>{native++;return{status:200}}
 });
 assert.equal(native,0);
 assert.equal(report.samples[0].checks.length,1);
});
test('native follows only allowed provider-issued CDN hop and redacts signed link',async()=>{
 let calls=0;
 const report=await compareXtreamNativeHttp11(url,{
  allowedOrigin:origin,allowRedirectFrom:origin,validate,
  read:async target=>{
   calls++;
   if(new URL(target).origin===origin)return {
    status:302,redirect:'https://cdn.example/file.mp4?token=SECRET'};
   return{status:200,code:'first_bytes',mime:'video/mp4',
    first:Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109])};
  }
 });
 assert.equal(calls,2);
 assert.equal(report.mediaBytes,true);
 assert.equal(report.crossOriginRedirect,true);
 assert.equal(report.redirects,1);
 assert.doesNotMatch(JSON.stringify(report),/SECRET|cdn\.example/);
});
test('native rejects unsafe redirect when cross-origin not approved',async()=>{
 let calls=0;
 const report=await compareXtreamNativeHttp11(url,{
  allowedOrigin:origin,validate,read:async()=>{
   calls++;return{status:302,redirect:'https://cdn.example/file.mp4?token=SECRET'};
  }
 });
 assert.equal(calls,1);
 assert.equal(report.code,'cross_origin_redirect_disallowed');
});
