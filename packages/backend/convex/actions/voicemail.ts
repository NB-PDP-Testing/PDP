"use node";

import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Process a completed voicemail recording from Twilio.
 * Downloads WAV from Twilio, stores in Convex, creates voice note
 * (which triggers existing transcription → insights pipeline),
 * then deletes the recording from Twilio for privacy.
 */
export const processRecording = internalAction({
  args: {
    callSid: v.string(),
    recordingSid: v.string(),
    recordingUrl: v.string(),
    recordingDuration: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(
      "[Voicemail] Processing recording",
      args.recordingSid,
      "for call",
      args.callSid
    );

    // 1. Look up call context
    const call = await ctx.runQuery(
      internal.models.voicemailCalls.getCallByCallSid,
      { callSid: args.callSid }
    );

    if (!call) {
      console.error(
        "[Voicemail] No call context found for CallSid:",
        args.callSid
      );
      return null;
    }

    // Skip very short recordings (< 2 seconds likely accidental)
    if (args.recordingDuration < 2) {
      console.log(
        "[Voicemail] Recording too short, skipping:",
        args.recordingDuration,
        "seconds"
      );
      await ctx.runMutation(internal.models.voicemailCalls.markFailed, {
        callId: call._id,
        error: "Recording too short (< 2 seconds)",
      });
      return null;
    }

    try {
      // 2. Download WAV from Twilio (requires Basic Auth)
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!(accountSid && authToken)) {
        throw new Error("Twilio credentials not configured");
      }

      const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString(
        "base64"
      );

      // Twilio recording URL: append .wav for WAV format
      const wavUrl = `${args.recordingUrl}.wav`;
      const response = await fetch(wavUrl, {
        headers: { Authorization: `Basic ${authHeader}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to download recording: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });

      // 3. Upload to Convex storage
      const uploadUrl = await ctx.storage.generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: audioBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio to storage");
      }

      const { storageId } = await uploadResponse.json();

      // 4. Check v2 feature flag, create artifact if enabled
      const useV2 = await ctx.runQuery(
        internal.lib.featureFlags.shouldUseV2Pipeline,
        { organizationId: call.organizationId, userId: call.coachId }
      );

      let artifactId: string | undefined;
      if (useV2) {
        artifactId = crypto.randomUUID();
        await ctx.runMutation(
          internal.models.voiceNoteArtifacts.createArtifact,
          {
            artifactId,
            sourceChannel: "voicemail",
            senderUserId: call.coachId,
            orgContextCandidates: [
              { organizationId: call.organizationId, confidence: 1.0 },
            ],
            rawMediaStorageId: storageId,
            metadata: { mimeType: "audio/wav" },
          }
        );
      }

      // 5. Create voice note — triggers transcription → insights pipeline
      // skipV2: true prevents duplicate artifact creation (we already created it above)
      const noteId = await ctx.runMutation(
        api.models.voiceNotes.createRecordedNote,
        {
          orgId: call.organizationId,
          coachId: call.coachId,
          audioStorageId: storageId,
          noteType: "general",
          source: "voicemail",
          skipV2: true,
        }
      );

      // 6. Link artifact to v1 voice note
      if (useV2 && artifactId) {
        await ctx.runMutation(
          internal.models.voiceNoteArtifacts.linkToVoiceNote,
          { artifactId, voiceNoteId: noteId }
        );
      }

      // 7. Mark call as processed
      await ctx.runMutation(internal.models.voicemailCalls.markProcessed, {
        callId: call._id,
        recordingSid: args.recordingSid,
        voiceNoteId: noteId,
      });

      // 8. Delete recording from Twilio (privacy + cost savings)
      try {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${args.recordingSid}.json`,
          {
            method: "DELETE",
            headers: { Authorization: `Basic ${authHeader}` },
          }
        );
        console.log("[Voicemail] Deleted Twilio recording:", args.recordingSid);
      } catch (deleteError) {
        // Non-fatal — recording will auto-expire from Twilio
        console.warn(
          "[Voicemail] Failed to delete Twilio recording:",
          deleteError
        );
      }

      console.log(
        "[Voicemail] Successfully processed recording for",
        call.coachName,
        "at",
        call.orgName
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Voicemail] Processing failed:", errorMessage);

      await ctx.runMutation(internal.models.voicemailCalls.markFailed, {
        callId: call._id,
        error: errorMessage,
      });
    }

    return null;
  },
});
