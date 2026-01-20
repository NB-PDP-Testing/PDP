/**
 * Trust Level Calculator
 *
 * Pure function to calculate a coach's trust level based on their approval/suppression metrics.
 * This is separate from the database layer to enable testing and reuse across frontend/backend.
 */

export type TrustLevelThresholds = {
  level1: { minApprovals: number };
  level2: { minApprovals: number; maxSuppressionRate: number };
  level3: { minApprovals: number; requiresOptIn: boolean };
};

/**
 * Thresholds for each trust level.
 * Exported so UI can show progress to next level.
 */
export const TRUST_LEVEL_THRESHOLDS: TrustLevelThresholds = {
  level1: {
    minApprovals: 10, // Learning: 10+ approvals
  },
  level2: {
    minApprovals: 50, // Trusted: 50+ approvals
    maxSuppressionRate: 0.1, // <10% suppression rate
  },
  level3: {
    minApprovals: 200, // Expert: 200+ approvals
    requiresOptIn: true, // Must explicitly opt-in via preferredLevel
  },
};

/**
 * Calculate the trust level a coach has earned based on their metrics.
 *
 * @param totalApprovals - Total number of summaries approved
 * @param totalSuppressed - Total number of summaries suppressed
 * @param hasOptedInToLevel3 - Whether coach has opted into level 3 automation
 * @returns Trust level (0-3)
 *
 * Examples:
 * - calculateTrustLevel(5, 0, false) => 0 (New: <10 approvals)
 * - calculateTrustLevel(15, 2, false) => 1 (Learning: 10+ approvals)
 * - calculateTrustLevel(60, 3, false) => 2 (Trusted: 50+ approvals, 5% suppression)
 * - calculateTrustLevel(60, 10, false) => 1 (High suppression rate: 14% > 10%)
 * - calculateTrustLevel(250, 10, false) => 2 (Hasn't opted into level 3)
 * - calculateTrustLevel(250, 10, true) => 3 (Expert: 200+ approvals + opt-in)
 */
export function calculateTrustLevel(
  totalApprovals: number,
  totalSuppressed: number,
  hasOptedInToLevel3: boolean
): number {
  // Level 0: Default for new coaches
  if (totalApprovals < TRUST_LEVEL_THRESHOLDS.level1.minApprovals) {
    return 0;
  }

  // Calculate suppression rate
  const totalReviews = totalApprovals + totalSuppressed;
  const suppressionRate = totalReviews > 0 ? totalSuppressed / totalReviews : 0;

  // Level 3: Expert (requires opt-in)
  if (
    hasOptedInToLevel3 &&
    totalApprovals >= TRUST_LEVEL_THRESHOLDS.level3.minApprovals &&
    suppressionRate <= TRUST_LEVEL_THRESHOLDS.level2.maxSuppressionRate
  ) {
    return 3;
  }

  // Level 2: Trusted
  if (
    totalApprovals >= TRUST_LEVEL_THRESHOLDS.level2.minApprovals &&
    suppressionRate <= TRUST_LEVEL_THRESHOLDS.level2.maxSuppressionRate
  ) {
    return 2;
  }

  // Level 1: Learning
  if (totalApprovals >= TRUST_LEVEL_THRESHOLDS.level1.minApprovals) {
    return 1;
  }

  return 0;
}

/**
 * Calculate progress toward the next trust level.
 *
 * @param currentLevel - Current trust level
 * @param totalApprovals - Total approvals
 * @param totalSuppressed - Total suppressions
 * @returns Object with current count, threshold, and percentage
 */
export function calculateProgressToNextLevel(
  currentLevel: number,
  totalApprovals: number,
  totalSuppressed: number
): {
  currentCount: number;
  threshold: number;
  percentage: number;
  blockedBySuppressionRate: boolean;
} {
  // Already at max level
  if (currentLevel >= 3) {
    return {
      currentCount: totalApprovals,
      threshold: TRUST_LEVEL_THRESHOLDS.level3.minApprovals,
      percentage: 100,
      blockedBySuppressionRate: false,
    };
  }

  const totalReviews = totalApprovals + totalSuppressed;
  const suppressionRate = totalReviews > 0 ? totalSuppressed / totalReviews : 0;

  let threshold: number;
  let blockedBySuppressionRate = false;

  if (currentLevel === 0) {
    threshold = TRUST_LEVEL_THRESHOLDS.level1.minApprovals;
  } else if (currentLevel === 1) {
    threshold = TRUST_LEVEL_THRESHOLDS.level2.minApprovals;
    blockedBySuppressionRate =
      suppressionRate > TRUST_LEVEL_THRESHOLDS.level2.maxSuppressionRate;
  } else {
    // currentLevel === 2
    threshold = TRUST_LEVEL_THRESHOLDS.level3.minApprovals;
    blockedBySuppressionRate =
      suppressionRate > TRUST_LEVEL_THRESHOLDS.level2.maxSuppressionRate;
  }

  const percentage = Math.min(100, (totalApprovals / threshold) * 100);

  return {
    currentCount: totalApprovals,
    threshold,
    percentage,
    blockedBySuppressionRate,
  };
}
