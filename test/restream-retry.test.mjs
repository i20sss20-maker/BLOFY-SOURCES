import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.listen(0,'127.0.0.1',()=>{
      const port=server.address().port;
      server.close(()=>resolve(port));
    });
    server.on('error',reject);
  });
}
async function waitHealth(base,child){
  for(let i=0;i<100;i++){
    if(child.exitCode!=null)throw new Error('gateway exited early');
    try{const response=await fetch(base+'/health');if(response.ok)return} catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('health timeout');
}
test('restream retries transient failures before first byte without exposing provider or returning false 200',async()=>{
  const dataDir=mkdtempSync(path.join(os.tmpdir(),'blofy-restream-retry-'));
  const gatewayPort=await freePort(),upstreamPort=await freePort();
  const base='http://127.0.0.1:'+gatewayPort;
  const upstreamBase='http://127.0.0.1:'+upstreamPort;
  const now=new Date().toISOString();
  const items=[{
    id:901,source:'partner',sourceItemId:'xtream:DEMO:live:51',kind:'live',
    title:'Licensed test stream',description:'',icon:'',category:'عربي · قنوات',language:'ar',
    country:'SA',licenseName:'Licensed partner',publishedAt:now,stream:{
      resolver:'authorized-xtream',secretRef:'DEMO',mediaType:'live',upstreamId:'51',extension:'ts'
    },rights:{redistributable:true,commercialCompatible:true,partner:'Demo',rightsReference:'contract-test',territories:['SA']}
  }];
  writeFileSync(path.join(dataDir,'catalog.json'),JSON.stringify({
    schemaVersion:2,lastSyncAt:now,sources:{partner:{id:'partner',count:1,syncedAt:now}},items
  }));
  let requests=0,mode='retry503';
  const ts=Buffer.from([0x47,0x40,0x00,0x10,0x00,0x00,0x00,0x00]);
  const upstream=http.createServer((req,res)=>{
    requests++;
    if(req.url!=='/live/upstream-user/SecretPass-123/51.ts'){
      res.writeHead(404);return res.end();
    }
    if(mode==='404'){res.writeHead(404);return res.end('not found')}
    if(mode==='retry503'&&requests===1){res.writeHead(503);return res.end('temporarily busy')}
    if(mode==='empty'&&requests===1){res.writeHead(200,{'content-type':'video/mp2t'});return res.end()}
    res.writeHead(200,{'content-type':'video/mp2t'});
    res.end(ts);
  });
  await new Promise((resolve,reject)=>{upstream.once('error',reject);upstream.listen(upstreamPort,'127.0.0.1',resolve)});
  const child=spawn(process.execPath,['src/server.mjs'],{
    cwd:repoRoot,env:{...process.env,
      PORT:String(gatewayPort),DATA_DIR:dataDir,PUBLIC_BASE_URL:base,XTREAM_PUBLIC_BASE_URL:base,
      ADMIN_PASSWORD:'AdminPass-123',SESSION_SECRET:'r'.repeat(64),
      XTREAM_USERNAME:'testuser',XTREAM_PASSWORD:'TestPass-123',
      SYNC_ON_START:'false',ENABLE_XTREAM_SELF_TEST:'false',
      AUTHORIZED_PARTNER_ALLOW_HTTP:'true',
      BLOFY_PARTNER_XTREAM_DEMO_URL:upstreamBase,
      BLOFY_PARTNER_XTREAM_DEMO_USERNAME:'upstream-user',
      BLOFY_PARTNER_XTREAM_DEMO_PASSWORD:'SecretPass-123'
    },stdio:['ignore','pipe','pipe']
  });
  try{
    await waitHealth(base,child);
    const streamUrl=base+'/live/testuser/TestPass-123/901.ts';
    let response=await fetch(streamUrl);
    assert.equal(response.status,200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),ts);
    assert.equal(requests,2,'one sequential retry for upstream 503');
    assert.equal(response.headers.has('location'),false);

    requests=0;mode='empty';
    response=await fetch(streamUrl);
    assert.equal(response.status,200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),ts);
    assert.equal(requests,2,'empty first upstream response is retried before sending 200');

    requests=0;mode='404';
    response=await fetch(streamUrl);
    assert.equal(response.status,404);
    assert.equal(requests,1,'permanent upstream 404 must not be retried');
    assert.equal(response.headers.has('location'),false);
    const body=await response.text();
    assert.equal(body.includes('SecretPass-123'),false);

    const info=await (await fetch(base+'/player_api.php?username=testuser&password=TestPass-123')).json();
    assert.equal(info.user_info.active_cons,'0','all subscriber leases released after request completion');
  }finally{
    child.kill('SIGTERM');
    await new Promise(resolve=>{
      if(child.exitCode!=null)return resolve();
      child.once('exit',resolve);
      setTimeout(resolve,1500);
    });
    await new Promise(resolve=>upstream.close(resolve));
    rmSync(dataDir,{recursive:true,force:true});
  }
},20000);
