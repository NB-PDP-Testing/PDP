import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Simple todos (existing)
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),

  // Players table
  players: defineTable({
    name: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
    gender: v.string(),
    teamId: v.string(), // References Better Auth team
    organizationId: v.string(), // References Better Auth organization
    completionDate: v.optional(v.string()),
    season: v.string(),

    // Review tracking
    reviewedWith: v.optional(
      v.object({
        coach: v.boolean(),
        parent: v.boolean(),
        player: v.boolean(),
        forum: v.boolean(),
      })
    ),
    reviewStatus: v.optional(
      v.union(
        v.literal("Not Started"),
        v.literal("Completed"),
        v.literal("Overdue"),
        v.literal("Due Soon")
      )
    ),
    lastReviewDate: v.optional(v.union(v.string(), v.null())),
    nextReviewDue: v.optional(v.union(v.string(), v.null())),

    // Attendance
    attendance: v.optional(
      v.object({
        training: v.string(),
        matches: v.string(),
      })
    ),

    // Skills - stored as JSON string for flexibility across sports
    skills: v.optional(v.string()),

    // Positions
    positions: v.optional(
      v.object({
        favourite: v.string(),
        leastFavourite: v.string(),
        coachesPref: v.string(),
        dominantSide: v.string(),
        goalkeeper: v.string(),
      })
    ),

    // Fitness
    fitness: v.optional(
      v.object({
        pushPull: v.string(),
        core: v.string(),
        endurance: v.string(),
        speed: v.string(),
        broncoBeep: v.string(),
      })
    ),

    // Notes
    injuryNotes: v.optional(v.string()),
    otherInterests: v.optional(v.string()),
    communications: v.optional(v.string()),
    actions: v.optional(v.string()),
    coachNotes: v.optional(v.string()),
    parentNotes: v.optional(v.string()),
    playerNotes: v.optional(v.string()),
    seasonReviews: v.optional(v.array(v.any())),
    createdFrom: v.optional(v.string()),

    // Family/Contact info
    familyId: v.optional(v.string()),
    parentFirstName: v.optional(v.string()),
    parentSurname: v.optional(v.string()),
    parentEmail: v.optional(v.string()),
    parentEmails: v.optional(v.array(v.string())),
    parentPhone: v.optional(v.string()),

    // Full parent/guardian profiles
    parents: v.optional(
      v.array(
        v.object({
          id: v.string(),
          firstName: v.string(),
          surname: v.string(),
          email: v.string(),
          phone: v.optional(v.string()),
          relationship: v.optional(v.string()),
          isPrimary: v.optional(v.boolean()),
        })
      )
    ),

    dateOfBirth: v.optional(v.string()),
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),

    // Inferred parent data from membership imports
    inferredParentFirstName: v.optional(v.string()),
    inferredParentSurname: v.optional(v.string()),
    inferredParentEmail: v.optional(v.string()),
    inferredParentPhone: v.optional(v.string()),
    inferredFromSource: v.optional(v.string()),
  })
    .index("by_teamId", ["teamId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_sport", ["sport"])
    .index("by_ageGroup", ["ageGroup"])
    .index("by_familyId", ["familyId"])
    .index("by_parentEmail", ["parentEmail"])
    .index("by_inferredParentEmail", ["inferredParentEmail"])
    .searchIndex("name_search", { searchField: "name" })
    .searchIndex("address_search", { searchField: "address" }),

  // Injuries table
  injuries: defineTable({
    playerId: v.id("players"),
    injuryType: v.string(),
    bodyPart: v.string(),
    dateOccurred: v.string(),
    dateReported: v.string(),
    severity: v.union(
      v.literal("Minor"),
      v.literal("Moderate"),
      v.literal("Severe")
    ),
    status: v.union(
      v.literal("Active"),
      v.literal("Recovering"),
      v.literal("Healed")
    ),
    description: v.string(),
    treatment: v.string(),
    expectedReturn: v.optional(v.string()),
    actualReturn: v.optional(v.string()),
    daysOut: v.number(),
    returnToPlayProtocol: v.array(
      v.object({
        id: v.string(),
        description: v.string(),
        completed: v.boolean(),
        completedDate: v.optional(v.string()),
      })
    ),
    coachNotes: v.array(
      v.object({
        date: v.string(),
        note: v.string(),
      })
    ),
    relatedToTraining: v.boolean(),
    relatedToMatch: v.boolean(),
  })
    .index("by_playerId", ["playerId"])
    .index("by_status", ["status"])
    .index("by_severity", ["severity"]),

  // Development Goals table
  developmentGoals: defineTable({
    playerId: v.id("players"),
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("Technical"),
      v.literal("Physical"),
      v.literal("Mental"),
      v.literal("Team")
    ),
    priority: v.union(v.literal("High"), v.literal("Medium"), v.literal("Low")),
    status: v.union(
      v.literal("Not Started"),
      v.literal("In Progress"),
      v.literal("Completed"),
      v.literal("On Hold")
    ),
    progress: v.number(),
    targetDate: v.string(),
    createdDate: v.string(),
    completedDate: v.optional(v.string()),
    linkedSkills: v.array(v.string()),
    milestones: v.array(
      v.object({
        id: v.string(),
        description: v.string(),
        completed: v.boolean(),
        completedDate: v.optional(v.string()),
      })
    ),
    parentActions: v.array(v.string()),
    coachNotes: v.array(
      v.object({
        date: v.string(),
        note: v.string(),
      })
    ),
    playerNotes: v.array(
      v.object({
        date: v.string(),
        note: v.string(),
      })
    ),
  })
    .index("by_playerId", ["playerId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // Voice Notes table
  voiceNotes: defineTable({
    teamId: v.string(), // Better Auth team ID
    coachId: v.string(), // Better Auth user ID
    organizationId: v.string(), // Better Auth organization ID
    date: v.string(),
    type: v.union(
      v.literal("training"),
      v.literal("match"),
      v.literal("general")
    ),

    // Audio storage
    audioFileId: v.optional(v.id("_storage")),
    duration: v.optional(v.number()),

    // Transcription
    transcription: v.string(),
    transcriptionSource: v.optional(v.string()),
    transcriptionConfidence: v.optional(v.number()),

    // Processing status
    processed: v.boolean(),
    processingError: v.optional(v.string()),

    // Insights
    insights: v.array(
      v.object({
        id: v.string(),
        type: v.union(
          v.literal("goal_progress"),
          v.literal("skill_update"),
          v.literal("injury"),
          v.literal("attendance"),
          v.literal("behavior"),
          v.literal("performance"),
          v.literal("team_insight")
        ),
        playerIds: v.array(v.string()),
        description: v.string(),
        confidence: v.number(),
        suggestedAction: v.string(),
        metadata: v.any(),
        status: v.union(
          v.literal("pending"),
          v.literal("applied"),
          v.literal("dismissed")
        ),
        appliedDate: v.optional(v.string()),
        editedDescription: v.optional(v.string()),
        source: v.optional(v.string()),
      })
    ),

    createdAt: v.optional(v.number()),
  })
    .index("by_date", ["date"])
    .index("by_type", ["type"])
    .index("by_teamId", ["teamId"])
    .index("by_coachId", ["coachId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_processed", ["processed"]),

  // Coach Insight Preferences
  coachInsightPreferences: defineTable({
    coachId: v.string(), // Better Auth user ID

    // Auto-approval settings
    autoApproveEnabled: v.boolean(),
    autoApproveThreshold: v.number(),

    // Preferred insight style
    preferredStyle: v.string(),

    // Statistics for learning
    totalInsights: v.number(),
    approvedCount: v.number(),
    rejectedCount: v.number(),
    editedCount: v.number(),

    // Common edit patterns (for AI learning)
    commonEdits: v.array(
      v.object({
        original: v.string(),
        edited: v.string(),
        count: v.number(),
      })
    ),

    updatedAt: v.number(),
  }).index("by_coachId", ["coachId"]),

  // Team Development Goals table
  teamGoals: defineTable({
    teamId: v.string(), // Better Auth team ID
    organizationId: v.string(), // Better Auth organization ID
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("Technical"),
      v.literal("Tactical"),
      v.literal("Physical"),
      v.literal("Mental"),
      v.literal("Team Culture")
    ),
    priority: v.union(v.literal("High"), v.literal("Medium"), v.literal("Low")),
    status: v.union(
      v.literal("Not Started"),
      v.literal("In Progress"),
      v.literal("Completed"),
      v.literal("On Hold")
    ),
    progress: v.number(),
    targetDate: v.string(),
    createdDate: v.string(),
    completedDate: v.optional(v.string()),
    linkedInsightIds: v.optional(v.array(v.string())),
    coachNotes: v.array(
      v.object({
        date: v.string(),
        note: v.string(),
        coachId: v.optional(v.string()),
      })
    ),
  })
    .index("by_teamId", ["teamId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  // Medical Profiles table
  medicalProfiles: defineTable({
    playerId: v.id("players"),
    bloodType: v.optional(v.string()),
    allergies: v.array(v.string()),
    medications: v.array(v.string()),
    conditions: v.array(v.string()),
    doctorName: v.optional(v.string()),
    doctorPhone: v.optional(v.string()),
    emergencyContact1Name: v.string(),
    emergencyContact1Phone: v.string(),
    emergencyContact2Name: v.optional(v.string()),
    emergencyContact2Phone: v.optional(v.string()),
    lastMedicalCheck: v.optional(v.string()),
    insuranceCovered: v.boolean(),
    notes: v.optional(v.string()),
  }).index("by_playerId", ["playerId"]),

  // Approval Actions Audit Trail
  approvalActions: defineTable({
    // Who was approved/rejected
    userId: v.string(), // Better Auth user ID
    userEmail: v.string(),
    userName: v.string(),
    userRole: v.string(),

    // Who performed the action
    adminId: v.string(), // Better Auth user ID of admin
    adminName: v.string(),

    // Action details
    action: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("unrejected")
    ),
    timestamp: v.number(),

    // For rejections
    rejectionReason: v.optional(v.string()),

    // For coach approvals
    teamsAssigned: v.optional(v.array(v.string())),

    // For parent approvals
    playersLinked: v.optional(
      v.array(
        v.object({
          playerId: v.id("players"),
          playerName: v.string(),
          teamId: v.string(),
          ageGroup: v.string(),
        })
      )
    ),

    organizationId: v.string(), // Better Auth organization ID
  })
    .index("by_userId", ["userId"])
    .index("by_adminId", ["adminId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"])
    .index("by_organizationId", ["organizationId"]),
});
