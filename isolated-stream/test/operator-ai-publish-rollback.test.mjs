import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
test('BLOFY operator can view published AI revisions and request confirmed rollback',()=>{
 const html=renderOperatorDashboard('nonce-test-ai');
 for(const id of ['library-ai-history-refresh','library-ai-revision','library-ai-history'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/library-ai\/publish-status/);
 assert.match(html,/library-ai\/rollback/);
 assert.match(html,/confirm\("تأكيد التراجع/);
 assert.match(html,/تحديث المحتوى/);
 const embedded=html.match(/<script nonce="nonce-test-ai">([\s\S]*?)<\/script>/);
 assert.ok(embedded);
 assert.doesNotThrow(()=>new vm.Script(embedded[1]));
});
test('AI publish status and rollback are routed through authenticated operator endpoints',async()=>{
 const route=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 const client=await readFile(new URL('../src/unified-portal-client.mjs',import.meta.url),'utf8');
 assert.match(route,/\/operator\/api\/library-ai\/publish-status/);
 assert.match(route,/\/operator\/api\/library-ai\/rollback/);
 assert.match(route,/portal\.libraryAIRollback\(data\)/);
 assert.match(client,/ROOT\+'\/library-ai\/publish-status/);
 assert.match(client,/ROOT\+'\/library-ai\/rollback/);
});
