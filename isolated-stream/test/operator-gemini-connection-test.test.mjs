import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
import {readFile} from 'node:fs/promises';
test('Gemini operator check sends an authenticated action and renders safe diagnostics',async()=>{
 const html=renderOperatorDashboard('nonce');
 assert.match(html,/action\("library-ai\/test","library-ai-test"/);
 assert.match(html,/stream_ai_provider_auth_failed/);
 assert.match(html,/stream_ai_provider_quota/);
 assert.match(html,/id="library-ai-check"/);
 const dashboard=await readFile(new URL('../src/operator-dashboard.mjs',import.meta.url),'utf8');
 assert.match(dashboard,/libraryAIConnectionTest\(\)/);
 assert.match(dashboard,/operator_action_header_required/);
 const client=await readFile(new URL('../src/unified-portal-client.mjs',import.meta.url),'utf8');
 assert.match(client,/\/library-ai\/connection-test/);
});
