/**
 * Row Validator - Validates import rows and provides auto-fix suggestions.
 *
 * Checks: required fields, email format, phone format, date format,
 * gender normalization. No npm dependencies (Convex runtime restriction).
 */

// ============================================================
// Types
// ============================================================

export type ValidationError = {
  field: string;
  error: string;
  value: string;
  suggestedFix?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export type BatchValidationResult = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  results: Array<{ rowIndex: number; result: ValidationResult }>;
};

// ============================================================
// Top-level regex constants
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s()-]{7,20}$/;
const DATE_SLASH_REGEX = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const GENDER_MALE_REGEX = /^(m|male|boy)$/i;
const GENDER_FEMALE_REGEX = /^(f|female|girl)$/i;
const GENDER_OTHER_REGEX = /^(other|non-binary|nonbinary|nb|x)$/i;
const NON_DIGIT_REGEX = /\D/g;
const WHITESPACE_REGEX = /\s+/;

// Common email typos
const EMAIL_TYPO_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "outloo.com": "outlook.com",
  "outlok.com": "outlook.com",
};

// Required fields for a valid import row
const REQUIRED_FIELDS = ["firstName", "lastName", "dateOfBirth", "gender"];

// Field category sets for auto-fix routing
const EMAIL_FIELDS = new Set(["email", "parentEmail", "parent2Email"]);
const PHONE_FIELDS = new Set(["phone", "parentPhone", "parent2Phone"]);
const NAME_FIELDS = new Set([
  "firstName",
  "lastName",
  "parentFirstName",
  "parentLastName",
]);

// ============================================================
// Field Validators
// ============================================================

function validateRequiredField(
  field: string,
  value: string | undefined
): ValidationError | null {
  if (!value || value.trim() === "") {
    return { field, error: `${field} is required`, value: value ?? "" };
  }
  return null;
}

function validateEmailValue(
  fieldName: string,
  value: string
): ValidationError | null {
  if (!value || value.trim() === "") {
    return null;
  }
  const trimmed = value.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      field: fieldName,
      error: "Invalid email format",
      value: trimmed,
      suggestedFix: tryFixEmail(trimmed),
    };
  }
  return null;
}

function validatePhoneValue(
  fieldName: string,
  value: string
): ValidationError | null {
  if (!value || value.trim() === "") {
    return null;
  }
  const trimmed = value.trim();
  if (!PHONE_REGEX.test(trimmed)) {
    return {
      field: fieldName,
      error: "Invalid phone format",
      value: trimmed,
      suggestedFix: tryFixPhone(trimmed),
    };
  }
  return null;
}

function validateDate(value: string): ValidationError | null {
  if (!value || value.trim() === "") {
    return null;
  }
  const trimmed = value.trim();
  if (DATE_ISO_REGEX.test(trimmed)) {
    return null;
  }

  const slashMatch = DATE_SLASH_REGEX.exec(trimmed);
  if (slashMatch) {
    const fixed = standardizeDate(slashMatch[1], slashMatch[2], slashMatch[3]);
    if (fixed) {
      return {
        field: "dateOfBirth",
        error: "Non-standard date format",
        value: trimmed,
        suggestedFix: fixed,
      };
    }
  }

  return {
    field: "dateOfBirth",
    error: "Unrecognized date format (expected DD/MM/YYYY or YYYY-MM-DD)",
    value: trimmed,
  };
}

function validateGender(value: string): ValidationError | null {
  if (!value || value.trim() === "") {
    return null;
  }
  const trimmed = value.trim();
  const isValid =
    GENDER_MALE_REGEX.test(trimmed) ||
    GENDER_FEMALE_REGEX.test(trimmed) ||
    GENDER_OTHER_REGEX.test(trimmed);

  if (!isValid) {
    return {
      field: "gender",
      error: "Unrecognized gender value",
      value: trimmed,
      suggestedFix: "male, female, or other",
    };
  }

  const normalized = normalizeGender(trimmed);
  if (normalized !== trimmed.toLowerCase()) {
    return {
      field: "gender",
      error: "Gender needs normalization",
      value: trimmed,
      suggestedFix: normalized,
    };
  }
  return null;
}

// ============================================================
// Auto-Fix Functions
// ============================================================

type AutoFixResult = { fixed: string; confidence: number } | null;

function tryAutoFixEmail(trimmed: string): AutoFixResult {
  const fixed = tryFixEmail(trimmed);
  return fixed ? { fixed, confidence: 80 } : null;
}

function tryAutoFixPhone(trimmed: string): AutoFixResult {
  const fixed = tryFixPhone(trimmed);
  return fixed ? { fixed, confidence: 70 } : null;
}

function tryAutoFixDate(trimmed: string): AutoFixResult {
  const fixed = tryFixDate(trimmed);
  return fixed ? { fixed, confidence: 90 } : null;
}

function tryAutoFixGender(trimmed: string): AutoFixResult {
  const fixed = normalizeGender(trimmed);
  if (fixed !== trimmed.toLowerCase()) {
    return { fixed, confidence: 95 };
  }
  return null;
}

function tryAutoFixName(trimmed: string): AutoFixResult {
  const fixed = titleCase(trimmed);
  if (fixed !== trimmed) {
    return { fixed, confidence: 85 };
  }
  return null;
}

/**
 * Try to fix a value based on field and error type.
 */
export function autoFixValue(value: string, field: string): AutoFixResult {
  const trimmed = value.trim();

  if (EMAIL_FIELDS.has(field)) {
    return tryAutoFixEmail(trimmed);
  }
  if (PHONE_FIELDS.has(field)) {
    return tryAutoFixPhone(trimmed);
  }
  if (field === "dateOfBirth") {
    return tryAutoFixDate(trimmed);
  }
  if (field === "gender") {
    return tryAutoFixGender(trimmed);
  }
  if (NAME_FIELDS.has(field)) {
    return tryAutoFixName(trimmed);
  }
  return null;
}

function tryFixEmail(email: string): string | undefined {
  const atIndex = email.indexOf("@");
  if (atIndex === -1) {
    return;
  }

  const domain = email.slice(atIndex + 1).toLowerCase();
  const fixedDomain = EMAIL_TYPO_FIXES[domain];
  if (fixedDomain) {
    return `${email.slice(0, atIndex)}@${fixedDomain}`;
  }
  return;
}

function tryFixPhone(phone: string): string | undefined {
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(NON_DIGIT_REGEX, "");

  if (digits.length < 7) {
    return;
  }

  if (digits.startsWith("08") && digits.length === 10) {
    return `+353${digits.slice(1)}`;
  }
  if (digits.startsWith("07") && digits.length === 11) {
    return `+44${digits.slice(1)}`;
  }
  if (hasPlus) {
    return `+${digits}`;
  }
  return;
}

function tryFixDate(dateStr: string): string | undefined {
  const slashMatch = DATE_SLASH_REGEX.exec(dateStr);
  if (slashMatch) {
    return standardizeDate(slashMatch[1], slashMatch[2], slashMatch[3]);
  }
  return;
}

function standardizeDate(
  part1: string,
  part2: string,
  part3: string
): string | undefined {
  let year = part3;
  if (year.length === 2) {
    const num = Number.parseInt(year, 10);
    year = num < 50 ? `20${year}` : `19${year}`;
  }

  const p1 = Number.parseInt(part1, 10);
  const p2 = Number.parseInt(part2, 10);

  let day: number;
  let month: number;

  if (p1 > 12) {
    day = p1;
    month = p2;
  } else if (p2 > 12) {
    day = p2;
    month = p1;
  } else {
    // Ambiguous - assume DD/MM (European standard, common in Ireland)
    day = p1;
    month = p2;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return;
  }

  const dayStr = String(day).padStart(2, "0");
  const monthStr = String(month).padStart(2, "0");
  return `${year}-${monthStr}-${dayStr}`;
}

function normalizeGender(value: string): string {
  if (GENDER_MALE_REGEX.test(value)) {
    return "male";
  }
  if (GENDER_FEMALE_REGEX.test(value)) {
    return "female";
  }
  if (GENDER_OTHER_REGEX.test(value)) {
    return "other";
  }
  return value.toLowerCase();
}

function titleCase(str: string): string {
  return str
    .split(WHITESPACE_REGEX)
    .map((word) => {
      if (word.length === 0) {
        return word;
      }
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// ============================================================
// Main Validation Functions
// ============================================================

function collectRequiredErrors(row: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of REQUIRED_FIELDS) {
    const error = validateRequiredField(field, row[field]);
    if (error) {
      errors.push(error);
    }
  }
  return errors;
}

function validateFieldSet(
  row: Record<string, string>,
  fieldNames: Set<string>,
  validator: (field: string, value: string) => ValidationError | null
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of fieldNames) {
    if (row[field]) {
      const error = validator(field, row[field]);
      if (error) {
        errors.push(error);
      }
    }
  }
  return errors;
}

function collectFieldErrors(row: Record<string, string>): ValidationError[] {
  const emailErrors = validateFieldSet(row, EMAIL_FIELDS, validateEmailValue);
  const phoneErrors = validateFieldSet(row, PHONE_FIELDS, validatePhoneValue);

  const otherErrors: ValidationError[] = [];
  if (row.dateOfBirth) {
    const dateError = validateDate(row.dateOfBirth);
    if (dateError) {
      otherErrors.push(dateError);
    }
  }
  if (row.gender) {
    const genderError = validateGender(row.gender);
    if (genderError) {
      otherErrors.push(genderError);
    }
  }

  return [...emailErrors, ...phoneErrors, ...otherErrors];
}

/**
 * Validate a single row against field definitions.
 * Checks required fields, email, phone, date, and gender format.
 */
export function validateRow(row: Record<string, string>): ValidationResult {
  const requiredErrors = collectRequiredErrors(row);
  const fieldErrors = collectFieldErrors(row);
  const errors = [...requiredErrors, ...fieldErrors];

  return { valid: errors.length === 0, errors };
}

/**
 * Validate multiple rows and return summary statistics.
 */
export function validateBatch(
  rows: Record<string, string>[]
): BatchValidationResult {
  const results: Array<{ rowIndex: number; result: ValidationResult }> = [];
  let validRows = 0;
  let errorRows = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const result = validateRow(rows[i]);
    results.push({ rowIndex: i, result });

    if (result.valid) {
      validRows += 1;
    } else {
      errorRows += 1;
    }
  }

  return { totalRows: rows.length, validRows, errorRows, results };
}
