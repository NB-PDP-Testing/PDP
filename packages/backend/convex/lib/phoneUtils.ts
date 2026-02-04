/**
 * Phone number utilities for E.164 format normalization
 * Ensures WhatsApp message matching and future phone-based auth compatibility
 */

// E.164 validation regex: + followed by 1-15 digits
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * Normalize a phone number to E.164 format for consistent storage and matching
 * Auto-fixes Irish numbers (0XX -> +353XX) for WhatsApp compatibility
 *
 * @param phone - Phone number to normalize
 * @param defaultCountryCode - Default country code (default: "+353" for Ireland)
 * @returns E.164 formatted phone number (+[country][number])
 *
 * @example
 * normalizePhoneNumber("085 123 4567")           // "+353851234567"
 * normalizePhoneNumber("0851234567")             // "+353851234567"
 * normalizePhoneNumber("+353 85 123 4567")       // "+353851234567"
 * normalizePhoneNumber("+44 20 1234 5678")       // "+442012345678"
 * normalizePhoneNumber("353851234567")           // "+353851234567"
 */
export function normalizePhoneNumber(
  phone: string,
  defaultCountryCode = "+353"
): string {
  if (!phone) {
    return "";
  }

  // Remove all non-digit characters except leading +
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  // If already has +, return formatted
  if (hasPlus) {
    return `+${digits}`;
  }

  // Auto-fix: If starts with 0 and default country is Ireland, replace 0 with +353
  if (digits.startsWith("0") && defaultCountryCode === "+353") {
    return `+353${digits.slice(1)}`;
  }

  // If no + and doesn't start with country code, prepend default
  const countryDigits = defaultCountryCode.replace("+", "");
  if (!digits.startsWith(countryDigits)) {
    return `${defaultCountryCode}${digits}`;
  }

  // Already has country code digits, just add +
  return `+${digits}`;
}

/**
 * Validate if a phone number is in E.164 format
 *
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}
