import { v } from "convex/values";
import { query } from "../_generated/server";

// ============================================================
// GDPR Article 20 - Right to Data Portability
// Player can request a complete export of their personal data
// ============================================================

/**
 * Assemble all personal data held for an adult player.
 * CRITICAL: Must NEVER include coachParentSummaries.privateInsight.
 * Cycle phase data is ONLY included if player has active cycle consent.
 */
export const assemblePlayerDataExport = query({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Authenticate user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Verify this player belongs to the authenticated user
    const playerIdentity = await ctx.db.get(args.playerIdentityId);
    if (!playerIdentity) {
      throw new Error("Player identity not found");
    }
    if (playerIdentity.userId !== identity.subject) {
      throw new Error("Not authorized to export data for this player");
    }

    // Check cycle tracking consent
    const cycleConsent = await ctx.db
      .query("playerHealthConsents")
      .withIndex("by_player_and_type", (q) =>
        q
          .eq("playerIdentityId", args.playerIdentityId)
          .eq("consentType", "cycle_tracking")
      )
      .first();
    const hasCycleConsent =
      cycleConsent !== null &&
      cycleConsent !== undefined &&
      !cycleConsent.withdrawnAt;

    // (1) Profile
    const profile = {
      firstName: playerIdentity.firstName,
      lastName: playerIdentity.lastName,
      dateOfBirth: playerIdentity.dateOfBirth,
      gender: playerIdentity.gender,
      email: playerIdentity.email,
      phone: playerIdentity.phone,
      address: playerIdentity.address,
      town: playerIdentity.town,
      postcode: playerIdentity.postcode,
      country: playerIdentity.country,
    };

    // (2) Emergency contacts
    const emergencyContacts = await ctx.db
      .query("playerEmergencyContacts")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const emergencyContactsExport = emergencyContacts.map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
      email: c.email,
      relationship: c.relationship,
    }));

    // (3) Sport passport ratings
    const passports = await ctx.db
      .query("sportPassports")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const passportRatings = passports.map((p) => ({
      sportCode: p.sportCode,
      currentOverallRating: p.currentOverallRating,
      currentTechnicalRating: p.currentTechnicalRating,
      currentTacticalRating: p.currentTacticalRating,
      currentPhysicalRating: p.currentPhysicalRating,
      currentMentalRating: p.currentMentalRating,
      lastAssessmentDate: p.lastAssessmentDate,
      assessmentCount: p.assessmentCount,
      playerNotes: p.playerNotes,
    }));

    // (4) Wellness history (conditionally include cyclePhase)
    const wellnessChecks = await ctx.db
      .query("dailyPlayerHealthChecks")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const wellnessHistory = wellnessChecks.map((c) => {
      const record: Record<string, unknown> = {
        checkDate: c.checkDate,
        sleepQuality: c.sleepQuality,
        energyLevel: c.energyLevel,
        mood: c.mood,
        physicalFeeling: c.physicalFeeling,
        motivation: c.motivation,
        foodIntake: c.foodIntake,
        waterIntake: c.waterIntake,
        muscleRecovery: c.muscleRecovery,
        notes: c.notes,
        submittedAt: new Date(c.submittedAt).toISOString(),
      };
      // Only include cyclePhase if player has active cycle consent
      if (hasCycleConsent && c.cyclePhase) {
        record.cyclePhase = c.cyclePhase;
      }
      return record;
    });

    // (5) Injuries
    const injuries = await ctx.db
      .query("playerInjuries")
      .withIndex("by_playerIdentityId", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const injuriesExport = injuries.map((i) => ({
      bodyPart: i.bodyPart,
      injuryType: i.injuryType,
      severity: i.severity,
      dateOccurred: i.dateOccurred,
      status: i.status,
      reportedByRole: i.reportedByRole,
      expectedReturn: i.expectedReturn,
      description: i.description,
    }));

    // (6) Coach feedback (publicSummary only — NEVER privateInsight)
    const summaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const visibleStatuses = new Set([
      "approved",
      "auto_approved",
      "delivered",
      "viewed",
    ]);
    const coachFeedback = summaries
      .filter((s) => visibleStatuses.has(s.status))
      .map((s) => ({
        // CRITICAL: Only return publicSummary, never privateInsight
        publicSummaryText: s.publicSummary.content,
        sensitivityCategory: s.sensitivityCategory,
        status: s.status,
        createdAt: new Date(s.createdAt).toISOString(),
        acknowledgedAt: s.acknowledgedAt
          ? new Date(s.acknowledgedAt).toISOString()
          : undefined,
      }));

    // (7) Passport sharing records
    const sharingConsents = await ctx.db
      .query("passportShareConsents")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const sharingRecords = sharingConsents.map((s) => ({
      receivingOrgId: s.receivingOrgId,
      status: s.status,
      consentedAt: new Date(s.consentedAt).toISOString(),
      expiresAt: new Date(s.expiresAt).toISOString(),
      revokedAt: s.revokedAt ? new Date(s.revokedAt).toISOString() : undefined,
    }));

    // (8) Consent records
    const consentRecords = await ctx.db
      .query("playerHealthConsents")
      .withIndex("by_player_and_type", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const consentsExport = consentRecords.map((c) => ({
      consentType: c.consentType,
      givenAt: new Date(c.givenAt).toISOString(),
      withdrawnAt: c.withdrawnAt
        ? new Date(c.withdrawnAt).toISOString()
        : undefined,
    }));

    // (9) Wellness coach access
    const coachAccessRecords = await ctx.db
      .query("wellnessCoachAccess")
      .withIndex("by_player", (q) =>
        q.eq("playerIdentityId", args.playerIdentityId)
      )
      .collect();

    const wellnessCoachAccess = coachAccessRecords.map((a) => ({
      coachName: a.coachName,
      status: a.status,
      requestedAt: new Date(a.requestedAt).toISOString(),
      approvedAt: a.approvedAt
        ? new Date(a.approvedAt).toISOString()
        : undefined,
      revokedAt: a.revokedAt ? new Date(a.revokedAt).toISOString() : undefined,
    }));

    // Return all domains — metadata at top, then data
    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
        organizationId: args.organizationId,
        gdprBasis: "Article 20 — Right to Data Portability",
      },
      profile,
      emergencyContacts: emergencyContactsExport,
      passportRatings,
      wellnessHistory,
      injuries: injuriesExport,
      coachFeedback,
      sharingRecords,
      consentRecords: consentsExport,
      wellnessCoachAccess,
    };
  },
});
