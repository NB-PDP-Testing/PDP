"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { action, internalAction } from "../_generated/server";
import { buildHealthUpdate, shouldCallAPI } from "../lib/circuitBreaker";

/**
 * AI Model Configuration for Parent Summaries
 *
 * Configuration is read from the database (aiModelConfig table) with:
 * - Platform-wide defaults
 * - Optional per-organization overrides
 *
 * Falls back to environment variables if database config is not available:
 * - ANTHROPIC_MODEL_SENSITIVITY: Model for classifying insight sensitivity
 * - ANTHROPIC_MODEL_SUMMARY: Model for generating parent-friendly summaries
 *
 * Final fallback uses claude-3-5-haiku for cost efficiency.
 */
const DEFAULT_MODEL_SENSITIVITY = "claude-3-5-haiku-20241022";
const DEFAULT_MODEL_SUMMARY = "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TOKENS_SENSITIVITY = 500;
const DEFAULT_MAX_TOKENS_SUMMARY = 500;

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
 * Get AI config from database with fallback to env vars
 */
async function getAIConfig(
  ctx: ActionCtx,
  feature: "sensitivity_classification" | "parent_summary",
  organizationId?: string
): Promise<{
  modelId: string;
  maxTokens: number;
  temperature?: number;
}> {
  // Try to get config from database
  try {
    const dbConfig = await ctx.runQuery(
      internal.models.aiModelConfig.getConfigForFeatureInternal,
      { feature, organizationId }
    );

    if (dbConfig) {
      return {
        modelId: dbConfig.modelId,
        maxTokens:
          dbConfig.maxTokens ||
          (feature === "sensitivity_classification"
            ? DEFAULT_MAX_TOKENS_SENSITIVITY
            : DEFAULT_MAX_TOKENS_SUMMARY),
        temperature: dbConfig.temperature,
      };
    }
  } catch (error) {
    console.warn(
      `Failed to get AI config from database for ${feature}, using fallback:`,
      error
    );
  }

  // Fallback to environment variables
  if (feature === "sensitivity_classification") {
    return {
      modelId:
        process.env.ANTHROPIC_MODEL_SENSITIVITY || DEFAULT_MODEL_SENSITIVITY,
      maxTokens: DEFAULT_MAX_TOKENS_SENSITIVITY,
    };
  }

  return {
    modelId: process.env.ANTHROPIC_MODEL_SUMMARY || DEFAULT_MODEL_SUMMARY,
    maxTokens: DEFAULT_MAX_TOKENS_SUMMARY,
  };
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
    organizationId: v.optional(v.string()),
  },
  returns: v.object({
    category: v.union(
      v.literal("normal"),
      v.literal("injury"),
      v.literal("behavior")
    ),
    confidence: v.number(),
    reason: v.string(),
    isFallback: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    // Check circuit breaker status before calling API
    const serviceHealth = await ctx.runQuery(
      internal.models.aiServiceHealth.getServiceHealth
    );

    // If circuit breaker blocks the call, return fallback
    if (!shouldCallAPI(serviceHealth)) {
      console.warn(
        "⚠️ Circuit breaker OPEN - returning fallback classification"
      );
      return {
        category: "normal" as const,
        confidence: 0.5,
        reason: "AI service unavailable - defaulting to normal classification",
        isFallback: true,
      };
    }

    const client = getAnthropicClient();

    // Get model config from database with fallback
    const config = await getAIConfig(
      ctx,
      "sensitivity_classification",
      args.organizationId
    );

    const prompt = `You are a sensitivity classifier for youth sports coaching insights.

Classify the following insight into one of these categories:
- INJURY: Mentions injuries, pain, medical concerns, physical issues, return-to-play
- BEHAVIOR: Mentions discipline, attitude, off-field conduct, behavioral concerns
- NORMAL: Everything else (skill development, performance, training progress)

IMPORTANT: Be conservative. If there's any mention of injury or behavior, classify it as such.

EXAMPLES:

Example 1 (INJURY):
Title: "Player limping after drill"
Description: "Sarah was favoring her left ankle after the sprint drills. She said it hurts when she puts weight on it."
Classification: { "category": "injury", "confidence": 0.95, "reason": "Mentions limping, pain, and physical discomfort" }

Example 2 (INJURY):
Title: "Dizzy spell during practice"
Description: "Tom felt dizzy after collision in scrimmage. Sat out rest of practice. Needs monitoring."
Classification: { "category": "injury", "confidence": 0.9, "reason": "Mentions dizziness after collision, medical concern" }

Example 3 (BEHAVIOR):
Title: "Argument with teammate"
Description: "Mike had an argument with another player during warm-up. Not listening to feedback lately."
Classification: { "category": "behavior", "confidence": 0.85, "reason": "Mentions conflict and attitude issues" }

Example 4 (BEHAVIOR):
Title: "Poor attitude today"
Description: "Emma showed up late and wasn't engaged. Need to discuss commitment expectations."
Classification: { "category": "behavior", "confidence": 0.8, "reason": "Mentions attitude and conduct concerns" }

Example 5 (NORMAL):
Title: "Great passing progress"
Description: "Jamie's passing accuracy has improved significantly. Ready to work on longer range passes."
Classification: { "category": "normal", "confidence": 0.95, "reason": "Pure skill development feedback" }

Example 6 (NORMAL):
Title: "Strong performance in scrimmage"
Description: "Alex dominated in the midfield today. Great decision making and work rate."
Classification: { "category": "normal", "confidence": 0.9, "reason": "Performance and skill observation" }

Now classify this insight:

Insight Title: ${args.insightTitle}
Insight Description: ${args.insightDescription}

Respond in JSON format:
{
  "category": "normal" | "injury" | "behavior",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;

    try {
      const response = await client.messages.create({
        model: config.modelId,
        max_tokens: config.maxTokens,
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

      // Validate AI response structure before type casting
      const validCategories = ["normal", "injury", "behavior"];
      if (!(result.category && validCategories.includes(result.category))) {
        throw new Error(
          `Invalid category from AI: ${result.category}. Expected one of: ${validCategories.join(", ")}`
        );
      }

      if (
        typeof result.confidence !== "number" ||
        result.confidence < 0 ||
        result.confidence > 1
      ) {
        throw new Error(
          `Invalid confidence score from AI: ${result.confidence}. Expected number between 0 and 1`
        );
      }

      if (!result.reason || typeof result.reason !== "string") {
        throw new Error(
          `Invalid reason from AI: ${result.reason}. Expected non-empty string`
        );
      }

      // Success - update health record
      const healthUpdate = buildHealthUpdate(serviceHealth, true);
      await ctx.runMutation(
        internal.models.aiServiceHealth.updateServiceHealth,
        healthUpdate
      );

      return {
        category: result.category as "normal" | "injury" | "behavior",
        confidence: Number(result.confidence),
        reason: result.reason,
        isFallback: false,
      };
    } catch (error) {
      // API call failed - update health record and return fallback
      console.error("❌ AI classification failed:", error);

      const healthUpdate = buildHealthUpdate(serviceHealth, false);
      await ctx.runMutation(
        internal.models.aiServiceHealth.updateServiceHealth,
        healthUpdate
      );

      return {
        category: "normal" as const,
        confidence: 0.5,
        reason: "AI service error - defaulting to normal classification",
        isFallback: true,
      };
    }
  },
});

/**
 * Generate parent-friendly summary from coach insight
 * Transforms potentially negative or technical language into positive, encouraging feedback
 *
 * Uses Anthropic prompt caching for 90% cost reduction:
 * - System prompt and player/sport context are cached (static content)
 * - Only insight content varies per call (not cached)
 * - Cache TTL: 5 minutes
 *
 * Logs all AI usage to aiUsageLog table for cost tracking and analytics.
 */
export const generateParentSummary = internalAction({
  args: {
    insightTitle: v.string(),
    insightDescription: v.string(),
    playerFirstName: v.string(),
    sportName: v.string(),
    organizationId: v.string(), // Required for usage logging
    coachId: v.string(), // Required for usage logging
    playerId: v.optional(v.id("orgPlayerEnrollments")), // Optional for usage logging
  },
  returns: v.object({
    summary: v.string(),
    confidenceScore: v.number(),
    flags: v.array(v.string()),
    isFallback: v.optional(v.boolean()),
    // Cache statistics for cost tracking
    cacheStats: v.object({
      inputTokens: v.number(),
      cachedTokens: v.number(),
      outputTokens: v.number(),
      cacheCreationTokens: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    // Check circuit breaker status before calling API
    const serviceHealth = await ctx.runQuery(
      internal.models.aiServiceHealth.getServiceHealth
    );

    // If circuit breaker blocks the call, return fallback
    if (!shouldCallAPI(serviceHealth)) {
      console.warn("⚠️ Circuit breaker OPEN - returning fallback summary");
      return {
        summary: `Your coach shared an update about ${args.playerFirstName}. View details in passport.`,
        confidenceScore: 0.5,
        flags: ["fallback_mode"],
        isFallback: true,
        cacheStats: {
          inputTokens: 0,
          cachedTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
        },
      };
    }

    const client = getAnthropicClient();

    // Get model config from database with fallback
    const config = await getAIConfig(
      ctx,
      "parent_summary",
      args.organizationId
    );

    // System prompt - this will be cached (static content)
    const systemPrompt = `You are a youth sports communication assistant helping coaches share feedback with parents.

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

    // Player context - this will be cached (semi-static)
    const playerContext = `Player: ${args.playerFirstName}
Sport: ${args.sportName}`;

    // Insight content - this varies per call (NOT cached)
    const insightContent = `Coach's Insight:
Title: ${args.insightTitle}
Description: ${args.insightDescription}`;

    try {
      const response = await client.messages.create(
        {
          model: config.modelId,
          max_tokens: config.maxTokens,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: systemPrompt,
                  // Mark for caching
                  cache_control: { type: "ephemeral" },
                },
                {
                  type: "text",
                  text: playerContext,
                  // Mark for caching
                  cache_control: { type: "ephemeral" },
                },
                {
                  type: "text",
                  text: insightContent,
                  // No cache_control = not cached (varies per call)
                },
              ],
            },
          ],
        },
        {
          // REQUIRED: Enable prompt caching via headers in options
          headers: {
            "anthropic-beta": "prompt-caching-2024-07-31",
          },
        }
      );

      // Extract cache statistics from response
      const inputTokens = response.usage.input_tokens;
      const cachedTokens = response.usage.cache_read_input_tokens || 0;
      const cacheCreationTokens =
        response.usage.cache_creation_input_tokens || 0;
      const outputTokens = response.usage.output_tokens;

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

      // Calculate cost (Claude Haiku pricing)
      const PRICE_INPUT_REGULAR = 0.000_005; // $5 per 1M tokens
      const PRICE_INPUT_CACHED = 0.000_000_5; // $0.50 per 1M tokens (90% discount)
      const PRICE_OUTPUT = 0.000_015; // $15 per 1M tokens

      const regularTokens = inputTokens - cachedTokens;
      const cost =
        regularTokens * PRICE_INPUT_REGULAR +
        cachedTokens * PRICE_INPUT_CACHED +
        outputTokens * PRICE_OUTPUT;

      // Calculate cache hit rate
      const cacheHitRate = inputTokens > 0 ? cachedTokens / inputTokens : 0;

      // Log AI usage (don't fail if logging fails)
      try {
        await ctx.runMutation(internal.models.aiUsageLog.logUsage, {
          timestamp: Date.now(),
          organizationId: args.organizationId as any, // Type assertion needed for Convex ID
          coachId: args.coachId,
          playerId: args.playerId,
          operation: "parent_summary",
          model: config.modelId,
          inputTokens,
          cachedTokens,
          outputTokens,
          cost,
          cacheHitRate,
        });
      } catch (error) {
        console.error(
          "❌ Failed to log AI usage (non-fatal, continuing):",
          error
        );
      }

      // Success - update health record
      const healthUpdate = buildHealthUpdate(serviceHealth, true);
      await ctx.runMutation(
        internal.models.aiServiceHealth.updateServiceHealth,
        healthUpdate
      );

      return {
        summary: result.summary,
        confidenceScore: Number(result.confidenceScore),
        flags: result.flags || [],
        isFallback: false,
        cacheStats: {
          inputTokens,
          cachedTokens,
          outputTokens,
          cacheCreationTokens,
        },
      };
    } catch (error) {
      // API call failed - update health record and return fallback
      console.error("❌ AI summary generation failed:", error);

      const healthUpdate = buildHealthUpdate(serviceHealth, false);
      await ctx.runMutation(
        internal.models.aiServiceHealth.updateServiceHealth,
        healthUpdate
      );

      return {
        summary: `Your coach shared an update about ${args.playerFirstName}. View details in passport.`,
        confidenceScore: 0.5,
        flags: ["fallback_mode"],
        isFallback: true,
        cacheStats: {
          inputTokens: 0,
          cachedTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
        },
      };
    }
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
    coachId: v.optional(v.string()), // Added to check skip settings
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Step 0.1: Check rate limits FIRST (US-009)
      // Prevents abuse or runaway loops
      const rateCheck = await ctx.runQuery(
        internal.models.rateLimits.checkRateLimit,
        { organizationId: args.organizationId }
      );

      if (!rateCheck.allowed) {
        const resetDate = rateCheck.resetAt
          ? new Date(rateCheck.resetAt).toISOString()
          : "soon";
        console.warn(
          `⚠️ Rate limit exceeded for org ${args.organizationId}: ${rateCheck.reason}. Resets at ${resetDate}`
        );
        // Exit early without calling AI
        return null;
      }

      // Step 0.2: Check budget limits (US-004)
      // Fail fast if budget exceeded
      const budgetCheck = await ctx.runQuery(
        internal.models.orgCostBudgets.checkOrgCostBudget,
        { organizationId: args.organizationId }
      );

      if (!budgetCheck.withinBudget) {
        // Log budget exceeded event for analytics
        await ctx.runMutation(
          internal.models.orgCostBudgets.logBudgetExceededEvent,
          {
            organizationId: args.organizationId,
            reason: budgetCheck.reason,
          }
        );

        // Get reset time for helpful error message
        const resetInfo =
          budgetCheck.reason === "daily_exceeded"
            ? "Budget resets at midnight UTC"
            : "Budget resets at start of next month";

        console.warn(
          `⚠️ Budget exceeded for org ${args.organizationId}: ${budgetCheck.reason}. ${resetInfo}`
        );
        // Exit early WITHOUT calling any AI
        return null;
      }

      // Step 1: Classify sensitivity
      const classification = await ctx.runAction(
        internal.actions.coachParentSummaries.classifyInsightSensitivity,
        {
          insightTitle: args.insightTitle,
          insightDescription: args.insightDescription,
        }
      );

      // Step 1.5: Check if sensitive insights should be skipped
      if (
        args.coachId &&
        (classification.category === "injury" ||
          classification.category === "behavior")
      ) {
        const shouldSkip = await ctx.runQuery(
          internal.models.coachTrustLevels.shouldSkipSensitiveInsights,
          {
            coachId: args.coachId,
            organizationId: args.organizationId,
          }
        );

        if (shouldSkip) {
          return null;
        }
      }

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
          organizationId: args.organizationId,
          coachId: args.coachId || "unknown", // Should always be present, fallback just in case
          playerId: undefined, // Note: We have playerIdentityId but not orgPlayerEnrollments ID here
        }
      );

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
          sensitivityReason: classification.reason,
          sensitivityConfidence: classification.confidence,
          playerIdentityId: args.playerIdentityId,
          sportId: sport._id,
        }
      );

      // Step 6: Increment rate limit counters (US-009)
      // Both AI calls succeeded, so increment the rate limit counters
      // Note: We made 2 AI calls (classify + generate), but rate limit is per "message"
      // which represents one complete operation (both calls combined)
      // Cost is tracked separately in aiUsageLog - we'll use a small estimated cost here
      // since we don't have the actual cost returned from the actions
      // TODO: Consider returning cost from generateParentSummary action
      const ESTIMATED_COST_PER_OPERATION = 0.001; // $0.001 = 0.1 cents per operation
      await ctx.runMutation(internal.models.rateLimits.incrementRateLimit, {
        organizationId: args.organizationId,
        cost: ESTIMATED_COST_PER_OPERATION,
      });
    } catch (error) {
      console.error("❌ Error processing voice note insight:", error);
      // Don't throw - we don't want to break the voice note pipeline
      // Log the error and continue
    }

    return null;
  },
});

/**
 * Generate a shareable image card for a parent summary (US-011, US-012, US-013)
 * Creates a branded 1200x630 PNG image using satori (JSX to SVG) and resvg (SVG to PNG)
 *
 * Image design:
 * - Gradient background (PlayerARC brand colors: blue to purple)
 * - PlayerARC logo/text at top
 * - Quote-styled message content with player first name
 * - Attribution: "From Coach [FirstName] at [Organization]"
 * - Date in subtle text at bottom
 *
 * Storage: Uploads to Convex storage and returns URL
 */
export const generateShareableImage = action({
  args: {
    summaryId: v.id("coachParentSummaries"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Dynamically import satori and resvg WASM for compatibility
    const satori = (await import("satori")).default;
    const { Resvg, initWasm } = await import("@resvg/resvg-wasm");

    // Initialize WASM before using Resvg (CRITICAL for WASM version)
    // Handle "Already initialized" error gracefully in serverless environment
    // where the same process may handle multiple requests
    try {
      await initWasm(
        fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm")
      );
    } catch (error) {
      // If already initialized, that's fine - continue execution
      if (
        !(
          error instanceof Error &&
          error.message.includes("Already initialized")
        )
      ) {
        throw error;
      }
    }

    // Fetch summary data with player, coach, org names
    const summary = await ctx.runQuery(
      internal.models.coachParentSummaries.getSummaryForImage,
      {
        summaryId: args.summaryId,
      }
    );

    if (!summary) {
      throw new Error("Summary not found");
    }

    // Format date (e.g., "January 20, 2026")
    const date = new Date(summary.generatedAt);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Fetch fonts with error handling
    // Google Fonts may be blocked in Convex serverless environment
    const fonts: Array<{
      name: string;
      data: ArrayBuffer;
      weight: 400 | 500 | 600 | 700;
      style: string;
    }> = [];

    try {
      // Try to fetch Inter font (multiple weights)
      const fontUrls = [
        {
          url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff",
          weight: 400 as const,
        },
        {
          url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI2fAZ9hjp-Ek-_EeA.woff",
          weight: 500 as const,
        },
        {
          url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff",
          weight: 600 as const,
        },
        {
          url: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff",
          weight: 700 as const,
        },
      ];

      for (const { url: fontUrl, weight } of fontUrls) {
        try {
          const response = await fetch(fontUrl);
          // Check if response is actually a font file, not HTML
          const contentType = response.headers.get("content-type");
          if (
            contentType &&
            (contentType.includes("font") || contentType.includes("woff"))
          ) {
            const data = await response.arrayBuffer();
            fonts.push({
              name: "Inter",
              data,
              weight: weight as 400 | 500 | 600 | 700,
              style: "normal",
            });
          }
        } catch (error) {
          console.warn(`Failed to load font weight ${weight}:`, error);
        }
      }
    } catch (error) {
      console.warn("Font loading failed, using system fonts:", error);
    }

    // Coach name comes pre-formatted from query (includes "Coach" prefix)
    const coachName = summary.coachName;

    // Fetch PlayerARC logo
    let logoDataUrl = "";
    try {
      const logoUrl =
        "https://playerarc.io/_next/image?url=%2Flogos-landing%2FPDP-Logo-OffWhiteOrbit_GreenHuman.png&w=256&q=75";
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        const logoBuffer = await logoResponse.arrayBuffer();
        const logoBase64 = Buffer.from(logoBuffer).toString("base64");
        logoDataUrl = `data:image/png;base64,${logoBase64}`;
      }
    } catch (error) {
      console.warn("Failed to fetch PlayerARC logo:", error);
    }

    // Fetch organization logo if available
    let orgLogoDataUrl = "";
    if (summary.orgLogo) {
      try {
        const orgLogoResponse = await fetch(summary.orgLogo);
        if (orgLogoResponse.ok) {
          const orgLogoBuffer = await orgLogoResponse.arrayBuffer();
          const orgLogoBase64 = Buffer.from(orgLogoBuffer).toString("base64");
          // Detect content type
          const contentType =
            orgLogoResponse.headers.get("content-type") || "image/png";
          orgLogoDataUrl = `data:${contentType};base64,${orgLogoBase64}`;
        }
      } catch (error) {
        console.warn("Failed to fetch organization logo:", error);
      }
    }

    // Generate SVG using satori - PlayerARC branded design
    // Navy blue header/footer matching playerarc.io branding
    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            fontFamily: "sans-serif",
          },
          children: [
            // Navy Blue Header Bar
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "30px 50px",
                  background: "#2c3e50",
                },
                children: [
                  // Left: PlayerARC logo + text
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                      },
                      children: logoDataUrl
                        ? [
                            {
                              type: "img",
                              props: {
                                src: logoDataUrl,
                                style: {
                                  width: "50px",
                                  height: "50px",
                                },
                              },
                            },
                            {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: "40px",
                                  fontWeight: "700",
                                  color: "#ffffff",
                                  letterSpacing: "-0.5px",
                                },
                                children: "PlayerARC",
                              },
                            },
                          ]
                        : [
                            {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: "40px",
                                  fontWeight: "700",
                                  color: "#ffffff",
                                  letterSpacing: "-0.5px",
                                },
                                children: "PlayerARC",
                              },
                            },
                          ],
                    },
                  },
                  // Right: Org logo or name
                  orgLogoDataUrl
                    ? {
                        type: "img",
                        props: {
                          src: orgLogoDataUrl,
                          style: {
                            height: "50px",
                            maxWidth: "200px",
                            objectFit: "contain",
                          },
                        },
                      }
                    : {
                        type: "div",
                        props: {
                          style: {
                            fontSize: "22px",
                            color: "#ffffff",
                            fontWeight: "500",
                            opacity: 0.9,
                          },
                          children: summary.orgName,
                        },
                      },
                ],
              },
            },
            // White Content Area
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  flex: "1",
                  padding: "60px 80px",
                  textAlign: "center",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "32px",
                        color: "#1e293b",
                        marginBottom: "30px",
                        lineHeight: "1.5",
                        fontWeight: "400",
                        maxWidth: "900px",
                      },
                      children: `"${summary.content}"`,
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "24px",
                        color: "#64748b",
                        fontWeight: "600",
                        fontStyle: "italic",
                      },
                      children: `For ${summary.playerFirstName}`,
                    },
                  },
                ],
              },
            },
            // Navy Blue Footer Bar
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "25px 50px",
                  background: "#2c3e50",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "22px",
                        color: "#ffffff",
                        fontWeight: "500",
                      },
                      children: coachName,
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "20px",
                        color: "#ffffff",
                        opacity: 0.8,
                      },
                      children: formattedDate,
                    },
                  },
                ],
              },
            },
          ],
        },
      } as any,
      {
        width: 1200,
        height: 700, // Increased from 630 to better accommodate logos
        // Use loaded fonts if available, otherwise satori will use system fonts
        fonts: fonts.length > 0 ? (fonts as any) : [],
      }
    );

    // Convert SVG to PNG using resvg (US-013)
    const resvg = new Resvg(svg);
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Store in Convex storage (US-013)
    // Convert Buffer to Uint8Array for Blob
    const pngArray = new Uint8Array(pngBuffer);
    const blob = new Blob([pngArray], { type: "image/png" });
    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);

    if (!url) {
      throw new Error("Failed to generate storage URL");
    }

    return url;
  },
});
