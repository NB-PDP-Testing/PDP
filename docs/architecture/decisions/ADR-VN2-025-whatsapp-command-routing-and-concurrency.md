# ADR-VN2-025: WhatsApp Command Routing and Concurrency

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-020

## Context and Problem Statement

WhatsApp text messages from coaches can be one of:
1. A **command** (CONFIRM, CANCEL, TWINS = ...) for the drafts workflow
2. A **v1 confirmation response** (YES/CONFIRM/RETRY for transcript quality gates)
3. A **review link quick-reply** (OK, R, SNOOZE for Phase 2.5 review links)
4. A **normal text note** (coach dictating observations)

We need to determine:
- Where command parsing is inserted in `processIncomingMessage`
- How to avoid false positives (e.g., coach writes "Yes, John confirmed his attendance" gets parsed as CONFIRM)
- How to handle race conditions when multiple messages arrive quickly

## Current Message Routing (Priority Order)

From `whatsapp.ts` lines 255-415:

1. **Priority 1**: Quick-reply commands for review links (OK, R, SNOOZE) -- lines 255-280
2. **Priority 2**: Active review link detection -- lines 282-303
3. **Priority 3**: Pending v1 confirmation response (YES/CONFIRM/RETRY/CANCEL) -- lines 307-373
4. **Priority 4**: Normal processing (audio or text) -- lines 384-415

## Analysis

### Where Should v2 Command Parsing Go?

**Option A**: Before Priority 3 (v1 confirmation)
- Risk: If coach has BOTH pending v1 confirmation AND pending v2 drafts, "YES" would trigger v2 instead of v1
- This breaks the existing v1 flow

**Option B**: After Priority 3, before Priority 4 (normal processing)
- Correct: v1 confirmation takes precedence (backward compat)
- v2 commands only checked if no v1 confirmation is pending
- Normal processing only happens if it's not a command

**Option C**: After feature flag check inside processTextMessage
- Too late: by this point we've already sent "Note received. Processing..."
- Coach would get the ack message AND the command response

### False Positive Prevention

The current v1 commands are very simple: `OK`, `R`, `YES`, `CONFIRM`, `CANCEL`, `SNOOZE`. These are parsed with regex on the full message body.

Phase 6 commands are:
- `CONFIRM` / `YES` -- overlaps with v1
- `CONFIRM 1,2,3` -- specific draft numbers, no v1 overlap
- `CANCEL` / `NO` -- overlaps with v1
- `TWINS = Emma & Niamh` -- unique pattern, no overlap

**Key insight**: The overlap with v1 commands is already handled by Priority 3. If a v1 confirmation is pending, Priority 3 catches `YES`/`CONFIRM`/`CANCEL` first. Phase 6 commands only reach the parser when no v1 confirmation is pending.

For the command parser itself, we need to ensure:
- "Yes, John confirmed his attendance" is NOT parsed as a command (it contains more than just the keyword)
- "CONFIRM" alone IS a command
- "CONFIRM 1,2,3" IS a command (keyword + number list pattern)

The parser should use **anchored patterns** (`^...$`) to match only when the entire message (trimmed) is a command, not when a keyword appears somewhere in a longer message.

### Race Conditions

**Scenario**: Coach sends voice note. Before drafts are generated, coach sends "CONFIRM".

1. Voice note triggers: processAudioMessage -> transcribe -> extractClaims -> resolveEntities -> generateDrafts (takes 30-60s)
2. "CONFIRM" arrives: parsed as command, but no pending drafts exist yet

**Solution**: The command handler checks for pending drafts. If none exist, respond: "No pending updates to confirm. Your voice note is still being processed." This is a natural guard -- the handler simply has nothing to act on.

**Scenario**: Coach sends "CONFIRM" while draft generation is mid-flight (some drafts created, others not yet).

This is safe because Convex mutations are serializable. The confirmAll mutation will confirm whatever drafts exist at that moment. Any drafts created after the mutation completes will remain pending and the coach can confirm them with another message.

**Scenario**: Coach sends "CONFIRM" twice quickly.

The second CONFIRM will find no pending drafts (first already confirmed them) and respond accordingly.

## Decision

### Routing: Option B -- Insert v2 command check between Priority 3 and Priority 4

```typescript
// Priority 3.5: US-VN-020: Check for v2 draft commands
if (messageType === "text" && args.body) {
  const useV2 = await ctx.runQuery(
    internal.lib.featureFlags.shouldUseV2Pipeline,
    { organizationId: organization.id, userId: coachContext.coachId }
  );

  if (useV2) {
    const { parseCommand } = await import("../lib/whatsappCommands");
    const command = parseCommand(args.body);

    if (command) {
      const response = await ctx.runAction(
        internal.actions.whatsappCommandHandler.handleCommand,
        {
          coachUserId: coachContext.coachId,
          organizationId: organization.id,
          command,
        }
      );
      await sendWhatsAppMessage(phoneNumber, response);
      return { success: true, messageId };
    }
  }
}

// Priority 4: Normal processing (existing code)
```

### Parser: Anchored Patterns Only

The `parseCommand` function must use anchored regex to avoid false positives:

```typescript
// Anchored to full message (trimmed)
const trimmed = text.trim();

// CONFIRM or YES (alone)
if (/^(confirm|yes)$/i.test(trimmed)) return { type: "confirm_all" };

// CONFIRM 1,2,3 or YES 1,2,3
const specificMatch = trimmed.match(/^(confirm|yes)\s+([\d,\s]+)$/i);
if (specificMatch) {
  const numbers = specificMatch[2].split(/[,\s]+/).map(Number).filter(n => n > 0);
  return { type: "confirm_specific", draftNumbers: numbers };
}

// CANCEL or NO (alone)
if (/^(cancel|no)$/i.test(trimmed)) return { type: "cancel" };

// ENTITY_MAPPING: WORD = Name & Name (with optional team context)
const mappingMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/i);
if (mappingMatch) { /* parse names */ }

// Not a command
return null;
```

### Concurrency: No Locks Needed

Convex's serializable transactions handle the natural race conditions. The handler should:
1. Query pending drafts
2. If none found, return informative message
3. If found, process them
4. Convex ensures consistency

## Consequences

**Positive**: Clean priority chain. No false positives from embedded keywords. Feature-flag gated so v1 coaches are unaffected. Natural concurrency safety from Convex.
**Negative**: The v2 feature flag check adds one extra query to every text message for v2-enabled coaches, even if the message is not a command. This is acceptable (single index lookup, < 1ms).
