/**
 * Passport Sharing Diagnostics
 *
 * Query all data needed to understand what exists for passport sharing testing.
 * Run with: npx -w packages/backend convex run scripts/passportSharingDiagnostics:getFullDiagnostics
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * Get complete diagnostics for passport sharing seed data planning
 */
export const getFullDiagnostics = query({
  args: {},
  returns: v.object({
    organizations: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        slug: v.optional(v.string()),
      })
    ),
    users: v.array(
      v.object({
        id: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        currentOrgId: v.optional(v.string()),
      })
    ),
    playerIdentitiesCount: v.number(),
    guardianIdentitiesCount: v.number(),
    guardianPlayerLinksCount: v.number(),
    enrollmentsCount: v.number(),
    sportPassportsCount: v.number(),
    skillAssessmentsCount: v.number(),
    passportShareConsentsCount: v.number(),
    passportShareRequestsCount: v.number(),
    passportEnquiriesCount: v.number(),
    // Sample data
    samplePlayers: v.array(
      v.object({
        id: v.id("playerIdentities"),
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.optional(v.string()),
      })
    ),
    sampleGuardians: v.array(
      v.object({
        id: v.id("guardianIdentities"),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        email: v.optional(v.string()),
        userId: v.optional(v.string()),
        hasParentalResponsibility: v.optional(v.boolean()),
      })
    ),
    sampleEnrollments: v.array(
      v.object({
        playerIdentityId: v.id("playerIdentities"),
        organizationId: v.string(),
        sport: v.optional(v.string()),
        ageGroup: v.optional(v.string()),
        status: v.optional(v.string()),
      })
    ),
    existingConsents: v.array(
      v.object({
        id: v.id("passportShareConsents"),
        playerIdentityId: v.id("playerIdentities"),
        receivingOrgId: v.string(),
        status: v.string(),
        coachAcceptanceStatus: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx) => {
    // Get organizations from Better Auth
    const orgsResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: { numItems: 100, cursor: null },
      }
    );
    const orgs = orgsResult.page;

    // Get users from Better Auth
    const usersResult = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: { numItems: 50, cursor: null },
      }
    );
    const users = usersResult.page;

    // Count records
    const playerIdentities = await ctx.db.query("playerIdentities").collect();
    const guardianIdentities = await ctx.db
      .query("guardianIdentities")
      .collect();
    const guardianPlayerLinks = await ctx.db
      .query("guardianPlayerLinks")
      .collect();
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();
    const sportPassports = await ctx.db.query("sportPassports").collect();
    const skillAssessments = await ctx.db.query("skillAssessments").collect();

    // Check passport sharing tables
    let consentsCount = 0;
    let requestsCount = 0;
    let enquiriesCount = 0;
    let existingConsents: Array<{
      id: any;
      playerIdentityId: any;
      receivingOrgId: string;
      status: string;
      coachAcceptanceStatus?: string;
    }> = [];

    try {
      const consents = await ctx.db.query("passportShareConsents").collect();
      consentsCount = consents.length;
      existingConsents = consents.slice(0, 10).map((c) => ({
        id: c._id,
        playerIdentityId: c.playerIdentityId,
        receivingOrgId: c.receivingOrgId,
        status: c.status,
        coachAcceptanceStatus: c.coachAcceptanceStatus,
      }));
    } catch {
      // Table may not exist
    }

    try {
      const requests = await ctx.db.query("passportShareRequests").collect();
      requestsCount = requests.length;
    } catch {
      // Table may not exist
    }

    try {
      const enquiries = await ctx.db.query("passportEnquiries").collect();
      enquiriesCount = enquiries.length;
    } catch {
      // Table may not exist
    }

    // Sample players
    const samplePlayers = playerIdentities.slice(0, 5).map((p) => ({
      id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
    }));

    // Sample guardians with parental responsibility info
    const sampleGuardians = await Promise.all(
      guardianIdentities.slice(0, 5).map(async (g) => {
        // Check if they have any links with parental responsibility
        const links = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", g._id))
          .collect();

        const hasParentalResponsibility = links.some(
          (l) => l.hasParentalResponsibility
        );

        return {
          id: g._id,
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email,
          userId: g.userId,
          hasParentalResponsibility,
        };
      })
    );

    // Sample enrollments
    const sampleEnrollments = enrollments.slice(0, 5).map((e) => ({
      playerIdentityId: e.playerIdentityId,
      organizationId: e.organizationId,
      sport: e.sport,
      ageGroup: e.ageGroup,
      status: e.status,
    }));

    return {
      organizations: orgs.map((o: any) => ({
        id: o._id,
        name: o.name,
        slug: o.slug,
      })),
      users: users.slice(0, 20).map((u: any) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        currentOrgId: u.currentOrgId,
      })),
      playerIdentitiesCount: playerIdentities.length,
      guardianIdentitiesCount: guardianIdentities.length,
      guardianPlayerLinksCount: guardianPlayerLinks.length,
      enrollmentsCount: enrollments.length,
      sportPassportsCount: sportPassports.length,
      skillAssessmentsCount: skillAssessments.length,
      passportShareConsentsCount: consentsCount,
      passportShareRequestsCount: requestsCount,
      passportEnquiriesCount: enquiriesCount,
      samplePlayers,
      sampleGuardians,
      sampleEnrollments,
      existingConsents,
    };
  },
});

/**
 * Check if a player is enrolled at multiple organizations
 */
export const findMultiOrgPlayers = query({
  args: {},
  returns: v.array(
    v.object({
      playerIdentityId: v.id("playerIdentities"),
      firstName: v.string(),
      lastName: v.string(),
      organizations: v.array(
        v.object({
          orgId: v.string(),
          orgName: v.optional(v.string()),
          sport: v.optional(v.string()),
          ageGroup: v.optional(v.string()),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    const enrollments = await ctx.db.query("orgPlayerEnrollments").collect();

    // Group by player
    const playerOrgMap = new Map<
      string,
      Array<{
        orgId: string;
        sport?: string;
        ageGroup?: string;
      }>
    >();

    for (const e of enrollments) {
      const playerId = e.playerIdentityId;
      if (!playerOrgMap.has(playerId)) {
        playerOrgMap.set(playerId, []);
      }
      playerOrgMap.get(playerId)!.push({
        orgId: e.organizationId,
        sport: e.sport,
        ageGroup: e.ageGroup,
      });
    }

    // Find players with multiple orgs
    const multiOrgPlayers: Array<{
      playerIdentityId: any;
      firstName: string;
      lastName: string;
      organizations: Array<{
        orgId: string;
        orgName?: string;
        sport?: string;
        ageGroup?: string;
      }>;
    }> = [];

    for (const [playerId, orgs] of playerOrgMap.entries()) {
      const uniqueOrgs = [...new Set(orgs.map((o) => o.orgId))];
      if (uniqueOrgs.length > 1) {
        const player = await ctx.db.get(playerId as any);
        if (player) {
          // Get org names
          const orgsWithNames = await Promise.all(
            orgs.map(async (o) => {
              const orgResult = await ctx.runQuery(
                components.betterAuth.adapter.findMany,
                {
                  model: "organization",
                  where: [{ field: "_id", value: o.orgId, operator: "eq" }],
                  paginationOpts: { numItems: 1, cursor: null },
                }
              );
              const org = orgResult.page[0];
              return {
                orgId: o.orgId,
                orgName: org?.name as string | undefined,
                sport: o.sport,
                ageGroup: o.ageGroup,
              };
            })
          );

          // Cast player to expected type with firstName/lastName
          const playerData = player as {
            firstName?: string;
            lastName?: string;
          };
          multiOrgPlayers.push({
            playerIdentityId: playerId as any,
            firstName: playerData.firstName ?? "Unknown",
            lastName: playerData.lastName ?? "Unknown",
            organizations: orgsWithNames,
          });
        }
      }
    }

    return multiOrgPlayers;
  },
});

/**
 * Get guardians with linked users (potential parents for testing)
 */
export const getLinkedGuardians = query({
  args: {},
  returns: v.array(
    v.object({
      guardianId: v.id("guardianIdentities"),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      userId: v.string(),
      linkedPlayers: v.array(
        v.object({
          playerId: v.id("playerIdentities"),
          playerName: v.string(),
          hasParentalResponsibility: v.boolean(),
        })
      ),
    })
  ),
  handler: async (ctx) => {
    const guardians = await ctx.db.query("guardianIdentities").collect();

    const linkedGuardians: Array<{
      guardianId: any;
      firstName?: string;
      lastName?: string;
      email?: string;
      userId: string;
      linkedPlayers: Array<{
        playerId: any;
        playerName: string;
        hasParentalResponsibility: boolean;
      }>;
    }> = [];

    for (const g of guardians) {
      if (g.userId) {
        const links = await ctx.db
          .query("guardianPlayerLinks")
          .withIndex("by_guardian", (q) => q.eq("guardianIdentityId", g._id))
          .collect();

        const players = await Promise.all(
          links.map(async (link) => {
            const player = await ctx.db.get(link.playerIdentityId);
            return {
              playerId: link.playerIdentityId,
              playerName: player
                ? `${player.firstName} ${player.lastName}`
                : "Unknown",
              hasParentalResponsibility:
                link.hasParentalResponsibility ?? false,
            };
          })
        );

        if (players.length > 0) {
          linkedGuardians.push({
            guardianId: g._id,
            firstName: g.firstName,
            lastName: g.lastName,
            email: g.email,
            userId: g.userId,
            linkedPlayers: players,
          });
        }
      }
    }

    return linkedGuardians;
  },
});
