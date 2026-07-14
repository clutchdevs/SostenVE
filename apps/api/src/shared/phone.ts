/**
 * Venezuelan mobile numbers (see `venezuelanPhoneSchema`): accepted with a
 * +58/58 country code or a leading 0 (national format). Captures the carrier
 * code and subscriber number so they can be reassembled in either format.
 */
const VE_PHONE_RE = /^(?:\+?58|0)?(412|414|416|424|426)(\d{7})$/;

/**
 * Normalizes a Venezuelan mobile number to international format (58 + 10
 * digits, no leading +) regardless of whether it was entered with a leading
 * 0 or a +58/58 country code (issue #129). This is what WhatsApp deep links
 * (wa.me/<number>) require to resolve to the right chat. Returns the
 * stripped input unchanged if it doesn't match a Venezuelan mobile number
 * (defensive; callers validate with venezuelanPhoneSchema first).
 */
export function toInternationalVePhone(raw: string): string {
  const digits = raw.trim().replace(/[\s().-]/g, '');
  const match = digits.match(VE_PHONE_RE);
  return match ? `58${match[1]}${match[2]}` : digits;
}
