/**
 * Guardian Matching Module
 *
 * Unified guardian matching logic used by both import and onboarding.
 * This ensures consistent scoring across all matching scenarios.
 *
 * IMPORTANT: These weights are shared between import and onboarding.
 * Any changes here affect both systems. Coordinate changes carefully.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

// ============================================================
// MATCHING WEIGHTS - Shared between import and onboarding
// ============================================================
// Updated to match Phase 3.1 confidence scoring requirements:
// - Email: 40% (highest confidence)
// - Phone: 30% (strong signal)
// - Name similarity: 20% (surname matching)
// - Address: 10% (postcode/town matching)
// Total: 100-point scale

export const MATCHING_WEIGHTS = {
  EMAIL_EXACT: 40, // Email match - 40% of total score
  PHONE: 30, // Phone match - 30% of total score
  SURNAME_POSTCODE: 30, // Surname + Postcode - full name+address score (20% + 10%)
  SURNAME_TOWN: 25, // Surname + Town - partial name+address score (20% + 5%)
  SURNAME_ONLY: 20, // Surname match only - name similarity score
  POSTCODE_ONLY: 10, // Postcode only - full address score
  TOWN_ONLY: 5, // Town only - partial address score
  PLAYER_POSTCODE_BONUS: 10, // Bonus when postcode matches linked player's postcode
  HOUSE_NUMBER: 5, // Tiebreaker - same exact address
} as const;

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 60, // Auto-link - high confidence match (60+ / 100)
  MEDIUM: 40, // Suggest - require user confirmation (40-59 / 100)
  LOW: 20, // Possible - show as option (20-39 / 100)
} as const;

export type ConfidenceLevel = "high" | "medium" | "low";

export type SignalBreakdown = {
  signal: string;
  matched: boolean;
  weight: number; // Percentage (0-100)
  contribution: number; // Actual score contributed (0-weight)
  explanation: string;
};

export type MatchResult = {
  guardianIdentityId: Id<"guardianIdentities">;
  score: number;
  confidence: ConfidenceLevel;
  matchReasons: string[];
  signalBreakdown?: SignalBreakdown[]; // Phase 3.1: Detailed signal breakdown for transparency
  guardian: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  linkedChildren: Array<{
    playerIdentityId: Id<"playerIdentities">;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    postcodeMatchesUser?: boolean; // True if this player's postcode matches the user's postcode
  }>;
};

export type MatchParams = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  altEmail?: string;
  postcode?: string;
  town?: string;
  address?: string;
};

// ============================================================
// TOP-LEVEL REGEX PATTERNS (for performance)
// ============================================================
const NON_DIGIT_REGEX = /\D/g;
const WHITESPACE_REGEX = /\s+/g;
const LEADING_ZEROS_REGEX = /^0+/;
const HOUSE_NUMBER_REGEX = /^\d+/;
const WHITESPACE_ONLY_REGEX = /\s/g;
const NON_DIGIT_PLUS_REGEX = /[^\d+]/g;

// ============================================================
// NORMALIZATION FUNCTIONS
// ============================================================

/**
 * Normalize phone number for comparison.
 * Handles Irish (+353) and UK (+44) mobile formats.
 *
 * @param phone - Raw phone number string
 * @returns Normalized digits-only string
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(NON_DIGIT_REGEX, "");

  // Handle Irish mobile starting with 08 (10 digits total)
  if (digits.startsWith("08") && digits.length === 10) {
    // Convert 087xxx to 353 87xxx
    digits = `353${digits.substring(1)}`;
  }

  // Handle UK mobile starting with 07 (11 digits total)
  if (digits.startsWith("07") && digits.length === 11) {
    // Convert 07xxx to 44 7xxx
    digits = `44${digits.substring(1)}`;
  }

  // Handle numbers already starting with country code
  if (digits.startsWith("353")) {
    // Remove any leading zero after country code: 353 0xx -> 353 xx
    digits = `353${digits.substring(3).replace(LEADING_ZEROS_REGEX, "")}`;
  }
  if (digits.startsWith("44")) {
    // Remove any leading zero after country code
    digits = `44${digits.substring(2).replace(LEADING_ZEROS_REGEX, "")}`;
  }

  return digits;
}

/**
 * Normalize postcode for comparison.
 * Removes whitespace and converts to uppercase.
 *
 * @param postcode - Raw postcode string
 * @returns Normalized uppercase string without spaces
 */
export function normalizePostcode(postcode: string): string {
  return postcode.replace(WHITESPACE_REGEX, "").toUpperCase();
}

/**
 * Normalize name for matching.
 * Extracts first and last name components.
 */
function normalizeNameForMatching(name: string): {
  normalized: string;
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().toLowerCase().split(WHITESPACE_REGEX);
  if (parts.length === 0) {
    return { normalized: "", firstName: "", lastName: "" };
  }
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? (parts.at(-1) ?? "") : "";
  return {
    normalized: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
  };
}

/**
 * Extract house number from address string.
 */
function extractHouseNumber(address: string | undefined): string {
  const match = (address || "").match(HOUSE_NUMBER_REGEX);
  return match ? match[0] : "";
}

/**
 * Common towns for address matching.
 * Used when explicit town field is not provided.
 */
const commonTowns = [
  "armagh",
  "dungannon",
  "portadown",
  "lurgan",
  "craigavon",
  "moy",
  "loughgall",
  "richhill",
  "markethill",
  "keady",
  "crossmaglen",
  "newry",
  "belfast",
  "lisburn",
  "banbridge",
  "tandragee",
  "dublin",
  "cork",
  "galway",
  "limerick",
  "waterford",
];

/**
 * Extract town from address string or explicit town field.
 */
function extractTown(
  address: string | undefined,
  town: string | undefined
): string {
  if (town) {
    return town.toLowerCase().trim();
  }
  const addressLower = (address || "").toLowerCase();
  return commonTowns.find((t) => addressLower.includes(t)) || "";
}

// ============================================================
// SCORING FUNCTIONS
// ============================================================

/**
 * Calculate match score between a guardian and user params.
 * Uses multi-signal scoring for comprehensive matching.
 *
 * @param guardian - Guardian identity to match against
 * @param params - User's profile data for matching
 * @param playerPostcodeMatch - Optional pre-computed player postcode match result
 */
export function calculateMatchScore(
  guardian: Doc<"guardianIdentities">,
  params: MatchParams,
  playerPostcodeMatch?: PlayerPostcodeMatchResult
): {
  score: number;
  matchReasons: string[];
  signalBreakdown: SignalBreakdown[];
} {
  let score = 0;
  const matchReasons: string[] = [];
  const signalBreakdown: SignalBreakdown[] = [];

  const paramsSurname = params.lastName.toLowerCase().trim();
  const guardianSurname = (guardian.lastName || "").toLowerCase().trim();

  // 1. Email match (primary or alt) - 40% weight
  let emailMatched = false;
  let emailExplanation = "No email match";
  if (guardian.email) {
    const guardianEmail = guardian.email.toLowerCase().trim();
    const userEmail = params.email.toLowerCase().trim();
    const userAltEmail = params.altEmail?.toLowerCase().trim();

    if (guardianEmail === userEmail) {
      score += MATCHING_WEIGHTS.EMAIL_EXACT;
      matchReasons.push("Email match (primary)");
      emailMatched = true;
      emailExplanation = `Email addresses match: ${guardianEmail}`;
    } else if (userAltEmail && guardianEmail === userAltEmail) {
      score += MATCHING_WEIGHTS.EMAIL_EXACT;
      matchReasons.push("Email match (alternate)");
      emailMatched = true;
      emailExplanation = `Alternate email matches: ${guardianEmail}`;
    }
  }
  signalBreakdown.push({
    signal: "Email Match",
    matched: emailMatched,
    weight: 40,
    contribution: emailMatched ? MATCHING_WEIGHTS.EMAIL_EXACT : 0,
    explanation: emailExplanation,
  });

  // 2. Phone match - 30% weight
  let phoneMatched = false;
  let phoneExplanation = "No phone match";
  if (guardian.phone && params.phone) {
    const guardianPhone = normalizePhone(guardian.phone);
    const userPhone = normalizePhone(params.phone);

    // Match if last 9+ digits match (handles different country code formats)
    const minLength = Math.min(guardianPhone.length, userPhone.length);
    if (minLength >= 9) {
      const guardianSuffix = guardianPhone.slice(-minLength);
      const userSuffix = userPhone.slice(-minLength);
      if (guardianSuffix === userSuffix) {
        score += MATCHING_WEIGHTS.PHONE;
        matchReasons.push("Phone match");
        phoneMatched = true;
        phoneExplanation = "Phone numbers match";
      }
    }
  }
  signalBreakdown.push({
    signal: "Phone Match",
    matched: phoneMatched,
    weight: 30,
    contribution: phoneMatched ? MATCHING_WEIGHTS.PHONE : 0,
    explanation: phoneExplanation,
  });

  // 3. Surname + Address matching
  const surnameMatch = paramsSurname && paramsSurname === guardianSurname;

  const guardianPostcode = guardian.postcode
    ? normalizePostcode(guardian.postcode)
    : "";
  const userPostcode = params.postcode
    ? normalizePostcode(params.postcode)
    : "";
  const postcodeMatch =
    guardianPostcode && userPostcode && guardianPostcode === userPostcode;

  if (surnameMatch && postcodeMatch) {
    // Surname + Postcode - 30 points (20% name + 10% address)
    score += MATCHING_WEIGHTS.SURNAME_POSTCODE;
    matchReasons.push("Surname + Postcode match (same household)");
  } else if (surnameMatch) {
    // Check for town match
    const guardianTown = extractTown(guardian.address, guardian.town);
    const userTown = extractTown(params.address, params.town);
    const townMatch = guardianTown && userTown && guardianTown === userTown;

    if (townMatch) {
      // Surname + Town - 25 points (20% name + 5% address)
      score += MATCHING_WEIGHTS.SURNAME_TOWN;
      matchReasons.push("Surname + Town match (same area)");
    } else {
      // Surname only - 20 points (name similarity only)
      score += MATCHING_WEIGHTS.SURNAME_ONLY;
      matchReasons.push("Surname match");
    }
  } else if (postcodeMatch) {
    // Postcode only - 10 points
    score += MATCHING_WEIGHTS.POSTCODE_ONLY;
    matchReasons.push("Postcode match");
  } else {
    // Town only - 10 points
    const guardianTown = extractTown(guardian.address, guardian.town);
    const userTown = extractTown(params.address, params.town);
    if (guardianTown && userTown && guardianTown === userTown) {
      score += MATCHING_WEIGHTS.TOWN_ONLY;
      matchReasons.push("Town match");
    }
  }

  // 4. House number match - 5 points (tiebreaker)
  const guardianHouseNumber = extractHouseNumber(guardian.address);
  const userHouseNumber = extractHouseNumber(params.address);
  if (
    guardianHouseNumber &&
    userHouseNumber &&
    guardianHouseNumber === userHouseNumber &&
    !matchReasons.some((r) => r.includes("household"))
  ) {
    score += MATCHING_WEIGHTS.HOUSE_NUMBER;
    matchReasons.push("House number match");
  }

  // 5. Player postcode bonus - 10 points (separated parent scenario)
  // This handles cases where the child lives at a different address than guardian
  if (playerPostcodeMatch?.matches) {
    score += MATCHING_WEIGHTS.PLAYER_POSTCODE_BONUS;
    const playerNames = playerPostcodeMatch.matchedPlayers.join(", ");
    matchReasons.push(`Postcode matches linked player(s): ${playerNames}`);
  }

  // Phase 3.1: Add simplified signal breakdown for transparency
  // Use the core 4 signals matching PRD (Email 40%, Phone 30%, Name 20%, Address 10%)
  const nameMatched = Boolean(surnameMatch);
  const addressMatched = Boolean(postcodeMatch);

  signalBreakdown.push({
    signal: "Name Similarity",
    matched: nameMatched,
    weight: 20,
    contribution: nameMatched ? 20 : 0,
    explanation: nameMatched
      ? `Surnames match: ${guardianSurname}`
      : "Surnames do not match",
  });

  signalBreakdown.push({
    signal: "Address Match",
    matched: addressMatched,
    weight: 10,
    contribution: addressMatched ? 10 : 0,
    explanation: addressMatched
      ? `Postcode matches: ${guardianPostcode}`
      : "No postcode match",
  });

  return { score, matchReasons, signalBreakdown };
}

/**
 * Get confidence level based on score.
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    return "high";
  }
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return "medium";
  }
  return "low";
}

// ============================================================
// MAIN MATCHING FUNCTION
// ============================================================

/**
 * Find matching guardian identities for a self-registered user.
 * Uses multi-signal scoring to find potential guardian matches.
 *
 * @param ctx - Convex query context
 * @param params - User's profile data for matching
 * @returns Array of matches sorted by score descending
 */
export async function findGuardianMatches(
  ctx: QueryCtx,
  params: MatchParams
): Promise<MatchResult[]> {
  const matches: MatchResult[] = [];
  const seenGuardianIds = new Set<string>();

  // Strategy 1: Find by email (primary)
  const emailMatches = await findGuardiansByEmail(ctx, params.email);
  for (const g of emailMatches) {
    seenGuardianIds.add(g._id);
  }

  // Strategy 2: Find by alt email
  if (params.altEmail) {
    const altEmailMatches = await findGuardiansByEmail(ctx, params.altEmail);
    for (const g of altEmailMatches) {
      if (!seenGuardianIds.has(g._id)) {
        emailMatches.push(g);
        seenGuardianIds.add(g._id);
      }
    }
  }

  // Strategy 3: Find by phone
  if (params.phone) {
    const phoneMatches = await findGuardiansByPhone(ctx, params.phone);
    for (const g of phoneMatches) {
      if (!seenGuardianIds.has(g._id)) {
        emailMatches.push(g);
        seenGuardianIds.add(g._id);
      }
    }
  }

  // Strategy 4: Find by postcode (if surname provided)
  if (params.postcode && params.lastName) {
    const postcodeMatches = await findGuardiansByPostcode(ctx, params.postcode);
    for (const g of postcodeMatches) {
      // Only add if surname matches
      const guardianSurname = (g.lastName || "").toLowerCase().trim();
      const userSurname = params.lastName.toLowerCase().trim();
      if (guardianSurname === userSurname && !seenGuardianIds.has(g._id)) {
        emailMatches.push(g);
        seenGuardianIds.add(g._id);
      }
    }
  }

  // Batch compute player postcode matches for all candidates (avoid N+1)
  const playerPostcodeMatchMap = new Map<string, PlayerPostcodeMatchResult>();
  const userPostcode = params.postcode;
  if (userPostcode) {
    const playerPostcodeResults = await Promise.all(
      emailMatches.map((g) =>
        checkPlayerPostcodeMatch(ctx, g._id, userPostcode)
      )
    );
    for (let i = 0; i < emailMatches.length; i++) {
      playerPostcodeMatchMap.set(emailMatches[i]._id, playerPostcodeResults[i]);
    }
  }

  // Score each candidate
  for (const guardian of emailMatches) {
    const playerPostcodeMatch = playerPostcodeMatchMap.get(guardian._id);
    const { score, matchReasons, signalBreakdown } = calculateMatchScore(
      guardian,
      params,
      playerPostcodeMatch
    );

    // Only include if meets minimum threshold
    if (score >= CONFIDENCE_THRESHOLDS.LOW) {
      const linkedChildren = await getLinkedChildren(
        ctx,
        guardian._id,
        params.postcode
      );

      matches.push({
        guardianIdentityId: guardian._id,
        score,
        confidence: getConfidenceLevel(score),
        matchReasons,
        signalBreakdown, // Phase 3.1: Detailed signal breakdown for transparency
        guardian: {
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          email: guardian.email,
          phone: guardian.phone,
        },
        linkedChildren,
      });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

// ============================================================
// DATABASE QUERY HELPERS
// ============================================================

async function findGuardiansByEmail(
  ctx: QueryCtx,
  email: string
): Promise<Doc<"guardianIdentities">[]> {
  const normalizedEmail = email.toLowerCase().trim();
  const guardian = await ctx.db
    .query("guardianIdentities")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .first();

  return guardian ? [guardian] : [];
}

async function findGuardiansByPhone(
  ctx: QueryCtx,
  phone: string
): Promise<Doc<"guardianIdentities">[]> {
  // Try to find by the phone as provided
  const guardians = await ctx.db
    .query("guardianIdentities")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .collect();

  // Also check with different formats
  const results: Doc<"guardianIdentities">[] = [...guardians];
  const seenIds = new Set(results.map((g) => g._id));

  // Try common format variations
  const formats = [
    phone.replace(WHITESPACE_ONLY_REGEX, ""),
    phone.replace(NON_DIGIT_PLUS_REGEX, ""),
  ];

  for (const format of formats) {
    if (format !== phone) {
      const more = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_phone", (q) => q.eq("phone", format))
        .collect();
      for (const g of more) {
        if (!seenIds.has(g._id)) {
          results.push(g);
          seenIds.add(g._id);
        }
      }
    }
  }

  return results;
}

async function findGuardiansByPostcode(
  ctx: QueryCtx,
  postcode: string
): Promise<Doc<"guardianIdentities">[]> {
  const normalized = normalizePostcode(postcode);

  // Try to find by normalized postcode
  const guardians = await ctx.db
    .query("guardianIdentities")
    .withIndex("by_postcode", (q) => q.eq("postcode", normalized))
    .collect();

  // Also try original format
  if (postcode !== normalized) {
    const more = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_postcode", (q) => q.eq("postcode", postcode))
      .collect();

    const seenIds = new Set(guardians.map((g) => g._id));
    for (const g of more) {
      if (!seenIds.has(g._id)) {
        guardians.push(g);
      }
    }
  }

  return guardians;
}

async function getLinkedChildren(
  ctx: QueryCtx,
  guardianIdentityId: Id<"guardianIdentities">,
  userPostcode?: string
): Promise<MatchResult["linkedChildren"]> {
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_guardian", (q) =>
      q.eq("guardianIdentityId", guardianIdentityId)
    )
    .collect();

  // Batch fetch all player identities
  const playerIds = links.map((l) => l.playerIdentityId);
  const players = await Promise.all(playerIds.map((id) => ctx.db.get(id)));

  const normalizedUserPostcode = userPostcode
    ? normalizePostcode(userPostcode)
    : "";

  const children: MatchResult["linkedChildren"] = [];
  for (const player of players) {
    if (player) {
      // Check if player's postcode matches user's postcode
      let postcodeMatchesUser: boolean | undefined;
      if (normalizedUserPostcode && player.postcode) {
        const normalizedPlayerPostcode = normalizePostcode(player.postcode);
        postcodeMatchesUser =
          normalizedPlayerPostcode === normalizedUserPostcode;
      }

      children.push({
        playerIdentityId: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth,
        postcodeMatchesUser,
      });
    }
  }

  return children;
}

// ============================================================
// PLAYER POSTCODE MATCHING
// ============================================================

export type PlayerPostcodeMatchResult = {
  matches: boolean;
  matchedPlayers: string[];
};

/**
 * Check if a user's postcode matches any linked player's postcode.
 * Used for separated parent scenarios where child lives with one parent.
 *
 * @param ctx - Convex query context
 * @param guardianIdentityId - Guardian to check linked players for
 * @param userPostcode - User's postcode to match against
 * @returns Object with matches boolean and list of matched player names
 */
export async function checkPlayerPostcodeMatch(
  ctx: QueryCtx,
  guardianIdentityId: Id<"guardianIdentities">,
  userPostcode: string
): Promise<PlayerPostcodeMatchResult> {
  if (!userPostcode) {
    return { matches: false, matchedPlayers: [] };
  }

  const normalizedUserPostcode = normalizePostcode(userPostcode);

  // Get all non-declined guardian-player links
  const links = await ctx.db
    .query("guardianPlayerLinks")
    .withIndex("by_guardian", (q) =>
      q.eq("guardianIdentityId", guardianIdentityId)
    )
    .collect();

  // Filter out declined links
  const activeLinks = links.filter((link) => link.status !== "declined");

  if (activeLinks.length === 0) {
    return { matches: false, matchedPlayers: [] };
  }

  // Batch fetch all player identities
  const playerIds = activeLinks.map((l) => l.playerIdentityId);
  const players = await Promise.all(playerIds.map((id) => ctx.db.get(id)));

  // Check for postcode matches
  const matchedPlayers: string[] = [];
  for (const player of players) {
    if (player?.postcode) {
      const normalizedPlayerPostcode = normalizePostcode(player.postcode);
      if (normalizedPlayerPostcode === normalizedUserPostcode) {
        matchedPlayers.push(`${player.firstName} ${player.lastName}`);
      }
    }
  }

  return {
    matches: matchedPlayers.length > 0,
    matchedPlayers,
  };
}

// ============================================================
// UTILITY EXPORTS FOR IMPORT MODULE
// ============================================================

/**
 * Parse full name into first and last name components.
 * Exported for use by import module.
 */
export function parseFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const { firstName, lastName } = normalizeNameForMatching(fullName);
  return { firstName, lastName };
}
