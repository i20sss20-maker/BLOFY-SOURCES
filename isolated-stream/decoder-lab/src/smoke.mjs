import {runSyntheticDecoder} from './decoder.mjs';
const result=await runSyntheticDecoder();
console.log(JSON.stringify({
  event:'decoder_image_build_smoke',
  ok:result.ok,
  stage:result.stage,
  code:result.code||null,
  scope:result.scope,
  audioDecoderExecuted:result.audioDecoderExecuted,
  videoDecoderExecuted:result.videoDecoderExecuted,
  audioFrames:result.audioFrames??null,
  videoFrames:result.videoFrames??null
}));
if(!result.ok||result.audioFrames<2||result.videoFrames<2)process.exitCode=1;
