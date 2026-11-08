import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {compareXtreamMediaClientProfiles,
 createXtreamMediaClientProfileDiagnostic} from '../src/xtream-media-client-profile-diagnostic.mjs';

const origin='http://provider.example:8080';
const url=origin+'/movie/u/privatepassword/123.mkv';
const binary=new Uint8Array([0x1a,0x45,0xdf,0xa3,0x42,0x86,0x81,0x01]);
const validate=async input=>new URL(input);
test('same source item: range/plain fail but normal media client serves actual bytes',async()=>{
 let calls=[];
 const result=await compareXtreamMediaClientProfiles([{kind:'movie',sourceUrl:url}],{
  allowedOrigin:origin,validate,
  fetchImpl:async(_url,opts)=>{
   calls.push({range:opts.headers.range||null,ua:opts.headers['user-agent']});
   if(calls.length<3)return new Response('Not found',{status:404});
   return new Response(binary,{status:206,
     headers:{'content-type':'video/x-matroska'}});
  }
 });
 assert.equal(result.samples.length,1);
 assert.deepEqual(result.samples[0].checks.map(x=>x.status),[404,404,206]);
 assert.equal(result.samples[0].playerMedia,true);
 assert.equal(result.samples[0].normalMedia,false);
 assert.equal(calls[0].range,'bytes=0-1023');
 assert.equal(calls[1].range,null);
 assert.match(calls[2].ua,/VLC/);
 assert.doesNotMatch(JSON.stringify(result),/privatepassword|provider.example|\/movie\/u/);
});
test('provider permission denial stops all other client profiles',async()=>{
 let calls=0;
 const result=await compareXtreamMediaClientProfiles([{kind:'series',sourceUrl:url.replace('movie','series')}],{
  allowedOrigin:origin,validate,fetchImpl:async()=>{
   calls++;return new Response('Forbidden',{status:403});
  }
 });
 assert.equal(calls,1);
 assert.equal(result.samples[0].checks.length,1);
 assert.equal(result.samples[0].checks[0].code,'provider_forbidden');
});
test('provider 302 can be safely followed to its allowed public CDN without disclosing URL',async()=>{
 let calls=0;
 const result=await compareXtreamMediaClientProfiles([{kind:'movie',sourceUrl:url}],{
  allowedOrigin:origin,allowRedirectFrom:origin,validate,
  fetchImpl:async(input)=>{
   calls++;
   if(new URL(input).origin===origin)return new Response(null,{status:302,
     headers:{location:'https://cdn.example/file?signature=PRIVATE'}});
   return new Response(binary,{status:200,
     headers:{'content-type':'video/x-matroska'}});
  }
 });
 assert.equal(calls,6);
 assert.equal(result.samples[0].checks[0].crossOriginRedirect,true);
 assert.equal(result.samples[0].checks[0].mediaBytes,true);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE|cdn.example|privatepassword/);
});
test('cross origin CDN is refused unless source-origin is explicitly allowlisted',async()=>{
 let calls=0;
 const result=await compareXtreamMediaClientProfiles([{kind:'movie',sourceUrl:url}],{
  allowedOrigin:origin,validate,fetchImpl:async()=>{
   calls++;return new Response(null,{status:302,
    headers:{location:'https://not-allowed.example/file'}});
  }
 });
 assert.equal(calls,3);
 assert.equal(result.samples[0].checks[0].code,'cross_origin_redirect_disallowed');
});
async function fixture(handler,callback){
 const server=http.createServer(handler);
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{return await callback('http://127.0.0.1:'+server.address().port)}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
}
test('diagnostic requires bearer and rejects arbitrary destination before network requests',async()=>{
 let calls=0;
 const token='a'.repeat(48);
 const instance=createXtreamMediaClientProfileDiagnostic({
  sharedToken:token,allowedOrigin:origin,validate,
  fetchImpl:async()=>{calls++;return new Response(binary)}
 });
 await fixture((req,res)=>instance.handle(req,res),async endpoint=>{
  const sample={samples:[{kind:'movie',sourceUrl:url}]};
  const denied=await fetch(endpoint,{method:'POST',
   headers:{'content-type':'application/json'},body:JSON.stringify(sample)});
  assert.equal(denied.status,401);
  const wrong=await fetch(endpoint,{method:'POST',
   headers:{authorization:'Bearer '+token,'content-type':'application/json'},
   body:JSON.stringify({samples:[{kind:'movie',
    sourceUrl:'http://other.example/movie/u/p/1.mp4'}]})});
  assert.equal(wrong.status,400);
  assert.equal(calls,0);
 });
});
