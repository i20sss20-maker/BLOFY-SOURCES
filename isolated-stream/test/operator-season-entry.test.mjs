import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('STREAM library embeds real season controls without redirecting to old admin',()=>{
 const html=renderOperatorDashboard('nonceForTest');
 const libraryAt=html.indexOf('<section class="view" id="page-library">');
 const seasonAt=html.indexOf('id="content-hub-season-entry"');
 const batchesAt=html.indexOf('id="content-hub-batches"');
 assert.ok(libraryAt>=0&&seasonAt>libraryAt&&batchesAt>seasonAt);
 for(const id of ['season-refresh','season-online','season-pilot',
  'season-series-select','season-season-select','season-series-episodes',
  'season-candidates','season-select-batch','season-enqueue',
  'season-queue-list','season-start','season-pause',
  'season-preview-video','season-video-okay','season-audio-okay',
  'season-av-confirm','season-av-note',
  'season-episode-preview-player','season-episode-preview-wrap',
  'season-health-panel','season-health-summary','season-storage-progress',
  'season-health-alerts','season-audit-select','season-audit-run',
  'season-health-audit-list','season-audit-status',
  'season-concurrent-first','season-concurrent-second','season-concurrent-run',
  'season-concurrent-status','season-max-batches']){
  assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 assert.match(html,/إدارة المواسم والحلقات — داخل BLOFY STREAM/);
 assert.match(html,/operator\/api\/content-hub\/seasons\/episodes\//);
 assert.match(html,/اختبار تشغيل الحلقة/);
 assert.match(html,/api\("content-hub\/seasons\/health"\)/);
 assert.match(html,/action\("content-hub\/seasons\/audit","season-audit"/);
 assert.match(html,/المساحة المتبقية الحقيقية في S3 غير معروفة/);
 assert.match(html,/action\("content-hub\/seasons\/concurrent-read"/);
 assert.match(html,/maxBatches:budget/);
 assert.match(html,/اختبار قراءتين متزامنتين من التخزين الخاص/);
 assert.match(html,/api\("content-hub\/seasons\/series"/);
 assert.match(html,/api\("content-hub\/seasons\/queue"/);
 assert.match(html,/action\("content-hub\/seasons\/enqueue","season-enqueue"/);
 assert.match(html,/action\("content-hub\/seasons\/start","season-start"/);
 assert.match(html,/action\("content-hub\/seasons\/pause","season-pause"/);
 assert.match(html,/action\("content-hub\/seasons\/confirm","season-confirm"/);
 assert.doesNotMatch(html,/href="https:\/\/blofyplayer\.com\/admin\/content-hub"/);
 const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/);
 assert.ok(script,'operator inline JS present');
 assert.doesNotThrow(()=>new Function(script[1]),'operator page JS compiles');
});
