/**
 * Auto-Approval Decision Logic (Phase 2)
 *
 * Pure function for determining whether a summary should be auto-approved.
 * Based on coach trust level, confidence score, and sensitivity category.
 *
 * Pattern: Supervised automation with 1-hour revoke window.
 * Reference: trustLevelCalculator.ts for similar pure logic pattern.
 */

export interface AutoApprovalDecision {
  shouldAutoApprove: boolean;
  reason: string;
  tier: "auto_send" | "manual_review" | "flagged";
  decidedAt: number;
}

export interface TrustLevelInput {
  currentLevel: number;
  preferredLevel: number | null | undefined;
  confidenceThreshold: number | null | undefined;
}

export interface SummaryInput {
  confidenceScore: number;
  sensitivityCategory: string;
}

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

  // Use default threshold of 0.7 (70%) if not set
  const threshold = trustLevel.confidenceThreshold ?? 0.7;

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
