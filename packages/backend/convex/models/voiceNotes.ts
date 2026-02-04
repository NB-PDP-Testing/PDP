import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";

// ============ REGEX PATTERNS (for skill rating parsing) ============
// Patterns to match: "Rating: 4", "set to 3", "to three", "improved to 4/5", "level 3"
const SKILL_RATING_NUMERIC_PATTERN =
  /(?:rating[:\s]*|set\s+to\s+|update\s+to\s+|improved?\s+to\s+|now\s+at\s+|level\s+|to\s+)(\d)(?:\/5)?/i;
const SKILL_RATING_WORD_PATTERN =
  /(?:rating[:\s]*|set\s+to\s+|update\s+to\s+|improved?\s+to\s+|now\s+at\s+|level\s+|to\s+)(one|two|three|four|five)(?:\/5)?/i;
const SKILL_NAME_CLEANUP_PATTERN = /skill\s*(rating|assessment|update)?:?\s*/i;
const SKILL_PROGRESS_CLEANUP_PATTERN =
  /skill\s*(rating|assessment|update|progress|improved?)?:?\s*/i;
const WHITESPACE_PATTERN = /\s+/;
const REGEX_SPECIAL_CHARS_PATTERN = /[.*+?^${}()|[\]\\]/g;

// ============ VALIDATORS ============

const insightValidator = v.object({
  id: v.string(),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  playerName: v.optional(v.string()),
  title: v.string(),
  description: v.string(),
  category: v.optional(v.string()),
  recommendedUpdate: v.optional(v.string()),
  confidence: v.optional(v.number()), // Phase 7: AI confidence score (0.0-1.0)
  status: v.union(
    v.literal("pending"),
    v.literal("applied"),
    v.literal("dismissed"),
    v.literal("auto_applied") // Phase 7.3: Auto-applied by AI
  ),
  appliedDate: v.optional(v.string()),
  appliedAt: v.optional(v.number()), // Phase 7.3: Timestamp for auto-apply
  appliedBy: v.optional(v.string()), // Phase 7.3: User ID who applied
  dismissedAt: v.optional(v.number()), // Phase 7.3: Timestamp for dismiss
  dismissedBy: v.optional(v.string()), // Phase 7.3: User ID who dismissed
  // Team/TODO classification fields
  teamId: v.optional(v.string()),
  teamName: v.optional(v.string()),
  assigneeUserId: v.optional(v.string()),
  assigneeName: v.optional(v.string()),
  // Task linking - set when TODO insight creates a task
  linkedTaskId: v.optional(v.id("coachTasks")),
});

const noteTypeValidator = v.union(
  v.literal("training"),
  v.literal("match"),
  v.literal("general")
);

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

const sourceValidator = v.optional(
  v.union(
    v.literal("app_recorded"),
    v.literal("app_typed"),
    v.literal("whatsapp_audio"),
    v.literal("whatsapp_text")
  )
);

// ============ QUERIES ============

/**
 * Get all voice notes for an organization
 * Limited to 100 most recent notes to reduce bandwidth usage
 */
export const getAllVoiceNotes = query({
  args: {
    orgId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.string(),
      coachId: v.optional(v.string()),
      coachName: v.string(),
      date: v.string(),
      type: noteTypeValidator,
      audioStorageId: v.optional(v.id("_storage")),
      transcription: v.optional(v.string()),
      transcriptionStatus: v.optional(statusValidator),
      transcriptionError: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      insightsError: v.optional(v.string()),
      source: sourceValidator,
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(1000);

    // Batch fetch coach names to avoid N+1 queries
    // Get unique coach IDs
    const uniqueCoachIds = Array.from(
      new Set(
        notes.map((note) => note.coachId).filter((id): id is string => !!id)
      )
    );

    // Batch fetch all coach users using Better Auth adapter with correct field name
    const coachNameMap = new Map<string, string>();
    await Promise.all(
      uniqueCoachIds.map(async (coachId) => {
        // Use "_id" field (not "id") to query user by ID
        const coachResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "_id", value: coachId, operator: "eq" }],
          }
        );

        if (coachResult) {
          const coach = coachResult as {
            name?: string;
            email?: string;
          };
          // Use name field, fallback to email, then "Coach"
          const coachName = coach.name || coach.email || "Coach";
          coachNameMap.set(coachId, coachName);
        }
      })
    );

    // Enrich notes with coach names
    return notes.map((note) => ({
      ...note,
      coachName: note.coachId
        ? coachNameMap.get(note.coachId) || "Unknown Coach"
        : "Unknown Coach",
    }));
  },
});

/**
 * Get a single voice note by ID
 */
export const getVoiceNoteById = query({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.string(),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: noteTypeValidator,
      audioStorageId: v.optional(v.id("_storage")),
      transcription: v.optional(v.string()),
      transcriptionStatus: v.optional(statusValidator),
      transcriptionError: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      insightsError: v.optional(v.string()),
      source: sourceValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    return note;
  },
});

/**
 * Get voice notes by coach
 * Limited to 100 most recent notes to reduce bandwidth usage
 */
export const getVoiceNotesByCoach = query({
  args: {
    orgId: v.string(),
    coachId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.string(),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: noteTypeValidator,
      audioStorageId: v.optional(v.id("_storage")),
      transcription: v.optional(v.string()),
      transcriptionStatus: v.optional(statusValidator),
      transcriptionError: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      insightsError: v.optional(v.string()),
      source: sourceValidator,
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId_and_coachId", (q) =>
        q.eq("orgId", args.orgId).eq("coachId", args.coachId)
      )
      .order("desc")
      .take(1000);

    return notes;
  },
});

/**
 * Get voice notes from all coaches on teams where this coach is assigned
 * Used for team collaborative insights view
 * Returns notes with player insights only, enriched with coach names and team context
 */
export const getVoiceNotesForCoachTeams = query({
  args: {
    orgId: v.string(),
    coachId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.string(),
      coachId: v.optional(v.string()),
      coachName: v.string(),
      date: v.string(),
      type: noteTypeValidator,
      transcription: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      // Team context - which teams this note is relevant to
      relevantTeamIds: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Step 1: Get coach's team assignments
    const coachAssignment = await ctx.db
      .query("coachAssignments")
      .withIndex("by_user_and_org", (q) =>
        q.eq("userId", args.coachId).eq("organizationId", args.orgId)
      )
      .first();

    if (!coachAssignment || coachAssignment.teams.length === 0) {
      return []; // Coach not assigned to any teams
    }

    const myTeams = coachAssignment.teams;

    // Step 2: Find all coaches assigned to any of these teams
    const allCoachAssignments = await ctx.db
      .query("coachAssignments")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.orgId))
      .collect();

    // Get coach IDs who share at least one team with this coach
    const coachIdsOnMyTeams = new Set<string>();
    for (const assignment of allCoachAssignments) {
      // Check if this coach has any team overlap
      const hasSharedTeam = assignment.teams.some((teamId) =>
        myTeams.includes(teamId)
      );
      if (hasSharedTeam) {
        coachIdsOnMyTeams.add(assignment.userId);
      }
    }

    if (coachIdsOnMyTeams.size === 0) {
      return [];
    }

    // Step 3: Get all voice notes from these coaches
    const allNotes = await Promise.all(
      Array.from(coachIdsOnMyTeams).map(async (coachId) => {
        const notes = await ctx.db
          .query("voiceNotes")
          .withIndex("by_orgId_and_coachId", (q) =>
            q.eq("orgId", args.orgId).eq("coachId", coachId)
          )
          .order("desc")
          .take(500); // Limit per coach to avoid overload
        return notes;
      })
    );

    const notes = allNotes.flat();

    // Step 4: Filter to notes with player insights only (collaborative focus)
    const notesWithPlayerInsights = notes.filter((note) =>
      note.insights.some((insight: any) => insight.playerIdentityId)
    );

    // Step 5: Batch fetch coach names to avoid log overflow
    // Get unique coach IDs
    const uniqueCoachIds = Array.from(
      new Set(
        notesWithPlayerInsights
          .map((note) => note.coachId)
          .filter((id): id is string => !!id)
      )
    );

    // Batch fetch all coach users using Better Auth adapter with correct field name
    const coachNameMap = new Map<string, string>();
    await Promise.all(
      uniqueCoachIds.map(async (coachId) => {
        // Use "_id" field (not "id") to query Convex's internal ID
        // This uses the built-in _id index and avoids warnings
        const coachResult = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "_id", value: coachId, operator: "eq" }],
          }
        );

        if (coachResult) {
          const coach = coachResult as {
            firstName?: string;
            lastName?: string;
            name?: string;
          };
          const coachName =
            `${coach.firstName || ""} ${coach.lastName || ""}`.trim() ||
            coach.name ||
            "Coach";
          coachNameMap.set(coachId, coachName);
        }
      })
    );

    // Step 6: Enrich with coach names and team context (no more adapter calls)
    const enrichedNotes = notesWithPlayerInsights.map((note) => {
      const coachName = note.coachId
        ? coachNameMap.get(note.coachId) || "Unknown Coach"
        : "Unknown Coach";

      // Determine which of MY teams this note is relevant to
      // (based on the creating coach's team assignments)
      const noteCoachAssignment = allCoachAssignments.find(
        (a) => a.userId === note.coachId
      );
      const relevantTeamIds = noteCoachAssignment
        ? noteCoachAssignment.teams.filter((teamId) => myTeams.includes(teamId))
        : [];

      return {
        _id: note._id,
        _creationTime: note._creationTime,
        orgId: note.orgId,
        coachId: note.coachId,
        coachName,
        date: note.date,
        type: note.type,
        transcription: note.transcription,
        summary: note.summary,
        insights: note.insights,
        insightsStatus: note.insightsStatus,
        relevantTeamIds,
      };
    });

    // Step 7: Sort by date (most recent first)
    return enrichedNotes.sort(
      (a: any, b: any) => b._creationTime - a._creationTime
    );
  },
});

/**
 * Get pending insights for an organization
 * Limited to 100 most recent notes to reduce bandwidth usage
 */
export const getPendingInsights = query({
  args: {
    orgId: v.string(),
  },
  returns: v.array(
    v.object({
      noteId: v.id("voiceNotes"),
      insight: insightValidator,
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(1000);

    const pendingInsights: Array<{
      noteId: (typeof notes)[0]["_id"];
      insight: (typeof notes)[0]["insights"][0];
    }> = [];

    for (const note of notes) {
      for (const insight of note.insights) {
        if (insight.status === "pending") {
          pendingInsights.push({
            noteId: note._id,
            insight,
          });
        }
      }
    }

    return pendingInsights;
  },
});

/**
 * Get voice notes and insights for a specific player
 * Used in player passport to display coach insights
 * Returns all voice notes that have insights for the given player
 */
export const getVoiceNotesForPlayer = query({
  args: {
    orgId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.string(),
      coachId: v.optional(v.string()),
      coachName: v.string(),
      date: v.string(),
      type: noteTypeValidator,
      transcription: v.optional(v.string()),
      transcriptionStatus: v.optional(statusValidator),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
    })
  ),
  handler: async (ctx, args) => {
    // Strategy: Query all org voice notes with completed insights status
    // Filter client-side for notes that have insights for this player
    // (No schema changes needed - insights are embedded in array)

    const allNotes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("insightsStatus"), "completed"))
      .order("desc")
      .take(1000);

    // Filter notes that have insights for this player
    const playerNotes = allNotes.filter((note) =>
      note.insights.some(
        (insight) => insight.playerIdentityId === args.playerIdentityId
      )
    );

    // Batch fetch coach info (fix N+1 pattern)
    // 1. Collect unique coachIds
    const uniqueCoachIds: string[] = [
      ...new Set(
        playerNotes
          .map((n) => n.coachId)
          .filter((id): id is string => id !== undefined)
      ),
    ];

    // 2. Batch fetch all coaches in parallel
    const coachResults = await Promise.all(
      uniqueCoachIds.map((coachId) =>
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [
            {
              field: "_id",
              value: coachId,
              operator: "eq",
            },
          ],
        })
      )
    );

    // 3. Create Map for O(1) lookup
    const coachMap = new Map<string, string>();
    for (let i = 0; i < uniqueCoachIds.length; i++) {
      const result = coachResults[i];
      if (result) {
        // biome-ignore lint/suspicious/noExplicitAny: Better Auth adapter returns untyped data
        const coach = result as any;
        if (coach.firstName || coach.lastName) {
          coachMap.set(
            uniqueCoachIds[i],
            `${coach.firstName || ""} ${coach.lastName || ""}`.trim()
          );
        }
      }
    }

    // 4. Synchronously map over notes using pre-fetched data
    const notesWithCoachInfo = playerNotes.map((note) => {
      const coachName = note.coachId
        ? coachMap.get(note.coachId) || "Unknown Coach"
        : "Unknown Coach";

      return {
        _id: note._id,
        _creationTime: note._creationTime,
        orgId: note.orgId,
        coachId: note.coachId,
        coachName,
        date: note.date,
        type: note.type,
        transcription: note.transcription,
        transcriptionStatus: note.transcriptionStatus,
        insights: note.insights,
        insightsStatus: note.insightsStatus,
      };
    });

    return notesWithCoachInfo;
  },
});

// ============ MUTATIONS ============

/**
 * Create a typed voice note (no audio, just text)
 * Schedules AI insights extraction immediately
 */
export const createTypedNote = mutation({
  args: {
    orgId: v.string(),
    coachId: v.string(), // Required - Better Auth user ID
    noteText: v.string(),
    noteType: noteTypeValidator,
    source: v.optional(
      v.union(v.literal("app_typed"), v.literal("whatsapp_text"))
    ),
  },
  returns: v.id("voiceNotes"),
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      orgId: args.orgId,
      coachId: args.coachId,
      date: new Date().toISOString(),
      type: args.noteType,
      source: args.source || "app_typed",
      transcription: args.noteText,
      transcriptionStatus: "completed",
      insights: [],
      insightsStatus: "pending",
    });

    // Schedule AI insights extraction
    await ctx.scheduler.runAfter(0, internal.actions.voiceNotes.buildInsights, {
      noteId,
    });

    return noteId;
  },
});

/**
 * Create a voice note with audio recording
 * Schedules transcription which will then schedule insights extraction
 */
export const createRecordedNote = mutation({
  args: {
    orgId: v.string(),
    coachId: v.string(), // Required - Better Auth user ID
    audioStorageId: v.id("_storage"),
    noteType: noteTypeValidator,
    source: v.optional(
      v.union(v.literal("app_recorded"), v.literal("whatsapp_audio"))
    ),
  },
  returns: v.id("voiceNotes"),
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      orgId: args.orgId,
      coachId: args.coachId,
      date: new Date().toISOString(),
      type: args.noteType,
      source: args.source || "app_recorded",
      audioStorageId: args.audioStorageId,
      transcriptionStatus: "pending",
      insights: [],
      insightsStatus: "pending",
    });

    // Schedule transcription (which will then schedule insights)
    await ctx.scheduler.runAfter(
      0,
      internal.actions.voiceNotes.transcribeAudio,
      { noteId }
    );

    return noteId;
  },
});

/**
 * Generate an upload URL for audio storage
 */
export const generateUploadUrl = action({
  args: {},
  returns: v.string(),
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

/**
 * Update insight status (apply or dismiss)
 * When applying, actually routes the insight to the appropriate table:
 * - injury → playerInjuries table
 * - skill_progress → passportGoals table
 * - behavior → sportPassports.coachNotes
 * - performance → sportPassports.coachNotes
 */
export const updateInsightStatus = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    status: v.union(v.literal("applied"), v.literal("dismissed")),
  },
  returns: v.object({
    success: v.boolean(),
    appliedTo: v.optional(v.string()),
    recordId: v.optional(v.string()),
    message: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    // Find the insight
    const insight = note.insights.find((i) => i.id === args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    let appliedTo: string | undefined;
    let recordId: string | undefined;
    let message: string | undefined;

    // If applying, route to appropriate table based on category
    // Uses new identity system tables only
    if (args.status === "applied" && insight.playerIdentityId) {
      const playerIdentityId = insight.playerIdentityId; // narrow for TypeScript
      const category = insight.category?.toLowerCase() || "";
      const now = Date.now();
      const today = new Date().toISOString().split("T")[0];

      // Get the player identity
      const playerIdentity = await ctx.db.get(playerIdentityId);
      if (playerIdentity) {
        const playerName =
          insight.playerName ||
          `${playerIdentity.firstName} ${playerIdentity.lastName}`;

        switch (category) {
          case "injury": {
            // Create injury record in playerInjuries table
            const injuryId = await ctx.db.insert("playerInjuries", {
              playerIdentityId: insight.playerIdentityId,
              injuryType: "Voice Note Reported",
              bodyPart: "Unknown",
              dateOccurred: today,
              dateReported: today,
              severity: "minor",
              status: "active",
              description: `${insight.title}\n\n${insight.description}${insight.recommendedUpdate ? `\n\nRecommended: ${insight.recommendedUpdate}` : ""}`,
              occurredDuring: note.type === "match" ? "match" : "training",
              occurredAtOrgId: note.orgId,
              isVisibleToAllOrgs: true,
              reportedBy: note.coachId,
              reportedByRole: "coach",
              createdAt: now,
              updatedAt: now,
            });
            appliedTo = "playerInjuries";
            recordId = injuryId;
            message = `Injury record created for ${playerName}`;
            break;
          }

          case "skill_rating": {
            // Update/create a skill assessment for specific skill
            // AI should include skill name in the title or description
            const passport = await ctx.db
              .query("sportPassports")
              .withIndex("by_playerIdentityId", (q) =>
                q.eq("playerIdentityId", playerIdentityId)
              )
              .first();

            if (passport) {
              // Try to parse rating from description or recommendedUpdate
              // Handle both numeric (3, 4/5) and word numbers (three, four)
              const wordToNum: Record<string, number> = {
                one: 1,
                two: 2,
                three: 3,
                four: 4,
                five: 5,
                "1": 1,
                "2": 2,
                "3": 3,
                "4": 4,
                "5": 5,
              };

              // Use top-level regex patterns for performance
              const patterns = [
                SKILL_RATING_NUMERIC_PATTERN,
                SKILL_RATING_WORD_PATTERN,
              ];

              let newRating: number | null = null;

              // Check description first
              for (const pattern of patterns) {
                const match =
                  insight.description.match(pattern) ||
                  insight.recommendedUpdate?.match(pattern);
                if (match) {
                  const val = match[1].toLowerCase();
                  newRating =
                    wordToNum[val] || Number.parseInt(val, 10) || null;
                  if (newRating) {
                    break;
                  }
                }
              }

              // Try to extract skill name from title
              const skillName = insight.title
                .replace(SKILL_NAME_CLEANUP_PATTERN, "")
                .trim();

              if (newRating && newRating >= 1 && newRating <= 5) {
                // Create skill assessment record
                const assessmentId = await ctx.db.insert("skillAssessments", {
                  passportId: passport._id,
                  playerIdentityId: insight.playerIdentityId,
                  sportCode: passport.sportCode,
                  skillCode: skillName
                    .toLowerCase()
                    .replace(WHITESPACE_PATTERN, "_"),
                  organizationId: note.orgId,
                  rating: newRating,
                  assessmentDate: today,
                  assessmentType: note.type === "match" ? "match" : "training",
                  assessedByName: "Voice Note",
                  assessorRole: "coach",
                  notes: `${insight.description}${insight.recommendedUpdate ? `\n\nRecommended: ${insight.recommendedUpdate}` : ""}`,
                  createdAt: now,
                });

                // Update passport's last assessment date
                await ctx.db.patch(passport._id, {
                  lastAssessmentDate: today,
                  lastAssessmentType:
                    note.type === "match" ? "match" : "training",
                  assessmentCount: (passport.assessmentCount || 0) + 1,
                  updatedAt: now,
                });

                appliedTo = "skillAssessments";
                recordId = assessmentId;
                message = `Skill assessment "${skillName}" set to ${newRating}/5 for ${playerName}`;
              } else {
                // No rating found, create a goal instead
                const goalId = await ctx.db.insert("passportGoals", {
                  passportId: passport._id,
                  playerIdentityId: insight.playerIdentityId,
                  organizationId: note.orgId,
                  title: insight.title,
                  description: `${insight.description}${insight.recommendedUpdate ? `\n\nRecommended: ${insight.recommendedUpdate}` : ""}`,
                  category: "technical",
                  priority: "medium",
                  status: "not_started",
                  progress: 0,
                  parentCanView: true,
                  createdBy: note.coachId,
                  createdAt: now,
                  updatedAt: now,
                });
                appliedTo = "passportGoals";
                recordId = goalId;
                message = `Development goal created for ${playerName} (no rating value found - use "Rating: X" format)`;
              }
            } else {
              message = `No sport passport found for ${playerName}`;
            }
            break;
          }

          case "skill_progress": {
            // Find passport for this player
            const passport = await ctx.db
              .query("sportPassports")
              .withIndex("by_playerIdentityId", (q) =>
                q.eq("playerIdentityId", playerIdentityId)
              )
              .first();

            if (passport) {
              // Check if there's actually a rating mentioned - if so, create skill assessment instead
              const wordToNum: Record<string, number> = {
                one: 1,
                two: 2,
                three: 3,
                four: 4,
                five: 5,
                "1": 1,
                "2": 2,
                "3": 3,
                "4": 4,
                "5": 5,
              };

              // Use top-level regex patterns for performance
              const patterns = [
                SKILL_RATING_NUMERIC_PATTERN,
                SKILL_RATING_WORD_PATTERN,
              ];

              let foundRating: number | null = null;
              const textToSearch = `${insight.description} ${insight.recommendedUpdate || ""} ${insight.title}`;

              for (const pattern of patterns) {
                const match = textToSearch.match(pattern);
                if (match) {
                  const val = match[1].toLowerCase();
                  foundRating =
                    wordToNum[val] || Number.parseInt(val, 10) || null;
                  if (foundRating) {
                    break;
                  }
                }
              }

              if (foundRating && foundRating >= 1 && foundRating <= 5) {
                // There's a rating - create skill assessment instead of goal
                const skillName = insight.title
                  .replace(SKILL_PROGRESS_CLEANUP_PATTERN, "")
                  .trim();

                const assessmentId = await ctx.db.insert("skillAssessments", {
                  passportId: passport._id,
                  playerIdentityId: insight.playerIdentityId,
                  sportCode: passport.sportCode,
                  skillCode: skillName
                    .toLowerCase()
                    .replace(WHITESPACE_PATTERN, "_"),
                  organizationId: note.orgId,
                  rating: foundRating,
                  assessmentDate: today,
                  assessmentType: note.type === "match" ? "match" : "training",
                  assessedByName: "Voice Note",
                  assessorRole: "coach",
                  notes: `${insight.description}${insight.recommendedUpdate ? `\n\nRecommended: ${insight.recommendedUpdate}` : ""}`,
                  createdAt: now,
                });

                await ctx.db.patch(passport._id, {
                  lastAssessmentDate: today,
                  lastAssessmentType:
                    note.type === "match" ? "match" : "training",
                  assessmentCount: (passport.assessmentCount || 0) + 1,
                  updatedAt: now,
                });

                appliedTo = "skillAssessments";
                recordId = assessmentId;
                message = `Skill "${skillName}" set to ${foundRating}/5 for ${playerName}`;
              } else {
                // No rating found - create passport goal as before
                const goalId = await ctx.db.insert("passportGoals", {
                  passportId: passport._id,
                  playerIdentityId: insight.playerIdentityId,
                  organizationId: note.orgId,
                  title: insight.title,
                  description: `${insight.description}${insight.recommendedUpdate ? `\n\nRecommended: ${insight.recommendedUpdate}` : ""}`,
                  category: "technical",
                  priority: "medium",
                  status: "not_started",
                  progress: 0,
                  parentCanView: true,
                  createdBy: note.coachId,
                  createdAt: now,
                  updatedAt: now,
                });
                appliedTo = "passportGoals";
                recordId = goalId;
                message = `Development goal created for ${playerName}`;
              }
            } else {
              // No passport exists, add to enrollment notes instead
              const enrollment = await ctx.db
                .query("orgPlayerEnrollments")
                .withIndex("by_player_and_org", (q) =>
                  q
                    .eq("playerIdentityId", playerIdentityId)
                    .eq("organizationId", note.orgId)
                )
                .first();

              if (enrollment) {
                const existingNotes = enrollment.coachNotes || "";
                const newNote = `[${new Date().toLocaleDateString()}] GOAL: ${insight.title} - ${insight.description}`;
                await ctx.db.patch(enrollment._id, {
                  coachNotes: existingNotes
                    ? `${existingNotes}\n\n${newNote}`
                    : newNote,
                  updatedAt: now,
                });
                appliedTo = "orgPlayerEnrollments.coachNotes";
                recordId = enrollment._id;
                message = `Goal added to ${playerName}'s enrollment notes (no sport passport found)`;
              } else {
                message = `No sport passport or enrollment found for ${playerName}`;
              }
            }
            break;
          }
          default: {
            // Add to sport passport's coach notes (shown on player profile Development Notes)
            const passport = await ctx.db
              .query("sportPassports")
              .withIndex("by_playerIdentityId", (q) =>
                q.eq("playerIdentityId", playerIdentityId)
              )
              .first();

            if (passport) {
              const existingNotes = passport.coachNotes || "";
              const newNote = `[${new Date().toLocaleDateString()}] ${insight.title}: ${insight.description}${insight.recommendedUpdate ? ` (Recommended: ${insight.recommendedUpdate})` : ""}`;
              await ctx.db.patch(passport._id, {
                coachNotes: existingNotes
                  ? `${existingNotes}\n\n${newNote}`
                  : newNote,
                updatedAt: now,
              });
              appliedTo = "sportPassports.coachNotes";
              recordId = passport._id;
              message = `Development note added to ${playerName}'s profile`;
            } else {
              // Fallback to enrollment notes if no passport exists
              const enrollment = await ctx.db
                .query("orgPlayerEnrollments")
                .withIndex("by_player_and_org", (q) =>
                  q
                    .eq("playerIdentityId", playerIdentityId)
                    .eq("organizationId", note.orgId)
                )
                .first();

              if (enrollment) {
                const existingNotes = enrollment.coachNotes || "";
                const newNote = `[${new Date().toLocaleDateString()}] ${insight.title}: ${insight.description}${insight.recommendedUpdate ? ` (Recommended: ${insight.recommendedUpdate})` : ""}`;
                const updatedNotes = existingNotes
                  ? `${existingNotes}\n\n${newNote}`
                  : newNote;

                await ctx.db.patch(enrollment._id, {
                  coachNotes: updatedNotes,
                  updatedAt: now,
                });

                appliedTo = "orgPlayerEnrollments.coachNotes";
                recordId = enrollment._id;
                message = `Note added to ${playerName}'s enrollment (no sport passport found)`;
              } else {
                message = `No passport or enrollment found for ${playerName}`;
              }
            }
            break;
          }
        }
      } else {
        message = "Player identity not found";
      }
    } else if (
      args.status === "applied" &&
      !insight.playerIdentityId &&
      insight.category === "todo"
    ) {
      // This is a TODO insight - create a coach task
      const assigneeUserId = (insight as any).assigneeUserId;
      const assigneeName = (insight as any).assigneeName;

      if (!(assigneeUserId && note.coachId)) {
        throw new Error(
          "TODO insight must have assigneeUserId and coachId to create a task"
        );
      }

      const now = Date.now();

      // Create the coach task
      const taskId = await ctx.db.insert("coachTasks", {
        text: insight.title,
        completed: false,
        organizationId: note.orgId,
        assignedToUserId: assigneeUserId,
        assignedToName: assigneeName,
        createdByUserId: note.coachId,
        source: "voice_note",
        voiceNoteId: args.noteId,
        insightId: args.insightId,
        priority: "medium",
        createdAt: now,
      });

      appliedTo = "coachTasks";
      recordId = taskId;
      message = `Task created and assigned to ${assigneeName}`;

      // Link the task back to the insight
      const updatedInsightsWithTask = note.insights.map((i) => {
        if (i.id === args.insightId) {
          return {
            ...i,
            status: "applied" as const,
            appliedDate: new Date().toISOString(),
            linkedTaskId: taskId,
          };
        }
        return i;
      });

      await ctx.db.patch(args.noteId, {
        insights: updatedInsightsWithTask,
      });

      return {
        success: true,
        appliedTo,
        recordId,
        message,
      };
    } else if (
      args.status === "applied" &&
      !insight.playerIdentityId &&
      insight.category === "team_culture"
    ) {
      // This is a team-level insight (no player linked)
      // Create a record in teamObservations table
      const category = insight.category?.toLowerCase() || "team_culture";
      const now = Date.now();

      // Check if insight has teamId (from AI auto-assignment)
      const targetTeamId = (insight as any).teamId;
      const targetTeamName = (insight as any).teamName;

      if (targetTeamId && targetTeamName) {
        // Verify coachId exists (required for team observations)
        if (!note.coachId) {
          throw new Error(
            "Cannot create team observation: voice note has no coachId. This is likely a legacy note."
          );
        }

        // Get coach name from Better Auth
        const coachUser = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "user",
            where: [{ field: "id", value: note.coachId, operator: "eq" }],
          }
        );

        const coachName = coachUser
          ? `${(coachUser as any).firstName || ""} ${(coachUser as any).lastName || ""}`.trim() ||
            (coachUser as any).name ||
            "Coach"
          : "Coach";

        // Create team observation record
        const observationId = await ctx.db.insert("teamObservations", {
          organizationId: note.orgId,
          teamId: targetTeamId,
          teamName: targetTeamName,
          source: "voice_note",
          voiceNoteId: args.noteId,
          insightId: args.insightId,
          coachId: note.coachId,
          coachName,
          title: insight.title,
          description: insight.description,
          category,
          dateObserved: note.date,
          createdAt: now,
        });

        appliedTo = "teamObservations";
        recordId = observationId;
        message = `Team observation added to ${targetTeamName}`;
      } else {
        // No team ID - insight needs to be classified with a team first
        throw new Error(
          "Team insight must be assigned to a team before applying. Please classify it first."
        );
      }
    }

    // Phase 7.1: Track preview mode statistics
    const user = await authComponent.safeGetAuthUser(ctx);
    if (user) {
      const userId = user._id;
      const trustLevel = await ctx.db
        .query("coachTrustLevels")
        .withIndex("by_coach", (q) => q.eq("coachId", userId))
        .first();

      if (
        trustLevel?.insightPreviewModeStats &&
        !trustLevel.insightPreviewModeStats.completedAt
      ) {
        // Calculate if this insight would have been auto-applied
        const effectiveLevel = Math.min(
          trustLevel.currentLevel,
          trustLevel.preferredLevel ?? trustLevel.currentLevel
        );
        const threshold = trustLevel.insightConfidenceThreshold ?? 0.7;
        const confidence = (insight as any).confidence ?? 0.7;
        const wouldAutoApply =
          insight.category !== "injury" &&
          insight.category !== "medical" &&
          effectiveLevel >= 2 &&
          confidence >= threshold;

        // Update preview mode stats based on action
        const stats = trustLevel.insightPreviewModeStats;
        let newWouldAutoApply = stats.wouldAutoApplyInsights;
        let newApplied = stats.coachAppliedThose;
        let newDismissed = stats.coachDismissedThose;

        if (wouldAutoApply) {
          newWouldAutoApply += 1;
          if (args.status === "applied") {
            newApplied += 1;
          } else if (args.status === "dismissed") {
            newDismissed += 1;
          }
        }

        const agreementRate =
          newWouldAutoApply > 0 ? newApplied / newWouldAutoApply : 0;

        await ctx.db.patch(trustLevel._id, {
          insightPreviewModeStats: {
            ...stats,
            wouldAutoApplyInsights: newWouldAutoApply,
            coachAppliedThose: newApplied,
            coachDismissedThose: newDismissed,
            agreementRate,
            completedAt:
              newWouldAutoApply >= 20 ? Date.now() : stats.completedAt,
          },
        });
      }
    }

    // Update the insight status
    const updatedInsights = note.insights.map((i) => {
      if (i.id === args.insightId) {
        return {
          ...i,
          status: args.status,
          appliedDate:
            args.status === "applied" ? new Date().toISOString() : undefined,
        };
      }
      return i;
    });

    await ctx.db.patch(args.noteId, {
      insights: updatedInsights,
    });

    return {
      success: true,
      appliedTo,
      recordId,
      message,
    };
  },
});

/**
 * Bulk apply multiple insights at once
 * Only processes insights that are ready (have playerIdentityId or are team-level)
 * Returns summary of results
 */
export const bulkApplyInsights = mutation({
  args: {
    insights: v.array(
      v.object({
        noteId: v.id("voiceNotes"),
        insightId: v.string(),
      })
    ),
  },
  returns: v.object({
    successCount: v.number(),
    failCount: v.number(),
    results: v.array(
      v.object({
        insightId: v.string(),
        success: v.boolean(),
        message: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const results: Array<{
      insightId: string;
      success: boolean;
      message?: string;
    }> = [];
    let successCount = 0;
    let failCount = 0;

    // Group insights by noteId to minimize DB reads
    const insightsByNote = new Map<Id<"voiceNotes">, string[]>();
    for (const item of args.insights) {
      const existing = insightsByNote.get(item.noteId) || [];
      existing.push(item.insightId);
      insightsByNote.set(item.noteId, existing);
    }

    // Process each note's insights
    for (const [noteId, insightIds] of insightsByNote) {
      const note = await ctx.db.get(noteId);
      if (!note) {
        for (const insightId of insightIds) {
          results.push({
            insightId,
            success: false,
            message: "Voice note not found",
          });
          failCount += 1;
        }
        continue;
      }

      for (const insightId of insightIds) {
        const insight = note.insights.find(
          (i: { id: string }) => i.id === insightId
        );
        if (!insight) {
          results.push({
            insightId,
            success: false,
            message: "Insight not found",
          });
          failCount += 1;
          continue;
        }

        // Skip insights that aren't ready (no player and not team-level)
        const TEAM_LEVEL_CATEGORIES = ["team_culture", "todo"];
        const isTeamLevel =
          insight.category && TEAM_LEVEL_CATEGORIES.includes(insight.category);
        if (!(insight.playerIdentityId || isTeamLevel)) {
          results.push({
            insightId,
            success: false,
            message: "Insight needs player assignment or classification first",
          });
          failCount += 1;
          continue;
        }

        // Apply the insight - simplified version for bulk
        try {
          const now = Date.now();
          let message = "Applied successfully";

          if (insight.playerIdentityId) {
            const insightPlayerIdentityId = insight.playerIdentityId;
            const playerIdentity = await ctx.db.get(insightPlayerIdentityId);
            if (
              playerIdentity &&
              "firstName" in playerIdentity &&
              "lastName" in playerIdentity
            ) {
              const playerName =
                insight.playerName ||
                `${playerIdentity.firstName} ${playerIdentity.lastName}`;

              // For bulk apply, add to coach notes (simplified - doesn't create specialized records)
              const passport = await ctx.db
                .query("sportPassports")
                .withIndex("by_playerIdentityId", (q) =>
                  q.eq("playerIdentityId", insightPlayerIdentityId)
                )
                .first();

              if (passport) {
                const existingNotes = passport.coachNotes || "";
                const newNote = `[${new Date().toLocaleDateString()}] ${insight.title}: ${insight.description}${insight.recommendedUpdate ? ` (Recommended: ${insight.recommendedUpdate})` : ""}`;
                await ctx.db.patch(passport._id, {
                  coachNotes: existingNotes
                    ? `${existingNotes}\n\n${newNote}`
                    : newNote,
                  updatedAt: now,
                });
                message = `Note added to ${playerName}'s profile`;
              } else {
                // Fallback to enrollment notes
                const orgId = "orgId" in note ? (note.orgId as string) : "";
                const enrollment = await ctx.db
                  .query("orgPlayerEnrollments")
                  .withIndex("by_player_and_org", (q) =>
                    q
                      .eq("playerIdentityId", insightPlayerIdentityId)
                      .eq("organizationId", orgId)
                  )
                  .first();

                if (enrollment) {
                  const existingNotes = enrollment.coachNotes || "";
                  const newNote = `[${new Date().toLocaleDateString()}] ${insight.title}: ${insight.description}`;
                  await ctx.db.patch(enrollment._id, {
                    coachNotes: existingNotes
                      ? `${existingNotes}\n\n${newNote}`
                      : newNote,
                    updatedAt: now,
                  });
                  message = `Note added to ${playerName}'s enrollment`;
                } else {
                  message = `Applied (no passport/enrollment found for ${playerName})`;
                }
              }
            }
          } else if (isTeamLevel) {
            message = "Team insight applied";
          }

          // Mark insight as applied
          const updatedInsights = note.insights.map(
            (i: { id: string; status?: string; appliedDate?: string }) => {
              if (i.id === insightId) {
                return {
                  ...i,
                  status: "applied" as const,
                  appliedDate: new Date().toISOString(),
                };
              }
              return i;
            }
          );

          await ctx.db.patch(note._id, {
            insights: updatedInsights as typeof note.insights,
          });

          // Update the in-memory note for subsequent iterations
          (note as any).insights = updatedInsights;

          results.push({
            insightId,
            success: true,
            message,
          });
          successCount += 1;
        } catch (error) {
          results.push({
            insightId,
            success: false,
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
          failCount += 1;
        }
      }
    }

    return {
      successCount,
      failCount,
      results,
    };
  },
});

/**
 * Update insight content (title, description, recommendedUpdate)
 * Allows coaches to edit AI-generated insights before applying
 */
export const updateInsightContent = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    recommendedUpdate: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Voice note not found");
    }

    const updatedInsights = note.insights.map((insight) => {
      if (insight.id === args.insightId) {
        return {
          ...insight,
          title: args.title ?? insight.title,
          description: args.description ?? insight.description,
          recommendedUpdate:
            args.recommendedUpdate ?? insight.recommendedUpdate,
        };
      }
      return insight;
    });

    await ctx.db.patch(args.noteId, {
      insights: updatedInsights,
    });

    // Phase 7.3: Update voiceNoteInsights table and re-check auto-apply eligibility
    // Now that we have updated content, the insight might be eligible for auto-apply
    const voiceNoteInsight = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_voice_note_and_insight", (q) =>
        q.eq("voiceNoteId", args.noteId).eq("insightId", args.insightId)
      )
      .first();

    if (voiceNoteInsight && voiceNoteInsight.status === "pending") {
      // Update the voiceNoteInsights record with new content
      await ctx.db.patch(voiceNoteInsight._id, {
        title: args.title ?? voiceNoteInsight.title,
        description: args.description ?? voiceNoteInsight.description,
        recommendedUpdate:
          args.recommendedUpdate ?? voiceNoteInsight.recommendedUpdate,
        // AI Accuracy Tracking (Phase 7.3): Track that coach edited AI-generated content
        wasManuallyCorrected: true,
        manuallyCorrectedAt: Date.now(),
        correctionType: "content_edited",
        updatedAt: Date.now(),
      });

      // Re-check auto-apply eligibility via action
      await ctx.scheduler.runAfter(
        0,
        internal.actions.voiceNotes.recheckAutoApply,
        {
          voiceNoteInsightId: voiceNoteInsight._id,
        }
      );
    }

    return { success: true };
  },
});

/**
 * Internal version of updateInsightContent for use by actions
 * Used by AI name correction action
 */
export const updateInsightContentInternal = internalMutation({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    recommendedUpdate: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Voice note not found");
    }

    const updatedInsights = note.insights.map((insight) => {
      if (insight.id === args.insightId) {
        return {
          ...insight,
          title: args.title ?? insight.title,
          description: args.description ?? insight.description,
          recommendedUpdate:
            args.recommendedUpdate ?? insight.recommendedUpdate,
        };
      }
      return insight;
    });

    await ctx.db.patch(args.noteId, {
      insights: updatedInsights,
    });

    // Phase 7.3: Update voiceNoteInsights table and re-check auto-apply eligibility
    // Now that we have updated content, the insight might be eligible for auto-apply
    const voiceNoteInsight = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_voice_note_and_insight", (q) =>
        q.eq("voiceNoteId", args.noteId).eq("insightId", args.insightId)
      )
      .first();

    if (voiceNoteInsight && voiceNoteInsight.status === "pending") {
      // Update the voiceNoteInsights record with new content
      await ctx.db.patch(voiceNoteInsight._id, {
        title: args.title ?? voiceNoteInsight.title,
        description: args.description ?? voiceNoteInsight.description,
        recommendedUpdate:
          args.recommendedUpdate ?? voiceNoteInsight.recommendedUpdate,
        updatedAt: Date.now(),
      });

      // Re-check auto-apply eligibility via action
      await ctx.scheduler.runAfter(
        0,
        internal.actions.voiceNotes.recheckAutoApply,
        {
          voiceNoteInsightId: voiceNoteInsight._id,
        }
      );
    }

    return null;
  },
});

/**
 * Classify an insight as team-level or TODO
 * Used when coach marks an insight as not player-specific
 * Can also assign to a specific team (for team_culture) or assignee (for todo)
 *
 * When category is "todo", automatically creates a coachTask and links it
 */
export const classifyInsight = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    category: v.union(
      v.literal("team_culture"),
      v.literal("todo"),
      v.literal("injury"),
      v.literal("skill_rating"),
      v.literal("skill_progress"),
      v.literal("behavior"),
      v.literal("performance"),
      v.literal("attendance")
    ),
    // Optional: teamId for team_culture insights
    teamId: v.optional(v.string()),
    teamName: v.optional(v.string()),
    // Required for todo: who to assign the task to
    assigneeUserId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    // Required for todo: who is creating this (current user)
    createdByUserId: v.optional(v.string()),
    createdByName: v.optional(v.string()),
    // Optional: priority for the created task
    taskPriority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
  },
  returns: v.object({
    success: v.boolean(),
    category: v.string(),
    teamName: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    taskId: v.optional(v.id("coachTasks")),
  }),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Voice note not found");
    }

    // Find the insight to get its details
    const targetInsight = note.insights.find((i) => i.id === args.insightId);
    if (!targetInsight) {
      throw new Error("Insight not found");
    }

    let taskId: Id<"coachTasks"> | undefined;

    // If this is a TODO, create a task in coachTasks
    if (args.category === "todo") {
      // Require assignee for TODO tasks
      if (!(args.assigneeUserId && args.createdByUserId)) {
        throw new Error(
          "assigneeUserId and createdByUserId are required for todo category"
        );
      }

      const now = Date.now();

      // Create the task with source tracking
      taskId = await ctx.db.insert("coachTasks", {
        text: targetInsight.title,
        completed: false,
        organizationId: note.orgId,
        assignedToUserId: args.assigneeUserId,
        assignedToName: args.assigneeName,
        createdByUserId: args.createdByUserId,
        source: "voice_note",
        voiceNoteId: args.noteId,
        insightId: args.insightId,
        priority: args.taskPriority,
        // Link player if the insight had one
        playerIdentityId: targetInsight.playerIdentityId as any,
        playerName: targetInsight.playerName,
        // Team scope if provided
        teamId: args.teamId,
        createdAt: now,
      });
    }

    // Update the insight with classification and task link
    const updatedInsights = note.insights.map((insight) => {
      if (insight.id === args.insightId) {
        return {
          ...insight,
          category: args.category,
          // Add team info for team_culture
          ...(args.teamId && { teamId: args.teamId }),
          ...(args.teamName && { teamName: args.teamName }),
          // Add assignee info for todo
          ...(args.assigneeUserId && { assigneeUserId: args.assigneeUserId }),
          ...(args.assigneeName && { assigneeName: args.assigneeName }),
          // Link to the created task
          ...(taskId && { linkedTaskId: taskId }),
        };
      }
      return insight;
    });

    await ctx.db.patch(args.noteId, {
      insights: updatedInsights,
    });

    // Phase 7.3: Update voiceNoteInsights table and re-check auto-apply eligibility
    // Now that we have a category assigned, the insight might be eligible for auto-apply
    const voiceNoteInsight = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_voice_note_and_insight", (q) =>
        q.eq("voiceNoteId", args.noteId).eq("insightId", args.insightId)
      )
      .first();

    if (voiceNoteInsight && voiceNoteInsight.status === "pending") {
      // Determine correction type based on category
      const correctionType =
        args.category === "team_culture"
          ? ("team_classified" as const)
          : ("todo_classified" as const);

      // Update the voiceNoteInsights record with new category info
      await ctx.db.patch(voiceNoteInsight._id, {
        category: args.category,
        teamId: args.teamId,
        teamName: args.teamName,
        assigneeUserId: args.assigneeUserId,
        assigneeName: args.assigneeName,
        // AI Accuracy Tracking (Phase 7.3): Track that coach reclassified insight
        wasManuallyCorrected: true,
        manuallyCorrectedAt: Date.now(),
        correctionType,
        updatedAt: Date.now(),
      });

      // Re-check auto-apply eligibility via action
      await ctx.scheduler.runAfter(
        0,
        internal.actions.voiceNotes.recheckAutoApply,
        {
          voiceNoteInsightId: voiceNoteInsight._id,
        }
      );
    }

    return {
      success: true,
      category: args.category,
      teamName: args.teamName,
      assigneeName: args.assigneeName,
      taskId,
    };
  },
});

/**
 * Correct player name in text using pattern matching
 * Tries multiple variations of the wrong name to find and replace
 */
function correctPlayerNameInText(
  text: string,
  wrongName: string | undefined,
  correctFirstName: string,
  correctLastName: string
): { corrected: string; wasModified: boolean } {
  if (!(wrongName && text)) {
    return { corrected: text, wasModified: false };
  }

  const correctFullName = `${correctFirstName} ${correctLastName}`;
  let corrected = text;
  let wasModified = false;

  // Build variations of the wrong name to search for
  const wrongParts = wrongName.split(WHITESPACE_PATTERN);
  const wrongFirstName = wrongParts[0] || "";

  // Create search patterns (case insensitive)
  const patterns: Array<{ search: RegExp; replacement: string }> = [];

  // Full name patterns
  if (wrongName.length > 1) {
    // "Claudia Barlow" -> "Clodagh Barlow"
    patterns.push({
      search: new RegExp(escapeRegex(wrongName), "gi"),
      replacement: correctFullName,
    });
  }

  // First name only patterns (most common for voice transcription errors)
  if (wrongFirstName.length > 1) {
    // "Claudia's" -> "Clodagh's" (possessive)
    patterns.push({
      search: new RegExp(`${escapeRegex(wrongFirstName)}'s\\b`, "gi"),
      replacement: `${correctFirstName}'s`,
    });
    // "Claudia" -> "Clodagh" (standalone, word boundary)
    patterns.push({
      search: new RegExp(`\\b${escapeRegex(wrongFirstName)}\\b`, "gi"),
      replacement: correctFirstName,
    });
  }

  // Apply patterns in order (most specific first)
  for (const pattern of patterns) {
    if (pattern.search.test(corrected)) {
      corrected = corrected.replace(pattern.search, pattern.replacement);
      wasModified = true;
    }
  }

  return { corrected, wasModified };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(REGEX_SPECIAL_CHARS_PATTERN, "\\$&");
}

/**
 * Assign a player to an unmatched insight
 * Allows coaches to manually fix player matching
 * Also corrects player name in title/description using pattern matching
 */
export const assignPlayerToInsight = mutation({
  args: {
    noteId: v.id("voiceNotes"),
    insightId: v.string(),
    playerIdentityId: v.id("playerIdentities"),
  },
  returns: v.object({
    success: v.boolean(),
    playerName: v.string(),
    nameWasCorrected: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Voice note not found");
    }

    // Get player name for display
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) {
      throw new Error("Player not found");
    }
    const playerName = `${player.firstName} ${player.lastName}`;

    // Find the insight to get the original (possibly wrong) player name
    const insight = note.insights.find((i) => i.id === args.insightId);
    if (!insight) {
      throw new Error("Insight not found");
    }

    // Correct player name in title, description, AND recommendedUpdate using pattern matching
    const originalPlayerName = insight.playerName;
    let correctedTitle = insight.title;
    let correctedDescription = insight.description;
    let correctedRecommendedUpdate = insight.recommendedUpdate;
    let nameWasCorrected = false;

    if (originalPlayerName && originalPlayerName !== playerName) {
      // Try pattern-based correction for all text fields
      const titleResult = correctPlayerNameInText(
        insight.title,
        originalPlayerName,
        player.firstName,
        player.lastName
      );
      const descResult = correctPlayerNameInText(
        insight.description,
        originalPlayerName,
        player.firstName,
        player.lastName
      );

      // Also correct recommendedUpdate if it exists
      let recUpdateResult = {
        corrected: insight.recommendedUpdate,
        wasModified: false,
      };
      if (insight.recommendedUpdate) {
        recUpdateResult = correctPlayerNameInText(
          insight.recommendedUpdate,
          originalPlayerName,
          player.firstName,
          player.lastName
        );
      }

      correctedTitle = titleResult.corrected;
      correctedDescription = descResult.corrected;
      correctedRecommendedUpdate = recUpdateResult.corrected;
      nameWasCorrected =
        titleResult.wasModified ||
        descResult.wasModified ||
        recUpdateResult.wasModified;

      if (!nameWasCorrected) {
        // Pattern matching didn't find the name - schedule AI correction as fallback
        await ctx.scheduler.runAfter(
          0,
          internal.actions.voiceNotes.correctInsightPlayerName,
          {
            noteId: args.noteId,
            insightId: args.insightId,
            wrongName: originalPlayerName,
            correctName: playerName,
            originalTitle: insight.title,
            originalDescription: insight.description,
            originalRecommendedUpdate: insight.recommendedUpdate,
          }
        );
      }
    }

    // Update the insight with the assigned player and corrected text (including recommendedUpdate)
    const updatedInsights = note.insights.map((i) => {
      if (i.id === args.insightId) {
        return {
          ...i,
          playerIdentityId: args.playerIdentityId,
          playerName,
          title: correctedTitle,
          description: correctedDescription,
          recommendedUpdate: correctedRecommendedUpdate,
        };
      }
      return i;
    });

    await ctx.db.patch(args.noteId, {
      insights: updatedInsights,
    });

    // Schedule parent summary generation for this insight now that it has a player
    await ctx.scheduler.runAfter(
      0,
      internal.actions.coachParentSummaries.processVoiceNoteInsight,
      {
        voiceNoteId: args.noteId,
        insightId: args.insightId,
        insightTitle: correctedTitle,
        insightDescription: correctedDescription,
        playerIdentityId: args.playerIdentityId,
        organizationId: note.orgId,
        coachId: note.coachId,
      }
    );

    // Phase 7.3: Update voiceNoteInsights table and re-check auto-apply eligibility
    // Now that we have a player assigned, the insight might be eligible for auto-apply
    const voiceNoteInsight = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_voice_note_and_insight", (q) =>
        q.eq("voiceNoteId", args.noteId).eq("insightId", args.insightId)
      )
      .first();

    if (voiceNoteInsight && voiceNoteInsight.status === "pending") {
      // Update the voiceNoteInsights record with new player info
      await ctx.db.patch(voiceNoteInsight._id, {
        playerIdentityId: args.playerIdentityId,
        playerName,
        title: correctedTitle,
        description: correctedDescription,
        recommendedUpdate: correctedRecommendedUpdate,
        // AI Accuracy Tracking (Phase 7.3): Track that coach had to assign/correct player
        wasManuallyCorrected: true,
        manuallyCorrectedAt: Date.now(),
        correctionType: "player_assigned",
        updatedAt: Date.now(),
      });

      // Re-check auto-apply eligibility via action
      await ctx.scheduler.runAfter(
        0,
        internal.actions.voiceNotes.recheckAutoApply,
        {
          voiceNoteInsightId: voiceNoteInsight._id,
        }
      );
    }

    return { success: true, playerName, nameWasCorrected };
  },
});

/**
 * Delete a voice note
 */
export const deleteVoiceNote = mutation({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (note?.audioStorageId) {
      await ctx.storage.delete(note.audioStorageId);
    }
    await ctx.db.delete(args.noteId);
    return null;
  },
});

// ============ INTERNAL QUERIES ============

/**
 * Get a note by ID (for internal use by actions)
 */
export const getNote = internalQuery({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("voiceNotes"),
      _creationTime: v.number(),
      orgId: v.string(),
      coachId: v.optional(v.string()),
      date: v.string(),
      type: noteTypeValidator,
      audioStorageId: v.optional(v.id("_storage")),
      transcription: v.optional(v.string()),
      transcriptionStatus: v.optional(statusValidator),
      transcriptionError: v.optional(v.string()),
      summary: v.optional(v.string()),
      insights: v.array(insightValidator),
      insightsStatus: v.optional(statusValidator),
      insightsError: v.optional(v.string()),
      source: sourceValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => await ctx.db.get(args.noteId),
});

/**
 * Get insights for a specific voice note from voiceNoteInsights table
 * Used by buildInsights action for auto-apply triggering (Phase 7.3)
 */
export const getInsightsForNote = internalQuery({
  args: {
    noteId: v.id("voiceNotes"),
  },
  returns: v.array(
    v.object({
      _id: v.id("voiceNoteInsights"),
      _creationTime: v.number(),
      voiceNoteId: v.id("voiceNotes"),
      insightId: v.string(),
      title: v.string(),
      description: v.string(),
      category: v.string(),
      recommendedUpdate: v.optional(v.string()),
      playerIdentityId: v.optional(v.id("playerIdentities")),
      playerName: v.optional(v.string()),
      teamId: v.optional(v.string()),
      teamName: v.optional(v.string()),
      assigneeUserId: v.optional(v.string()),
      assigneeName: v.optional(v.string()),
      confidenceScore: v.number(),
      wouldAutoApply: v.boolean(),
      status: v.union(
        v.literal("pending"),
        v.literal("applied"),
        v.literal("dismissed"),
        v.literal("auto_applied")
      ),
      appliedAt: v.optional(v.number()),
      appliedBy: v.optional(v.string()),
      dismissedAt: v.optional(v.number()),
      dismissedBy: v.optional(v.string()),
      organizationId: v.string(),
      coachId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_voice_note", (q) => q.eq("voiceNoteId", args.noteId))
      .collect();
    return insights;
  },
});

/**
 * Get a single insight by ID from voiceNoteInsights table
 * Used by recheckAutoApply action (Phase 7.3 re-check after manual corrections)
 */
export const getInsightById = internalQuery({
  args: {
    insightId: v.id("voiceNoteInsights"),
  },
  returns: v.union(
    v.object({
      _id: v.id("voiceNoteInsights"),
      _creationTime: v.number(),
      voiceNoteId: v.id("voiceNotes"),
      insightId: v.string(),
      title: v.string(),
      description: v.string(),
      category: v.string(),
      recommendedUpdate: v.optional(v.string()),
      playerIdentityId: v.optional(v.id("playerIdentities")),
      playerName: v.optional(v.string()),
      teamId: v.optional(v.string()),
      teamName: v.optional(v.string()),
      assigneeUserId: v.optional(v.string()),
      assigneeName: v.optional(v.string()),
      confidenceScore: v.number(),
      wouldAutoApply: v.boolean(),
      status: v.union(
        v.literal("pending"),
        v.literal("applied"),
        v.literal("dismissed"),
        v.literal("auto_applied")
      ),
      appliedAt: v.optional(v.number()),
      appliedBy: v.optional(v.string()),
      dismissedAt: v.optional(v.number()),
      dismissedBy: v.optional(v.string()),
      organizationId: v.string(),
      coachId: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => await ctx.db.get(args.insightId),
});

/**
 * Get comprehensive coaching impact summary for "My Impact" dashboard
 * Phase 8: Coach Impact Visibility
 *
 * Aggregates data from 6 tables:
 * - voiceNotes: Count notes created
 * - voiceNoteInsights: Count applied/dismissed insights
 * - coachParentSummaries: Count sent/viewed/acknowledged summaries
 * - autoAppliedInsights: Get skill changes with targetRecordId
 * - teamObservations: Get team-level insights (via category filter)
 * - Parent engagement stats
 */
export const getCoachImpactSummary = query({
  args: {
    coachId: v.string(),
    organizationId: v.string(),
    dateRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
  },
  returns: v.object({
    // Summary metrics
    voiceNotesCreated: v.number(),
    insightsApplied: v.number(),
    insightsDismissed: v.number(),
    summariesSent: v.number(),
    summariesViewed: v.number(),
    summariesAcknowledged: v.number(),
    parentViewRate: v.number(),

    // Detailed arrays
    skillChanges: v.array(
      v.object({
        insightId: v.id("autoAppliedInsights"), // Unique ID for React keys
        playerName: v.string(),
        playerIdentityId: v.id("playerIdentities"),
        description: v.string(),
        appliedAt: v.number(),
        voiceNoteId: v.id("voiceNotes"),
        voiceNoteTitle: v.string(),
        targetRecordId: v.string(),
      })
    ),
    injuriesRecorded: v.array(
      v.object({
        playerName: v.string(),
        playerIdentityId: v.id("playerIdentities"),
        category: v.string(),
        description: v.string(),
        recordedAt: v.number(),
        voiceNoteId: v.id("voiceNotes"),
        insightId: v.string(),
      })
    ),
    recentSummaries: v.array(
      v.object({
        summaryId: v.id("coachParentSummaries"),
        playerName: v.string(),
        summaryPreview: v.string(),
        sentAt: v.number(),
        viewedAt: v.optional(v.number()),
        acknowledgedAt: v.optional(v.number()),
      })
    ),
    teamObservations: v.array(
      v.object({
        observationId: v.string(),
        teamName: v.optional(v.string()),
        teamId: v.optional(v.string()),
        title: v.string(),
        description: v.string(),
        appliedAt: v.number(),
        voiceNoteId: v.id("voiceNotes"),
      })
    ),
    parentEngagement: v.array(
      v.object({
        playerName: v.string(),
        playerIdentityId: v.id("playerIdentities"),
        summariesSent: v.number(),
        summariesViewed: v.number(),
        viewRate: v.number(),
        lastViewedAt: v.optional(v.number()),
      })
    ),
    weeklyTrends: v.array(
      v.object({
        week: v.string(),
        sent: v.number(),
        viewed: v.number(),
      })
    ),
    previousPeriodStats: v.optional(
      v.object({
        voiceNotesCreated: v.number(),
        insightsApplied: v.number(),
        summariesSent: v.number(),
        parentViewRate: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const { coachId, organizationId, dateRange } = args;

    // 1. Count voice notes created in date range
    const allVoiceNotes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId_and_coachId", (q) =>
        q.eq("orgId", organizationId).eq("coachId", coachId)
      )
      .collect();

    const voiceNotesInRange = allVoiceNotes.filter(
      (note) =>
        note._creationTime >= dateRange.start &&
        note._creationTime <= dateRange.end
    );
    const voiceNotesCreated = voiceNotesInRange.length;

    // 2. Get insights (applied and dismissed)
    const allInsights = await ctx.db
      .query("voiceNoteInsights")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", coachId).eq("organizationId", organizationId)
      )
      .collect();

    const insightsInRange = allInsights.filter(
      (insight) =>
        insight.createdAt >= dateRange.start &&
        insight.createdAt <= dateRange.end
    );

    const insightsApplied = insightsInRange.filter(
      (insight) =>
        insight.status === "applied" || insight.status === "auto_applied"
    ).length;

    const insightsDismissed = insightsInRange.filter(
      (insight) => insight.status === "dismissed"
    ).length;

    // 3. Get parent summaries (sent, viewed, acknowledged)
    const allSummaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_coach_org_status", (q) =>
        q
          .eq("coachId", coachId)
          .eq("organizationId", organizationId)
          .eq("status", "delivered")
      )
      .collect();

    const summariesInRange = allSummaries.filter(
      (summary) =>
        summary.deliveredAt &&
        summary.deliveredAt >= dateRange.start &&
        summary.deliveredAt <= dateRange.end
    );

    const summariesSent = summariesInRange.length;
    const summariesViewed = summariesInRange.filter((s) => s.viewedAt).length;
    const summariesAcknowledged = summariesInRange.filter(
      (s) => s.acknowledgedAt
    ).length;
    const parentViewRate =
      summariesSent === 0 ? 0 : (summariesViewed / summariesSent) * 100;

    // 4. Get skill changes from autoAppliedInsights
    const allAutoAppliedInsights = await ctx.db
      .query("autoAppliedInsights")
      .withIndex("by_coach_org", (q) =>
        q.eq("coachId", coachId).eq("organizationId", organizationId)
      )
      .collect();

    const autoAppliedInRange = allAutoAppliedInsights.filter(
      (insight) =>
        insight.appliedAt >= dateRange.start &&
        insight.appliedAt <= dateRange.end &&
        !insight.undoneAt
    );

    // Build skill changes array with player names and voice note titles
    const skillChanges = await Promise.all(
      autoAppliedInRange
        .filter((insight) => insight.changeType === "skill_rating")
        .slice(0, 20) // Limit to 20 most recent
        .map(async (insight) => {
          const voiceNote = await ctx.db.get(insight.voiceNoteId);
          const playerIdentity = await ctx.db.get(insight.playerIdentityId);

          // Parse previous and new values to create description
          // Handle "none" case which is not valid JSON
          const prevValue =
            insight.previousValue === "none" || !insight.previousValue
              ? {}
              : JSON.parse(insight.previousValue);
          const newValue =
            insight.newValue === "none" || !insight.newValue
              ? {}
              : JSON.parse(insight.newValue);
          const skillName = newValue.skillName || "Unknown Skill";
          const description = `${skillName}: ${prevValue.rating || "?"} → ${newValue.rating || "?"}`;

          return {
            insightId: insight._id, // Unique ID for React keys
            playerName:
              playerIdentity?.firstName && playerIdentity?.lastName
                ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
                : "Unknown Player",
            playerIdentityId: insight.playerIdentityId,
            description,
            appliedAt: insight.appliedAt,
            voiceNoteId: insight.voiceNoteId,
            voiceNoteTitle:
              voiceNote?.summary?.substring(0, 50) || "Voice Note",
            targetRecordId: insight.targetRecordId || "", // Provide empty string as fallback
          };
        })
    );

    // 5. Get injury insights (from voiceNoteInsights with category "injury")
    const injuryInsights = insightsInRange.filter(
      (insight) =>
        insight.category === "injury" || insight.category === "medical"
    );

    const injuriesRecorded = injuryInsights.slice(0, 20).map((insight) => ({
      playerName: insight.playerName || "Unknown Player",
      playerIdentityId: insight.playerIdentityId as Id<"playerIdentities">,
      category: insight.category,
      description: insight.description,
      recordedAt: insight.createdAt,
      voiceNoteId: insight.voiceNoteId,
      insightId: insight.insightId,
    }));

    // 6. Get team observations (insights with category "team" or teamId but no playerIdentityId)
    const teamObservationInsights = insightsInRange.filter(
      (insight) => insight.teamId && !insight.playerIdentityId
    );

    const teamObservations = teamObservationInsights
      .slice(0, 20)
      .map((insight) => ({
        observationId: insight.insightId,
        teamName: insight.teamName,
        teamId: insight.teamId,
        title: insight.title,
        description: insight.description,
        appliedAt: insight.createdAt,
        voiceNoteId: insight.voiceNoteId,
      }));

    // 7. Recent summaries (last 10)
    const recentSummariesWithPlayers = await Promise.all(
      summariesInRange
        .sort((a, b) => (b.deliveredAt || 0) - (a.deliveredAt || 0))
        .slice(0, 10)
        .map(async (summary) => {
          const playerIdentity = await ctx.db.get(summary.playerIdentityId);
          return {
            summaryId: summary._id,
            playerName:
              playerIdentity?.firstName && playerIdentity?.lastName
                ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
                : "Unknown Player",
            summaryPreview:
              summary.publicSummary.content.substring(0, 100) || "",
            sentAt: summary.deliveredAt || 0,
            viewedAt: summary.viewedAt,
            acknowledgedAt: summary.acknowledgedAt,
          };
        })
    );
    const recentSummaries = recentSummariesWithPlayers;

    // 8. Parent engagement (per-player stats)
    const playerEngagementMap = new Map<
      string,
      {
        playerName: string;
        playerIdentityId: Id<"playerIdentities">;
        sent: number;
        viewed: number;
        lastViewedAt?: number;
      }
    >();

    for (const summary of summariesInRange) {
      const key = summary.playerIdentityId;

      if (!playerEngagementMap.has(key)) {
        // Fetch player identity to get name
        const playerIdentity = await ctx.db.get(summary.playerIdentityId);
        playerEngagementMap.set(key, {
          playerName:
            playerIdentity?.firstName && playerIdentity?.lastName
              ? `${playerIdentity.firstName} ${playerIdentity.lastName}`
              : "Unknown Player",
          playerIdentityId: summary.playerIdentityId,
          sent: 0,
          viewed: 0,
          lastViewedAt: undefined,
        });
      }

      const existing = playerEngagementMap.get(key);
      if (existing) {
        existing.sent += 1;
        if (summary.viewedAt) {
          existing.viewed += 1;
          if (
            !existing.lastViewedAt ||
            summary.viewedAt > existing.lastViewedAt
          ) {
            existing.lastViewedAt = summary.viewedAt;
          }
        }

        playerEngagementMap.set(key, existing);
      }
    }

    const parentEngagement = Array.from(playerEngagementMap.values()).map(
      (stats) => ({
        playerName: stats.playerName,
        playerIdentityId: stats.playerIdentityId,
        summariesSent: stats.sent,
        summariesViewed: stats.viewed,
        viewRate: stats.sent === 0 ? 0 : (stats.viewed / stats.sent) * 100,
        lastViewedAt: stats.lastViewedAt,
      })
    );

    // 9. Weekly trends (last 4 weeks of sent/viewed data)
    const weeklyTrends: Array<{ week: string; sent: number; viewed: number }> =
      [];
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    for (let i = 3; i >= 0; i--) {
      const weekStart = now - (i + 1) * oneWeek;
      const weekEnd = now - i * oneWeek;

      const weekSummaries = allSummaries.filter(
        (s) =>
          s.deliveredAt && s.deliveredAt >= weekStart && s.deliveredAt < weekEnd
      );

      weeklyTrends.push({
        week: `Week ${4 - i}`,
        sent: weekSummaries.length,
        viewed: weekSummaries.filter((s) => s.viewedAt).length,
      });
    }

    // 10. Previous period stats for comparison (US-P8-019)
    const rangeDuration = dateRange.end - dateRange.start;
    const previousPeriodStart = dateRange.start - rangeDuration;
    const previousPeriodEnd = dateRange.start;

    const previousVoiceNotes = allVoiceNotes.filter(
      (note) =>
        note._creationTime >= previousPeriodStart &&
        note._creationTime < previousPeriodEnd
    );

    const previousInsights = allInsights.filter(
      (insight) =>
        insight._creationTime >= previousPeriodStart &&
        insight._creationTime < previousPeriodEnd
    );

    const previousApplied = previousInsights.filter(
      (i) => i.status === "applied"
    ).length;

    const previousSummaries = allSummaries.filter(
      (s) =>
        s.deliveredAt &&
        s.deliveredAt >= previousPeriodStart &&
        s.deliveredAt < previousPeriodEnd
    );

    const previousViewed = previousSummaries.filter((s) => s.viewedAt).length;
    const previousViewRate =
      previousSummaries.length === 0
        ? 0
        : (previousViewed / previousSummaries.length) * 100;

    const previousPeriodStats = {
      voiceNotesCreated: previousVoiceNotes.length,
      insightsApplied: previousApplied,
      summariesSent: previousSummaries.length,
      parentViewRate: previousViewRate,
    };

    return {
      voiceNotesCreated,
      insightsApplied,
      insightsDismissed,
      summariesSent,
      summariesViewed,
      summariesAcknowledged,
      parentViewRate,
      skillChanges,
      injuriesRecorded,
      recentSummaries,
      teamObservations,
      parentEngagement,
      weeklyTrends,
      previousPeriodStats,
    };
  },
});

// ============ INTERNAL MUTATIONS ============

/**
 * Update transcription status and content
 */
export const updateTranscription = internalMutation({
  args: {
    noteId: v.id("voiceNotes"),
    transcription: v.optional(v.string()),
    status: statusValidator,
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      transcriptionStatus: args.status,
    };

    if (args.transcription !== undefined) {
      updates.transcription = args.transcription;
    }

    if (args.error !== undefined) {
      updates.transcriptionError = args.error;
    }

    await ctx.db.patch(args.noteId, updates);
    return null;
  },
});

/**
 * Update insights status and content
 */
export const updateInsights = internalMutation({
  args: {
    noteId: v.id("voiceNotes"),
    summary: v.optional(v.string()),
    insights: v.optional(v.array(insightValidator)),
    status: statusValidator,
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      insightsStatus: args.status,
    };

    if (args.summary !== undefined) {
      updates.summary = args.summary;
    }

    if (args.insights !== undefined) {
      updates.insights = args.insights;
    }

    if (args.error !== undefined) {
      updates.insightsError = args.error;
    }

    await ctx.db.patch(args.noteId, updates);

    // Phase 7: Also create records in voiceNoteInsights table for auto-apply
    if (args.insights !== undefined && args.status === "completed") {
      console.log(
        `[updateInsights] 🔵 Phase 7: Creating voiceNoteInsights records for ${args.insights.length} insights`
      );
      const note = await ctx.db.get(args.noteId);
      if (!note) {
        console.error("[updateInsights] ❌ Note not found:", args.noteId);
        return null;
      }

      // Create voiceNoteInsights records for each insight
      for (const insight of args.insights) {
        try {
          const insightId = await ctx.db.insert("voiceNoteInsights", {
            voiceNoteId: args.noteId,
            insightId: insight.id,
            title: insight.title,
            description: insight.description,
            category: insight.category ?? "",
            recommendedUpdate: insight.recommendedUpdate,
            playerIdentityId: insight.playerIdentityId,
            playerName: insight.playerName,
            teamId: insight.teamId,
            teamName: insight.teamName,
            assigneeUserId: insight.assigneeUserId,
            assigneeName: insight.assigneeName,
            confidenceScore: insight.confidence ?? 0.7,
            wouldAutoApply: false, // Will be calculated by frontend query
            status: "pending",
            organizationId: note.orgId,
            coachId: note.coachId || "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          console.log(
            `[updateInsights] ✅ Created voiceNoteInsights record ${insightId} for insight ${insight.id}`
          );
        } catch (error) {
          console.error(
            `[updateInsights] ❌ Failed to create voiceNoteInsights record for insight ${insight.id}:`,
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }
      console.log(
        "[updateInsights] 🟢 Finished creating voiceNoteInsights records"
      );
    }

    return null;
  },
});
