import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {renderOperatorDashboard} from '../src/operator-unified-view.mjs';

test('subscriber Xtream diagnostics show concrete failed step and category counts',()=>{
  const html=renderOperatorDashboard('nonce-compat');
  assert.match(html,/xtream_flow_failure/);
  assert.match(html,/xtream_catalog_empty/);
  assert.match(html,/postLogin/);
  assert.match(html,/panelLogin/);
  assert.match(html,/تصنيفات القنوات/);
  assert.match(html,/d\.failedStep/);
  assert.match(html,/d\.checks/);
  assert.match(html,/state\.accountHost/);
  assert.doesNotMatch(html,/https:\/\/bfy\.up\.railway\.app/);
  assert.match(html,/id="accounts-host-value"/);
  assert.match(html,/var host=creds\.serverUrl\|\|state\.accountHost\|\|""/);
  const script=html.match(/<script nonce="nonce-compat">([\s\S]*?)<\/script>/);
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script[1]));
});
