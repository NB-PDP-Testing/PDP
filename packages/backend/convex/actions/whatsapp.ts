"use node";

import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

// Regex patterns at top level for performance
const WHATSAPP_PREFIX_REGEX = /^whatsapp:/;

/**
 * WhatsApp Integration via Twilio
 *
 * This module handles incoming WhatsApp messages from coaches,
 * processes them into voice notes, and applies trust-based auto-apply logic.
 *
 * Flow:
 * 1. Webhook receives message from Twilio
 * 2. Store raw message in whatsappMessages table
 * 3. Match phone number to coach
 * 4. Create voice note (text or audio)
 * 5. After insights are built, auto-apply based on trust level
 * 6. Send WhatsApp reply with results
 */

// ============================================================
// TWILIO WEBHOOK PROCESSING
// ============================================================

/**
 * Process an incoming WhatsApp message from the webhook.
 * This is called by the HTTP handler after validating the request.
 */
export const processIncomingMessage = internalAction({
  args: {
    messageSid: v.string(),
    accountSid: v.string(),
    from: v.string(), // "whatsapp:+353851234567"
    to: v.string(),
    body: v.optional(v.string()),
    numMedia: v.number(),
    mediaUrl: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.id("whatsappMessages")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log("[WhatsApp] Processing incoming message:", args.messageSid);

    // Extract phone number (remove "whatsapp:" prefix)
    const phoneNumber = args.from.replace(WHATSAPP_PREFIX_REGEX, "");
    const toNumber = args.to.replace(WHATSAPP_PREFIX_REGEX, "");

    // Determine message type
    let messageType: "text" | "audio" | "image" | "video" | "document" = "text";
    if (args.numMedia > 0 && args.mediaContentType) {
      if (args.mediaContentType.startsWith("audio/")) {
        messageType = "audio";
      } else if (args.mediaContentType.startsWith("image/")) {
        messageType = "image";
      } else if (args.mediaContentType.startsWith("video/")) {
        messageType = "video";
      } else {
        messageType = "document";
      }
    }

    // Store raw message
    const messageId = await ctx.runMutation(
      internal.models.whatsappMessages.createMessage,
      {
        messageSid: args.messageSid,
        accountSid: args.accountSid,
        fromNumber: phoneNumber,
        toNumber,
        messageType,
        body: args.body,
        mediaUrl: args.mediaUrl,
        mediaContentType: args.mediaContentType,
      }
    );

    console.log("[WhatsApp] Message stored:", messageId);

    // Look up coach by phone number
    const coachInfo = await ctx.runQuery(
      internal.models.whatsappMessages.findCoachByPhone,
      { phoneNumber }
    );

    if (!coachInfo) {
      console.log("[WhatsApp] No coach found for phone:", phoneNumber);

      // Update message as unmatched
      await ctx.runMutation(internal.models.whatsappMessages.updateStatus, {
        messageId,
        status: "unmatched",
        errorMessage: `No coach account linked to phone number ${phoneNumber}`,
      });

      // Send reply about unmatched number
      await sendWhatsAppMessage(
        phoneNumber,
        `Your phone number isn't linked to a coach account in PlayerArc. Please add your phone number in the app settings, or contact your club administrator.`
      );

      return { success: false, messageId, error: "Phone number not matched" };
    }

    console.log(
      "[WhatsApp] Coach found:",
      coachInfo.coachName,
      "Org:",
      coachInfo.organizationId
    );

    // Update message with coach info
    await ctx.runMutation(internal.models.whatsappMessages.updateCoachInfo, {
      messageId,
      coachId: coachInfo.coachId,
      coachName: coachInfo.coachName,
      organizationId: coachInfo.organizationId,
    });

    // Send immediate acknowledgment
    const orgName = coachInfo.organizationName || "your club";
    const ackMessage =
      messageType === "audio"
        ? `Voice note received for ${orgName}. Transcribing...`
        : `Note received for ${orgName}. Processing...`;

    await sendWhatsAppMessage(phoneNumber, ackMessage);

    // Process the message based on type
    try {
      if (messageType === "audio" && args.mediaUrl) {
        // Download audio from Twilio and create recorded note
        await processAudioMessage(ctx, {
          messageId,
          mediaUrl: args.mediaUrl,
          coachId: coachInfo.coachId,
          organizationId: coachInfo.organizationId,
          phoneNumber,
        });
      } else if (messageType === "text" && args.body) {
        // Create typed note directly
        await processTextMessage(ctx, {
          messageId,
          text: args.body,
          coachId: coachInfo.coachId,
          organizationId: coachInfo.organizationId,
          phoneNumber,
        });
      } else {
        // Unsupported message type
        await ctx.runMutation(internal.models.whatsappMessages.updateStatus, {
          messageId,
          status: "failed",
          errorMessage: `Unsupported message type: ${messageType}`,
        });

        await sendWhatsAppMessage(
          phoneNumber,
          `Sorry, I can only process text messages and voice notes. Images and videos aren't supported yet.`
        );

        return { success: false, messageId, error: "Unsupported message type" };
      }

      return { success: true, messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[WhatsApp] Processing failed:", errorMessage);

      await ctx.runMutation(internal.models.whatsappMessages.updateStatus, {
        messageId,
        status: "failed",
        errorMessage,
      });

      await sendWhatsAppMessage(
        phoneNumber,
        "Sorry, there was an error processing your message. Please try again or use the app directly."
      );

      return { success: false, messageId, error: errorMessage };
    }
  },
});

/**
 * Process an audio message - download from Twilio and create voice note
 */
async function processAudioMessage(
  ctx: any,
  args: {
    messageId: Id<"whatsappMessages">;
    mediaUrl: string;
    coachId: string;
    organizationId: string;
    phoneNumber: string;
  }
) {
  console.log("[WhatsApp] Downloading audio from Twilio...");

  // Get Twilio credentials
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!(accountSid && authToken)) {
    throw new Error("Twilio credentials not configured");
  }

  // Download audio from Twilio (requires authentication)
  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64"
  );
  const response = await fetch(args.mediaUrl, {
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const audioBlob = new Blob([audioBuffer], { type: "audio/ogg" });

  console.log("[WhatsApp] Audio downloaded, size:", audioBuffer.byteLength);

  // Upload to Convex storage
  const uploadUrl = await ctx.storage.generateUploadUrl();
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "audio/ogg" },
    body: audioBlob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload audio to storage");
  }

  const { storageId } = await uploadResponse.json();
  console.log("[WhatsApp] Audio uploaded to storage:", storageId);

  // Update message with storage ID
  await ctx.runMutation(internal.models.whatsappMessages.updateMediaStorage, {
    messageId: args.messageId,
    mediaStorageId: storageId,
  });

  // Create voice note (this triggers transcription -> insights pipeline)
  const noteId = await ctx.runMutation(
    api.models.voiceNotes.createRecordedNote,
    {
      orgId: args.organizationId,
      coachId: args.coachId,
      audioStorageId: storageId,
      noteType: "general",
      source: "whatsapp_audio",
    }
  );

  console.log("[WhatsApp] Voice note created:", noteId);

  // Link voice note to WhatsApp message
  await ctx.runMutation(internal.models.whatsappMessages.linkVoiceNote, {
    messageId: args.messageId,
    voiceNoteId: noteId,
  });

  // Schedule auto-apply check after insights are built (give it 30 seconds)
  await ctx.scheduler.runAfter(
    30_000,
    internal.actions.whatsapp.checkAndAutoApply,
    {
      messageId: args.messageId,
      voiceNoteId: noteId,
      coachId: args.coachId,
      organizationId: args.organizationId,
      phoneNumber: args.phoneNumber,
    }
  );
}

/**
 * Process a text message - create typed voice note
 */
async function processTextMessage(
  ctx: any,
  args: {
    messageId: Id<"whatsappMessages">;
    text: string;
    coachId: string;
    organizationId: string;
    phoneNumber: string;
  }
) {
  console.log("[WhatsApp] Creating typed note from text message");

  // Create voice note (this triggers insights pipeline)
  const noteId = await ctx.runMutation(api.models.voiceNotes.createTypedNote, {
    orgId: args.organizationId,
    coachId: args.coachId,
    noteText: args.text,
    noteType: "general",
    source: "whatsapp_text",
  });

  console.log("[WhatsApp] Typed note created:", noteId);

  // Link voice note to WhatsApp message
  await ctx.runMutation(internal.models.whatsappMessages.linkVoiceNote, {
    messageId: args.messageId,
    voiceNoteId: noteId,
  });

  // Schedule auto-apply check after insights are built (give it 15 seconds for text)
  await ctx.scheduler.runAfter(
    15_000,
    internal.actions.whatsapp.checkAndAutoApply,
    {
      messageId: args.messageId,
      voiceNoteId: noteId,
      coachId: args.coachId,
      organizationId: args.organizationId,
      phoneNumber: args.phoneNumber,
    }
  );
}

// ============================================================
// AUTO-APPLY LOGIC
// ============================================================

/**
 * Check if insights are ready and auto-apply based on trust level.
 * Called after a delay to allow transcription and insights to complete.
 */
export const checkAndAutoApply = internalAction({
  args: {
    messageId: v.id("whatsappMessages"),
    voiceNoteId: v.id("voiceNotes"),
    coachId: v.string(),
    organizationId: v.string(),
    phoneNumber: v.string(),
    retryCount: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const retryCount = args.retryCount ?? 0;
    const maxRetries = 5;

    console.log("[WhatsApp] Checking insights status, retry:", retryCount);

    // Get the voice note
    const voiceNote = await ctx.runQuery(internal.models.voiceNotes.getNote, {
      noteId: args.voiceNoteId,
    });

    if (!voiceNote) {
      console.error("[WhatsApp] Voice note not found:", args.voiceNoteId);
      await sendWhatsAppMessage(
        args.phoneNumber,
        "There was an error processing your note. Please try again."
      );
      return null;
    }

    // Check if insights are ready
    if (voiceNote.insightsStatus !== "completed") {
      if (retryCount < maxRetries) {
        console.log("[WhatsApp] Insights not ready, scheduling retry...");
        // Retry after 10 seconds
        await ctx.scheduler.runAfter(
          10_000,
          internal.actions.whatsapp.checkAndAutoApply,
          {
            ...args,
            retryCount: retryCount + 1,
          }
        );
        return null;
      }
      console.log(
        "[WhatsApp] Max retries reached, insights status:",
        voiceNote.insightsStatus
      );

      // Send status update even if insights failed
      if (voiceNote.insightsStatus === "failed") {
        await sendWhatsAppMessage(
          args.phoneNumber,
          "Your note was saved but AI analysis failed. You can view it in the app."
        );
      } else {
        await sendWhatsAppMessage(
          args.phoneNumber,
          "Your note is still being processed. Check the app for updates."
        );
      }
      return null;
    }

    console.log("[WhatsApp] Insights ready, count:", voiceNote.insights.length);

    // Get coach's trust level
    const trustLevel = await ctx.runQuery(
      api.models.coachTrustLevels.getCoachTrustLevel,
      { organizationId: args.organizationId }
    );

    console.log("[WhatsApp] Coach trust level:", trustLevel.currentLevel);

    // Process insights based on trust level
    const results = await applyInsightsWithTrust(ctx, {
      voiceNote,
      trustLevel: trustLevel.currentLevel,
      coachId: args.coachId,
      organizationId: args.organizationId,
    });

    // Update WhatsApp message with processing results
    await ctx.runMutation(
      internal.models.whatsappMessages.updateProcessingResults,
      {
        messageId: args.messageId,
        processingResults: results,
      }
    );

    // Send detailed follow-up message
    const replyMessage = formatResultsMessage(results, trustLevel.currentLevel);
    await sendWhatsAppMessage(args.phoneNumber, replyMessage);

    return null;
  },
});

/**
 * Apply insights based on coach's trust level
 */
async function applyInsightsWithTrust(
  ctx: any,
  args: {
    voiceNote: any;
    trustLevel: number;
    coachId: string;
    organizationId: string;
  }
): Promise<{
  autoApplied: Array<{
    insightId: string;
    playerName?: string;
    teamName?: string;
    category: string;
    title: string;
    parentSummaryQueued: boolean;
  }>;
  needsReview: Array<{
    insightId: string;
    playerName?: string;
    category: string;
    title: string;
    reason: string;
  }>;
  unmatched: Array<{
    insightId: string;
    mentionedName?: string;
    title: string;
  }>;
}> {
  const results = {
    autoApplied: [] as any[],
    needsReview: [] as any[],
    unmatched: [] as any[],
  };

  // Sensitive categories that NEVER auto-apply
  const sensitiveCategories = ["injury", "behavior"];

  // Categories that can auto-apply at trust level 2+
  const safeCategories = [
    "skill_progress",
    "skill_rating",
    "performance",
    "attendance",
    "team_culture",
    "todo",
  ];

  for (const insight of args.voiceNote.insights) {
    // Skip already applied/dismissed insights
    if (insight.status !== "pending") {
      continue;
    }

    const category = insight.category || "other";

    // Check if player/team is matched
    const hasPlayer = !!insight.playerIdentityId;
    const hasTeam = !!insight.teamId;
    const isTeamInsight = category === "team_culture";

    // Unmatched insights (no player for player insights, no team for team insights)
    if (!(hasPlayer || isTeamInsight)) {
      results.unmatched.push({
        insightId: insight.id,
        mentionedName: insight.playerName,
        title: insight.title,
      });
      continue;
    }

    if (isTeamInsight && !hasTeam) {
      results.unmatched.push({
        insightId: insight.id,
        mentionedName: insight.teamName,
        title: insight.title,
      });
      continue;
    }

    // Sensitive categories always need review
    if (sensitiveCategories.includes(category)) {
      results.needsReview.push({
        insightId: insight.id,
        playerName: insight.playerName,
        category,
        title: insight.title,
        reason: "sensitive",
      });
      continue;
    }

    // Check trust level for auto-apply
    if (args.trustLevel < 2) {
      // Trust level 0-1: All insights need review
      results.needsReview.push({
        insightId: insight.id,
        playerName: insight.playerName || insight.teamName,
        category,
        title: insight.title,
        reason: "low_trust",
      });
      continue;
    }

    // Trust level 2+: Auto-apply safe categories
    if (safeCategories.includes(category)) {
      // Special handling for TODOs - they need an assignee to be applied
      if (category === "todo" && !insight.assigneeUserId) {
        results.needsReview.push({
          insightId: insight.id,
          playerName: insight.playerName,
          category,
          title: insight.title,
          reason: "todo_needs_assignment",
        });
        continue;
      }

      try {
        // Apply the insight
        await ctx.runMutation(api.models.voiceNotes.updateInsightStatus, {
          noteId: args.voiceNote._id,
          insightId: insight.id,
          status: "applied",
        });

        // Check if parent summary will be queued (only at level 3)
        const parentSummaryQueued = args.trustLevel >= 3 && hasPlayer;

        results.autoApplied.push({
          insightId: insight.id,
          playerName: insight.playerName,
          teamName: insight.teamName,
          category,
          title: insight.title,
          parentSummaryQueued,
        });
      } catch (error) {
        console.error("[WhatsApp] Failed to apply insight:", insight.id, error);
        results.needsReview.push({
          insightId: insight.id,
          playerName: insight.playerName,
          category,
          title: insight.title,
          reason: "apply_failed",
        });
      }
    } else {
      // Unknown category - needs review
      results.needsReview.push({
        insightId: insight.id,
        playerName: insight.playerName,
        category,
        title: insight.title,
        reason: "unknown_category",
      });
    }
  }

  return results;
}

/**
 * Format the results into a WhatsApp-friendly message
 */
function formatResultsMessage(
  results: {
    autoApplied: any[];
    needsReview: any[];
    unmatched: any[];
  },
  _trustLevel: number
): string {
  const lines: string[] = ["Analysis complete!"];
  lines.push("");

  // Auto-applied insights
  if (results.autoApplied.length > 0) {
    lines.push(`Auto-applied (${results.autoApplied.length}):`);
    for (const insight of results.autoApplied.slice(0, 5)) {
      const name = insight.playerName || insight.teamName || "Unknown";
      const categoryDisplay = formatCategory(insight.category);
      const parentNote = insight.parentSummaryQueued ? " -> Parent" : "";
      lines.push(`- ${name}: ${categoryDisplay}${parentNote}`);
    }
    if (results.autoApplied.length > 5) {
      lines.push(`  ...and ${results.autoApplied.length - 5} more`);
    }
    lines.push("");
  }

  // Needs review
  if (results.needsReview.length > 0) {
    lines.push(`Needs review (${results.needsReview.length}):`);
    for (const insight of results.needsReview.slice(0, 3)) {
      const name = insight.playerName || "Unknown";
      const categoryDisplay = formatCategory(insight.category);
      lines.push(`- ${name}: ${categoryDisplay}`);
    }
    if (results.needsReview.length > 3) {
      lines.push(`  ...and ${results.needsReview.length - 3} more`);
    }
    lines.push("");
  }

  // Unmatched
  if (results.unmatched.length > 0) {
    lines.push(`Unmatched (${results.unmatched.length}):`);
    for (const insight of results.unmatched.slice(0, 3)) {
      const name = insight.mentionedName || "Unknown";
      lines.push(`- '${name}' not in roster`);
    }
    if (results.unmatched.length > 3) {
      lines.push(`  ...and ${results.unmatched.length - 3} more`);
    }
    lines.push("");
  }

  // Summary based on what needs attention
  const totalPending = results.needsReview.length + results.unmatched.length;
  if (totalPending > 0) {
    lines.push(`Review ${totalPending} pending: playerarc.com/insights`);
  } else if (results.autoApplied.length > 0) {
    lines.push("All insights applied!");
  } else {
    lines.push("No actionable insights found.");
  }

  return lines.join("\n");
}

/**
 * Format category for display
 */
function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    skill_progress: "Skill",
    skill_rating: "Rating",
    performance: "Performance",
    attendance: "Attendance",
    team_culture: "Team",
    todo: "Task",
    injury: "Injury",
    behavior: "Behavior",
  };
  return categoryMap[category] || category;
}

// ============================================================
// TWILIO API
// ============================================================

/**
 * Send a WhatsApp message via Twilio API
 */
async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!(accountSid && authToken && fromNumber)) {
    console.error("[WhatsApp] Twilio credentials not configured");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString(
      "base64"
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:${fromNumber}`,
        To: `whatsapp:${to}`,
        Body: body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[WhatsApp] Failed to send message:", error);
      return false;
    }

    console.log("[WhatsApp] Message sent to:", to);
    return true;
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error);
    return false;
  }
}
