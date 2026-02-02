/**
 * Auto-Approval Decision Logic (Phase 2)
 *
 * Pure function for determining whether a summary should be auto-approved.
 * Based on coach trust level, confidence score, and sensitivity category.
 *
 * Pattern: Supervised automation with 1-hour revoke window.
 * Reference: trustLevelCalculator.ts for similar pure logic pattern.
 */

export type AutoApprovalDecision = {
  shouldAutoApprove: boolean;
  reason: string;
  tier: "auto_send" | "manual_review" | "flagged";
  decidedAt: number;
};

export type TrustLevelInput = {
  currentLevel: number;
  preferredLevel: number | null | undefined;
  confidenceThreshold: number | null | undefined;
  personalizedThreshold: number | null | undefined; // Phase 4: AI-learned threshold
};

export type SummaryInput = {
  confidenceScore: number;
  sensitivityCategory: string;
};

/**
 * Decide whether a summary should be auto-approved based on trust level and summary properties.
 *
 * Rules:
 * 1. NEVER auto-approve injury/behavior (always flagged)
 * 2. Level 0/1: Manual review required (learning phase)
 * 3. Level 2: Auto-approve if confidence >= threshold (default 70%)
 * 4. Level 3: Auto-approve all normal summaries (full automation opt-in)
 *
 * @param trustLevel - Coach's trust level data
 * @param summary - Summary properties (confidence, sensitivity)
 * @returns Decision with shouldAutoApprove flag, reason, tier, and timestamp
 */
export function decideAutoApproval(
  trustLevel: TrustLevelInput,
  summary: SummaryInput
): AutoApprovalDecision {
  const now = Date.now();

  // Rule 1: NEVER auto-approve sensitive content
  if (summary.sensitivityCategory !== "normal") {
    return {
      shouldAutoApprove: false,
      reason:
        summary.sensitivityCategory === "injury"
          ? "Injury-related content requires manual review"
          : "Behavior-related content requires manual review",
      tier: "flagged",
      decidedAt: now,
    };
  }

  // Calculate effective level (respect coach's preferred level cap)
  const effectiveLevel = Math.min(
    trustLevel.currentLevel,
    trustLevel.preferredLevel ?? trustLevel.currentLevel
  );

  // Phase 4: Use personalized threshold if available, otherwise use coach's confidence threshold, otherwise default to 0.7
  const threshold =
    trustLevel.personalizedThreshold ?? trustLevel.confidenceThreshold ?? 0.7;

  // Rule 2: Levels 0-1 require manual review (learning phase)
  if (effectiveLevel < 2) {
    return {
      shouldAutoApprove: false,
      reason: `Level ${effectiveLevel}: Manual review required during learning phase`,
      tier: "manual_review",
      decidedAt: now,
    };
  }

  // Rule 3: Level 2 - auto-approve if confidence meets threshold
  if (effectiveLevel === 2) {
    if (summary.confidenceScore >= threshold) {
      return {
        shouldAutoApprove: true,
        reason: `Level 2 (Trusted): ${Math.round(summary.confidenceScore * 100)}% confidence meets ${Math.round(threshold * 100)}% threshold`,
        tier: "auto_send",
        decidedAt: now,
      };
    }
    return {
      shouldAutoApprove: false,
      reason: `Confidence ${Math.round(summary.confidenceScore * 100)}% below ${Math.round(threshold * 100)}% threshold`,
      tier: "manual_review",
      decidedAt: now,
    };
  }

  // Rule 4: Level 3 - full automation (auto-approve all normal)
  return {
    shouldAutoApprove: true,
    reason: "Level 3 (Expert): Full automation enabled",
    tier: "auto_send",
    decidedAt: now,
  };
}

/**
 * Phase 4: Calculate personalized confidence threshold based on coach override patterns
 *
 * Analyzes coach behavior:
 * - Trusting coach: Approves low confidence (60-70%) → Lower threshold (more automation)
 * - Conservative coach: Rejects high confidence (80%+) → Higher threshold (fewer false positives)
 *
 * Industry pattern: Netflix/Spotify personalization, GitHub Copilot learning from rejections
 *
 * @param overrideHistory - Override analytics from getCoachOverridePatterns query
 * @param defaultThreshold - Starting threshold (default 0.7)
 * @param minOverrides - Minimum overrides required for personalization (default 20)
 * @returns Personalized threshold or null if insufficient data
 */
export function calculatePersonalizedThreshold(
  overrideHistory: {
    totalOverrides: number;
    byType: {
      coach_approved_low_confidence: number;
      coach_rejected_high_confidence: number;
      coach_edited: number;
      coach_revoked_auto: number;
    };
    avgConfidenceWhenRejected: number | null;
  },
  defaultThreshold = 0.7,
  minOverrides = 20
): number | null {
  // Require minimum data for personalization
  if (overrideHistory.totalOverrides < minOverrides) {
    return null; // Not enough data yet
  }

  let adjustedThreshold = defaultThreshold;

  // Pattern 1: Coach approves low confidence summaries (60-70% range)
  // Signal: Coach is trusting, willing to approve borderline summaries
  // Action: Lower threshold by 5% to increase automation
  const approvedLowCount = overrideHistory.byType.coach_approved_low_confidence;
  if (approvedLowCount > 0) {
    // Calculate approval rate for low confidence summaries
    // If >50% of overrides are approving low confidence, coach is trusting
    const approvalRate = approvedLowCount / overrideHistory.totalOverrides;
    if (approvalRate > 0.5) {
      adjustedThreshold -= 0.05; // Lower by 5%
    }
  }

  // Pattern 2: Coach rejects high confidence summaries (80%+ range)
  // Signal: Coach is conservative, AI is over-confident
  // Action: Raise threshold by 5% to reduce false positives
  const rejectedHighCount =
    overrideHistory.byType.coach_rejected_high_confidence;
  if (rejectedHighCount > 0) {
    // Calculate rejection rate for high confidence summaries
    // If >20% of overrides are rejecting high confidence, coach is conservative
    const rejectionRate = rejectedHighCount / overrideHistory.totalOverrides;
    if (rejectionRate > 0.2) {
      adjustedThreshold += 0.05; // Raise by 5%
    }
  }

  // Safety bounds: Keep threshold between 60% and 85%
  // Too low (< 60%): Risk of bad summaries being auto-approved
  // Too high (> 85%): Defeats purpose of automation
  const boundedThreshold = Math.max(0.6, Math.min(0.85, adjustedThreshold));

  // Only return if we actually adjusted (otherwise let default/manual threshold apply)
  return boundedThreshold !== defaultThreshold ? boundedThreshold : null;
}
