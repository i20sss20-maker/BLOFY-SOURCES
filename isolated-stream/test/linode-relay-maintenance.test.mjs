import test from 'node:test';
import assert from 'node:assert/strict';
import {relayMaintenanceActive,relayMaintenanceBlocks,drainObservation,relayRetired,retiredRelayBlocks} from '../src/linode-relay-maintenance.mjs';
test('maintenance is explicitly enabled and denies all non-health paths',()=>{
 assert.equal(relayMaintenanceActive({}),false);
 assert.equal(relayMaintenanceActive({BLOFY_LINODE_RELAY_MAINTENANCE:'1'}),true);
 for(const path of ['/relay/ticket','/internal/relay-grants','/internal/live-feed/ticket','/get.php','/internal/xtream-manifest-relay','/','/operator/api/start','/internal/media-engine-health']){
  assert.equal(relayMaintenanceBlocks('GET',path,false),false);
  assert.equal(relayMaintenanceBlocks('GET',path,true),true);
  assert.equal(relayMaintenanceBlocks('POST',path,true),true);
 }
 for(const path of ['/health','/health/media','/internal/relay-health','/internal/media-hour-report']){
  assert.equal(relayMaintenanceBlocks('GET',path,true),false);
  assert.equal(relayMaintenanceBlocks('POST',path,true),true);
 }
});
test('local idle requires all four counters and never claims provider slot free',()=>{
 const zero={fanout:{activeFeeds:0,viewers:0,pendingSourceHandoffs:0},activeDirectMediaClients:0};
 assert.deepEqual(drainObservation(zero),{activeFeeds:0,viewers:0,pendingSourceHandoffs:0,activeDirectMediaClients:0,localRelayIdle:true,providerSlotVerified:false,allPathsDrained:false});
 assert.equal(drainObservation({}).localRelayIdle,false);
 assert.equal(drainObservation({...zero,activeDirectMediaClients:1}).localRelayIdle,false);
 assert.equal(drainObservation({...zero,fanout:{...zero.fanout,pendingSourceHandoffs:1}}).localRelayIdle,false);
});

test('maintenance permits only the authenticated account-check transport exception',()=>{
 assert.equal(relayMaintenanceBlocks('POST','/internal/xtream-catalog-relay',true),false);
 assert.equal(relayMaintenanceBlocks('POST','/internal/xtream-catalog-relay?extra=1',true),true);
 assert.equal(relayMaintenanceBlocks('POST','/internal/relay-grants',true),true);
 assert.equal(relayMaintenanceBlocks('GET','/relay/ticket',true),true);
});

test('retire old broker only, while keeping control-plane and health available',()=>{
 assert.equal(relayRetired({}),false);
 assert.equal(relayRetired({BLOFY_STREAM_RELAY_RETIRED:'1'}),true);
 for(const path of ['/internal/relay-grants','/internal/relay-grants?x=1','/relay','/relay/ticket']){
  assert.equal(retiredRelayBlocks(path,true),true);
  assert.equal(retiredRelayBlocks(path,false),false);
 }
 for(const path of ['/internal/relay-health','/health','/internal/xtream-catalog-relay','/internal/xtream-manifest-relay','/operator'])assert.equal(retiredRelayBlocks(path,true),false);
});
