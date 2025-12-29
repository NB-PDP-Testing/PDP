/**
 * Frontend Constants
 *
 * Age group constants and labels for UI display
 */

/**
 * Age group ordering - mirrors backend DEFAULT_AGE_GROUP_ORDER
 */
export const AGE_GROUP_ORDER = [
  "u6",
  "u7",
  "u8",
  "u9",
  "u10",
  "u11",
  "u12",
  "u13",
  "u14",
  "u15",
  "u16",
  "u17",
  "u18",
  "minor",
  "adult",
  "senior",
] as const;

export type AgeGroup = (typeof AGE_GROUP_ORDER)[number];

/**
 * Human-readable labels for age groups
 */
export const AGE_GROUP_LABELS: Record<string, string> = {
  u6: "Under 6",
  u7: "Under 7",
  u8: "Under 8",
  u9: "Under 9",
  u10: "Under 10",
  u11: "Under 11",
  u12: "Under 12",
  u13: "Under 13",
  u14: "Under 14",
  u15: "Under 15",
  u16: "Under 16",
  u17: "Under 17",
  u18: "Under 18",
  minor: "Minor",
  adult: "Adult",
  senior: "Senior",
};

/**
 * Get human-readable label for age group code
 *
 * @param code - Age group code (e.g., "u12")
 * @returns Display label (e.g., "Under 12")
 */
export function getAgeGroupLabel(code: string): string {
  return AGE_GROUP_LABELS[code.toLowerCase()] || code;
}

/**
 * Eligibility status color mappings for UI
 */
export const ELIGIBILITY_STATUS_COLORS = {
  eligible: "text-green-600",
  requiresOverride: "text-yellow-600",
  hasOverride: "text-blue-600",
  ineligible: "text-red-600",
} as const;

/**
 * Eligibility status icon mappings for lucide-react
 */
export const ELIGIBILITY_STATUS_ICONS = {
  eligible: "CheckCircle",
  requiresOverride: "AlertTriangle",
  hasOverride: "Shield",
  ineligible: "XCircle",
} as const;

/**
 * Enforcement level labels
 */
export const ENFORCEMENT_LEVEL_LABELS = {
  strict: "Strict",
  warning: "Warning",
  flexible: "Flexible",
} as const;

/**
 * Enforcement level descriptions
 */
export const ENFORCEMENT_LEVEL_DESCRIPTIONS = {
  strict: "Players must meet age requirements or have admin override",
  warning: "Show warning but allow assignment, automatically log exception",
  flexible: "No age validation - trust coach/admin judgment",
} as const;

/**
 * Enforcement level colors
 */
export const ENFORCEMENT_LEVEL_COLORS = {
  strict: "text-red-600",
  warning: "text-yellow-600",
  flexible: "text-green-600",
} as const;
