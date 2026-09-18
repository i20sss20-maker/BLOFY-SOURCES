import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquirePlaybackConnection,
  activeConnectionCount,
  connectionStats,
  resetConnectionsForTest
} from '../src/connections.mjs';

test('connection manager enforces max connections and releases idempotently',()=>{
  resetConnectionsForTest();
  const auth={username:'demo',account:{username:'demo',maxConnections:1}};
  const item={id:10,kind:'live',source:'test'};

  const first=acquirePlaybackConnection(auth,item);
  assert.equal(first.ok,true);
  assert.equal(activeConnectionCount('demo'),1);
  assert.equal(connectionStats().total,1);

  const second=acquirePlaybackConnection(auth,item);
  assert.equal(second.ok,false);
  assert.equal(second.error,'connection_limit_reached');
  assert.equal(second.current,1);
  assert.equal(second.max,1);

  assert.equal(first.release(),true);
  assert.equal(first.release(),false);
  assert.equal(activeConnectionCount('demo'),0);
  assert.equal(connectionStats().total,0);

  const third=acquirePlaybackConnection(auth,item);
  assert.equal(third.ok,true);
  third.release();
  resetConnectionsForTest();
});

test('connection manager isolates limits per subscriber',()=>{
  resetConnectionsForTest();
  const a={username:'a-user',account:{maxConnections:1}};
  const b={username:'b-user',account:{maxConnections:2}};
  const item={id:20,kind:'movie',source:'test'};

  const a1=acquirePlaybackConnection(a,item);
  const b1=acquirePlaybackConnection(b,item);
  const b2=acquirePlaybackConnection(b,item);
  const b3=acquirePlaybackConnection(b,item);

  assert.equal(a1.ok,true);
  assert.equal(b1.ok,true);
  assert.equal(b2.ok,true);
  assert.equal(b3.ok,false);
  assert.equal(activeConnectionCount('a-user'),1);
  assert.equal(activeConnectionCount('b-user'),2);
  assert.equal(connectionStats().total,3);

  a1.release();
  b1.release();
  b2.release();
  resetConnectionsForTest();
});
