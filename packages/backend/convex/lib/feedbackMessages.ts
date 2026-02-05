/**
 * WhatsApp feedback message templates for voice note processing.
 * Provides specific, actionable feedback instead of generic error messages.
 *
 * US-VN-004: Enhanced WhatsApp Feedback Messages
 */

export type FeedbackCategory =
  | "transcription_failed"
  | "transcript_quality_rejected"
  | "needs_confirmation"
  | "insights_failed"
  | "still_processing";

export interface VoiceNoteState {
  transcriptionStatus?: string;
  transcriptValidation?: {
    reason?: string;
    suggestedAction?: string;
  };
  insightsStatus?: string;
  transcript?: string;
}

const REJECTION_REASON_MESSAGES: Record<string, string> = {
  empty_transcript: "The audio had no speech detected.",
  too_short: "The message was too short to analyze.",
  mostly_inaudible: "Most of the audio was inaudible or noisy.",
  too_few_words: "I only caught a few words.",
  suspicious_word_pattern:
    "The transcription doesn't look like natural speech.",
};

/**
 * Determine which feedback category applies to a voice note.
 */
export function determineFeedbackCategory(
  voiceNote: VoiceNoteState,
  retryCount: number
): FeedbackCategory | null {
  if (voiceNote.transcriptionStatus === "failed") {
    return "transcription_failed";
  }

  if (voiceNote.transcriptValidation?.suggestedAction === "reject") {
    return "transcript_quality_rejected";
  }

  if (voiceNote.transcriptValidation?.suggestedAction === "ask_user") {
    return "needs_confirmation";
  }

  if (voiceNote.insightsStatus === "failed") {
    return "insights_failed";
  }

  if (retryCount > 0) {
    return "still_processing";
  }

  return null;
}

/**
 * Generate a feedback message for a specific category.
 */
export function generateFeedbackMessage(
  category: FeedbackCategory,
  voiceNote: VoiceNoteState
): string {
  switch (category) {
    case "transcription_failed":
      return (
        "I couldn't transcribe your audio. This might be because:\n\n" +
        "- Audio was too short (needs 3+ seconds)\n" +
        "- Background noise was too loud\n" +
        "- File format issue\n\n" +
        "Please try recording again in a quiet space."
      );

    case "transcript_quality_rejected": {
      const reason =
        REJECTION_REASON_MESSAGES[
          voiceNote.transcriptValidation?.reason ?? ""
        ] ?? "The audio quality was too poor.";

      const transcriptSnippet = voiceNote.transcript
        ? `\n\nTranscript: "${truncate(voiceNote.transcript, 100)}"`
        : "";

      return (
        `${reason}${transcriptSnippet}\n\n` +
        "Please try again:\n" +
        "- Record in a quiet place\n" +
        "- Speak clearly for at least 5 seconds\n" +
        "- Mention player names and what happened"
      );
    }

    case "needs_confirmation": {
      const snippet = truncate(voiceNote.transcript ?? "", 150);

      return (
        "I transcribed your audio, but I'm not confident about the quality.\n\n" +
        `I heard: "${snippet}"\n\n` +
        "Reply:\n" +
        "- CONFIRM to analyze it anyway\n" +
        "- RETRY to record again\n" +
        "- CANCEL to discard"
      );
    }

    case "insights_failed": {
      const snippet = truncate(voiceNote.transcript ?? "", 100);

      return (
        "I transcribed your note but couldn't extract insights.\n\n" +
        `Transcript: "${snippet}"\n\n` +
        "This might be because:\n" +
        "- No player names were mentioned\n" +
        "- The message wasn't about player development\n\n" +
        "Your note is saved in the app. You can add details manually."
      );
    }

    case "still_processing":
      return (
        "Your note is taking longer than usual to process.\n\n" +
        "You can:\n" +
        "- Check the app for updates\n" +
        "- Wait for processing to complete (may take 1-2 minutes)\n\n" +
        "If this keeps happening, please report it."
      );
    default:
      return "There was an error processing your note. Please try again.";
  }
}

/**
 * Parse a CONFIRM/RETRY/CANCEL response.
 */
export function parseConfirmationResponse(
  response: string
): "confirm" | "retry" | "cancel" | null {
  const normalized = response.trim().toLowerCase();
  if (normalized === "confirm" || normalized === "yes" || normalized === "y") {
    return "confirm";
  }
  if (normalized === "retry" || normalized === "redo") {
    return "retry";
  }
  if (normalized === "cancel" || normalized === "no" || normalized === "n") {
    return "cancel";
  }
  return null;
}

/**
 * Generate response message for a confirmation action.
 */
export function generateConfirmationResponse(
  action: "confirm" | "retry" | "cancel"
): string {
  switch (action) {
    case "confirm":
      return "Got it! Processing your note now...";
    case "retry":
      return "No problem. Send your new voice note whenever you're ready.";
    case "cancel":
      return "Note discarded. Feel free to send a new one anytime.";
    default:
      return "There was an error processing your note. Please try again.";
  }
}

/**
 * Generate invalid response prompt.
 */
export function generateInvalidResponsePrompt(response: string): string {
  return (
    `I didn't understand "${truncate(response, 50)}".\n\n` +
    "Please reply with:\n" +
    "- CONFIRM (to analyze the note)\n" +
    "- RETRY (to record again)\n" +
    "- CANCEL (to discard)"
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return `${str.substring(0, maxLen)}...`;
}
