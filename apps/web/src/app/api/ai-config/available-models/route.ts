import { NextResponse } from "next/server";

/**
 * GET /api/ai-config/available-models
 *
 * Fetches available models from Anthropic and OpenAI (primary sources).
 * Enriches with metadata (context window, pricing, description) from
 * OpenRouter's free public API (no key required) as a supplementary source.
 *
 * ID mismatch handling: Anthropic's API returns versioned IDs like
 * "claude-3-5-haiku-20241022" while OpenRouter uses "claude-3-5-haiku".
 * We store enrichment under both forms so lookups match either way.
 */

type OpenRouterModel = {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string };
  supported_parameters?: string[];
};

export type ModelEntry = {
  id: string;
  provider: "anthropic" | "openai";
  displayName: string;
  createdAt?: number;
  // Enriched from OpenRouter (supplementary)
  description?: string;
  contextLength?: number;
  pricingPromptPer1k?: string;
  pricingCompletionPer1k?: string;
  /** Cost per 1 million input tokens (industry-standard display unit) */
  pricingInputPer1M?: string;
  /** Cost per 1 million output tokens */
  pricingOutputPer1M?: string;
  modality?: string;
  /** Capability tags derived from modality + model name: "vision" | "audio" | "reasoning" | "tools" */
  capabilities?: string[];
};

type Enrichment = Omit<
  ModelEntry,
  "id" | "provider" | "displayName" | "createdAt"
>;

const DATE_SUFFIX_RE = /-\d{8}$/;

/** Strip trailing 8-digit date suffix e.g. "claude-3-5-haiku-20241022" → "claude-3-5-haiku" */
function stripDateSuffix(id: string): string {
  return id.replace(DATE_SUFFIX_RE, "");
}

/**
 * Normalise version separators: OpenRouter uses dots ("claude-sonnet-4.6")
 * while Anthropic's API uses hyphens ("claude-sonnet-4-6").
 * Convert dots-between-digits to hyphens so lookups match either form.
 */
function normaliseSeparators(id: string): string {
  // Replace a digit.digit pattern with digit-digit (version dots → hyphens)
  return id.replace(/(\d)\.(\d)/g, "$1-$2");
}

export async function GET() {
  const results: ModelEntry[] = [];
  const errors: Record<string, string> = {};

  // ── 1. Fetch OpenRouter enrichment (free, no key needed) ────────────────
  const enrichmentMap = new Map<string, Enrichment>();

  try {
    const orRes = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (orRes.ok) {
      const orData = (await orRes.json()) as { data?: OpenRouterModel[] };
      for (const m of orData.data ?? []) {
        // OpenRouter IDs are "provider/model-id" — strip the provider prefix
        const bareId = m.id.includes("/")
          ? m.id.split("/").slice(1).join("/")
          : m.id;

        const promptPer1k = m.pricing?.prompt
          ? (Number(m.pricing.prompt) * 1000).toFixed(4)
          : undefined;
        const completionPer1k = m.pricing?.completion
          ? (Number(m.pricing.completion) * 1000).toFixed(4)
          : undefined;

        // Per-1M pricing (industry-standard display unit)
        const promptPer1M = m.pricing?.prompt
          ? (Number(m.pricing.prompt) * 1_000_000).toFixed(2)
          : undefined;
        const completionPer1M = m.pricing?.completion
          ? (Number(m.pricing.completion) * 1_000_000).toFixed(2)
          : undefined;

        // Capability tags from modality + model name
        const capabilities: string[] = [];
        const modality = (m.architecture?.modality ?? "").toLowerCase();
        const lowerBareId = bareId.toLowerCase();
        // Vision: input includes images
        if (
          modality.includes("image") &&
          (modality.startsWith("text+image") || modality.startsWith("image"))
        ) {
          capabilities.push("vision");
        }
        // Audio: input or output includes audio
        if (modality.includes("audio")) {
          capabilities.push("audio");
        }
        // Reasoning / extended thinking models
        if (
          lowerBareId.startsWith("o1") ||
          lowerBareId.startsWith("o3") ||
          lowerBareId.includes("thinking") ||
          lowerBareId.includes("reasoning")
        ) {
          capabilities.push("reasoning");
        }
        // Function / tool calling — most chat-capable models support it
        if (
          m.supported_parameters?.includes("tools") ||
          lowerBareId.includes("gpt-4") ||
          lowerBareId.includes("claude")
        ) {
          capabilities.push("tools");
        }

        const enrichment: Enrichment = {
          description: m.description,
          contextLength: m.context_length,
          pricingPromptPer1k: promptPer1k,
          pricingCompletionPer1k: completionPer1k,
          pricingInputPer1M: promptPer1M,
          pricingOutputPer1M: completionPer1M,
          modality: m.architecture?.modality,
          capabilities: capabilities.length > 0 ? capabilities : undefined,
        };

        // Store under multiple key variants so lookups succeed regardless of
        // whether the provider returns versioned/unversioned or dot/hyphen forms:
        //   OpenRouter:   "claude-sonnet-4.6"   (dots)
        //   Anthropic:    "claude-sonnet-4-6"    (hyphens, no date)
        //   Anthropic:    "claude-opus-4-5-20251101" (hyphens + date)
        const variants = new Set([
          bareId,
          normaliseSeparators(bareId),
          stripDateSuffix(bareId),
          normaliseSeparators(stripDateSuffix(bareId)),
        ]);
        for (const key of variants) {
          enrichmentMap.set(key, enrichment);
        }
      }
    }
  } catch {
    // Enrichment is best-effort — don't fail the whole request
  }

  function getEnrichment(modelId: string): Enrichment {
    // Try progressively looser matches
    return (
      enrichmentMap.get(modelId) ??
      enrichmentMap.get(normaliseSeparators(modelId)) ??
      enrichmentMap.get(stripDateSuffix(modelId)) ??
      enrichmentMap.get(normaliseSeparators(stripDateSuffix(modelId))) ??
      {}
    );
  }

  // ── 2. Anthropic (primary) ───────────────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          data?: Array<{
            id: string;
            display_name?: string;
            created_at?: string;
          }>;
        };

        for (const m of data.data ?? []) {
          results.push({
            id: m.id,
            provider: "anthropic",
            displayName: m.display_name ?? m.id,
            createdAt: m.created_at
              ? new Date(m.created_at).getTime()
              : undefined,
            ...getEnrichment(m.id),
          });
        }
      } else {
        const errBody = await res.text();
        errors.anthropic = `${res.status}: ${errBody}`;
      }
    } catch (e) {
      errors.anthropic = e instanceof Error ? e.message : "Unknown error";
    }
  } else {
    errors.anthropic = "ANTHROPIC_API_KEY not configured";
  }

  // ── 3. OpenAI (primary) ──────────────────────────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          data?: Array<{ id: string; created?: number; owned_by?: string }>;
        };

        // Filter to chat-capable / audio models only
        const relevantModels = (data.data ?? []).filter((m) => {
          const id = m.id.toLowerCase();
          return (
            id.startsWith("gpt-") ||
            id.startsWith("o1") ||
            id.startsWith("o3") ||
            id.startsWith("chatgpt-") ||
            id.includes("transcribe") ||
            id.includes("whisper")
          );
        });

        for (const m of relevantModels) {
          results.push({
            id: m.id,
            provider: "openai",
            displayName: m.id,
            createdAt: m.created ? m.created * 1000 : undefined,
            ...getEnrichment(m.id),
          });
        }
      } else {
        const errBody = await res.text();
        errors.openai = `${res.status}: ${errBody}`;
      }
    } catch (e) {
      errors.openai = e instanceof Error ? e.message : "Unknown error";
    }
  } else {
    errors.openai = "OPENAI_API_KEY not configured";
  }

  // Sort: anthropic first, newest first within each provider
  results.sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider === "anthropic" ? -1 : 1;
    }
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });

  return NextResponse.json({ models: results, errors });
}
