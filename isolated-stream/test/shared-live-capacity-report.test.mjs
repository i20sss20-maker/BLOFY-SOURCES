import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedLiveCapacityReport} from '../src/shared-live-capacity-report.mjs';
test('four viewers, one local feed, no source-side claim',()=>{
 const r=sharedLiveCapacityReport({sharedLiveEnabled:true,activeDirectMediaClients:0,
 fanout:{activeFeeds:1,viewers:4,sourceLimitRejections:3,upstreamSessionsOpened:1,
 channels:[{viewers:4,lastMediaAgeMs:400,sourceUrl:'secret',account:'private'}]}});
 assert.equal(r.maxViewersOnOneFeed,4);assert.equal(r.activeFeeds,1);
 assert.equal(r.sourceLimitRejections,3);assert.equal(r.providerSlotVerified,false);
 assert.equal(r.decodedVideoVerified,false);assert.equal(r.staleFeeds,0);
 assert.ok(!JSON.stringify(r).includes('secret'));assert.ok(!JSON.stringify(r).includes('private'));
});
test('disabled or malformed metrics remain unknown, stale media distinguished',()=>{
 assert.equal(sharedLiveCapacityReport({sharedLiveEnabled:false}),null);
 const r=sharedLiveCapacityReport({sharedLiveEnabled:true,fanout:{activeFeeds:-1,
 channels:[{viewers:2,lastMediaAgeMs:15000}]}});
 assert.equal(r.activeFeeds,null);assert.equal(r.viewers,null);assert.equal(r.staleFeeds,1);
});
