import { stripHtml } from '../catalog.mjs';
import { fetchJson, envInt, allowedOpenLicense } from './common.mjs';
import { wikimediaEntertainmentProfile } from './wikimedia.mjs';

const CURATED = [
  {
    file: 'Spring - Blender Open Movie.webm',
    title: 'Spring · الربيع',
    category: 'أجنبي مترجم · أفلام مفتوحة',
    subtitleLanguages: ['ar']
  },
  {
    file: 'Sintel movie - Blender Fondation.ogv',
    title: 'Sintel · سينتل',
    category: 'أجنبي مترجم · أفلام مفتوحة',
    subtitleLanguages: ['ar']
  },
  {
    file: 'Elephants Dream.ogv',
    title: 'Elephants Dream · حلم الفيلة',
    category: 'أجنبي مترجم · أفلام مفتوحة',
    subtitleLanguages: ['ar']
  },
  {
    file: 'Tears of Steel in 4k - Official Blender Foundation release.webm',
    title: 'Tears of Steel · دموع الفولاذ',
    category: 'أجنبي مترجم · أفلام مفتوحة',
    subtitleLanguages: ['ar']
  },
  {
    file: 'Cosmos Laundromat - First Cycle - Official Blender Foundation release.webm',
    title: 'Cosmos Laundromat · مغسلة الكون',
    category: 'أجنبي مترجم · أفلام مفتوحة',
    subtitleLanguages: ['apc', 'ar']
  },
  {
    file: 'Barsoum Looking for a Job - برسوم يبحث عن وظيفة.webm',
    title: 'برسوم يبحث عن وظيفة',
    category: 'عربي · أفلام مصرية كلاسيكية مفتوحة',
    arabicOriginal: true
  },
  {
    file: 'Aïn el Ghazal ou La Fille de Carthage. Drame de la vie arabe.webm',
    title: 'عين الغزال · فتاة قرطاج',
    category: 'عربي · أفلام تونسية كلاسيكية مفتوحة',
    arabicOriginal: true
  }
];

const ARABIC_TIMEDTEXT_CODES = new Set(['ar','arb','arz','apc','ary','aeb','acm','acq']);


const LOCALIZED_CATEGORY_BY_REASON = {
  film:'أجنبي مترجم · أفلام مفتوحة',
  series:'أجنبي مترجم · مسلسلات مفتوحة',
  documentary:'أجنبي مترجم · وثائقيات مفتوحة',
  theatre:'أجنبي مترجم · مسرح مفتوح',
  animation:'أجنبي مترجم · أطفال وأنيميشن مفتوح'
};

export function localizedOpenEntertainmentProfile({ title = '', description = '' } = {}) {
  const profile = wikimediaEntertainmentProfile({ title, description, category:'محتوى مترجم' });
  if (!profile.accepted) return { accepted:false, category:'', reason:profile.reason };
  const category = LOCALIZED_CATEGORY_BY_REASON[profile.reason] || '';
  return category
    ? { accepted:true, category, reason:profile.reason }
    : { accepted:false, category:'', reason:'unsupported-entertainment-type' };
}

function mediaKey(value = '') {
  return String(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function mediaFileFromArabicTimedText(title = '') {
  const text = String(title).replace(/^TimedText:/i, '');
  const match = text.match(/^(.*\.(?:webm|ogv|ogg|mp4))\.([a-z0-9-]+)\.srt$/i);
  if (!match || !ARABIC_TIMEDTEXT_CODES.has(match[2].toLowerCase())) return null;
  return { file: match[1], languageCode: match[2].toLowerCase() };
}

async function discoverArabicTimedTexts() {
  const scanLimit = envInt('OPEN_ARABIC_TIMEDTEXT_SCAN_LIMIT', 10000, 500, 20000);
  const byFile = new Map();
  let apcontinue = '';
  let scanned = 0;

  while (scanned < scanLimit) {
    const params = new URLSearchParams({
      action:'query',
      format:'json',
      formatversion:'2',
      list:'allpages',
      apnamespace:'102',
      apfilterredir:'nonredirects',
      aplimit:String(Math.min(500, scanLimit - scanned)),
      origin:'*'
    });
    if (apcontinue) params.set('apcontinue', apcontinue);
    const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`, 25000);
    const rows = data?.query?.allpages || [];
    if (!rows.length) break;
    scanned += rows.length;

    for (const row of rows) {
      const parsed = mediaFileFromArabicTimedText(row.title);
      if (!parsed) continue;
      const existing = byFile.get(parsed.file);
      const candidate = { file:parsed.file, timedTextTitle:String(row.title), languageCode:parsed.languageCode };
      if (!existing || (existing.languageCode !== 'ar' && parsed.languageCode === 'ar')) byFile.set(parsed.file, candidate);
    }

    apcontinue = String(data?.continue?.apcontinue || '');
    if (!apcontinue) break;
  }

  return [...byFile.values()];
}

async function commonsFiles(entries) {
  const items = [];
  for (let i = 0; i < entries.length; i += 25) {
    const batch = entries.slice(i, i + 25);
    const entryByKey = new Map(batch.map(x => [mediaKey(x.file), x]));
    const params = new URLSearchParams({
      action:'query',
      format:'json',
      formatversion:'2',
      redirects:'1',
      titles:batch.map(x => `File:${x.file}`).join('|'),
      prop:'imageinfo',
      iiprop:'url|mime|mediatype|extmetadata',
      iiurlwidth:'600',
      iiextmetadatafilter:'LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|DateTimeOriginal',
      origin:'*'
    });
    const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`, 30000);
    for (const page of data?.query?.pages || []) {
      if (!page || page.missing === true) continue;
      const file = String(page.title || '').replace(/^File:/i, '');
      const entry = entryByKey.get(mediaKey(file));
      if (!entry) continue;
      items.push({ entry, page });
    }
  }
  return items;
}

async function discoverOpenArabicSubtitleFilms() {
  const maxItems = envInt('OPEN_ARABIC_TIMEDTEXT_LIMIT', 500, 10, 3000);
  const entries = (await discoverArabicTimedTexts()).slice(0, maxItems * 3);
  const rows = await commonsFiles(entries);
  const out = [];

  for (const { entry, page } of rows) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    const mediaType = String(info.mediatype || '').toUpperCase();
    const ext = String(info.url).split('?')[0].split('.').pop()?.toLowerCase() || '';
    if (mediaType && !mediaType.includes('VIDEO')) continue;
    if (!['webm','ogv','ogg','mp4'].includes(ext)) continue;

    const license = licenseFrom(info.extmetadata || {});
    if (!license.allowed) continue;

    const artist = stripHtml(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || 'Wikimedia Commons');
    const description = stripHtml(info.extmetadata?.ImageDescription?.value || '');
    const title = entry.file.replace(/\.(?:webm|ogv|ogg|mp4)$/i, '').replace(/[_]+/g, ' ').trim();
    const entertainment = localizedOpenEntertainmentProfile({ title, description });
    if (!entertainment.accepted) continue;
    const subtitleUrl = `https://commons.wikimedia.org/w/index.php?title=${encodeURIComponent(entry.timedTextTitle)}&action=raw`;

    out.push({
      sourceItemId: entry.file,
      kind:'movie',
      title,
      description,
      icon:info.thumburl || '',
      category:entertainment.category,
      language:'ar',
      licenseName:license.name,
      licenseUrl:license.url,
      attribution:artist || 'Wikimedia Commons',
      publishedAt:stripHtml(info.extmetadata?.DateTimeOriginal?.value || ''),
      stream:{ resolver:'direct', url:info.url, extension:ext },
      subtitles:[{ language:'ar', sourceLanguageCode:entry.languageCode, label:'العربية', format:'srt', url:subtitleUrl }],
      rights:{
        mode:'wikimedia-arabic-timedtext',
        redistributable:true,
        commercialCompatible:true,
        arabic:true,
        arabicSubtitleVerified:true
      }
    });
    if (out.length >= maxItems) break;
  }

  return out;
}

async function commonsPage(title, extra = {}) {
  const params = new URLSearchParams({ action:'query', format:'json', formatversion:'2', titles:title, origin:'*', ...extra });
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`, 25000);
  return data?.query?.pages?.[0] || null;
}

function licenseFrom(meta = {}) {
  const name = stripHtml(meta.LicenseShortName?.value || '');
  const url = stripHtml(meta.LicenseUrl?.value || '');
  return { name, url, allowed: allowedOpenLicense(name, url) };
}

async function subtitleFor(file, languages = []) {
  for (const language of languages) {
    const title = `TimedText:${file}.${language}.srt`;
    const page = await commonsPage(title);
    if (page && page.missing !== true && page.invalid !== true) {
      const raw = `https://commons.wikimedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
      return { language:'ar', sourceLanguageCode:language, label:'العربية', format:'srt', url:raw };
    }
  }
  return null;
}

async function mapEntry(entry) {
  const page = await commonsPage(`File:${entry.file}`, {
    prop:'imageinfo',
    iiprop:'url|mime|mediatype|extmetadata',
    iiurlwidth:'600',
    iiextmetadatafilter:'LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|DateTimeOriginal'
  });
  const info = page?.imageinfo?.[0];
  if (!page || page.missing === true || !info?.url) return null;
  const license = licenseFrom(info.extmetadata || {});
  if (!license.allowed) return null;

  const subtitle = entry.arabicOriginal ? null : await subtitleFor(entry.file, entry.subtitleLanguages || ['ar']);
  if (!entry.arabicOriginal && !subtitle) return null;

  const ext = String(info.url).split('?')[0].split('.').pop()?.toLowerCase() || 'mp4';
  const artist = stripHtml(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || 'Wikimedia Commons');

  return {
    sourceItemId: entry.file,
    kind: 'movie',
    title: entry.title,
    description: stripHtml(info.extmetadata?.ImageDescription?.value || ''),
    icon: info.thumburl || '',
    category: entry.category,
    language: 'ar',
    licenseName: license.name,
    licenseUrl: license.url,
    attribution: artist || 'Wikimedia Commons',
    stream: { resolver:'direct', url:info.url, extension:ext },
    subtitles: subtitle ? [subtitle] : [],
    rights: {
      mode: 'curated-open-arabic',
      redistributable: true,
      commercialCompatible: true,
      arabic: true,
      arabicOriginal: Boolean(entry.arabicOriginal),
      arabicSubtitleVerified: Boolean(subtitle)
    }
  };
}

export async function syncOpenArabicFilms() {
  const rows = await Promise.all(CURATED.map(async entry => {
    try { return await mapEntry(entry); }
    catch (error) {
      console.warn(`Open Arabic film skipped ${entry.file}: ${String(error?.message || error)}`);
      return null;
    }
  }));

  const byId = new Map(rows.filter(Boolean).map(item => [item.sourceItemId, item]));
  try {
    for (const item of await discoverOpenArabicSubtitleFilms()) {
      if (!byId.has(item.sourceItemId)) byId.set(item.sourceItemId, item);
    }
  } catch (error) {
    console.warn(`Arabic TimedText discovery skipped: ${String(error?.message || error)}`);
  }
  return [...byId.values()];
}
