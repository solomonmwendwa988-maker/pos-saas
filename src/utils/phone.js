/**
 * Kenyan phone number helpers.
 *
 * WhatsApp's `wa.me` links require a normalized international number with
 * no leading `+`, spaces, dashes or parentheses. Kenya's country code is
 * 254, so `07XXXXXXXX` becomes `2547XXXXXXXX`.
 */

/**
 * Normalizes a phone number to the `2547XXXXXXXX` form.
 * Returns null if the input isn't a valid Kenyan mobile number.
 */
export function normalizeKenyanPhone(input) {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return null;

  // 0712 345 678 → 254712345678
  if (/^0[17]\d{8}$/.test(digits)) {
    return '254' + digits.slice(1);
  }
  // 712 345 678 (missing leading 0) → 254712345678
  if (/^[17]\d{8}$/.test(digits)) {
    return '254' + digits;
  }
  // +254 712 345 678 or 254712345678
  if (/^254[17]\d{8}$/.test(digits)) {
    return digits;
  }
  // 254 0712345678 (extra leading 0) — a common mistake
  if (/^2540[17]\d{8}$/.test(digits)) {
    return '254' + digits.slice(4);
  }

  return null;
}

/**
 * Formats a number for display: 0712 345 678
 */
export function formatKenyanPhone(input) {
  const normalized = normalizeKenyanPhone(input);
  if (!normalized) return input || '';
  const local = '0' + normalized.slice(3);
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/**
 * True if the input is a valid Kenyan mobile number.
 */
export function isValidKenyanPhone(input) {
  return normalizeKenyanPhone(input) !== null;
}