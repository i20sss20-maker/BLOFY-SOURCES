import { stripHtml } from '../catalog.mjs';
import { fetchJson, envInt, allowedOpenLicense } from './common.mjs';

function wikimediaLicense(meta = {}) {
  const name = stripHtml(meta.LicenseShortName?.value || '');
  const url = stripHtml(meta.LicenseUrl?.value || '');
  return { name, url, allowed: allowedOpenLicense(name, url) };
}

export async function syncWikimediaCommons() {
  const limit = envInt('WIKIMEDIA_LIMIT', 800, 50, 5000);
  const batch = 50;
  let offset = 0;
  const items = [];
  while (items.length < limit) {
    const params = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: 'filetype:video', gsrnamespace: '6', gsrlimit: String(batch), gsroffset: String(offset), prop: 'imageinfo', iiprop: 'url|mime|mediatype|extmetadata', iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|AttributionRequired', origin: '*' });
    const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`, 30000);
    const pages = data?.query?.pages || [];
    if (!pages.length) break;
    for (const page of pages) {
      const info = page.imageinfo?.[0]; if (!info?.url) continue;
      const license = wikimediaLicense(info.extmetadata || {}); if (!license.allowed) continue;
      const title = String(page.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]{2,5}$/i, '');
      const ext = String(info.url).split('?')[0].split('.').pop()?.toLowerCase() || ''; if (!['webm','ogv','ogg','mp4'].includes(ext)) continue;
      const artist = stripHtml(info.extmetadata?.Artist?.value || info.extmetadata?.Credit?.value || 'Wikimedia Commons');
      items.push({ sourceItemId: String(page.pageid || page.title), kind: 'movie', title, description: stripHtml(info.extmetadata?.ImageDescription?.value || ''), icon: '', category: 'Wikimedia Commons', licenseName: license.name, licenseUrl: license.url, attribution: artist, stream: { resolver: 'direct', url: info.url, extension: ext }, rights: { mode: 'license-filtered', redistributable: true, commercialCompatible: true } });
      if (items.length >= limit) break;
    }
    if (!data.continue?.gsroffset) break; offset = Number(data.continue.gsroffset);
  }
  return items;
}
