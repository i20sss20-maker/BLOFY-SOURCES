import test from 'node:test';
import assert from 'node:assert/strict';
import { envBool, arabicFirstEnabled } from '../src/providers/common.mjs';
import { providerDefinitions } from '../src/providers/index.mjs';
import { mediaFileFromArabicTimedText } from '../src/providers/open-arabic-films.mjs';
import { normalizeAuthorizedManifest } from '../src/providers/authorized-partners.mjs';

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


test('authorized partner manifests require a rights reference and Saudi/MENA territory', () => {
  assert.throws(
    () => normalizeAuthorizedManifest({ partner:'Demo', territories:['SA'], items:[] }),
    /missing_rights_reference/
  );
  assert.throws(
    () => normalizeAuthorizedManifest({ partner:'Demo', rightsReference:'contract-1', territories:['FR'], items:[] }),
    /saudi_rights_missing/
  );
  assert.throws(
    () => normalizeAuthorizedManifest({ partner:'Demo', rightsReference:'contract-1', territories:['SA'], expiresAt:'2020-01-01T00:00:00Z', items:[] }),
    /rights_expired/
  );
});

test('authorized partner manifests accept Arabic/localized media and reject foreign-only rows', () => {
  const rows = normalizeAuthorizedManifest({
    partner:'Demo Distributor',
    rightsReference:'deal-2026-001',
    territories:['MENA'],
    expiresAt:'2030-01-01T00:00:00Z',
    items:[
      { id:'live-ar', kind:'live', title:'قناة عربية', language:'ar', url:'https://example.com/live.m3u8', category:'ترفيه' },
      { id:'movie-sub', kind:'movie', title:'Foreign Movie', language:'en', url:'https://example.com/movie.mp4', subtitleLanguages:['ar'], category:'Movies' },
      { id:'movie-no-ar', kind:'movie', title:'English Only', language:'en', url:'https://example.com/no-ar.mp4', category:'Movies' }
    ]
  }, { now: Date.parse('2026-09-18T00:00:00Z') });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].sourceItemId, 'live-ar');
  assert.equal(rows[0].category, 'عربي · ترفيه');
  assert.equal(rows[1].sourceItemId, 'movie-sub');
  assert.equal(rows[1].category, 'أجنبي مترجم · Movies');
  assert.equal(rows[1].rights.rightsReference, 'deal-2026-001');
});

test('authorized partner manifests require HTTPS unless HTTP is explicitly allowed', () => {
  const manifest = {
    partner:'Demo',
    rightsReference:'deal-2',
    territories:['SA'],
    items:[{ id:'x', kind:'live', title:'عربي', language:'ar', url:'http://example.com/live.m3u8' }]
  };
  assert.equal(normalizeAuthorizedManifest(manifest).length, 0);
  assert.equal(normalizeAuthorizedManifest(manifest, { allowHttp:true }).length, 1);
});
