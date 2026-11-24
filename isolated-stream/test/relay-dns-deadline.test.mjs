import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPublicMediaUrl} from '../src/relay-guard.mjs';

const origin='https://licensed.example/live/channel.ts';
const publicRecord={address:'8.8.8.8',family:4};

test('relay validation stops waiting for a stalled resolver and ignores a late successful result',async()=>{
 let finish;
 const lookup=()=>new Promise(resolve=>{finish=resolve});
 const validation=assertPublicMediaUrl(origin,{lookup,dnsTimeoutMs:30});
 await assert.rejects(validation,/^Error: relay_origin_unresolved$/);
 finish([publicRecord]);
 // The original admission stays rejected even after DNS succeeds.
 await assert.rejects(validation,/relay_origin_unresolved/);
});
test('relay DNS deadline preserves all-address validation and rejects malformed answers',async()=>{
 assert.equal((await assertPublicMediaUrl(origin,{lookup:async()=>[publicRecord]})).href,origin);
 for(const records of [[publicRecord,{address:'127.0.0.1'}],[null],[{address:'10.0.0.1'}]])
   await assert.rejects(assertPublicMediaUrl(origin,{lookup:async()=>records}),/relay_private_origin/);
 await assert.rejects(assertPublicMediaUrl(origin,{lookup:async()=>[]}),/relay_origin_unresolved/);
 await assert.rejects(assertPublicMediaUrl(origin,{lookup:()=>{throw Error('resolver failure')}}),/relay_origin_unresolved/);
 await assert.rejects(assertPublicMediaUrl(origin,{dnsTimeoutMs:0}),/relay_dns_timeout_invalid/);
});
