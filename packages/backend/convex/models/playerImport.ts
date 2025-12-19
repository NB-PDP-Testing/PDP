import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { calculateAge } from "./playerIdentities";

// ============================================================
// PLAYER IMPORT WITH IDENTITY SYSTEM
// ============================================================
// This module provides import functionality that creates proper
// platform-level identities instead of org-scoped player records.
// ============================================================

// ============================================================
// HELPER FUNCTIONS FOR GUARDIAN MATCHING
// ============================================================

/**
 * Normalize a name for matching - extracts first and last name
 */
function normalizeNameForMatching(name: string): {
  normalized: string;
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().toLowerCase().split(/\s+/);
  if (parts.length === 0) {
    return { normalized: "", firstName: "", lastName: "" };
  }
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  return {
    normalized: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
  };
}

/**
 * Clean postcode for comparison (remove spaces, uppercase)
 */
function cleanPostcode(postcode: string | undefined): string {
  return (postcode || "").toUpperCase().replace(/\s/g, "");
}

/**
 * Extract house number from address
 */
function extractHouseNumber(address: string | undefined): string {
  const match = (address || "").match(/^\d+/);
  return match ? match[0] : "";
}

/**
 * Common towns for address matching (can be extended)
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
];

/**
 * Extract town from address string
 */
function extractTown(
  address: string | undefined,
  town: string | undefined
): string {
  if (town) return town.toLowerCase().trim();
  const addressLower = (address || "").toLowerCase();
  return commonTowns.find((t) => addressLower.includes(t)) || "";
}

// ============================================================
// GUARDIAN MATCHING TYPES
// ============================================================

type PlayerForMatching = {
  index: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  playerType: "youth" | "adult";
  gender: "male" | "female" | "other";
  email?: string;
  phone?: string;
  address?: string;
  town?: string;
  postcode?: string;
  // Explicit parent info if provided
  parentFirstName?: string;
  parentLastName?: string;
  parentEmail?: string;
  parentPhone?: string;
};

type GuardianMatch = {
  youthPlayerIndex: number;
  adultPlayerIndex: number;
  score: number;
  matchReasons: string[];
  confidence: "high" | "medium" | "low";
};

/**
 * Find potential guardian-child matches within a batch import.
 * Uses multi-signal scoring to match youth players with adult members.
 *
 * Scoring system:
 * - Email match: 50 points (highest confidence)
 * - Surname + Postcode: 45 points (strong family signal)
 * - Phone match: 30 points (strong signal)
 * - Surname + Town: 35 points (medium family signal)
 * - Postcode only: 20 points
 * - Town only: 10 points
 * - House number: 5 points
 *
 * Confidence tiers:
 * - High: 60+ points (auto-link)
 * - Medium: 40-59 points (suggest)
 * - Low: 20-39 points (possible)
 */
function findGuardianMatchesInBatch(
  players: PlayerForMatching[]
): GuardianMatch[] {
  const matches: GuardianMatch[] = [];

  // Separate youth and adult players
  const youthPlayers = players.filter((p) => p.playerType === "youth");
  const adultPlayers = players.filter((p) => p.playerType === "adult");

  // For each youth player, find potential guardian matches
  for (const youth of youthPlayers) {
    const youthSurname = normalizeNameForMatching(
      `${youth.firstName} ${youth.lastName}`
    ).lastName;
    const youthPostcode = cleanPostcode(youth.postcode);
    const youthTown = extractTown(youth.address, youth.town);
    const youthHouseNumber = extractHouseNumber(youth.address);

    for (const adult of adultPlayers) {
      let score = 0;
      const matchReasons: string[] = [];

      const adultSurname = normalizeNameForMatching(
        `${adult.firstName} ${adult.lastName}`
      ).lastName;

      // 1. Email match - 50 points (highest confidence)
      if (youth.email && adult.email) {
        const youthEmail = youth.email.toLowerCase().trim();
        const adultEmail = adult.email.toLowerCase().trim();
        if (youthEmail === adultEmail) {
          score += 50;
          matchReasons.push("Email match");
        }
      }

      // 2. Phone match - 30 points (strong signal)
      if (youth.phone && adult.phone) {
        const youthPhone = youth.phone.replace(/\D/g, "").slice(-10);
        const adultPhone = adult.phone.replace(/\D/g, "").slice(-10);
        if (
          youthPhone.length >= 10 &&
          adultPhone.length >= 10 &&
          youthPhone === adultPhone
        ) {
          score += 30;
          matchReasons.push("Phone match");
        }
      }

      // 3. Surname + Address matching (strong family signal)
      const surnameMatch = youthSurname && youthSurname === adultSurname;
      const adultPostcode = cleanPostcode(adult.postcode);
      const postcodeMatch =
        youthPostcode && adultPostcode && youthPostcode === adultPostcode;

      if (surnameMatch && postcodeMatch) {
        score += 45;
        matchReasons.push("Surname + Postcode match (same household)");
      } else if (surnameMatch) {
        const adultTown = extractTown(adult.address, adult.town);
        const townMatch = youthTown && adultTown && youthTown === adultTown;
        if (townMatch) {
          score += 35;
          matchReasons.push("Surname + Town match (same area)");
        } else {
          score += 15;
          matchReasons.push("Surname match");
        }
      } else if (postcodeMatch) {
        score += 20;
        matchReasons.push("Postcode match");
      }

      // 4. House number match - 5 points (tiebreaker)
      const adultHouseNumber = extractHouseNumber(adult.address);
      if (
        youthHouseNumber &&
        adultHouseNumber &&
        youthHouseNumber === adultHouseNumber &&
        !matchReasons.some((r) => r.includes("household"))
      ) {
        score += 5;
        matchReasons.push("House number match");
      }

      // Determine confidence tier
      let confidence: "high" | "medium" | "low";
      if (score >= 60) {
        confidence = "high";
      } else if (score >= 40) {
        confidence = "medium";
      } else if (score >= 20) {
        confidence = "low";
      } else {
        continue; // Skip matches below threshold
      }

      matches.push({
        youthPlayerIndex: youth.index,
        adultPlayerIndex: adult.index,
        score,
        matchReasons,
        confidence,
      });
    }
  }

  // Sort by confidence and score
  return matches.sort((a, b) => b.score - a.score);
}

const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

/**
 * Import a single player using the identity system.
 *
 * This creates:
 * 1. A player identity (or finds existing by name + DOB)
 * 2. A guardian identity (if parent info provided)
 * 3. A guardian-player link (if guardian created)
 * 4. An org enrollment for the player
 *
 * Returns IDs of all created/found records.
 */
export const importPlayerWithIdentity = mutation({
  args: {
    // Player info (required)
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: genderValidator,

    // Organization info (required)
    organizationId: v.string(),
    ageGroup: v.string(),
    season: v.string(),

    // Optional player info
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),

    // Optional guardian/parent info
    parentFirstName: v.optional(v.string()),
    parentLastName: v.optional(v.string()),
    parentEmail: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
    parentRelationship: v.optional(
      v.union(
        v.literal("mother"),
        v.literal("father"),
        v.literal("guardian"),
        v.literal("grandparent"),
        v.literal("other")
      )
    ),
  },
  returns: v.object({
    playerIdentityId: v.id("playerIdentities"),
    playerWasCreated: v.boolean(),
    guardianIdentityId: v.optional(v.id("guardianIdentities")),
    guardianWasCreated: v.optional(v.boolean()),
    guardianLinkId: v.optional(v.id("guardianPlayerLinks")),
    enrollmentId: v.id("orgPlayerEnrollments"),
    enrollmentWasCreated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // ========== 1. FIND OR CREATE PLAYER IDENTITY ==========

    // Try to find existing player by name + DOB
    const existingPlayer = await ctx.db
      .query("playerIdentities")
      .withIndex("by_name_dob", (q) =>
        q
          .eq("firstName", args.firstName.trim())
          .eq("lastName", args.lastName.trim())
          .eq("dateOfBirth", args.dateOfBirth)
      )
      .first();

    let playerIdentityId: typeof existingPlayer extends null
      ? never
      : NonNullable<typeof existingPlayer>["_id"];
    let playerWasCreated = false;

    if (existingPlayer) {
      playerIdentityId = existingPlayer._id;
    } else {
      // Create new player identity
      const playerType =
        calculateAge(args.dateOfBirth) >= 18 ? "adult" : "youth";

      playerIdentityId = await ctx.db.insert("playerIdentities", {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        dateOfBirth: args.dateOfBirth,
        gender: args.gender,
        playerType,
        address: args.address?.trim(),
        town: args.town?.trim(),
        postcode: args.postcode?.trim(),
        country: args.country?.trim(),
        verificationStatus: "unverified",
        createdAt: now,
        updatedAt: now,
        createdFrom: "import",
      });
      playerWasCreated = true;
    }

    // ========== 2. FIND OR CREATE GUARDIAN IDENTITY ==========

    let guardianIdentityId: Id<"guardianIdentities"> | undefined;
    let guardianWasCreated: boolean | undefined;
    let guardianLinkId: Id<"guardianPlayerLinks"> | undefined;

    // Create guardian if we have at least name and either email OR phone
    if (
      args.parentFirstName &&
      args.parentLastName &&
      (args.parentEmail || args.parentPhone)
    ) {
      const normalizedEmail = args.parentEmail
        ? args.parentEmail.toLowerCase().trim()
        : undefined;

      let existingGuardian = null;

      // Try to find existing guardian by email first (if provided)
      if (normalizedEmail) {
        existingGuardian = await ctx.db
          .query("guardianIdentities")
          .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
          .first();
      }

      // If no email match, try to find by name + phone (if phone provided)
      if (!existingGuardian && args.parentPhone) {
        const normalizedPhone = args.parentPhone.trim();
        const guardiansByName = await ctx.db
          .query("guardianIdentities")
          .withIndex("by_name", (q) =>
            q
              .eq("firstName", args.parentFirstName!.trim())
              .eq("lastName", args.parentLastName!.trim())
          )
          .collect();

        // Find one with matching phone
        existingGuardian = guardiansByName.find(
          (g) => g.phone === normalizedPhone
        );
      }

      if (existingGuardian) {
        guardianIdentityId = existingGuardian._id;
        guardianWasCreated = false;
      } else {
        // Create new guardian identity with email as optional
        guardianIdentityId = await ctx.db.insert("guardianIdentities", {
          firstName: args.parentFirstName.trim(),
          lastName: args.parentLastName.trim(),
          email: normalizedEmail, // Can be undefined
          phone: args.parentPhone?.trim(),
          verificationStatus: "unverified",
          createdAt: now,
          updatedAt: now,
          createdFrom: "import",
        });
        guardianWasCreated = true;
      }

      // ========== 3. CREATE GUARDIAN-PLAYER LINK ==========

      // Check if link already exists
      const existingLink = await ctx.db
        .query("guardianPlayerLinks")
        .withIndex("by_guardian_and_player", (q) =>
          q
            .eq("guardianIdentityId", guardianIdentityId!)
            .eq("playerIdentityId", playerIdentityId)
        )
        .first();

      if (existingLink) {
        guardianLinkId = existingLink._id;
      } else {
        // Check if this is the first guardian for this player
        const existingLinks = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_player", (q) =>
            q.eq("playerIdentityId", playerIdentityId)
          )
          .collect();

        const isPrimary = existingLinks.length === 0;

        guardianLinkId = await ctx.db.insert("guardianPlayerLinks", {
          guardianIdentityId: guardianIdentityId!,
          playerIdentityId,
          relationship: args.parentRelationship ?? "guardian",
          isPrimary,
          hasParentalResponsibility: true,
          canCollectFromTraining: true,
          consentedToSharing: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // ========== 4. FIND OR CREATE ORG ENROLLMENT ==========

    // Check if player is already enrolled in this org
    const existingEnrollment = await ctx.db
      .query("orgPlayerEnrollments")
      .withIndex("by_player_and_org", (q) =>
        q
          .eq("playerIdentityId", playerIdentityId)
          .eq("organizationId", args.organizationId)
      )
      .first();

    let enrollmentId: Id<"orgPlayerEnrollments">;
    let enrollmentWasCreated = false;

    if (existingEnrollment) {
      enrollmentId = existingEnrollment._id;
      // Optionally update the enrollment with new data
      await ctx.db.patch(existingEnrollment._id, {
        ageGroup: args.ageGroup,
        season: args.season,
        updatedAt: now,
      });
    } else {
      // Create new enrollment
      enrollmentId = await ctx.db.insert("orgPlayerEnrollments", {
        playerIdentityId,
        organizationId: args.organizationId,
        ageGroup: args.ageGroup,
        season: args.season,
        status: "active",
        enrolledAt: now,
        updatedAt: now,
      });
      enrollmentWasCreated = true;
    }

    return {
      playerIdentityId,
      playerWasCreated,
      guardianIdentityId,
      guardianWasCreated,
      guardianLinkId,
      enrollmentId,
      enrollmentWasCreated,
    };
  },
});

/**
 * Batch import multiple players using the identity system.
 *
 * More efficient than calling importPlayerWithIdentity multiple times.
 * Returns player identity IDs with their original index for team assignment.
 */
export const batchImportPlayersWithIdentity = mutation({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()), // Optional: auto-create sport passports during enrollment
    players: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.string(),
        gender: genderValidator,
        ageGroup: v.string(),
        season: v.string(),
        address: v.optional(v.string()),
        town: v.optional(v.string()),
        postcode: v.optional(v.string()),
        country: v.optional(v.string()),
        parentFirstName: v.optional(v.string()),
        parentLastName: v.optional(v.string()),
        parentEmail: v.optional(v.string()),
        parentPhone: v.optional(v.string()),
        parentRelationship: v.optional(
          v.union(
            v.literal("mother"),
            v.literal("father"),
            v.literal("guardian"),
            v.literal("grandparent"),
            v.literal("other")
          )
        ),
      })
    ),
  },
  returns: v.object({
    totalProcessed: v.number(),
    playersCreated: v.number(),
    playersReused: v.number(),
    guardiansCreated: v.number(),
    guardiansReused: v.number(),
    enrollmentsCreated: v.number(),
    enrollmentsReused: v.number(),
    errors: v.array(v.string()),
    // NEW: Return player identity IDs with their original index
    playerIdentities: v.array(
      v.object({
        index: v.number(),
        playerIdentityId: v.id("playerIdentities"),
        wasCreated: v.boolean(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const results = {
      totalProcessed: 0,
      playersCreated: 0,
      playersReused: 0,
      guardiansCreated: 0,
      guardiansReused: 0,
      enrollmentsCreated: 0,
      enrollmentsReused: 0,
      errors: [] as string[],
      playerIdentities: [] as Array<{
        index: number;
        playerIdentityId: Id<"playerIdentities">;
        wasCreated: boolean;
      }>,
    };

    const now = Date.now();

    // ========== PHASE 1: CREATE ALL PLAYER IDENTITIES ==========

    // First pass: Create/find all player identities
    // We need this to build the matching data structure
    const playersForMatching: PlayerForMatching[] = [];
    const playerIdentityMap = new Map<
      number,
      Id<"playerIdentities">
    >(); // index -> playerIdentityId

    for (let i = 0; i < args.players.length; i++) {
      const playerData = args.players[i];
      try {
        const existingPlayer = await ctx.db
          .query("playerIdentities")
          .withIndex("by_name_dob", (q) =>
            q
              .eq("firstName", playerData.firstName.trim())
              .eq("lastName", playerData.lastName.trim())
              .eq("dateOfBirth", playerData.dateOfBirth)
          )
          .first();

        let playerIdentityId: NonNullable<typeof existingPlayer>["_id"];
        let wasCreated = false;

        if (existingPlayer) {
          playerIdentityId = existingPlayer._id;
          results.playersReused++;
        } else {
          const playerType =
            calculateAge(playerData.dateOfBirth) >= 18 ? "adult" : "youth";

          playerIdentityId = await ctx.db.insert("playerIdentities", {
            firstName: playerData.firstName.trim(),
            lastName: playerData.lastName.trim(),
            dateOfBirth: playerData.dateOfBirth,
            gender: playerData.gender,
            playerType,
            address: playerData.address?.trim(),
            town: playerData.town?.trim(),
            postcode: playerData.postcode?.trim(),
            country: playerData.country?.trim(),
            verificationStatus: "unverified",
            createdAt: now,
            updatedAt: now,
            createdFrom: "import",
          });
          results.playersCreated++;
          wasCreated = true;
        }

        playerIdentityMap.set(i, playerIdentityId);

        results.playerIdentities.push({
          index: i,
          playerIdentityId,
          wasCreated,
        });

        // Build matching data
        const age = calculateAge(playerData.dateOfBirth);
        playersForMatching.push({
          index: i,
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          dateOfBirth: playerData.dateOfBirth,
          age,
          playerType: age >= 18 ? "adult" : "youth",
          gender: playerData.gender,
          email: playerData.parentEmail,
          phone: playerData.parentPhone,
          address: playerData.address,
          town: playerData.town,
          postcode: playerData.postcode,
          parentFirstName: playerData.parentFirstName,
          parentLastName: playerData.parentLastName,
          parentEmail: playerData.parentEmail,
          parentPhone: playerData.parentPhone,
        });

        results.totalProcessed++;
      } catch (error) {
        results.errors.push(
          `${playerData.firstName} ${playerData.lastName}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // ========== PHASE 2: ENHANCED GUARDIAN MATCHING ==========

    console.log(
      `[Guardian Matching] Processing ${playersForMatching.length} players for guardian relationships`
    );

    // Find potential guardian-child matches within the batch
    const guardianMatches = findGuardianMatchesInBatch(playersForMatching);

    console.log(
      `[Guardian Matching] Found ${guardianMatches.length} potential matches`
    );
    console.log(
      `[Guardian Matching] High confidence: ${guardianMatches.filter((m) => m.confidence === "high").length}`
    );
    console.log(
      `[Guardian Matching] Medium confidence: ${guardianMatches.filter((m) => m.confidence === "medium").length}`
    );

    // Track created guardians by adult player index to avoid duplicates
    const guardianIdentityByAdultIndex = new Map<
      number,
      Id<"guardianIdentities">
    >();

    // Create guardians and links for high-confidence matches
    for (const match of guardianMatches) {
      // Only auto-link high confidence matches (60+ points)
      if (match.confidence !== "high") {
        console.log(
          `[Guardian Matching] Skipping ${match.confidence} confidence match (${match.score} points): ${match.matchReasons.join(", ")}`
        );
        continue;
      }

      const youthPlayerIdentityId = playerIdentityMap.get(
        match.youthPlayerIndex
      );
      const adultPlayerData = args.players[match.adultPlayerIndex];

      if (!youthPlayerIdentityId || !adultPlayerData) continue;

      try {
        // Get or create guardian identity for this adult
        let guardianIdentityId = guardianIdentityByAdultIndex.get(
          match.adultPlayerIndex
        );

        if (!guardianIdentityId) {
          // Try to find existing guardian by email first
          if (adultPlayerData.parentEmail) {
            const normalizedEmail =
              adultPlayerData.parentEmail.toLowerCase().trim();
            const existingGuardian = await ctx.db
              .query("guardianIdentities")
              .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
              .first();

            if (existingGuardian) {
              guardianIdentityId = existingGuardian._id;
              results.guardiansReused++;
            }
          }

          // If not found, create new guardian (only if email exists - required field)
          if (!guardianIdentityId) {
            // Skip if no email - guardian identities require email
            if (!adultPlayerData.parentEmail) {
              console.log(
                `[Guardian Matching] Skipping guardian creation for ${adultPlayerData.firstName} ${adultPlayerData.lastName} - no email`
              );
              continue;
            }

            guardianIdentityId = await ctx.db.insert("guardianIdentities", {
              firstName: adultPlayerData.firstName.trim(),
              lastName: adultPlayerData.lastName.trim(),
              email: adultPlayerData.parentEmail.toLowerCase().trim(),
              phone: adultPlayerData.parentPhone?.trim(),
              address: adultPlayerData.address?.trim(),
              town: adultPlayerData.town?.trim(),
              postcode: adultPlayerData.postcode?.trim(),
              country: adultPlayerData.country?.trim(),
              verificationStatus: "unverified",
              createdAt: now,
              updatedAt: now,
              createdFrom: "import",
            });
            results.guardiansCreated++;
          }

          guardianIdentityByAdultIndex.set(
            match.adultPlayerIndex,
            guardianIdentityId
          );
        }

        // Check if link already exists
        const existingLink = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_guardian_and_player", (q) =>
            q
              .eq("guardianIdentityId", guardianIdentityId!)
              .eq("playerIdentityId", youthPlayerIdentityId)
          )
          .first();

        if (!existingLink) {
          const existingLinks = await ctx.db
            .query("guardianPlayerLinks")
            .withIndex("by_player", (q) =>
              q.eq("playerIdentityId", youthPlayerIdentityId)
            )
            .collect();

          const isPrimary = existingLinks.length === 0;

          await ctx.db.insert("guardianPlayerLinks", {
            guardianIdentityId: guardianIdentityId!,
            playerIdentityId: youthPlayerIdentityId,
            relationship: "guardian",
            isPrimary,
            hasParentalResponsibility: true,
            canCollectFromTraining: true,
            consentedToSharing: true,
            createdAt: now,
            updatedAt: now,
          });

          console.log(
            `[Guardian Matching] ✓ Linked guardian ${adultPlayerData.firstName} ${adultPlayerData.lastName} to player at index ${match.youthPlayerIndex} (${match.score} points: ${match.matchReasons.join(", ")})`
          );
        }
      } catch (error) {
        console.error(
          `[Guardian Matching] Failed to create link: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // ========== PHASE 3: EXPLICIT PARENT INFO ==========

    // Process explicit parent info (parentFirstName, parentLastName, parentEmail/Phone)
    // This handles cases where parent info is provided in the CSV but parent isn't a member
    // Email is now optional - we can create guardians with just name + phone
    for (let i = 0; i < args.players.length; i++) {
      const playerData = args.players[i];
      const playerIdentityId = playerIdentityMap.get(i);

      if (!playerIdentityId) continue;

      // Require at least first name, last name, and either email OR phone
      if (
        playerData.parentFirstName &&
        playerData.parentLastName &&
        (playerData.parentEmail || playerData.parentPhone)
      ) {
        const normalizedEmail = playerData.parentEmail
          ? playerData.parentEmail.toLowerCase().trim()
          : undefined;

        try {
          let existingGuardian = null;

          // Try to find existing guardian by email first (if provided)
          if (normalizedEmail) {
            existingGuardian = await ctx.db
              .query("guardianIdentities")
              .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
              .first();
          }

          // If no email match, try to find by name + phone (if phone provided)
          if (!existingGuardian && playerData.parentPhone) {
            const normalizedPhone = playerData.parentPhone.trim();
            const guardiansByName = await ctx.db
              .query("guardianIdentities")
              .withIndex("by_name", (q) =>
                q
                  .eq("firstName", playerData.parentFirstName!.trim())
                  .eq("lastName", playerData.parentLastName!.trim())
              )
              .collect();

            // Find one with matching phone
            existingGuardian = guardiansByName.find(
              (g) => g.phone === normalizedPhone
            );
          }

          let guardianIdentityId: Id<"guardianIdentities">;

          if (existingGuardian) {
            guardianIdentityId = existingGuardian._id;
            // Don't increment guardiansReused here if already counted
            const wasAlreadyCounted =
              Array.from(guardianIdentityByAdultIndex.values()).includes(
                existingGuardian._id
              );
            if (!wasAlreadyCounted) {
              results.guardiansReused++;
            }
          } else {
            // Create new guardian with email as optional
            guardianIdentityId = await ctx.db.insert("guardianIdentities", {
              firstName: playerData.parentFirstName.trim(),
              lastName: playerData.parentLastName.trim(),
              email: normalizedEmail, // Can be undefined now
              phone: playerData.parentPhone?.trim(),
              verificationStatus: "unverified",
              createdAt: now,
              updatedAt: now,
              createdFrom: "import",
            });
            results.guardiansCreated++;
          }

          // Create guardian-player link
          const existingLink = await ctx.db
            .query("guardianPlayerLinks")
            .withIndex("by_guardian_and_player", (q) =>
              q
                .eq("guardianIdentityId", guardianIdentityId)
                .eq("playerIdentityId", playerIdentityId)
            )
            .first();

          if (!existingLink) {
            const existingLinks = await ctx.db
              .query("guardianPlayerLinks")
              .withIndex("by_player", (q) =>
                q.eq("playerIdentityId", playerIdentityId)
              )
              .collect();

            const isPrimary = existingLinks.length === 0;

            await ctx.db.insert("guardianPlayerLinks", {
              guardianIdentityId,
              playerIdentityId,
              relationship: playerData.parentRelationship ?? "guardian",
              isPrimary,
              hasParentalResponsibility: true,
              canCollectFromTraining: true,
              consentedToSharing: true,
              createdAt: now,
              updatedAt: now,
            });

            console.log(
              `[Explicit Guardian] ✓ Linked explicit parent ${playerData.parentFirstName} ${playerData.parentLastName} to player at index ${i}`
            );
          }
        } catch (error) {
          console.error(
            `[Explicit Guardian] Failed to create guardian for ${playerData.firstName} ${playerData.lastName}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }

    // ========== PHASE 4: CREATE ORG ENROLLMENTS ==========

    for (let i = 0; i < args.players.length; i++) {
      const playerData = args.players[i];
      const playerIdentityId = playerIdentityMap.get(i);

      if (!playerIdentityId) continue;

      try {
        const existingEnrollment = await ctx.db
          .query("orgPlayerEnrollments")
          .withIndex("by_player_and_org", (q) =>
            q
              .eq("playerIdentityId", playerIdentityId)
              .eq("organizationId", args.organizationId)
          )
          .first();

        if (existingEnrollment) {
          await ctx.db.patch(existingEnrollment._id, {
            ageGroup: playerData.ageGroup,
            season: playerData.season,
            updatedAt: now,
          });
          results.enrollmentsReused++;
        } else {
          await ctx.db.insert("orgPlayerEnrollments", {
            playerIdentityId,
            organizationId: args.organizationId,
            ageGroup: playerData.ageGroup,
            season: playerData.season,
            status: "active",
            enrolledAt: now,
            updatedAt: now,
          });
          results.enrollmentsCreated++;
        }

        // Auto-create sport passport if sportCode provided (inline optimization)
        if (args.sportCode) {
          const existingPassport = await ctx.db
            .query("sportPassports")
            .withIndex("by_player_and_sport", (q) =>
              q
                .eq("playerIdentityId", playerIdentityId)
                .eq("sportCode", args.sportCode!)
            )
            .first();

          if (!existingPassport) {
            await ctx.db.insert("sportPassports", {
              playerIdentityId,
              sportCode: args.sportCode,
              organizationId: args.organizationId,
              status: "active",
              assessmentCount: 0,
              currentSeason: playerData.season,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      } catch (error) {
        results.errors.push(
          `Enrollment for ${playerData.firstName} ${playerData.lastName}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return results;
  },
});
