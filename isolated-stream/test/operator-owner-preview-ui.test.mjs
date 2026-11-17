import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('owner preview inline script parses and securely handles 409/429/503 before MP4 playback',()=>{
 const html=renderOperatorDashboard('synthetic-test-nonce');
 const match=html.match(/<script nonce="synthetic-test-nonce">([\s\S]*?)<\/script>/);
 assert.ok(match);
 assert.doesNotThrow(()=>new Script(match[1]));
 assert.match(html,/function loadOwnerPreview\(playerId,url,showStatus\)/);
 assert.match(html,/response\.ok/);
 assert.match(html,/ownerPreviewMessage\(code,response\.status\)/);
 assert.match(html,/response\.headers\.get\("content-type"\)/);
 assert.match(html,/bytes>12\*1024\*1024/);
 assert.match(html,/URL\.createObjectURL\(blob\)/);
 assert.match(html,/URL\.revokeObjectURL/);
 assert.match(html,/new AbortController\(\)/);
 assert.match(html,/credentials:"same-origin"/);
 assert.match(html,/private_preview_verified_prefix_unavailable/);
 assert.match(html,/private_preview_encode_failed/);
 assert.match(html,/owner_preview_busy/);
 assert.match(html,/owner_preview_cooldown/);
 assert.match(html,/\/operator\/api\/content-hub\/episodes\/preview/);
 assert.match(html,/\/operator\/api\/content-hub\/seasons\/episodes\//);
});

test('browser accepts bounded chunked preview only after verifying exact MP4 signature',()=>{
 const html=renderOperatorDashboard('no-content-length');
 assert.match(html,/var expected=header===null\?null:Number\(header\)/);
 assert.match(html,/var reader=response\.body\.getReader\(\)/);
 assert.match(html,/bytes>12\*1024\*1024/);
 assert.match(html,/blob\.slice\(4,8\)\.text\(\)!=="ftyp"/);
 assert.match(html,/expected!==null&&bytes!==expected/);
 assert.doesNotMatch(html,/var blob=await response\.blob\(\)/);
});
