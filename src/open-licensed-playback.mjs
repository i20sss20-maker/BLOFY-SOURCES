const CC_LICENSE = /^https:\/\/creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/|publicdomain\/(?:zero|mark)\/)/i;

export function openLicensedMediaProxyAllowed(item, destination, enabled = false) {
  if (!enabled || item?.rights?.redistributable !== true || item.rights.commercialCompatible !== true) return false;
  if (item?.kind !== 'movie' && item?.kind !== 'series_episode') return false;
  const license = String(item?.licenseUrl || '');
  if (!CC_LICENSE.test(license)) return false;
  let target;
  try { target = new URL(String(destination)); } catch { return false; }
  if (target.protocol !== 'https:') return false;
  if (item.source === 'wikimedia') {
    return item.stream?.resolver === 'direct' && target.hostname === 'upload.wikimedia.org';
  }
  if (item.source === 'internet-archive') {
    return item.stream?.resolver === 'internet-archive' && target.hostname === 'archive.org';
  }
  return false;
}
