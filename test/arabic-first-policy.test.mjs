import test from 'node:test';
import assert from 'node:assert/strict';
import { envBool, arabicFirstEnabled } from '../src/providers/common.mjs';
import { providerDefinitions } from '../src/providers/index.mjs';
import { mediaFileFromArabicTimedText, localizedOpenEntertainmentProfile } from '../src/providers/open-arabic-films.mjs';
import { normalizeAuthorizedManifest } from '../src/providers/authorized-partners.mjs';
import { archiveEntertainmentProfile } from '../src/providers/internet-archive.mjs';
import { peertubeEntertainmentProfile } from '../src/providers/peertube.mjs';
import { wikimediaEntertainmentProfile } from '../src/providers/wikimedia.mjs';

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


test('Arabic Archive entertainment filter keeps viewer content and assigns clean categories', () => {
  assert.deepEqual(
    archiveEntertainmentProfile({ title:'فيلم عربي كوميدي قديم', subject:['Arabic cinema'] }),
    { accepted:true, category:'عربي · أفلام عربية مفتوحة', reason:'film' }
  );
  assert.deepEqual(
    archiveEntertainmentProfile({ title:'مسلسل الحارة الحلقة 12', subject:['television series'] }),
    { accepted:true, category:'عربي · مسلسلات عربية مفتوحة', reason:'series' }
  );
  assert.deepEqual(
    archiveEntertainmentProfile({ title:'رحلة في الصحراء', subject:['فيلم وثائقي','television'] }),
    { accepted:true, category:'عربي · وثائقيات عربية مفتوحة', reason:'documentary' }
  );
  assert.deepEqual(
    archiveEntertainmentProfile({ title:'مغامرات صغيرة', subject:['كرتون','أطفال'] }),
    { accepted:true, category:'عربي · أطفال وأنيميشن مفتوح', reason:'animation' }
  );
  assert.deepEqual(
    archiveEntertainmentProfile({ title:'مسرحية ليلة طويلة', subject:['مسرح'] }),
    { accepted:true, category:'عربي · مسرحيات عربية مفتوحة', reason:'theatre' }
  );
  assert.deepEqual(
    archiveEntertainmentProfile({ title:'مسرحية مدرسة المشاغبين', subject:['مسرحيات عربية'] }),
    { accepted:true, category:'عربي · مسرحيات عربية مفتوحة', reason:'theatre' }
  );
});

test('Arabic Archive entertainment filter rejects lectures, interviews, news and generic uploads', () => {
  for (const doc of [
    { title:'محاضرة عن تاريخ السينما', subject:['فيلم'] },
    { title:'مقابلة مع مخرج فيلم عربي', subject:['cinema'] },
    { title:'بودكاست أسبوعي عن المسلسلات', subject:['series'] },
    { title:'نشرة أخبار المساء', subject:['television'] },
    { title:'تلاوة القرآن الكريم', subject:['Arabic'] },
    { title:'جولة في السعودية 2026', subject:['Saudi Arabia','Arabic'] }
  ]) {
    assert.equal(archiveEntertainmentProfile(doc).accepted, false, doc.title);
  }
});


test('PeerTube Arabic entertainment filter keeps films, drama, documentaries and kids', () => {
  assert.deepEqual(
    peertubeEntertainmentProfile({ name:'فيلم عربي قصير', category:{label:'Films'} }),
    { accepted:true, category:'عربي · أفلام وترفيه مفتوح', reason:'film' }
  );
  assert.deepEqual(
    peertubeEntertainmentProfile({ name:'الحلقة 3 من مسلسل المدينة', category:{label:'Entertainment'} }),
    { accepted:true, category:'عربي · مسلسلات عربية مفتوحة', reason:'series' }
  );
  assert.deepEqual(
    peertubeEntertainmentProfile({ name:'رحلة الصحراء', category:{label:'Documentary'} }),
    { accepted:true, category:'عربي · وثائقيات عربية مفتوحة', reason:'documentary' }
  );
  assert.deepEqual(
    peertubeEntertainmentProfile({ name:'حكايات للأطفال', category:{label:'Kids'} }),
    { accepted:true, category:'عربي · أطفال وأنيميشن مفتوح', reason:'animation' }
  );
});

test('PeerTube Arabic entertainment filter rejects education, news, tech and activism', () => {
  for (const video of [
    { name:'محاضرة عن السينما', category:{label:'Education'} },
    { name:'شرح برمجة تطبيق', category:{label:'Science & Technology'} },
    { name:'نشرة أخبار اليوم', category:{label:'News & Politics'} },
    { name:'بودكاست عن المسلسلات', category:{label:'Entertainment'} },
    { name:'محتوى عربي عام', category:{label:'People'} }
  ]) {
    assert.equal(peertubeEntertainmentProfile(video).accepted, false, video.name);
  }
});


test('Wikimedia Arabic entertainment filter keeps films, documentaries, theatre and animation', () => {
  assert.deepEqual(
    wikimediaEntertainmentProfile({ title:'فيلم مصري قديم', description:'نسخة سينمائية', category:'أفلام عربية' }),
    { accepted:true, category:'عربي · أفلام عربية مفتوحة', reason:'film' }
  );
  assert.deepEqual(
    wikimediaEntertainmentProfile({ title:'رحلة عبر الصحراء', description:'فيلم وثائقي عربي', category:'وثائقيات عربية' }),
    { accepted:true, category:'عربي · وثائقيات عربية مفتوحة', reason:'documentary' }
  );
  assert.deepEqual(
    wikimediaEntertainmentProfile({ title:'مسرحية عربية', description:'عرض مسرحي كامل', category:'مسرحيات عربية' }),
    { accepted:true, category:'عربي · مسرحيات عربية مفتوحة', reason:'theatre' }
  );
  assert.deepEqual(
    wikimediaEntertainmentProfile({ title:'كرتون للأطفال', description:'رسوم متحركة', category:'أطفال' }),
    { accepted:true, category:'عربي · أطفال وأنيميشن مفتوح', reason:'animation' }
  );
});

test('Wikimedia Arabic entertainment filter rejects news, interviews, lectures and generic clips', () => {
  for (const item of [
    { title:'نشرة أخبار المساء', description:'', category:'ويكيميديا عربي' },
    { title:'مقابلة مع مخرج فيلم', description:'cinema', category:'ويكيميديا عربي' },
    { title:'محاضرة عن الدراما', description:'', category:'ويكيميديا عربي' },
    { title:'لقطة عربية عامة', description:'', category:'ويكيميديا عربي' }
  ]) {
    assert.equal(wikimediaEntertainmentProfile(item).accepted, false, item.title);
  }
});


test('Arabic-subtitled open-video discovery keeps entertainment and assigns foreign-localized categories', () => {
  assert.deepEqual(
    localizedOpenEntertainmentProfile({ title:'Open Short Movie', description:'An animated science fiction short film.' }),
    { accepted:true, category:'أجنبي مترجم · أطفال وأنيميشن مفتوح', reason:'animation' }
  );
  assert.deepEqual(
    localizedOpenEntertainmentProfile({ title:'Desert Journey', description:'A documentary film about desert wildlife.' }),
    { accepted:true, category:'أجنبي مترجم · وثائقيات مفتوحة', reason:'documentary' }
  );
  assert.deepEqual(
    localizedOpenEntertainmentProfile({ title:'Feature Story', description:'Independent feature film and cinema release.' }),
    { accepted:true, category:'أجنبي مترجم · أفلام مفتوحة', reason:'film' }
  );
});

test('Arabic-subtitled open-video discovery rejects translated talks, news and generic clips', () => {
  for (const item of [
    { title:'Technology Lecture', description:'A lecture about software.' },
    { title:'Director Interview', description:'Interview about a movie.' },
    { title:'Daily News', description:'News bulletin.' },
    { title:'Open Video 2026', description:'Community video.' }
  ]) {
    assert.equal(localizedOpenEntertainmentProfile(item).accepted, false, item.title);
  }
});
