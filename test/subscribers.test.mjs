import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('multiple subscribers can expire, renew, disable and authenticate independently', () => {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'blofy-subs-'));
  try {
    mkdirSync(dataDir,{recursive:true});
    const salt='00112233445566778899aabbccddeeff';
    const password='ExpiredPass-123';
    const hash=crypto.scryptSync(password,salt,32).toString('hex');
    writeFileSync(path.join(dataDir,'state.json'),JSON.stringify({schemaVersion:2,accounts:[{username:'expireduser',salt,hash,createdAt:new Date(Date.now()-10*86400000).toISOString(),expiresAt:new Date(Date.now()-86400000).toISOString(),enabled:true,maxConnections:1,label:'Expired test'}]}));
    const script = `
      const mod=await import('./src/context.mjs');
      if(mod.verifyAccount('expireduser','ExpiredPass-123'))process.exit(11);
      const renewed=await mod.renewAccount('expireduser',30);
      if(renewed.expired||!mod.verifyAccount('expireduser','ExpiredPass-123'))process.exit(12);
      const second=await mod.createAccount({username:'seconduser',password:'SecondPass-123',durationDays:90,maxConnections:2,label:'Second'});
      if(!mod.verifyAccount('seconduser','SecondPass-123'))process.exit(13);
      if(mod.listAccounts().length!==2)process.exit(14);
      await mod.setAccountEnabled('seconduser',false);
      if(mod.verifyAccount('seconduser','SecondPass-123'))process.exit(15);
      await mod.setAccountEnabled('seconduser',true);
      if(!mod.verifyAccount('seconduser','SecondPass-123'))process.exit(16);
      await mod.deleteAccount('seconduser');
      if(mod.listAccounts().length!==1)process.exit(17);
    `;
    const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:repoRoot,env:{...process.env,DATA_DIR:dataDir,SESSION_SECRET:'b'.repeat(64),XTREAM_USERNAME:'',XTREAM_PASSWORD:''},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr||result.stdout||`child exited ${result.status}`);
  } finally { rmSync(dataDir,{recursive:true,force:true}); }
});
