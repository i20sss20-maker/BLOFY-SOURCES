import test from 'node:test';
import assert from 'node:assert/strict';
import { parseXtreamM3u } from '../src/providers/xtream-m3u-fallback.mjs';

const credentials={baseUrl:'https://media.example:8080',username:'alice',password:'correct'};
test('M3U fallback imports only native Xtream items from same origin and account',()=>{
  const m3u=[
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="news1" group-title="News" tvg-logo="https://media.example/icon.jpg",Live Channel',
    'https://media.example:8080/live/alice/correct/123.ts',
    '#EXTINF:-1 group-title="Movies",Movie Title',
    'https://media.example:8080/movie/alice/correct/456.mp4',
    '#EXTINF:-1 group-title="Series",Episode Title',
    'https://media.example:8080/series/alice/correct/789.mkv',
    '#EXTINF:-1,Wrong account',
    'https://media.example:8080/live/alice/wrong/999.ts',
    '#EXTINF:-1,Wrong host',
    'https://other.example/live/alice/correct/999.ts',
    '#EXTINF:-1,Query tokens',
    'https://media.example:8080/live/alice/correct/100.ts?token=secret'
  ].join('\n');
  const result=parseXtreamM3u(m3u,{...credentials,maxItems:5});
  assert.equal(result.length,3);
  assert.deepEqual(result.map(x=>x.kind),['live','movie','series_episode']);
  assert.deepEqual(result.map(x=>x.id),['123','456','789']);
  assert.equal(result[0].epgId,'news1');
  assert.equal(result[0].category,'News');
});
test('M3U fallback refuses malformed and non-M3U responses',()=>{
  assert.throws(()=>parseXtreamM3u('<html>no playlist</html>',credentials),/xtream_m3u_not_a_playlist/);
});
