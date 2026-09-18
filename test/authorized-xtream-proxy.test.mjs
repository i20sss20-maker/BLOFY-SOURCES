import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
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
    if(child.exitCode!=null)throw new Error(`gateway exited ${child.exitCode}`);
    try{
      const r=await fetch(`${base}/health`);
      if(r.ok)return await r.json();
    }catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('gateway health timeout');
}

function catalog(upstreamPort){
  const now=new Date().toISOString();
  return{
    schemaVersion:2,
    lastSyncAt:now,
    sources:{partner:{id:'partner',count:1,syncedAt:now}},
    items:[{
      id:901,
      source:'partner',
      sourceItemId:'xtream:DEMO:movie:501',
      kind:'movie',
      title:'Licensed Test Movie',
      description:'',
      icon:'',
      category:'عربي · أفلام',
      language:'ar',
      country:'SA',
      licenseName:'Authorized partner · Demo',
      licenseUrl:'',
      attribution:'Demo',
      publishedAt:now,
      stream:{
        resolver:'authorized-xtream',
        secretRef:'DEMO',
        mediaType:'movie',
        upstreamId:'501',
        extension:'mp4'
      },
      rights:{
        mode:'authorized-partner-xtream',
        redistributable:true,
        commercialCompatible:true,
        partner:'Demo',
        rightsReference:'agreement-test',
        territories:['SA'],
        arabic:true
      }
    }]
  };
}

test('licensed Xtream playback is proxied and upstream credentials never reach the client',async()=>{
  const upstreamPort=await freePort();
  const gatewayPort=await freePort();
  const gatewayBase=`http://127.0.0.1:${gatewayPort}`;
  const upstreamBase=`http://127.0.0.1:${upstreamPort}`;
  const dataDir=mkdtempSync(path.join(os.tmpdir(),'blofy-xtream-proxy-'));
  mkdirSync(dataDir,{recursive:true});
  writeFileSync(path.join(dataDir,'catalog.json'),JSON.stringify(catalog(upstreamPort)));

  const seen=[];
  let releaseHeld=null;
  const upstream=http.createServer((req,res)=>{
    seen.push({url:req.url,range:req.headers.range,userAgent:req.headers['user-agent']});
    if(req.url!=='/movie/licensed-user/LicensedPass-456/501.mp4'){
      res.writeHead(404);
      return res.end('not found');
    }
    const full=Buffer.from('ABCDEFGH');
    if(req.method==='HEAD'){
      res.writeHead(200,{'content-type':'video/mp4','content-length':String(full.length),'accept-ranges':'bytes'});
      return res.end();
    }
    if(req.headers.range==='bytes=0-3'){
      const part=full.subarray(0,4);
      res.writeHead(206,{
        'content-type':'video/mp4',
        'content-length':String(part.length),
        'content-range':'bytes 0-3/8',
        'accept-ranges':'bytes'
      });
      return res.end(part);
    }
    if(req.headers.range==='bytes=4-'){
      res.writeHead(206,{
        'content-type':'video/mp4',
        'content-range':'bytes 4-7/8',
        'accept-ranges':'bytes'
      });
      res.write('E');
      releaseHeld=()=>res.end('FGH');
      return;
    }
    res.writeHead(200,{'content-type':'video/mp4','content-length':String(full.length),'accept-ranges':'bytes'});
    res.end(full);
  });
  await new Promise((resolve,reject)=>{
    upstream.once('error',reject);
    upstream.listen(upstreamPort,'127.0.0.1',resolve);
  });

  const child=spawn(process.execPath,['src/server.mjs'],{
    cwd:repoRoot,
    env:{
      ...process.env,
      PORT:String(gatewayPort),
      DATA_DIR:dataDir,
      PUBLIC_BASE_URL:gatewayBase,
      XTREAM_PUBLIC_BASE_URL:gatewayBase,
      ADMIN_PASSWORD:'AdminPass-123',
      SESSION_SECRET:'p'.repeat(64),
      XTREAM_USERNAME:'testuser',
      XTREAM_PASSWORD:'TestPass-123',
      SYNC_ON_START:'false',
      ENABLE_XTREAM_SELF_TEST:'false',
      AUTHORIZED_PARTNER_ALLOW_HTTP:'true',
      BLOFY_PARTNER_XTREAM_DEMO_URL:upstreamBase,
      BLOFY_PARTNER_XTREAM_DEMO_USERNAME:'licensed-user',
      BLOFY_PARTNER_XTREAM_DEMO_PASSWORD:'LicensedPass-456'
    },
    stdio:['ignore','pipe','pipe']
  });

  try{
    const health=await waitHealth(gatewayBase,child);
    assert.equal(health.ok,true);

    let r=await fetch(`${gatewayBase}/movie/testuser/TestPass-123/901.mp4`,{
      headers:{range:'bytes=0-3'},
      redirect:'manual'
    });
    assert.equal(r.status,206);
    assert.equal(r.headers.get('location'),null);
    assert.equal(r.headers.get('content-range'),'bytes 0-3/8');
    assert.equal(r.headers.get('accept-ranges'),'bytes');
    assert.equal(r.headers.get('content-type'),'video/mp4');
    assert.equal(await r.text(),'ABCD');

    const responseHeaders=[...r.headers.entries()].map(([k,v])=>`${k}: ${v}`).join('\n');
    assert.equal(responseHeaders.includes('licensed-user'),false);
    assert.equal(responseHeaders.includes('LicensedPass-456'),false);

    r=await fetch(`${gatewayBase}/movie/testuser/TestPass-123/901.mp4`,{
      method:'HEAD',
      redirect:'manual'
    });
    assert.equal(r.status,200);
    assert.equal(r.headers.get('location'),null);
    assert.equal(r.headers.get('content-length'),'8');

    assert.ok(seen.length>=2);
    assert.equal(seen[0].url,'/movie/licensed-user/LicensedPass-456/501.mp4');
    assert.equal(seen[0].range,'bytes=0-3');
    assert.match(String(seen[0].userAgent||''),/BLOFY-Xtream-Gateway/);

    const held=await fetch(`${gatewayBase}/movie/testuser/TestPass-123/901.mp4`,{
      headers:{range:'bytes=4-'},
      redirect:'manual'
    });
    assert.equal(held.status,206);

    let info=await (await fetch(`${gatewayBase}/player_api.php?username=testuser&password=TestPass-123`)).json();
    assert.equal(info.user_info.active_cons,'1');
    assert.equal(info.user_info.max_connections,'1');

    const denied=await fetch(`${gatewayBase}/movie/testuser/TestPass-123/901.mp4`,{redirect:'manual'});
    assert.equal(denied.status,429);
    assert.equal(denied.headers.get('x-blofy-active-connections'),'1');
    assert.equal(denied.headers.get('x-blofy-max-connections'),'1');
    assert.equal(seen.filter(x=>x.range==='bytes=4-').length,1);

    releaseHeld();
    assert.equal(await held.text(),'EFGH');

    for(let i=0;i<30;i++){
      info=await (await fetch(`${gatewayBase}/player_api.php?username=testuser&password=TestPass-123`)).json();
      if(info.user_info.active_cons==='0')break;
      await new Promise(resolve=>setTimeout(resolve,25));
    }
    assert.equal(info.user_info.active_cons,'0');

    const finalHealth=await (await fetch(`${gatewayBase}/health`)).json();
    assert.equal(finalHealth.xtream.accounts.activeConnections,0);
  } finally {
    if(releaseHeld)try{releaseHeld()}catch{}
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
