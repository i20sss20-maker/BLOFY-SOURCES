import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('bulk users are unique, individually authenticated and persisted without plaintext',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'blofysat-bulk-test-'));
  const old=process.env.DATA_DIR;
  try{
    process.env.DATA_DIR=dir;
    process.env.AZURE_STORAGE_ACCOUNT='';
    process.env.XTREAM_USERNAME='';
    process.env.XTREAM_PASSWORD='';
    const { createAccountsBulk,verifyAccount,listAccounts }=await import('../src/context.mjs');
    await assert.rejects(()=>createAccountsBulk({count:101}),/invalid_bulk_count/);
    await assert.rejects(()=>createAccountsBulk({count:0}),/invalid_bulk_count/);
    await assert.rejects(()=>createAccountsBulk({count:1,labelPrefix:'=SUM(1,2)'}),/invalid_bulk_label/);
    const accounts=await createAccountsBulk({count:5,durationDays:30,maxConnections:2,labelPrefix:'BLOFYSAT'});
    assert.equal(accounts.length,5);
    assert.equal(new Set(accounts.map(a=>a.username)).size,5);
    assert.equal(new Set(accounts.map(a=>a.password)).size,5);
    assert.equal(listAccounts().length,5);
    for(const a of accounts){
      assert.ok(a.label.startsWith('BLOFYSAT'));
      assert.equal(a.maxConnections,2);
      assert.equal(verifyAccount(a.username,a.password),true);
      assert.equal(verifyAccount(a.username,'incorrect'),false);
      assert.ok(new Date(a.expiresAt).getTime()>Date.now());
    }
    const storedText=await readFile(path.join(dir,'state.json'),'utf8');
    const stored=JSON.parse(storedText);
    assert.equal(stored.accounts.length,5);
    for(const a of accounts)assert.equal(storedText.includes(a.password),false);
    const more=await createAccountsBulk({count:3,durationDays:7,labelPrefix:'Extra'});
    assert.equal(new Set([...accounts,...more].map(a=>a.username)).size,8);
    assert.equal(listAccounts().length,8);
    assert.equal(JSON.parse(await readFile(path.join(dir,'state.json'),'utf8')).accounts.length,8);
  }finally{
    if(old==null)delete process.env.DATA_DIR;
    else process.env.DATA_DIR=old;
    await rm(dir,{recursive:true,force:true});
  }
});
