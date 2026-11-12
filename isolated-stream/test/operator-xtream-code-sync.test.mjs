import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
test('Xtream 8K package changes can be requested for all 3 types from one selected source',()=>{
 const html=renderOperatorDashboard('nonce-code-sync');
 assert.match(html,/id="library-codes-sync-all"/);
 assert.match(html,/id="library-codes-sync-status"/);
 assert.match(html,/types:\["live","movie","series"\]/);
 assert.match(html,/action\("source\/"\+sourceId\+"\/sync","source-sync"/);
 assert.match(html,/if\(!sourceId\)/);
 assert.match(html,/original\.syncing\|\|original\.queued/);
 assert.match(html,/updated\.status==="online"&&Number\(updated\.lastSyncAt\)>lastSync/);
 assert.match(html,/واجهة 8K قد لا تنقل ترتيب الباقات نفسه/);
 const body=html.match(/<script nonce="nonce-code-sync">([\s\S]*?)<\/script>/);
 assert.ok(body);
 assert.doesNotThrow(()=>new vm.Script(body[1]));
});
test('operator sync uses existing authenticated source-scoped action and no browser secrets',async()=>{
 const source=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.match(source,/x-blofy-operator-action/);
 const html=renderOperatorDashboard('nonce-code-sync');
 assert.doesNotMatch(html,/password=|api_key=/i);
 assert.match(html,/لا تتغير صلاحيات الاشتراكات أو مددها/);
});
