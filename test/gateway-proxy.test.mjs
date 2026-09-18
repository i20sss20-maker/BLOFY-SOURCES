import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))});s.on('error',reject)})}
async function wait(base,child){for(let i=0;i<80;i++){if(child.exitCode!=null)throw new Error(`xtream exited ${child.exitCode}`);try{const r=await fetch(`${base}/health`);if(r.ok)return await r.json()}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('xtream health timeout')}

test('standalone service exposes only its own Xtream/admin routes',async()=>{
  const port=await freePort();
  const dataDir=mkdtempSync(path.join(os.tmpdir(),'blofy-standalone-')),base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['src/server.mjs'],{cwd:repoRoot,env:{...process.env,PORT:String(port),DATA_DIR:dataDir,PUBLIC_BASE_URL:base,XTREAM_PUBLIC_BASE_URL:base,ADMIN_PASSWORD:'AdminPass-123',SESSION_SECRET:'d'.repeat(64),XTREAM_USERNAME:'testuser',XTREAM_PASSWORD:'TestPass-123',SYNC_ON_START:'false',ENABLE_XTREAM_SELF_TEST:'false'},stdio:['ignore','pipe','pipe']});
  try{
    const health=await wait(base,child);
    assert.equal(health.ok,true);
    assert.equal(health.service,'blofy-xtream');
    assert.equal(health.standalone,true);

    let r=await fetch(`${base}/admin`);
    assert.equal(r.status,200);
    let html=await r.text();
    assert.match(html,/لوحة الإدارة/);

    r=await fetch(`${base}/xtream`);
    assert.equal(r.status,200);
    html=await r.text();
    assert.match(html,/إدارة المشتركين/);

    r=await fetch(`${base}/sources-admin`);
    assert.equal(r.status,200);

    r=await fetch(`${base}/portal`);
    assert.equal(r.status,404);

    r=await fetch(`${base}/downloads`);
    assert.equal(r.status,404);

    r=await fetch(`${base}/player_api.php?username=testuser&password=TestPass-123`);
    const j=await r.json();
    assert.equal(j.user_info.auth,1);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve=>{if(child.exitCode!=null)return resolve();child.once('exit',resolve);setTimeout(resolve,1500)});
    rmSync(dataDir,{recursive:true,force:true});
  }
},15000);
