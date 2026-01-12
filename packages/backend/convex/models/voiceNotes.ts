import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

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

// ============ MUTATIONS ============

/**
 * Create a typed voice note (no audio, just text)
 * Schedules AI insights extraction immediately
 */
export const createTypedNote = mutation({
  args: {
    orgId: v.string(),
    coachId: v.optional(v.string()),
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
    coachId: v.optional(v.string()),
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
      const category = insight.category?.toLowerCase() || "";
      const now = Date.now();
      const today = new Date().toISOString().split("T")[0];

      // Get the player identity
      const playerIdentity = await ctx.db.get(insight.playerIdentityId);
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
                q.eq("playerIdentityId", insight.playerIdentityId!)
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

              // Patterns to match: "Rating: 4", "set to 3", "to three", "improved to 4/5", "level 3"
              const patterns = [
                /(?:rating[:\s]*|set\s+to\s+|update\s+to\s+|improved?\s+to\s+|now\s+at\s+|level\s+|to\s+)(\d)(?:\/5)?/i,
                /(?:rating[:\s]*|set\s+to\s+|update\s+to\s+|improved?\s+to\s+|now\s+at\s+|level\s+|to\s+)(one|two|three|four|five)(?:\/5)?/i,
              ];

              let newRating: number | null = null;

              // Check description first
              for (const pattern of patterns) {
                const match =
                  insight.description.match(pattern) ||
                  insight.recommendedUpdate?.match(pattern);
                if (match) {
                  const val = match[1].toLowerCase();
                  newRating = wordToNum[val] || Number.parseInt(val) || null;
                  if (newRating) break;
                }
              }

              // Try to extract skill name from title
              const skillName = insight.title
                .replace(/skill\s*(rating|assessment|update)?:?\s*/i, "")
                .trim();

              if (newRating && newRating >= 1 && newRating <= 5) {
                // Create skill assessment record
                const assessmentId = await ctx.db.insert("skillAssessments", {
                  passportId: passport._id,
                  playerIdentityId: insight.playerIdentityId,
                  sportCode: passport.sportCode,
                  skillCode: skillName.toLowerCase().replace(/\s+/g, "_"),
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
                q.eq("playerIdentityId", insight.playerIdentityId!)
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

              const patterns = [
                /(?:rating[:\s]*|set\s+to\s+|update\s+to\s+|improved?\s+to\s+|now\s+at\s+|level\s+|to\s+)(\d)(?:\/5)?/i,
                /(?:rating[:\s]*|set\s+to\s+|update\s+to\s+|improved?\s+to\s+|now\s+at\s+|level\s+|to\s+)(one|two|three|four|five)(?:\/5)?/i,
              ];

              let foundRating: number | null = null;
              const textToSearch = `${insight.description} ${insight.recommendedUpdate || ""} ${insight.title}`;

              for (const pattern of patterns) {
                const match = textToSearch.match(pattern);
                if (match) {
                  const val = match[1].toLowerCase();
                  foundRating = wordToNum[val] || Number.parseInt(val) || null;
                  if (foundRating) break;
                }
              }

              if (foundRating && foundRating >= 1 && foundRating <= 5) {
                // There's a rating - create skill assessment instead of goal
                const skillName = insight.title
                  .replace(
                    /skill\s*(rating|assessment|update|progress|improved?)?:?\s*/i,
                    ""
                  )
                  .trim();

                const assessmentId = await ctx.db.insert("skillAssessments", {
                  passportId: passport._id,
                  playerIdentityId: insight.playerIdentityId,
                  sportCode: passport.sportCode,
                  skillCode: skillName.toLowerCase().replace(/\s+/g, "_"),
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
                    .eq("playerIdentityId", insight.playerIdentityId!)
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

          case "behavior":
          case "performance":
          case "attitude":
          case "communication":
          case "general":
          default: {
            // Add to sport passport's coach notes (shown on player profile Development Notes)
            const passport = await ctx.db
              .query("sportPassports")
              .withIndex("by_playerIdentityId", (q) =>
                q.eq("playerIdentityId", insight.playerIdentityId!)
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
                    .eq("playerIdentityId", insight.playerIdentityId!)
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
      // Route to team notes - since there's no player, ANY category goes to team
      const category = insight.category?.toLowerCase() || "";

      // Always route to team notes when there's no player linked
      // This is simpler and more intuitive - if there's no player, it's a team note
      {
        // Try to find a team based on note type or context
        // For now, we'll use the Better Auth adapter to find teams for this org
        // and add the note to all teams (or ideally the most relevant one)

        const now = Date.now();
        const newNote = `[${new Date().toLocaleDateString()}] ${insight.title}: ${insight.description}${insight.recommendedUpdate ? ` (Recommended: ${insight.recommendedUpdate})` : ""}`;

        // Get teams for this organization using Better Auth component
        const teamsResult = await ctx.runQuery(
          components.betterAuth.adapter.findMany,
          {
            model: "team",
            paginationOpts: { cursor: null, numItems: 100 },
            where: [
              { field: "organizationId", value: note.orgId, operator: "eq" },
            ],
          }
        );

        const teams = teamsResult.page as Array<{
          _id: string;
          name: string;
          coachNotes?: string;
        }>;

        if (teams.length === 1) {
          // Only one team - add note to it
          const team = teams[0];
          const existingNotes = team.coachNotes || "";
          const updatedNotes = existingNotes
            ? `${existingNotes}\n\n${newNote}`
            : newNote;

          await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
              model: "team",
              where: [{ field: "_id", value: team._id, operator: "eq" }],
              update: {
                coachNotes: updatedNotes,
                updatedAt: now,
              },
            },
          });

          appliedTo = "team.coachNotes";
          recordId = team._id;
          message = `Team note added to ${team.name}`;
        } else if (teams.length > 1) {
          // Multiple teams - add to the first one (could be improved with team detection logic)
          const team = teams[0];
          const existingNotes = team.coachNotes || "";
          const updatedNotes = existingNotes
            ? `${existingNotes}\n\n${newNote}`
            : newNote;

          await ctx.runMutation(components.betterAuth.adapter.updateOne, {
            input: {
              model: "team",
              where: [{ field: "_id", value: team._id, operator: "eq" }],
              update: {
                coachNotes: updatedNotes,
                updatedAt: now,
              },
            },
          });

          appliedTo = "team.coachNotes";
          recordId = team._id;
          message = `Team note added to ${team.name} (${teams.length} teams available)`;
        } else {
          message = "No teams found for this organization to add the note to.";
        }
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
