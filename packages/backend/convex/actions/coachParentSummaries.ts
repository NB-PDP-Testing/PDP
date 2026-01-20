"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Default Claude model for parent summary generation
 * Can be overridden via ANTHROPIC_MODEL environment variable in Convex dashboard
 */
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";

/**
 * Get Anthropic client with API key from environment
 * Throws if ANTHROPIC_API_KEY is not configured
 */
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
 * Get the Claude model to use for AI operations
 * Uses ANTHROPIC_MODEL env var if set, otherwise defaults to claude-3-5-haiku
 */
function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
}

// Regex for extracting JSON from Claude responses
const JSON_EXTRACT_REGEX = /\{[\s\S]*\}/;

/**
 * Classify insight sensitivity category
 * Determines if an insight is NORMAL, INJURY, or BEHAVIOR
 * INJURY and BEHAVIOR insights always require manual coach approval
 */
export const classifyInsightSensitivity = internalAction({
  args: {
    insightTitle: v.string(),
    insightDescription: v.string(),
  },
  returns: v.object({
    category: v.union(
      v.literal("normal"),
      v.literal("injury"),
      v.literal("behavior")
    ),
    confidence: v.number(),
    reason: v.string(),
  }),
  handler: async (_ctx, args) => {
    const client = getAnthropicClient();

    const prompt = `You are a sensitivity classifier for youth sports coaching insights.

Classify the following insight into one of these categories:
- INJURY: Mentions injuries, pain, medical concerns, physical issues, return-to-play
- BEHAVIOR: Mentions discipline, attitude, off-field conduct, behavioral concerns
- NORMAL: Everything else (skill development, performance, training progress)

IMPORTANT: Be conservative. If there's any mention of injury or behavior, classify it as such.

Insight Title: ${args.insightTitle}
Insight Description: ${args.insightDescription}

Respond in JSON format:
{
  "category": "normal" | "injury" | "behavior",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;

    const response = await client.messages.create({
      model: getAnthropicModel(),
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse the response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude API");
    }

    // Extract JSON from response (may be wrapped in markdown)
    const text = content.text.trim();
    const jsonMatch = text.match(JSON_EXTRACT_REGEX);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Claude response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      category: result.category as "normal" | "injury" | "behavior",
      confidence: Number(result.confidence),
      reason: result.reason,
    };
  },
});

/**
 * Generate parent-friendly summary from coach insight
 * Transforms potentially negative or technical language into positive, encouraging feedback
 */
export const generateParentSummary = internalAction({
  args: {
    insightTitle: v.string(),
    insightDescription: v.string(),
    playerFirstName: v.string(),
    sportName: v.string(),
  },
  returns: v.object({
    summary: v.string(),
    confidenceScore: v.number(),
    flags: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    const client = getAnthropicClient();

    const prompt = `You are a youth sports communication assistant helping coaches share feedback with parents.

Your task: Transform the coach's internal insight into a positive, encouraging message for parents.

TRANSFORMATION RULES:
- "struggling with X" → "working on developing X"
- "weak at X" → "building strength in X"
- "poor X" → "developing X skills"
- "can't do X" → "learning X"
- "needs improvement" → "showing progress in"
- Focus on growth mindset and effort
- Keep it concise (2-3 sentences max)
- Be specific about what the player is working on
- Always include a positive note

Player: ${args.playerFirstName}
Sport: ${args.sportName}

Coach's Insight:
Title: ${args.insightTitle}
Description: ${args.insightDescription}

Generate a parent-friendly summary. Also identify any flags that might need coach review:
- "needs_context": Summary is too vague, needs more specifics
- "overly_positive": May be glossing over important issues
- "technical_jargon": Contains terms parents may not understand

Respond in JSON format:
{
  "summary": "Parent-friendly message here",
  "confidenceScore": 0.0-1.0,
  "flags": ["flag1", "flag2"] or []
}`;

    const response = await client.messages.create({
      model: getAnthropicModel(),
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse the response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude API");
    }

    // Extract JSON from response
    const text = content.text.trim();
    const jsonMatch = text.match(JSON_EXTRACT_REGEX);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Claude response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      summary: result.summary,
      confidenceScore: Number(result.confidenceScore),
      flags: result.flags || [],
    };
  },
});

/**
 * Process voice note insight and create parent summary
 * Orchestrates the full pipeline: classify → generate → store
 */
export const processVoiceNoteInsight = internalAction({
  args: {
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(),
    insightTitle: v.string(),
    insightDescription: v.string(),
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      console.log("🔄 Processing voice note insight for parent summary", {
        voiceNoteId: args.voiceNoteId,
        insightId: args.insightId,
        playerIdentityId: args.playerIdentityId,
      });

      // Step 1: Classify sensitivity
      const classification = await ctx.runAction(
        internal.actions.coachParentSummaries.classifyInsightSensitivity,
        {
          insightTitle: args.insightTitle,
          insightDescription: args.insightDescription,
        }
      );

      console.log("📊 Classification result:", classification);

      // Step 2: Get player info for context
      const player = await ctx.runQuery(
        internal.models.playerIdentities.getById,
        { id: args.playerIdentityId }
      );

      if (!player) {
        console.error("❌ Player not found:", args.playerIdentityId);
        return null;
      }

      // Step 3: Get player's sport from passport
      const passport = await ctx.runQuery(
        internal.models.sportPassports.getByPlayerIdentityId,
        { playerIdentityId: args.playerIdentityId }
      );

      if (!passport) {
        console.error(
          "❌ No sport passport found for player:",
          args.playerIdentityId
        );
        return null;
      }

      // Step 4: Get sport info for context
      const sport = await ctx.runQuery(
        internal.models.sports.getByCodeInternal,
        {
          code: passport.sportCode,
        }
      );

      if (!sport) {
        console.error("❌ Sport not found:", passport.sportCode);
        return null;
      }

      // Step 4: Generate parent-friendly summary
      const summary = await ctx.runAction(
        internal.actions.coachParentSummaries.generateParentSummary,
        {
          insightTitle: args.insightTitle,
          insightDescription: args.insightDescription,
          playerFirstName: player.firstName,
          sportName: sport.name,
        }
      );

      console.log("✍️ Generated summary:", {
        summaryLength: summary.summary.length,
        confidenceScore: summary.confidenceScore,
        flags: summary.flags,
      });

      // Step 5: Create summary record
      await ctx.runMutation(
        internal.models.coachParentSummaries.createParentSummary,
        {
          voiceNoteId: args.voiceNoteId,
          insightId: args.insightId,
          privateInsight: {
            title: args.insightTitle,
            description: args.insightDescription,
            category: classification.category,
            sentiment: "neutral", // Default sentiment
          },
          publicSummary: {
            content: summary.summary,
            confidenceScore: summary.confidenceScore,
            generatedAt: Date.now(),
          },
          sensitivityCategory: classification.category,
          playerIdentityId: args.playerIdentityId,
          sportId: sport._id,
        }
      );

      console.log("✅ Parent summary created successfully");
    } catch (error) {
      console.error("❌ Error processing voice note insight:", error);
      // Don't throw - we don't want to break the voice note pipeline
      // Log the error and continue
    }

    return null;
  },
});
