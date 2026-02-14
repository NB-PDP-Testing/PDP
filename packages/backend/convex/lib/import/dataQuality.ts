/**
 * Data Quality Scoring Engine - Evaluates imported data across 5 dimensions.
 *
 * Dimensions (weighted):
 * - Completeness (30%): ratio of populated required fields
 * - Consistency (25%): format consistency within the dataset
 * - Accuracy (25%): valid email/phone/date formats, age reasonableness
 * - Uniqueness (15%): duplicate detection (name+DOB combos)
 * - Timeliness (5%): data freshness (DOBs within age range)
 *
 * Pure functions — no Convex ctx dependency. Operates on parsed row data.
 * Reuses validation patterns from validator.ts.
 */

import {
  autoFixValue,
  DATE_ISO_REGEX,
  DATE_SLASH_REGEX,
  EMAIL_REGEX,
  PHONE_REGEX,
  REQUIRED_FIELDS,
} from "./validator";

// ============================================================
// Types
// ============================================================

export type IssueSeverity = "critical" | "warning" | "suggestion";

export type Issue = {
  rowIndex: number;
  field: string;
  severity: IssueSeverity;
  message: string;
  value?: string;
  suggestedFix?: string;
};

export type CategorizedIssues = {
  critical: Issue[];
  warnings: Issue[];
  suggestions: Issue[];
};

export type DimensionScore = {
  name: string;
  score: number;
  weight: number;
};

export type QualityGrade = "excellent" | "good" | "fair" | "poor" | "critical";

export type QualityReport = {
  overallScore: number;
  grade: QualityGrade;
  dimensions: DimensionScore[];
  issues: Issue[];
  categorized: CategorizedIssues;
  summary: {
    totalRows: number;
    rowsWithIssues: number;
    criticalCount: number;
    warningCount: number;
    suggestionCount: number;
  };
};

// ============================================================
// Constants
// ============================================================

const DIMENSION_WEIGHTS = {
  completeness: 0.3,
  consistency: 0.25,
  accuracy: 0.25,
  uniqueness: 0.15,
  timeliness: 0.05,
};

// Accepts standard title case (Murphy) plus Irish patterns: O'Connor, McCarthy, MacDonald
const TITLE_CASE_REGEX =
  /^(?:[A-Z][a-z]+|[A-Z]'[A-Z][a-z]*|Mc[A-Z][a-z]*|Mac[A-Z][a-z]*)(?:\s(?:[A-Z][a-z]+|[A-Z]'[A-Z][a-z]*|Mc[A-Z][a-z]*|Mac[A-Z][a-z]*))*$/;
const NAME_FIELDS = new Set(["firstName", "lastName"]);
const OPTIONAL_RECOMMENDED_FIELDS = [
  "playerPostcode",
  "parentEmail",
  "parentPhone",
];

const MIN_PLAYER_AGE = 3;
const MAX_PLAYER_AGE = 25;

const EMAIL_FIELDS_LIST = ["email", "parentEmail", "parent2Email"];
const PHONE_FIELDS_LIST = ["phone", "parentPhone", "parent2Phone"];

// ============================================================
// Dimension Scoring Functions
// ============================================================

/**
 * Score completeness: ratio of populated required fields across all rows.
 * Returns 0-100.
 */
export function scoreCompleteness(
  rows: Record<string, string>[],
  requiredFields: string[]
): number {
  if (rows.length === 0 || requiredFields.length === 0) {
    return 100;
  }

  let totalFields = 0;
  let populatedFields = 0;

  for (const row of rows) {
    for (const field of requiredFields) {
      totalFields += 1;
      if (row[field] && row[field].trim() !== "") {
        populatedFields += 1;
      }
    }
  }

  return totalFields === 0
    ? 100
    : Math.round((populatedFields / totalFields) * 100);
}

function classifyPhone(v: string): string {
  return PHONE_REGEX.test(v) ? "valid" : "invalid";
}

function classifyEmail(v: string): string {
  return EMAIL_REGEX.test(v) ? "valid" : "invalid";
}

function classifyDate(v: string): string {
  if (DATE_ISO_REGEX.test(v)) {
    return "iso";
  }
  if (DATE_SLASH_REGEX.test(v)) {
    return "slash";
  }
  return "other";
}

/**
 * Score consistency: checks that values in the same column follow the same format pattern.
 * Looks at phone, email, and date format consistency within the dataset.
 * Returns 0-100.
 */
export function scoreConsistency(rows: Record<string, string>[]): number {
  if (rows.length <= 1) {
    return 100;
  }

  const checks: number[] = [];

  const phoneConsistency = checkFormatConsistency(rows, "phone", classifyPhone);
  if (phoneConsistency !== null) {
    checks.push(phoneConsistency);
  }

  const emailConsistency = checkFormatConsistency(rows, "email", classifyEmail);
  if (emailConsistency !== null) {
    checks.push(emailConsistency);
  }

  const dateConsistency = checkFormatConsistency(
    rows,
    "dateOfBirth",
    classifyDate
  );
  if (dateConsistency !== null) {
    checks.push(dateConsistency);
  }

  const parentPhoneConsistency = checkFormatConsistency(
    rows,
    "parentPhone",
    classifyPhone
  );
  if (parentPhoneConsistency !== null) {
    checks.push(parentPhoneConsistency);
  }

  if (checks.length === 0) {
    return 100;
  }
  return Math.round(checks.reduce((sum, c) => sum + c, 0) / checks.length);
}

/**
 * Check if a field value is non-empty.
 */
function hasValue(row: Record<string, string>, field: string): boolean {
  return Boolean(row[field] && row[field].trim() !== "");
}

/**
 * Count accuracy checks for a single row's email and phone fields.
 */
function checkFieldAccuracy(
  row: Record<string, string>,
  emailFields: string[],
  phoneFields: string[]
): { total: number; passed: number } {
  let total = 0;
  let passed = 0;

  for (const field of emailFields) {
    if (hasValue(row, field)) {
      total += 1;
      if (EMAIL_REGEX.test(row[field].trim())) {
        passed += 1;
      }
    }
  }

  for (const field of phoneFields) {
    if (hasValue(row, field)) {
      total += 1;
      if (PHONE_REGEX.test(row[field].trim())) {
        passed += 1;
      }
    }
  }

  return { total, passed };
}

/**
 * Check date and age accuracy for a single row.
 */
function checkDateAccuracy(row: Record<string, string>): {
  total: number;
  passed: number;
} {
  let total = 0;
  let passed = 0;

  if (!hasValue(row, "dateOfBirth")) {
    return { total, passed };
  }

  const dob = row.dateOfBirth.trim();

  // Date format check
  total += 1;
  if (DATE_ISO_REGEX.test(dob) || DATE_SLASH_REGEX.test(dob)) {
    passed += 1;
  }

  // Age reasonableness check
  const age = calculateAge(dob);
  if (age !== null) {
    total += 1;
    if (age >= MIN_PLAYER_AGE && age <= MAX_PLAYER_AGE) {
      passed += 1;
    }
  }

  return { total, passed };
}

/**
 * Score accuracy: validates email syntax, phone format, date logic, age reasonableness.
 * Returns 0-100.
 */
export function scoreAccuracy(rows: Record<string, string>[]): number {
  if (rows.length === 0) {
    return 100;
  }

  let totalChecks = 0;
  let passedChecks = 0;

  for (const row of rows) {
    const fieldResult = checkFieldAccuracy(
      row,
      EMAIL_FIELDS_LIST,
      PHONE_FIELDS_LIST
    );
    totalChecks += fieldResult.total;
    passedChecks += fieldResult.passed;

    const dateResult = checkDateAccuracy(row);
    totalChecks += dateResult.total;
    passedChecks += dateResult.passed;
  }

  return totalChecks === 0
    ? 100
    : Math.round((passedChecks / totalChecks) * 100);
}

/**
 * Score uniqueness: duplicate detection rate (name+DOB combos).
 * Returns 0-100 where 100 = no duplicates.
 */
export function scoreUniqueness(rows: Record<string, string>[]): number {
  if (rows.length <= 1) {
    return 100;
  }

  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const row of rows) {
    const firstName = (row.firstName || "").trim().toLowerCase();
    const lastName = (row.lastName || "").trim().toLowerCase();
    const dob = (row.dateOfBirth || "").trim();
    const key = `${firstName}|${lastName}|${dob}`;

    if (firstName === "" && lastName === "") {
      continue;
    }

    if (seen.has(key)) {
      duplicateCount += 1;
    } else {
      seen.add(key);
    }
  }

  return Math.round(((rows.length - duplicateCount) / rows.length) * 100);
}

/**
 * Score timeliness: data freshness — DOBs should produce ages within typical player range.
 * Returns 0-100.
 */
export function scoreTimeliness(rows: Record<string, string>[]): number {
  if (rows.length === 0) {
    return 100;
  }

  let totalWithDob = 0;
  let timelyCount = 0;

  for (const row of rows) {
    if (hasValue(row, "dateOfBirth")) {
      totalWithDob += 1;
      const age = calculateAge(row.dateOfBirth.trim());
      if (age !== null && age >= MIN_PLAYER_AGE && age <= MAX_PLAYER_AGE) {
        timelyCount += 1;
      }
    }
  }

  return totalWithDob === 0
    ? 100
    : Math.round((timelyCount / totalWithDob) * 100);
}

// ============================================================
// Issue Detection
// ============================================================

function detectMissingRequiredFields(
  row: Record<string, string>,
  rowIndex: number
): Issue[] {
  const issues: Issue[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!row[field] || row[field].trim() === "") {
      issues.push({
        rowIndex,
        field,
        severity: "critical",
        message: `Missing required field: ${field}`,
        value: row[field] ?? "",
      });
    }
  }
  return issues;
}

function detectEmailIssues(
  row: Record<string, string>,
  rowIndex: number
): Issue[] {
  const issues: Issue[] = [];
  for (const emailField of EMAIL_FIELDS_LIST) {
    if (hasValue(row, emailField)) {
      const val = row[emailField].trim();
      if (!EMAIL_REGEX.test(val)) {
        const fix = autoFixValue(val, emailField);
        issues.push({
          rowIndex,
          field: emailField,
          severity: "critical",
          message: "Invalid email format",
          value: val,
          suggestedFix: fix?.fixed,
        });
      }
    }
  }
  return issues;
}

function detectPhoneIssues(
  row: Record<string, string>,
  rowIndex: number
): Issue[] {
  const issues: Issue[] = [];
  for (const phoneField of PHONE_FIELDS_LIST) {
    if (hasValue(row, phoneField)) {
      const val = row[phoneField].trim();
      if (!PHONE_REGEX.test(val)) {
        const fix = autoFixValue(val, phoneField);
        issues.push({
          rowIndex,
          field: phoneField,
          severity: "warning",
          message: "Invalid phone format",
          value: val,
          suggestedFix: fix?.fixed,
        });
      }
    }
  }
  return issues;
}

function detectDateIssues(
  row: Record<string, string>,
  rowIndex: number
): Issue[] {
  const issues: Issue[] = [];
  if (!hasValue(row, "dateOfBirth")) {
    return issues;
  }

  const dob = row.dateOfBirth.trim();
  if (!(DATE_ISO_REGEX.test(dob) || DATE_SLASH_REGEX.test(dob))) {
    issues.push({
      rowIndex,
      field: "dateOfBirth",
      severity: "warning",
      message: "Unrecognized date format (expected DD/MM/YYYY or YYYY-MM-DD)",
      value: dob,
    });
  } else if (DATE_SLASH_REGEX.test(dob)) {
    const fix = autoFixValue(dob, "dateOfBirth");
    if (fix) {
      issues.push({
        rowIndex,
        field: "dateOfBirth",
        severity: "warning",
        message: "Non-standard date format — consider YYYY-MM-DD",
        value: dob,
        suggestedFix: fix.fixed,
      });
    }
  }

  // Age reasonableness
  const age = calculateAge(dob);
  if (age !== null && (age < MIN_PLAYER_AGE || age > MAX_PLAYER_AGE)) {
    issues.push({
      rowIndex,
      field: "dateOfBirth",
      severity: "warning",
      message: `Age ${age} is outside expected range (${MIN_PLAYER_AGE}-${MAX_PLAYER_AGE})`,
      value: dob,
    });
  }

  return issues;
}

function detectMissingRecommended(
  row: Record<string, string>,
  rowIndex: number
): Issue[] {
  const issues: Issue[] = [];
  for (const field of OPTIONAL_RECOMMENDED_FIELDS) {
    if (!row[field] || row[field].trim() === "") {
      issues.push({
        rowIndex,
        field,
        severity: "warning",
        message: `Missing recommended field: ${field}`,
      });
    }
  }
  return issues;
}

function detectNameCasingIssues(
  row: Record<string, string>,
  rowIndex: number
): Issue[] {
  const issues: Issue[] = [];
  for (const nameField of NAME_FIELDS) {
    if (hasValue(row, nameField)) {
      const val = row[nameField].trim();
      if (!TITLE_CASE_REGEX.test(val)) {
        const fix = autoFixValue(val, nameField);
        issues.push({
          rowIndex,
          field: nameField,
          severity: "suggestion",
          message: "Name is not title-cased",
          value: val,
          suggestedFix: fix?.fixed,
        });
      }
    }
  }
  return issues;
}

function detectIssues(rows: Record<string, string>[]): Issue[] {
  const issues: Issue[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    issues.push(...detectMissingRequiredFields(row, i));
    issues.push(...detectEmailIssues(row, i));
    issues.push(...detectPhoneIssues(row, i));
    issues.push(...detectDateIssues(row, i));
    issues.push(...detectMissingRecommended(row, i));
    issues.push(...detectNameCasingIssues(row, i));
  }

  // Critical: duplicate rows within dataset
  const duplicateIndices = findDuplicateRows(rows);
  for (const idx of duplicateIndices) {
    const row = rows[idx];
    issues.push({
      rowIndex: idx,
      field: "firstName+lastName+dateOfBirth",
      severity: "critical",
      message: `Duplicate row: ${row.firstName} ${row.lastName} (${row.dateOfBirth})`,
      value: `${row.firstName} ${row.lastName}`,
    });
  }

  return issues;
}

// ============================================================
// Issue Categorization
// ============================================================

/**
 * Categorize issues into critical, warnings, and suggestions.
 */
export function categorizeIssues(issues: Issue[]): CategorizedIssues {
  const critical: Issue[] = [];
  const warnings: Issue[] = [];
  const suggestions: Issue[] = [];

  for (const issue of issues) {
    if (issue.severity === "critical") {
      critical.push(issue);
    } else if (issue.severity === "warning") {
      warnings.push(issue);
    } else {
      suggestions.push(issue);
    }
  }

  return { critical, warnings, suggestions };
}

// ============================================================
// Grade Mapping
// ============================================================

function getGrade(score: number): QualityGrade {
  if (score >= 90) {
    return "excellent";
  }
  if (score >= 75) {
    return "good";
  }
  if (score >= 60) {
    return "fair";
  }
  if (score >= 40) {
    return "poor";
  }
  return "critical";
}

// ============================================================
// Main Entry Point
// ============================================================

/**
 * Calculate data quality for a set of import rows.
 * Returns a QualityReport with overall score, per-dimension scores,
 * and categorized issues.
 *
 * @param rows - Parsed import row data (after column mapping)
 * @param _mappings - Column mappings (reserved for future use)
 * @param _sportCode - Sport code (reserved for future use)
 */
export function calculateDataQuality(
  rows: Record<string, string>[],
  _mappings?: Record<string, string>,
  _sportCode?: string
): QualityReport {
  const completeness = scoreCompleteness(rows, REQUIRED_FIELDS);
  const consistency = scoreConsistency(rows);
  const accuracy = scoreAccuracy(rows);
  const uniqueness = scoreUniqueness(rows);
  const timeliness = scoreTimeliness(rows);

  const overallScore = Math.round(
    completeness * DIMENSION_WEIGHTS.completeness +
      consistency * DIMENSION_WEIGHTS.consistency +
      accuracy * DIMENSION_WEIGHTS.accuracy +
      uniqueness * DIMENSION_WEIGHTS.uniqueness +
      timeliness * DIMENSION_WEIGHTS.timeliness
  );

  const dimensions: DimensionScore[] = [
    {
      name: "Completeness",
      score: completeness,
      weight: DIMENSION_WEIGHTS.completeness,
    },
    {
      name: "Consistency",
      score: consistency,
      weight: DIMENSION_WEIGHTS.consistency,
    },
    {
      name: "Accuracy",
      score: accuracy,
      weight: DIMENSION_WEIGHTS.accuracy,
    },
    {
      name: "Uniqueness",
      score: uniqueness,
      weight: DIMENSION_WEIGHTS.uniqueness,
    },
    {
      name: "Timeliness",
      score: timeliness,
      weight: DIMENSION_WEIGHTS.timeliness,
    },
  ];

  const issues = detectIssues(rows);
  const categorized = categorizeIssues(issues);
  const rowsWithIssues = new Set(issues.map((i) => i.rowIndex)).size;

  return {
    overallScore,
    grade: getGrade(overallScore),
    dimensions,
    issues,
    categorized,
    summary: {
      totalRows: rows.length,
      rowsWithIssues,
      criticalCount: categorized.critical.length,
      warningCount: categorized.warnings.length,
      suggestionCount: categorized.suggestions.length,
    },
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check format consistency within a column.
 * Returns a 0-100 score or null if no values to check.
 */
function checkFormatConsistency(
  rows: Record<string, string>[],
  field: string,
  classifier: (value: string) => string
): number | null {
  const values = rows.map((r) => r[field]).filter((v) => v && v.trim() !== "");

  if (values.length <= 1) {
    return null;
  }

  const formatCounts = new Map<string, number>();
  for (const val of values) {
    const format = classifier(val.trim());
    formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
  }

  let maxCount = 0;
  for (const count of formatCounts.values()) {
    if (count > maxCount) {
      maxCount = count;
    }
  }

  return Math.round((maxCount / values.length) * 100);
}

/**
 * Find indices of duplicate rows (name+DOB combos).
 * Returns only the second/third/etc occurrence indices (not the first).
 */
function findDuplicateRows(rows: Record<string, string>[]): number[] {
  const seen = new Map<string, number>();
  const duplicateIndices: number[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const firstName = (row.firstName || "").trim().toLowerCase();
    const lastName = (row.lastName || "").trim().toLowerCase();
    const dob = (row.dateOfBirth || "").trim();

    if (firstName === "" && lastName === "") {
      continue;
    }

    const key = `${firstName}|${lastName}|${dob}`;

    if (seen.has(key)) {
      duplicateIndices.push(i);
    } else {
      seen.set(key, i);
    }
  }

  return duplicateIndices;
}

/**
 * Parse a date string into a Date object. Returns null if unparseable.
 */
function parseDate(dateStr: string): Date | null {
  if (DATE_ISO_REGEX.test(dateStr)) {
    return new Date(dateStr);
  }

  const match = DATE_SLASH_REGEX.exec(dateStr);
  if (!match) {
    return null;
  }

  let year = match[3];
  if (year.length === 2) {
    const num = Number.parseInt(year, 10);
    year = num < 50 ? `20${year}` : `19${year}`;
  }
  const p1 = Number.parseInt(match[1], 10);
  const p2 = Number.parseInt(match[2], 10);

  // Assume DD/MM format (European standard)
  let day: number;
  let month: number;
  if (p1 > 12) {
    day = p1;
    month = p2;
  } else if (p2 > 12) {
    day = p2;
    month = p1;
  } else {
    day = p1;
    month = p2;
  }

  return new Date(Number.parseInt(year, 10), month - 1, day);
}

/**
 * Calculate age from a date string. Returns null if unparseable.
 */
function calculateAge(dateStr: string): number | null {
  const dateObj = parseDate(dateStr);
  if (!dateObj || Number.isNaN(dateObj.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - dateObj.getFullYear();
  const monthDiff = now.getMonth() - dateObj.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateObj.getDate())) {
    age -= 1;
  }

  return age;
}
