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
  status: v.union(
    v.literal("pending"),
    v.literal("applied"),
    v.literal("dismissed")
  ),
  appliedDate: v.optional(v.string()),
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
    })
  ),
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("voiceNotes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(1000);

    return notes;
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

    // Enrich with coach info
    const notesWithCoachInfo = await Promise.all(
      playerNotes.map(async (note) => {
        let coachName = "Unknown Coach";

        if (note.coachId) {
          // Query user from Better Auth component
          const coachResult = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: "user",
              where: [
                {
                  field: "userId",
                  value: note.coachId,
                  operator: "eq",
                },
              ],
            }
          );

          if (coachResult) {
            const coach = coachResult as {
              firstName?: string;
              lastName?: string;
            };
            if (coach.firstName || coach.lastName) {
              coachName =
                `${coach.firstName || ""} ${coach.lastName || ""}`.trim();
            }
          }
        }

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
      })
    );

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
  },
  returns: v.id("voiceNotes"),
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      orgId: args.orgId,
      coachId: args.coachId,
      date: new Date().toISOString(),
      type: args.noteType,
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
  },
  returns: v.id("voiceNotes"),
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("voiceNotes", {
      orgId: args.orgId,
      coachId: args.coachId,
      date: new Date().toISOString(),
      type: args.noteType,
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
    } else if (args.status === "applied" && !insight.playerIdentityId) {
      // This is a team-level insight (no player linked)
      // Create a record in teamObservations table
      const category = insight.category?.toLowerCase() || "team_culture";
      const now = Date.now();

      // Check if insight has teamId (from AI auto-assignment)
      const targetTeamId = (insight as any).teamId;
      const targetTeamName = (insight as any).teamName;

      if (targetTeamId && targetTeamName) {
        // Create team observation record
        const observationId = await ctx.db.insert("teamObservations", {
          organizationId: note.orgId,
          teamId: targetTeamId,
          teamName: targetTeamName,
          source: "voice_note",
          voiceNoteId: args.noteId,
          insightId: args.insightId,
          coachId: note.coachId,
          coachName: "Coach", // TODO: Get coach name from Better Auth
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

      if (nameWasCorrected) {
        console.log(
          `[Player Assignment] Pattern-corrected name "${originalPlayerName}" -> "${playerName}" in insight`
        );
        console.log(`  Title: "${insight.title}" -> "${correctedTitle}"`);
        if (descResult.wasModified) {
          console.log("  Description also corrected");
        }
        if (recUpdateResult.wasModified) {
          console.log("  RecommendedUpdate also corrected");
        }
      } else {
        // Pattern matching didn't find the name - schedule AI correction as fallback
        console.log(
          `[Player Assignment] Pattern matching didn't find "${originalPlayerName}" in text. Scheduling AI correction.`
        );
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
    console.log(
      `[Player Assignment] Coach assigned "${playerName}" to insight: "${correctedTitle}". Scheduling parent summary.`
    );
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => await ctx.db.get(args.noteId),
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
    return null;
  },
});
