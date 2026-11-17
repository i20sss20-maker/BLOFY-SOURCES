import test from 'node:test';
import assert from 'node:assert/strict';
import {labBearerAuthorized} from '../src/access.mjs';
const readSecret='R'.repeat(64);
const runSecret='W'.repeat(64);
test('reader token and run token are distinct and no short token is valid',()=>{
  assert.equal(labBearerAuthorized('Bearer '+readSecret,readSecret),true);
  assert.equal(labBearerAuthorized('Bearer '+readSecret,runSecret),false);
  assert.equal(labBearerAuthorized('Bearer '+runSecret,readSecret),false);
  assert.equal(labBearerAuthorized('Bearer short','short'),false);
  assert.equal(labBearerAuthorized('Basic '+readSecret,readSecret),false);
  assert.equal(labBearerAuthorized('Bearer '+readSecret+'!',readSecret),false);
});
test('no token is reflected in validation results',()=>{
  assert.equal(labBearerAuthorized('Bearer '+readSecret,runSecret),false);
  assert.equal(labBearerAuthorized(null,readSecret),false);
});
