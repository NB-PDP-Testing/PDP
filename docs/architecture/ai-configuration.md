# AI Configuration Guide

This document describes all AI integrations in PlayerARC/PDP, their configuration options, and recommendations for future improvements.

## Overview

PlayerARC uses AI for several features across different user roles:

| Feature | User Role | Provider | Location | Purpose |
|---------|-----------|----------|----------|---------|
| Voice Note Transcription | Coach | OpenAI | Convex Backend | Convert audio to text |
| Voice Note Insights | Coach | OpenAI | Convex Backend | Extract player insights from notes |
| Sensitivity Classification | Coach | Anthropic | Convex Backend | Classify insight sensitivity for parent sharing |
| Parent Summary Generation | Coach/Parent | Anthropic | Convex Backend | Transform coach insights to parent-friendly summaries |
| Passport Comparison Insights | Coach | Anthropic | Next.js API Route | Analyze differences between local and shared assessments |
| Session Plan Generation | Coach | Anthropic | Next.js API Route | Generate training session plans |
| Coaching Recommendations | Coach | Anthropic | Next.js API Route | Provide prioritized coaching recommendations |

---

## Environment Variables

### Convex Backend (packages/backend)

Set these in **Convex Dashboard → Settings → Environment Variables**:

#### Required Keys
| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for voice note transcription and insights |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for parent summary generation |

#### Model Configuration (Optional)

**Voice Notes (OpenAI)**
| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_MODEL_TRANSCRIPTION` | `gpt-4o-mini-transcribe` | Model for audio → text transcription |
| `OPENAI_MODEL_INSIGHTS` | `gpt-4o` | Model for extracting insights from transcription |

**Parent Summaries (Anthropic)**
| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_MODEL_SENSITIVITY` | `claude-3-5-haiku-20241022` | Model for classifying insight sensitivity |
| `ANTHROPIC_MODEL_SUMMARY` | `claude-3-5-haiku-20241022` | Model for generating parent-friendly summaries |

### Next.js Frontend (apps/web)

Set these in **apps/web/.env.local** (local) or **Vercel Environment Variables** (production):

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for coach dashboard AI features |

> **Note:** The Next.js API routes currently use hardcoded model names. See "Future Improvements" below.

---

## AI Features by User Role

### Coach Features

#### 1. Voice Note Transcription & Insights
**Location:** `packages/backend/convex/actions/voiceNotes.ts`

- **Transcription:** Converts coach audio recordings to text
- **Insight Extraction:** Analyzes transcription to identify:
  - Player mentions and skill observations
  - Injury concerns
  - Behavioral notes
  - Performance metrics
  - Recommended actions

**Models Used:**
- Transcription: `OPENAI_MODEL_TRANSCRIPTION` (default: gpt-4o-mini-transcribe)
- Insights: `OPENAI_MODEL_INSIGHTS` (default: gpt-4o)

#### 2. Session Plan Generation
**Location:** `apps/web/src/app/api/session-plan/route.ts`

Generates 90-minute training session plans based on:
- Team strengths and weaknesses
- Age group
- Specific focus areas

**Model Used:** `claude-3-5-haiku-20241022` (hardcoded)

#### 3. Coaching Recommendations
**Location:** `apps/web/src/app/api/recommendations/route.ts`

Provides 3 prioritized coaching recommendations based on:
- Team skill gaps
- Attendance issues
- Development opportunities

**Model Used:** `claude-3-5-haiku-20241022` (hardcoded)

#### 4. Passport Comparison Insights
**Location:** `apps/web/src/app/api/comparison-insights/route.ts`

Analyzes differences between local assessments and shared passport data:
- Identifies skill divergences
- Highlights blind spots
- Suggests investigation areas

**Model Used:** `claude-3-5-haiku-20241022` (hardcoded)

### Parent Features

#### Parent-Friendly Summaries (Phase 1)
**Location:** `packages/backend/convex/actions/coachParentSummaries.ts`

Transforms coach insights into positive, encouraging messages for parents:
- Sensitivity classification (normal/injury/behavior)
- Language transformation (negative → growth-oriented)
- Coach approval workflow before parent visibility

**Models Used:**
- Sensitivity: `ANTHROPIC_MODEL_SENSITIVITY` (default: claude-3-5-haiku-20241022)
- Summary: `ANTHROPIC_MODEL_SUMMARY` (default: claude-3-5-haiku-20241022)

---

## Cost Optimization

### Model Selection Guidelines

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| Simple classification | `claude-3-5-haiku` | Fast, cheap, accurate for structured tasks |
| Text transformation | `claude-3-5-haiku` | Good quality at low cost |
| Complex analysis | `claude-sonnet-4` | Better reasoning for nuanced insights |
| Audio transcription | `gpt-4o-mini-transcribe` | Optimized for audio |
| Insight extraction | `gpt-4o` | Best quality for understanding context |

### Estimated Costs (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| claude-3-5-haiku | $0.25 | $1.25 |
| claude-sonnet-4 | $3.00 | $15.00 |
| gpt-4o | $2.50 | $10.00 |
| gpt-4o-mini | $0.15 | $0.60 |

---

## Architecture Decision: Feature Flags vs Model Config

We use a **separation of concerns** approach:

| Concern | Tool | Purpose |
|---------|------|---------|
| **Feature on/off** | PostHog Feature Flags | Control rollout, A/B test features |
| **Model configuration** | Database (Convex) | Which model, parameters, per-org overrides |

### Flow Diagram

```
User triggers AI feature
        ↓
PostHog: Is feature enabled? ──→ No → Hide/disable feature
        ↓ Yes
Convex: Read aiModelConfig ──→ Get model, maxTokens, temperature
        ↓
Call AI provider with configured settings
```

### Why This Separation?

- **PostHog** is great for: rollout %, A/B testing, user targeting
- **PostHog** is NOT for: complex config (maxTokens, temperature, prompts)
- **Database** gives: instant updates, per-org config, audit trail, no external latency

---

## Roadmap: AI Infrastructure Evolution

### Phase 1: Current State (Environment Variables) ✅
- Model names in env vars
- Simple, works, no UI needed
- Good for: small team, few changes

### Phase 2: Database-Backed Config (Planned)
- `aiModelConfig` table in Convex
- Platform Staff UI to manage settings
- Per-org overrides (premium orgs get better models)
- Audit trail of changes

**Schema:**
```typescript
// packages/backend/convex/schema.ts
aiModelConfig: defineTable({
  feature: v.string(),        // "voice_insights", "parent_summary", etc.
  scope: v.string(),          // "platform" or "organization"
  organizationId: v.optional(v.string()),

  provider: v.string(),       // "openai", "anthropic", "openrouter"
  modelId: v.string(),        // "gpt-4o", "claude-3-5-haiku-20241022"
  maxTokens: v.optional(v.number()),
  temperature: v.optional(v.number()),

  isActive: v.boolean(),
  updatedBy: v.string(),
  updatedAt: v.number(),
  notes: v.optional(v.string()),
})
```

### Phase 3: OpenRouter Migration (Future)

[OpenRouter](https://openrouter.ai/) is a unified API gateway that routes to multiple AI providers.

#### Why OpenRouter?

| Benefit | Description |
|---------|-------------|
| **Single API** | One endpoint for OpenAI, Anthropic, Google, Meta, Mistral, etc. |
| **Automatic fallback** | If Claude is down, automatically route to GPT-4 |
| **Cost optimization** | Route to cheapest provider that meets quality threshold |
| **No vendor lock-in** | Switch models without code changes |
| **Open source access** | Use Llama, Mistral, etc. at lower cost |
| **Built-in analytics** | Usage tracking across all providers |

#### Migration Path

**Step 1: Create abstraction layer**
```typescript
// packages/backend/convex/lib/ai-client.ts

export async function callAI(options: {
  feature: string;
  prompt: string;
  organizationId?: string;
}) {
  // 1. Read config from database
  const config = await getAIConfig(options.feature, options.organizationId);

  // 2. Route to appropriate provider
  if (config.provider === "openrouter") {
    return callOpenRouter(config, options.prompt);
  } else if (config.provider === "anthropic") {
    return callAnthropic(config, options.prompt);
  } else {
    return callOpenAI(config, options.prompt);
  }
}
```

**Step 2: OpenRouter client**
```typescript
// packages/backend/convex/lib/openrouter.ts

import OpenAI from "openai";

export function getOpenRouterClient() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": "https://playerarc.com",
      "X-Title": "PlayerARC",
    },
  });
}

// OpenRouter uses OpenAI-compatible API, so same SDK works!
export async function callOpenRouter(config: AIConfig, prompt: string) {
  const client = getOpenRouterClient();

  return client.chat.completions.create({
    model: config.modelId,  // e.g., "anthropic/claude-3.5-haiku"
    messages: [{ role: "user", content: prompt }],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  });
}
```

**Step 3: Model naming with OpenRouter**

OpenRouter uses provider-prefixed model names:

| Current (Direct) | OpenRouter Equivalent |
|------------------|----------------------|
| `claude-3-5-haiku-20241022` | `anthropic/claude-3.5-haiku` |
| `claude-sonnet-4-20250514` | `anthropic/claude-sonnet-4` |
| `gpt-4o` | `openai/gpt-4o` |
| `gpt-4o-mini` | `openai/gpt-4o-mini` |
| N/A | `meta-llama/llama-3.1-70b-instruct` |
| N/A | `mistralai/mistral-large` |

**Step 4: Gradual migration**

1. Add `OPENROUTER_API_KEY` to environment
2. Update `aiModelConfig` to support `provider: "openrouter"`
3. Migrate one feature at a time (start with non-critical)
4. Monitor cost/quality
5. Eventually deprecate direct API keys

#### Environment Variables After Migration

```bash
# Convex Dashboard
OPENROUTER_API_KEY=sk-or-...

# Keep these as fallback during migration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

#### Cost Comparison

| Model | Direct API | OpenRouter | Savings |
|-------|------------|------------|---------|
| claude-3-5-haiku | $0.25/$1.25 | $0.25/$1.25 | 0% |
| gpt-4o | $2.50/$10.00 | $2.50/$10.00 | 0% |
| llama-3.1-70b | N/A | $0.40/$0.40 | New option |

OpenRouter doesn't add markup - same prices as direct. Value is in:
- Fallback routing
- Single integration
- Access to more models

---

## Future Improvements

### 1. Database-Backed Model Config (Priority: High)

Create `aiModelConfig` table and Platform Staff UI:
- View all AI features and current models
- Edit model, maxTokens, temperature per feature
- Set per-organization overrides
- View change audit log

**Location:** `/platform/ai-config`

### 2. Make Next.js Routes Configurable (Priority: Medium)

Update the API routes to read from database instead of hardcoded:

| Route | Feature Key |
|-------|-------------|
| `/api/session-plan` | `session_plan` |
| `/api/recommendations` | `recommendations` |
| `/api/comparison-insights` | `comparison_insights` |

### 3. PostHog Feature Flags for AI (Priority: Medium)

Add feature flags to control AI feature availability:

| Flag | Purpose |
|------|---------|
| `ai_voice_notes_enabled` | Enable/disable voice note AI |
| `ai_parent_summaries_enabled` | Enable/disable parent summaries |
| `ai_session_plans_enabled` | Enable/disable session plan generation |
| `ai_recommendations_enabled` | Enable/disable coaching recommendations |

### 4. OpenRouter Migration (Priority: Low - Future)

- Create abstraction layer
- Add OpenRouter as provider option
- Migrate features one by one
- Deprecate direct API integrations

### 5. Usage Tracking & Budgets (Priority: Low)

- Track AI usage per organization
- Set monthly token/cost budgets
- Alert when approaching limits
- Dashboard for Platform Staff

---

## Files Reference

### Convex Backend
- `packages/backend/convex/actions/voiceNotes.ts` - Voice transcription & insights
- `packages/backend/convex/actions/coachParentSummaries.ts` - Parent summary generation

### Next.js API Routes
- `apps/web/src/app/api/session-plan/route.ts` - Training session generation
- `apps/web/src/app/api/recommendations/route.ts` - Coaching recommendations
- `apps/web/src/app/api/comparison-insights/route.ts` - Passport comparison analysis

---

## Quick Reference: All Environment Variables

### Convex Dashboard
```
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional - Model overrides
OPENAI_MODEL_TRANSCRIPTION=gpt-4o-mini-transcribe
OPENAI_MODEL_INSIGHTS=gpt-4o
ANTHROPIC_MODEL_SENSITIVITY=claude-3-5-haiku-20241022
ANTHROPIC_MODEL_SUMMARY=claude-3-5-haiku-20241022
```

### Vercel / .env.local
```
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Future - when routes are updated
ANTHROPIC_MODEL_SESSION_PLAN=claude-3-5-haiku-20241022
ANTHROPIC_MODEL_RECOMMENDATIONS=claude-3-5-haiku-20241022
ANTHROPIC_MODEL_COMPARISON=claude-3-5-haiku-20241022
```
