# ADR-VN2-031: WhatsApp Command Handler as InternalAction

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-020

## Context and Problem Statement

The command handler processes CONFIRM/CANCEL/entity-mapping commands. The Phase 6 PRD says it should be an `action`. But should it be a public action or an internalAction? And should it call public or internal mutations?

## Analysis

### Caller Context

The command handler is called from `processIncomingMessage` in `whatsapp.ts`, which is itself an `internalAction`. Therefore:

1. The caller already has `coachUserId` and `organizationId` from the phone number lookup
2. There is no browser client calling this -- it's always server-to-server
3. The caller has already authenticated the coach via phone number matching

### InternalAction vs Action

Since the command handler is only called from another internalAction, it should be an `internalAction` to:
- Avoid unnecessary auth checks (the caller already verified the coach)
- Access internal mutations directly (not public mutations)
- Follow the pattern established in Phases 3-5

### InternalAction vs Inline Code

**Option A**: Create `actions/whatsappCommandHandler.ts` as a separate `internalAction`
- Called via `ctx.scheduler.runAfter(0, ...)` from processIncomingMessage
- Problem: We need the response message synchronously to send back via WhatsApp in the same request

**Option B**: Create `actions/whatsappCommandHandler.ts` as an `internalAction` called via `ctx.runAction`
- Called synchronously: `const response = await ctx.runAction(internal.actions.whatsappCommandHandler.handleCommand, {...})`
- Problem: `ctx.runAction` from within an action is valid in Convex

**Option C**: Implement as a helper function called directly within processIncomingMessage
- No separate action -- just a function imported from `lib/whatsappCommandHandler.ts`
- The function receives `ctx` and performs mutations directly
- Simplest, but mixes concerns in the already-large whatsapp.ts

### Best Approach

**Option B** is correct. The command handler needs to:
1. Query pending drafts (requires ctx.runQuery)
2. Update draft statuses (requires ctx.runMutation)
3. Return a response message string (needed by the caller)

Using `ctx.runAction` allows the handler to be a self-contained internalAction with its own error handling while returning the response synchronously.

However, there is a subtlety: **Convex does not allow `ctx.runAction` from within an action**. Actions can only call `ctx.runQuery` and `ctx.runMutation`, plus `ctx.scheduler.runAfter` for async scheduling.

This means Option B is NOT viable.

### Revised Approach: Helper Functions in lib/

Since the command handler needs to:
1. Read data (pending drafts) -- via `ctx.runQuery`
2. Write data (confirm/reject drafts) -- via `ctx.runMutation`
3. Return a string synchronously

The cleanest solution is to implement it as an **async helper function** that receives the action context and is called directly from processIncomingMessage:

```typescript
// lib/whatsappCommandHandler.ts
export async function handleCommand(
  ctx: ActionCtx,
  args: {
    coachUserId: string;
    organizationId: string;
    command: Command;
  }
): Promise<string> {
  // Use ctx.runQuery and ctx.runMutation
  // Return response message
}
```

This keeps the logic separated in its own file while allowing synchronous response generation.

## Decision

### Parser: `lib/whatsappCommands.ts` (pure function)

```typescript
export function parseCommand(text: string): Command | null {
  // Pure function, no side effects, fully testable
}
```

### Handler: `lib/whatsappCommandHandler.ts` (async helper)

```typescript
import type { ActionCtx } from "../_generated/server";

export async function handleCommand(
  ctx: ActionCtx,
  args: { coachUserId: string; organizationId: string; command: Command }
): Promise<string> {
  // Uses ctx.runQuery and ctx.runMutation
  // Returns WhatsApp response message
}
```

### Integration in whatsapp.ts

```typescript
// Inside processIncomingMessage, after Priority 3:
if (messageType === "text" && args.body) {
  const useV2 = await ctx.runQuery(
    internal.lib.featureFlags.shouldUseV2Pipeline,
    { organizationId: organization.id, userId: coachContext.coachId }
  );

  if (useV2) {
    const { parseCommand } = await import("../lib/whatsappCommands");
    const command = parseCommand(args.body);

    if (command) {
      const { handleCommand } = await import("../lib/whatsappCommandHandler");
      const response = await handleCommand(ctx, {
        coachUserId: coachContext.coachId,
        organizationId: organization.id,
        command,
      });
      await sendWhatsAppMessage(phoneNumber, response);
      return { success: true, messageId };
    }
  }
}
```

### Internal Mutations Only

The handler calls internal mutations (not public) for draft operations:
- `internal.models.insightDrafts.confirmDraftInternal`
- `internal.models.insightDrafts.rejectDraftInternal`
- `internal.models.insightDrafts.getDraftsByOrgAndCoachAndStatus` (internalQuery)

This follows the Phase 3+ pattern of "internalActions should call internal mutations, NOT public mutations."

## Consequences

**Positive**: Clean separation of concerns. Parser is fully testable (pure function). Handler is in its own file but called synchronously (no scheduler needed). Follows established patterns.
**Negative**: The handler is a plain async function, not a Convex function. It cannot be independently scheduled or tested via the Convex dashboard. For Phase 6 this is acceptable since the handler is always called from processIncomingMessage.
