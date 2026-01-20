"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

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
      model: "claude-haiku-4-20250514",
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
      model: "claude-haiku-4-20250514",
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
