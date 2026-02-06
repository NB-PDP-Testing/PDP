# ADR-VN2-005: WhatsApp Command Interceptor Priority Chain

**Date:** 2026-02-06
**Status:** Accepted with Conditions
**Context:** Phase 2 - Coach Quick Review Microsite, Story US-VN-011

## Context and Problem Statement

Phase 2 adds "OK" (batch-apply matched insights) and "R" (resend review link) as WhatsApp quick-reply shortcuts. Phase 1 already has CONFIRM/RETRY/CANCEL interceptors for the quality gate flow. The `processIncomingMessage` action needs a clear priority chain for text commands to avoid false positives and ensure correct routing.

## Decision Drivers

- **False positive risk**: "OK" is a common word in normal conversation. If a coach sends "OK I'll check the training session notes for Sean's progress", it should NOT trigger batch-apply
- **Handler ordering**: CONFIRM/RETRY/CANCEL (Phase 1) must not conflict with OK/R (Phase 2)
- **State awareness**: some commands are only valid when there is pending state (e.g., "OK" only works if there are matched pending insights)
- **Discoverability**: coaches learn commands from WhatsApp replies, not documentation

## Considered Options

### Option 1: Exact Match on Isolated Messages

Only trigger if the entire message body (trimmed, case-insensitive) is exactly the command word.

```
"ok" -> batch apply
"OK" -> batch apply
"ok " -> batch apply (after trim)
"ok thanks" -> normal processing (not exact match)
"r" -> resend link
"R" -> resend link
```

Priority chain:
1. Exact match `^(ok|yes|apply|go)$` (after trim, case-insensitive) AND coach has active link with pending matched
2. Exact match `^r$` AND coach has active link
3. CONFIRM/RETRY/CANCEL (existing, checks `awaiting_confirmation` state)
4. Pending org selection response
5. Normal text/audio processing

**Pros:**
- Lowest false positive risk
- Simple to implement and reason about
- Common words in sentences are never intercepted
- "OK I'll check" falls through to normal processing correctly

**Cons:**
- Slightly less forgiving (coach must send just "OK", not "OK apply")

### Option 2: Prefix Match with Command Symbol

Require a prefix like `#` or `/` for commands: `#ok`, `#r`, `/apply`.

**Pros:**
- Zero false positive risk
- Clear command intent

**Cons:**
- Unnatural in WhatsApp (coaches are used to conversational messages)
- Higher friction -- needs to be taught
- Goes against zero-friction design principle

### Option 3: NLP Intent Detection

Use AI to detect command intent from natural language.

**Pros:**
- Handles "yeah apply those" or "sure go ahead"

**Cons:**
- Requires AI API call for every message
- Adds latency and cost
- Unpredictable behavior
- Overkill for this use case

## Decision Outcome

**Chosen option: Option 1 (Exact Match on Isolated Messages)**, with the following conditions:

1. The match MUST be against the full trimmed message body, not a substring
2. The "OK" handler MUST check that the coach has an active review link with pending matched insights BEFORE applying. If no pending matched insights exist, fall through to normal processing
3. The priority chain must be clearly documented in code comments at the top of the handler

## Implementation Notes

### Priority Chain (in processIncomingMessage)

```typescript
// After org resolution, before normal processing:

// Priority 1: "OK" quick-apply (Phase 2)
if (messageType === "text" && args.body) {
  const trimmed = args.body.trim().toLowerCase();
  if (/^(ok|yes|apply|go)$/.test(trimmed)) {
    const activeLink = await getActiveLinkForCoach(ctx, coachId, orgId);
    if (activeLink && hasPendingMatchedInsights(activeLink)) {
      await batchApplyMatched(ctx, activeLink);
      await sendReply(phoneNumber, formatBatchApplyResult(...));
      return { success: true, messageId };
    }
    // No active link or no pending matched -- fall through to normal processing
  }

  // Priority 2: "R" resend link (Phase 2)
  if (/^r$/i.test(trimmed)) {
    const activeLink = await getActiveLinkForCoach(ctx, coachId, orgId);
    if (activeLink) {
      await sendReply(phoneNumber, formatResendMessage(activeLink));
      return { success: true, messageId };
    }
    // No active link -- fall through
  }

  // Priority 3: CONFIRM/RETRY/CANCEL (Phase 1, existing)
  // Already implemented -- checks awaiting_confirmation state
}
```

### Key Safety: Fall-Through Behavior

If "OK" is sent but there are no pending matched insights, the message falls through to normal text processing. This is CRITICAL -- it means "OK" never silently does nothing. Either it batch-applies (and confirms), or it becomes a new voice note.

### WhatsApp Reply Format

When "OK" triggers batch-apply:
```
Applied 5 insights!
3 items still need review: playerarc.com/r/Ab3xK9mN
```

When "R" resends link:
```
Here's your review link:
playerarc.com/r/Ab3xK9mN (expires in 23h)

5 pending: 2 injuries, 1 unmatched, 2 needs review
```

### Future: Expanded Command Set

If Phase 3+ adds more commands, consider a command registry pattern:

```typescript
const commands: CommandHandler[] = [
  { pattern: /^(ok|yes|apply|go)$/i, handler: handleOkCommand, requiresLink: true },
  { pattern: /^r$/i, handler: handleResendCommand, requiresLink: true },
  // Phase 3 candidates:
  // { pattern: /^(skip|snooze)$/i, handler: handleSnoozeCommand },
  // { pattern: /^(help|\?)$/i, handler: handleHelpCommand },
];
```

## Consequences

**Positive:**
- Zero false positives on normal messages (exact match only)
- Clear, documented priority chain
- Safe fall-through behavior
- Easy to extend with new commands

**Negative:**
- Coach must send exactly "OK" (not "ok apply them") -- mitigated by WhatsApp replies always showing the exact command format
- Adding new command words requires checking for collisions with the existing chain

## References

- Current processIncomingMessage: `packages/backend/convex/actions/whatsapp.ts` lines 41-375
- Phase 1 CONFIRM/RETRY/CANCEL: same file, lines 244-311
- Phase 2 PRD: US-VN-011 acceptance criteria
