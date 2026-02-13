/**
 * Import Simulator - Query-only dry run for import preview.
 *
 * Replicates the 5-phase import logic from batchImportPlayersWithIdentity
 * as a read-only query, returning accurate preview statistics without
 * writing to the database.
 *
 * This solves C2: the PRD's original approach of "replacing ctx.db.insert
 * with preview ID generation" is infeasible in Convex because:
 * - Intra-batch dedup breaks (second sibling's guardian won't be found)
 * - Convex mutations either fully commit or fully reject; no rollback
 * - Mock IDs break downstream relational queries
 *
 * A query function is inherently read-only in Convex, making it safe.
 */

import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { calculateAge } from "../../models/playerIdentities";

// ============================================================
// Types
// ============================================================

type SimulationPlayer = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  ageGroup: string;
  season: string;
  address?: string;
  town?: string;
  postcode?: string;
  country?: string;
  parentFirstName?: string;
  parentLastName?: string;
  parentEmail?: string;
  parentPhone?: string;
  parentRelationship?: string;
};

export type SimulationSettings = {
  organizationId: string;
  sportCode?: string;
  selectedRowIndices?: number[];
  applyBenchmarks?: boolean;
  benchmarkStrategy?: string;
};

type PlayerPreview = {
  index: number;
  name: string;
  dateOfBirth: string;
  ageGroup: string;
  action: "create" | "update";
  guardianAction?: "create" | "link_existing" | "none";
  guardianName?: string;
  enrollmentAction: "create" | "update";
  passportAction?: "create" | "exists" | "none";
};

export type SimulationResult = {
  success: boolean;
  preview: {
    playersToCreate: number;
    playersToUpdate: number;
    guardiansToCreate: number;
    guardiansToLink: number;
    enrollmentsToCreate: number;
    enrollmentsToUpdate: number;
    passportsToCreate: number;
    passportsExisting: number;
    benchmarksToApply: number;
    playerPreviews: PlayerPreview[];
  };
  warnings: string[];
  errors: string[];
};

// ============================================================
// Simulator
// ============================================================

/**
 * Simulate an import without writing to the database.
 *
 * Runs the same logic as batchImportPlayersWithIdentity but only
 * reads existing records to predict create vs update outcomes.
 */
export async function simulateImport(
  ctx: QueryCtx,
  players: SimulationPlayer[],
  settings: SimulationSettings
): Promise<SimulationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const playerPreviews: PlayerPreview[] = [];

  let playersToCreate = 0;
  let playersToUpdate = 0;
  let guardiansToCreate = 0;
  let guardiansToLink = 0;
  let enrollmentsToCreate = 0;
  let enrollmentsToUpdate = 0;
  let passportsToCreate = 0;
  let passportsExisting = 0;
  let benchmarksToApply = 0;

  // Apply row selection filter
  const selectedSet = settings.selectedRowIndices
    ? new Set(settings.selectedRowIndices)
    : null;
  const playersToImport = selectedSet
    ? players.filter((_, idx) => selectedSet.has(idx))
    : players;

  // Track guardians we've "seen" in this simulation to handle
  // intra-batch dedup (e.g. siblings sharing same parent email)
  const simulatedGuardianEmails = new Set<string>();

  // ========== PHASE 1: CHECK PLAYER IDENTITIES ==========

  // Batch-fetch existing player identities for all players
  const existingPlayers = await Promise.all(
    playersToImport.map((p) =>
      ctx.db
        .query("playerIdentities")
        .withIndex("by_name_dob", (q) =>
          q
            .eq("firstName", p.firstName.trim())
            .eq("lastName", p.lastName.trim())
            .eq("dateOfBirth", p.dateOfBirth)
        )
        .first()
    )
  );

  // Map of simulation index -> existing player identity ID (if found)
  const playerIdentityMap = new Map<number, Id<"playerIdentities">>();

  for (let i = 0; i < playersToImport.length; i += 1) {
    const existing = existingPlayers[i];
    if (existing) {
      playerIdentityMap.set(i, existing._id);
      playersToUpdate += 1;
    } else {
      playersToCreate += 1;
    }
  }

  // ========== PHASE 2 & 3: CHECK GUARDIANS ==========

  for (let i = 0; i < playersToImport.length; i += 1) {
    const playerData = playersToImport[i];
    const age = calculateAge(playerData.dateOfBirth);

    // Only youth players get guardian processing
    if (age >= 18) {
      continue;
    }

    const hasExplicitParent =
      playerData.parentFirstName && playerData.parentLastName;
    const parentEmail = playerData.parentEmail?.toLowerCase().trim();

    if (!(hasExplicitParent || parentEmail)) {
      continue;
    }

    let guardianAction: "create" | "link_existing" | "none" = "none";
    let guardianName: string | undefined;

    if (parentEmail) {
      // Check if guardian already exists in DB
      const existingGuardian = await ctx.db
        .query("guardianIdentities")
        .withIndex("by_email", (q) => q.eq("email", parentEmail))
        .first();

      if (existingGuardian) {
        guardianAction = "link_existing";
        guardianName = `${existingGuardian.firstName} ${existingGuardian.lastName}`;
        guardiansToLink += 1;
      } else if (simulatedGuardianEmails.has(parentEmail)) {
        // Already "created" in this batch (sibling scenario)
        guardianAction = "link_existing";
        guardianName = hasExplicitParent
          ? `${playerData.parentFirstName} ${playerData.parentLastName}`
          : undefined;
        guardiansToLink += 1;
      } else {
        guardianAction = "create";
        guardianName = hasExplicitParent
          ? `${playerData.parentFirstName} ${playerData.parentLastName}`
          : undefined;
        simulatedGuardianEmails.add(parentEmail);
        guardiansToCreate += 1;
      }
    } else if (hasExplicitParent) {
      // No email — will create a new guardian (can't dedup without email)
      guardianAction = "create";
      guardianName = `${playerData.parentFirstName} ${playerData.parentLastName}`;
      guardiansToCreate += 1;
      warnings.push(
        `Guardian for ${playerData.firstName} ${playerData.lastName} has no email — cannot deduplicate`
      );
    }

    // Store for preview
    const previewIdx = playerPreviews.findIndex((p) => p.index === i);
    if (previewIdx !== -1) {
      playerPreviews[previewIdx].guardianAction = guardianAction;
      playerPreviews[previewIdx].guardianName = guardianName;
    }
  }

  // ========== PHASE 4: CHECK ENROLLMENTS ==========

  for (let i = 0; i < playersToImport.length; i += 1) {
    const playerData = playersToImport[i];
    const playerIdentityId = playerIdentityMap.get(i);

    let enrollmentAction: "create" | "update" = "create";

    if (playerIdentityId) {
      const existingEnrollment = await ctx.db
        .query("orgPlayerEnrollments")
        .withIndex("by_player_and_org", (q) =>
          q
            .eq("playerIdentityId", playerIdentityId)
            .eq("organizationId", settings.organizationId)
        )
        .first();

      if (existingEnrollment) {
        enrollmentAction = "update";
        enrollmentsToUpdate += 1;
      } else {
        enrollmentsToCreate += 1;
      }
    } else {
      // New player = new enrollment
      enrollmentsToCreate += 1;
    }

    // ========== PHASE 4b: CHECK SPORT PASSPORTS ==========

    let passportAction: "create" | "exists" | "none" = "none";

    const sportCodeForPassport = settings.sportCode;
    if (sportCodeForPassport && playerIdentityId) {
      const existingPassport = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_and_sport", (q) =>
          q
            .eq("playerIdentityId", playerIdentityId)
            .eq("sportCode", sportCodeForPassport)
        )
        .first();

      if (existingPassport) {
        passportAction = "exists";
        passportsExisting += 1;
      } else {
        passportAction = "create";
        passportsToCreate += 1;
      }
    } else if (settings.sportCode && !playerIdentityId) {
      // New player with sport = new passport
      passportAction = "create";
      passportsToCreate += 1;
    }

    // Build preview entry
    const age = calculateAge(playerData.dateOfBirth);
    playerPreviews.push({
      index: selectedSet ? Array.from(selectedSet)[i] : i,
      name: `${playerData.firstName} ${playerData.lastName}`,
      dateOfBirth: playerData.dateOfBirth,
      ageGroup: playerData.ageGroup,
      action: playerIdentityId ? "update" : "create",
      enrollmentAction,
      passportAction,
      guardianAction: age < 18 ? undefined : "none", // Filled in Phase 2/3 for youth
    });
  }

  // ========== PHASE 5: ESTIMATE BENCHMARKS ==========

  const sportCodeForBenchmarks = settings.sportCode;
  if (settings.applyBenchmarks && sportCodeForBenchmarks) {
    const skillDefs = await ctx.db
      .query("skillDefinitions")
      .withIndex("by_sportCode", (q) =>
        q.eq("sportCode", sportCodeForBenchmarks)
      )
      .collect();

    const activeSkillCount = skillDefs.filter((s) => s.isActive).length;

    // Each new passport gets benchmarks; existing passports may already have them
    const passportsNeedingBenchmarks = passportsToCreate;
    benchmarksToApply = passportsNeedingBenchmarks * activeSkillCount;

    // Also check existing passports that might not have assessments yet
    for (let i = 0; i < playersToImport.length; i += 1) {
      const playerIdentityId = playerIdentityMap.get(i);
      if (!playerIdentityId) {
        continue;
      }

      const existingPassport = await ctx.db
        .query("sportPassports")
        .withIndex("by_player_and_sport", (q) =>
          q
            .eq("playerIdentityId", playerIdentityId)
            .eq("sportCode", sportCodeForBenchmarks)
        )
        .first();

      if (existingPassport) {
        // Check if import assessments already exist
        const existingAssessments = await ctx.db
          .query("skillAssessments")
          .withIndex("by_type", (q) =>
            q
              .eq("passportId", existingPassport._id)
              .eq("assessmentType", "import")
          )
          .collect();

        if (existingAssessments.length === 0) {
          benchmarksToApply += activeSkillCount;
        }
      }
    }
  }

  // Update guardian info on youth player previews
  // (Phase 2/3 processing happens before previews are built for enrollments,
  // so we merge guardian info into the final previews here)
  for (let i = 0; i < playersToImport.length; i += 1) {
    const age = calculateAge(playersToImport[i].dateOfBirth);
    if (age < 18 && playerPreviews[i] && !playerPreviews[i].guardianAction) {
      playerPreviews[i].guardianAction = "none";
    }
  }

  return {
    success: errors.length === 0,
    preview: {
      playersToCreate,
      playersToUpdate,
      guardiansToCreate,
      guardiansToLink,
      enrollmentsToCreate,
      enrollmentsToUpdate,
      passportsToCreate,
      passportsExisting,
      benchmarksToApply,
      playerPreviews,
    },
    warnings,
    errors,
  };
}
