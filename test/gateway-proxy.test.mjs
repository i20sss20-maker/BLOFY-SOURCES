import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))});s.on('error',reject)})}
async function upstream(port,name){return new Promise((resolve,reject)=>{const s=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({service:name,path:req.url,forwardedHost:req.headers['x-forwarded-host']||'',forwardedProto:req.headers['x-forwarded-proto']||''}))});s.listen(port,'127.0.0.1',()=>resolve(s));s.on('error',reject)})}
async function wait(base,child){for(let i=0;i<60;i++){if(child.exitCode!=null)throw new Error(`gateway exited ${child.exitCode}`);try{const r=await fetch(`${base}/health`);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw new Error('gateway health timeout')}
async function close(server){return new Promise(resolve=>server.close(resolve))}

test('unified gateway preserves activation and releases routes while keeping Xtream local',async()=>{
  const [port,activationPort,releasesPort]=await Promise.all([freePort(),freePort(),freePort()]);
  const activation=await upstream(activationPort,'activation'),releases=await upstream(releasesPort,'releases');
  const dataDir=mkdtempSync(path.join(os.tmpdir(),'blofy-gateway-')),base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['src/server.mjs'],{cwd:repoRoot,env:{...process.env,PORT:String(port),DATA_DIR:dataDir,PUBLIC_BASE_URL:base,XTREAM_PUBLIC_BASE_URL:base,ADMIN_PASSWORD:'AdminPass-123',SESSION_SECRET:'d'.repeat(64),XTREAM_USERNAME:'testuser',XTREAM_PASSWORD:'TestPass-123',SYNC_ON_START:'false',ACTIVATION_URL:`http://127.0.0.1:${activationPort}`,RELEASE_URL:`http://127.0.0.1:${releasesPort}`},stdio:['ignore','pipe','pipe']});
  try{
    await wait(base,child);
    let r=await fetch(`${base}/portal?x=1`,{headers:{host:'blofy.example','x-forwarded-proto':'https'}});let j=await r.json();assert.equal(j.service,'activation');assert.equal(j.path,'/portal?x=1');assert.equal(j.forwardedHost,'blofy.example');assert.equal(j.forwardedProto,'https');
    r=await fetch(`${base}/admin`);j=await r.json();assert.equal(j.service,'activation');assert.equal(j.path,'/admin');
    r=await fetch(`${base}/downloads/client.apk`);j=await r.json();assert.equal(j.service,'releases');assert.equal(j.path,'/downloads/client.apk');
    r=await fetch(`${base}/releases-admin/builds`);j=await r.json();assert.equal(j.service,'releases');assert.equal(j.path,'/admin/builds');
    r=await fetch(`${base}/player_api.php?username=testuser&password=TestPass-123`);j=await r.json();assert.equal(j.user_info.auth,1);assert.notEqual(j.service,'activation');
    r=await fetch(`${base}/xtream`);const html=await r.text();assert.match(html,/BLOFY XTREAM/);
  } finally {child.kill('SIGTERM');await Promise.all([close(activation),close(releases)]);rmSync(dataDir,{recursive:true,force:true})}
},15000);
