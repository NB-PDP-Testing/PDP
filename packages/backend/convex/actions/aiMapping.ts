"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { action } from "../_generated/server";

// TypeScript types for AI mapping
export type AIMappingRequest = {
  prompt: string;
};

export type AIMappingResponse = {
  targetField: string | null;
  confidence: number;
  reasoning: string;
};

// Regex for extracting JSON from markdown code blocks
const JSON_BLOCK_REGEX = /```json\s*([\s\S]*?)\s*```/;

/**
 * Parse Claude API response text into AIMappingResponse
 */
function parseClaudeResponse(responseText: string): AIMappingResponse {
  let parsed: AIMappingResponse;

  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(JSON_BLOCK_REGEX);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      throw new Error(
        `Failed to parse Claude response as JSON: ${responseText}`
      );
    }
  }

  return parsed;
}

/**
 * Validate AI mapping response structure
 */
function validateResponse(parsed: AIMappingResponse): void {
  if (
    typeof parsed.confidence !== "number" ||
    parsed.confidence < 0 ||
    parsed.confidence > 100
  ) {
    throw new Error(
      `Invalid confidence score: ${parsed.confidence}. Must be 0-100.`
    );
  }

  if (typeof parsed.reasoning !== "string") {
    throw new Error("Response must include reasoning string");
  }

  // targetField can be null (if no match) or string
  if (parsed.targetField !== null && typeof parsed.targetField !== "string") {
    throw new Error("targetField must be string or null");
  }
}

/**
 * Handle Anthropic API errors and determine if retry is needed
 */
async function handleAPIError(
  error: unknown,
  attempt: number,
  maxRetries: number
): Promise<boolean> {
  if (!(error instanceof Anthropic.APIError)) {
    return false;
  }

  // 401: Invalid API key - don't retry
  if (error.status === 401) {
    throw new Error(
      "Invalid Anthropic API key. Check ANTHROPIC_API_KEY environment variable."
    );
  }

  // 429: Rate limit - use exponential backoff
  if (error.status === 429 && attempt < maxRetries) {
    const delayMs = 2 ** attempt * 1000; // 2s, 4s, 8s
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return true; // Should retry
  }

  // 500: Server error - retry with backoff
  if (error.status && error.status >= 500 && attempt < maxRetries) {
    const delayMs = 2 ** attempt * 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return true; // Should retry
  }

  return false; // Don't retry
}

/**
 * Core Claude API call logic — shared by callClaudeAPI and suggestColumnMapping.
 * Extracted as a plain async function to avoid circular Convex action references.
 */
async function callClaudeAPIInternal(
  prompt: string
): Promise<AIMappingResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not configured in Convex environment variables"
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude API");
      }

      const parsed = parseClaudeResponse(content.text);
      validateResponse(parsed);

      return {
        targetField: parsed.targetField,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      lastError = error as Error;
      const shouldRetry = await handleAPIError(error, attempt, maxRetries);
      if (shouldRetry) {
        continue;
      }
      if (attempt === maxRetries) {
        throw new Error(
          `Claude API call failed after ${maxRetries} attempts: ${lastError.message}`
        );
      }
    }
  }

  throw new Error(
    `Claude API call failed: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * Call Claude API with a prompt and parse the response
 * Exposed as a public action for external callers.
 */
export const callClaudeAPI = action({
  args: {
    prompt: v.string(),
  },
  returns: v.object({
    targetField: v.union(v.string(), v.null()),
    confidence: v.number(),
    reasoning: v.string(),
  }),
  handler: async (_ctx, args): Promise<AIMappingResponse> =>
    callClaudeAPIInternal(args.prompt),
});

/**
 * Suggest a column mapping using AI with caching
 * Checks cache first, calls Claude API if needed, then stores result
 */
export const suggestColumnMapping = action({
  args: {
    columnName: v.string(),
    sampleValues: v.array(v.string()), // 3-5 sample values
  },
  returns: v.object({
    targetField: v.union(v.string(), v.null()),
    confidence: v.number(),
    reasoning: v.string(),
    cached: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Import helper functions
    const { buildMappingPrompt, normalizeColumnName, getAvailableFields } =
      await import("../lib/import/aiMapper");

    // Normalize column name for cache lookup
    const columnPattern = normalizeColumnName(args.columnName);

    // Check cache for existing mapping
    const { api: apiForCache } = await import("../_generated/api");
    const cached = await ctx.runQuery(
      apiForCache.models.aiMappingCache.getCachedMapping,
      {
        columnPattern,
        sampleValues: args.sampleValues.slice(0, 3),
      }
    );

    // If cached and not expired, return cached result
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`Cache HIT for column: ${args.columnName}`);
      return {
        targetField: cached.suggestedField,
        confidence: cached.confidence,
        reasoning: cached.reasoning,
        cached: true,
      };
    }

    console.log(`Cache MISS for column: ${args.columnName}`);

    // Not cached or expired - call Claude API
    const availableFields = getAvailableFields();
    const prompt = buildMappingPrompt(
      args.columnName,
      args.sampleValues,
      availableFields
    );

    // Call Claude API
    const { api } = await import("../_generated/api");
    const response = await ctx.runAction(api.actions.aiMapping.callClaudeAPI, {
      prompt,
    });

    // Validate targetField is in allowed fields list
    if (
      response.targetField !== null &&
      !availableFields.includes(response.targetField)
    ) {
      console.warn(
        `AI suggested invalid field: ${response.targetField}. Treating as null.`
      );
      response.targetField = null;
      response.confidence = 0;
      response.reasoning = `Invalid field suggested: ${response.targetField}`;
    }

    // Store in cache (30 days = 2592000000 ms)
    const now = Date.now();
    const expiresAt = now + 2_592_000_000;

    const { api: apiForStore } = await import("../_generated/api");
    await ctx.runMutation(
      apiForStore.models.aiMappingCache.storeCachedMapping,
      {
        columnPattern,
        sampleValues: args.sampleValues.slice(0, 3),
        suggestedField: response.targetField || "", // Store empty string if null
        confidence: response.confidence,
        reasoning: response.reasoning,
        createdAt: now,
        expiresAt,
      }
    );

    return {
      targetField: response.targetField,
      confidence: response.confidence,
      reasoning: response.reasoning,
      cached: false,
    };
  },
});

/**
 * Batch process: suggest mappings for all columns in a CSV
 * Calls suggestColumnMapping for each column in parallel with rate limiting
 */
export const suggestAllMappings = action({
  args: {
    columns: v.array(
      v.object({
        name: v.string(),
        sampleValues: v.array(v.string()),
      })
    ),
  },
  returns: v.object({
    mappings: v.record(
      v.string(),
      v.object({
        targetField: v.union(v.string(), v.null()),
        confidence: v.number(),
        reasoning: v.string(),
        cached: v.boolean(),
      })
    ),
    cacheHitRate: v.number(), // Percentage of cached results (0-100)
  }),
  handler: async (ctx, args) => {
    // Rate limiting: process max 10 columns concurrently
    const MAX_CONCURRENT = 10;
    const results: Record<
      string,
      {
        targetField: string | null;
        confidence: number;
        reasoning: string;
        cached: boolean;
      }
    > = {};

    let cacheHits = 0;
    let totalProcessed = 0;

    // Process columns in batches to avoid overwhelming Claude API
    for (let i = 0; i < args.columns.length; i += MAX_CONCURRENT) {
      const batch = args.columns.slice(i, i + MAX_CONCURRENT);

      // Call suggestColumnMapping for each column in parallel
      const batchResults = await Promise.all(
        batch.map(async (column) => {
          const { api } = await import("../_generated/api");
          const result = await ctx.runAction(
            api.actions.aiMapping.suggestColumnMapping,
            {
              columnName: column.name,
              sampleValues: column.sampleValues,
            }
          );

          return {
            columnName: column.name,
            result,
          };
        })
      );

      // Collect results and track cache hits
      for (const { columnName, result } of batchResults) {
        results[columnName] = result;
        if (result.cached) {
          cacheHits += 1;
        }
        totalProcessed += 1;
      }

      // If there's another batch, add small delay to avoid rate limiting
      if (i + MAX_CONCURRENT < args.columns.length) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay between batches
      }
    }

    // Calculate cache hit rate
    const cacheHitRate =
      totalProcessed > 0 ? (cacheHits / totalProcessed) * 100 : 0;

    // Sort results by confidence (HIGH → MEDIUM → LOW)
    const sortedMappings: Record<
      string,
      {
        targetField: string | null;
        confidence: number;
        reasoning: string;
        cached: boolean;
      }
    > = {};

    const sortedColumns = Object.entries(results).sort(
      ([_a, resultA], [_b, resultB]) => resultB.confidence - resultA.confidence
    );

    for (const [columnName, result] of sortedColumns) {
      sortedMappings[columnName] = result;
    }

    console.log(
      `Batch mapping complete: ${totalProcessed} columns, ${cacheHits} cached (${cacheHitRate.toFixed(1)}%)`
    );

    return {
      mappings: sortedMappings,
      cacheHitRate,
    };
  },
});
