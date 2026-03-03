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

// Complete player identity fields — kept in sync with schema
const playerIdentityFields = {
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
  address2: v.optional(v.string()),
  town: v.optional(v.string()),
  county: v.optional(v.string()),
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
  normalizedFirstName: v.optional(v.string()),
  normalizedLastName: v.optional(v.string()),
};

// A single match candidate: full player identity + matching metadata
const matchCandidateValidator = v.object({
  ...playerIdentityFields,
  matchScore: v.number(),
  matchedFields: v.array(v.string()),
  warningFlag: v.optional(v.string()),
  confidence: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low"),
    v.literal("none")
  ),
});

// Single best match result (for automated flows)
const bestMatchResultValidator = v.object({
  confidence: v.union(
    v.literal("high"),
    v.literal("medium"),
    v.literal("low"),
    v.literal("none")
  ),
  match: v.union(v.object(playerIdentityFields), v.null()),
  matchScore: v.number(),
  matchedFields: v.array(v.string()),
  warningFlag: v.optional(v.string()),
});

// ============================================================
// SHARED ARGS
// ============================================================

const matchingArgs = {
  organizationId: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  postcode: v.optional(v.string()),
  address: v.optional(v.string()),
  gaaNumber: v.optional(v.string()),
  federationIds: v.optional(
    v.object({
      fai: v.optional(v.string()),
      irfu: v.optional(v.string()),
      gaa: v.optional(v.string()),
      other: v.optional(v.string()),
    })
  ),
  /** Optional filter: restrict results to "youth" or "adult" only */
  playerType: v.optional(playerTypeValidator),
};

// ============================================================
// HELPERS
// ============================================================

type ConfidenceLevel = "high" | "medium" | "low" | "none";

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

function boostConfidence(confidence: ConfidenceLevel): ConfidenceLevel {
  if (confidence === "low") {
    return "medium";
  }
  if (confidence === "medium") {
    return "high";
  }
  return "high";
}

function areIrishAliases(nameA: string, nameB: string): boolean {
  const normalA = normalizeForMatching(nameA);
  const normalB = normalizeForMatching(nameB);
  const canonicalA = ALIAS_TO_CANONICAL.get(normalA);
  const canonicalB = ALIAS_TO_CANONICAL.get(normalB);
  return Boolean(canonicalA && canonicalB && canonicalA === canonicalB);
}

function normalizePostcode(postcode: string): string {
  return postcode.toUpperCase().replace(/\s/g, "");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

// ============================================================
// CORE MATCHING HANDLER
// Returns all candidates above "none", sorted by confidence then score.
// ============================================================

type MatchResult = {
  player: DataModel["playerIdentities"]["document"];
  confidence: ConfidenceLevel;
  matchScore: number;
  matchedFields: string[];
  warningFlag?: string;
};

async function findPlayerMatchesHandler(
  ctx: GenericQueryCtx<DataModel>,
  args: {
    organizationId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    email?: string;
    phone?: string;
    postcode?: string;
    address?: string;
    gaaNumber?: string;
    federationIds?: {
      fai?: string;
      irfu?: string;
      gaa?: string;
      other?: string;
    };
    playerType?: "youth" | "adult";
  }
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  // ── PRE-FETCH: Org's enrolled players ──────────────────────────────────────
  const enrollments = await ctx.db
    .query("orgPlayerEnrollments")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", args.organizationId)
    )
    .collect();

  const orgPlayers: DataModel["playerIdentities"]["document"][] = [];
  if (enrollments.length > 0) {
    const uniquePlayerIds = [
      ...new Set(enrollments.map((e) => e.playerIdentityId)),
    ];
    const playerDocs = await Promise.all(
      uniquePlayerIds.map((id) => ctx.db.get(id))
    );
    for (const p of playerDocs) {
      if (
        p !== null &&
        (!args.playerType || p.playerType === args.playerType)
      ) {
        orgPlayers.push(p);
      }
    }
  }

  // ── PRIORITY -1: Federation ID match (definitive HIGH, short-circuits) ─────
  if (args.federationIds) {
    const fed = args.federationIds;
    for (const player of orgPlayers) {
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
        return [
          {
            player,
            confidence: "high",
            matchScore: 100,
            matchedFields: [`federationId:${matchedBody}`],
          },
        ];
      }
    }
  }

  // Track IDs added via exact index to avoid duplicates in fuzzy pass
  const addedIds = new Set<string>();

  // Pre-compute normalized forms (used in Priority 0.5 and Priority 1)
  const normFirst = normalizeForMatching(args.firstName);
  const normLast = normalizeForMatching(args.lastName);

  // ── PRIORITY 0: Exact name+DOB index match (global, not org-scoped) ────────
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
    if (args.playerType && candidate.playerType !== args.playerType) {
      continue;
    }

    let score = 90;
    const matchedFields = ["firstName", "lastName", "dateOfBirth"];
    let warningFlag: string | undefined;

    // GAA corroboration
    if (
      args.gaaNumber &&
      candidate.externalIds?.foireann &&
      args.gaaNumber !== candidate.externalIds.foireann
    ) {
      warningFlag = "GAA membership number mismatch — review before linking";
    }

    // Additional signals on top of exact match
    if (
      args.email &&
      candidate.email &&
      args.email.toLowerCase().trim() === candidate.email.toLowerCase().trim()
    ) {
      score += 25;
      matchedFields.push("email");
    }
    if (
      args.phone &&
      candidate.phone &&
      normalizePhone(args.phone) === normalizePhone(candidate.phone)
    ) {
      score += 20;
      matchedFields.push("phone");
    }
    if (
      args.postcode &&
      candidate.postcode &&
      normalizePostcode(args.postcode) === normalizePostcode(candidate.postcode)
    ) {
      score += 15;
      matchedFields.push("postcode");
    }
    if (
      args.address &&
      candidate.address &&
      args.address.toLowerCase().trim() ===
        candidate.address.toLowerCase().trim()
    ) {
      score += 10;
      matchedFields.push("address");
    }

    results.push({
      player: candidate,
      confidence: "high",
      matchScore: score,
      matchedFields,
      warningFlag,
    });
    addedIds.add(candidate._id);
  }

  // ── PRIORITY 0.5: Normalized name + DOB index (global → filtered to org) ───
  // Uses stored normalizedFirstName/normalizedLastName for O(log n) lookup.
  // Catches normalized-exact matches Priority 0 misses (accents, O'/Mc prefixes).
  // Also checks Irish canonical alias variants for the first name.
  const canonicalFirst = ALIAS_TO_CANONICAL.get(normFirst);
  const firstNameVariants = [normFirst];
  if (canonicalFirst && canonicalFirst !== normFirst) {
    firstNameVariants.push(canonicalFirst);
  }

  for (const normFirstVariant of firstNameVariants) {
    const normalizedCandidates = await ctx.db
      .query("playerIdentities")
      .withIndex("by_normalized_name_dob", (q) =>
        q
          .eq("normalizedLastName", normLast)
          .eq("normalizedFirstName", normFirstVariant)
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .collect();

    for (const candidate of normalizedCandidates) {
      if (addedIds.has(candidate._id)) {
        continue;
      }
      if (args.playerType && candidate.playerType !== args.playerType) {
        continue;
      }

      // Check org membership via index (avoids .filter())
      const enrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", candidate._id)
            .eq("organizationId", args.organizationId)
        )
        .first();

      if (!enrollment) {
        continue;
      }

      // Normalized exact name + DOB = HIGH confidence
      let score = 85;
      const matchedFields = ["firstName", "lastName", "dateOfBirth"];
      let warningFlag: string | undefined;

      if (
        args.email &&
        candidate.email &&
        args.email.toLowerCase().trim() === candidate.email.toLowerCase().trim()
      ) {
        score += 25;
        matchedFields.push("email");
      }
      if (
        args.phone &&
        candidate.phone &&
        normalizePhone(args.phone) === normalizePhone(candidate.phone)
      ) {
        score += 20;
        matchedFields.push("phone");
      }
      if (args.postcode && candidate.postcode) {
        const storedPostcode = normalizePostcode(candidate.postcode);
        const candidatePostcode = normalizePostcode(args.postcode);
        if (
          storedPostcode === candidatePostcode ||
          storedPostcode.startsWith(candidatePostcode) ||
          candidatePostcode.startsWith(storedPostcode)
        ) {
          score += 15;
          matchedFields.push("postcode");
        }
      }
      if (
        args.address &&
        candidate.address &&
        args.address.toLowerCase().trim() ===
          candidate.address.toLowerCase().trim()
      ) {
        score += 10;
        matchedFields.push("address");
      }
      if (
        args.gaaNumber &&
        candidate.externalIds?.foireann &&
        args.gaaNumber !== candidate.externalIds.foireann
      ) {
        warningFlag = "GAA membership number mismatch — review before linking";
      }

      results.push({
        player: candidate,
        confidence: "high",
        matchScore: score,
        matchedFields,
        warningFlag,
      });
      addedIds.add(candidate._id);
    }
  }

  // ── PRIORITY 1: Fuzzy matching across org's enrolled players ───────────────
  if (orgPlayers.length === 0) {
    return sortResults(results);
  }

  const normalizedCandidateFirst = normFirst;
  const normalizedCandidateLast = normLast;
  const normalizedCandidateEmail = args.email?.toLowerCase().trim() ?? "";
  const normalizedCandidatePhone = args.phone ? normalizePhone(args.phone) : "";
  const normalizedCandidatePostcode = args.postcode
    ? normalizePostcode(args.postcode)
    : "";

  for (const player of orgPlayers) {
    if (addedIds.has(player._id)) {
      continue; // Already captured via exact index
    }

    const normalizedStoredFirst =
      player.normalizedFirstName ?? normalizeForMatching(player.firstName);
    const normalizedStoredLast =
      player.normalizedLastName ?? normalizeForMatching(player.lastName);

    const dobMatches = player.dateOfBirth === args.dateOfBirth;
    const lastSimilarity = levenshteinSimilarity(
      normalizedCandidateLast,
      normalizedStoredLast
    );
    const firstSimilarity = levenshteinSimilarity(
      normalizedCandidateFirst,
      normalizedStoredFirst
    );
    const firstNamesAreAliases = areIrishAliases(
      args.firstName,
      player.firstName
    );
    const fullNameScore = calculateMatchScore(
      `${args.firstName} ${args.lastName}`,
      player.firstName,
      player.lastName
    );

    let confidence: ConfidenceLevel = "none";
    const matchedFields: string[] = [];
    let matchScore = 0;

    // Name+DOB confidence tiers (same thresholds as original findMatchingYouthProfile)
    if (dobMatches && lastSimilarity >= 0.85) {
      confidence = "high";
      matchScore = 70 + Math.round(lastSimilarity * 10);
      matchedFields.push("dateOfBirth", "lastName");
      if (firstSimilarity >= 0.85 || firstNamesAreAliases) {
        matchedFields.push("firstName");
        matchScore += 5;
      }
    } else if (dobMatches && firstNamesAreAliases && lastSimilarity >= 0.7) {
      confidence = "high";
      matchScore = 65;
      matchedFields.push("dateOfBirth", "firstName", "lastName");
    } else if (dobMatches && fullNameScore >= 0.85) {
      confidence = "high";
      matchScore = 65;
      matchedFields.push("dateOfBirth", "firstName", "lastName");
    } else if (dobMatches && firstSimilarity >= 0.85) {
      confidence = "medium";
      matchScore = 50;
      matchedFields.push("dateOfBirth", "firstName");
    } else if (lastSimilarity >= 0.85) {
      confidence = "low";
      matchScore = 30;
      matchedFields.push("lastName");
    }

    if (confidence === "none") {
      continue;
    }

    // Email exact match → boost confidence + score
    if (
      normalizedCandidateEmail &&
      player.email &&
      normalizedCandidateEmail === player.email.toLowerCase().trim()
    ) {
      confidence = boostConfidence(confidence);
      matchScore += 25;
      if (!matchedFields.includes("email")) {
        matchedFields.push("email");
      }
    }

    // Phone exact match → boost confidence + score
    if (normalizedCandidatePhone.length >= 10 && player.phone) {
      const storedPhone = normalizePhone(player.phone);
      if (storedPhone === normalizedCandidatePhone) {
        confidence = boostConfidence(confidence);
        matchScore += 20;
        if (!matchedFields.includes("phone")) {
          matchedFields.push("phone");
        }
      }
    }

    // Postcode match → score only (no confidence boost — too ambiguous alone)
    if (normalizedCandidatePostcode && player.postcode) {
      const storedPostcode = normalizePostcode(player.postcode);
      if (
        storedPostcode === normalizedCandidatePostcode ||
        storedPostcode.startsWith(normalizedCandidatePostcode) ||
        normalizedCandidatePostcode.startsWith(storedPostcode)
      ) {
        matchScore += 15;
        if (!matchedFields.includes("postcode")) {
          matchedFields.push("postcode");
        }
      }
    }

    // Address match → score only
    if (
      args.address &&
      player.address &&
      args.address.toLowerCase().trim() === player.address.toLowerCase().trim()
    ) {
      matchScore += 10;
      if (!matchedFields.includes("address")) {
        matchedFields.push("address");
      }
    }

    // GAA corroboration
    let warningFlag: string | undefined;
    if (args.gaaNumber && player.externalIds?.foireann) {
      if (args.gaaNumber === player.externalIds.foireann) {
        confidence = "high";
        matchScore += 20;
        if (!matchedFields.includes("gaaNumber")) {
          matchedFields.push("gaaNumber");
        }
      } else {
        warningFlag = "GAA membership number mismatch — review before linking";
      }
    }

    results.push({
      player,
      confidence,
      matchScore,
      matchedFields,
      warningFlag,
    });
    addedIds.add(player._id);
  }

  return sortResults(results);
}

function sortResults(results: MatchResult[]): MatchResult[] {
  return results.sort((a, b) => {
    const confDiff =
      CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (confDiff !== 0) {
      return confDiff;
    }
    return b.matchScore - a.matchScore;
  });
}

// ============================================================
// PUBLIC QUERY: findPlayerMatchCandidates
// Returns a ranked list of all candidates — use where a human confirms the match.
// Entry points: admin add player, admin invite, admin users page, CSV import preview.
// ============================================================

/**
 * Find all potential matching player identities for a given person.
 *
 * Returns candidates sorted by confidence (high → low) then match score.
 * A human (admin or the user themselves) should confirm which record is correct.
 *
 * Signals checked:
 * - Federation IDs (FAI/IRFU/GAA) → definitive HIGH, short-circuits
 * - Exact name + DOB (global index) → HIGH
 * - Fuzzy name similarity + DOB (org-scoped) → HIGH/MEDIUM/LOW
 * - Email exact match → boosts confidence + score
 * - Phone exact match → boosts confidence + score
 * - Postcode match → score boost
 * - Address match → score boost
 * - GAA number agreement → HIGH; disagreement → warningFlag
 *
 * Optional `playerType` filter restricts results to "youth" or "adult" only.
 */
export const findPlayerMatchCandidates = query({
  args: matchingArgs,
  returns: v.array(matchCandidateValidator),
  handler: async (ctx, args) => {
    const matches = await findPlayerMatchesHandler(ctx, args);
    return matches.map(
      ({ player, confidence, matchScore, matchedFields, warningFlag }) => ({
        ...player,
        confidence,
        matchScore,
        matchedFields,
        warningFlag,
      })
    );
  },
});

// ============================================================
// PUBLIC QUERY: findBestPlayerMatch
// Returns only the single best match — use in automated flows.
// Entry points: join request creation, graduation claim.
// ============================================================

/**
 * Find the single best matching player identity for a given person.
 *
 * Returns the highest-confidence, highest-scoring candidate, or
 * { confidence: "none", match: null } if no match found.
 *
 * Use this in automated flows where a human isn't confirming the match
 * (e.g. join request pre-filling, graduation auto-claim).
 */
export const findBestPlayerMatch = query({
  args: matchingArgs,
  returns: bestMatchResultValidator,
  handler: async (ctx, args) => {
    const matches = await findPlayerMatchesHandler(ctx, args);
    if (matches.length === 0) {
      return {
        confidence: "none" as const,
        match: null,
        matchScore: 0,
        matchedFields: [],
      };
    }
    const best = matches[0];
    return {
      confidence: best.confidence,
      match: best.player,
      matchScore: best.matchScore,
      matchedFields: best.matchedFields,
      warningFlag: best.warningFlag,
    };
  },
});

// ============================================================
// INTERNAL QUERY: findBestPlayerMatchInternal
// Same as findBestPlayerMatch but callable from mutations/actions.
// Entry points: createJoinRequest, autoClaimByEmail, claimPlayerAccount.
// ============================================================

export const findBestPlayerMatchInternal = internalQuery({
  args: matchingArgs,
  returns: bestMatchResultValidator,
  handler: async (ctx, args) => {
    const matches = await findPlayerMatchesHandler(ctx, args);
    if (matches.length === 0) {
      return {
        confidence: "none" as const,
        match: null,
        matchScore: 0,
        matchedFields: [],
      };
    }
    const best = matches[0];
    return {
      confidence: best.confidence,
      match: best.player,
      matchScore: best.matchScore,
      matchedFields: best.matchedFields,
      warningFlag: best.warningFlag,
    };
  },
});
