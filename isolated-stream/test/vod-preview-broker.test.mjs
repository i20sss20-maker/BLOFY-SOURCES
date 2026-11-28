import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createVodPreviewBroker} from '../src/vod-preview-broker.mjs';

const media='https://provider.example/movie/user/privatepassword/104.mp4';
const UUID='550e8400-e29b-41d4-a716-446655440000';
function setup({returnInitialRange404=false,clock=Date.now}={}){
  const calls=[],data=Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,1]);
  const portal={configured:true,vodItem:async ({type})=>({
    status:200,body:{ok:true,type,sourceUrl:media,sourceId:UUID,itemId:'104',
      extension:'mp4',title:'Movie'}
  })};
  const fetchImpl=async (url,options)=>{
    calls.push({url:String(url),method:options.method,range:options.headers?.range});
    if(String(url)!==media)throw Error('wrong upstream URL');
    if(returnInitialRange404&&options.headers?.range)
      return new Response('Not Found',{status:404,headers:{'content-type':'text/plain'}});
    return new Response(options.method==='HEAD'?null:data,{status:200,
      headers:{'content-type':'video/mp4','accept-ranges':'bytes',
        'content-length':String(data.length)}});
  };
  const broker=createVodPreviewBroker({portal,fetchImpl,clock,
    lookup:async()=>[{address:'8.8.8.8',family:4}]});
  return {broker,calls,data};
}
const selection={type:'movie',sourceId:UUID,itemId:'104',rightsConfirmed:true};
test('VOD preview cannot begin without explicit rights confirmation',async()=>{
  const {broker,calls}=setup();
  assert.equal((await broker.create({...selection,rightsConfirmed:false})).status,403);
  assert.equal(calls.length,0);
});
test('VOD preview issues only operator-scoped opaque URL, never upstream secrets',async()=>{
  const {broker}=setup();
  const result=await broker.create(selection);
  assert.equal(result.status,201);
  assert.match(result.body.token,/^[a-f0-9]{48}$/);
  assert.equal(result.body.browserPlayable,true);
  assert.ok(result.body.playerUrl.startsWith('/operator/api/vod/'));
  assert.equal(JSON.stringify(result.body).includes('provider.example'),false);
  assert.equal(JSON.stringify(broker.list()).includes('privatepassword'),false);
});
test('video byte Range incompatibility retries one ordinary GET, without redirects',async()=>{
  const {broker,calls,data}=setup({returnInitialRange404:true});
  const item=(await broker.create(selection)).body;
  const server=http.createServer((req,res)=>broker.play(req,res,item.token));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{
    const reply=await fetch('http://127.0.0.1:'+server.address().port+'/video',{
      headers:{range:'bytes=0-511'}});
    assert.equal(reply.status,200);
    assert.equal((await reply.arrayBuffer()).byteLength,data.length);
    assert.equal(calls.length,2);
    assert.equal(calls[0].range,'bytes=0-511');
    assert.equal(calls[1].range,undefined);
  }finally{await new Promise(resolve=>server.close(resolve))}
});
test('VOD sessions expire without touching subscriber accounts',async()=>{
  let now=10000;
  const {broker}=setup({clock:()=>now});
  const item=await broker.create(selection);
  assert.equal(item.status,201);
  now+=4*60*60*1000;
  assert.equal(broker.list().items.length,0);
});
