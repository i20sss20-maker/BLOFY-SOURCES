import crypto from 'node:crypto';
import { fetchJson, envBool, envInt } from './common.mjs';

const ARABIC_CODES = new Set(['ar','ara','arabic','arb','arz','apc','ary','aeb','acm','acq']);
const SAUDI_TERRITORIES = new Set(['sa','ksa','saudi arabia','saudi','gcc','mena','global','world','worldwide']);

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(x => String(x || '').trim()).filter(Boolean);
  if (value == null) return [];
  return String(value).split(/[;,|]/).map(x => x.trim()).filter(Boolean);
}

function hasArabic(values) {
  return normalizeList(values).some(x => ARABIC_CODES.has(x.toLowerCase()));
}

function isSaudiCleared(territories) {
  return normalizeList(territories).some(x => SAUDI_TERRITORIES.has(x.toLowerCase()));
}

function safeHttpUrl(value, { allowHttp = false } = {}) {
  try {
    const u = new URL(String(value || ''));
    if (u.protocol === 'https:') return u.toString();
    if (allowHttp && u.protocol === 'http:') return u.toString();
  } catch {}
  return '';
}

function manifestItemId(raw, partner) {
  const explicit = String(raw.id || raw.sourceItemId || '').trim();
  if (explicit) return explicit;
  const basis = `${raw.kind || 'movie'}\0${raw.title || ''}\0${raw.stream?.url || raw.url || ''}`;
  return crypto.createHash('sha256').update(`${partner}\0${basis}`).digest('hex').slice(0, 24);
}

function normalizeSubtitles(raw, allowHttp) {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map(entry => {
    const language = String(entry?.language || entry?.lang || '').trim().toLowerCase();
    const url = safeHttpUrl(entry?.url, { allowHttp });
    if (!url || !ARABIC_CODES.has(language)) return null;
    return {
      language: 'ar',
      sourceLanguageCode: language,
      label: String(entry?.label || 'العربية').slice(0, 80),
      format: String(entry?.format || 'srt').slice(0, 16),
      url
    };
  }).filter(Boolean);
}

export function normalizeAuthorizedManifest(manifest, { allowHttp = false, now = Date.now(), maxItems = 50000 } = {}) {
  if (!manifest || typeof manifest !== 'object') throw new Error('partner_manifest_invalid');
  const partner = String(manifest.partner || manifest.provider || manifest.name || '').trim();
  const rightsReference = String(manifest.rightsReference || manifest.rights_reference || '').trim();
  const territories = normalizeList(manifest.territories || manifest.territory);
  const rightsUrl = safeHttpUrl(manifest.rightsUrl || manifest.rights_url, { allowHttp });

  if (!partner) throw new Error('partner_manifest_missing_partner');
  if (!rightsReference) throw new Error('partner_manifest_missing_rights_reference');
  if (!isSaudiCleared(territories)) throw new Error('partner_manifest_saudi_rights_missing');

  if (manifest.expiresAt || manifest.expires_at) {
    const expiry = new Date(manifest.expiresAt || manifest.expires_at).getTime();
    if (!Number.isFinite(expiry)) throw new Error('partner_manifest_invalid_expiry');
    if (expiry <= now) throw new Error('partner_manifest_rights_expired');
  }

  const rows = Array.isArray(manifest.items) ? manifest.items.slice(0, maxItems) : [];
  const out = [];

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const kind = ['live','movie','series_episode'].includes(raw.kind) ? raw.kind : 'movie';
    const title = String(raw.title || raw.name || '').trim();
    if (!title) continue;

    const streamUrl = safeHttpUrl(raw.stream?.url || raw.url, { allowHttp });
    if (!streamUrl) continue;
    if (raw.stream?.headers && typeof raw.stream.headers === 'object' && Object.keys(raw.stream.headers).length) continue;

    const subtitles = normalizeSubtitles(raw.subtitles, allowHttp);
    const arabicAudio = hasArabic(raw.audioLanguages || raw.audio_languages);
    const arabicLanguage = ARABIC_CODES.has(String(raw.language || '').trim().toLowerCase());
    const arabicSubtitle = subtitles.length > 0 || hasArabic(raw.subtitleLanguages || raw.subtitle_languages);
    const localizedArabic = arabicAudio || arabicLanguage || arabicSubtitle || raw.arabicLocalized === true || raw.arabic_localized === true;
    if (!localizedArabic) continue;

    const rawCategory = String(raw.category || (kind === 'live' ? 'قنوات شريك' : kind === 'series_episode' ? 'مسلسلات شريك' : 'أفلام شريك')).trim();
    const category = rawCategory.startsWith('عربي ·') || rawCategory.startsWith('أجنبي مترجم ·')
      ? rawCategory
      : arabicLanguage || arabicAudio
        ? `عربي · ${rawCategory}`
        : `أجنبي مترجم · ${rawCategory}`;

    out.push({
      sourceItemId: manifestItemId(raw, partner),
      kind,
      title,
      description: String(raw.description || raw.plot || '').trim(),
      icon: safeHttpUrl(raw.icon || raw.logo || raw.poster, { allowHttp }),
      category,
      language: 'ar',
      country: String(raw.country || '').trim().slice(0, 8),
      epgId: String(raw.epgId || raw.epg_id || '').trim(),
      publishedAt: String(raw.publishedAt || raw.published_at || '').trim(),
      seriesTitle: String(raw.seriesTitle || raw.series_title || '').trim(),
      season: Number(raw.season) > 0 ? Number(raw.season) : 1,
      episode: Number(raw.episode) > 0 ? Number(raw.episode) : 1,
      licenseName: `Authorized partner · ${partner}`,
      licenseUrl: rightsUrl,
      attribution: partner,
      subtitles,
      stream: {
        resolver: 'direct',
        url: streamUrl,
        extension: String(raw.stream?.extension || raw.extension || '').trim().slice(0, 16)
      },
      rights: {
        mode: 'authorized-partner-manifest',
        redistributable: true,
        commercialCompatible: true,
        partner,
        rightsReference,
        territories,
        arabic: true,
        arabicAudio,
        arabicSubtitle,
        expiresAt: manifest.expiresAt || manifest.expires_at || null
      }
    });
  }

  return out;
}

function manifestUrls() {
  const raw = String(process.env.AUTHORIZED_PARTNER_MANIFEST_URLS || process.env.AUTHORIZED_PARTNER_MANIFEST_URL || '').trim();
  if (!raw) return [];
  return [...new Set(raw.split(',').map(x => x.trim()).filter(Boolean))];
}

export async function syncAuthorizedPartnerManifests() {
  if (!envBool('ENABLE_AUTHORIZED_PARTNERS', false)) return [];
  if (!envBool('AUTHORIZED_PARTNER_RIGHTS_CONFIRMED', false)) throw new Error('authorized_partner_rights_not_confirmed');

  const allowHttp = envBool('AUTHORIZED_PARTNER_ALLOW_HTTP', false);
  const urls = manifestUrls();
  if (!urls.length) throw new Error('authorized_partner_manifest_url_missing');

  const maxItems = envInt('AUTHORIZED_PARTNER_MAX_ITEMS', 50000, 1, 100000);
  const byId = new Map();

  for (const rawUrl of urls) {
    const url = safeHttpUrl(rawUrl, { allowHttp });
    if (!url) throw new Error('authorized_partner_manifest_url_invalid');
    const manifest = await fetchJson(url, 30000);
    const rows = normalizeAuthorizedManifest(manifest, { allowHttp, maxItems });
    for (const item of rows) byId.set(`${item.rights.partner}\0${item.sourceItemId}`, item);
  }

  return [...byId.values()];
}
