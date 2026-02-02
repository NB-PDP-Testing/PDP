# WhatsApp Integration Patterns Analysis

## Overview

This document maps practical WhatsApp integration patterns (drawn from OpenClaw, Tasklet, and WhatsApp Business API best practices) against PlayerARC's current implementation. It identifies what we already do well, what's missing, and concrete improvements.

**Companion to**: `mcp-integration-plan.md` (for AI agent integration)
**Focus**: Making the existing WhatsApp integration more robust and compliant

---

## Current PDP WhatsApp Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Coach's WhatsApp                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Twilio WhatsApp Sandbox                    │
│              (Business API via sandbox)                 │
└────────────────────┬────────────────────────────────────┘
                     │ Webhook POST
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Convex HTTP Handler (/whatsapp/incoming)        │
│         packages/backend/convex/http.ts                 │
└────────────────────┬────────────────────────────────────┘
                     │ ctx.runAction
                     ▼
┌─────────────────────────────────────────────────────────┐
│         processIncomingMessage Action                   │
│         packages/backend/convex/actions/whatsapp.ts     │
│                                                         │
│  1. Store raw message (whatsappMessages)                │
│  2. Phone → Coach lookup                                │
│  3. Multi-org detection (8 strategies)                  │
│  4. Create voice note                                   │
│  5. Schedule auto-apply check (30s)                     │
│  6. Send WhatsApp reply                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Pattern Analysis Matrix

| Pattern | Status | Current Implementation | Gap |
|---------|--------|------------------------|-----|
| **1. 24-hour window tracking** | ❌ Missing | Not tracked | Need to model window state |
| **2. Separate ack from answer** | ⚠️ Partial | Ack before processing, results after | Could be faster |
| **3. Threading/quote injection** | ❌ Missing | No thread context | Need to pass reply context |
| **4. DM gating / allowlist** | ✅ Implicit | Phone must match coach record | Works via lookup |
| **5. Deterministic routing** | ✅ Good | Reply always to sender | Solid |
| **6. Template messages** | ❌ Missing | Not planned for outbound | Need for Phase 3 |
| **7. Multi-account support** | ✅ Good | One Twilio number, multi-org routing | Works well |
| **8. Abuse controls** | ⚠️ Partial | Phone lookup gates access | No rate limiting |

---

## Pattern 1: Model the 24-Hour Window

### The Problem

WhatsApp Business API enforces a **24-hour customer care window**:
- **Within 24 hours** of user message: Free-form replies allowed
- **After 24 hours**: Only pre-approved template messages allowed
- Violation = message failure or account flagging

### Current State

We don't track when the 24-hour window opened/closes. All replies are immediate (within seconds), so we're currently safe. But for **Phase 3 (bidirectional parent communication)**, this becomes critical.

### Recommended Implementation

```typescript
// Schema addition: whatsappConversationWindows
whatsappConversationWindows: defineTable({
  phoneNumber: v.string(),              // Normalized E.164
  direction: v.union(v.literal("inbound"), v.literal("outbound")),
  organizationId: v.string(),
  windowOpenedAt: v.number(),           // Timestamp of user message
  windowExpiresAt: v.number(),          // windowOpenedAt + 24 hours
  lastMessageAt: v.number(),
  templateRequired: v.boolean(),        // Computed: now > windowExpiresAt
  status: v.union(
    v.literal("active"),                // Within 24 hours
    v.literal("expired"),               // Past 24 hours, need template
    v.literal("closed")                 // Conversation ended
  ),
})
.index("by_phone", ["phoneNumber"])
.index("by_phone_and_org", ["phoneNumber", "organizationId"])
.index("by_status", ["status"])
```

```typescript
// Helper function
function canSendFreeformMessage(phoneNumber: string, orgId: string): boolean {
  const window = await getConversationWindow(phoneNumber, orgId);
  if (!window) return false;
  return Date.now() < window.windowExpiresAt;
}

// On incoming message
async function handleIncomingMessage(phoneNumber: string, orgId: string) {
  // Refresh or create window
  await upsertConversationWindow({
    phoneNumber,
    organizationId: orgId,
    direction: "inbound",
    windowOpenedAt: Date.now(),
    windowExpiresAt: Date.now() + (24 * 60 * 60 * 1000),
    status: "active",
  });
}

// Before sending outbound
async function sendMessage(phoneNumber: string, message: string, orgId: string) {
  const canFreeform = await canSendFreeformMessage(phoneNumber, orgId);

  if (canFreeform) {
    await sendWhatsAppMessage(phoneNumber, message);
  } else {
    // Use template message
    await sendWhatsAppTemplate(phoneNumber, "parent_update_template", {
      summary: message,
    });
  }
}
```

### Priority: HIGH for Phase 3 (parent summaries)

---

## Pattern 2: Separate Ack from Answer

### The Problem

Long AI processing (transcription + insights) creates anxiety for users. They send a voice note and wait 30+ seconds wondering if it worked.

### Current State

We have a partial implementation:

```typescript
// Current: Ack after org detection (lines 184-190 in whatsapp.ts)
await sendWhatsAppMessage(
  phoneNumber,
  `Voice note received for ${organization.name}. Transcribing and analyzing...`
);

// Then later (30s+): Full results
await sendWhatsAppMessage(phoneNumber, formatResultsMessage(results, trustLevel));
```

### Recommended Enhancement

Make the ack **instant** (before any processing):

```typescript
// IMMEDIATE (< 1 second from webhook)
http.route({
  path: "/whatsapp/incoming",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const phoneNumber = from.replace("whatsapp:", "");

    // INSTANT ACK - before any processing
    // Use Twilio reaction emoji if available, or quick text
    await sendQuickAck(phoneNumber, "✅");  // Or "👍" reaction

    // Then schedule async processing
    await ctx.scheduler.runAfter(0, internal.actions.whatsapp.processIncomingMessage, {
      // ... args
    });

    return new Response(EMPTY_TWIML, { status: 200 });
  }),
});
```

Or use **WhatsApp message reactions** (Twilio supports this):

```typescript
// Send a reaction to the incoming message
async function sendReaction(messageSid: string, emoji: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${authHeader}` },
    body: new URLSearchParams({
      From: `whatsapp:${fromNumber}`,
      To: `whatsapp:${toNumber}`,
      Body: "",
      MessageSid: messageSid,  // Reference to message being reacted to
      // Note: Twilio reaction API varies - check current docs
    }),
  });
}
```

### Three-Phase Response Flow

```
1. INSTANT (< 1s)     → "✅" reaction or "Got it!"
2. PROCESSING (5-10s) → "Transcribing..." (optional, for long audio)
3. COMPLETE (30s+)    → Full results with auto-applied summary
```

### Priority: MEDIUM (improves UX significantly)

---

## Pattern 3: Threading and Quote Injection

### The Problem

When coach replies to a specific message (quote reply), we lose that context. The AI doesn't know what the coach is referring to.

**Example**:
```
Coach sends voice note about "John's tackling"
System: "Processed: John - Tackling improved"
Coach quotes the system message and says: "Actually meant James"

→ Current: We treat "Actually meant James" as a new message
→ Better: Inject quoted context so AI knows this is a correction
```

### Current State

We don't process Twilio's reply/quote metadata. The webhook provides:

```
QuotedMessageId: SMxxxxxxxxxxxxxxxx  // ID of quoted message
QuotedMessageBody: "Processed: John..."  // Body of quoted message
QuotedMessageAuthor: whatsapp:+1234...  // Who sent quoted message
```

### Recommended Implementation

```typescript
// 1. Extract quote metadata in webhook handler
const quotedMessageId = formData.get("QuotedMessageId") as string | null;
const quotedMessageBody = formData.get("QuotedMessageBody") as string | null;
const quotedMessageAuthor = formData.get("QuotedMessageAuthor") as string | null;

// 2. Store in whatsappMessages
await ctx.runMutation(internal.models.whatsappMessages.createMessage, {
  // ... existing fields
  quotedMessageId,
  quotedMessageBody,
  quotedMessageAuthor,
  isReply: !!quotedMessageId,
});

// 3. Inject into AI prompt for insight extraction
function buildPromptWithContext(message: WhatsAppMessage): string {
  let prompt = message.body || "[Voice note transcription]";

  if (message.quotedMessageBody) {
    prompt = `[Replying to: "${message.quotedMessageBody}"]\n\n${prompt}`;
  }

  return prompt;
}

// 4. Special handling for corrections
function detectCorrectionIntent(message: WhatsAppMessage): boolean {
  if (!message.isReply) return false;

  const correctionPatterns = [
    /actually meant/i,
    /i meant/i,
    /wrong player/i,
    /correction/i,
    /should be/i,
    /not \w+,?\s*(it'?s|was|is)/i,
  ];

  return correctionPatterns.some(p => p.test(message.body || ""));
}
```

### Schema Addition

```typescript
// Add to whatsappMessages table
quotedMessageId: v.optional(v.string()),
quotedMessageBody: v.optional(v.string()),
quotedMessageAuthor: v.optional(v.string()),
isReply: v.optional(v.boolean()),
isCorrection: v.optional(v.boolean()),  // Detected correction intent
```

### Priority: MEDIUM (helps with correction handling)

---

## Pattern 4: DM Gating / Allowlist

### The Problem

Random phone numbers sending messages = potential abuse, spam, or accidental "work" for the system.

### Current State

**We already do this implicitly**:

```typescript
// From whatsappMessages.ts - findCoachByPhone
const matchedUser = (users as any[]).find((user: any) => {
  if (!user.phone) return false;
  const userPhone = normalizePhoneNumber(user.phone);
  return userPhone === normalizedPhone;
});

if (!matchedUser) {
  return null;  // Unmatched = rejected
}
```

Unknown phones get a friendly rejection:
```
"Your phone number isn't linked to a coach account in PlayerARC.
Please add your phone number in Settings, or contact your club admin."
```

### Enhancement: Explicit Enrollment Flow

For Phase 3 (parent communication), we need parents to opt-in:

```typescript
// Parent WhatsApp enrollment flow
const parentEnrollments = defineTable({
  phoneNumber: v.string(),
  parentUserId: v.string(),
  organizationId: v.string(),
  status: v.union(
    v.literal("pending"),     // Sent verification
    v.literal("verified"),    // Confirmed via code
    v.literal("opted_out")    // Parent said "STOP"
  ),
  verificationCode: v.optional(v.string()),
  verificationExpires: v.optional(v.number()),
  enrolledAt: v.optional(v.number()),
  optedOutAt: v.optional(v.number()),
  consentRecordedAt: v.number(),
})
.index("by_phone", ["phoneNumber"])
.index("by_parent", ["parentUserId"]);

// Handle "STOP" messages
function handleStopCommand(phoneNumber: string): boolean {
  const message = normalizedMessage.toLowerCase().trim();
  const stopCommands = ["stop", "unsubscribe", "opt out", "optout", "cancel"];
  return stopCommands.includes(message);
}
```

### Priority: HIGH for Phase 3 (parent messaging requires explicit consent)

---

## Pattern 5: Deterministic Routing

### Current State

**We do this well**. Replies always go back to the originating phone number:

```typescript
// From whatsapp.ts - sendWhatsAppMessage
await fetch(url, {
  body: new URLSearchParams({
    From: `whatsapp:${fromNumber}`,  // Our Twilio number
    To: `whatsapp:${to}`,            // Always the original sender
    Body: body,
  }),
});
```

The `to` parameter is always the coach's phone from the original message. No ambiguity.

### No Changes Needed

✅ Current implementation is correct.

---

## Pattern 6: Template Messages

### The Problem

When we want to **initiate** contact (not reply within 24 hours), we need pre-approved templates.

**Phase 3 Use Cases**:
- Send parent summary when coach approves
- Remind parent to acknowledge
- Weekly digest of child's progress

### Current State

Not implemented. We only do reactive messaging (reply to coach within seconds).

### Recommended Implementation

**1. Register templates with Twilio/WhatsApp**:

```
Template Name: playerarc_parent_update
Language: en
Category: UTILITY

Body:
"Hi {{1}}!

{{2}} shared an update about {{3}}'s progress:

{{4}}

Reply to this message to ask questions, or say STOP to unsubscribe."

Variables:
1. Parent first name
2. Coach name
3. Player first name
4. Summary text (max 1024 chars)
```

**2. Template message function**:

```typescript
async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  variables: Record<string, string>
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  // Check if we can send freeform (within 24hr window)
  const canFreeform = await canSendFreeformMessage(to);

  if (canFreeform) {
    // Use regular message
    const body = formatTemplateAsText(templateName, variables);
    return await sendWhatsAppMessage(to, body);
  }

  // Use template message via Twilio Content API
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${fromNumber}`,
      To: `whatsapp:${to}`,
      ContentSid: getContentSidForTemplate(templateName),
      ContentVariables: JSON.stringify(variables),
    }),
  });

  return response.ok;
}
```

**3. Template registry**:

```typescript
// Pre-approved templates registered with Twilio
const WHATSAPP_TEMPLATES = {
  parent_update: {
    contentSid: "HXxxxxxxxxxxxxxxxxxxxxxxxxx",
    variables: ["parentName", "coachName", "playerName", "summary"],
  },
  weekly_digest: {
    contentSid: "HXyyyyyyyyyyyyyyyyyyyyyyyyy",
    variables: ["parentName", "playerName", "weekSummary"],
  },
  injury_notification: {
    contentSid: "HXzzzzzzzzzzzzzzzzzzzzzzzzz",
    variables: ["parentName", "playerName", "injuryType", "coachName"],
  },
};
```

### Priority: HIGH for Phase 3 (required for outbound to parents)

---

## Pattern 7: Abuse Controls / Rate Limiting

### The Problem

Without rate limiting:
- A coach could spam voice notes
- A bug could cause infinite loops
- Malicious actors could waste Twilio credits

### Current State

No explicit rate limiting. The phone lookup acts as a gate, but a valid coach could still abuse.

### Recommended Implementation

```typescript
// Schema: Rate limit tracking
whatsappRateLimits: defineTable({
  phoneNumber: v.string(),
  windowStart: v.number(),        // Start of current window
  messageCount: v.number(),       // Messages in current window
  audioCount: v.number(),         // Audio messages (more expensive)
  lastMessageAt: v.number(),
})
.index("by_phone", ["phoneNumber"]);

// Constants
const RATE_LIMITS = {
  messagesPerHour: 30,           // Max messages per hour
  audioPerHour: 10,              // Max voice notes per hour
  cooldownAfterLimit: 60_000,    // 1 minute cooldown after hitting limit
};

// Check rate limit
async function checkRateLimit(phoneNumber: string): Promise<{
  allowed: boolean;
  reason?: string;
  resetAt?: number;
}> {
  const now = Date.now();
  const windowStart = now - (60 * 60 * 1000); // 1 hour window

  const limits = await getRateLimits(phoneNumber);

  if (!limits || limits.windowStart < windowStart) {
    // Reset window
    await resetRateLimits(phoneNumber, now);
    return { allowed: true };
  }

  if (limits.messageCount >= RATE_LIMITS.messagesPerHour) {
    return {
      allowed: false,
      reason: "hourly_limit",
      resetAt: limits.windowStart + (60 * 60 * 1000),
    };
  }

  return { allowed: true };
}

// In processIncomingMessage
const rateLimitCheck = await checkRateLimit(phoneNumber);
if (!rateLimitCheck.allowed) {
  await sendWhatsAppMessage(
    phoneNumber,
    `You've sent a lot of messages recently. Please wait a few minutes and try again.`
  );
  return { success: false, error: "rate_limited" };
}
```

### Priority: MEDIUM (good hygiene, prevents abuse)

---

## Architecture Recommendation: Event-Driven

Based on Tasklet's pattern of "WhatsApp is just one trigger/output", consider evolving to:

```
┌─────────────────────────────────────────────────────────┐
│                    Adapters (Input)                     │
├─────────────────────────────────────────────────────────┤
│  WhatsApp     │  App UI      │  MCP Server  │  API     │
│  (Twilio)     │  (Web)       │  (Future)    │  (Future)│
└───────┬───────┴──────┬───────┴──────┬───────┴────┬─────┘
        │              │              │            │
        ▼              ▼              ▼            ▼
┌─────────────────────────────────────────────────────────┐
│                    Event Bus / Queue                    │
│                                                         │
│  Events:                                                │
│  - voice_note.received (source: whatsapp|app|mcp)       │
│  - voice_note.transcribed                               │
│  - voice_note.insights_ready                            │
│  - insight.applied                                      │
│  - parent_summary.approved                              │
│  - parent_summary.delivered                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Workflow Engine                        │
│                                                         │
│  Policies:                                              │
│  - Consent validation                                   │
│  - 24-hour window enforcement                           │
│  - Rate limiting                                        │
│  - Trust level checks                                   │
│  - Template selection                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Adapters (Output)                    │
├─────────────────────────────────────────────────────────┤
│  WhatsApp     │  Push        │  Email       │  In-App  │
│  (Twilio)     │  (Future)    │  (Future)    │  (Toast) │
└─────────────────────────────────────────────────────────┘
```

This architecture:
1. **Decouples input from processing** - WhatsApp is just one adapter
2. **Centralizes policy enforcement** - Rate limits, consent, windows in one place
3. **Enables multi-channel** - Same workflow, different outputs
4. **Simplifies testing** - Mock adapters for unit tests
5. **Prepares for MCP** - MCP becomes another adapter

### Convex Implementation

Convex's scheduler and internal functions already support this pattern:

```typescript
// Event emission
await ctx.scheduler.runAfter(0, internal.events.voiceNoteReceived, {
  noteId,
  source: "whatsapp",
  coachId,
  organizationId,
});

// Event handler
export const voiceNoteReceived = internalAction({
  args: { noteId: v.id("voiceNotes"), source: v.string(), ... },
  handler: async (ctx, args) => {
    // 1. Policy checks
    // 2. Trigger transcription
    // 3. Schedule next event
  },
});
```

---

## Implementation Priority Matrix

| Pattern | Priority | Effort | Phase |
|---------|----------|--------|-------|
| **24-hour window tracking** | HIGH | Medium | Phase 3 prep |
| **Template messages** | HIGH | Medium | Phase 3 |
| **Parent consent/enrollment** | HIGH | Medium | Phase 3 |
| **Instant ack (reactions)** | MEDIUM | Low | Phase 2 enhancement |
| **Threading/quote context** | MEDIUM | Medium | Phase 2 enhancement |
| **Rate limiting** | MEDIUM | Low | Now (hygiene) |
| **Event-driven architecture** | LOW | High | Future refactor |

---

## Immediate Actions (Can Do Now)

### 1. Add Rate Limiting (2-3 hours)

```typescript
// Add to schema.ts
whatsappRateLimits: defineTable({
  phoneNumber: v.string(),
  windowStart: v.number(),
  messageCount: v.number(),
  audioCount: v.number(),
})
.index("by_phone", ["phoneNumber"]);

// Add check in processIncomingMessage
```

### 2. Store Quote Context (1-2 hours)

```typescript
// Add to whatsappMessages schema
quotedMessageId: v.optional(v.string()),
quotedMessageBody: v.optional(v.string()),
isReply: v.optional(v.boolean()),

// Extract in http.ts webhook handler
const quotedMessageId = formData.get("QuotedMessageId");
```

### 3. Instant Ack (1 hour)

```typescript
// Move ack to HTTP handler, before runAction
await sendQuickAck(phoneNumber, "✅ Processing...");
await ctx.scheduler.runAfter(0, internal.actions.whatsapp.processIncomingMessage, {...});
```

---

## Phase 3 Preparation Checklist

Before implementing bidirectional parent communication:

- [ ] Implement conversation window tracking (24-hour rule)
- [ ] Create and approve WhatsApp templates with Twilio
- [ ] Build parent consent/enrollment flow
- [ ] Add phone number collection to parent onboarding
- [ ] Implement template message sending
- [ ] Add "STOP" command handling
- [ ] Create parent WhatsApp settings UI
- [ ] Test outside-window scenarios

---

## Conclusion

PlayerARC's WhatsApp integration is already sophisticated for **inbound coach messaging**. The patterns above address:

1. **Compliance** - 24-hour window, templates, consent
2. **UX** - Instant acks, threading context
3. **Safety** - Rate limiting, abuse controls
4. **Scalability** - Event-driven architecture

Combined with the MCP integration plan, these improvements position PlayerARC as a robust, compliant, AI-native sports platform.
