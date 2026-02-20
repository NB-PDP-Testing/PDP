## Root Cause Analysis — WhatsApp Duplicate Detection

### The Problem: Audio Duplicate Detection is Content-Type Based, Not Content Based

**File:** `packages/backend/convex/lib/duplicateDetection.ts`

For **audio messages**, the duplicate check matches on:
- Same sender (phone number)
- Same `mediaContentType` (e.g., `"audio/ogg"`)
- Within a **2-minute window** (`DEFAULT_AUDIO_WINDOW_MS = 2 * 60 * 1000`)

It does **NOT** check the actual audio content or WhatsApp media ID. Since all WhatsApp voice messages have the same content type (`audio/ogg`), **any two voice messages sent from the same number within 2 minutes will be flagged as duplicates**.

This is different from text messages, which compare the actual body text — so two different texts won't collide.

### The Duplicate Detection Flow

1. You send Voice Message A → accepted, starts processing
2. You send Voice Message B within 2 minutes → same sender + same `audio/ogg` content type → **flagged as duplicate of A**
3. You send Voice Message C within 2 minutes → **also flagged as duplicate of A**
4. You receive "We received this message 24 seconds ago and it's currently being processed" for B and C

### Key Files Involved

| File | Role |
|------|------|
| `packages/backend/convex/lib/duplicateDetection.ts` | Core dedup logic — `checkDuplicate()` function uses content-type matching for audio |
| `packages/backend/convex/models/whatsappMessages.ts` | `checkForDuplicateMessage` query — fetches recent messages from same sender via `by_fromNumber_and_receivedAt` index |
| `packages/backend/convex/actions/whatsapp.ts` | Webhook handler — calls duplicate check, marks duplicates, sends "already received" reply via `buildDuplicateReply()` |

### Detection Parameters

| Parameter | Text Messages | Audio Messages |
|-----------|--------------|----------------|
| Time window | 5 minutes | 2 minutes |
| Match field | Exact body text | `mediaContentType` only |
| Media ID check | N/A | **NOT checked** |

### The Fix Needed

The audio deduplication should use the **WhatsApp media ID** (`mediaSid` or equivalent from Twilio) instead of just `mediaContentType`. Each voice message has a unique media ID — this would correctly distinguish back-to-back but distinct recordings from genuine resends/retries.

Alternatively, the audio time window could be drastically reduced or audio dedup could be disabled entirely, since Twilio's own retry mechanism already uses message SIDs to prevent genuine duplicates at the transport layer.
