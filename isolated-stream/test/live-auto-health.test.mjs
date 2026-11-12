import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as tick} from 'node:timers/promises';
import {createLiveAutoHealth} from '../src/live-auto-health.mjs';

const PATH='live-012345abcdef';
function createFixture(){
  let now=1_000_000;
  const item={path:PATH,title:'Licensed Sports',lastError:null,
    lastProbe:null,probePending:false,connections:0,
    backupConfigured:true,failovers:0};
  let probes=0;
  const liveSupervisor={list:()=>({ok:true,items:[item]}),
    probe:async path=>{assert.equal(path,PATH);probes++;
      return {status:202,body:{ok:true,started:true}}}};
  return {item,liveSupervisor,clock:()=>now,time:v=>{now=v},probes:()=>probes};
}
test('AUTO HEALTH never calls upstream during its default read-only scans',async()=>{
  const f=createFixture();
  const monitor=createLiveAutoHealth({liveSupervisor:f.liveSupervisor,
    clock:f.clock,recoveryProbeEnabled:false,staleAfterMs:30000});
  const untested=await monitor.scan();
  assert.equal(untested.totals.untested,1);
  assert.equal(untested.totals.healthy,0);
  assert.equal(untested.realVideoDecoded,false);
  assert.equal(untested.customerTrafficChanged,false);
  f.item.lastProbe={at:995_000,ok:false,code:'restream_hls_unavailable'};
  const broken=await monitor.scan();
  assert.equal(broken.totals.failed,1);
  assert.equal(broken.paths[0].consecutiveFailures,1);
  assert.equal(broken.events[0].kind,'transport_failure');
  await monitor.scan();
  assert.equal(monitor.snapshot().paths[0].consecutiveFailures,1,
    'unchanged failed sample must not count as a new outage');
  f.item.lastProbe={at:997_000,ok:false,code:'restream_provider_denied'};
  const twice=await monitor.scan();
  assert.equal(twice.paths[0].consecutiveFailures,2);
  assert.equal(f.probes(),0,'no source re-probe without explicit opt-in');
  f.item.lastProbe={at:999_000,ok:true,code:'ok'};
  const restored=await monitor.scan();
  assert.equal(restored.totals.healthy,1);
  assert.equal(restored.paths[0].consecutiveFailures,0);
  assert.equal(restored.events[0].kind,'transport_restored');
  f.time(2_000_000);
  const stale=await monitor.scan();
  assert.equal(stale.totals.stale,1);
  assert.equal(stale.totals.healthy,0);
});
test('one narrowly authorized backup re-probe is rate limited after two distinct failed samples',async()=>{
  const f=createFixture();
  const monitor=createLiveAutoHealth({liveSupervisor:f.liveSupervisor,
    clock:f.clock,recoveryProbeEnabled:true,reprobeAfterMs:60000});
  f.item.lastProbe={at:999_000,ok:false,code:'restream_hls_unavailable'};
  await monitor.scan();
  assert.equal(f.probes(),0);
  f.item.lastProbe={at:999_100,ok:false,code:'restream_provider_denied'};
  await monitor.scan();
  await tick();
  assert.equal(f.probes(),1);
  await monitor.scan();
  await tick();
  assert.equal(f.probes(),1,'cooldown blocks re-probe storm');
  f.time(1_070_000);
  f.item.lastProbe={at:1_069_000,ok:false,code:'restream_hls_unavailable'};
  await monitor.scan();
  await tick();
  assert.equal(f.probes(),2);
  f.item.backupConfigured=false;
  f.time(1_150_000);
  f.item.lastProbe={at:1_149_000,ok:false,code:'restream_provider_denied'};
  await monitor.scan();
  await tick();
  assert.equal(f.probes(),2,'no re-probe for a channel without a backup');
  assert.equal(monitor.snapshot().events.filter(e=>
    e.kind==='controlled_reprobe_requested').length,2);
});
test('AUTO HEALTH hides source URLs and honors only known path identifiers',async()=>{
  const f=createFixture();
  f.item.path='https://user:pass@example.com/live';
  f.item.lastError='password=secret';
  const monitor=createLiveAutoHealth({liveSupervisor:f.liveSupervisor,
    clock:f.clock,relayStats:()=>({relayFailureTotal:2,
      relayFailureCounts:{relay_provider_unavailable:2,
        'https://example.com/password':20}})});
  const report=await monitor.scan();
  assert.equal(report.totals.paths,0);
  assert.equal(report.relay.relayFailureCounts.relay_provider_unavailable,2);
  assert.ok(!JSON.stringify(report).includes('pass@example'));
  assert.ok(!JSON.stringify(report).includes('password=secret'));
});
test('unsupported supervisor reports unknown state instead of a healthy zero',async()=>{
  const monitor=createLiveAutoHealth({liveSupervisor:{list:()=>({ok:false})}});
  const data=await monitor.scan();
  assert.equal(data.ok,false);
  assert.equal(data.error,'auto_health_read_unavailable');
  assert.equal(monitor.snapshot().ok,false);
});
