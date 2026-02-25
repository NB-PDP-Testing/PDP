import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import type { DataModel } from "../_generated/dataModel";
import { internalQuery, query } from "../_generated/server";
import {
  ALIAS_TO_CANONICAL,
  calculateMatchScore,
  levenshteinSimilarity,
  normalizeForMatching,
} from "../lib/stringMatching";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

const playerTypeValidator = v.union(v.literal("youth"), v.literal("adult"));

const verificationStatusValidator = v.union(
  v.literal("unverified"),
  v.literal("guardian_verified"),
  v.literal("self_verified"),
  v.literal("document_verified")
);

const playerIdentityMatchValidator = v.object({
  _id: v.id("playerIdentities"),
  _creationTime: v.number(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  gender: genderValidator,
  playerType: playerTypeValidator,
  verificationStatus: verificationStatusValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  userId: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  claimedAt: v.optional(v.number()),
  claimInvitedBy: v.optional(v.string()),
  playerWelcomedAt: v.optional(v.number()),
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),
  importSessionId: v.optional(v.id("importSessions")),
  externalIds: v.optional(v.record(v.string(), v.string())),
  federationIds: v.optional(
    v.object({
      fai: v.optional(v.string()),
      irfu: v.optional(v.string()),
      gaa: v.optional(v.string()),
      other: v.optional(v.string()),
    })
  ),
  lastSyncedAt: v.optional(v.number()),
  lastSyncedData: v.optional(v.any()),
  isActive: v.optional(v.boolean()),
  createdFrom: v.optional(v.string()),
});

const matchResultValidator = v.object({
  confidence: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low"),
    v.literal("none")
  ),
  match: v.union(playerIdentityMatchValidator, v.null()),
  matchedFields: v.array(v.string()),
  warningFlag: v.optional(v.string()),
});

// ============================================================
// MATCHING ALGORITHM HELPERS
// ============================================================

type ConfidenceLevel = "high" | "medium" | "low" | "none";

function boostConfidence(confidence: ConfidenceLevel): ConfidenceLevel {
  if (confidence === "low") {
    return "medium";
  }
  if (confidence === "medium") {
    return "high";
  }
  return "high";
}

/**
 * Check if two first names are Irish phonetic aliases of each other.
 * Returns true if both resolve to the same canonical form.
 */
function areIrishAliases(nameA: string, nameB: string): boolean {
  const normalA = normalizeForMatching(nameA);
  const normalB = normalizeForMatching(nameB);
  const canonicalA = ALIAS_TO_CANONICAL.get(normalA);
  const canonicalB = ALIAS_TO_CANONICAL.get(normalB);
  return Boolean(canonicalA && canonicalB && canonicalA === canonicalB);
}

// ============================================================
// CORE MATCHING ARGS (shared between query and internalQuery)
// ============================================================

const matchingArgs = {
  organizationId: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  email: v.optional(v.string()),
  gaaNumber: v.optional(v.string()),
  federationIds: v.optional(
    v.object({
      fai: v.optional(v.string()),
      irfu: v.optional(v.string()),
      gaa: v.optional(v.string()),
      other: v.optional(v.string()),
    })
  ),
};

// ============================================================
// SHARED HANDLER LOGIC
// ============================================================

async function findMatchingYouthProfileHandler(
  ctx: GenericQueryCtx<DataModel>,
  args: {
    organizationId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    email?: string;
    gaaNumber?: string;
    federationIds?: {
      fai?: string;
      irfu?: string;
      gaa?: string;
      other?: string;
    };
  }
): Promise<{
  confidence: ConfidenceLevel;
  match: DataModel["playerIdentities"]["document"] | null;
  matchedFields: string[];
  warningFlag?: string;
}> {
  // ── PRE-FETCH: Batch-fetch org's youth players (shared by PRIORITY -1 and PRIORITY 1) ──
  const enrollments = await ctx.db
    .query("orgPlayerEnrollments")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", args.organizationId)
    )
    .collect();

  const youthPlayers: DataModel["playerIdentities"]["document"][] = [];
  if (enrollments.length > 0) {
    const uniquePlayerIds = [
      ...new Set(enrollments.map((e) => e.playerIdentityId)),
    ];
    const playerDocs = await Promise.all(
      uniquePlayerIds.map((id) => ctx.db.get(id))
    );
    for (const p of playerDocs) {
      if (p !== null && p.playerType === "youth") {
        youthPlayers.push(p);
      }
    }
  }

  // ── PRIORITY -1: Federation ID match (definitive HIGH confidence) ─────
  // One exact federation ID match short-circuits all fuzzy checks
  if (args.federationIds) {
    const fed = args.federationIds;
    for (const player of youthPlayers) {
      const playerFed = player.federationIds;
      const playerLegacyGaa = player.externalIds?.foireann;

      let matchedBody: string | undefined;

      if (fed.fai && playerFed?.fai && fed.fai === playerFed.fai) {
        matchedBody = "fai";
      } else if (fed.irfu && playerFed?.irfu && fed.irfu === playerFed.irfu) {
        matchedBody = "irfu";
      } else if (
        fed.gaa &&
        ((playerFed?.gaa && fed.gaa === playerFed.gaa) ||
          (playerLegacyGaa && fed.gaa === playerLegacyGaa))
      ) {
        matchedBody = "gaa";
      } else if (
        fed.other &&
        playerFed?.other &&
        fed.other === playerFed.other
      ) {
        matchedBody = "other";
      }

      if (matchedBody) {
        return {
          confidence: "high",
          match: player,
          matchedFields: [`federationId:${matchedBody}`],
        };
      }
    }
  }

  // ── PRIORITY 0: Exact name+DOB index match ────────────────────────────
  const exactMatches = await ctx.db
    .query("playerIdentities")
    .withIndex("by_name_dob", (q) =>
      q
        .eq("firstName", args.firstName)
        .eq("lastName", args.lastName)
        .eq("dateOfBirth", args.dateOfBirth)
    )
    .collect();

  for (const candidate of exactMatches) {
    if (candidate.playerType === "youth") {
      // Opportunistic GAA corroboration
      let warningFlag: string | undefined;
      if (
        args.gaaNumber &&
        candidate.externalIds?.foireann &&
        args.gaaNumber !== candidate.externalIds.foireann
      ) {
        warningFlag = "GAA membership number mismatch — review before linking";
      }
      return {
        confidence: "high",
        match: candidate,
        matchedFields: ["firstName", "lastName", "dateOfBirth"],
        warningFlag,
      };
    }
  }

  // ── PRIORITY 1: Fuzzy matching on org's youth players ─────────────────
  // Uses pre-fetched youthPlayers (no additional DB queries needed)

  if (youthPlayers.length === 0) {
    return { confidence: "none", match: null, matchedFields: [] };
  }

  // Score each youth player
  const normalizedCandidateFirst = normalizeForMatching(args.firstName);
  const normalizedCandidateLast = normalizeForMatching(args.lastName);
  const normalizedCandidateEmail = args.email?.toLowerCase().trim();

  let bestConfidence: ConfidenceLevel = "none";
  let bestMatch: (typeof youthPlayers)[number] | null = null;
  let bestMatchedFields: string[] = [];
  let bestWarningFlag: string | undefined;

  for (const player of youthPlayers) {
    if (player === null) {
      continue;
    }

    const normalizedStoredFirst = normalizeForMatching(player.firstName);
    const normalizedStoredLast = normalizeForMatching(player.lastName);

    const dobMatches = player.dateOfBirth === args.dateOfBirth;
    const lastSimilarity = levenshteinSimilarity(
      normalizedCandidateLast,
      normalizedStoredLast
    );
    const firstSimilarity = levenshteinSimilarity(
      normalizedCandidateFirst,
      normalizedStoredFirst
    );

    // Check Irish phonetic aliases for first name
    const firstNamesAreAliases = areIrishAliases(
      args.firstName,
      player.firstName
    );

    // Also run calculateMatchScore for combined full-name alias detection
    const fullNameScore = calculateMatchScore(
      `${args.firstName} ${args.lastName}`,
      player.firstName,
      player.lastName
    );

    let confidence: ConfidenceLevel = "none";
    const matchedFields: string[] = [];

    // HIGH: exact DOB + surname similarity >= 0.85
    if (dobMatches && lastSimilarity >= 0.85) {
      confidence = "high";
      matchedFields.push("dateOfBirth", "lastName");
      if (firstSimilarity >= 0.85 || firstNamesAreAliases) {
        matchedFields.push("firstName");
      }
    }
    // HIGH: Irish alias match on first name + exact DOB (e.g. Niamh/Neeve same DOB)
    else if (dobMatches && firstNamesAreAliases && lastSimilarity >= 0.7) {
      confidence = "high";
      matchedFields.push("dateOfBirth", "firstName", "lastName");
    }
    // HIGH: full-name score from calculateMatchScore >= 0.85 + exact DOB
    else if (dobMatches && fullNameScore >= 0.85) {
      confidence = "high";
      matchedFields.push("dateOfBirth", "firstName", "lastName");
    }
    // MEDIUM: exact DOB + first name similarity >= 0.85 (surname mismatch)
    else if (dobMatches && firstSimilarity >= 0.85) {
      confidence = "medium";
      matchedFields.push("dateOfBirth", "firstName");
    }
    // LOW: surname similarity >= 0.85 without DOB
    else if (lastSimilarity >= 0.85) {
      confidence = "low";
      matchedFields.push("lastName");
    }

    if (confidence === "none") {
      continue;
    }

    // Email boost: exact email match boosts by one level
    if (
      normalizedCandidateEmail &&
      player.email &&
      normalizedCandidateEmail === player.email.toLowerCase().trim()
    ) {
      confidence = boostConfidence(confidence);
      if (!matchedFields.includes("email")) {
        matchedFields.push("email");
      }
    }

    // Opportunistic GAA corroboration (after confidence determined)
    let warningFlag: string | undefined;
    if (args.gaaNumber && player.externalIds?.foireann) {
      if (args.gaaNumber === player.externalIds.foireann) {
        // GAA number agreement — boost to HIGH
        confidence = "high";
        if (!matchedFields.includes("gaaNumber")) {
          matchedFields.push("gaaNumber");
        }
      } else {
        // Disagreement — add warning flag
        warningFlag = "GAA membership number mismatch — review before linking";
      }
    }

    // Keep track of best match (prefer higher confidence)
    const confidenceRank = { high: 3, medium: 2, low: 1, none: 0 };
    if (confidenceRank[confidence] > confidenceRank[bestConfidence]) {
      bestConfidence = confidence;
      bestMatch = player;
      bestMatchedFields = matchedFields;
      bestWarningFlag = warningFlag;
    }
  }

  return {
    confidence: bestConfidence,
    match: bestMatch,
    matchedFields: bestMatchedFields,
    warningFlag: bestWarningFlag,
  };
}

// ============================================================
// PUBLIC QUERY (called from frontend: manual add, CSV import, invite dialog)
// ============================================================

/**
 * Find a matching youth playerIdentity for an adult being added to the system.
 *
 * Used by all three adult entry points:
 * - Manual add (admin/players/page.tsx)
 * - CSV import preview (admin/player-import/page.tsx)
 * - Email invite dialog
 *
 * Algorithm:
 * - PRIORITY 0: Exact name+DOB index → HIGH confidence
 * - PRIORITY 1: Fuzzy surname+DOB / first+DOB / surname-only → HIGH/MEDIUM/LOW
 * - Email boost: exact email match boosts confidence by one level
 * - Opportunistic GAA: foireann number agreement → HIGH; disagreement → warningFlag
 */
export const findMatchingYouthProfile = query({
  args: matchingArgs,
  returns: matchResultValidator,
  handler: async (ctx, args) => findMatchingYouthProfileHandler(ctx, args),
});

// ============================================================
// INTERNAL QUERY (called from mutations/actions: join request, invite acceptance)
// ============================================================

/**
 * Internal version of findMatchingYouthProfile for use in mutations and actions.
 */
export const findMatchingYouthProfileInternal = internalQuery({
  args: matchingArgs,
  returns: matchResultValidator,
  handler: async (ctx, args) => findMatchingYouthProfileHandler(ctx, args),
});
