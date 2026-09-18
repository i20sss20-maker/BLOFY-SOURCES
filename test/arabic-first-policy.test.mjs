import test from 'node:test';
import assert from 'node:assert/strict';
import { envBool, arabicFirstEnabled } from '../src/providers/common.mjs';
import { providerDefinitions } from '../src/providers/index.mjs';
import { mediaFileFromArabicTimedText } from '../src/providers/open-arabic-films.mjs';

function withEnv(values, fn) {
  const before = new Map();
  for (const [key, value] of Object.entries(values)) {
    before.set(key, process.env[key]);
    if (value == null) delete process.env[key];
    else process.env[key] = String(value);
  }
  try { return fn(); }
  finally {
    for (const [key, value] of before) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('ARABIC_FIRST defaults on and parses common boolean values', () => {
  withEnv({ ARABIC_FIRST: null }, () => assert.equal(arabicFirstEnabled(), true));
  withEnv({ ARABIC_FIRST: 'false' }, () => assert.equal(arabicFirstEnabled(), false));
  withEnv({ ARABIC_FIRST: 'YES' }, () => assert.equal(arabicFirstEnabled(), true));
  withEnv({ FEATURE_FLAG: 'on' }, () => assert.equal(envBool('FEATURE_FLAG', false), true));
  withEnv({ FEATURE_FLAG: '0' }, () => assert.equal(envBool('FEATURE_FLAG', true), false));
});

test('NASA is disabled by default in Arabic-first mode and can be explicitly enabled', () => {
  const nasa = providerDefinitions.find(x => x.id === 'nasa');
  assert.ok(nasa);

  withEnv({ ARABIC_FIRST: null, ENABLE_NASA: null }, () => assert.equal(nasa.enabled(), false));
  withEnv({ ARABIC_FIRST: 'false', ENABLE_NASA: null }, () => assert.equal(nasa.enabled(), true));
  withEnv({ ARABIC_FIRST: 'true', ENABLE_NASA: 'true' }, () => assert.equal(nasa.enabled(), true));
});

test('curated Arabic-localized open films provider is enabled by default', () => {
  const provider = providerDefinitions.find(x => x.id === 'open-arabic-films');
  assert.ok(provider);
  withEnv({ ENABLE_OPEN_ARABIC_FILMS: null }, () => assert.equal(provider.enabled(), true));
  withEnv({ ENABLE_OPEN_ARABIC_FILMS: 'false' }, () => assert.equal(provider.enabled(), false));
});


test('Arabic TimedText names resolve only to supported video files and Arabic language codes', () => {
  assert.deepEqual(
    mediaFileFromArabicTimedText('TimedText:Elephants Dream.ogv.ar.srt'),
    { file:'Elephants Dream.ogv', languageCode:'ar' }
  );
  assert.deepEqual(
    mediaFileFromArabicTimedText('TimedText:Cosmos_Laundromat.webm.apc.srt'),
    { file:'Cosmos_Laundromat.webm', languageCode:'apc' }
  );
  assert.deepEqual(
    mediaFileFromArabicTimedText('TimedText:Movie.mp4.arz.srt'),
    { file:'Movie.mp4', languageCode:'arz' }
  );
  assert.equal(mediaFileFromArabicTimedText('TimedText:Movie.webm.en.srt'), null);
  assert.equal(mediaFileFromArabicTimedText('TimedText:Poster.jpg.ar.srt'), null);
});
