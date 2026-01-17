import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================================
  // PHASE 1: FOUNDATION / REFERENCE DATA TABLES
  // These tables provide reference data for sports, age groups,
  // and skill definitions used across the platform.
  // ============================================================

  // Sports reference table
  sports: defineTable({
    code: v.string(), // "gaa_football", "soccer", "rugby"
    name: v.string(), // "GAA Football", "Soccer", "Rugby"
    governingBody: v.optional(v.string()), // "GAA", "FAI", "IRFU"
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_isActive", ["isActive"]),

  // Age group reference table
  ageGroups: defineTable({
    code: v.string(), // "u6", "u7", "u8", ... "senior"
    name: v.string(), // "Under 6", "Under 7", ... "Senior"
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    ltadStage: v.optional(v.string()), // "FUNdamentals", "Learn to Train", etc.
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_isActive", ["isActive"])
    .index("by_sortOrder", ["sortOrder"]),

  // ============================================================
  // SPORT-SPECIFIC AGE GROUP CONFIGURATION
  // Enables different sports to have different age group rules
  // and eligibility requirements with admin override capability
  // ============================================================

  // Sport-specific age group configuration
  // Allows customization of min/max ages per age group per sport
  sportAgeGroupConfig: defineTable({
    sportCode: v.string(), // FK to sports.code (e.g., "gaa_football", "soccer")
    ageGroupCode: v.string(), // FK to ageGroups.code (e.g., "u12", "u14")
    minAge: v.optional(v.number()), // Custom min age for this sport's age group
    maxAge: v.optional(v.number()), // Custom max age for this sport's age group
    description: v.optional(v.string()), // Explanation for custom age range
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sport_and_ageGroup", ["sportCode", "ageGroupCode"])
    .index("by_sport", ["sportCode"])
    .index("by_isActive", ["isActive"]),

  // Sport-specific age group eligibility rules
  // Defines which age groups players can "play up" to within each sport
  sportAgeGroupEligibilityRules: defineTable({
    sportCode: v.string(), // FK to sports.code
    fromAgeGroupCode: v.string(), // Player's age group (e.g., "u12")
    toAgeGroupCode: v.string(), // Team age group they want to join (e.g., "u14")
    isAllowed: v.boolean(), // true = player can join team
    requiresApproval: v.boolean(), // true = needs admin override even if allowed
    description: v.optional(v.string()), // Reason for the rule
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sport_and_ages", [
      "sportCode",
      "fromAgeGroupCode",
      "toAgeGroupCode",
    ])
    .index("by_sport", ["sportCode"]),

  // Per-team enforcement settings
  // Controls how strictly age eligibility is enforced for each team
  teamEligibilitySettings: defineTable({
    teamId: v.string(), // Better Auth team ID
    organizationId: v.string(),
    enforcementLevel: v.union(
      v.literal("strict"), // Hard block, requires override
      v.literal("warning"), // Shows warning, auto-logs exception
      v.literal("flexible") // No validation
    ),
    requireOverrideReason: v.boolean(), // If true, admin must provide reason
    notifyOnOverride: v.optional(v.array(v.string())), // User IDs to notify
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_org", ["organizationId"]),

  // Individual player eligibility overrides
  // Admins can grant exceptions for specific players to join specific teams
  ageGroupEligibilityOverrides: defineTable({
    playerIdentityId: v.id("playerIdentities"),
    teamId: v.string(), // Better Auth team ID
    organizationId: v.string(),
    reason: v.string(), // Why override was granted
    grantedBy: v.string(), // User ID of admin who granted
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()), // null = permanent
    isActive: v.boolean(), // false = revoked or expired
    revokedBy: v.optional(v.string()), // User ID of admin who revoked
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_player_and_team", ["playerIdentityId", "teamId"])
    .index("by_player", ["playerIdentityId"])
    .index("by_team", ["teamId"])
    .index("by_org", ["organizationId"])
    .index("by_active", ["isActive"]),

  // Skill categories (sport-specific groupings)
  skillCategories: defineTable({
    sportCode: v.string(), // FK to sports.code
    code: v.string(), // "ball_mastery", "passing", "tactical"
    name: v.string(), // "Ball Mastery", "Passing & Distribution"
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_sportCode", ["sportCode"])
    .index("by_sportCode_and_code", ["sportCode", "code"])
    .index("by_sortOrder", ["sportCode", "sortOrder"]),

  // Skill definitions (individual skills within categories)
  skillDefinitions: defineTable({
    categoryId: v.id("skillCategories"),
    sportCode: v.string(), // Denormalized for easier queries
    code: v.string(), // "solo_run", "hand_pass", "ball_control"
    name: v.string(), // "Solo Run", "Hand Pass", "Ball Control"
    description: v.optional(v.string()),
    // Level descriptors for 1-5 rating scale
    level1Descriptor: v.optional(v.string()), // "Cannot perform consistently"
    level2Descriptor: v.optional(v.string()), // "Developing, needs work"
    level3Descriptor: v.optional(v.string()), // "Competent in training"
    level4Descriptor: v.optional(v.string()), // "Proficient in matches"
    level5Descriptor: v.optional(v.string()), // "Excellent, role model"
    // Age group relevance (which age groups this skill applies to)
    ageGroupRelevance: v.optional(v.array(v.string())), // ["u8", "u9", "u10"]
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_categoryId", ["categoryId"])
    .index("by_sportCode", ["sportCode"])
    .index("by_sportCode_and_code", ["sportCode", "code"])
    .index("by_sortOrder", ["categoryId", "sortOrder"]),

  // ============================================================
  // PHASE 2: GUARDIAN IDENTITY TABLES
  // Platform-level guardian identity with org-specific profiles
  // ============================================================

  // Platform-level: Guardian identity (no orgId - exists across platform)
  guardianIdentities: defineTable({
    // Core identity
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()), // Optional - some guardians only have phone
    phone: v.optional(v.string()),

    // Address (optional)
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),

    // Linking to Better Auth (if registered)
    userId: v.optional(v.string()),

    // Verification status
    verificationStatus: v.union(
      v.literal("unverified"), // Created from import
      v.literal("email_verified"), // Email confirmed
      v.literal("id_verified") // Full identity verified
    ),

    // Preferences
    preferredContactMethod: v.optional(
      v.union(v.literal("email"), v.literal("phone"), v.literal("both"))
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdFrom: v.optional(v.string()), // "import", "registration", "manual"
  })
    .index("by_email", ["email"])
    .index("by_userId", ["userId"])
    .index("by_phone", ["phone"])
    .index("by_name", ["lastName", "firstName"]),

  // Organization-level: Guardian preferences per org
  orgGuardianProfiles: defineTable({
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(),

    // Emergency contact priority (1 = first call)
    emergencyPriority: v.optional(v.number()),

    // Communication preferences for this org
    receiveMatchUpdates: v.optional(v.boolean()),
    receiveTrainingUpdates: v.optional(v.boolean()),
    receiveNewsletters: v.optional(v.boolean()),
    preferredLanguage: v.optional(v.string()),

    // Club-specific notes (admin only)
    clubNotes: v.optional(v.string()),

    // Status
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_guardianIdentityId", ["guardianIdentityId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_guardian_and_org", ["guardianIdentityId", "organizationId"]),

  // ============================================================
  // PHASE 3: PLAYER IDENTITY TABLES
  // Platform-level player identity with guardian links and org enrollments
  // ============================================================

  // Platform-level: Player identity (no orgId - exists across platform)
  playerIdentities: defineTable({
    // Core identity
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(), // ISO format: "2015-03-20"
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),

    // Player type (youth vs adult)
    playerType: v.union(
      v.literal("youth"), // Managed by guardians
      v.literal("adult") // Self-managed
    ),

    // For adult players - direct account link
    userId: v.optional(v.string()), // Better Auth user ID
    email: v.optional(v.string()), // Direct contact (adults)
    phone: v.optional(v.string()),

    // Address (optional, usually from guardian for youth)
    address: v.optional(v.string()),
    town: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),

    // Verification
    verificationStatus: v.union(
      v.literal("unverified"), // From import
      v.literal("guardian_verified"), // Guardian confirmed
      v.literal("self_verified"), // Adult self-verified
      v.literal("document_verified") // ID document verified
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    createdFrom: v.optional(v.string()), // "import", "registration", "manual"
  })
    .index("by_name_dob", ["firstName", "lastName", "dateOfBirth"])
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_playerType", ["playerType"]),

  // Guardian-Player relationship (N:M)
  guardianPlayerLinks: defineTable({
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.id("playerIdentities"),

    // Relationship type
    relationship: v.union(
      v.literal("mother"),
      v.literal("father"),
      v.literal("guardian"),
      v.literal("grandparent"),
      v.literal("other")
    ),

    // Flags
    isPrimary: v.boolean(), // Primary contact for this player
    hasParentalResponsibility: v.boolean(),
    canCollectFromTraining: v.boolean(),

    // Cross-org consent
    consentedToSharing: v.boolean(), // Allow other orgs to see this link

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.string()), // "guardian" | "admin" | "system"
  })
    .index("by_guardian", ["guardianIdentityId"])
    .index("by_player", ["playerIdentityId"])
    .index("by_guardian_and_player", [
      "guardianIdentityId",
      "playerIdentityId",
    ]),

  // Organization-level: Player enrollment
  orgPlayerEnrollments: defineTable({
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),

    // Membership info
    clubMembershipNumber: v.optional(v.string()),
    ageGroup: v.string(),
    season: v.string(),
    sport: v.optional(v.string()), // DEPRECATED Phase 3: Use sportPassports.sportCode instead. This field is kept for backwards compatibility but should not be used.

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending"),
      v.literal("suspended")
    ),

    // Review tracking (moved from players)
    reviewStatus: v.optional(v.string()),
    lastReviewDate: v.optional(v.string()),
    nextReviewDue: v.optional(v.string()),

    // Attendance (org-specific)
    attendance: v.optional(
      v.object({
        training: v.optional(v.number()),
        matches: v.optional(v.number()),
      })
    ),

    // Notes (org-specific)
    coachNotes: v.optional(v.string()),
    adminNotes: v.optional(v.string()),

    // Metadata
    enrolledAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_playerIdentityId", ["playerIdentityId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_player_and_org", ["playerIdentityId", "organizationId"])
    .index("by_org_and_status", ["organizationId", "status"])
    .index("by_org_and_ageGroup", ["organizationId", "ageGroup"])
    .index("by_org_sport_status", ["organizationId", "sport", "status"])
    .index("by_player_org_sport", [
      "playerIdentityId",
      "organizationId",
      "sport",
    ]),

  // ============================================================
  // PHASE 4: ADULT PLAYER SUPPORT
  // Emergency contacts for adult players who don't have guardians
  // ============================================================

  // Emergency contacts for adult players (instead of guardians)
  playerEmergencyContacts: defineTable({
    playerIdentityId: v.id("playerIdentities"),

    // Contact details
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),

    // Relationship
    relationship: v.string(), // "spouse", "partner", "parent", "sibling", "friend", etc.

    // Priority (1 = first call, 2 = second, etc.)
    priority: v.number(),

    // Notes
    notes: v.optional(v.string()),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_player", ["playerIdentityId"])
    .index("by_priority", ["playerIdentityId", "priority"]),

  // ============================================================
  // PHASE 7: SPORT PASSPORT & SKILL TRACKING
  // Sport-specific skill tracking with temporal assessments
  // and benchmark comparisons
  // ============================================================

  // Sport Passports - links a player to a specific sport
  sportPassports: defineTable({
    // References
    playerIdentityId: v.id("playerIdentities"),
    sportCode: v.string(), // FK to sports.code
    organizationId: v.string(), // Which org this passport is for

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("inactive"), // Taking a break
      v.literal("archived") // Historical record
    ),

    // Position preferences (if sport has positions)
    primaryPosition: v.optional(v.string()),
    secondaryPositions: v.optional(v.array(v.string())),
    coachPreferredPosition: v.optional(v.string()),
    leastPreferredPosition: v.optional(v.string()),

    // Physical attributes
    dominantSide: v.optional(
      v.union(v.literal("left"), v.literal("right"), v.literal("both"))
    ),
    isGoalkeeper: v.optional(v.boolean()), // For soccer/GAA

    // Current computed values (denormalized for performance)
    currentOverallRating: v.optional(v.number()),
    currentTechnicalRating: v.optional(v.number()),
    currentTacticalRating: v.optional(v.number()),
    currentPhysicalRating: v.optional(v.number()),
    currentMentalRating: v.optional(v.number()),

    // Assessment tracking
    lastAssessmentDate: v.optional(v.string()),
    lastAssessmentType: v.optional(v.string()),
    assessmentCount: v.number(),
    nextReviewDue: v.optional(v.string()),

    // Notes (sport-specific)
    coachNotes: v.optional(v.string()),
    parentNotes: v.optional(v.string()),
    playerNotes: v.optional(v.string()),

    // Season tracking
    currentSeason: v.optional(v.string()),
    seasonsPlayed: v.optional(v.array(v.string())),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_playerIdentityId", ["playerIdentityId"])
    .index("by_player_and_sport", ["playerIdentityId", "sportCode"])
    .index("by_player_and_org", ["playerIdentityId", "organizationId"]) // Added Phase 3: Optimize sport validation JOINs
    .index("by_organizationId", ["organizationId"])
    .index("by_org_and_sport", ["organizationId", "sportCode"])
    .index("by_status", ["organizationId", "sportCode", "status"]),

  // Skill Assessments - point-in-time skill records
  skillAssessments: defineTable({
    // References
    passportId: v.id("sportPassports"),
    playerIdentityId: v.id("playerIdentities"), // Denormalized for querying
    sportCode: v.string(), // Denormalized
    skillCode: v.string(), // FK to skillDefinitions.code
    organizationId: v.string(), // Denormalized

    // Assessment data
    rating: v.number(), // 1-5 scale
    previousRating: v.optional(v.number()), // For delta tracking

    // Context
    assessmentDate: v.string(), // ISO date
    assessmentType: v.union(
      v.literal("initial"), // First assessment
      v.literal("training"), // Regular training observation
      v.literal("match"), // Post-match assessment
      v.literal("trial"), // Trial/tryout
      v.literal("formal_review"), // Scheduled formal review
      v.literal("self"), // Player self-assessment
      v.literal("parent"), // Parent observation
      v.literal("import") // Imported from external source
    ),

    // Assessor information
    assessedBy: v.optional(v.string()), // User ID
    assessedByName: v.optional(v.string()), // Denormalized name
    assessorRole: v.optional(
      v.union(
        v.literal("coach"),
        v.literal("head_coach"),
        v.literal("assistant_coach"),
        v.literal("parent"),
        v.literal("self"),
        v.literal("admin"),
        v.literal("system")
      )
    ),

    // Benchmark comparison (snapshot at time of assessment)
    benchmarkRating: v.optional(v.number()),
    benchmarkLevel: v.optional(v.string()), // "competitive", "recreational"
    benchmarkDelta: v.optional(v.number()), // rating - benchmarkRating
    benchmarkStatus: v.optional(
      v.union(
        v.literal("below"),
        v.literal("developing"),
        v.literal("on_track"),
        v.literal("exceeding"),
        v.literal("exceptional")
      )
    ),

    // Notes
    notes: v.optional(v.string()),
    privateNotes: v.optional(v.string()), // Coach-only notes

    // Session context (if applicable)
    sessionId: v.optional(v.string()), // Link to training session
    matchId: v.optional(v.string()), // Link to match record

    // Metadata
    confidence: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    createdAt: v.number(),
  })
    .index("by_passportId", ["passportId"])
    .index("by_playerIdentityId", ["playerIdentityId"])
    .index("by_player_and_sport", ["playerIdentityId", "sportCode"])
    .index("by_skill", ["passportId", "skillCode"])
    .index("by_date", ["passportId", "assessmentDate"])
    .index("by_assessor", ["assessedBy", "assessmentDate"])
    .index("by_organizationId", ["organizationId", "assessmentDate"])
    .index("by_type", ["passportId", "assessmentType"]),

  // Passport Goals - Development goals linked to sport passports
  passportGoals: defineTable({
    // References
    passportId: v.id("sportPassports"),
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),

    // Goal details
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("technical"),
      v.literal("tactical"),
      v.literal("physical"),
      v.literal("mental"),
      v.literal("social")
    ),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("on_hold"),
      v.literal("cancelled")
    ),

    // Progress tracking
    progress: v.number(), // 0-100 percentage
    targetDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),

    // Linked skills (skill codes this goal relates to)
    linkedSkills: v.optional(v.array(v.string())),

    // Milestones
    milestones: v.optional(
      v.array(
        v.object({
          id: v.string(),
          description: v.string(),
          completed: v.boolean(),
          completedDate: v.optional(v.string()),
        })
      )
    ),

    // Parent involvement
    parentActions: v.optional(v.array(v.string())),
    parentCanView: v.boolean(),

    // Cross-org sharing control (Passport Sharing Feature)
    isShareable: v.optional(v.boolean()), // Can this goal be shared cross-org, default false
    markedShareableAt: v.optional(v.number()), // When marked shareable
    markedShareableBy: v.optional(v.string()), // userId who marked shareable

    // Notes
    coachNotes: v.optional(v.string()),
    playerNotes: v.optional(v.string()),

    // Metadata
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_passportId", ["passportId"])
    .index("by_playerIdentityId", ["playerIdentityId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_status", ["passportId", "status"])
    .index("by_category", ["passportId", "category"]),

  // Team Player Identities - links Better Auth teams to player identities
  // This is the new identity system equivalent of teamPlayers
  teamPlayerIdentities: defineTable({
    teamId: v.string(), // Better Auth team ID
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),

    // Role within the team
    role: v.optional(v.string()), // "captain", "vice-captain", "player"

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("transferred") // Moved to another team
    ),

    // Season tracking
    season: v.optional(v.string()), // "2024-25"
    joinedDate: v.optional(v.string()),
    leftDate: v.optional(v.string()),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_teamId", ["teamId"])
    .index("by_playerIdentityId", ["playerIdentityId"])
    .index("by_team_and_player", ["teamId", "playerIdentityId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_org_and_status", ["organizationId", "status"]),

  // Skill Benchmarks - NGB standards and expectations
  skillBenchmarks: defineTable({
    // References
    sportCode: v.string(),
    skillCode: v.string(),

    // Context (what this benchmark applies to)
    ageGroup: v.string(), // "U8", "U10", "U12", etc.
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("all")),
    level: v.union(
      v.literal("recreational"), // Fun/participation focused
      v.literal("competitive"), // Club competitive
      v.literal("development"), // Development pathway
      v.literal("elite") // High performance
    ),

    // Benchmark values (1-5 scale)
    expectedRating: v.number(), // Expected for this age/level
    minAcceptable: v.number(), // Minimum acceptable
    developingThreshold: v.number(), // Below this = needs work
    excellentThreshold: v.number(), // Above this = exceptional

    // Percentile data (if available from NGB)
    percentile25: v.optional(v.number()),
    percentile50: v.optional(v.number()),
    percentile75: v.optional(v.number()),
    percentile90: v.optional(v.number()),

    // Source attribution
    source: v.string(), // "FAI", "IRFU", "GAA", "internal"
    sourceDocument: v.optional(v.string()), // "FAI Player Development Plan 2024"
    sourceUrl: v.optional(v.string()),
    sourceYear: v.number(),
    validFrom: v.optional(v.string()), // ISO date
    validTo: v.optional(v.string()), // ISO date (null = current)

    // Notes
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sportCode", ["sportCode"])
    .index("by_skill", ["sportCode", "skillCode"])
    .index("by_context", [
      "sportCode",
      "skillCode",
      "ageGroup",
      "gender",
      "level",
    ])
    .index("by_source", ["source", "sourceYear"]),

  // Player Injuries - platform-level injury tracking (cross-org visible)
  playerInjuries: defineTable({
    // Platform-level reference
    playerIdentityId: v.id("playerIdentities"),

    // Injury details
    injuryType: v.string(), // "sprain", "strain", "fracture", etc.
    bodyPart: v.string(), // "ankle", "knee", "shoulder", etc.
    side: v.optional(
      v.union(v.literal("left"), v.literal("right"), v.literal("both"))
    ),

    // Dates
    dateOccurred: v.string(), // ISO date
    dateReported: v.string(), // ISO date

    // Severity and status
    severity: v.union(
      v.literal("minor"), // 1-7 days
      v.literal("moderate"), // 1-4 weeks
      v.literal("severe"), // 4+ weeks
      v.literal("long_term") // Season-ending or longer
    ),
    status: v.union(
      v.literal("active"), // Currently injured
      v.literal("recovering"), // In recovery
      v.literal("cleared"), // Cleared to play
      v.literal("healed") // Fully healed (historical)
    ),

    // Description (guardian/player provides)
    description: v.string(),
    mechanism: v.optional(v.string()), // How injury occurred

    // Treatment
    treatment: v.optional(v.string()),
    medicalProvider: v.optional(v.string()),
    medicalNotes: v.optional(v.string()), // Private medical notes

    // Return to play
    expectedReturn: v.optional(v.string()), // ISO date
    actualReturn: v.optional(v.string()), // ISO date
    daysOut: v.optional(v.number()),
    returnToPlayProtocol: v.optional(
      v.array(
        v.object({
          id: v.string(),
          step: v.number(),
          description: v.string(),
          completed: v.boolean(),
          completedDate: v.optional(v.string()),
          clearedBy: v.optional(v.string()),
        })
      )
    ),

    // Context (where injury occurred)
    occurredDuring: v.optional(
      v.union(
        v.literal("training"),
        v.literal("match"),
        v.literal("other_sport"),
        v.literal("non_sport"),
        v.literal("unknown")
      )
    ),
    occurredAtOrgId: v.optional(v.string()), // Which org (if during club activity)
    sportCode: v.optional(v.string()), // Which sport

    // Visibility control
    isVisibleToAllOrgs: v.boolean(), // Guardian can restrict visibility
    restrictedToOrgIds: v.optional(v.array(v.string())), // If not visible to all

    // Reported by
    reportedBy: v.optional(v.string()), // User ID
    reportedByRole: v.optional(
      v.union(
        v.literal("guardian"),
        v.literal("player"),
        v.literal("coach"),
        v.literal("admin")
      )
    ),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_playerIdentityId", ["playerIdentityId"])
    .index("by_status", ["playerIdentityId", "status"])
    .index("by_date", ["playerIdentityId", "dateOccurred"])
    .index("by_sport", ["sportCode", "dateOccurred"]),

  // Org Injury Notes - organization-specific notes on injuries
  orgInjuryNotes: defineTable({
    // References
    injuryId: v.id("playerInjuries"),
    organizationId: v.string(),

    // Note content
    note: v.string(),
    noteType: v.union(
      v.literal("observation"), // General observation
      v.literal("training_restriction"), // What they can/can't do
      v.literal("progress_update"), // Recovery progress
      v.literal("clearance"), // Clearance to play
      v.literal("follow_up") // Follow-up action needed
    ),

    // Who added the note
    addedBy: v.string(), // User ID
    addedByName: v.string(),
    addedByRole: v.union(
      v.literal("coach"),
      v.literal("admin"),
      v.literal("medical_officer")
    ),

    // Visibility
    isPrivate: v.boolean(), // If true, only org admins can see

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_injuryId", ["injuryId"])
    .index("by_org_and_injury", ["organizationId", "injuryId"])
    .index("by_date", ["injuryId", "createdAt"]),

  // ============================================================
  // EXISTING APPLICATION TABLES
  // ============================================================

  // Simple todos (existing)
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),

  // Coach tasks - personal task management for coaches
  coachTasks: defineTable({
    text: v.string(), // Task description
    completed: v.boolean(),
    coachEmail: v.string(), // Coach's email (from Better Auth user)
    organizationId: v.string(), // Org scope
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()), // Timestamp
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_coach_and_org", ["coachEmail", "organizationId"])
    .index("by_org", ["organizationId"])
    .index("by_completed", ["completed"]),

  // Coach assignments - stores team/age group assignments for coaches
  coachAssignments: defineTable({
    userId: v.string(), // Better Auth user ID
    organizationId: v.string(),
    teams: v.array(v.string()), // Team IDs (Better Auth team._id) they're assigned to
    ageGroups: v.array(v.string()), // Age groups they coach
    sport: v.optional(v.string()), // Primary sport
    roles: v.optional(v.array(v.string())), // Additional roles
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_org", ["userId", "organizationId"])
    .index("by_organizationId", ["organizationId"]),

  // Players table
  players: defineTable({
    name: v.string(),
    ageGroup: v.string(),
    sport: v.string(),
    gender: v.string(),
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
    // skills: v.optional(v.string()),
    // skills2: v.object(v.record()),
    skills: v.record(v.string(), v.number()),

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
    .index("by_organizationId", ["organizationId"])
    .index("by_sport", ["sport"])
    .index("by_ageGroup", ["ageGroup"])
    .index("by_familyId", ["familyId"])
    .index("by_parentEmail", ["parentEmail"])
    .index("by_inferredParentEmail", ["inferredParentEmail"])
    .searchIndex("name_search", { searchField: "name" })
    .searchIndex("address_search", { searchField: "address" }),

  teamPlayers: defineTable({
    teamId: v.string(),
    playerId: v.id("players"),
    createdAt: v.number(),
  })
    .index("by_teamId", ["teamId"])
    .index("by_playerId", ["playerId"]),

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
    playerId: v.optional(v.id("players")),
    playerIdentityId: v.optional(v.string()), // Legacy field
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
    createdAt: v.optional(v.number()), // Legacy field
    updatedAt: v.optional(v.number()), // Legacy field
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

  // Invitation Events Audit Trail
  // Tracks complete lineage of invitations: created, resent, modified, cancelled, accepted
  invitationEvents: defineTable({
    invitationId: v.string(), // Better Auth invitation ID
    organizationId: v.string(), // Better Auth organization ID

    // Event type
    eventType: v.union(
      v.literal("created"),
      v.literal("resent"),
      v.literal("modified"),
      v.literal("cancelled"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("expired")
    ),

    // Who performed the action
    performedBy: v.string(), // User ID who performed the action
    performedByName: v.optional(v.string()), // Name for display
    performedByEmail: v.optional(v.string()), // Email for display

    // When
    timestamp: v.number(),

    // For "modified" events - what changed
    changes: v.optional(
      v.object({
        field: v.string(), // "functionalRoles", "teams", "players"
        oldValue: v.any(),
        newValue: v.any(),
      })
    ),

    // Event-specific metadata
    metadata: v.optional(v.any()),
  })
    .index("by_invitationId", ["invitationId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_eventType", ["eventType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_invitation_and_timestamp", ["invitationId", "timestamp"]),

  // Organization Join Requests
  // Architecture Note: requestedRole is Better Auth hierarchy role (auto-inferred from functional roles)
  // requestedFunctionalRoles contains capabilities (coach, parent, admin)
  // See: docs/COMPREHENSIVE_AUTH_PLAN.md
  orgJoinRequests: defineTable({
    userId: v.string(), // Better Auth user ID
    userEmail: v.string(),
    userName: v.string(),
    organizationId: v.string(), // Better Auth organization ID
    organizationName: v.string(),
    // Better Auth hierarchy role - auto-inferred from functional roles
    requestedRole: v.union(
      v.literal("member"),
      v.literal("admin"),
      v.literal("coach"), // Deprecated, kept for backwards compatibility
      v.literal("parent") // Deprecated, kept for backwards compatibility
    ),
    // Functional roles (capabilities) - the actual roles user wants
    requestedFunctionalRoles: v.optional(
      v.array(
        v.union(
          v.literal("coach"),
          v.literal("parent"),
          v.literal("admin"),
          v.literal("player")
        )
      )
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    message: v.optional(v.string()), // Optional message from user
    rejectionReason: v.optional(v.string()),

    // Parent-specific fields for smart matching
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    // JSON string of [{name, age, team?}] - children info for matching
    children: v.optional(v.string()),

    // Coach-specific fields
    coachSport: v.optional(v.string()), // Primary sport
    coachGender: v.optional(v.string()), // Team gender preference (male, female, mixed)
    coachTeams: v.optional(v.string()), // Comma-separated team names
    coachAgeGroups: v.optional(v.string()), // Comma-separated age groups

    // Timestamps
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),

    // Reviewer info
    reviewedBy: v.optional(v.string()), // Better Auth user ID
    reviewerName: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_userId_and_organizationId", ["userId", "organizationId"])
    .index("by_organizationId_and_status", ["organizationId", "status"]),

  // Voice Notes
  voiceNotes: defineTable({
    orgId: v.string(),
    coachId: v.optional(v.string()),
    date: v.string(),
    type: v.union(
      v.literal("training"),
      v.literal("match"),
      v.literal("general")
    ),
    // Audio recording (optional - typed notes won't have this)
    audioStorageId: v.optional(v.id("_storage")),
    // Transcription status
    transcription: v.optional(v.string()),
    transcriptionStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    transcriptionError: v.optional(v.string()),
    // AI insights
    summary: v.optional(v.string()),
    insights: v.array(
      v.object({
        id: v.string(),
        playerIdentityId: v.optional(v.id("playerIdentities")),
        playerId: v.optional(v.string()), // TEMPORARY: Legacy field for old voice notes
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
      })
    ),
    insightsStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    insightsError: v.optional(v.string()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_coachId", ["orgId", "coachId"]),

  // Organization Deletion Requests
  // Requires platform staff approval before deletion is executed
  orgDeletionRequests: defineTable({
    organizationId: v.string(), // Better Auth organization ID
    organizationName: v.string(),
    organizationLogo: v.optional(v.string()),

    // Who requested the deletion
    requestedBy: v.string(), // Better Auth user ID (must be owner)
    requestedByEmail: v.string(),
    requestedByName: v.string(),

    // Reason for deletion
    reason: v.string(),

    // Status workflow
    status: v.union(
      v.literal("pending"), // Awaiting platform staff review
      v.literal("approved"), // Platform staff approved, deletion pending
      v.literal("rejected"), // Platform staff rejected
      v.literal("cancelled"), // Owner cancelled the request
      v.literal("completed") // Deletion has been executed
    ),

    // Timestamps
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    // Platform staff reviewer
    reviewedBy: v.optional(v.string()), // Platform staff user ID
    reviewedByName: v.optional(v.string()),
    reviewedByEmail: v.optional(v.string()),

    // Rejection reason (if rejected)
    rejectionReason: v.optional(v.string()),

    // Data summary at time of request (for audit purposes)
    dataSummary: v.optional(
      v.object({
        memberCount: v.number(),
        playerCount: v.number(),
        teamCount: v.number(),
        coachCount: v.number(),
        parentCount: v.number(),
      })
    ),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_requestedAt", ["requestedAt"]),

  // Demo requests table
  demoAsks: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    organization: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("contacted"),
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("dismissed")
    ),
    requestedAt: v.number(),
    contactedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  // ============================================================
  // PLAYER SELF-ACCESS TABLES
  // Enable players to directly access their own passport data
  // with proper controls from clubs and guardians
  // ============================================================

  // Organization policy settings for player self-access
  playerAccessPolicies: defineTable({
    organizationId: v.string(),

    // Master switch
    isEnabled: v.boolean(),

    // Age restrictions
    minimumAge: v.number(), // e.g., 14

    // Approval requirements
    requireGuardianApproval: v.boolean(),
    requireCoachRecommendation: v.optional(v.boolean()),

    // Default visibility settings
    defaultVisibility: v.object({
      skillRatings: v.boolean(),
      skillHistory: v.boolean(),
      publicCoachNotes: v.boolean(),
      benchmarkComparison: v.boolean(),
      practiceRecommendations: v.boolean(),
      developmentGoals: v.boolean(),
      injuryStatus: v.boolean(),
    }),

    // Audit settings
    notifyGuardianOnLogin: v.boolean(),
    trackPlayerViews: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organizationId", ["organizationId"]),

  // Guardian permission grants for player self-access
  playerAccessGrants: defineTable({
    // Links
    playerIdentityId: v.id("playerIdentities"),
    guardianIdentityId: v.id("guardianIdentities"),
    organizationId: v.string(), // Grants are per-org

    // Status
    isEnabled: v.boolean(),

    // Visibility overrides (null = use org default)
    visibilityOverrides: v.optional(
      v.object({
        skillRatings: v.optional(v.boolean()),
        skillHistory: v.optional(v.boolean()),
        publicCoachNotes: v.optional(v.boolean()),
        parentNotes: v.optional(v.boolean()), // Guardian can share their own notes
        benchmarkComparison: v.optional(v.boolean()),
        practiceRecommendations: v.optional(v.boolean()),
        developmentGoals: v.optional(v.boolean()),
        injuryStatus: v.optional(v.boolean()),
        medicalNotes: v.optional(v.boolean()), // Guardian can share if they choose
        attendanceRecords: v.optional(v.boolean()),
      })
    ),

    // Notification preferences
    notifyOnLogin: v.boolean(),
    notifyOnViewSensitive: v.boolean(),

    // Coach recommendation (if required)
    coachRecommendedAt: v.optional(v.number()),
    coachRecommendedBy: v.optional(v.string()),

    // Timestamps
    grantedAt: v.number(),
    grantedBy: v.string(), // Guardian's userId
    revokedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_player_and_org", ["playerIdentityId", "organizationId"])
    .index("by_guardian", ["guardianIdentityId"])
    .index("by_player", ["playerIdentityId"]),

  // Player account links (when player creates their own account)
  playerAccountLinks: defineTable({
    playerIdentityId: v.id("playerIdentities"),
    userId: v.string(), // Better Auth user ID

    // Verification
    verificationMethod: v.union(
      v.literal("guardian_verified"), // Guardian confirmed identity
      v.literal("email_verified"), // Email verification
      v.literal("code_verified"), // One-time code from guardian
      v.literal("admin_verified") // Admin manually verified
    ),
    verifiedAt: v.number(),
    verifiedBy: v.optional(v.string()), // Guardian/Admin userId

    // Account status
    isActive: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_playerIdentityId", ["playerIdentityId"])
    .index("by_userId", ["userId"]),

  // Audit log for player access
  playerAccessLogs: defineTable({
    playerIdentityId: v.id("playerIdentities"),
    userId: v.string(), // Player's user ID
    organizationId: v.string(),

    // Action
    action: v.union(
      v.literal("login"),
      v.literal("view_passport"),
      v.literal("view_skill_detail"),
      v.literal("view_skill_history"),
      v.literal("view_coach_notes"),
      v.literal("view_injury"),
      v.literal("view_goals"),
      v.literal("view_recommendations")
    ),

    // Context
    resourceId: v.optional(v.string()), // Passport ID, skill code, etc.
    resourceType: v.optional(v.string()),

    // Metadata
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    // Timestamp
    timestamp: v.number(),
  })
    .index("by_player", ["playerIdentityId", "timestamp"])
    .index("by_org", ["organizationId", "timestamp"])
    .index("by_user", ["userId", "timestamp"]),

  // ============================================================
  // MODULAR WIZARD & FLOW SYSTEM
  // Reusable flow system for onboarding, announcements, alerts
  // ============================================================

  // Flow definitions - configured by platform staff or org admins
  flows: defineTable({
    // Basic info
    name: v.string(),
    description: v.optional(v.string()),

    // Flow type
    type: v.union(
      v.literal("onboarding"),
      v.literal("announcement"),
      v.literal("action_required"),
      v.literal("feature_tour"),
      v.literal("system_alert")
    ),

    // Priority level
    priority: v.union(
      v.literal("blocking"), // Must complete before accessing app
      v.literal("high"), // Shows immediately but can be dismissed
      v.literal("medium"), // Shows on next login
      v.literal("low") // Shows as notification/badge
    ),

    // Scope & Permissions
    scope: v.union(
      v.literal("platform"), // Platform staff only - all organizations
      v.literal("organization"), // Org admins - their organization only
      v.literal("team") // Team admins - their team only (future)
    ),

    // Who created this flow
    createdBy: v.string(), // User ID
    createdByRole: v.union(
      v.literal("platform_staff"),
      v.literal("org_admin"),
      v.literal("team_admin")
    ),

    // Organization context (null for platform-wide flows)
    organizationId: v.optional(v.string()),

    // Audience within organization
    targetAudience: v.optional(
      v.union(
        v.literal("all_members"), // Everyone in org
        v.literal("coaches"), // Only coaches
        v.literal("parents"), // Only parents/guardians
        v.literal("admins"), // Only org admins
        v.literal("specific_teams") // Specific teams
      )
    ),

    // If targetAudience is "specific_teams"
    targetTeamIds: v.optional(v.array(v.string())),

    // Trigger conditions (array of condition objects)
    triggers: v.array(v.any()),

    // Target roles for platform-wide flows
    targetRoles: v.optional(v.array(v.string())),

    // Target organizations for platform-wide flows
    targetOrganizations: v.optional(v.array(v.string())),

    // Flow steps
    steps: v.array(
      v.object({
        id: v.string(),
        type: v.union(
          v.literal("page"), // Full page wizard step
          v.literal("modal"), // Modal overlay
          v.literal("banner"), // Top banner
          v.literal("toast") // Toast notification
        ),
        title: v.string(),
        content: v.string(), // Markdown or HTML
        ctaText: v.optional(v.string()),
        ctaAction: v.optional(v.string()), // Route or action
        dismissible: v.boolean(),
      })
    ),

    // Scheduling
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),

    // Status
    active: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_type", ["type"])
    .index("by_scope", ["scope"])
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_active", ["organizationId", "active"]),

  // Track user progress through flows
  userFlowProgress: defineTable({
    userId: v.string(), // Better Auth user ID
    flowId: v.id("flows"),

    // Progress tracking
    currentStepId: v.optional(v.string()),
    completedStepIds: v.array(v.string()),

    // Status
    status: v.union(
      v.literal("pending"), // Not started
      v.literal("in_progress"), // Started but not completed
      v.literal("completed"), // All steps completed
      v.literal("dismissed"), // User dismissed without completing
      v.literal("expired") // Flow expired before completion
    ),

    // Metadata
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),

    // Analytics
    timeSpent: v.optional(v.number()), // milliseconds
    interactionCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_flow", ["flowId"])
    .index("by_user_and_flow", ["userId", "flowId"])
    .index("by_status", ["status"]),

  // ============================================================
  // AI COACHING FEATURES
  // ============================================================

  // Session Plans - Complete implementation with sharing, moderation, and drill library
  sessionPlans: defineTable({
    // Identity
    organizationId: v.string(),
    coachId: v.string(),
    coachName: v.optional(v.string()),
    teamId: v.optional(v.string()),
    teamName: v.string(),
    playerCount: v.optional(v.number()),

    // Content
    title: v.optional(v.string()),
    rawContent: v.optional(v.string()), // Full markdown/text content from AI
    focusArea: v.optional(v.string()),
    duration: v.optional(v.number()), // minutes

    // Sections with activities structure
    sections: v.optional(
      v.array(
        v.object({
          id: v.string(),
          type: v.union(
            v.literal("warmup"),
            v.literal("technical"),
            v.literal("tactical"),
            v.literal("games"),
            v.literal("cooldown"),
            v.literal("custom")
          ),
          title: v.string(),
          duration: v.number(),
          order: v.number(),
          activities: v.array(
            v.object({
              id: v.string(),
              name: v.string(),
              description: v.string(),
              duration: v.optional(v.number()),
              order: v.number(),
              activityType: v.union(
                v.literal("drill"),
                v.literal("game"),
                v.literal("exercise"),
                v.literal("demonstration"),
                v.literal("discussion"),
                v.literal("rest")
              ),
            })
          ),
        })
      )
    ),

    // Context
    sport: v.optional(v.string()),
    ageGroup: v.optional(v.string()),

    // AI-extracted metadata for search and filtering
    extractedTags: v.optional(
      v.object({
        categories: v.array(v.string()), // e.g., ["Technical Training", "Fitness"]
        skills: v.array(v.string()), // e.g., ["Passing", "Dribbling"]
        equipment: v.array(v.string()), // e.g., ["Cones", "Balls"]
        intensity: v.optional(
          v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
        ),
        playerCountRange: v.optional(
          v.object({
            min: v.number(),
            max: v.number(),
            optimal: v.number(),
          })
        ),
      })
    ),

    // Drills referenced
    drills: v.optional(
      v.array(
        v.object({
          drillId: v.string(),
          name: v.string(),
          description: v.string(),
          duration: v.optional(v.number()),
          skillsFocused: v.array(v.string()),
          equipment: v.array(v.string()),
          intensity: v.optional(
            v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
          ),
          playerCountRange: v.optional(
            v.object({
              min: v.number(),
              max: v.number(),
              optimal: v.number(),
            })
          ),
        })
      )
    ),

    // Template Library Features
    isTemplate: v.optional(v.boolean()),
    isFeatured: v.optional(v.boolean()),
    timesUsed: v.optional(v.number()),
    lastUsedDate: v.optional(v.number()),
    favorited: v.optional(v.boolean()),
    customTags: v.optional(v.array(v.string())),
    collections: v.optional(v.array(v.string())),
    successRate: v.optional(v.number()), // 0-100

    // Sharing & Visibility (Phase 1: Club Sharing)
    visibility: v.optional(
      v.union(
        v.literal("private"), // Default - coach only
        v.literal("club"), // Shared with organization
        v.literal("platform") // Public platform gallery (Phase 3)
      )
    ),
    sharedAt: v.optional(v.number()),
    sharedBy: v.optional(v.string()), // Coach name for attribution

    // Admin Moderation (Phase 2)
    moderatedBy: v.optional(v.string()),
    moderatedAt: v.optional(v.number()),
    moderationNote: v.optional(v.string()),
    pinnedByAdmin: v.optional(v.boolean()),

    // PlayerArc Marketplace (Phase 3 - Future)
    approvedForPlatform: v.optional(v.boolean()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    platformCategory: v.optional(v.string()),
    expertCoachProfile: v.optional(v.string()),

    // Status
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("saved"),
        v.literal("archived_success"),
        v.literal("archived_failed"),
        v.literal("deleted")
      )
    ),
    usedInSession: v.optional(v.boolean()),
    usedDate: v.optional(v.number()),

    // Feedback
    feedbackSubmitted: v.optional(v.boolean()),
    feedbackUsedForTraining: v.optional(v.boolean()),
    simplifiedFeedback: v.optional(
      v.object({
        sessionFeedback: v.optional(
          v.union(v.literal("positive"), v.literal("negative"))
        ),
        sessionFeedbackAt: v.optional(v.number()),
        negativeReason: v.optional(v.string()),
        drillFeedback: v.optional(
          v.array(
            v.object({
              drillId: v.string(),
              drillName: v.string(),
              feedback: v.union(v.literal("positive"), v.literal("negative")),
              negativeReason: v.optional(v.string()),
              note: v.optional(v.string()),
              feedbackAt: v.number(),
            })
          )
        ),
        feedbackVariant: v.optional(
          v.union(v.literal("one_click"), v.literal("two_click_highlights"))
        ),
      })
    ),

    // Legacy Quick Actions fields (for backward compatibility)
    creationMethod: v.optional(v.string()),
    generatedAt: v.optional(v.number()),
    regenerateCount: v.optional(v.number()),
    sessionPlan: v.optional(v.string()), // Old field name for rawContent
    shareCount: v.optional(v.number()),
    teamData: v.optional(v.any()),
    usedRealAI: v.optional(v.boolean()),
    viewCount: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_org", ["organizationId"])
    .index("by_coach", ["coachId"])
    .index("by_org_and_coach", ["organizationId", "coachId"])
    .index("by_org_and_status", ["organizationId", "status"])
    .index("by_org_and_team", ["organizationId", "teamId"])
    .index("by_coach_and_status", ["coachId", "status"])
    .index("by_org_and_createdAt", ["organizationId", "createdAt"])
    // Template Gallery Indexes
    .index("by_org_and_isTemplate", ["organizationId", "isTemplate"])
    .index("by_org_and_isFeatured", ["organizationId", "isFeatured"])
    .index("by_org_and_favorited", ["organizationId", "favorited"])
    .index("by_org_and_sport", ["organizationId", "sport"])
    .index("by_org_and_ageGroup", ["organizationId", "ageGroup"])
    // Sharing Indexes (Phase 1)
    .index("by_org_and_visibility", ["organizationId", "visibility"])
    .index("by_visibility", ["visibility"])
    // PlayerArc Marketplace Indexes (Phase 3)
    .index("by_platform_category", ["platformCategory", "approvedAt"])
    .searchIndex("search_content", {
      searchField: "rawContent",
      filterFields: [
        "organizationId",
        "coachId",
        "status",
        "sport",
        "ageGroup",
        "isTemplate",
        "isFeatured",
        "favorited",
        "visibility",
      ],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: [
        "organizationId",
        "coachId",
        "status",
        "sport",
        "ageGroup",
        "isTemplate",
        "isFeatured",
        "favorited",
        "visibility",
      ],
    }),

  // Drill Library - Aggregated effectiveness data from session plan feedback
  drillLibrary: defineTable({
    organizationId: v.string(),
    name: v.string(),
    normalizedName: v.string(), // Lowercase for matching
    description: v.string(),
    activityType: v.string(), // "drill", "game", "exercise", etc.
    skillsFocused: v.array(v.string()),
    equipment: v.array(v.string()),

    // Aggregation from session plan feedback
    totalUses: v.number(),
    positiveCount: v.number(),
    negativeCount: v.number(),
    successRate: v.number(), // Calculated percentage

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_and_name", ["organizationId", "normalizedName"])
    .index("by_org_and_type", ["organizationId", "activityType"]),
});
