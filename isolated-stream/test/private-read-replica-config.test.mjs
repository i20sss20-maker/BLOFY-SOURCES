import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const file=new URL('../read-replica/mediamtx.yml',import.meta.url);
const dockerFile=new URL('../read-replica/Dockerfile',import.meta.url);

test('BLOFY private replica pulls only authorized Origin live paths, never provider Xtream',async()=>{
 const text=await readFile(file,'utf8');
 assert.match(text,/paths:\s*\n\s*"~\^\(live-\[a-f0-9\]\{12\}\)\$":/);
 assert.match(text,/source: rtsp:\/\/blofy-stream-media\.railway\.internal:8554\/\$G1/);
 assert.match(text,/sourceOnDemand: yes/);
 assert.match(text,/maxReaders: 256/);
 assert.match(text,/source: rtsp:\/\/blofy-stream-media\.railway\.internal:8554\/smoke/);
 assert.doesNotMatch(text,/source: https?:\/\//);
 assert.match(text,/smoke:\s*\n\s*source: rtsp:\/\/blofy-stream-media\.railway\.internal:8554\/smoke\s*\n\s*rtspTransport: tcp/);
 assert.doesNotMatch(text,/get\.php|player_api\.php|password=|source:\s*rtsp:\/\/[^\n]*@/);
 assert.doesNotMatch(text,/action: publish/);
 assert.match(text,/rtspTransports:\s*\[tcp\]/);
 assert.match(text,/rtmp: no/);
 assert.match(text,/srt: no/);
 assert.match(text,/webrtc: no/);
 assert.match(text,/apiAddress: 127\.0\.0\.1:9997/);
 assert.match(text,/fc00::\/7/);
});
test('MediaMTX pilot edge matches existing Origin build version and has no start secrets',async()=>{
 const text=await readFile(dockerFile,'utf8');
 assert.match(text,/FROM bluenviron\/mediamtx:1\.19\.2-ffmpeg/);
 assert.match(text,/COPY mediamtx\.yml \/mediamtx\.yml/);
 assert.doesNotMatch(text,/ENV |ARG |COPY .*secret|curl|wget|ENTRYPOINT/);
});
