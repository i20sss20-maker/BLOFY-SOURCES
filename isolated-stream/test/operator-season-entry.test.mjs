import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('STREAM library prominently links to actual authenticated Content Hub season manager',()=>{
 const html=renderOperatorDashboard('testNonce123');
 const libraryAt=html.indexOf('<section class="view" id="page-library">');
 const bannerAt=html.indexOf('id="content-hub-season-entry"');
 const batchesAt=html.indexOf('id="content-hub-batches"');
 assert.ok(libraryAt>=0&&bannerAt>libraryAt&&batchesAt>bannerAt);
 assert.match(html, /id="content-hub-season-launch"/);
 assert.match(html,/href="https:\/\/blofyplayer\.com\/admin\/content-hub"/);
 assert.match(html,/target="_blank" rel="noopener noreferrer"/);
 assert.match(html,/لا يبدأ أي نقل بمجرد فتحها/);
 assert.match(html,/id="content-hub-episodes"/);
 assert.doesNotMatch(html,/href="[^"]*[?&](?:token|password|key)=/i);
});
