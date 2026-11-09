import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';
test('Operator Gemini controls expose a manual check and an actionable button',()=>{
 const html=renderOperatorDashboard('testnonce');
 assert.match(html,/id="library-ai-check"/);
 assert.match(html,/id="library-ai-run"/);
 assert.doesNotMatch(html,/id="library-ai-run" disabled/);
 assert.match(html,/Gemini غير مهيأ أو خدمة الربط لا تستجيب/);
 assert.match(html,/BLOFY_LIBRARY_GEMINI_API_KEY/);
 assert.doesNotMatch(html,/سيُرسل إلى خدمة OpenAI/);
});
