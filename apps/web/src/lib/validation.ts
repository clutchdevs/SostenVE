/**
 * Shared client-side validation for the intake and sign-up forms. The server
 * (Zod schemas) is the source of truth; these mirror it so the user gets
 * immediate feedback and can't submit obviously-invalid data.
 */

// Venezuelan MOBILE number: one of the carrier prefixes (0412/0414/0416/0424/
// 0426) followed by exactly 7 digits, optionally written with the +58 country
// code instead of the leading 0. Tolerant of spaces, dashes, dots and parentheses
// (stripped before matching). Landlines are intentionally rejected — the app
// contacts requesters/volunteers by call or WhatsApp.
const VE_PHONE_RE = /^(\+?58|0)?(412|414|416|424|426)\d{7}$/;

/** Longest raw phone we let a field hold (e.g. "+58 414 123 4567"). */
export const PHONE_MAX_LENGTH = 16;

/** Removes spaces, dashes, dots and parentheses (keeps a leading +). */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s().-]/g, '').trim();
}

export function isValidVePhone(raw: string): boolean {
  return VE_PHONE_RE.test(normalizePhone(raw));
}

/**
 * Identity document number: a V/E cédula is up to 8 digits; a passport (P) is
 * alphanumeric (5–20). `tipo` is the document-type code ('V' | 'E' | 'P').
 */
export function isValidDocumentNumber(numero: string, tipo: string): boolean {
  const value = numero.trim();
  return tipo === 'P'
    ? /^[A-Za-z0-9]{5,20}$/.test(value)
    : /^\d{1,8}$/.test(value);
}

/**
 * Standardizes a phone number for DISPLAY, regardless of how it was entered
 * (spaces, dashes, parentheses, with or without country code):
 *   - Venezuela national (0 + 10 digits) → `0XXX-XXXXXXX` (e.g. 0414-9247715)
 *   - Venezuela international (+58 + 10)  → `+58 XXX-XXXXXXX` (e.g. +58 424-2907338)
 *   - Short service/emergency codes (911) → left as-is
 *   - Any other international number       → `+<country><number>` (digits only)
 * The stored value is untouched; this is presentation only.
 */
export function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  if (digits.startsWith('58') && digits.length === 12) {
    const n = digits.slice(2);
    return `+58 ${n.slice(0, 3)}-${n.slice(3)}`;
  }
  if (!hasPlus && digits.startsWith('0') && digits.length === 11) {
    const n = digits.slice(1);
    return `0${n.slice(0, 3)}-${n.slice(3)}`;
  }
  if (!hasPlus && digits.length <= 6) return digits; // short service/emergency code
  return hasPlus ? `+${digits}` : digits;
}

export const PHONE_ERROR = 'Ingresa un teléfono venezolano válido (ej. 0414-1234567).';
export const CEDULA_ERROR = 'La cédula debe tener hasta 8 dígitos (solo números).';
