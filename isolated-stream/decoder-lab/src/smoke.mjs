import {runSyntheticDecoder} from './decoder.mjs';
import {runSyntheticAudioMatrix} from './audio-codec-matrix.mjs';
const result=await runSyntheticDecoder();
const matrix=await runSyntheticAudioMatrix();
console.log(JSON.stringify({
  event:'decoder_image_build_smoke',
  ok:result.ok,
  stage:result.stage,
  code:result.code||null,
  scope:result.scope,
  audioDecoderExecuted:result.audioDecoderExecuted,
  videoDecoderExecuted:result.videoDecoderExecuted,
  audioFrames:result.audioFrames??null,
  videoFrames:result.videoFrames??null,
  codecMatrix:matrix.tests.map(x=>({codec:x.codec,ok:x.ok,frames:x.audioFrames})),
  codecMatrixAllVerified:matrix.allVerified
}));
if(!result.ok||result.audioFrames<2||result.videoFrames<2||!matrix.allVerified)process.exitCode=1;
