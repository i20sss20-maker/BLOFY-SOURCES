import test from 'node:test';
import assert from 'node:assert/strict';
import {validPublicIpv4,probeOutboundIpv4} from '../src/outbound-ip-proof.mjs';

test('accepts public IPv4 only and refuses private or malformed responses',()=>{
 for(const raw of ['8.8.8.8',' 1.2.3.4\n'])
  assert.ok(validPublicIpv4(raw));
 for(const raw of ['not-ip','https://provider.example','10.0.0.1',
   '172.20.3.4','192.168.1.1','127.0.0.1','100.64.0.2',
   '169.254.1.1','::1','256.1.1.1'])
  assert.equal(validPublicIpv4(raw),null);
});
test('multiple connections report distinct observed egress IPs without claiming full assignment',async()=>{
 const responses=['203.0.113.10','203.0.113.11','203.0.113.10',null,
   '203.0.113.12','203.0.113.11'];
 let i=0;
 const data=await probeOutboundIpv4({attempts:6,probe:async()=>responses[i++]});
 assert.equal(data.ok,true);
 assert.equal(data.observedCount,3);
 assert.deepEqual(data.observedIpv4,['203.0.113.10','203.0.113.11','203.0.113.12']);
 assert.equal(data.assignedPoolExhaustivelyVerified,false);
 assert.equal(data.providerAllowedTheseIps,null);
 assert.equal(data.customerTrafficChanged,false);
 assert.equal(JSON.stringify(data).includes('password'),false);
});
test('failed echo never turns into a false static IP claim',async()=>{
 const data=await probeOutboundIpv4({attempts:2,probe:async()=>{throw Error('secret-url');}});
 assert.equal(data.ok,false);
 assert.equal(data.observedCount,0);
 assert.equal(data.successful,0);
 assert.doesNotMatch(JSON.stringify(data),/secret-url/);
});
