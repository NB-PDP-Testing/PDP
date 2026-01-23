# WhatsApp & AI Configuration - Complete Integration Summary
**Date:** 2026-01-23
**Author:** Claude Sonnet 4.5

## Overview

This document summarizes the complete integration of WhatsApp voice notes and AI model configuration in the PlayerARC platform.

---

## Architecture: Feature Flags vs Model Configuration

We use a **separation of concerns** approach:

| Concern | Tool | Purpose | Location |
|---------|------|---------|----------|
| **Feature on/off** | PostHog Feature Flags | Control rollout, A/B test features | PostHog dashboard |
| **Model configuration** | Database (Convex) | Which model, parameters, per-org overrides | `/platform/ai-config` |

### Why This Separation?

- **PostHog** is great for: rollout %, A/B testing, user targeting
- **PostHog** is NOT for: complex config (maxTokens, temperature, prompts)
- **Database** gives: instant updates, per-org config, audit trail, no external latency

---

## WhatsApp Voice Notes Integration

### Feature Flag: `voice_notes_whatsapp`

**Type:** Boolean
**Default:** `false` (disabled)
**Location:** PostHog feature flags

**When Enabled:**
- Coaches can send voice notes via WhatsApp
- Twilio webhook processes incoming WhatsApp messages
- Audio and text messages are transcribed and analyzed
- Results are sent back to coaches via WhatsApp

**Use Cases:**
- **A/B Testing:** Test WhatsApp vs app-only voice notes to measure engagement
- **Gradual Rollout:** Enable for 10% → 25% → 50% → 100% of users
- **Organization-Specific:** Enable for specific clubs first (beta testing)
- **Geographic Testing:** Enable for specific regions/countries first

### WhatsApp Analytics Events

All events are automatically tracked:

| Event | Description | Properties |
|-------|-------------|------------|
| `voice_notes_whatsapp_sent` | Coach initiated WhatsApp voice note | `method`, `has_audio`, `message_length` |
| `voice_notes_whatsapp_received` | Platform received WhatsApp message | `message_type`, `from_number`, `media_count` |
| `voice_notes_whatsapp_processed` | Successfully processed WhatsApp note | `processing_time_ms`, `insights_count`, `auto_applied` |
| `voice_notes_whatsapp_failed` | WhatsApp processing failed | `error_type`, `error_message`, `retry_count` |

---

## AI Model Configuration (Already Implemented)

### Platform Admin UI

**Location:** `/platform/ai-config`
**Access:** Platform Staff only (requires `isPlatformStaff = true`)

### Features

The platform has a comprehensive AI configuration system:

1. **View All AI Features:** See all 7 AI features with current models
2. **Edit Configuration:** Change provider, model, maxTokens, temperature per feature
3. **Per-Organization Overrides:** Premium orgs can use better models
4. **Audit Trail:** View complete change history
5. **Seed Defaults:** One-click setup of default configurations

### AI Features Configured

| Feature | Default Model | Provider | Purpose |
|---------|--------------|----------|---------|
| `voice_transcription` | whisper-1 | OpenAI | Convert audio to text |
| `voice_insights` | gpt-4o | OpenAI | Extract player insights from notes |
| `sensitivity_classification` | claude-3-5-haiku-20241022 | Anthropic | Classify insight sensitivity |
| `parent_summary` | claude-3-5-haiku-20241022 | Anthropic | Generate parent-friendly summaries |
| `session_plan` | claude-3-5-haiku-20241022 | Anthropic | Generate training session plans |
| `recommendations` | claude-3-5-haiku-20241022 | Anthropic | Provide coaching recommendations |
| `comparison_insights` | claude-3-5-haiku-20241022 | Anthropic | Analyze passport comparison data |

### How Voice Notes Use AI Config

**Backend:** `packages/backend/convex/actions/voiceNotes.ts`

The voice notes action reads from the database:

```typescript
async function getAIConfig(
  ctx: ActionCtx,
  feature: "voice_transcription" | "voice_insights",
  organizationId?: string
): Promise<{ modelId: string; maxTokens?: number; temperature?: number; }> {
  // 1. Try database first (per-org override or platform default)
  const dbConfig = await ctx.runQuery(
    internal.models.aiModelConfig.getConfigForFeatureInternal,
    { feature, organizationId }
  );
  if (dbConfig) {
    return {
      modelId: dbConfig.modelId,
      maxTokens: dbConfig.maxTokens,
      temperature: dbConfig.temperature
    };
  }

  // 2. Fallback to environment variables
  if (feature === "voice_transcription") {
    return {
      modelId: process.env.OPENAI_MODEL_TRANSCRIPTION || "whisper-1"
    };
  }
  return {
    modelId: process.env.OPENAI_MODEL_INSIGHTS || "gpt-4o"
  };
}
```

**Key Points:**
- Database-backed configuration with fallback to environment variables
- Per-organization overrides supported (premium orgs can use different models)
- **WhatsApp voice notes use the SAME AI configuration as app voice notes**
- Any model changes in the platform admin UI apply to both app and WhatsApp notes

---

## Complete Flow Diagram

```
User Action: Coach sends voice note via WhatsApp
        ↓
PostHog: Is voice_notes_whatsapp enabled? ──→ No → Ignore message
        ↓ Yes
Twilio: Forward to webhook
        ↓
Backend: Process WhatsApp message
        ↓
Database: Read aiModelConfig for voice_transcription ──→ Get modelId, provider, parameters
        ↓
OpenAI: Transcribe audio using configured model
        ↓
Database: Read aiModelConfig for voice_insights ──→ Get modelId, provider, parameters
        ↓
OpenAI: Extract insights using configured model
        ↓
Convex: Save insights to database
        ↓
Twilio: Send results back via WhatsApp
        ↓
PostHog: Track event (whatsapp_voice_note_processed)
```

---

## Configuration Hierarchy

When voice notes need AI config, the system checks in this order:

1. **Organization Override** - If organization has custom config for this feature
2. **Platform Default** - Platform-wide default from database
3. **Environment Variable** - `OPENAI_MODEL_TRANSCRIPTION` or `OPENAI_MODEL_INSIGHTS`
4. **Hardcoded Default** - `"whisper-1"` or `"gpt-4o"`

Example scenarios:

| Organization | voice_transcription Config | Model Used |
|--------------|---------------------------|------------|
| Free Tier Org | None (uses platform default) | `whisper-1` (platform default) |
| Premium Org | Override to `whisper-large` | `whisper-large` (org override) |
| Beta Test Org | Override to `gpt-4o-mini-transcribe` | `gpt-4o-mini-transcribe` (org override) |

---

## Platform Staff Workflow

### 1. Configure Platform Defaults

1. Navigate to `/platform/ai-config`
2. View all 7 AI features
3. Click "Edit" on any feature
4. Select provider (OpenAI, Anthropic, OpenRouter)
5. Select model from dropdown
6. Set maxTokens and temperature (optional)
7. Toggle "Active" switch
8. Add notes explaining the change
9. Click "Save Changes"

### 2. Set Organization-Specific Override

1. Navigate to `/platform/ai-config`
2. (Future enhancement) Filter by organization
3. Configure model specifically for that organization
4. Premium orgs can use more expensive models
5. Beta orgs can test experimental models

### 3. View Change History

1. Navigate to `/platform/ai-config`
2. Click "History" icon next to any feature
3. See all changes with:
   - What changed (previous model → new model)
   - Who made the change (platform staff username)
   - When it was changed (timestamp)
   - Why it was changed (notes)

---

## Testing & Rollout Strategy

### WhatsApp Feature Flag Rollout

**Week 1: Canary (10%)**
- Enable for 10% of users
- Monitor analytics: `whatsapp_voice_note_sent`, `whatsapp_voice_note_processed`
- Check error rate: `whatsapp_voice_note_failed`

**Week 2: Expand (25%)**
- If no issues, increase to 25%
- Compare engagement vs control group

**Week 3: Majority (50%)**
- Increase to 50% of users
- Monitor Twilio costs

**Week 4: Full Rollout (100%)**
- Enable for all users
- WhatsApp becomes standard feature

### AI Model Testing

**Scenario 1: Test cheaper model for transcription**
1. Platform Staff changes `voice_transcription` model to `gpt-4o-mini-transcribe`
2. All voice notes (app + WhatsApp) immediately use new model
3. Monitor quality metrics
4. Roll back if quality drops

**Scenario 2: Premium org gets better model**
1. Platform Staff creates org override for specific organization
2. Set `voice_insights` to `gpt-4o-plus` (if available)
3. Only that org uses premium model
4. Others continue using platform default

---

## Key Metrics to Track

### WhatsApp Engagement

| Metric | Description | Goal |
|--------|-------------|------|
| WhatsApp Adoption Rate | % of coaches who send ≥1 WhatsApp voice note | > 40% |
| WhatsApp Processing Success | % of WhatsApp notes successfully processed | > 95% |
| Average Processing Time | Time from receive to insights ready | < 30 sec |
| Voice Note Frequency | Notes per coach per week (WhatsApp + app) | > 3 |

### AI Performance

| Metric | Description | Goal |
|--------|-------------|------|
| Transcription Accuracy | Word error rate | < 5% |
| Insight Extraction Quality | Manual review score | > 4.0/5.0 |
| AI Response Time | Time from audio → insights | < 20 sec |
| AI Cost per Note | Total AI cost per voice note | < $0.05 |

---

## Future Enhancements

### 1. Per-Organization Model Selection (Planned)

Allow organizations to choose their own models via organization settings:
- Organization Admins can select preferred AI provider
- Billing tier determines available models (free tier = basic, paid = premium)
- Platform Staff can override any organization

### 2. OpenRouter Migration (Future)

Migrate to OpenRouter for unified API gateway:
- Single API key for all providers
- Automatic fallback if primary provider fails
- Cost optimization (route to cheapest provider)
- Access to open-source models (Llama, Mistral)

### 3. Usage Tracking & Budgets (Future)

Track AI usage per organization:
- Monthly token/cost budgets
- Alert when approaching limits
- Dashboard for Platform Staff

---

## Files Reference

### Feature Flag Integration
- `apps/web/src/hooks/use-ux-feature-flags.ts` - Feature flag definitions
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx` - Voice notes UI

### AI Configuration System
- `packages/backend/convex/models/aiModelConfig.ts` - Database queries/mutations
- `apps/web/src/app/platform/ai-config/page.tsx` - Platform admin UI
- `packages/backend/convex/schema.ts` - aiModelConfig table definition

### Voice Notes Integration
- `packages/backend/convex/actions/voiceNotes.ts` - Voice note processing (uses getAIConfig)
- `packages/backend/convex/actions/whatsapp.ts` - WhatsApp webhook handler

---

## Documentation Links

- **AI Configuration Architecture:** `/docs/architecture/ai-configuration.md`
- **WhatsApp Feature Flag Setup:** `/docs/features/whatsapp-voice-notes-feature-flag.md`
- **Voice Notes System:** `/docs/features/voice-notes.md`
- **PostHog Analytics:** `/docs/setup/posthog-analytics.md`

---

## Summary

✅ **WhatsApp Integration** - Controlled via PostHog feature flag for A/B testing and gradual rollout
✅ **AI Model Configuration** - Fully implemented via platform admin UI at `/platform/ai-config`
✅ **Voice Notes AI** - Uses database-backed config with per-org overrides
✅ **WhatsApp AI** - Uses same configuration as app voice notes
✅ **Analytics Tracking** - Comprehensive event tracking for WhatsApp usage
✅ **Audit Trail** - All AI model changes logged with who/what/when/why
✅ **Fallback Strategy** - Database → Env vars → Hardcoded defaults

**Next Steps:**
1. Create `voice_notes_whatsapp` feature flag in PostHog
2. Start at 0% rollout
3. Gradually increase: 10% → 25% → 50% → 100%
4. Monitor analytics dashboards
5. Adjust AI models via platform admin UI as needed
