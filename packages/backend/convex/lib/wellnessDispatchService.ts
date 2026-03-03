/**
 * WellnessDispatchService — Channel Abstraction Layer
 *
 * The ONLY entry point for sending wellness check messages.
 * Routes to the correct API based on player.wellnessChannel:
 *   - 'whatsapp_flows'     → Meta WhatsApp Business Cloud API (sendFlowMessage)
 *   - 'sms_conversational' → Twilio (creates session + sends first question)
 *
 * Adding a new channel (email, Slack, Teams) only requires adding a new
 * case here — the daily cron never calls either API directly.
 */

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

export type WellnessDispatchPlayer = {
  playerIdentityId: string;
  phoneNumber: string; // E.164 format
  playerName: string;
  orgName: string;
  wellnessChannel: "whatsapp_flows" | "sms_conversational";
  enabledDimensions: string[];
  organizationId: string;
};

export type WellnessDispatchResult = {
  sent: boolean;
  channel: "whatsapp_flows" | "sms_conversational";
  messageId?: string;
  sessionId?: string;
  error?: string;
};

/**
 * Send a wellness check to a player via their configured channel.
 * Returns a result indicating success/failure and the channel used.
 */
export function sendWellnessCheck(
  ctx: ActionCtx,
  player: WellnessDispatchPlayer
): Promise<WellnessDispatchResult> {
  const { wellnessChannel } = player;

  if (wellnessChannel === "whatsapp_flows") {
    return sendViaWhatsappFlows(ctx, player);
  }

  if (wellnessChannel === "sms_conversational") {
    return sendViaSmsConversational(ctx, player);
  }

  // Exhaustive check — TypeScript will catch this if channel union grows
  const _exhaustive: never = wellnessChannel;
  return Promise.resolve({
    sent: false,
    channel: wellnessChannel,
    error: `Unknown channel: ${wellnessChannel}`,
  });
}

// ============================================================
// PRIVATE: WhatsApp Flows channel
// ============================================================

async function sendViaWhatsappFlows(
  ctx: ActionCtx,
  player: WellnessDispatchPlayer
): Promise<WellnessDispatchResult> {
  try {
    const result = await ctx.runAction(
      internal.actions.metaWhatsapp.sendFlowMessage,
      {
        toPhoneNumber: player.phoneNumber,
        playerName: player.playerName,
        orgName: player.orgName,
      }
    );

    if (result.success) {
      return {
        sent: true,
        channel: "whatsapp_flows",
        messageId: result.messageId,
      };
    }

    return {
      sent: false,
      channel: "whatsapp_flows",
      error: result.error,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[WellnessDispatch] WhatsApp Flows error for player ${player.playerIdentityId}:`,
      errMsg
    );
    return {
      sent: false,
      channel: "whatsapp_flows",
      error: errMsg,
    };
  }
}

// ============================================================
// PRIVATE: SMS/Conversational channel (Twilio)
// ============================================================

async function sendViaSmsConversational(
  ctx: ActionCtx,
  player: WellnessDispatchPlayer
): Promise<WellnessDispatchResult> {
  try {
    // Create a wellness session record first
    const sessionId = await ctx.runMutation(
      internal.models.whatsappWellness.createWellnessSession,
      {
        playerIdentityId: player.playerIdentityId as Id<"playerIdentities">,
        organizationId: player.organizationId,
        phoneNumber: player.phoneNumber,
        enabledDimensions: player.enabledDimensions,
      }
    );

    // Send first question via Twilio
    if (player.enabledDimensions.length === 0) {
      return {
        sent: false,
        channel: "sms_conversational",
        error: "No enabled dimensions — nothing to ask",
      };
    }

    const firstDimension = player.enabledDimensions[0];
    const questionText = getDimensionQuestion(firstDimension);

    await ctx.runAction(internal.actions.whatsapp.sendConversationalQuestion, {
      phoneNumber: player.phoneNumber,
      question: questionText,
      dimensionNumber: 1,
      totalDimensions: player.enabledDimensions.length,
    });

    return {
      sent: true,
      channel: "sms_conversational",
      sessionId: sessionId as string,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[WellnessDispatch] SMS error for player ${player.playerIdentityId}:`,
      errMsg
    );
    return {
      sent: false,
      channel: "sms_conversational",
      error: errMsg,
    };
  }
}

// ============================================================
// HELPERS
// ============================================================

const DIMENSION_QUESTIONS: Record<string, string> = {
  sleepQuality: "How would you rate your sleep last night?",
  energyLevel: "How is your energy level today?",
  foodIntake: "How would you rate your food intake today?",
  waterIntake: "How well have you been hydrating today?",
  mood: "How would you describe your mood today?",
  motivation: "How motivated are you for training today?",
  physicalFeeling: "How does your body feel physically today?",
  muscleRecovery: "How well have your muscles recovered since last session?",
};

export function getDimensionQuestion(dimensionKey: string): string {
  return (
    DIMENSION_QUESTIONS[dimensionKey] ??
    `How would you rate your ${dimensionKey} today?`
  );
}
