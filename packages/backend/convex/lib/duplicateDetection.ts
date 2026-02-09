/**
 * Duplicate message detection utilities for WhatsApp pipeline.
 * Prevents processing of accidental resends and network retries.
 *
 * US-VN-003: Duplicate Message Detection
 */

// Default time windows
export const DEFAULT_TEXT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_AUDIO_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  originalMessageId?: string;
  timeSinceOriginal?: number;
}

export interface RecentMessage {
  _id: string;
  messageType: string;
  body?: string;
  mediaContentType?: string;
  receivedAt: number;
  status: string;
}

export interface DuplicateCheckOptions {
  recentMessages: RecentMessage[];
  messageType: string;
  body?: string;
  mediaContentType?: string;
  now?: number;
  textWindowMs?: number;
  audioWindowMs?: number;
}

/**
 * Check if a message is a duplicate of a recent message from the same sender.
 *
 * For text messages: exact body match within the time window.
 * For audio messages: same mediaContentType within a shorter window.
 */
export function checkDuplicate(
  opts: DuplicateCheckOptions
): DuplicateCheckResult {
  const {
    recentMessages,
    messageType,
    body,
    mediaContentType,
    now = Date.now(),
    textWindowMs = DEFAULT_TEXT_WINDOW_MS,
    audioWindowMs = DEFAULT_AUDIO_WINDOW_MS,
  } = opts;

  if (recentMessages.length === 0) {
    return { isDuplicate: false };
  }

  for (const recent of recentMessages) {
    // Skip messages that are themselves duplicates
    if (recent.status === "duplicate") {
      continue;
    }

    const timeDiff = now - recent.receivedAt;

    if (
      messageType === "text" &&
      recent.messageType === "text" &&
      timeDiff <= textWindowMs &&
      body !== undefined &&
      recent.body !== undefined &&
      body === recent.body
    ) {
      return {
        isDuplicate: true,
        originalMessageId: recent._id,
        timeSinceOriginal: timeDiff,
      };
    }

    if (
      messageType === "audio" &&
      recent.messageType === "audio" &&
      timeDiff <= audioWindowMs &&
      mediaContentType !== undefined &&
      recent.mediaContentType !== undefined &&
      mediaContentType === recent.mediaContentType
    ) {
      return {
        isDuplicate: true,
        originalMessageId: recent._id,
        timeSinceOriginal: timeDiff,
      };
    }
  }

  return { isDuplicate: false };
}
