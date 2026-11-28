import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyProviderDenialHint,readProviderDenialHint} from '../src/provider-denial-hint.mjs';

test('identifies explicit IP restrictions without preserving the response body',async()=>{
 assert.equal(await readProviderDenialHint(new Response('Access denied: IP 1.2.3.4 is blocked',{status:404})),'network_restriction');
});
test('does not infer a blocked IP from an ordinary 404',async()=>{
 assert.equal(await readProviderDenialHint(new Response('Not Found',{status:404})),null);
});
test('recognizes a connection limit in a provider header',async()=>{
 assert.equal(await readProviderDenialHint(new Response('none',{status:403,headers:{'x-error-message':'Too many active streams'}})),'connection_limit');
});
test('never reads successful media',async()=>{
 const r=new Response('IP blocked',{status:200});
 assert.equal(await readProviderDenialHint(r),null);
 assert.equal(await r.text(),'IP blocked');
});
test('only returns known, bounded hint labels',()=>{
 assert.equal(classifyProviderDenialHint('Your ISP is restricted'),'network_restriction');
 assert.equal(classifyProviderDenialHint('Not Found'),null);
});
