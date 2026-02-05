/**
 * Message quality validation for WhatsApp voice notes pipeline.
 * Validates text messages and transcripts BEFORE expensive AI processing.
 *
 * US-VN-001: Text Message Quality Gate
 * US-VN-002: Transcript Quality Validation
 */

// ============================================================
// US-VN-001: TEXT MESSAGE VALIDATION
// ============================================================

export interface MessageQualityCheck {
  isValid: boolean;
  reason?: "empty" | "too_short" | "gibberish" | "spam";
  suggestion?: string;
}

// Regex compiled once at module level for performance
const REPEATED_CHARS_REGEX = /(.)\1{5,}/;
const WHITESPACE_SPLIT_REGEX = /\s+/;

/**
 * Validate text message quality before processing.
 * Checks: empty, min length (<10 chars), word count (<3), gibberish, spam.
 *
 * @param text - Raw message text from WhatsApp
 * @returns Quality check result with rejection reason and suggestion
 */
export function validateTextMessage(text: string): MessageQualityCheck {
  const trimmed = text.trim();

  // Check 1: Empty message
  if (trimmed.length === 0) {
    return {
      isValid: false,
      reason: "empty",
      suggestion: "Please send a message with content.",
    };
  }

  // Check 2: Minimum length (10 characters)
  if (trimmed.length < 10) {
    return {
      isValid: false,
      reason: "too_short",
      suggestion:
        "Your message is very short. Please provide more detail about the player or team.",
    };
  }

  // Check 3: Word count (at least 3 words)
  const words = trimmed.split(WHITESPACE_SPLIT_REGEX);
  if (words.length < 3) {
    return {
      isValid: false,
      reason: "too_short",
      suggestion: "Please use at least 3 words to describe what happened.",
    };
  }

  // Check 4: Gibberish detection (average word length)
  const avgWordLength = trimmed.replace(/\s/g, "").length / words.length;
  if (avgWordLength > 20 || avgWordLength < 2) {
    return {
      isValid: false,
      reason: "gibberish",
      suggestion: "I couldn't understand that message. Could you rephrase?",
    };
  }

  // Check 5: Spam detection (repeated characters, e.g. "aaaaaaa")
  if (REPEATED_CHARS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      reason: "spam",
      suggestion:
        "That looks like a test message. Please send your actual note.",
    };
  }

  // All checks passed
  return { isValid: true };
}

// ============================================================
// US-VN-002: TRANSCRIPT QUALITY VALIDATION
// ============================================================

export interface TranscriptQualityResult {
  isValid: boolean;
  confidence: number;
  reason?: string;
  suggestedAction: "process" | "ask_user" | "reject";
}

// Whisper uncertainty markers (compiled once)
const UNCERTAINTY_MARKERS = [
  "[inaudible]",
  "[music]",
  "[noise]",
  "[?]",
  "(inaudible)",
  "(music)",
  "(background noise)",
];

// Pre-compiled regexes for uncertainty markers
const UNCERTAINTY_REGEXES = UNCERTAINTY_MARKERS.map(
  (marker) => new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
);

// Sports keywords for context detection
const SPORT_KEYWORDS = [
  "player",
  "team",
  "training",
  "match",
  "game",
  "injury",
  "session",
  "practice",
  "coach",
  "midfielder",
  "striker",
  "defender",
  "goalkeeper",
  "pass",
  "tackle",
  "shot",
  "goal",
  "warm-up",
  "drill",
  "fitness",
  "hurling",
  "football",
  "gaelic",
  "rugby",
  "soccer",
];

/**
 * Validate transcript quality after Whisper transcription.
 * Detects inaudible audio, gibberish, or poor-quality recordings.
 *
 * @param transcript - Transcribed text from Whisper
 * @param audioDuration - Optional audio duration in seconds
 * @returns Quality result with confidence score and suggested action
 */
export function validateTranscriptQuality(
  transcript: string,
  audioDuration?: number
): TranscriptQualityResult {
  const trimmed = transcript.trim();

  // Check 1: Empty transcript
  if (trimmed.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      reason: "empty_transcript",
      suggestedAction: "reject",
    };
  }

  // Check 2: Too short audio with short transcript
  if (audioDuration !== undefined && audioDuration < 3 && trimmed.length < 20) {
    return {
      isValid: false,
      confidence: 0.1,
      reason: "too_short",
      suggestedAction: "reject",
    };
  }

  // Check 3: Whisper uncertainty markers
  const words = trimmed.split(WHITESPACE_SPLIT_REGEX);
  let uncertaintyCount = 0;
  for (const regex of UNCERTAINTY_REGEXES) {
    const matches = transcript.match(regex);
    if (matches) {
      uncertaintyCount += matches.length;
    }
  }

  const uncertaintyRatio = uncertaintyCount / words.length;

  if (uncertaintyRatio > 0.5) {
    return {
      isValid: false,
      confidence: 0.2,
      reason: "mostly_inaudible",
      suggestedAction: "reject",
    };
  }

  if (uncertaintyRatio > 0.2) {
    return {
      isValid: true,
      confidence: 0.5,
      reason: "partial_audio_quality",
      suggestedAction: "ask_user",
    };
  }

  // Check 4: Word count
  if (words.length < 5) {
    return {
      isValid: false,
      confidence: 0.3,
      reason: "too_few_words",
      suggestedAction: "reject",
    };
  }

  // Check 5: Average word length (gibberish detection)
  const avgWordLength = trimmed.replace(/\s/g, "").length / words.length;
  if (avgWordLength < 2 || avgWordLength > 15) {
    return {
      isValid: false,
      confidence: 0.2,
      reason: "suspicious_word_pattern",
      suggestedAction: "ask_user",
    };
  }

  // Check 6: Sports context detection (confidence booster)
  const lowerTranscript = transcript.toLowerCase();
  const hasSportsContext = SPORT_KEYWORDS.some((keyword) =>
    lowerTranscript.includes(keyword)
  );

  return {
    isValid: true,
    confidence: hasSportsContext ? 0.9 : 0.6,
    reason: hasSportsContext ? "good_quality" : "unclear_context",
    suggestedAction: hasSportsContext ? "process" : "ask_user",
  };
}
