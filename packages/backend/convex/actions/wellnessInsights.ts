"use node";

// TODO (Phase 7+): Migrate to platform AI service pattern — use aiServiceHealth
// checks and read model config from DB (aiModelConfig table) rather than
// hardcoding INSIGHT_MODEL here. See docs/ai-service-pattern.md for reference.

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const INSIGHT_MODEL = "claude-haiku-4-5-20251001";
const INSIGHT_MAX_TOKENS = 100;

type CheckRecord = {
  checkDate: string;
  sleepQuality?: number;
  energyLevel?: number;
  mood?: number;
  physicalFeeling?: number;
  motivation?: number;
  foodIntake?: number;
  waterIntake?: number;
  muscleRecovery?: number;
};

type DimKey = keyof Omit<CheckRecord, "checkDate">;

const DIMS: DimKey[] = [
  "sleepQuality",
  "energyLevel",
  "mood",
  "physicalFeeling",
  "motivation",
  "foodIntake",
  "waterIntake",
  "muscleRecovery",
];

function computeAvg(checks: CheckRecord[], dim: DimKey): number | null {
  const vals = checks
    .map((c) => c[dim])
    .filter((x): x is number => x !== undefined);
  if (vals.length === 0) {
    return null;
  }
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function computeAggregate(checks: CheckRecord[]): number | null {
  const scores = checks
    .map((c) => {
      const dims = DIMS.map((d) => c[d]).filter(
        (x): x is number => x !== undefined
      );
      return dims.length > 0
        ? dims.reduce((a, b) => a + b, 0) / dims.length
        : null;
    })
    .filter((s): s is number => s !== null);
  if (scores.length === 0) {
    return null;
  }
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function buildDimSummary(
  last7: CheckRecord[]
): Record<string, { avg7: number | null; trend: string }> {
  const result: Record<string, { avg7: number | null; trend: string }> = {};
  for (const dim of DIMS) {
    const dimAvg7 = computeAvg(last7, dim);
    if (dimAvg7 === null) {
      continue;
    }
    const last3Avg = computeAvg(last7.slice(0, 3), dim);
    const prior4Avg = computeAvg(last7.slice(3), dim);
    let trend = "stable";
    if (last3Avg !== null && prior4Avg !== null) {
      const diff = last3Avg - prior4Avg;
      if (diff > 0.3) {
        trend = "improving";
      } else if (diff < -0.3) {
        trend = "declining";
      }
    }
    result[dim] = { avg7: dimAvg7, trend };
  }
  return result;
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is not set. Please configure it in Convex dashboard."
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Generate a short AI wellness insight for a player after their check-in.
 * Requires at least 7 days of data. Only one insight generated per day.
 * Fire-and-forget — called via ctx.scheduler.runAfter(0, ...) from submitDailyHealthCheck.
 */
export const generateWellnessInsight = internalAction({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    triggerCheckId: v.id("dailyPlayerHealthChecks"),
  },
  returns: v.union(
    v.object({ generated: v.literal(true), insight: v.string() }),
    v.object({
      generated: v.literal(false),
      reason: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Step 1: Fetch last 14 days of check-ins
    const allChecks: CheckRecord[] = await ctx.runQuery(
      internal.models.playerHealthChecks.getRecentChecksForInsight,
      { playerIdentityId: args.playerIdentityId }
    );

    if (allChecks.length < 7) {
      return { generated: false as const, reason: "insufficient_data" };
    }

    // Step 2: Check if insight already generated today
    const alreadyGenerated: boolean = await ctx.runQuery(
      internal.models.playerHealthChecks.hasInsightGeneratedToday,
      { playerIdentityId: args.playerIdentityId }
    );

    if (alreadyGenerated) {
      return { generated: false as const, reason: "already_generated_today" };
    }

    // Step 3: Compute averages + trends using module-level helpers
    const last7 = allChecks.slice(0, 7);
    const avg7 = computeAggregate(last7);
    const avg14 = computeAggregate(allChecks);
    const dimStats = buildDimSummary(last7);

    const dimSummary = Object.entries(dimStats)
      .map(
        ([dim, s]) => `${dim}: avg ${(s.avg7 ?? 0).toFixed(1)}/5 (${s.trend})`
      )
      .join(", ");

    // Step 4: Call Claude API
    const prompt = `You are a player wellness assistant for a sports club. Based on the following 14-day wellness data, generate ONE concise, encouraging, and actionable insight (max 20 words). Do not diagnose, prescribe, or use clinical language. Focus on performance and recovery.

Data: 7-day average aggregate score: ${avg7 !== null ? avg7.toFixed(2) : "N/A"}/5, 14-day average: ${avg14 !== null ? avg14.toFixed(2) : "N/A"}/5. Dimensions: ${dimSummary}.

Respond with just the insight sentence, no preamble.`;

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: INSIGHT_MODEL,
      max_tokens: INSIGHT_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    let insightText = "";
    if (response.content[0]?.type === "text") {
      insightText = response.content[0].text.trim();
    }

    if (!insightText) {
      return { generated: false as const, reason: "empty_response" };
    }

    // Step 5: Insert insight record
    await ctx.runMutation(
      internal.models.playerHealthChecks.insertWellnessInsight,
      {
        playerIdentityId: args.playerIdentityId,
        organizationId: args.organizationId,
        insight: insightText,
        generatedAt: Date.now(),
        basedOnDays: allChecks.length,
        triggerCheckId: args.triggerCheckId,
      }
    );

    return { generated: true as const, insight: insightText };
  },
});
