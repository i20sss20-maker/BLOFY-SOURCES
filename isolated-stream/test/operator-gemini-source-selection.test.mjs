import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
test('Gemini source selection is next to the AI button and displays inline guidance',()=>{
 const html=renderOperatorDashboard('nonce');
 const panel=html.indexOf('id="library-ai-panel"');
 const selector=html.indexOf('id="library-ai-source"',panel);
 const action=html.indexOf('id="library-ai-run"',panel);
 assert.ok(panel>=0&&selector>panel&&action>selector);
 assert.match(html,/select\("library-ai-source",sources,"اختر مصدرًا"\)/);
 assert.match(html,/library-ai-source"\)\.focus\(\)/);
 assert.match(html,/جميع المصادر.*لا يصلح لاقتراح 12 عنوانًا/);
 assert.match(html,/libraryAISelection=""/);
});
