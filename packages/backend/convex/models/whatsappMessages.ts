import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { normalizePhoneNumber } from "../lib/phoneUtils";

/**
 * WhatsApp Messages Model
 *
 * Handles storage and retrieval of incoming WhatsApp messages,
 * coach phone number lookups, and multi-org context detection.
 *
 * Multi-Org Detection Flow (for coaches with multiple orgs):
 * 1. If coach has only 1 org → use that (single_org)
 * 2. Check if org name explicitly mentioned in message (explicit_mention)
 * 3. Check if player/team names uniquely match one org (player_match/team_match)
 * 4. Check session memory - recent messages from same phone (session_memory)
 * 5. If still ambiguous → ask for clarification via WhatsApp
 */

// Session timeout: 2 hours
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

// ============================================================
// REGEX PATTERNS (top-level for performance)
// ============================================================

// Age group patterns
const AGE_GROUP_U_PATTERN = /\bu[-\s]?(\d{1,2})\b/gi;
const AGE_GROUP_UNDER_PATTERN = /\bunder[-\s]?(\d{1,2})\b/gi;
const AGE_GROUP_PLURAL_PATTERN = /\b(?:the\s+)?(\d{1,2})s\b/gi;
const AGE_GROUP_SENIOR_PATTERN = /\b(?:senior|seniors|adult|adults)\b/i;

// Sport patterns
const SPORT_SOCCER_PATTERNS = [/\bsoccer\b/i, /\bfootball\b/i, /\bfooty\b/i];
const SPORT_GAA_PATTERNS = [/\bgaa\b/i, /\bgaelic\b/i, /\bgaelic football\b/i];
const SPORT_HURLING_PATTERNS = [/\bhurling\b/i, /\bhurl\b/i, /\bsliotar\b/i];
const SPORT_CAMOGIE_PATTERNS = [/\bcamogie\b/i];
const SPORT_RUGBY_PATTERNS = [/\brugby\b/i];
const SPORT_BASKETBALL_PATTERNS = [/\bbasketball\b/i, /\bhoops\b/i];
const SPORT_HOCKEY_PATTERNS = [/\bhockey\b/i];
const SPORT_TENNIS_PATTERNS = [/\btennis\b/i];
const SPORT_SWIMMING_PATTERNS = [/\bswimming\b/i, /\bswim\b/i];
const SPORT_ATHLETICS_PATTERNS = [/\bathletics\b/i, /\btrack\b/i];

// Org selection parsing
const NUMERIC_SELECTION_PATTERN = /^(\d+)$/;

// ============================================================
// VALIDATORS
// ============================================================

const messageTypeValidator = v.union(
  v.literal("text"),
  v.literal("audio"),
  v.literal("image"),
  v.literal("video"),
  v.literal("document")
);

const statusValidator = v.union(
  v.literal("received"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("unmatched"),
  v.literal("rejected"),
  v.literal("duplicate")
);

const processingResultsValidator = v.object({
  autoApplied: v.array(
    v.object({
      insightId: v.string(),
      playerName: v.optional(v.string()),
      teamName: v.optional(v.string()),
      category: v.string(),
      title: v.string(),
      parentSummaryQueued: v.boolean(),
    })
  ),
  needsReview: v.array(
    v.object({
      insightId: v.string(),
      playerName: v.optional(v.string()),
      category: v.string(),
      title: v.string(),
      reason: v.string(),
    })
  ),
  unmatched: v.array(
    v.object({
      insightId: v.string(),
      mentionedName: v.optional(v.string()),
      title: v.string(),
    })
  ),
});

// ============================================================
// INTERNAL MUTATIONS
// ============================================================

/**
 * Create a new WhatsApp message record
 */
export const createMessage = internalMutation({
  args: {
    messageSid: v.string(),
    accountSid: v.string(),
    fromNumber: v.string(),
    toNumber: v.string(),
    messageType: messageTypeValidator,
    body: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
  },
  returns: v.id("whatsappMessages"),
  handler: async (ctx, args) =>
    await ctx.db.insert("whatsappMessages", {
      messageSid: args.messageSid,
      accountSid: args.accountSid,
      fromNumber: args.fromNumber,
      toNumber: args.toNumber,
      messageType: args.messageType,
      body: args.body,
      mediaUrl: args.mediaUrl,
      mediaContentType: args.mediaContentType,
      status: "received",
      receivedAt: Date.now(),
    }),
});

/**
 * Update message status
 */
export const updateStatus = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    status: statusValidator,
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.errorMessage) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.status === "completed" || args.status === "failed") {
      updates.processedAt = Date.now();
    }
    await ctx.db.patch(args.messageId, updates);
    return null;
  },
});

/**
 * Update message with coach info after phone lookup
 */
export const updateCoachInfo = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    coachId: v.string(),
    coachName: v.string(),
    organizationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      coachId: args.coachId,
      coachName: args.coachName,
      organizationId: args.organizationId,
      status: "processing",
    });
    return null;
  },
});

/**
 * Update message with media storage ID after download
 */
export const updateMediaStorage = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    mediaStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      mediaStorageId: args.mediaStorageId,
    });
    return null;
  },
});

/**
 * Update message with quality check result (US-VN-001)
 */
export const updateQualityCheck = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    qualityCheck: v.object({
      isValid: v.boolean(),
      reason: v.optional(v.string()),
      checkedAt: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      messageQualityCheck: args.qualityCheck,
    });
    return null;
  },
});

/**
 * Check for duplicate messages from the same phone number (US-VN-003).
 * Uses the by_fromNumber_and_receivedAt index to efficiently find recent messages.
 */
export const checkForDuplicateMessage = internalQuery({
  args: {
    fromNumber: v.string(),
    messageType: v.string(),
    body: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
    windowMs: v.optional(v.number()),
  },
  returns: v.union(
    v.null(),
    v.object({
      isDuplicate: v.boolean(),
      originalMessageId: v.optional(v.id("whatsappMessages")),
      timeSinceOriginal: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const { checkDuplicate, DEFAULT_TEXT_WINDOW_MS } = await import(
      "../lib/duplicateDetection"
    );
    const windowMs = args.windowMs ?? DEFAULT_TEXT_WINDOW_MS;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get recent messages from same phone within the window
    const recentMessages = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_fromNumber_and_receivedAt", (q) =>
        q.eq("fromNumber", args.fromNumber).gte("receivedAt", windowStart)
      )
      .order("desc")
      .take(20);

    const result = checkDuplicate({
      recentMessages: recentMessages.map((m) => ({
        _id: m._id,
        messageType: m.messageType,
        body: m.body,
        mediaContentType: m.mediaContentType,
        receivedAt: m.receivedAt,
        status: m.status,
      })),
      messageType: args.messageType,
      body: args.body,
      mediaContentType: args.mediaContentType,
      now,
    });

    if (!result.isDuplicate) {
      return null;
    }

    return {
      isDuplicate: true,
      originalMessageId: result.originalMessageId as
        | Id<"whatsappMessages">
        | undefined,
      timeSinceOriginal: result.timeSinceOriginal,
    };
  },
});

/**
 * Mark a message as duplicate (US-VN-003).
 */
export const markAsDuplicate = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    originalMessageId: v.id("whatsappMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "duplicate",
      isDuplicate: true,
      duplicateOfMessageId: args.originalMessageId,
      processedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Link a voice note to the WhatsApp message
 */
export const linkVoiceNote = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    voiceNoteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      voiceNoteId: args.voiceNoteId,
    });
    return null;
  },
});

/**
 * Update message with processing results
 */
export const updateProcessingResults = internalMutation({
  args: {
    messageId: v.id("whatsappMessages"),
    processingResults: processingResultsValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      processingResults: args.processingResults,
      status: "completed",
      processedAt: Date.now(),
    });
    return null;
  },
});

// ============================================================
// INTERNAL QUERIES
// ============================================================

/**
 * Find a coach by their phone number.
 * Returns coach info including their primary organization.
 */
export const findCoachByPhone = internalQuery({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      coachId: v.string(),
      coachName: v.string(),
      organizationId: v.string(),
      organizationName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = normalizePhoneNumber(args.phoneNumber);

    console.log("[WhatsApp] Looking up coach by phone:", normalizedPhone);

    // Query users from the Better Auth component (user table is inside the component)
    // Using the adapter.findMany to access the component's user table
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { components: betterAuthComponents } = require("../_generated/api");
    const usersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: {
          cursor: null,
          numItems: 1000, // Get up to 1000 users
        },
      }
    );
    const users = usersResult.page || [];

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic user type from component
    const matchedUser = (users as any[]).find((user: any) => {
      if (!user.phone) {
        return false;
      }
      const userPhone = normalizePhoneNumber(user.phone);
      return userPhone === normalizedPhone;
    });

    if (!matchedUser) {
      console.log("[WhatsApp] No user found with phone:", normalizedPhone);
      return null;
    }

    console.log("[WhatsApp] Found user:", matchedUser.name, matchedUser._id);

    // Get the user's organization memberships from the component
    const membersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
        where: [
          {
            field: "userId",
            operator: "eq",
            value: matchedUser._id,
          },
        ],
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    const members = (membersResult.page || []) as any[];

    console.log("[WhatsApp] User has", members.length, "memberships");

    // Find a membership where user has coach functional role
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    let coachMembership = members.find((m: any) => {
      const roles = m.functionalRoles as string[] | undefined;
      return roles?.includes("coach");
    });

    // If no coach role found, use any membership (user might be admin who coaches)
    if (!coachMembership && members.length > 0) {
      // Prefer their current org if set
      if (matchedUser.currentOrgId) {
        coachMembership = members.find(
          // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
          (m: any) => m.organizationId === matchedUser.currentOrgId
        );
      }
      // Fall back to first membership
      if (!coachMembership) {
        coachMembership = members[0];
      }
    }

    if (!coachMembership) {
      console.log("[WhatsApp] User has no organization membership");
      return null;
    }

    // Get organization from the component
    const orgsResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: {
          cursor: null,
          numItems: 1,
        },
        where: [
          {
            field: "_id",
            operator: "eq",
            value: coachMembership.organizationId,
          },
        ],
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    const org = (orgsResult.page || [])[0] as any;

    return {
      coachId: matchedUser._id,
      coachName:
        matchedUser.name ||
        `${matchedUser.firstName || ""} ${matchedUser.lastName || ""}`.trim() ||
        "Unknown Coach",
      organizationId: coachMembership.organizationId,
      organizationName: org?.name,
    };
  },
});

// Phone normalization moved to shared utility: lib/phoneUtils.ts

// ============================================================
// MULTI-ORG DETECTION
// ============================================================

const orgContextResultValidator = v.object({
  coachId: v.string(),
  coachName: v.string(),
  // If resolved, this is the org to use
  organization: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
    })
  ),
  // How the org was resolved (or null if ambiguous)
  resolvedVia: v.union(
    v.literal("single_org"),
    v.literal("explicit_mention"),
    v.literal("player_match"),
    v.literal("team_match"),
    v.literal("coach_match"),
    v.literal("age_group_match"),
    v.literal("sport_match"),
    v.literal("session_memory"),
    v.null()
  ),
  // All available orgs (for multi-org coaches)
  availableOrgs: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
    })
  ),
  // If ambiguous, this is true
  needsClarification: v.boolean(),
});

/**
 * Enhanced coach lookup that handles multi-org detection.
 * For single-org coaches: returns that org immediately.
 * For multi-org coaches: attempts to detect org from message content,
 * then falls back to session memory, then asks for clarification.
 */
export const findCoachWithOrgContext = internalQuery({
  args: {
    phoneNumber: v.string(),
    messageBody: v.optional(v.string()),
  },
  returns: v.union(v.null(), orgContextResultValidator),
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multi-org detection requires multiple fallback strategies
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhoneNumber(args.phoneNumber);
    console.log(
      "[WhatsApp] Looking up coach with org context:",
      normalizedPhone
    );

    // Query users from the Better Auth component
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { components: betterAuthComponents } = require("../_generated/api");
    const usersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "user",
        paginationOpts: { cursor: null, numItems: 1000 },
      }
    );
    const users = usersResult.page || [];

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic user type from component
    const matchedUser = (users as any[]).find((user: any) => {
      if (!user.phone) {
        return false;
      }
      return normalizePhoneNumber(user.phone) === normalizedPhone;
    });

    if (!matchedUser) {
      console.log("[WhatsApp] No user found with phone:", normalizedPhone);
      return null;
    }

    const coachId = matchedUser._id;
    const coachName =
      matchedUser.name ||
      `${matchedUser.firstName || ""} ${matchedUser.lastName || ""}`.trim() ||
      "Unknown Coach";

    console.log("[WhatsApp] Found user:", coachName, coachId);

    // Get all memberships
    const membersResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "member",
        paginationOpts: { cursor: null, numItems: 100 },
        where: [{ field: "userId", operator: "eq", value: coachId }],
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    const members = (membersResult.page || []) as any[];

    if (members.length === 0) {
      console.log("[WhatsApp] User has no organization membership");
      return null;
    }

    // Get all orgs for these memberships
    const orgIds = members.map((m) => m.organizationId);
    const orgsResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "organization",
        paginationOpts: { cursor: null, numItems: 100 },
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    const allOrgs = (orgsResult.page || []) as any[];
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic type from component
    const coachOrgs = allOrgs.filter((org: any) => orgIds.includes(org._id));

    const availableOrgs = coachOrgs.map((org) => ({
      id: org._id,
      name: org.name || "Unknown Org",
    }));

    console.log("[WhatsApp] Coach has", availableOrgs.length, "org(s)");

    // CASE 1: Single org - no ambiguity
    if (availableOrgs.length === 1) {
      console.log("[WhatsApp] Single org, using:", availableOrgs[0].name);
      return {
        coachId,
        coachName,
        organization: availableOrgs[0],
        resolvedVia: "single_org" as const,
        availableOrgs,
        needsClarification: false,
      };
    }

    // CASE 2: Multi-org - try to detect from message
    const messageBody = args.messageBody?.toLowerCase() || "";

    // 2a. Check for explicit org mention
    for (const org of availableOrgs) {
      const orgNameLower = org.name.toLowerCase();
      // Check for patterns like "Grange:", "@Grange", "for Grange", "at Grange"
      const patterns = [
        `${orgNameLower}:`,
        `@${orgNameLower}`,
        `for ${orgNameLower}`,
        `at ${orgNameLower}`,
        `from ${orgNameLower}`,
      ];
      if (patterns.some((p) => messageBody.includes(p))) {
        console.log("[WhatsApp] Explicit org mention detected:", org.name);
        return {
          coachId,
          coachName,
          organization: org,
          resolvedVia: "explicit_mention" as const,
          availableOrgs,
          needsClarification: false,
        };
      }
    }

    // 2b. Check for player/team names that uniquely match one org
    // This requires querying rosters - we'll do a simplified version
    // that checks team names from the team table
    const playerMatches = await checkPlayerMatches(
      ctx,
      messageBody,
      coachId,
      availableOrgs
    );
    if (playerMatches.matchedOrg) {
      console.log(
        "[WhatsApp] Player/team match detected:",
        playerMatches.matchedOrg.name
      );
      return {
        coachId,
        coachName,
        organization: playerMatches.matchedOrg,
        resolvedVia: playerMatches.matchType as
          | "player_match"
          | "team_match"
          | "coach_match"
          | "age_group_match"
          | "sport_match",
        availableOrgs,
        needsClarification: false,
      };
    }

    // 2c. Check session memory
    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", normalizedPhone))
      .first();

    if (session && Date.now() - session.lastMessageAt < SESSION_TIMEOUT_MS) {
      const sessionOrg = availableOrgs.find(
        (o) => o.id === session.organizationId
      );
      if (sessionOrg) {
        console.log("[WhatsApp] Session memory match:", sessionOrg.name);
        return {
          coachId,
          coachName,
          organization: sessionOrg,
          resolvedVia: "session_memory" as const,
          availableOrgs,
          needsClarification: false,
        };
      }
    }

    // CASE 3: Ambiguous - need clarification
    console.log("[WhatsApp] Ambiguous - need clarification");
    return {
      coachId,
      coachName,
      organization: null,
      resolvedVia: null,
      availableOrgs,
      needsClarification: true,
    };
  },
});

/**
 * Helper to check if message contains contextual clues unique to one org.
 * Checks: team names, age groups, sports, player names, coach names.
 * Only checks data from teams that the sending coach is assigned to.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex matching logic across multiple dimensions (team, age group, sport, player, coach names)
async function checkPlayerMatches(
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic context from Convex
  ctx: any,
  messageBody: string,
  coachId: string,
  availableOrgs: Array<{ id: string; name: string }>
): Promise<{
  matchedOrg: { id: string; name: string } | null;
  matchType:
    | "player_match"
    | "team_match"
    | "coach_match"
    | "age_group_match"
    | "sport_match"
    | null;
}> {
  // Store coach assignment data per org
  type CoachOrgData = {
    teams: string[];
    ageGroups: string[];
    sport: string | null;
  };
  const coachDataByOrg: Map<string, CoachOrgData> = new Map();
  const teamMatches: Map<string, number> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { components: betterAuthComponents } = require("../_generated/api");

  // Phase 1: Gather coach assignment data for all orgs
  // Store resolved team IDs per org (after matching names/IDs)
  const resolvedTeamIdsByOrg: Map<string, string[]> = new Map();

  for (const org of availableOrgs) {
    const coachAssignment = await ctx.db
      .query("coachAssignments")
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic query builder
      .withIndex("by_user_and_org", (q: any) =>
        q.eq("userId", coachId).eq("organizationId", org.id)
      )
      .first();

    if (!coachAssignment?.teams?.length) {
      continue;
    }

    coachDataByOrg.set(org.id, {
      teams: coachAssignment.teams || [],
      ageGroups: coachAssignment.ageGroups || [],
      sport: coachAssignment.sport || null,
    });

    // Fetch ALL teams for this organization first
    // coachAssignment.teams may contain either team names OR team IDs
    const allTeamsResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [{ field: "organizationId", operator: "eq", value: org.id }],
      }
    );
    const allTeams = (allTeamsResult.page || []) as Array<{
      _id: string;
      name?: string;
    }>;

    // Match team names OR team IDs from coachAssignment.teams
    // Normalize team names for comparison (trim whitespace, case-insensitive)
    const normalizedCoachTeams = coachAssignment.teams.map((t: string) =>
      t.trim().toLowerCase()
    );

    const matchedTeams = allTeams.filter((team) => {
      const normalizedTeamName = (team.name || "").trim().toLowerCase();
      const teamId = team._id;
      return (
        normalizedCoachTeams.includes(normalizedTeamName) ||
        normalizedCoachTeams.includes(teamId) ||
        coachAssignment.teams.includes(team.name) ||
        coachAssignment.teams.includes(teamId)
      );
    });

    // Store resolved team IDs for later use (player matching, etc.)
    resolvedTeamIdsByOrg.set(
      org.id,
      matchedTeams.map((t) => t._id)
    );

    // Check team names against message body
    for (const team of matchedTeams) {
      const teamName = (team.name || "").toLowerCase();
      if (teamName && messageBody.includes(teamName)) {
        teamMatches.set(org.id, (teamMatches.get(org.id) || 0) + 1);
      }
    }
  }

  // Check 1: Team name matches
  const orgsWithTeamMatches = Array.from(teamMatches.entries());
  if (orgsWithTeamMatches.length === 1) {
    const matchedOrgId = orgsWithTeamMatches[0][0];
    const matchedOrg = availableOrgs.find((o) => o.id === matchedOrgId);
    if (matchedOrg) {
      return { matchedOrg, matchType: "team_match" };
    }
  }

  // Check 2: Age group matches
  // Patterns: "u12", "u-12", "under 12", "under-12", "u12s", "the 12s", "twelves"
  const ageGroupMatches: Map<string, number> = new Map();
  const ageGroupPatterns = extractAgeGroupsFromMessage(messageBody);

  if (ageGroupPatterns.length > 0) {
    for (const org of availableOrgs) {
      const coachData = coachDataByOrg.get(org.id);
      if (!coachData || coachData.ageGroups.length === 0) {
        continue;
      }

      for (const pattern of ageGroupPatterns) {
        // Normalize both to compare (e.g., "u12" matches "U12", "u-12", etc.)
        const normalizedPattern = pattern.replace(/[^a-z0-9]/g, "");
        for (const ageGroup of coachData.ageGroups) {
          const normalizedAgeGroup = ageGroup
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          if (normalizedPattern === normalizedAgeGroup) {
            ageGroupMatches.set(org.id, (ageGroupMatches.get(org.id) || 0) + 1);
          }
        }
      }
    }

    const orgsWithAgeGroupMatches = Array.from(ageGroupMatches.entries());
    if (orgsWithAgeGroupMatches.length === 1) {
      const matchedOrgId = orgsWithAgeGroupMatches[0][0];
      const matchedOrg = availableOrgs.find((o) => o.id === matchedOrgId);
      if (matchedOrg) {
        return { matchedOrg, matchType: "age_group_match" };
      }
    }
  }

  // Check 3: Sport matches
  // Patterns: "soccer", "football", "hurling", "gaa", "rugby", etc.
  const sportMatches: Map<string, number> = new Map();
  const detectedSports = extractSportsFromMessage(messageBody);

  if (detectedSports.length > 0) {
    for (const org of availableOrgs) {
      const coachData = coachDataByOrg.get(org.id);
      if (!coachData?.sport) {
        continue;
      }

      for (const sport of detectedSports) {
        if (matchesSport(sport, coachData.sport)) {
          sportMatches.set(org.id, (sportMatches.get(org.id) || 0) + 1);
        }
      }
    }

    const orgsWithSportMatches = Array.from(sportMatches.entries());
    if (orgsWithSportMatches.length === 1) {
      const matchedOrgId = orgsWithSportMatches[0][0];
      const matchedOrg = availableOrgs.find((o) => o.id === matchedOrgId);
      if (matchedOrg) {
        return { matchedOrg, matchType: "sport_match" };
      }
    }
  }

  // Check 4: Player name matches
  // Use resolved team IDs (not the raw coachAssignment.teams which may contain names)
  const playerMatches: Map<string, number> = new Map();

  for (const org of availableOrgs) {
    const teamIds = resolvedTeamIdsByOrg.get(org.id);
    if (!teamIds || teamIds.length === 0) {
      continue;
    }

    for (const teamId of teamIds) {
      const teamPlayers = await ctx.db
        .query("teamPlayerIdentities")
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic query builder
        .withIndex("by_teamId", (q: any) => q.eq("teamId", teamId))
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic query builder
        .filter((q: any) => q.eq(q.field("status"), "active"))
        .collect();

      for (const teamPlayer of teamPlayers) {
        const player = await ctx.db.get(teamPlayer.playerIdentityId);
        if (player) {
          const firstName = (player.firstName || "").toLowerCase();
          const lastName = (player.lastName || "").toLowerCase();
          const fullName = `${firstName} ${lastName}`;

          if (
            (firstName.length > 2 && messageBody.includes(firstName)) ||
            messageBody.includes(fullName)
          ) {
            playerMatches.set(org.id, (playerMatches.get(org.id) || 0) + 1);
          }
        }
      }
    }
  }

  const orgsWithPlayerMatches = Array.from(playerMatches.entries());
  if (orgsWithPlayerMatches.length === 1) {
    const matchedOrgId = orgsWithPlayerMatches[0][0];
    const matchedOrg = availableOrgs.find((o) => o.id === matchedOrgId);
    if (matchedOrg) {
      return { matchedOrg, matchType: "player_match" };
    }
  }

  // Check 5: Coach name matches
  // Use resolved team IDs for finding coaches who share teams
  const coachMatches: Map<string, number> = new Map();

  for (const org of availableOrgs) {
    const teamIds = resolvedTeamIdsByOrg.get(org.id);
    if (!teamIds || teamIds.length === 0) {
      continue;
    }

    const allOrgCoachAssignments = await ctx.db
      .query("coachAssignments")
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic query builder
      .withIndex("by_organizationId", (q: any) =>
        q.eq("organizationId", org.id)
      )
      .collect();

    // Get all teams for this org to resolve other coaches' team assignments
    const allTeamsResult = await ctx.runQuery(
      betterAuthComponents.betterAuth.adapter.findMany,
      {
        model: "team",
        paginationOpts: { cursor: null, numItems: 1000 },
        where: [{ field: "organizationId", operator: "eq", value: org.id }],
      }
    );
    const allTeams = (allTeamsResult.page || []) as Array<{
      _id: string;
      name?: string;
    }>;

    const teamCoachUserIds = new Set<string>();
    for (const assignment of allOrgCoachAssignments) {
      if (assignment.userId === coachId) {
        continue;
      }
      // Resolve other coach's team assignments to actual team IDs
      const otherCoachTeamIds = allTeams
        .filter((team) => {
          const normalizedTeamName = (team.name || "").trim().toLowerCase();
          const normalizedAssignmentTeams = (assignment.teams || []).map(
            (t: string) => t.trim().toLowerCase()
          );
          return (
            normalizedAssignmentTeams.includes(normalizedTeamName) ||
            normalizedAssignmentTeams.includes(team._id) ||
            (assignment.teams || []).includes(team.name) ||
            (assignment.teams || []).includes(team._id)
          );
        })
        .map((t) => t._id);

      // Check if there's overlap with current coach's resolved team IDs
      const hasSharedTeams = otherCoachTeamIds.some((id) =>
        teamIds.includes(id)
      );
      if (hasSharedTeams) {
        teamCoachUserIds.add(assignment.userId);
      }
    }

    // BATCH FIX: Collect all coach IDs and fetch in parallel (fix N+1)
    const coachIdsToFetch = Array.from(teamCoachUserIds);
    const coachResults = await Promise.all(
      coachIdsToFetch.map((otherCoachId) =>
        ctx.runQuery(betterAuthComponents.betterAuth.adapter.findMany, {
          model: "user",
          paginationOpts: { cursor: null, numItems: 1 },
          where: [{ field: "_id", operator: "eq", value: otherCoachId }],
        })
      )
    );

    // Process fetched results synchronously
    for (let i = 0; i < coachIdsToFetch.length; i++) {
      const usersResult = coachResults[i];
      const user = (usersResult?.page || [])[0];

      if (user) {
        // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped data
        const userData = user as any;
        const firstName = (userData.firstName || "").toLowerCase();
        const lastName = (userData.lastName || "").toLowerCase();
        const fullName = (userData.name || "").toLowerCase();

        const coachFirstName = `coach ${firstName}`;
        const coachLastName = `coach ${lastName}`;
        const coachFullName = `coach ${fullName}`;

        if (
          (firstName.length > 2 && messageBody.includes(firstName)) ||
          (lastName.length > 2 && messageBody.includes(lastName)) ||
          messageBody.includes(fullName) ||
          messageBody.includes(coachFirstName) ||
          messageBody.includes(coachLastName) ||
          messageBody.includes(coachFullName)
        ) {
          coachMatches.set(org.id, (coachMatches.get(org.id) || 0) + 1);
        }
      }
    }
  }

  const orgsWithCoachMatches = Array.from(coachMatches.entries());
  if (orgsWithCoachMatches.length === 1) {
    const matchedOrgId = orgsWithCoachMatches[0][0];
    const matchedOrg = availableOrgs.find((o) => o.id === matchedOrgId);
    if (matchedOrg) {
      return { matchedOrg, matchType: "coach_match" };
    }
  }

  return { matchedOrg: null, matchType: null };
}

/**
 * Extract age group references from a message.
 * Matches patterns like: u12, u-12, under 12, under-12, u12s, the 12s, twelves
 */
function extractAgeGroupsFromMessage(message: string): string[] {
  const ageGroups: string[] = [];

  // Pattern 1: "u" followed by number (u12, u-12, u 12)
  const uMatches = message.matchAll(AGE_GROUP_U_PATTERN);
  for (const match of uMatches) {
    ageGroups.push(`u${match[1]}`);
  }

  // Pattern 2: "under" followed by number (under 12, under-12)
  const underMatches = message.matchAll(AGE_GROUP_UNDER_PATTERN);
  for (const match of underMatches) {
    ageGroups.push(`u${match[1]}`);
  }

  // Pattern 3: Plural forms (u12s, the 12s)
  const pluralMatches = message.matchAll(AGE_GROUP_PLURAL_PATTERN);
  for (const match of pluralMatches) {
    ageGroups.push(`u${match[1]}`);
  }

  // Pattern 4: Word numbers (twelves, fourteens, etc.)
  const wordNumbers: Record<string, string> = {
    sixes: "u6",
    sevens: "u7",
    eights: "u8",
    nines: "u9",
    tens: "u10",
    elevens: "u11",
    twelves: "u12",
    thirteens: "u13",
    fourteens: "u14",
    fifteens: "u15",
    sixteens: "u16",
    seventeens: "u17",
    eighteens: "u18",
    nineteens: "u19",
    twenties: "u20",
  };
  for (const [word, code] of Object.entries(wordNumbers)) {
    if (message.includes(word)) {
      ageGroups.push(code);
    }
  }

  // Pattern 5: "senior", "seniors", "adult", "adults"
  if (AGE_GROUP_SENIOR_PATTERN.test(message)) {
    ageGroups.push("senior");
  }

  return [...new Set(ageGroups)]; // Remove duplicates
}

/**
 * Extract sport references from a message.
 * Returns normalized sport codes.
 */
function extractSportsFromMessage(message: string): string[] {
  const sports: string[] = [];

  // Sport patterns with their normalized codes (using top-level constants)
  const sportPatterns: Array<{ patterns: RegExp[]; code: string }> = [
    { patterns: SPORT_SOCCER_PATTERNS, code: "soccer" },
    { patterns: SPORT_GAA_PATTERNS, code: "gaa_football" },
    { patterns: SPORT_HURLING_PATTERNS, code: "hurling" },
    { patterns: SPORT_CAMOGIE_PATTERNS, code: "camogie" },
    { patterns: SPORT_RUGBY_PATTERNS, code: "rugby" },
    { patterns: SPORT_BASKETBALL_PATTERNS, code: "basketball" },
    { patterns: SPORT_HOCKEY_PATTERNS, code: "hockey" },
    { patterns: SPORT_TENNIS_PATTERNS, code: "tennis" },
    { patterns: SPORT_SWIMMING_PATTERNS, code: "swimming" },
    { patterns: SPORT_ATHLETICS_PATTERNS, code: "athletics" },
  ];

  for (const { patterns, code } of sportPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        sports.push(code);
        break; // Only add each sport once
      }
    }
  }

  return [...new Set(sports)];
}

/**
 * Check if a detected sport matches a coach's assigned sport.
 * Handles variations and aliases.
 */
function matchesSport(detected: string, assigned: string): boolean {
  const normalizedDetected = detected.toLowerCase();
  const normalizedAssigned = assigned.toLowerCase();

  // Direct match
  if (normalizedDetected === normalizedAssigned) {
    return true;
  }

  // Handle aliases
  const aliases: Record<string, string[]> = {
    soccer: ["football", "soccer"],
    gaa_football: ["gaa", "gaelic", "gaelic_football"],
    hurling: ["hurling", "hurl"],
  };

  for (const [canonical, variants] of Object.entries(aliases)) {
    if (
      (normalizedAssigned === canonical ||
        variants.includes(normalizedAssigned)) &&
      (normalizedDetected === canonical ||
        variants.includes(normalizedDetected))
    ) {
      return true;
    }
  }

  return false;
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/**
 * Update or create session memory for a phone number.
 */
export const updateSession = internalMutation({
  args: {
    phoneNumber: v.string(),
    coachId: v.string(),
    organizationId: v.string(),
    organizationName: v.string(),
    resolvedVia: v.union(
      v.literal("single_org"),
      v.literal("explicit_mention"),
      v.literal("player_match"),
      v.literal("team_match"),
      v.literal("coach_match"),
      v.literal("age_group_match"),
      v.literal("sport_match"),
      v.literal("user_selection"),
      v.literal("session_memory")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhoneNumber(args.phoneNumber);
    const now = Date.now();

    // Check for existing session
    const existing = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", normalizedPhone))
      .first();

    if (existing) {
      // Update existing session
      await ctx.db.patch(existing._id, {
        organizationId: args.organizationId,
        organizationName: args.organizationName,
        resolvedVia: args.resolvedVia,
        lastMessageAt: now,
      });
    } else {
      // Create new session
      await ctx.db.insert("whatsappSessions", {
        phoneNumber: normalizedPhone,
        coachId: args.coachId,
        organizationId: args.organizationId,
        organizationName: args.organizationName,
        resolvedVia: args.resolvedVia,
        lastMessageAt: now,
        createdAt: now,
      });
    }

    return null;
  },
});

/**
 * Get current session for a phone number.
 */
export const getSession = internalQuery({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      organizationId: v.string(),
      organizationName: v.string(),
      lastMessageAt: v.number(),
      isExpired: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhoneNumber(args.phoneNumber);

    const session = await ctx.db
      .query("whatsappSessions")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", normalizedPhone))
      .first();

    if (!session) {
      return null;
    }

    return {
      organizationId: session.organizationId,
      organizationName: session.organizationName,
      lastMessageAt: session.lastMessageAt,
      isExpired: Date.now() - session.lastMessageAt > SESSION_TIMEOUT_MS,
    };
  },
});

// ============================================================
// PENDING MESSAGE MANAGEMENT
// ============================================================

/**
 * Store a pending message awaiting org selection.
 */
export const createPendingMessage = internalMutation({
  args: {
    messageSid: v.string(),
    phoneNumber: v.string(),
    coachId: v.string(),
    coachName: v.string(),
    messageType: messageTypeValidator,
    body: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    availableOrgs: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
      })
    ),
  },
  returns: v.id("whatsappPendingMessages"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    return await ctx.db.insert("whatsappPendingMessages", {
      messageSid: args.messageSid,
      phoneNumber: normalizePhoneNumber(args.phoneNumber),
      coachId: args.coachId,
      coachName: args.coachName,
      messageType: args.messageType,
      body: args.body,
      mediaUrl: args.mediaUrl,
      mediaContentType: args.mediaContentType,
      mediaStorageId: args.mediaStorageId,
      availableOrgs: args.availableOrgs,
      status: "awaiting_selection",
      createdAt: now,
      expiresAt,
    });
  },
});

/**
 * Check if there's a pending message for this phone number.
 * Uses internalMutation because it may need to mark expired messages.
 */
export const getPendingMessage = internalMutation({
  args: {
    phoneNumber: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("whatsappPendingMessages"),
      messageSid: v.string(),
      coachId: v.string(),
      coachName: v.string(),
      messageType: messageTypeValidator,
      body: v.optional(v.string()),
      mediaUrl: v.optional(v.string()),
      mediaContentType: v.optional(v.string()),
      mediaStorageId: v.optional(v.id("_storage")),
      availableOrgs: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
        })
      ),
      status: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhoneNumber(args.phoneNumber);

    const pending = await ctx.db
      .query("whatsappPendingMessages")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", normalizedPhone))
      .filter((q) => q.eq(q.field("status"), "awaiting_selection"))
      .first();

    if (!pending) {
      return null;
    }

    // Check if expired
    if (Date.now() > pending.expiresAt) {
      // Mark as expired
      await ctx.db.patch(pending._id, { status: "expired" });
      return null;
    }

    return {
      _id: pending._id,
      messageSid: pending.messageSid,
      coachId: pending.coachId,
      coachName: pending.coachName,
      messageType: pending.messageType,
      body: pending.body,
      mediaUrl: pending.mediaUrl,
      mediaContentType: pending.mediaContentType,
      mediaStorageId: pending.mediaStorageId,
      availableOrgs: pending.availableOrgs,
      status: pending.status,
    };
  },
});

/**
 * Resolve a pending message with the selected org.
 */
export const resolvePendingMessage = internalMutation({
  args: {
    pendingMessageId: v.id("whatsappPendingMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pendingMessageId, { status: "resolved" });
    return null;
  },
});

/**
 * Parse user selection from message (e.g., "1", "2", or org name).
 */
export const parseOrgSelection = internalQuery({
  args: {
    messageBody: v.string(),
    availableOrgs: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
      })
    ),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
    })
  ),
  handler: (_ctx, args) => {
    const body = args.messageBody.trim().toLowerCase();

    // Try numeric selection (1, 2, 3, etc.)
    const numericMatch = body.match(NUMERIC_SELECTION_PATTERN);
    if (numericMatch) {
      const index = Number.parseInt(numericMatch[1], 10) - 1;
      if (index >= 0 && index < args.availableOrgs.length) {
        return args.availableOrgs[index];
      }
    }

    // Try org name match (fuzzy)
    for (const org of args.availableOrgs) {
      const orgNameLower = org.name.toLowerCase();
      if (
        body === orgNameLower ||
        body.includes(orgNameLower) ||
        orgNameLower.includes(body)
      ) {
        return org;
      }
    }

    return null;
  },
});

// ============================================================
// PUBLIC QUERIES (for admin/debugging)
// ============================================================

/**
 * Get recent WhatsApp messages for an organization
 */
export const getRecentMessages = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("whatsappMessages"),
      _creationTime: v.number(),
      fromNumber: v.string(),
      messageType: messageTypeValidator,
      body: v.optional(v.string()),
      coachName: v.optional(v.string()),
      status: statusValidator,
      voiceNoteId: v.optional(v.id("voiceNotes")),
      receivedAt: v.number(),
      processedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const messages = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(limit);

    return messages.map((m) => ({
      _id: m._id,
      _creationTime: m._creationTime,
      fromNumber: m.fromNumber,
      messageType: m.messageType,
      body: m.body,
      coachName: m.coachName,
      status: m.status,
      voiceNoteId: m.voiceNoteId,
      receivedAt: m.receivedAt,
      processedAt: m.processedAt,
    }));
  },
});

/**
 * Get a specific WhatsApp message by ID
 */
export const getMessage = query({
  args: {
    messageId: v.id("whatsappMessages"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("whatsappMessages"),
      _creationTime: v.number(),
      messageSid: v.string(),
      fromNumber: v.string(),
      toNumber: v.string(),
      messageType: messageTypeValidator,
      body: v.optional(v.string()),
      mediaUrl: v.optional(v.string()),
      mediaContentType: v.optional(v.string()),
      coachId: v.optional(v.string()),
      coachName: v.optional(v.string()),
      organizationId: v.optional(v.string()),
      status: statusValidator,
      errorMessage: v.optional(v.string()),
      voiceNoteId: v.optional(v.id("voiceNotes")),
      processingResults: v.optional(processingResultsValidator),
      receivedAt: v.number(),
      processedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return null;
    }

    return {
      _id: message._id,
      _creationTime: message._creationTime,
      messageSid: message.messageSid,
      fromNumber: message.fromNumber,
      toNumber: message.toNumber,
      messageType: message.messageType,
      body: message.body,
      mediaUrl: message.mediaUrl,
      mediaContentType: message.mediaContentType,
      coachId: message.coachId,
      coachName: message.coachName,
      organizationId: message.organizationId,
      status: message.status,
      errorMessage: message.errorMessage,
      voiceNoteId: message.voiceNoteId,
      processingResults: message.processingResults,
      receivedAt: message.receivedAt,
      processedAt: message.processedAt,
    };
  },
});
