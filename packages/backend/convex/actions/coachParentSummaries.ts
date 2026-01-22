"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { action, internalAction } from "../_generated/server";

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
  }),
  handler: async (ctx, args) => {
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
    organizationId: v.optional(v.string()),
  },
  returns: v.object({
    summary: v.string(),
    confidenceScore: v.number(),
    flags: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const client = getAnthropicClient();

    // Get model config from database with fallback
    const config = await getAIConfig(
      ctx,
      "parent_summary",
      args.organizationId
    );

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
    coachId: v.optional(v.string()), // Added to check skip settings
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
          console.log(
            `⏭️ SKIPPING: Sensitive insight (${classification.category}) - coach has disabled sensitive parent summaries`
          );
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
          sensitivityReason: classification.reason,
          sensitivityConfidence: classification.confidence,
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
    await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"));

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

    // Generate SVG using satori (US-012)
    // Satori supports flexbox layout, inline styles only
    // Type assertion needed as satori has its own JSX-like type system
    // Updated design to match PlayerARC branding:
    // - Cream/off-white background with subtle gradient
    // - Green and navy accents
    // - Professional yet warm aesthetic
    // - Clean, modern layout
    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            // PlayerARC brand colors: cream base with subtle gradient
            background: "linear-gradient(135deg, #FAF9F6 0%, #F5F4F0 100%)",
            padding: "60px",
            fontFamily: "Inter, sans-serif",
          },
          children: [
            // Header: PlayerARC branding
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  marginBottom: "50px",
                  paddingBottom: "30px",
                  borderBottom: "3px solid #2C5F2D", // PlayerARC green accent
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "52px",
                        fontWeight: "bold",
                        color: "#1e3a8a", // Navy - PlayerARC brand color
                        display: "flex",
                        alignItems: "center",
                      },
                      children: "PlayerARC",
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "24px",
                        color: "#2C5F2D", // Green accent
                        fontWeight: "600",
                        textAlign: "right",
                      },
                      children: summary.orgName,
                    },
                  },
                ],
              },
            },
            // Main content: Message
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  maxWidth: "900px",
                  flex: "1",
                  padding: "40px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(44, 95, 45, 0.05)", // Subtle green tint
                  border: "2px solid #2C5F2D",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "40px",
                        color: "#1e293b", // Dark text for readability
                        marginBottom: "30px",
                        lineHeight: "1.5",
                        fontWeight: "500",
                      },
                      children: `"${summary.content}"`,
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "32px",
                        color: "#2C5F2D", // Green accent
                        fontWeight: "600",
                        fontStyle: "italic",
                      },
                      children: `— for ${summary.playerFirstName}`,
                    },
                  },
                ],
              },
            },
            // Footer: Coach attribution and date
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  marginTop: "50px",
                  paddingTop: "30px",
                  borderTop: "2px solid #cbd5e1", // Subtle divider
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "26px",
                        color: "#475569", // Muted text
                        fontWeight: "500",
                      },
                      children: `Coach ${summary.coachFirstName}`,
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "22px",
                        color: "#64748b", // Lighter muted text
                      },
                      children: formattedDate,
                    },
                  },
                ],
              },
            },
          ],
        },
        // biome-ignore lint/suspicious/noExplicitAny: satori JSX-like type system
      } as any,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: await fetch(
              "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
            ).then((res) => res.arrayBuffer()),
            weight: 400,
            style: "normal",
          },
          {
            name: "Inter",
            data: await fetch(
              "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI2fAZ9hjp-Ek-_EeA.woff"
            ).then((res) => res.arrayBuffer()),
            weight: 500,
            style: "normal",
          },
          {
            name: "Inter",
            data: await fetch(
              "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff"
            ).then((res) => res.arrayBuffer()),
            weight: 600,
            style: "normal",
          },
          {
            name: "Inter",
            data: await fetch(
              "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff"
            ).then((res) => res.arrayBuffer()),
            weight: 700,
            style: "normal",
          },
        ],
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
