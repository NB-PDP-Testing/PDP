# WhatsApp Integration for Voice Notes

## Overview

This document describes the WhatsApp integration that allows coaches to submit voice notes and text messages via WhatsApp, which are then processed through the existing voice notes AI pipeline with trust-based auto-apply logic.

**Status**: MVP Complete (Jan 2026)
**Related Issues**: #247, #15, #17, #242

---

## Architecture

### High-Level Flow

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Coach sends    │────▶│   Twilio    │────▶│  Convex HTTP     │
│  WhatsApp msg   │     │   Webhook   │     │  /whatsapp/incoming │
└─────────────────┘     └─────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
┌─────────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Auto-apply     │◀────│  AI Insights│◀────│  Phone Lookup    │
│  + WhatsApp     │     │  Pipeline   │     │  → Coach Match   │
│  Response       │     │             │     │  → Org Context   │
└─────────────────┘     └─────────────┘     └──────────────────┘
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| HTTP Webhook | `packages/backend/convex/http.ts` | Receives Twilio POST requests |
| Message Processing | `packages/backend/convex/actions/whatsapp.ts` | Downloads media, creates voice notes, handles auto-apply |
| Phone Lookup | `packages/backend/convex/models/whatsappMessages.ts` | Matches phone → coach → organization |
| Message Storage | `packages/backend/convex/schema.ts` | `whatsappMessages` table |
| UI Indicator | `apps/web/.../voice-notes/components/history-tab.tsx` | WhatsApp badge on notes |

---

## Features Implemented

### 1. Phone Number Matching
- Coaches must have phone number saved in their user profile
- Normalizes phone numbers (removes spaces, dashes, handles +country codes)
- Queries Better Auth component to find user by phone
- Determines organization from coach's membership

### 2. Message Types Supported
- **Voice Notes** (`audio/*`) - Downloaded from Twilio, stored in Convex, transcribed via Whisper
- **Text Messages** - Created as typed voice notes, processed through insights pipeline
- **Unsupported** - Images, videos, documents return friendly error message

### 3. Source Tracking
Voice notes now track their source channel:
- `app_recorded` - Recorded via app microphone
- `app_typed` - Typed directly in app
- `whatsapp_audio` - Voice note from WhatsApp
- `whatsapp_text` - Text message from WhatsApp

### 4. Trust-Based Auto-Apply
Leverages existing trust level system:
- **Level 0-1**: No auto-apply, needs manual review
- **Level 2**: Auto-apply safe categories (skill_progress, performance, attendance, team_culture, todo)
- **Level 3**: Auto-apply + trigger parent summary generation

Safe categories never auto-apply: `injury`, `behavior` (require human review)

### 5. WhatsApp Response Messages
Coach receives detailed feedback via WhatsApp:
- Confirmation of receipt
- Processing status
- Auto-apply summary (what was applied, what needs review)
- Unmatched player names

### 6. UI Integration
- WhatsApp badge (green with icon) displayed on notes in history
- Badge appears for both `whatsapp_audio` and `whatsapp_text` sources

---

## Configuration

### Environment Variables (Convex)

```bash
# Twilio credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox number

# OpenAI for transcription
OPENAI_API_KEY=sk-xxx
```

### Twilio Webhook Configuration

**Sandbox Setup** (for testing):
1. Go to Twilio Console → Messaging → Try It Out → Send a WhatsApp Message
2. Join sandbox by sending code to sandbox number
3. Configure webhook URL: `https://[your-convex-url].convex.site/whatsapp/incoming`

**Production Setup**:
1. Register WhatsApp Business Account with Twilio
2. Configure webhook URL in Twilio Console
3. Enable signature validation (currently skipped for sandbox)

---

## Database Schema

### `whatsappMessages` Table

```typescript
whatsappMessages: defineTable({
  messageSid: v.string(),           // Twilio message ID
  accountSid: v.string(),           // Twilio account ID
  fromNumber: v.string(),           // Sender phone (e.g., +447814289628)
  toNumber: v.string(),             // Twilio WhatsApp number
  messageType: v.union(...),        // text, audio, image, video, document
  body: v.optional(v.string()),     // Text content
  mediaUrl: v.optional(v.string()), // Twilio media URL
  mediaContentType: v.optional(v.string()),

  // Coach matching
  coachId: v.optional(v.string()),
  coachName: v.optional(v.string()),
  organizationId: v.optional(v.string()),

  // Processing
  status: v.union(...),             // received, processing, completed, failed, unmatched
  errorMessage: v.optional(v.string()),
  mediaStorageId: v.optional(v.id("_storage")),
  voiceNoteId: v.optional(v.id("voiceNotes")),
  processingResults: v.optional(...),

  receivedAt: v.number(),
  processedAt: v.optional(v.number()),
})
```

### `voiceNotes` Table Updates

Added `source` field to track origin:

```typescript
source: v.optional(
  v.union(
    v.literal("app_recorded"),
    v.literal("app_typed"),
    v.literal("whatsapp_audio"),
    v.literal("whatsapp_text")
  )
),
```

---

## Transcription Model Analysis

### Current Implementation
Using `whisper-1` model for transcription. Analysis was done on available options:

| Model | WER | Cost/min | WhatsApp OGG Support | Notes |
|-------|-----|----------|---------------------|-------|
| **whisper-1** (current) | 10.6% | $0.006 | ✅ Works | Battle-tested, reliable |
| gpt-4o-mini-transcribe | 13.2% | $0.003 | ❌ Issues | Format sensitivity, truncation |
| gpt-4o-transcribe | 8.9% | $0.006 | ❌ Issues | Better accuracy but same format issues |
| Deepgram Nova-3 | 12.8% | $0.0043 | ✅ Good | Custom vocabulary support |
| ElevenLabs Scribe v2 | ~9-10% | $0.004 | ✅ Good | Keyterm prompting (100 words) |

### Recommendation
- **Current**: Stay with `whisper-1` for reliability
- **Future**: Consider Deepgram Nova-3 for custom vocabulary (player names)

### OpenRouter Note
OpenRouter does NOT provide speech-to-text APIs. It's for LLM routing only. Could be used for insights generation step, not transcription.

---

## Known Issues & Limitations

### Current Limitations
1. **Sandbox Mode** - Using Twilio sandbox, requires users to opt-in
2. **Single Organization** - If coach has multiple orgs, uses currentOrgId or first membership
3. **No Signature Validation** - Twilio signature verification disabled for sandbox
4. **Audio Format** - WhatsApp sends OGG/Opus, handled via `.ogg` file extension

### Potential Improvements
1. **Multi-org Selection** - Allow coach to specify target org in message
2. **Player Name Hints** - Pass roster as prompt to improve transcription
3. **Rate Limiting** - Prevent spam/abuse
4. **Message Threading** - Track conversation context

---

## Testing

### Manual Testing Steps
1. Save phone number in user profile (Settings → Profile)
2. Join Twilio sandbox (send join code to sandbox number)
3. Send voice note or text message
4. Check Convex logs for processing
5. Verify voice note appears in app with WhatsApp badge
6. Check WhatsApp for response message

### Test Scenarios
- [ ] Voice note with player mentions
- [ ] Text message with player mentions
- [ ] Unregistered phone number
- [ ] Image/video (should return unsupported message)
- [ ] Long voice note (>1 minute)
- [ ] Multiple insights in single note

---

## Future Enhancements

### Phase 2: Enhanced WhatsApp Experience
- [ ] Allow specifying organization via message prefix
- [ ] Support image attachments (injury photos)
- [ ] Quick-reply buttons for common actions
- [ ] Daily digest summary via WhatsApp

### Phase 3: Bidirectional Communication
- [ ] Send parent summaries via WhatsApp
- [ ] Parents can reply to summaries
- [ ] Appointment scheduling via WhatsApp

### Phase 4: Advanced Features
- [ ] WhatsApp Business API (production)
- [ ] Message templates for notifications
- [ ] Rich media cards for insights
- [ ] Location-based context (training venue detection)

---

## Related Documentation

- [Voice Notes System](./voice-notes.md)
- [Coach Trust Levels](./coach-trust-levels.md)
- [Parent-Coach Communication](./parent-coach-communication.md)
- [AI Model Configuration](./ai-model-config.md)

## Related Issues

- **#247** - VoiceNote Comprehensive Enhancement (parent feature)
- **#15** - Voice Notes UX Enhancements
- **#17** - Parent Notification System
- **#242** - Parent-Coach Communication Enhancement
