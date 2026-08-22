export function normalizeAdmission(value = '') {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

export function normalizePhone(value = '') {
  return String(value).replace(/\D/g, '');
}

export function phoneLast4(value = '') {
  return normalizePhone(value).slice(-4);
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildClaimHash(admission, email, phone) {
  const normalizedAdmission = normalizeAdmission(admission);
  const normalizedEmail = normalizeEmail(email);
  const last4 = phoneLast4(phone);
  if (!normalizedAdmission || !normalizedEmail || last4.length !== 4) {
    throw new Error('Admission number, email and at least 4 phone digits are required.');
  }
  return sha256Hex(`${normalizedAdmission}|${normalizedEmail}|${last4}`);
}

export function randomToken(bytesLength = 32) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
