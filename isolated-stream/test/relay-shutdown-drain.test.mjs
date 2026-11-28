import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {createLiveFanout} from '../src/live-fanout.mjs';
import {createRelayBroker} from '../src/relay-broker.mjs';
function response(){
 const r=new EventEmitter();r.writeHead=(status)=>{r.status=status;r.headersSent=true;};
 r.end=body=>{r.body=body;r.writableEnded=true;r.emit('close');};
 return r;
}
test('drained relay refuses all new grants and redemptions without contacting origin',async()=>{
 const broker=createRelayBroker({sharedToken:'a'.repeat(64),fetchImpl:async()=>assert.fail('unexpected upstream')});
 broker.drain();broker.drain();
 const issue=response(),relay=response();
 await broker.issue({method:'POST'},issue);
 await broker.relay({method:'GET',url:'/relay/'+'a'.repeat(48)},relay);
 assert.equal(issue.status,503);assert.equal(relay.status,503);
 assert.equal(broker.stats().activeTickets,0);
});
test('drain denies late DNS completion and never starts another upstream',async()=>{
 let finish,entered;
 const wait=new Promise(resolve=>{entered=resolve;});
 const lookup=async()=>{entered();return new Promise(resolve=>{finish=resolve;});};
 const fanout=createLiveFanout({lookup,fetchImpl:async()=>assert.fail('unexpected upstream')});
 const res=response();
 const pending=fanout.handle({method:'GET'},res,'https://example.com/live/test.ts');
 await wait;fanout.drain();finish([{address:'93.184.216.34',family:4}]);await pending;
 assert.equal(res.status,503);assert.equal(fanout.stats().activeFeeds,0);
 const second=response();await fanout.handle({method:'GET'},second,'https://example.com/live/test.ts');
 assert.equal(second.status,503);
});
