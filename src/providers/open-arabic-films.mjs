import { stripHtml } from '../catalog.mjs';
import { fetchJson, allowedOpenLicense } from './common.mjs';

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
  return rows.filter(Boolean);
}
