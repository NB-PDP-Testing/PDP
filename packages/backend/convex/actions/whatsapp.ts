"use node";

import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

// Regex patterns at top level for performance (Biome: useTopLevelRegex)
const WHATSAPP_PREFIX_REGEX = /^whatsapp:/;
const TRAILING_SLASH_REGEX = /\/+$/;

// US-VN-011: WhatsApp quick-reply command patterns (exact match only)
const OK_COMMAND_REGEX = /^(ok|yes|apply|go)$/i;
const RESEND_COMMAND_REGEX = /^r$/i;
// US-VN-012c: Snooze command pattern
const SNOOZE_COMMAND_REGEX = /^(snooze|later|remind)/i;

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
 *
 * Multi-Org Flow:
 * 1. For single-org coaches: process immediately
 * 2. For multi-org coaches:
 *    - Try to detect org from message content (explicit mention, player/team names)
 *    - Fall back to session memory (recent messages from same phone)
 *    - If ambiguous, ask for clarification via WhatsApp
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
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    messageId?: Id<"whatsappMessages">;
    error?: string;
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multi-org detection requires handling multiple code paths
  }> => {
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

    // Check if there's a pending message awaiting org selection
    // Uses runMutation because it may mark expired messages
    const pendingMessage = await ctx.runMutation(
      internal.models.whatsappMessages.getPendingMessage,
      { phoneNumber }
    );

    if (pendingMessage && args.body) {
      // This might be an org selection response
      return await handleOrgSelectionResponse(ctx, {
        phoneNumber,
        toNumber,
        messageBody: args.body,
        pendingMessage,
        newMessageSid: args.messageSid,
        accountSid: args.accountSid,
      });
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

    // US-VN-003: Duplicate message detection (exclude the message we just created)
    const duplicateCheck = await ctx.runQuery(
      internal.models.whatsappMessages.checkForDuplicateMessage,
      {
        fromNumber: phoneNumber,
        messageType,
        body: args.body,
        mediaContentType: args.mediaContentType,
        excludeMessageId: messageId,
      }
    );

    if (duplicateCheck?.isDuplicate && duplicateCheck.originalMessageId) {
      await ctx.runMutation(internal.models.whatsappMessages.markAsDuplicate, {
        messageId,
        originalMessageId: duplicateCheck.originalMessageId,
      });
      // Look up what happened with the original message
      const originalStatus = await ctx.runQuery(
        internal.models.whatsappMessages.getOriginalMessageStatus,
        { messageId: duplicateCheck.originalMessageId }
      );
      const replyMsg = buildDuplicateReply(
        duplicateCheck.timeSinceOriginal,
        originalStatus
      );
      await sendWhatsAppMessage(phoneNumber, replyMsg);
      return { success: true, messageId };
    }

    // Look up coach with org context detection
    const coachContext = await ctx.runQuery(
      internal.models.whatsappMessages.findCoachWithOrgContext,
      { phoneNumber, messageBody: args.body }
    );

    if (!coachContext) {
      // No coach found for this phone number
      await ctx.runMutation(internal.models.whatsappMessages.updateStatus, {
        messageId,
        status: "unmatched",
        errorMessage: `No coach account linked to phone number ${phoneNumber}`,
      });

      await sendWhatsAppMessage(
        phoneNumber,
        `Your phone number isn't linked to a coach account in PlayerARC. Please add your phone number in your profile settings, or contact your club administrator.`
      );

      return { success: false, messageId, error: "Phone number not matched" };
    }

    // Handle multi-org ambiguity
    if (coachContext.needsClarification) {
      // Store media if present (for audio messages)
      let mediaStorageId: Id<"_storage"> | undefined;
      if (messageType === "audio" && args.mediaUrl) {
        mediaStorageId = await downloadAndStoreMedia(ctx, args.mediaUrl);
        if (mediaStorageId) {
          await ctx.runMutation(
            internal.models.whatsappMessages.updateMediaStorage,
            { messageId, mediaStorageId }
          );
        }
      }

      // Create pending message
      await ctx.runMutation(
        internal.models.whatsappMessages.createPendingMessage,
        {
          messageSid: args.messageSid,
          phoneNumber,
          coachId: coachContext.coachId,
          coachName: coachContext.coachName,
          messageType,
          body: args.body,
          mediaUrl: args.mediaUrl,
          mediaContentType: args.mediaContentType,
          mediaStorageId,
          availableOrgs: coachContext.availableOrgs,
        }
      );

      // Update main message status
      await ctx.runMutation(internal.models.whatsappMessages.updateStatus, {
        messageId,
        status: "processing",
        errorMessage: "Awaiting org selection",
      });

      // Send clarification request
      const orgList = coachContext.availableOrgs
        .map((org, i) => `${i + 1}. ${org.name}`)
        .join("\n");

      await sendWhatsAppMessage(
        phoneNumber,
        `Hi ${coachContext.coachName}! You're a coach at multiple clubs. Which one is this note for?\n\n${orgList}\n\nReply with the number (1, 2, etc.) or club name.`
      );

      return { success: true, messageId };
    }

    // Organization is resolved - process normally
    // Safe to assert: needsClarification is false so organization is set
    const organization = coachContext.organization as {
      id: string;
      name: string;
    };
    const resolvedVia = coachContext.resolvedVia as NonNullable<
      typeof coachContext.resolvedVia
    >;

    // Update session memory
    await ctx.runMutation(internal.models.whatsappMessages.updateSession, {
      phoneNumber,
      coachId: coachContext.coachId,
      organizationId: organization.id,
      organizationName: organization.name,
      resolvedVia,
    });

    // Update message with coach info
    await ctx.runMutation(internal.models.whatsappMessages.updateCoachInfo, {
      messageId,
      coachId: coachContext.coachId,
      coachName: coachContext.coachName,
      organizationId: organization.id,
    });

    // ============================================================
    // US-VN-011: WhatsApp Quick-Reply Command Priority Chain
    // Priority: OK → R → CONFIRM/RETRY/CANCEL → normal processing
    // See ADR-VN2-005 for design rationale
    // ============================================================
    if (messageType === "text" && args.body) {
      const trimmedBody = args.body.trim();

      // Priority 1: "OK" — batch-apply all matched pending insights
      if (OK_COMMAND_REGEX.test(trimmedBody)) {
        const okResult = await handleOkCommand(ctx, {
          messageId,
          coachId: coachContext.coachId,
          organizationId: organization.id,
          phoneNumber,
        });
        if (okResult) {
          return { success: true, messageId };
        }
        // No active link or no pending matched — fall through to normal processing
      }

      // Priority 2: "R" — resend review link with pending summary
      if (RESEND_COMMAND_REGEX.test(trimmedBody)) {
        const resendResult = await handleResendCommand(ctx, {
          messageId,
          coachId: coachContext.coachId,
          organizationId: organization.id,
          phoneNumber,
        });
        if (resendResult) {
          return { success: true, messageId };
        }
        // No active link — fall through to normal processing
      }

      // Priority 2.5: SNOOZE/LATER — defer review with 2h default (US-VN-012c)
      if (SNOOZE_COMMAND_REGEX.test(trimmedBody)) {
        const snoozeResult = await handleSnoozeCommand(ctx, {
          messageId,
          coachId: coachContext.coachId,
          organizationId: organization.id,
          phoneNumber,
        });
        if (snoozeResult) {
          return { success: true, messageId };
        }
        // No active link — fall through to normal processing
      }
    }

    // Priority 3: US-VN-002: Check for pending confirmation before processing text
    if (messageType === "text" && args.body) {
      const awaitingNoteId = await ctx.runQuery(
        internal.models.voiceNotes.getAwaitingConfirmation,
        { coachId: coachContext.coachId }
      );

      if (awaitingNoteId) {
        const { parseConfirmationResponse, generateConfirmationResponse } =
          await import("../lib/feedbackMessages");
        const action = parseConfirmationResponse(args.body);

        if (action === "confirm") {
          // Resume insight extraction
          await ctx.runMutation(internal.models.voiceNotes.updateInsights, {
            noteId: awaitingNoteId,
            status: "pending",
          });
          await ctx.scheduler.runAfter(
            0,
            internal.actions.voiceNotes.buildInsights,
            { noteId: awaitingNoteId }
          );
          await ctx.scheduler.runAfter(
            15_000,
            internal.actions.whatsapp.checkAndAutoApply,
            {
              messageId,
              voiceNoteId: awaitingNoteId,
              coachId: coachContext.coachId,
              organizationId: organization.id,
              phoneNumber,
            }
          );
          await sendWhatsAppMessage(
            phoneNumber,
            generateConfirmationResponse("confirm")
          );
          return { success: true, messageId };
        }

        if (action === "retry") {
          await ctx.runMutation(internal.models.voiceNotes.updateInsights, {
            noteId: awaitingNoteId,
            status: "cancelled",
          });
          await sendWhatsAppMessage(
            phoneNumber,
            generateConfirmationResponse("retry")
          );
          return { success: true, messageId };
        }

        if (action === "cancel") {
          await ctx.runMutation(internal.models.voiceNotes.updateInsights, {
            noteId: awaitingNoteId,
            status: "cancelled",
          });
          await sendWhatsAppMessage(
            phoneNumber,
            generateConfirmationResponse("cancel")
          );
          return { success: true, messageId };
        }

        // Not a confirmation command - fall through to normal text processing
      }
    }

    // Send immediate acknowledgment (include org name for multi-org coaches)
    const isMultiOrg = coachContext.availableOrgs.length > 1;
    const ackMessage =
      messageType === "audio"
        ? `Voice note received${isMultiOrg ? ` for ${organization.name}` : ""}. Transcribing...`
        : `Note received${isMultiOrg ? ` for ${organization.name}` : ""}. Processing...`;

    await sendWhatsAppMessage(phoneNumber, ackMessage);

    // Process the message based on type
    try {
      if (messageType === "audio" && args.mediaUrl) {
        await processAudioMessage(ctx, {
          messageId,
          mediaUrl: args.mediaUrl,
          coachId: coachContext.coachId,
          organizationId: organization.id,
          phoneNumber,
        });
      } else if (messageType === "text" && args.body) {
        await processTextMessage(ctx, {
          messageId,
          text: args.body,
          coachId: coachContext.coachId,
          organizationId: organization.id,
          phoneNumber,
        });
      } else {
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
        "Sorry, there was an error processing your message. Please try again or try directly in PlayerARC."
      );

      return { success: false, messageId, error: errorMessage };
    }
  },
});

/**
 * Handle an org selection response from a multi-org coach
 */
async function handleOrgSelectionResponse(
  // biome-ignore lint/suspicious/noExplicitAny: Convex action context type
  ctx: any,
  args: {
    phoneNumber: string;
    toNumber: string;
    messageBody: string;
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic pending message type
    pendingMessage: any;
    newMessageSid: string;
    accountSid: string;
  }
): Promise<{
  success: boolean;
  messageId?: Id<"whatsappMessages">;
  error?: string;
}> {
  // Try to parse the selection
  const selectedOrg = await ctx.runQuery(
    internal.models.whatsappMessages.parseOrgSelection,
    {
      messageBody: args.messageBody,
      availableOrgs: args.pendingMessage.availableOrgs,
    }
  );

  if (!selectedOrg) {
    // Didn't understand the selection
    const orgList = args.pendingMessage.availableOrgs
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic org type
      .map((org: any, i: number) => `${i + 1}. ${org.name}`)
      .join("\n");

    await sendWhatsAppMessage(
      args.phoneNumber,
      `Sorry, I didn't understand. Please reply with the number (1, 2, etc.) or club name:\n\n${orgList}`
    );

    return { success: false, error: "Invalid org selection" };
  }

  // Mark pending message as resolved
  await ctx.runMutation(
    internal.models.whatsappMessages.resolvePendingMessage,
    { pendingMessageId: args.pendingMessage._id }
  );

  // Update session memory
  await ctx.runMutation(internal.models.whatsappMessages.updateSession, {
    phoneNumber: args.phoneNumber,
    coachId: args.pendingMessage.coachId,
    organizationId: selectedOrg.id,
    organizationName: selectedOrg.name,
    resolvedVia: "user_selection",
  });

  // Create a new message record for this selection acknowledgment
  const messageId = await ctx.runMutation(
    internal.models.whatsappMessages.createMessage,
    {
      messageSid: args.newMessageSid,
      accountSid: args.accountSid,
      fromNumber: args.phoneNumber,
      toNumber: args.toNumber,
      messageType: "text",
      body: args.messageBody,
    }
  );

  // Update with coach info
  await ctx.runMutation(internal.models.whatsappMessages.updateCoachInfo, {
    messageId,
    coachId: args.pendingMessage.coachId,
    coachName: args.pendingMessage.coachName,
    organizationId: selectedOrg.id,
  });

  // Send confirmation
  await sendWhatsAppMessage(
    args.phoneNumber,
    `Got it! Recording for ${selectedOrg.name}. Processing your note...`
  );

  // Now process the original pending message
  try {
    if (
      args.pendingMessage.messageType === "audio" &&
      args.pendingMessage.mediaStorageId
    ) {
      // Create voice note from already-stored audio
      const noteId = await ctx.runMutation(
        api.models.voiceNotes.createRecordedNote,
        {
          orgId: selectedOrg.id,
          coachId: args.pendingMessage.coachId,
          audioStorageId: args.pendingMessage.mediaStorageId,
          noteType: "general",
          source: "whatsapp_audio",
        }
      );

      // Link voice note to WhatsApp message
      await ctx.runMutation(internal.models.whatsappMessages.linkVoiceNote, {
        messageId,
        voiceNoteId: noteId,
      });

      // Schedule auto-apply check
      await ctx.scheduler.runAfter(
        30_000,
        internal.actions.whatsapp.checkAndAutoApply,
        {
          messageId,
          voiceNoteId: noteId,
          coachId: args.pendingMessage.coachId,
          organizationId: selectedOrg.id,
          phoneNumber: args.phoneNumber,
        }
      );
    } else if (
      args.pendingMessage.messageType === "text" &&
      args.pendingMessage.body
    ) {
      // Create typed note
      const noteId = await ctx.runMutation(
        api.models.voiceNotes.createTypedNote,
        {
          orgId: selectedOrg.id,
          coachId: args.pendingMessage.coachId,
          noteText: args.pendingMessage.body,
          noteType: "general",
          source: "whatsapp_text",
        }
      );

      await ctx.runMutation(internal.models.whatsappMessages.linkVoiceNote, {
        messageId,
        voiceNoteId: noteId,
      });

      await ctx.scheduler.runAfter(
        15_000,
        internal.actions.whatsapp.checkAndAutoApply,
        {
          messageId,
          voiceNoteId: noteId,
          coachId: args.pendingMessage.coachId,
          organizationId: selectedOrg.id,
          phoneNumber: args.phoneNumber,
        }
      );
    }

    return { success: true, messageId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      "[WhatsApp] Failed to process pending message:",
      errorMessage
    );

    await sendWhatsAppMessage(
      args.phoneNumber,
      "Sorry, there was an error processing your note. Please try again."
    );

    return { success: false, messageId, error: errorMessage };
  }
}

/**
 * Download and store media from Twilio (for pending messages)
 */
async function downloadAndStoreMedia(
  // biome-ignore lint/suspicious/noExplicitAny: Convex action context type
  ctx: any,
  mediaUrl: string
): Promise<Id<"_storage"> | undefined> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!(accountSid && authToken)) {
    console.error("[WhatsApp] Twilio credentials not configured");
    return;
  }

  try {
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString(
      "base64"
    );
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${authHeader}` },
    });

    if (!response.ok) {
      console.error("[WhatsApp] Failed to download media:", response.status);
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "audio/ogg";
    const audioBlob = new Blob([audioBuffer], { type: contentType });

    const uploadUrl = await ctx.storage.generateUploadUrl();
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "audio/ogg" },
      body: audioBlob,
    });

    if (!uploadResponse.ok) {
      console.error("[WhatsApp] Failed to upload media to storage");
      return;
    }

    const { storageId } = await uploadResponse.json();
    return storageId;
  } catch (error) {
    console.error("[WhatsApp] Error downloading/storing media:", error);
    return;
  }
}

/**
 * Process an audio message - download from Twilio and create voice note
 */
async function processAudioMessage(
  // biome-ignore lint/suspicious/noExplicitAny: Convex action context type
  ctx: any,
  args: {
    messageId: Id<"whatsappMessages">;
    mediaUrl: string;
    coachId: string;
    organizationId: string;
    phoneNumber: string;
  }
) {
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
  const contentType = response.headers.get("content-type") || "audio/ogg";
  const audioBlob = new Blob([audioBuffer], { type: contentType });

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
 * Process a text message - validate quality then create typed voice note
 */
async function processTextMessage(
  // biome-ignore lint/suspicious/noExplicitAny: Convex action context type
  ctx: any,
  args: {
    messageId: Id<"whatsappMessages">;
    text: string;
    coachId: string;
    organizationId: string;
    phoneNumber: string;
  }
) {
  // US-VN-001: Quality gate - validate text before processing
  const { validateTextMessage } = await import("../lib/messageValidation");
  const qualityCheck = validateTextMessage(args.text);

  if (!qualityCheck.isValid) {
    // Update message with quality check result and reject
    await ctx.runMutation(internal.models.whatsappMessages.updateStatus, {
      messageId: args.messageId,
      status: "rejected",
      errorMessage: `Quality check failed: ${qualityCheck.reason}`,
    });

    await ctx.runMutation(internal.models.whatsappMessages.updateQualityCheck, {
      messageId: args.messageId,
      qualityCheck: {
        isValid: false,
        reason: qualityCheck.reason,
        checkedAt: Date.now(),
      },
    });

    // Send helpful feedback to coach
    if (qualityCheck.suggestion) {
      await sendWhatsAppMessage(args.phoneNumber, qualityCheck.suggestion);
    }
    return;
  }

  // Quality check passed - store result
  await ctx.runMutation(internal.models.whatsappMessages.updateQualityCheck, {
    messageId: args.messageId,
    qualityCheck: {
      isValid: true,
      checkedAt: Date.now(),
    },
  });

  // Create voice note (this triggers insights pipeline)
  const noteId = await ctx.runMutation(api.models.voiceNotes.createTypedNote, {
    orgId: args.organizationId,
    coachId: args.coachId,
    noteText: args.text,
    noteType: "general",
    source: "whatsapp_text",
  });

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

    // US-VN-004: Check for failure conditions and send detailed feedback
    const { determineFeedbackCategory, generateFeedbackMessage } = await import(
      "../lib/feedbackMessages"
    );
    const feedbackCategory = determineFeedbackCategory(voiceNote, retryCount);

    if (feedbackCategory && feedbackCategory !== "still_processing") {
      const feedbackMsg = generateFeedbackMessage(feedbackCategory, voiceNote);
      await sendWhatsAppMessage(args.phoneNumber, feedbackMsg);
      return null;
    }

    // Check if insights are ready
    if (voiceNote.insightsStatus !== "completed") {
      if (retryCount < maxRetries) {
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

      // Max retries reached - send detailed feedback
      if (feedbackCategory === "still_processing") {
        const feedbackMsg = generateFeedbackMessage(
          feedbackCategory,
          voiceNote
        );
        await sendWhatsAppMessage(args.phoneNumber, feedbackMsg);
      } else {
        await sendWhatsAppMessage(
          args.phoneNumber,
          "Your note is still being processed. Check the app for updates."
        );
      }
      return null;
    }

    // Get coach's trust level
    const trustLevel = await ctx.runQuery(
      api.models.coachTrustLevels.getCoachTrustLevel,
      { organizationId: args.organizationId }
    );

    // Process insights based on trust level
    const results = await applyInsightsWithTrust(ctx, {
      voiceNote,
      trustLevel: trustLevel.currentLevel,
      coachId: args.coachId,
      organizationId: args.organizationId,
    });

    // Generate review link for the coach (reuses active link if exists)
    const reviewLink = await ctx.runMutation(
      internal.models.whatsappReviewLinks.generateReviewLink,
      {
        voiceNoteId: args.voiceNoteId,
        organizationId: args.organizationId,
        coachUserId: args.coachId,
      }
    );

    // Update WhatsApp message with processing results
    await ctx.runMutation(
      internal.models.whatsappMessages.updateProcessingResults,
      {
        messageId: args.messageId,
        processingResults: results,
      }
    );

    // US-VN-011: Get running totals across all notes for this coach
    const activeLink = await ctx.runQuery(
      internal.models.whatsappReviewLinks.getActiveLinkForCoach,
      {
        coachUserId: args.coachId,
        organizationId: args.organizationId,
      }
    );

    // Send detailed follow-up message with review link and running totals
    const replyMessage = formatResultsMessage(
      results,
      trustLevel.currentLevel,
      reviewLink.code,
      activeLink?.totalPendingCount
    );
    await sendWhatsAppMessage(args.phoneNumber, replyMessage);

    return null;
  },
});

/**
 * Apply insights based on coach's trust level
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Trust-based insight categorization requires many conditionals
async function applyInsightsWithTrust(
  // biome-ignore lint/suspicious/noExplicitAny: Convex action context type
  ctx: any,
  args: {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic voice note type
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
    autoApplied: [] as Array<{
      insightId: string;
      playerName?: string;
      teamName?: string;
      category: string;
      title: string;
      parentSummaryQueued: boolean;
    }>,
    needsReview: [] as Array<{
      insightId: string;
      playerName?: string;
      category: string;
      title: string;
      reason: string;
    }>,
    unmatched: [] as Array<{
      insightId: string;
      mentionedName?: string;
      title: string;
    }>,
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
 * Format the results into a WhatsApp-friendly message.
 * Trust-adaptive: TL0 verbose, TL1 standard, TL2 compact, TL3 minimal.
 *
 * US-VN-011: Trust-Adaptive Messages
 */
function formatResultsMessage(
  results: {
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
  },
  trustLevel: number,
  reviewCode?: string,
  runningTotalPending?: number
): string {
  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
    TRAILING_SLASH_REGEX,
    ""
  );
  const reviewUrl = reviewCode ? `${siteUrl}/r/${reviewCode}` : undefined;
  const totalPending = results.needsReview.length + results.unmatched.length;
  const appliedCount = results.autoApplied.length;

  // TL3: Minimal — just counts and link
  if (trustLevel >= 3) {
    return formatTL3Message(
      appliedCount,
      totalPending,
      reviewUrl,
      runningTotalPending
    );
  }

  // TL2: Compact — summary counts with link
  if (trustLevel >= 2) {
    return formatTL2Message({
      results,
      appliedCount,
      totalPending,
      reviewUrl,
      runningTotalPending,
    });
  }

  // TL0-1: Detailed — list items with explanations
  return formatTL01Message({
    results,
    trustLevel,
    appliedCount,
    totalPending,
    reviewUrl,
    runningTotalPending,
  });
}

/**
 * TL3: Minimal message format for highly trusted coaches.
 */
function formatTL3Message(
  appliedCount: number,
  totalPending: number,
  reviewUrl?: string,
  runningTotalPending?: number
): string {
  const lines: string[] = [];

  if (appliedCount > 0) {
    lines.push(`Applied ${appliedCount}.`);
  }

  if (totalPending > 0 && reviewUrl) {
    lines.push(`${totalPending} pending: ${reviewUrl}`);
  } else if (appliedCount === 0) {
    lines.push("No actionable insights found.");
  }

  // Running total if there are more pending items across all notes
  if (runningTotalPending && runningTotalPending > totalPending) {
    lines.push(
      `${runningTotalPending} total pending. Reply OK to apply matched.`
    );
  }

  return lines.join("\n");
}

/**
 * TL2: Compact message format for trusted coaches.
 */
function formatTL2Message(opts: {
  results: {
    autoApplied: Array<{
      playerName?: string;
      teamName?: string;
      category: string;
    }>;
    needsReview: Array<{ playerName?: string; category: string }>;
    unmatched: Array<{ mentionedName?: string }>;
  };
  appliedCount: number;
  totalPending: number;
  reviewUrl?: string;
  runningTotalPending?: number;
}): string {
  const {
    results,
    appliedCount,
    totalPending,
    reviewUrl,
    runningTotalPending,
  } = opts;
  const lines: string[] = [];

  if (appliedCount > 0) {
    lines.push(`Applied ${appliedCount} insights.`);
  }

  if (results.unmatched.length > 0) {
    lines.push(`${results.unmatched.length} unmatched player(s).`);
  }

  if (results.needsReview.length > 0) {
    lines.push(`${results.needsReview.length} need(s) review.`);
  }

  if (totalPending > 0 && reviewUrl) {
    lines.push("");
    lines.push(`Review: ${reviewUrl}`);
    lines.push("Reply OK to apply matched.");
  } else if (appliedCount === 0) {
    lines.push("No actionable insights found.");
  }

  // Running total
  if (runningTotalPending && runningTotalPending > totalPending) {
    lines.push("");
    lines.push(`You have ${runningTotalPending} total pending items.`);
  }

  return lines.join("\n");
}

/**
 * TL0-1: Detailed message format for new/building-trust coaches.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Detailed formatting across multiple result types
function formatTL01Message(opts: {
  results: {
    autoApplied: Array<{
      playerName?: string;
      teamName?: string;
      category: string;
      parentSummaryQueued: boolean;
    }>;
    needsReview: Array<{ playerName?: string; category: string }>;
    unmatched: Array<{ mentionedName?: string }>;
  };
  trustLevel: number;
  appliedCount: number;
  totalPending: number;
  reviewUrl?: string;
  runningTotalPending?: number;
}): string {
  const {
    results,
    trustLevel,
    appliedCount,
    totalPending,
    reviewUrl,
    runningTotalPending,
  } = opts;
  const lines: string[] = ["Analysis complete!"];
  lines.push("");

  // Auto-applied insights
  if (appliedCount > 0) {
    lines.push(`Auto-applied (${appliedCount}):`);
    for (const insight of results.autoApplied.slice(0, 5)) {
      const name = insight.playerName || insight.teamName || "Unknown";
      const categoryDisplay = formatCategory(insight.category);
      const parentNote = insight.parentSummaryQueued ? " -> Parent" : "";
      lines.push(`- ${name}: ${categoryDisplay}${parentNote}`);
    }
    if (appliedCount > 5) {
      lines.push(`  ...and ${appliedCount - 5} more`);
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

  // Summary with review link
  if (totalPending > 0) {
    if (reviewUrl) {
      lines.push(`Review ${totalPending} pending: ${reviewUrl}`);
    } else {
      lines.push(`Review ${totalPending} pending in PlayerARC.`);
    }

    // TL0 gets extra guidance
    if (trustLevel === 0) {
      lines.push("");
      lines.push("Reply OK to apply all matched insights.");
      lines.push("Reply R to get your review link again.");
    }
  } else if (appliedCount > 0) {
    lines.push("All insights applied!");
  } else {
    lines.push("No actionable insights found.");
  }

  // Running total
  if (runningTotalPending && runningTotalPending > totalPending) {
    lines.push("");
    lines.push(
      `You have ${runningTotalPending} total pending items across all notes.`
    );
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
// DUPLICATE REPLY BUILDER
// ============================================================

function buildDuplicateReply(
  timeSinceOriginal: number | undefined,
  originalStatus: {
    messageStatus: string;
    hasVoiceNote: boolean;
    insightsStatus?: string;
    insightCount: number;
    playerNames: string[];
  } | null
): string {
  const secsAgo = timeSinceOriginal ? Math.round(timeSinceOriginal / 1000) : 0;
  const timeLabel =
    secsAgo < 60 ? `${secsAgo}s ago` : `${Math.round(secsAgo / 60)}m ago`;

  // If we couldn't look up the original, send a basic reply
  if (!originalStatus) {
    return `We received this message already (${timeLabel}). No need to resend.`;
  }

  const { messageStatus, insightsStatus, insightCount, playerNames } =
    originalStatus;
  const playerList =
    playerNames.length > 0 ? playerNames.join(", ") : undefined;

  // Message still being processed (not yet completed)
  if (messageStatus === "processing" || messageStatus === "received") {
    return (
      `We received this message ${timeLabel} and it's currently being processed.` +
      ` No need to resend — we'll update you when it's done.`
    );
  }

  // Message completed — check insight status
  if (insightsStatus === "completed" && insightCount > 0) {
    const playerInfo = playerList ? ` about ${playerList}` : "";
    return (
      `We already processed this note${playerInfo} (${timeLabel}) and extracted ${insightCount} insight${insightCount !== 1 ? "s" : ""}.` +
      " Check your review link or type R for a new one."
    );
  }

  if (insightsStatus === "processing" || insightsStatus === "pending") {
    return (
      `We received this message ${timeLabel} — insights are being extracted now.` +
      " No need to resend."
    );
  }

  if (insightsStatus === "failed") {
    return (
      `We received this message ${timeLabel} but had trouble extracting insights.` +
      " Try sending a new, clearer message instead of resending."
    );
  }

  // Default fallback
  return `We received this message already (${timeLabel}). No need to resend.`;
}

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

    return true;
  } catch (error) {
    console.error("[WhatsApp] Error sending message:", error);
    return false;
  }
}

// ============================================================
// WHATSAPP QUICK-REPLY COMMAND HANDLERS (US-VN-011)
// ============================================================

/**
 * Handle "OK" quick-reply: batch-apply all matched pending insights.
 * Returns true if handled (active link with pending matched insights),
 * false if should fall through to normal processing.
 */
async function handleOkCommand(
  // biome-ignore lint/suspicious/noExplicitAny: Convex action context type
  ctx: any,
  args: {
    messageId: Id<"whatsappMessages">;
    coachId: string;
    organizationId: string;
    phoneNumber: string;
  }
): Promise<boolean> {
  // Check for active link with pending matched insights
  const activeLink = await ctx.runQuery(
    internal.models.whatsappReviewLinks.getActiveLinkForCoach,
    {
      coachUserId: args.coachId,
      organizationId: args.organizationId,
    }
  );

  if (!activeLink || activeLink.pendingMatchedCount === 0) {
    return false;
  }

  // Batch-apply all matched pending insights
  const result = await ctx.runMutation(
    internal.models.whatsappReviewLinks.batchApplyMatchedFromWhatsApp,
    {
      coachUserId: args.coachId,
      organizationId: args.organizationId,
    }
  );

  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
    TRAILING_SLASH_REGEX,
    ""
  );

  // Build reply message
  const lines: string[] = [];
  if (result.appliedCount > 0) {
    lines.push(`Applied ${result.appliedCount} insight(s)!`);
  }

  if (result.remainingPendingCount > 0 && result.reviewCode) {
    lines.push(
      `${result.remainingPendingCount} item(s) still need review: ${siteUrl}/r/${result.reviewCode}`
    );
  } else if (result.appliedCount > 0) {
    lines.push("All caught up!");
  }

  await sendWhatsAppMessage(args.phoneNumber, lines.join("\n"));
  return true;
}

/**
 * Handle "R" quick-reply: resend review link with pending summary.
 * Returns true if handled (active link exists), false if should fall through.
 */
async function handleResendCommand(
  // biome-ignore lint/suspicious/noExplicitAny: Convex action context type
  ctx: any,
  args: {
    messageId: Id<"whatsappMessages">;
    coachId: string;
    organizationId: string;
    phoneNumber: string;
  }
): Promise<boolean> {
  const activeLink = await ctx.runQuery(
    internal.models.whatsappReviewLinks.getActiveLinkForCoach,
    {
      coachUserId: args.coachId,
      organizationId: args.organizationId,
    }
  );

  if (!activeLink) {
    return false;
  }

  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
    TRAILING_SLASH_REGEX,
    ""
  );

  // Calculate time until expiry
  const hoursLeft = Math.max(
    0,
    Math.round((activeLink.expiresAt - Date.now()) / (1000 * 60 * 60))
  );

  // Build pending summary
  const pendingParts: string[] = [];
  if (activeLink.pendingInjuryCount > 0) {
    pendingParts.push(
      `${activeLink.pendingInjuryCount} injur${activeLink.pendingInjuryCount === 1 ? "y" : "ies"}`
    );
  }
  if (activeLink.pendingUnmatchedCount > 0) {
    pendingParts.push(`${activeLink.pendingUnmatchedCount} unmatched`);
  }
  if (activeLink.pendingMatchedCount > 0) {
    pendingParts.push(`${activeLink.pendingMatchedCount} needs review`);
  }
  if (activeLink.pendingTodoCount > 0) {
    pendingParts.push(`${activeLink.pendingTodoCount} task(s)`);
  }
  if (activeLink.pendingTeamNoteCount > 0) {
    pendingParts.push(`${activeLink.pendingTeamNoteCount} team note(s)`);
  }

  const lines: string[] = [];
  lines.push("Here's your review link:");
  lines.push(`${siteUrl}/r/${activeLink.code} (expires in ${hoursLeft}h)`);

  if (pendingParts.length > 0) {
    lines.push("");
    lines.push(
      `${activeLink.totalPendingCount} pending: ${pendingParts.join(", ")}`
    );
  }

  await sendWhatsAppMessage(args.phoneNumber, lines.join("\n"));
  return true;
}

/**
 * Handle "SNOOZE/LATER/REMIND" quick-reply: defer review with 2h default.
 * Returns true if handled (active link exists), false if should fall through.
 */
async function handleSnoozeCommand(
  // biome-ignore lint/suspicious/noExplicitAny: Convex action context type
  ctx: any,
  args: {
    messageId: Id<"whatsappMessages">;
    coachId: string;
    organizationId: string;
    phoneNumber: string;
  }
): Promise<boolean> {
  const activeLink = await ctx.runQuery(
    internal.models.whatsappReviewLinks.getActiveLinkForCoach,
    {
      coachUserId: args.coachId,
      organizationId: args.organizationId,
    }
  );

  if (!activeLink) {
    return false;
  }

  // Default 2h delay
  const twoHoursMs = 2 * 60 * 60 * 1000;

  const result = await ctx.runMutation(
    api.models.whatsappReviewLinks.snoozeReviewLink,
    {
      code: activeLink.code,
      delayMs: twoHoursMs,
    }
  );

  if (result.success) {
    await sendWhatsAppMessage(
      args.phoneNumber,
      `Got it! I'll remind you in 2 hours. (${result.snoozeCount}/3 reminders used)`
    );
  } else {
    const reason =
      result.reason === "max_snoozes_reached"
        ? "You've used all 3 reminders."
        : "Could not set reminder.";
    await sendWhatsAppMessage(args.phoneNumber, reason);
  }

  return true;
}

// ============================================================
// SNOOZE REMINDER (US-VN-012c)
// ============================================================

/**
 * Send a WhatsApp reminder for a snoozed review link.
 * Called by the processSnoozedReminders cron via scheduler.
 */
export const sendSnoozeReminder = internalAction({
  args: {
    coachUserId: v.string(),
    organizationId: v.string(),
    linkCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Look up coach's phone number
    const coachPhone = await ctx.runQuery(
      internal.models.whatsappMessages.getCoachPhoneNumber,
      { coachUserId: args.coachUserId }
    );

    if (!coachPhone) {
      console.error(
        "[WhatsApp] No phone number found for coach:",
        args.coachUserId
      );
      return null;
    }

    const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
      TRAILING_SLASH_REGEX,
      ""
    );

    const reviewUrl = `${siteUrl}/r/${args.linkCode}`;

    await sendWhatsAppMessage(
      coachPhone,
      `Reminder: You have pending voice note insights to review.\n\n${reviewUrl}\n\nReply OK to apply all matched insights.`
    );

    return null;
  },
});
