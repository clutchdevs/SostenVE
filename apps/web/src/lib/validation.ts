/**
 * Shared client-side validation for the intake and sign-up forms. The server
 * (Zod schemas) is the source of truth; these mirror it so the user gets
 * immediate feedback and can't submit obviously-invalid data.
 */

// Venezuelan MOBILE number for the REQUESTER intake (issue #129): must carry the
// +58 country code, a carrier prefix (412/414/416/424/426) and 7 digits. The
// leading-0 national form (0414…) is intentionally REJECTED so the stored contact
// always has the country code the assigned psychologist's WhatsApp (wa.me) deep
// link needs. Tolerant of spaces, dashes, dots and parentheses (stripped before
// matching). Landlines are rejected — the app contacts people by call/WhatsApp.
const VE_PHONE_RE = /^\+?58(412|414|416|424|426)\d{7}$/;

/** Longest raw phone we let a field hold (e.g. "+58 414 123 4567"). */
export const PHONE_MAX_LENGTH = 16;

/** Removes spaces, dashes, dots and parentheses (keeps a leading +). */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s().-]/g, '').trim();
}

export function isValidVePhone(raw: string): boolean {
  return VE_PHONE_RE.test(normalizePhone(raw));
}

// International phone (#128): optional leading + and 7–15 digits (E.164-ish).
// Used for psychologist registration (volunteers may live abroad). Intake stays
// Venezuelan-only via isValidVePhone.
const INTL_PHONE_RE = /^\+?\d{7,15}$/;

export function isValidIntlPhone(raw: string): boolean {
  return INTL_PHONE_RE.test(normalizePhone(raw));
}

/**
 * Normalizes a Venezuelan mobile number to international format (58 + 10
 * digits, no leading +) regardless of whether it was entered/stored with a
 * leading 0 or a +58/58 country code — what WhatsApp deep links (wa.me)
 * require to resolve to the right chat (issue #129). Returns the stripped
 * input unchanged if it doesn't match a Venezuelan mobile number.
 */
export function toInternationalVePhone(raw: string): string {
  const digits = normalizePhone(raw).replace(/^\+/, '');
  const match = digits.match(/^(?:58|0)?(412|414|416|424|426)(\d{7})$/);
  return match ? `58${match[1]}${match[2]}` : digits;
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

export const PHONE_ERROR = 'Incluye el código de país +58 (ej. +58 414 1234567).';
export const INTL_PHONE_ERROR = 'Ingresa un teléfono válido en formato internacional (ej. +58 414 1234567).';
export const CEDULA_ERROR = 'La cédula debe tener hasta 8 dígitos (solo números).';
