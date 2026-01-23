# WhatsApp Voice Notes - Feature Flag Integration
**Date:** 2026-01-23
**Feature Flag:** `voice_notes_whatsapp`

## Overview

WhatsApp integration for voice notes is now controlled via PostHog feature flags, enabling A/B testing and gradual rollout. AI model configuration for voice notes is managed through the existing Platform AI Configuration page (`/platform/ai-config`).

---

## Feature Flag

### `voice_notes_whatsapp`
**Type:** Boolean
**Default:** `false` (disabled)
**Purpose:** Enable/disable WhatsApp integration for voice notes via Twilio

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

---

## PostHog Setup

### Creating the Feature Flag

1. **Log into PostHog** (https://eu.i.posthog.com)
2. **Navigate to Feature Flags** (left sidebar)
3. **Create Flag: `voice_notes_whatsapp`**
   - Name: WhatsApp Voice Notes
   - Key: `voice_notes_whatsapp`
   - Type: Boolean
   - Rollout: Start at 0%
   - Description: "Enable WhatsApp integration for voice notes"

### Rollout Strategies

#### Strategy 1: Gradual Percentage Rollout
```
Week 1: 10% of users (canary)
Week 2: 25% of users (if no issues)
Week 3: 50% of users
Week 4: 100% of users (full rollout)
```

#### Strategy 2: Organization-Based Rollout
```
Phase 1: Enable for 2-3 beta clubs
Phase 2: Enable for all clubs in one region
Phase 3: Enable for all paid clubs
Phase 4: Enable for all clubs
```

#### Strategy 3: User Property Targeting
```typescript
// Target by user role
Match: user.isPlatformStaff = true

// Target by organization
Match: user.organizationId in ["org_123", "org_456"]

// Target by coach trust level
Match: user.coachTrustLevel >= 2
```

---

## Analytics Events

All WhatsApp events are automatically tracked when the feature flag is enabled:

| Event | Description | Properties |
|-------|-------------|------------|
| `voice_notes_whatsapp_sent` | Coach initiated WhatsApp voice note | `method`, `has_audio`, `message_length` |
| `voice_notes_whatsapp_received` | Platform received WhatsApp message | `message_type`, `from_number`, `media_count` |
| `voice_notes_whatsapp_processed` | Successfully processed WhatsApp note | `processing_time_ms`, `insights_count`, `auto_applied` |
| `voice_notes_whatsapp_failed` | WhatsApp processing failed | `error_type`, `error_message`, `retry_count` |

---

## Frontend Integration

### Using the Feature Flag

```typescript
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

function VoiceNotesComponent() {
  const { useVoiceNotesWhatsApp } = useUXFeatureFlags();

  return (
    <div>
      {/* Show WhatsApp integration UI if enabled */}
      {useVoiceNotesWhatsApp && (
        <WhatsAppIntegrationPanel />
      )}
    </div>
  );
}
```

### Tracking Analytics

```typescript
import { useAnalytics, UXAnalyticsEvents } from "@/lib/analytics";

function handleWhatsAppSend() {
  const { track } = useAnalytics();

  track(UXAnalyticsEvents.WHATSAPP_VOICE_NOTE_SENT, {
    method: "whatsapp",
    has_audio: true,
    message_length: audioBlob.size,
  });

  // Send to Twilio...
}
```

---

## AI Model Configuration

### Platform Admin UI

**Location:** `/platform/ai-config`

**Access:** Platform staff only (requires `isPlatformStaff = true`)

**Features:**
- View all 7 AI features with current models
- Edit model configuration (provider, model, maxTokens, temperature)
- View change audit log
- Seed default configurations

### Voice Notes AI Features

1. **voice_transcription**
   - Default Model: `whisper-1`
   - Provider: OpenAI
   - Purpose: Convert audio to text
   - Fallback: `OPENAI_MODEL_TRANSCRIPTION` env var

2. **voice_insights**
   - Default Model: `gpt-4o`
   - Provider: OpenAI
   - Purpose: Extract insights from transcription
   - Fallback: `OPENAI_MODEL_INSIGHTS` env var

### Organization Overrides

Organizations can use different models than the platform default:

```typescript
// Example: Organization wants to use Claude for insights
await upsertConfig({
  feature: "voice_insights",
  scope: "organization",
  organizationId: "org_abc123",
  provider: "anthropic",
  modelId: "claude-sonnet-4-20250514",
  maxTokens: 2000,
  temperature: 0.3,
});
```

---

## Testing Checklist

### WhatsApp Feature Flag Testing

- [ ] Flag disabled: WhatsApp UI hidden, Twilio webhook returns 404
- [ ] Flag enabled at 0%: No users see WhatsApp features
- [ ] Flag enabled at 10%: ~10% of coaches see WhatsApp option
- [ ] Flag enabled at 100%: All coaches see WhatsApp integration
- [ ] Analytics events fire correctly when WhatsApp is used
- [ ] WhatsApp voice notes are transcribed and insights extracted
- [ ] WhatsApp replies are sent back to coaches
- [ ] Error handling works (bad audio, no coach match, etc.)

### AI Model Display Testing

- [ ] Flag disabled: AI model info icon hidden
- [ ] Flag enabled: Info icon appears in voice notes header
- [ ] Hover shows tooltip with model information
- [ ] Click tracks analytics event
- [ ] Platform default shows correctly
- [ ] Organization override shows correctly (if configured)
- [ ] Mobile responsive (icon + tooltip work on small screens)

### A/B Testing Scenarios

**Test 1: WhatsApp vs App-Only Engagement**
- Group A: WhatsApp enabled (50% of coaches)
- Group B: WhatsApp disabled (50% of coaches)
- Metric: Total voice notes recorded per coach
- Hypothesis: WhatsApp increases voice note usage by 30%

**Test 2: AI Model Transparency Impact**
- Group A: AI model info visible (50% of coaches)
- Group B: AI model info hidden (50% of coaches)
- Metric: Trust level progression, voice note satisfaction
- Hypothesis: Transparency increases trust and satisfaction

---

## Backend Implementation

### Twilio Webhook

**Endpoint:** `/api/whatsapp/webhook`

**Flow:**
1. Twilio sends webhook when coach sends WhatsApp message
2. Backend checks `voice_notes_whatsapp` flag for sending coach
3. If enabled: Process message, create voice note, send reply
4. If disabled: Return 200 OK but don't process (silent ignore)

**Note:** Feature flag is checked on a per-user basis, not globally.

### AI Config Query

```typescript
// Backend action (voiceNotes.ts)
const transcriptionConfig = await getAIConfig(
  ctx,
  "voice_transcription",
  organizationId // Optional: org-specific override
);

// Returns:
{
  modelId: "whisper-1",
  maxTokens: undefined,
  temperature: undefined,
  provider: "openai",
  scope: "platform" // or "organization"
}
```

---

## Dashboard & Monitoring

### PostHog Dashboards to Create

**1. WhatsApp Voice Notes Dashboard**
- Total WhatsApp messages received (daily/weekly)
- WhatsApp processing success rate
- Average processing time
- Top error types
- Coaches using WhatsApp (unique count)
- WhatsApp vs app voice notes ratio

**2. AI Model Info Dashboard**
- Coaches viewing AI model info (count)
- View frequency per coach
- Correlation: Model visibility → Voice note usage
- Correlation: Model visibility → Trust level progression

**3. A/B Test Dashboard**
- Feature flag rollout percentage over time
- Engagement metrics by flag variant
- Conversion funnel (view WhatsApp → send WhatsApp)
- Statistical significance calculator

### Key Metrics to Track

| Metric | Description | Goal |
|--------|-------------|------|
| WhatsApp Adoption Rate | % of coaches who send ≥1 WhatsApp voice note | > 40% |
| WhatsApp Processing Success | % of WhatsApp notes successfully processed | > 95% |
| Average Processing Time | Time from receive to insights ready | < 30 sec |
| Model Info View Rate | % of coaches who view AI model info | > 20% |
| Voice Note Frequency | Notes per coach per week (WhatsApp + app) | > 3 |

---

## Rollback Plan

### If WhatsApp Issues Occur

1. **Immediate:** Set `voice_notes_whatsapp` to 0% in PostHog
2. **Monitor:** Check that no new WhatsApp messages are processed
3. **Investigate:** Review error logs, Twilio webhooks, database state
4. **Fix:** Address root cause
5. **Re-enable:** Gradually re-enable (10% → 25% → 50% → 100%)

### If AI Model Display Causes Issues

1. **Immediate:** Set `voice_notes_ai_model_display` to 0%
2. **Monitor:** Verify info icon is hidden
3. **Investigate:** Check query performance, tooltip rendering
4. **Fix:** Optimize query or component
5. **Re-enable:** Test with 10% before full rollout

---

## Future Enhancements

### WhatsApp Feature Flag Variants

**Multivariate Testing:**
```typescript
// Instead of boolean, use variant testing
voice_notes_whatsapp: "control" | "whatsapp_only" | "whatsapp_plus_sms" | "full_omnichannel"
```

**Conditional Features:**
```typescript
// Only show WhatsApp for coaches with trust level ≥ 2
if (coachTrustLevel >= 2 && useVoiceNotesWhatsApp) {
  // Show WhatsApp integration
}
```

### AI Model Configurability

**Coach-Facing Model Selection (Future):**
- Allow coaches to choose their preferred AI provider
- A/B test: GPT-4o vs Claude Sonnet vs OpenRouter
- Premium feature: Advanced models for paid organizations

**Real-Time Model Comparison:**
- Process same voice note with 2 models simultaneously
- Show coaches side-by-side results
- Collect preference data for model optimization

---

## Documentation Links

- **PostHog Setup:** `/docs/setup/posthog-analytics.md`
- **AI Configuration:** `/docs/architecture/ai-configuration.md`
- **WhatsApp Integration:** `/docs/features/whatsapp-voice-notes.md` (if exists)
- **Voice Notes System:** `/docs/features/voice-notes.md`

---

## Support & Troubleshooting

### Common Issues

**Issue:** Feature flag not updating in UI
**Solution:** Check that PostHog proxy is running, clear browser cache, verify `ph-bootstrap-flags` cookie

**Issue:** AI model info not showing
**Solution:** Verify `getConfigForFeature` query returns data, check feature flag is enabled, ensure tooltip provider is in component tree

**Issue:** WhatsApp webhook returns 500
**Solution:** Check Twilio credentials, verify coach phone number is registered, review backend error logs

---

## Summary

The WhatsApp voice notes feature is now fully integrated with PostHog feature flags, enabling:

✅ **A/B Testing** - Test WhatsApp vs app-only engagement
✅ **Gradual Rollout** - Start at 10%, expand to 100%
✅ **AI Transparency** - Show coaches which models are used
✅ **Analytics Tracking** - Comprehensive event tracking
✅ **Organization Control** - Per-org model overrides
✅ **Rollback Safety** - Instant disable via feature flag

All changes are production-ready and waiting for PostHog feature flag activation.
