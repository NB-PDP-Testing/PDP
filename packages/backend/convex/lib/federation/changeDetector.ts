/**
 * Federation Data Change Detection
 *
 * Detects changes between federation data and local data to enable smart syncing.
 * Prevents unnecessary updates and identifies conflicts when both sources modified data.
 */

import { v } from "convex/values";

// ===== TypeScript Types =====

/**
 * Conflict occurs when both federation and local data modified since last sync
 */
export type Conflict = {
  field: string;
  federationValue: string | undefined;
  localValue: string | undefined;
  lastSyncedValue: string | undefined;
};

/**
 * Summary of detected changes between federation and local data
 */
export type ChangeSummary = {
  hasChanges: boolean; // True if any fields differ
  changedFields: string[]; // List of field names that changed
  conflicts: Conflict[]; // List of conflicts (both sides modified)
};

/**
 * Resolved data after applying conflict resolution strategy
 */
export type ResolvedData = {
  // Merged data with conflicts resolved
  data: Record<string, string | undefined>;
  // Explanation of how each conflict was resolved
  resolutionNotes: Array<{
    field: string;
    strategy: string;
    federationValue: string | undefined;
    localValue: string | undefined;
    resolvedValue: string | undefined;
  }>;
};

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy =
  | "federation_wins" // Federation value always wins
  | "local_wins" // Local value always wins
  | "merge"; // Use federation for unmodified fields, local for modified

// Fields to compare between federation and local data
const COMPARABLE_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "email",
  "phone",
  "address",
] as const;

// ===== Helper Functions =====

/**
 * Normalize string for comparison to avoid false positives
 * - Trims whitespace
 * - Lowercases emails
 * - Normalizes phone numbers (removes spaces, dashes, parentheses)
 */
function normalizeValue(
  value: string | undefined | null,
  field: string
): string | undefined {
  if (value === null || value === undefined || value === "") {
    return;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return;
  }

  // Lowercase emails for comparison
  if (field === "email") {
    return trimmed.toLowerCase();
  }

  // Normalize phone numbers: remove spaces, dashes, parentheses
  if (field === "phone") {
    return trimmed.replace(/[\s\-()]/g, "");
  }

  return trimmed;
}

/**
 * Check if two values are equal after normalization
 */
function valuesEqual(
  value1: string | undefined,
  value2: string | undefined,
  field: string
): boolean {
  const normalized1 = normalizeValue(value1, field);
  const normalized2 = normalizeValue(value2, field);
  return normalized1 === normalized2;
}

// ===== Main Functions =====

/**
 * Detect changes between federation data and local data
 *
 * @param federationData - Data from federation API
 * @param localData - Current local player data
 * @param lastSyncedData - Data as it was at last sync (optional)
 * @returns ChangeSummary with hasChanges, changedFields, and conflicts
 *
 * Change detection logic:
 * - Changed field = federation differs from local AND local not modified since last sync
 * - Conflict = federation differs from local AND local modified since last sync
 * - Uses lastSyncedData to determine if local was modified
 */
export function detectChanges(
  federationData: Record<string, string | undefined>,
  localData: Record<string, string | undefined>,
  lastSyncedData?: Record<string, string | undefined>
): ChangeSummary {
  const changedFields: string[] = [];
  const conflicts: Conflict[] = [];

  for (const field of COMPARABLE_FIELDS) {
    const fedValue = federationData[field];
    const localValue = localData[field];
    const lastSyncedValue = lastSyncedData?.[field];

    // Skip if values are equal (no change)
    if (valuesEqual(fedValue, localValue, field)) {
      continue;
    }

    // Values differ - check if it's a conflict or just a change
    // Conflict = local was modified since last sync (differs from lastSyncedValue)
    // Change = local was NOT modified (matches lastSyncedValue)

    if (lastSyncedData) {
      // We have lastSyncedData - can detect conflicts
      const localWasModified = !valuesEqual(localValue, lastSyncedValue, field);

      if (localWasModified) {
        // Conflict: both federation and local modified
        conflicts.push({
          field,
          federationValue: normalizeValue(fedValue, field),
          localValue: normalizeValue(localValue, field),
          lastSyncedValue: normalizeValue(lastSyncedValue, field),
        });
      } else {
        // Change: only federation modified
        changedFields.push(field);
      }
    } else {
      // No lastSyncedData - treat all differences as changes (no conflicts)
      changedFields.push(field);
    }
  }

  return {
    hasChanges: changedFields.length > 0 || conflicts.length > 0,
    changedFields,
    conflicts,
  };
}

/**
 * Resolve conflicts using specified strategy
 *
 * @param conflicts - List of conflicts to resolve
 * @param federationData - Full federation data
 * @param localData - Full local data
 * @param strategy - Conflict resolution strategy
 * @returns ResolvedData with merged values and resolution notes
 */
export function resolveConflicts(
  conflicts: Conflict[],
  _federationData: Record<string, string | undefined>,
  localData: Record<string, string | undefined>,
  strategy: ConflictResolutionStrategy
): ResolvedData {
  // Start with local data as base
  const resolvedData: Record<string, string | undefined> = { ...localData };
  const resolutionNotes: ResolvedData["resolutionNotes"] = [];

  for (const conflict of conflicts) {
    const { field, federationValue, localValue } = conflict;
    let resolvedValue: string | undefined;
    let appliedStrategy: string;

    switch (strategy) {
      case "federation_wins":
        // Federation value always wins
        resolvedValue = federationValue;
        appliedStrategy = "federation_wins";
        break;

      case "local_wins":
        // Local value always wins
        resolvedValue = localValue;
        appliedStrategy = "local_wins";
        break;

      case "merge":
        // For merge strategy, prefer local value (user edited locally)
        // This is conservative - keeps user edits
        resolvedValue = localValue;
        appliedStrategy = "merge (kept local)";
        break;

      default:
        // Default to federation_wins
        resolvedValue = federationValue;
        appliedStrategy = "federation_wins (default)";
    }

    // Apply resolved value
    resolvedData[field] = resolvedValue;

    // Record resolution note
    resolutionNotes.push({
      field,
      strategy: appliedStrategy,
      federationValue,
      localValue,
      resolvedValue,
    });
  }

  return {
    data: resolvedData,
    resolutionNotes,
  };
}

// ===== Convex Validators =====

/**
 * Validator for Conflict type
 */
export const conflictValidator = v.object({
  field: v.string(),
  federationValue: v.optional(v.string()),
  localValue: v.optional(v.string()),
  lastSyncedValue: v.optional(v.string()),
});

/**
 * Validator for ChangeSummary type
 */
export const changeSummaryValidator = v.object({
  hasChanges: v.boolean(),
  changedFields: v.array(v.string()),
  conflicts: v.array(conflictValidator),
});

/**
 * Validator for ConflictResolutionStrategy type
 */
export const conflictResolutionStrategyValidator = v.union(
  v.literal("federation_wins"),
  v.literal("local_wins"),
  v.literal("merge")
);

/**
 * Validator for ResolvedData type
 * Note: Using v.any() for data since v.record doesn't support optional values
 */
export const resolvedDataValidator = v.object({
  data: v.any(), // Record<string, string | undefined>
  resolutionNotes: v.array(
    v.object({
      field: v.string(),
      strategy: v.string(),
      federationValue: v.optional(v.string()),
      localValue: v.optional(v.string()),
      resolvedValue: v.optional(v.string()),
    })
  ),
});
