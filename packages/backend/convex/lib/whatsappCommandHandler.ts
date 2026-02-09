"use node";

/**
 * WhatsApp Command Handler - Phase 6
 *
 * Async helper called from processIncomingMessage (internalAction).
 * NOT a standalone Convex action — Convex cannot ctx.runAction from actions.
 */

import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { Command } from "./whatsappCommands";

/**
 * Handle a parsed WhatsApp command. Returns a response message string.
 */
export async function handleCommand(
  ctx: ActionCtx,
  coachUserId: string,
  organizationId: string,
  command: Command
): Promise<string> {
  switch (command.type) {
    case "confirm_all":
      return await handleConfirmAll(ctx, coachUserId, organizationId);
    case "confirm_specific":
      return await handleConfirmSpecific(
        ctx,
        coachUserId,
        organizationId,
        command.draftNumbers
      );
    case "cancel":
      return await handleCancel(ctx, coachUserId, organizationId);
    case "entity_mapping":
      return handleEntityMapping(
        coachUserId,
        organizationId,
        command.entityMapping
      );
    default:
      return "Unrecognized command.";
  }
}

async function handleConfirmAll(
  ctx: ActionCtx,
  coachUserId: string,
  organizationId: string
): Promise<string> {
  // Get pending drafts for this coach
  const drafts = await ctx.runQuery(
    internal.models.insightDrafts.getPendingDraftsInternal,
    { organizationId, coachUserId }
  );

  if (drafts.length === 0) {
    return "No pending updates to confirm.";
  }

  // Confirm each draft
  for (const draft of drafts) {
    await ctx.runMutation(internal.models.insightDrafts.confirmDraftInternal, {
      draftId: draft.draftId,
    });
    // Schedule apply
    await ctx.scheduler.runAfter(0, internal.models.insightDrafts.applyDraft, {
      draftId: draft.draftId,
    });
  }

  // Build response with player names
  const playerNames = [
    ...new Set(
      drafts
        .map((d) => d.resolvedPlayerName)
        .filter((n): n is string => n !== undefined)
    ),
  ];

  const nameList =
    playerNames.length > 0
      ? ` Updated players: ${playerNames.join(", ")}.`
      : "";

  return `Saved ${drafts.length} update${drafts.length === 1 ? "" : "s"}.${nameList}`;
}

async function handleConfirmSpecific(
  ctx: ActionCtx,
  coachUserId: string,
  organizationId: string,
  draftNumbers: number[]
): Promise<string> {
  // Get pending drafts for this coach
  const drafts = await ctx.runQuery(
    internal.models.insightDrafts.getPendingDraftsInternal,
    { organizationId, coachUserId }
  );

  if (drafts.length === 0) {
    return "No pending updates to confirm.";
  }

  // Map draft numbers to actual drafts (1-indexed displayOrder)
  let confirmed = 0;
  for (const num of draftNumbers) {
    const draft = drafts.find((d) => d.displayOrder === num);
    if (draft) {
      await ctx.runMutation(
        internal.models.insightDrafts.confirmDraftInternal,
        {
          draftId: draft.draftId,
        }
      );
      await ctx.scheduler.runAfter(
        0,
        internal.models.insightDrafts.applyDraft,
        {
          draftId: draft.draftId,
        }
      );
      confirmed += 1;
    }
  }

  return `Saved ${confirmed} of ${drafts.length} update${drafts.length === 1 ? "" : "s"}.`;
}

async function handleCancel(
  ctx: ActionCtx,
  coachUserId: string,
  organizationId: string
): Promise<string> {
  const drafts = await ctx.runQuery(
    internal.models.insightDrafts.getPendingDraftsInternal,
    { organizationId, coachUserId }
  );

  if (drafts.length === 0) {
    return "No pending updates to cancel.";
  }

  for (const draft of drafts) {
    await ctx.runMutation(internal.models.insightDrafts.rejectDraftInternal, {
      draftId: draft.draftId,
    });
  }

  return `Cancelled ${drafts.length} pending update${drafts.length === 1 ? "" : "s"}.`;
}

function handleEntityMapping(
  _coachUserId: string,
  _organizationId: string,
  entityMapping: {
    rawText: string;
    playerNames: string[];
    teamContext?: string;
  }
): string {
  // Entity mapping is a more complex feature - for now, acknowledge the mapping
  // Full implementation would resolve the group reference using fuzzy matching
  const names = entityMapping.playerNames.join(", ");
  const teamStr = entityMapping.teamContext
    ? ` (${entityMapping.teamContext})`
    : "";
  return `"${entityMapping.rawText}" mapped to ${names}${teamStr}. Reply CONFIRM to save updates.`;
}
