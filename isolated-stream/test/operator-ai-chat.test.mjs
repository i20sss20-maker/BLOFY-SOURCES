import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
test('chat command panel has explicit staged approval and no automatic publishing',()=>{
 const html=renderOperatorDashboard('nonce-safe');
 for(const tag of ['id="library-ai-command"','id="library-ai-chat-send"',
  'id="library-ai-chat-apply" disabled','id="library-ai-chat-status"'])
  assert.ok(html.includes(tag),tag);
 const embedded=html.match(/<script nonce="nonce-safe">([\s\S]*?)<\/script>/);
 assert.ok(embedded);
 assert.doesNotThrow(()=>new vm.Script(embedded[1]));
 assert.match(html,/action\("library-ai\/chat","library-ai-chat"/);
 assert.match(html,/action\("library-ai\/apply","library-ai-apply"/);
 assert.match(html,/if\(!confirm\("هل تعتمد تغيير ترتيب الأقسام/);
 assert.match(html,/libraryAIProposedPlan=null/);
});
test('operator routes require the same protected action-header mechanism',async()=>{
 const server=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 const client=await readFile(new URL('../src/unified-portal-client.mjs',import.meta.url),'utf8');
 assert.match(server,/operator\/api\/library-ai\/chat/);
 assert.match(server,/operator\/api\/library-ai\/apply/);
 assert.match(server,/portal\.libraryAIChat\(data\)/);
 assert.match(server,/portal\.libraryAIApply\(data\)/);
 assert.match(client,/ROOT\+'\/library-ai\/chat'/);
 assert.match(client,/ROOT\+'\/library-ai\/apply'/);
});
