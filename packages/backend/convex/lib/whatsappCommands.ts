/**
 * WhatsApp Command Parser - Phase 6
 *
 * Parses incoming WhatsApp text messages to detect v2 pipeline commands.
 * Pure function — no side effects, no Convex dependency.
 */

export type CommandType =
  | "confirm_all"
  | "confirm_specific"
  | "cancel"
  | "entity_mapping";

export type Command =
  | { type: "confirm_all" }
  | { type: "confirm_specific"; draftNumbers: number[] }
  | { type: "cancel" }
  | {
      type: "entity_mapping";
      entityMapping: {
        rawText: string;
        playerNames: string[];
        teamContext?: string;
      };
    };

// Top-level regex patterns (Biome: useTopLevelRegex)
const CONFIRM_ALL_REGEX = /^(CONFIRM|YES|Y|OK)$/i;
const CONFIRM_SPECIFIC_REGEX = /^(?:CONFIRM|YES)\s+([\d,\s-]+)$/i;
const CANCEL_REGEX = /^(CANCEL|NO|N)$/i;
const ENTITY_MAPPING_REGEX = /^(.+?)\s*=\s*(.+)$/i;
const NAME_SPLIT_REGEX = /\s*(?:&|,|\band\b)\s*/i;
const TEAM_CONTEXT_REGEX = /^(.+?)\s+(U\d+s?)$/i;
const NUMBER_SPLIT_REGEX = /[,\s]+/;

/**
 * Parse a WhatsApp text message for v2 pipeline commands.
 * Returns null if the message is not a recognized command.
 * Uses anchored patterns to avoid false positives on embedded keywords.
 */
export function parseCommand(text: string): Command | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  return (
    tryParseConfirmAll(trimmed) ??
    tryParseConfirmSpecific(trimmed) ??
    tryParseCancel(trimmed) ??
    tryParseEntityMapping(trimmed)
  );
}

function tryParseConfirmAll(trimmed: string): Command | null {
  if (CONFIRM_ALL_REGEX.test(trimmed)) {
    return { type: "confirm_all" };
  }
  return null;
}

function tryParseConfirmSpecific(trimmed: string): Command | null {
  const match = trimmed.match(CONFIRM_SPECIFIC_REGEX);
  if (!match) {
    return null;
  }

  const numbers = match[1]
    .split(NUMBER_SPLIT_REGEX)
    .map((n) => Number.parseInt(n.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (numbers.length > 0) {
    return { type: "confirm_specific", draftNumbers: numbers };
  }
  return null;
}

function tryParseCancel(trimmed: string): Command | null {
  if (CANCEL_REGEX.test(trimmed)) {
    return { type: "cancel" };
  }
  return null;
}

function tryParseEntityMapping(trimmed: string): Command | null {
  const entityMatch = trimmed.match(ENTITY_MAPPING_REGEX);
  if (!entityMatch) {
    return null;
  }

  const rawText = entityMatch[1].trim();
  const namesPart = entityMatch[2].trim();

  const playerNames = namesPart
    .split(NAME_SPLIT_REGEX)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  let teamContext: string | undefined;
  if (playerNames.length > 0) {
    const lastPart = playerNames.at(-1);
    if (lastPart) {
      const teamMatch = lastPart.match(TEAM_CONTEXT_REGEX);
      if (teamMatch) {
        playerNames[playerNames.length - 1] = teamMatch[1].trim();
        teamContext = teamMatch[2];
      }
    }
  }

  if (playerNames.length >= 1) {
    return {
      type: "entity_mapping",
      entityMapping: {
        rawText,
        playerNames,
        ...(teamContext ? { teamContext } : {}),
      },
    };
  }
  return null;
}
