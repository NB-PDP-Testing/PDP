/**
 * GAA Foireann Field Mapping Transformer
 *
 * Transforms GAA Foireann API member data to PlayerARC import schema format.
 *
 * Field mappings:
 * - memberId → externalIds.foireann
 * - firstName/lastName → titlecased names
 * - dateOfBirth → validated YYYY-MM-DD format
 * - email → lowercase, validated
 * - phone → normalized with +353 country code
 * - address → parsed into street1, city, county, postcode, country
 * - membershipNumber → validated format XXX-XXXXX-XXX
 * - membershipStatus → mapped to enrollment status (Active/Lapsed → active/inactive)
 * - joinDate → enrollmentDate
 */

// ===== TypeScript Types =====

/**
 * GAA member from Foireann API
 * (Re-declared here to avoid circular dependencies)
 */
export interface GAAMember {
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string (YYYY-MM-DD)
  email?: string;
  phone?: string;
  address?: string;
  membershipNumber?: string; // Format: XXX-XXXXX-XXX
  membershipStatus: string; // "Active", "Lapsed", etc.
  joinDate?: string; // ISO date string
}

/**
 * Import row data matching PlayerARC import schema
 */
export interface ImportRowData {
  // Player identity
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender?: string;
  email?: string;
  phone?: string;

  // Player address
  playerAddress?: string; // street1
  playerTown?: string; // city
  playerCounty?: string; // county (Ireland-specific)
  playerPostcode?: string;
  country?: string;

  // Enrollment
  enrollmentStatus?: string; // "active" | "inactive"
  enrollmentDate?: string; // YYYY-MM-DD

  // Federation identifiers
  externalIds?: {
    foireann?: string; // GAA membership number
  };

  // Validation errors
  errors: Array<{
    field: string;
    error: string;
    value?: string;
  }>;

  // Validation warnings (non-fatal)
  warnings: Array<{
    field: string;
    warning: string;
    value?: string;
  }>;
}

// ===== Constants =====

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GAA membership number format: XXX-XXXXX-XXX
const MEMBERSHIP_NUMBER_REGEX = /^\d{3}-\d{5}-\d{3}$/;

// ISO date format: YYYY-MM-DD
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ===== Helper Functions =====

/**
 * Convert string to title case (e.g., "john doe" → "John Doe")
 */
function toTitleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Validate and format email address
 * Returns lowercase email or undefined if invalid
 */
function validateEmail(email: string | undefined): string | undefined {
  if (!email) {
    return;
  }

  const trimmed = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmed)) {
    return;
  }

  return trimmed;
}

/**
 * Normalize Irish phone number
 * - Removes spaces, dashes, parentheses
 * - Adds +353 country code if missing
 * - Validates format
 *
 * Examples:
 * - "087 123 4567" → "+353871234567"
 * - "(01) 234-5678" → "+35312345678"
 * - "+353 87 123 4567" → "+353871234567"
 */
function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) {
    return;
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // If starts with 353 (Ireland), add +
  if (cleaned.startsWith("353")) {
    return `+${cleaned}`;
  }

  // If starts with 0 (Irish mobile/landline), replace with +353
  if (cleaned.startsWith("0")) {
    return `+353${cleaned.slice(1)}`;
  }

  // If doesn't start with country code, assume Irish and add +353
  if (cleaned.length >= 7 && cleaned.length <= 10) {
    return `+353${cleaned}`;
  }

  // Invalid format
  return;
}

/**
 * Parse GAA single-line address into components
 *
 * GAA addresses are typically: "Street, Town, County, Postcode"
 * or variations like: "123 Main St, Dublin 2, Co. Dublin, D02 XY12"
 *
 * Returns: { street1, city, county, postcode }
 */
function parseAddress(address: string | undefined): {
  street1?: string;
  city?: string;
  county?: string;
  postcode?: string;
} {
  if (!address) {
    return {};
  }

  const parts = address.split(",").map((p) => p.trim());

  if (parts.length === 0) {
    return {};
  }

  // Common pattern: "Street, Town, County, Postcode"
  if (parts.length === 4) {
    return {
      street1: parts[0],
      city: parts[1],
      county: parts[2],
      postcode: parts[3],
    };
  }

  // Pattern: "Street, Town/City, County"
  if (parts.length === 3) {
    return {
      street1: parts[0],
      city: parts[1],
      county: parts[2],
    };
  }

  // Pattern: "Street, Town"
  if (parts.length === 2) {
    return {
      street1: parts[0],
      city: parts[1],
    };
  }

  // Single line - treat as street address
  return {
    street1: parts[0],
  };
}

/**
 * Validate GAA membership number format: XXX-XXXXX-XXX
 * (3 digits - 5 digits - 3 digits)
 */
function validateMembershipNumber(
  membershipNumber: string | undefined
): boolean {
  if (!membershipNumber) {
    return false;
  }

  return MEMBERSHIP_NUMBER_REGEX.test(membershipNumber.trim());
}

/**
 * Validate ISO date format (YYYY-MM-DD)
 * Returns true if valid, false otherwise
 */
function validateISODate(dateString: string | undefined): boolean {
  if (!dateString) {
    return false;
  }

  if (!ISO_DATE_REGEX.test(dateString)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Map GAA membership status to PlayerARC enrollment status
 */
function mapMembershipStatus(status: string): "active" | "inactive" {
  const normalized = status.toLowerCase().trim();

  // Active statuses
  if (
    normalized === "active" ||
    normalized === "current" ||
    normalized === "registered"
  ) {
    return "active";
  }

  // Inactive statuses
  return "inactive";
}

// ===== Main Transformer =====

/**
 * Transform GAA member data to PlayerARC import row format
 *
 * Performs field mapping, validation, and normalization.
 * Returns ImportRowData with errors and warnings arrays.
 */
export function transformGAAMember(gaaMember: GAAMember): ImportRowData {
  const errors: ImportRowData["errors"] = [];
  const warnings: ImportRowData["warnings"] = [];

  // ===== Required Fields =====

  // First Name (required)
  const firstName = gaaMember.firstName?.trim();
  if (!firstName) {
    errors.push({
      field: "firstName",
      error: "First name is required",
      value: gaaMember.firstName,
    });
  }

  // Last Name (required)
  const lastName = gaaMember.lastName?.trim();
  if (!lastName) {
    errors.push({
      field: "lastName",
      error: "Last name is required",
      value: gaaMember.lastName,
    });
  }

  // Date of Birth (required, must be valid ISO date)
  const dateOfBirth = gaaMember.dateOfBirth?.trim();
  if (!dateOfBirth) {
    errors.push({
      field: "dateOfBirth",
      error: "Date of birth is required",
      value: gaaMember.dateOfBirth,
    });
  } else if (!validateISODate(dateOfBirth)) {
    errors.push({
      field: "dateOfBirth",
      error: "Date of birth must be in YYYY-MM-DD format",
      value: dateOfBirth,
    });
  }

  // ===== Optional Fields with Validation =====

  // Email (optional, validated)
  const email = validateEmail(gaaMember.email);
  if (gaaMember.email && !email) {
    warnings.push({
      field: "email",
      warning: "Invalid email format, will be skipped",
      value: gaaMember.email,
    });
  }

  // Phone (optional, normalized)
  const phone = normalizePhone(gaaMember.phone);
  if (gaaMember.phone && !phone) {
    warnings.push({
      field: "phone",
      warning: "Invalid phone format, will be skipped",
      value: gaaMember.phone,
    });
  }

  // Address (optional, parsed)
  const addressParts = parseAddress(gaaMember.address);

  // Membership Number (optional, validated)
  const membershipNumber = gaaMember.membershipNumber?.trim();
  if (membershipNumber && !validateMembershipNumber(membershipNumber)) {
    warnings.push({
      field: "membershipNumber",
      warning: "Membership number does not match expected format XXX-XXXXX-XXX",
      value: membershipNumber,
    });
  }

  // Join Date (optional, validated)
  const joinDate = gaaMember.joinDate?.trim();
  if (joinDate && !validateISODate(joinDate)) {
    warnings.push({
      field: "joinDate",
      warning: "Join date is not in YYYY-MM-DD format, will be skipped",
      value: joinDate,
    });
  }

  // ===== Build Import Row Data =====

  const importRow: ImportRowData = {
    // Player identity (title-cased)
    firstName: firstName ? toTitleCase(firstName) : "",
    lastName: lastName ? toTitleCase(lastName) : "",
    dateOfBirth: dateOfBirth || "",
    email,
    phone,

    // Player address
    playerAddress: addressParts.street1,
    playerTown: addressParts.city,
    playerCounty: addressParts.county,
    playerPostcode: addressParts.postcode,
    country: "Ireland", // All GAA members are in Ireland

    // Enrollment
    enrollmentStatus: mapMembershipStatus(gaaMember.membershipStatus),
    enrollmentDate:
      joinDate && validateISODate(joinDate) ? joinDate : undefined,

    // External IDs (for deduplication)
    externalIds: {
      foireann: membershipNumber || gaaMember.memberId, // Use membership number if available, fallback to member ID
    },

    // Validation results
    errors,
    warnings,
  };

  return importRow;
}

/**
 * Bulk transform: convert array of GAA members to import rows
 *
 * Returns array of ImportRowData objects.
 * Filters out rows with critical errors can be done by caller.
 */
export function transformGAAMembers(gaaMembers: GAAMember[]): ImportRowData[] {
  return gaaMembers.map((member) => transformGAAMember(member));
}
