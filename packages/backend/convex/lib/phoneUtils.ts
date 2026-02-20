/**
 * Phone number utilities for E.164 format normalization
 * Ensures WhatsApp message matching and future phone-based auth compatibility
 *
 * Uses libphonenumber-js for accurate parsing with country context
 */

import { parsePhoneNumber } from "libphonenumber-js/mobile";

// E.164 validation regex: + followed by 1-15 digits
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * Normalize a phone number to E.164 format for consistent storage and matching
 * Uses libphonenumber-js to parse with country context
 *
 * Supports UK, Ireland, and US numbers with proper country-specific formatting
 *
 * @param phone - Phone number to normalize
 * @param countryCode - ISO 3166-1 alpha-2 country code (default: "IE" for Ireland)
 * @returns E.164 formatted phone number (+[country][number])
 *
 * @example
 * // Ireland (default)
 * normalizePhoneNumber("085 123 4567")           // "+353851234567"
 * normalizePhoneNumber("0851234567", "IE")       // "+353851234567"
 *
 * // United Kingdom
 * normalizePhoneNumber("07700 900123", "GB")     // "+447700900123"
 *
 * // United States
 * normalizePhoneNumber("(415) 555-1234", "US")   // "+14155551234"
 *
 * // Already E.164 (any country)
 * normalizePhoneNumber("+353 85 123 4567")       // "+353851234567"
 */
export function normalizePhoneNumber(
  phone: string,
  countryCode: "IE" | "GB" | "US" = "IE"
): string {
  if (!phone) {
    return "";
  }

  try {
    // Parse with country context using libphonenumber-js
    const phoneNumber = parsePhoneNumber(phone, countryCode);

    if (phoneNumber?.isValid()) {
      // Returns E.164 format: +[country][number]
      return phoneNumber.number;
    }
  } catch (error) {
    // Parsing failed, fall back to manual normalization
    console.warn(
      `Failed to parse phone number: ${phone} for country ${countryCode}`,
      error
    );
  }

  // Fallback: Manual normalization if libphonenumber fails
  // This handles edge cases and malformed numbers
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  // If already has +, assume it's correct
  if (hasPlus) {
    return `+${digits}`;
  }

  // Map country code to dial code
  const dialCodes: Record<string, string> = {
    IE: "353",
    GB: "44",
    US: "1",
  };

  const dialCode = dialCodes[countryCode] || "353";

  // Handle national format (starts with 0 for IE/GB, no leading digit for US)
  if (
    (countryCode === "IE" || countryCode === "GB") &&
    digits.startsWith("0")
  ) {
    // Remove leading 0 and add country code
    return `+${dialCode}${digits.slice(1)}`;
  }

  // If number doesn't start with dial code, prepend it
  if (!digits.startsWith(dialCode)) {
    return `+${dialCode}${digits}`;
  }

  // Already has dial code digits, just add +
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

/**
 * Get the type of a phone number (mobile, landline, etc.)
 *
 * @param phone - Phone number in E.164 format
 * @returns Phone number type or undefined if unknown
 *
 * @example
 * getPhoneNumberType("+353851234567")  // "MOBILE"
 * getPhoneNumberType("+3531234567")    // "FIXED_LINE"
 */
export function getPhoneNumberType(
  phone: string
): "MOBILE" | "FIXED_LINE" | "FIXED_LINE_OR_MOBILE" | undefined {
  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (phoneNumber?.isValid()) {
      const type = phoneNumber.getType();
      return type as
        | "MOBILE"
        | "FIXED_LINE"
        | "FIXED_LINE_OR_MOBILE"
        | undefined;
    }
  } catch {
    return;
  }
  return;
}
