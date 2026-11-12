import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  cleanCustomerPhone,validCustomerPhone,phoneSearchKey,
  accountMatchesSearch,spreadsheetSafeCell
} from '../src/admin-customer-helpers.mjs';

test('validates and canonicalizes optional admin-only phone without breaking old subscribers',()=>{
  assert.equal(validCustomerPhone(''),true);
  assert.equal(cleanCustomerPhone('+966 50 123 4567'),'+966501234567');
  assert.equal(validCustomerPhone('0551234567'),true);
  assert.equal(validCustomerPhone('+966 50 123 4567'),true);
  assert.equal(validCustomerPhone('000'),false);
  assert.equal(validCustomerPhone('=HYPERLINK("evil")'),false);
  assert.equal(validCustomerPhone('00\\r\\ntest'),false);
  assert.equal(phoneSearchKey('+966501234567'),'0501234567');
  assert.equal(phoneSearchKey('00966501234567'),'0501234567');
  assert.equal(phoneSearchKey('0501234567'),'0501234567');
});

test('lookup finds Saudi local/international phone as well as name and username',()=>{
  const account={username:'user442',label:'عميل تجريبي',note:'ملاحظات',phone:'+966501234567'};
  assert.equal(accountMatchesSearch(account,'050123'),true);
  assert.equal(accountMatchesSearch(account,'966501234'),true);
  assert.equal(accountMatchesSearch(account,'user442'),true);
  assert.equal(accountMatchesSearch(account,'تجريبي'),true);
  assert.equal(accountMatchesSearch(account,'random'),false);
});

test('CSV cells cannot execute Excel or spreadsheet formulas',()=>{
  for(const dangerous of ['=2+3','+CMD|a','-cmd()','@SUM(1,1)','  =WEBSERVICE("x")','\t=IMPORTDATA("x")']){
    const cell=spreadsheetSafeCell(dangerous);
    assert.ok(cell.startsWith('"\\''),JSON.stringify(cell));
    assert.ok(!/^"\\s*[=+@-]/.test(cell),JSON.stringify(cell));
  }
  assert.equal(spreadsheetSafeCell('Saleh "test"'),'"Saleh ""test"""');
  assert.equal(spreadsheetSafeCell('0551234567'),'"0551234567"');
});

test('phone survives create/edit/restart; secrets never appear in accounts listing',()=>{
  const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const dir=mkdtempSync(path.join(tmpdir(),'blofy-phone-'));
  try{
    const script=String.raw\`
      const assert=(await import('node:assert/strict')).default;
      const c=await import('./src/context.mjs');
      const created=await c.createAccount({
        username:'contact42',password:'SecretTest-8475',
        label:'test customer',phone:'+966 50 123 4567'
      });
      assert.equal(created.phone,'+966501234567');
      const publicRow=c.listAccounts().find(x=>x.username==='contact42');
      assert.equal(publicRow.phone,'+966501234567');
      assert.equal(Object.hasOwn(publicRow,'password'),false);
      assert.equal(Object.hasOwn(publicRow,'hash'),false);
      assert.equal(Object.hasOwn(publicRow,'salt'),false);
      await c.updateAccount('contact42',{phone:'0550000000'});
      assert.equal(c.listAccounts().find(x=>x.username==='contact42').phone,'0550000000');
      await assert.rejects(c.updateAccount('contact42',{phone:'=FOO()'}),/invalid_customer_phone/);
      assert.equal(c.listAccounts().find(x=>x.username==='contact42').phone,'0550000000');
      await c.updateAccount('contact42',{phone:''});
      assert.equal(c.listAccounts().find(x=>x.username==='contact42').phone,'');
      await c.updateAccount('contact42',{phone:'0501234567'});
    \`;
    const env={...process.env,DATA_DIR:dir,SESSION_SECRET:'c'.repeat(64),
      XTREAM_USERNAME:'',XTREAM_PASSWORD:'',AZURE_STORAGE_ACCOUNT:'',
      IDENTITY_ENDPOINT:'',IDENTITY_HEADER:''};
    const first=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd,env,encoding:'utf8'});
    assert.equal(first.status,0,first.stderr||first.stdout);
    const second=spawnSync(process.execPath,['--input-type=module','-e',
      "const c=await import('./src/context.mjs');if(c.listAccounts()[0]?.phone!=='0501234567')process.exit(3);"
    ],{cwd,env,encoding:'utf8'});
    assert.equal(second.status,0,second.stderr||second.stdout);
  }finally{rmSync(dir,{recursive:true,force:true})}
});
