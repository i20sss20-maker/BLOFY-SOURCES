/**
 * Xtream admin-only customer contact data. Never include phone in Xtream
 * player API, M3U URLs, logging, or a public service-health response.
 * Keep existing accounts and bulk-created service accounts valid.
 */
export function cleanCustomerPhone(value = '') {
  return String(value ?? '').trim().replace(/[\s().-]/g, '');
}

export function validCustomerPhone(value = '') {
  const raw = String(value ?? '').trim();
  if (raw === '') return true; // Existing Xtream accounts may not have a phone.
  const phone = cleanCustomerPhone(raw);
  return /^\+?[0-9]{7,15}$/.test(phone);
}

/** Match Saudi local and international forms; preserve non-Saudi numbers. */
export function phoneSearchKey(value = '') {
  const digits = cleanCustomerPhone(value).replace(/\D/g, '');
  if (digits.startsWith('00966') && digits.length === 14) return '0' + digits.slice(5);
  if (digits.startsWith('966') && digits.length === 12) return '0' + digits.slice(3);
  return digits;
}

export function accountMatchesSearch(account, search) {
  const query = String(search ?? '').trim().toLocaleLowerCase('ar');
  if (!query) return true;
  const text = [account.username, account.label, account.note, account.phone]
    .filter(Boolean).join(' ').toLocaleLowerCase('ar');
  if (text.includes(query)) return true;
  const digits = phoneSearchKey(query);
  return digits.length >= 3 && phoneSearchKey(account.phone).includes(digits);
}

/** Excel/LibreOffice formulas must not execute if a label was untrusted. */
export function spreadsheetSafeCell(value) {
  const valueString = String(value ?? '');
  const neutralized = /^[\s\u0000-\u001f]*[=+@\-]/u.test(valueString)
    ? "'" + valueString : valueString;
  return '"' + neutralized.replace(/"/g, '""') + '"';
}
