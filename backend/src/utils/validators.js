import { isValidIBAN } from 'ibantools';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// NUBAN: 10 digits with checksum. Bank code not provided here, so enforce 10-digit numeric only.
export function validateNUBAN(nuban) {
  return /^[0-9]{10}$/.test(String(nuban || ''));
}

export function validateIBAN(iban) {
  return isValidIBAN(String(iban || ''));
}

export function normalizeE164(phone) {
  if (!phone) return null;
  const p = parsePhoneNumberFromString(phone);
  return p && p.isValid() ? p.number : null;
}

export function pctInRange(v) {
  if (v === undefined || v === null) return true;
  const n = Number(v);
  return !Number.isNaN(n) && n >= 0 && n <= 100;
}