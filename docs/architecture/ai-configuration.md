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

## Future Improvements

### 1. OpenRouter Integration

Consider using [OpenRouter](https://openrouter.ai/) as a unified gateway:

**Benefits:**
- Single API key for multiple providers
- Automatic fallback if one provider fails
- Cost optimization with model routing
- Usage analytics across all providers
- Access to open-source models (Llama, Mistral)

**Implementation:**
```typescript
// Example OpenRouter configuration
const OPENROUTER_CONFIG = {
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultModel: "anthropic/claude-3.5-haiku",
  fallbackModel: "openai/gpt-4o-mini",
};
```

### 2. Centralized AI Configuration

Create a shared AI configuration module:

```
packages/backend/convex/lib/ai-config.ts
```

This would:
- Centralize all model configurations
- Provide consistent error handling
- Enable feature flags for A/B testing models
- Track usage/costs per feature

### 3. Make Next.js Routes Configurable

Update the API routes to support environment variables:

| Route | New Variable | Default |
|-------|--------------|---------|
| `/api/session-plan` | `ANTHROPIC_MODEL_SESSION_PLAN` | `claude-3-5-haiku-20241022` |
| `/api/recommendations` | `ANTHROPIC_MODEL_RECOMMENDATIONS` | `claude-3-5-haiku-20241022` |
| `/api/comparison-insights` | `ANTHROPIC_MODEL_COMPARISON` | `claude-3-5-haiku-20241022` |

### 4. Usage Tracking & Budgets

Implement:
- Per-org AI usage tracking
- Monthly budget limits
- Usage dashboards for platform staff
- Cost allocation by feature

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
