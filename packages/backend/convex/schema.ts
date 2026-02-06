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

    // Passport Sharing Preferences (global)
    allowGlobalPassportDiscovery: v.optional(v.boolean()), // Allow coaches at any org to discover children's passports

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

    // Account claim fields (for 18+ graduation flow)
    claimedAt: v.optional(v.number()), // Timestamp when player claimed account
    claimInvitedBy: v.optional(v.string()), // Guardian userId who initiated claim invitation

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

  // Player Graduations - tracks players who have turned 18 and their graduation status
  playerGraduations: defineTable({
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(),
    dateOfBirth: v.number(), // Stored as timestamp for comparison
    turnedEighteenAt: v.number(), // When they turned 18

    // Graduation status
    status: v.union(
      v.literal("pending"), // Detected, not yet actioned
      v.literal("invitation_sent"), // Guardian sent invite
      v.literal("claimed"), // Player claimed account
      v.literal("dismissed") // Guardian dismissed prompt
    ),

    // Invitation tracking
    invitationSentAt: v.optional(v.number()),
    invitationSentBy: v.optional(v.string()), // Guardian userId

    // Claim tracking
    claimedAt: v.optional(v.number()),

    // Dismissal tracking
    dismissedAt: v.optional(v.number()),
    dismissedBy: v.optional(v.string()), // Guardian userId
  })
    .index("by_status", ["status"])
    .index("by_player", ["playerIdentityId"])
    .index("by_org_and_status", ["organizationId", "status"]),

  // Player Claim Tokens - secure tokens for players to claim their accounts
  playerClaimTokens: defineTable({
    playerIdentityId: v.id("playerIdentities"),
    token: v.string(), // Secure random token
    email: v.string(), // Email the token was sent to

    // Validity
    createdAt: v.number(),
    expiresAt: v.number(), // 30 days validity

    // Usage tracking
    usedAt: v.optional(v.number()), // Set when token is used
  })
    .index("by_token", ["token"])
    .index("by_player", ["playerIdentityId"]),

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

    // Decline tracking
    declinedByUserId: v.optional(v.string()), // User who declined this connection (clicked "This Isn't Me")
    declineReason: v.optional(
      v.union(
        v.literal("not_my_child"),
        v.literal("wrong_person"),
        v.literal("none_are_mine"),
        v.literal("other")
      )
    ), // Why parent declined this link
    declineReasonText: v.optional(v.string()), // Custom reason if "other"

    // Link status tracking (Phase 3)
    status: v.optional(
      v.union(
        v.literal("pending"), // Awaiting parent acknowledgement
        v.literal("active"), // Parent accepted
        v.literal("declined") // Parent declined
      )
    ), // Existing links without status are treated as 'active'
    declinedAt: v.optional(v.number()), // Timestamp when parent declined this link

    // Parent acknowledgement tracking (Bug #293 fix)
    acknowledgedByParentAt: v.optional(v.number()), // Timestamp when parent acknowledged this link
    notificationSentAt: v.optional(v.number()), // When we notified parent about this assignment

    // Profile completion tracking
    profileCompletionRequired: v.optional(v.boolean()), // Does this link require profile completion?
    profileCompletedAt: v.optional(v.number()), // When parent completed required profile fields
    requiredProfileFields: v.optional(v.array(v.string())), // Which fields need completion (e.g. ['emergencyContact', 'medicalInfo'])

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.string()), // "guardian" | "admin" | "system"
  })
    .index("by_guardian", ["guardianIdentityId"])
    .index("by_player", ["playerIdentityId"])
    .index("by_guardian_and_player", ["guardianIdentityId", "playerIdentityId"])
    .index("by_guardian_and_status", ["guardianIdentityId", "status"])
    .index("by_status", ["status"]),

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
    .index("by_sportCode", ["sportCode"]) // For migration scripts
    .index("by_status", ["organizationId", "sportCode", "status"])
    .index("by_player_org_status", [
      "playerIdentityId",
      "organizationId",
      "status",
    ]), // Added for filter() elimination

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

    // Source tracking - where did this assessment come from?
    source: v.optional(v.union(v.literal("manual"), v.literal("voice_note"))),
    voiceNoteId: v.optional(v.id("voiceNotes")), // If created from voice note

    // Metadata
    confidence: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    createdAt: v.number(),
  })
    .index("by_passportId", ["passportId"])
    .index("by_playerIdentityId", ["playerIdentityId"])
    .index("by_player_and_sport", ["playerIdentityId", "sportCode"])
    .index("by_sportCode", ["sportCode"]) // For migration scripts
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
    .index("by_category", ["passportId", "category"])
    .index("by_player_status", ["playerIdentityId", "status"]) // Added for filter() elimination
    .index("by_org_status", ["organizationId", "status"]), // Added for filter() elimination

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
    .index("by_teamId_and_status", ["teamId", "status"])
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

    // Source tracking - where did this injury record come from?
    source: v.optional(v.union(v.literal("manual"), v.literal("voice_note"))),
    voiceNoteId: v.optional(v.id("voiceNotes")), // If created from voice note

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

  // Coach tasks - personal and team task management for coaches
  coachTasks: defineTable({
    text: v.string(), // Task description
    completed: v.boolean(),
    organizationId: v.string(), // Org scope

    // Assignment - who the task is assigned to
    assignedToUserId: v.string(), // Better Auth user ID of assigned coach
    assignedToName: v.optional(v.string()), // Denormalized name for display
    createdByUserId: v.string(), // Better Auth user ID of task creator

    // Legacy field - keep for backward compatibility during migration
    coachEmail: v.optional(v.string()), // Deprecated: Coach's email

    // Task metadata
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    dueDate: v.optional(v.number()), // Timestamp
    status: v.optional(
      v.union(v.literal("open"), v.literal("in-progress"), v.literal("done"))
    ), // Task status (granular alternative to completed boolean)

    // Source tracking - where did this task come from?
    source: v.union(v.literal("manual"), v.literal("voice_note")),
    voiceNoteId: v.optional(v.id("voiceNotes")), // If created from voice note
    insightId: v.optional(v.string()), // Insight ID within the voice note

    // Player linking - optional association with a player
    playerIdentityId: v.optional(v.id("orgPlayerEnrollments")),
    playerName: v.optional(v.string()), // Denormalized for display

    // Team scope - if set, this is a team task visible to all team members
    teamId: v.optional(v.string()), // Better Auth team ID for team tasks

    // Timestamps
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_assigned_user_and_org", ["assignedToUserId", "organizationId"])
    .index("by_team_and_org", ["teamId", "organizationId"])
    .index("by_org", ["organizationId"])
    .index("by_completed", ["completed"])
    .index("by_voice_note", ["voiceNoteId"])
    // Legacy index for migration period
    .index("by_coach_and_org", ["coachEmail", "organizationId"]),

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

  // Invitation Requests (Phase 1B)
  // Tracks user self-service requests for new invitations when their original invitation expired
  invitationRequests: defineTable({
    originalInvitationId: v.string(), // ID of the expired invitation
    organizationId: v.string(), // Organization the invitation was for
    userEmail: v.string(), // Email of the invited user
    requestedAt: v.number(), // When the request was made
    requestNumber: v.number(), // 1, 2, or 3 (max 3 requests per invitation)
    status: v.union(
      v.literal("pending"), // Awaiting admin action
      v.literal("approved"), // Admin approved, new invite sent
      v.literal("denied") // Admin denied request
    ),
    processedAt: v.optional(v.number()), // When admin processed the request
    processedBy: v.optional(v.string()), // User ID of admin who processed
    denyReason: v.optional(v.string()), // Reason for denial
    newInvitationId: v.optional(v.string()), // ID of the new invitation (if approved)
  })
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_email", ["userEmail"])
    .index("by_original_invitation", ["originalInvitationId"]),

  // Archived Invitations (Phase 6)
  // Stores archived invitations for long-term audit purposes
  // Invitations are archived 30 days after expiration and cleaned up after 90 days
  archivedInvitations: defineTable({
    originalInvitationId: v.string(), // ID of the original invitation
    organizationId: v.string(),
    email: v.string(),
    role: v.string(),
    metadata: v.optional(v.any()), // Original metadata (functional roles, player links, etc.)
    createdAt: v.number(), // When the original invitation was created
    expiredAt: v.number(), // When the original invitation expired
    archivedAt: v.number(), // When this archive record was created
    archivedReason: v.union(
      v.literal("expired_30_days"), // Auto-archived 30 days after expiration
      v.literal("manual_archive"), // Admin manually archived
      v.literal("user_cancelled") // User cancelled/declined
    ),
  })
    .index("by_organization", ["organizationId"])
    .index("by_archived_at", ["archivedAt"])
    .index("by_email", ["email"]),

  // Voice Notes
  voiceNotes: defineTable({
    orgId: v.string(),
    coachId: v.optional(v.string()), // Optional for backwards compatibility with old notes
    date: v.string(),
    type: v.union(
      v.literal("training"),
      v.literal("match"),
      v.literal("general")
    ),
    // Source channel - how the note was created
    source: v.optional(
      v.union(
        v.literal("app_recorded"), // Recorded via app microphone
        v.literal("app_typed"), // Typed directly in app
        v.literal("whatsapp_audio"), // Voice note from WhatsApp
        v.literal("whatsapp_text") // Text message from WhatsApp
      )
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
        confidence: v.optional(v.number()), // Phase 7: AI confidence score (0.0-1.0)
        status: v.union(
          v.literal("pending"),
          v.literal("applied"),
          v.literal("dismissed"),
          v.literal("auto_applied") // Phase 7.3: Auto-applied by AI
        ),
        appliedDate: v.optional(v.string()),
        appliedAt: v.optional(v.number()), // Phase 7.3: Timestamp for auto-apply
        appliedBy: v.optional(v.string()), // Phase 7.3: User ID who applied (or coachId for auto)
        dismissedAt: v.optional(v.number()), // Phase 7.3: Timestamp for dismiss
        dismissedBy: v.optional(v.string()), // Phase 7.3: User ID who dismissed
        // Team/TODO classification fields
        teamId: v.optional(v.string()), // For team_culture insights
        teamName: v.optional(v.string()),
        assigneeUserId: v.optional(v.string()), // For todo insights
        assigneeName: v.optional(v.string()),
        // Task linking - set when TODO insight creates a task
        linkedTaskId: v.optional(v.id("coachTasks")),
      })
    ),
    insightsStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("awaiting_confirmation"),
        v.literal("cancelled")
      )
    ),
    insightsError: v.optional(v.string()),
    // Transcript quality tracking (US-VN-002)
    transcriptQuality: v.optional(v.number()),
    transcriptValidation: v.optional(
      v.object({
        isValid: v.boolean(),
        reason: v.optional(v.string()),
        suggestedAction: v.union(
          v.literal("process"),
          v.literal("ask_user"),
          v.literal("reject")
        ),
      })
    ),
    // Optional session plan link for voice notes taken during sessions
    sessionPlanId: v.optional(v.id("sessionPlans")),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_coachId", ["orgId", "coachId"])
    .index("by_session", ["sessionPlanId"]),

  // ============================================================
  // PHASE 7: COACH INSIGHT AUTO-APPLY
  // Extracted insights with confidence scores for auto-apply automation
  // ============================================================

  // Voice Note Insights - Extracted from voiceNotes.insights array
  // Dedicated table for efficient querying by confidence, category, and status
  // Supports Phase 7 trust-based auto-apply with preview mode
  voiceNoteInsights: defineTable({
    // Source tracking
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(), // Original insight.id from embedded array

    // Content
    title: v.string(),
    description: v.string(),
    category: v.string(), // skill, attendance, goal, performance, injury, medical, team_culture, todo
    recommendedUpdate: v.optional(v.string()),

    // Player/Team association
    playerIdentityId: v.optional(v.id("playerIdentities")),
    playerName: v.optional(v.string()),
    teamId: v.optional(v.string()),
    teamName: v.optional(v.string()),
    assigneeUserId: v.optional(v.string()), // For todo insights
    assigneeName: v.optional(v.string()),

    // Trust & Automation (Phase 7)
    confidenceScore: v.number(), // 0.0-1.0, AI confidence in this insight
    wouldAutoApply: v.boolean(), // Prediction flag for preview mode

    // Status tracking
    status: v.union(
      v.literal("pending"),
      v.literal("applied"),
      v.literal("dismissed"),
      v.literal("auto_applied") // Applied automatically by AI
    ),

    // Application tracking
    appliedAt: v.optional(v.number()), // Timestamp when applied
    appliedBy: v.optional(v.string()), // User ID or "system" for auto-apply
    dismissedAt: v.optional(v.number()),
    dismissedBy: v.optional(v.string()),

    // AI Accuracy Tracking (Phase 7.3)
    // Tracks when coach corrects AI classification/matching errors for analytics
    wasManuallyCorrected: v.optional(v.boolean()), // True if coach corrected any AI classification
    manuallyCorrectedAt: v.optional(v.number()), // Timestamp of correction
    correctionType: v.optional(
      v.union(
        v.literal("player_assigned"), // Coach assigned/corrected player
        v.literal("team_classified"), // Coach classified as team insight
        v.literal("todo_classified"), // Coach classified as coach todo
        v.literal("content_edited") // Coach edited title/description/recommendedUpdate
      )
    ),

    // Metadata
    organizationId: v.string(),
    coachId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_coach_org_status", ["coachId", "organizationId", "status"])
    .index("by_player_status", ["playerIdentityId", "status"])
    .index("by_confidence", ["confidenceScore"])
    .index("by_category_status", ["category", "status"])
    .index("by_voice_note", ["voiceNoteId"])
    .index("by_voice_note_and_insight", ["voiceNoteId", "insightId"])
    .index("by_coach_org", ["coachId", "organizationId"])
    .index("by_org_status", ["organizationId", "status"]),

  // Auto-Applied Insights Audit Trail - Phase 7.2
  // Tracks all automated insight applications for compliance and undo capability
  // 1-hour undo window enforced
  autoAppliedInsights: defineTable({
    // Source tracking
    insightId: v.id("voiceNoteInsights"),
    voiceNoteId: v.id("voiceNotes"),

    // Context (denormalized for audit trail)
    playerId: v.id("orgPlayerEnrollments"), // DEPRECATED: Use playerIdentityId
    playerIdentityId: v.id("playerIdentities"),
    coachId: v.string(),
    organizationId: v.string(),

    // Insight metadata (snapshot at time of application)
    category: v.string(),
    confidenceScore: v.number(),
    insightTitle: v.string(),
    insightDescription: v.string(),

    // Application tracking
    appliedAt: v.number(),
    autoAppliedByAI: v.boolean(), // true = auto, false = manual with system assist

    // Undo tracking (1-hour window)
    undoneAt: v.optional(v.number()),
    undoReason: v.optional(
      v.union(
        v.literal("wrong_player"),
        v.literal("wrong_rating"),
        v.literal("insight_incorrect"),
        v.literal("changed_mind"),
        v.literal("duplicate"),
        v.literal("other")
      )
    ),
    undoReasonDetail: v.optional(v.string()), // Free text explanation

    // Change tracking (for rollback)
    changeType: v.string(), // "skill_rating", "attendance_record", "goal_created", etc.
    targetTable: v.string(), // "skillAssessments", "passportGoals", etc.
    targetRecordId: v.optional(v.string()), // ID of created/updated record
    fieldChanged: v.optional(v.string()), // Field name if updating existing record
    previousValue: v.optional(v.string()), // Serialized previous value (JSON string)
    newValue: v.string(), // Serialized new value (JSON string)
  })
    .index("by_coach_org", ["coachId", "organizationId"])
    .index("by_insight", ["insightId"])
    .index("by_player_identity", ["playerIdentityId"])
    .index("by_applied_at", ["appliedAt"])
    .index("by_undo_status", ["undoneAt"]) // null = active, non-null = undone
    .index("by_coach_org_applied", ["coachId", "organizationId", "appliedAt"]),

  // ============================================================
  // PHASE 9: TEAM COLLABORATION HUB
  // Real-time collaboration features for coaches
  // ============================================================

  // Comments on voice note insights
  insightComments: defineTable({
    insightId: v.id("voiceNoteInsights"),
    userId: v.string(), // Better Auth user ID
    content: v.string(),
    priority: v.union(
      v.literal("critical"),
      v.literal("important"),
      v.literal("normal")
    ),
    parentCommentId: v.optional(v.id("insightComments")), // For threading
    organizationId: v.string(), // Denormalized for access control
  })
    .index("by_insight", ["insightId"])
    .index("by_user", ["userId"])
    .index("by_org", ["organizationId"])
    .index("by_insight_and_priority", ["insightId", "priority"])
    .index("by_parent", ["parentCommentId"]),

  // Reactions to voice note insights
  insightReactions: defineTable({
    insightId: v.id("voiceNoteInsights"),
    userId: v.string(), // Better Auth user ID
    type: v.union(v.literal("like"), v.literal("helpful"), v.literal("flag")),
    organizationId: v.string(), // Denormalized for access control
  })
    .index("by_insight", ["insightId"])
    .index("by_user", ["userId"])
    .index("by_org", ["organizationId"])
    .index("by_insight_and_user", ["insightId", "userId"])
    .index("by_insight_and_type", ["insightId", "type"]),

  // Team activity feed (aggregated events for dashboards)
  teamActivityFeed: defineTable({
    organizationId: v.string(), // Better Auth organization ID
    teamId: v.string(), // Better Auth team ID
    actorId: v.string(), // User who performed the action
    actorName: v.string(), // Denormalized for display
    actionType: v.union(
      v.literal("voice_note_added"),
      v.literal("insight_applied"),
      v.literal("comment_added"),
      v.literal("player_assessed"),
      v.literal("goal_created"),
      v.literal("injury_logged"),
      v.literal("decision_created"),
      v.literal("vote_cast"),
      v.literal("decision_finalized"),
      v.literal("task_created"),
      v.literal("task_completed"),
      v.literal("task_assigned"),
      v.literal("insight_generated")
    ),
    entityType: v.union(
      v.literal("voice_note"),
      v.literal("insight"),
      v.literal("comment"),
      v.literal("skill_assessment"),
      v.literal("goal"),
      v.literal("injury"),
      v.literal("decision"),
      v.literal("task"),
      v.literal("team_insight")
    ),
    entityId: v.string(), // ID of the related entity
    summary: v.string(), // Human-readable description
    priority: v.union(
      v.literal("critical"),
      v.literal("important"),
      v.literal("normal")
    ),
    metadata: v.optional(
      v.object({
        playerName: v.optional(v.string()),
        insightTitle: v.optional(v.string()),
        commentPreview: v.optional(v.string()),
      })
    ),
  })
    .index("by_team", ["teamId"])
    .index("by_org", ["organizationId"])
    .index("by_actor", ["actorId"])
    .index("by_team_and_priority", ["teamId", "priority"])
    .index("by_team_and_actionType", ["teamId", "actionType"]),

  // Team insights - AI-generated insights from voice notes and analysis
  teamInsights: defineTable({
    teamId: v.string(), // Better Auth team ID
    organizationId: v.string(), // Better Auth organization ID
    type: v.union(
      v.literal("voice-note"),
      v.literal("ai-generated"),
      v.literal("manual")
    ),
    title: v.string(),
    summary: v.string(), // 2-3 sentence summary
    fullText: v.optional(v.string()), // Full insight text
    voiceNoteId: v.optional(v.id("voiceNotes")), // Source voice note if applicable
    playerIds: v.array(v.id("orgPlayerEnrollments")), // Related players
    topic: v.union(
      v.literal("technical"),
      v.literal("tactical"),
      v.literal("fitness"),
      v.literal("behavioral"),
      v.literal("other")
    ),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    createdBy: v.string(), // Better Auth user ID
    createdAt: v.number(),
    readBy: v.array(v.string()), // User IDs who have viewed this insight
  })
    .index("by_team", ["teamId"])
    .index("by_org", ["organizationId"])
    .index("by_team_and_type", ["teamId", "type"])
    .index("by_voice_note", ["voiceNoteId"])
    .index("by_team_and_date", ["teamId", "createdAt"]),

  // Real-time presence tracking (who's viewing what)
  teamHubPresence: defineTable({
    userId: v.string(), // Better Auth user ID
    organizationId: v.string(), // Better Auth organization ID
    teamId: v.string(), // Better Auth team ID
    currentView: v.optional(v.string()), // e.g., "voice_notes", "player_passport:123"
    lastActive: v.number(), // Timestamp of last activity
  })
    .index("by_user", ["userId"])
    .index("by_team", ["teamId"])
    .index("by_org", ["organizationId"])
    .index("by_user_and_team", ["userId", "teamId"])
    .index("by_team_and_active", ["teamId", "lastActive"]),

  // Activity read status tracking (for notification center)
  activityReadStatus: defineTable({
    userId: v.string(), // User who read the activity
    activityId: v.id("teamActivityFeed"), // Activity that was read
    organizationId: v.string(), // Organization context
    readAt: v.number(), // Timestamp when marked as read
  })
    .index("by_user", ["userId"])
    .index("by_activity", ["activityId"])
    .index("by_user_and_activity", ["userId", "activityId"]),

  // Team Decisions - Democratic voting on team matters (P9 Week 3)
  teamDecisions: defineTable({
    organizationId: v.string(),
    teamId: v.string(),
    createdBy: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    options: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        description: v.optional(v.string()),
      })
    ),
    votingType: v.union(v.literal("simple"), v.literal("weighted")),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("finalized")
    ),
    deadline: v.optional(v.number()),
    finalizedAt: v.optional(v.number()),
    finalizedBy: v.optional(v.string()),
    winningOption: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_team_and_status", ["teamId", "status"])
    .index("by_org", ["organizationId"])
    .index("by_org_and_status", ["organizationId", "status"]),

  // Decision Votes - Individual votes on team decisions (P9 Week 3)
  decisionVotes: defineTable({
    decisionId: v.id("teamDecisions"),
    userId: v.string(),
    optionId: v.string(),
    weight: v.number(),
    comment: v.optional(v.string()),
    votedAt: v.number(),
  })
    .index("by_decision", ["decisionId"])
    .index("by_decision_and_user", ["decisionId", "userId"])
    .index("by_user", ["userId"]),

  // ============================================================
  // TEAM OBSERVATIONS
  // Structured storage for team-level insights from voice notes
  // ============================================================
  teamObservations: defineTable({
    organizationId: v.string(), // Better Auth organization ID
    teamId: v.string(), // Better Auth team ID
    teamName: v.string(), // Denormalized for display

    // Source tracking
    source: v.union(
      v.literal("voice_note"), // From voice note insight
      v.literal("manual") // Manually added by coach
    ),
    voiceNoteId: v.optional(v.id("voiceNotes")), // Link to voice note if from voice note
    insightId: v.optional(v.string()), // Link to specific insight

    // Coach who created/recorded
    coachId: v.string(), // Better Auth user ID
    coachName: v.string(), // Denormalized for display

    // Observation content
    title: v.string(),
    description: v.string(),
    category: v.optional(v.string()), // e.g., "team_culture", "team_performance"

    // Metadata
    dateObserved: v.string(), // ISO date string
    createdAt: v.number(),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_teamId", ["teamId"])
    .index("by_organizationId_and_teamId", ["organizationId", "teamId"])
    .index("by_voiceNoteId", ["voiceNoteId"]),

  // ============================================================
  // COACH-PARENT MESSAGING
  // Secure, auditable messaging between coaches and parents
  // ============================================================

  // Main message storage
  coachParentMessages: defineTable({
    // Message classification
    messageType: v.union(
      v.literal("direct"), // Coach-initiated message
      v.literal("insight") // Derived from voice note insight
    ),

    // Organization and team context
    organizationId: v.string(), // Better Auth organization ID
    teamId: v.optional(v.string()), // Better Auth team ID (optional)

    // Sender info
    senderId: v.string(), // Better Auth user ID of coach
    senderName: v.string(), // Coach name for display

    // Recipients (multiple guardians can receive same message)
    recipientGuardianIds: v.array(v.id("guardianIdentities")),

    // Player context
    playerIdentityId: v.id("playerIdentities"),
    playerName: v.string(), // Denormalized for display

    // Message content
    subject: v.string(),
    body: v.string(),

    // Session context (optional)
    context: v.optional(
      v.object({
        sessionType: v.optional(v.string()), // "training", "match", "general"
        sessionDate: v.optional(v.string()),
        developmentArea: v.optional(v.string()),
      })
    ),

    // Source tracking (for insight-derived messages)
    sourceVoiceNoteId: v.optional(v.id("voiceNotes")),
    sourceInsightId: v.optional(v.string()), // insight.id from voiceNote.insights array
    originalInsight: v.optional(
      v.object({
        title: v.string(),
        description: v.string(),
        category: v.optional(v.string()),
        recommendedUpdate: v.optional(v.string()),
      })
    ),

    // AI-generated discussion prompts for parents
    discussionPrompts: v.optional(v.array(v.string())),
    actionItems: v.optional(v.array(v.string())),

    // Delivery configuration
    deliveryMethod: v.union(
      v.literal("in_app"), // In-app notification only
      v.literal("email"), // Email only
      v.literal("both") // Both channels
    ),
    priority: v.union(v.literal("normal"), v.literal("high")),

    // Status tracking
    status: v.union(
      v.literal("draft"), // Not yet sent
      v.literal("pending_approval"), // Awaiting admin approval
      v.literal("sent"), // Sent to recipients
      v.literal("delivered"), // All recipients delivered
      v.literal("failed") // Delivery failed
    ),

    // Timestamps
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_sender", ["senderId"])
    .index("by_player", ["playerIdentityId"])
    .index("by_status", ["status"])
    .index("by_org_and_status", ["organizationId", "status"])
    .index("by_sender_and_createdAt", ["senderId", "createdAt"])
    .index("by_voiceNote", ["sourceVoiceNoteId"]),

  // Per-recipient delivery tracking
  messageRecipients: defineTable({
    messageId: v.id("coachParentMessages"),
    guardianIdentityId: v.id("guardianIdentities"),
    guardianUserId: v.optional(v.string()), // Better Auth user ID (if guardian is registered)

    // Delivery status
    deliveryStatus: v.union(
      v.literal("pending"), // Not yet sent
      v.literal("sent"), // Sent but not confirmed delivered
      v.literal("delivered"), // Confirmed delivered
      v.literal("failed"), // Delivery failed
      v.literal("bounced") // Email bounced
    ),
    deliveryMethod: v.union(v.literal("in_app"), v.literal("email")),

    // Email tracking
    emailSentAt: v.optional(v.number()),
    emailDeliveredAt: v.optional(v.number()),
    emailOpenedAt: v.optional(v.number()),
    emailBouncedAt: v.optional(v.number()),
    emailBounceReason: v.optional(v.string()),

    // In-app tracking
    inAppNotifiedAt: v.optional(v.number()),
    inAppViewedAt: v.optional(v.number()),

    // Parent acknowledgment
    acknowledgedAt: v.optional(v.number()),
    acknowledgmentNote: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_guardian", ["guardianIdentityId"])
    .index("by_guardianUser", ["guardianUserId"])
    .index("by_status", ["deliveryStatus"])
    .index("by_guardian_and_viewed", ["guardianIdentityId", "inAppViewedAt"]),

  // Audit trail for compliance
  messageAuditLog: defineTable({
    messageId: v.id("coachParentMessages"),
    organizationId: v.string(), // Denormalized for efficient org-wide queries

    // Action type
    action: v.union(
      v.literal("created"),
      v.literal("edited"),
      v.literal("sent"),
      v.literal("viewed"),
      v.literal("acknowledged"),
      v.literal("deleted"),
      v.literal("exported"),
      v.literal("flagged"),
      v.literal("reviewed")
    ),

    // Actor
    actorId: v.string(), // Better Auth user ID
    actorType: v.union(
      v.literal("coach"),
      v.literal("parent"),
      v.literal("admin"),
      v.literal("system")
    ),
    actorName: v.string(),

    // Action details
    details: v.optional(
      v.object({
        previousContent: v.optional(v.string()),
        newContent: v.optional(v.string()),
        reason: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),

    // Timestamp
    timestamp: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_org", ["organizationId"])
    .index("by_actor", ["actorId"])
    .index("by_org_and_timestamp", ["organizationId", "timestamp"])
    .index("by_action", ["action"]),

  // Organization-level messaging configuration
  orgMessagingSettings: defineTable({
    organizationId: v.string(), // Better Auth organization ID

    // Feature toggles
    messagingEnabled: v.boolean(),
    voiceNoteInsightsEnabled: v.boolean(),

    // Default settings
    defaultDeliveryMethod: v.union(
      v.literal("in_app"),
      v.literal("email"),
      v.literal("both")
    ),
    allowCoachToChangeDelivery: v.boolean(),

    // Message requirements
    requireSubject: v.boolean(),
    maxMessageLength: v.optional(v.number()),

    // Approval workflow
    requireAdminApproval: v.boolean(),

    // Data retention
    retentionDays: v.optional(v.number()), // Auto-delete messages after N days

    // Audit settings
    enableDetailedAuditLog: v.boolean(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["organizationId"]),

  // AI-generated parent summaries from coach voice notes
  // Coach reviews and approves summaries before they reach parents
  coachParentSummaries: defineTable({
    // Source references
    voiceNoteId: v.id("voiceNotes"),
    insightId: v.string(), // ID of the insight within the voiceNote

    // Context
    coachId: v.string(), // Better Auth user ID
    playerIdentityId: v.id("playerIdentities"),
    organizationId: v.string(), // Better Auth organization ID
    sportId: v.id("sports"),

    // Private coach insight (not shown to parents)
    privateInsight: v.object({
      title: v.string(),
      description: v.string(),
      category: v.string(), // e.g., "Skill Development", "Tactical Awareness"
      sentiment: v.union(
        v.literal("positive"),
        v.literal("neutral"),
        v.literal("concern")
      ),
    }),

    // Public parent-friendly summary
    publicSummary: v.object({
      content: v.string(), // AI-generated parent-friendly text
      confidenceScore: v.number(), // 0-1, how confident AI is in the summary
      generatedAt: v.number(),
    }),

    // Sensitivity classification
    sensitivityCategory: v.union(
      v.literal("normal"), // Standard feedback
      v.literal("injury"), // Injury-related, requires manual review
      v.literal("behavior") // Behavioral concern, requires manual review
    ),
    sensitivityReason: v.optional(v.string()), // AI explanation for classification
    sensitivityConfidence: v.optional(v.number()), // 0-1, AI confidence in classification

    // Workflow status
    status: v.union(
      v.literal("pending_review"), // Awaiting coach approval
      v.literal("approved"), // Coach approved, ready for delivery
      v.literal("suppressed"), // Coach chose not to share
      v.literal("auto_approved"), // Auto-approved (not in phase 1)
      v.literal("delivered"), // Delivered to parent
      v.literal("viewed") // Parent has viewed
    ),

    // Timestamps
    createdAt: v.number(),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.string()), // Better Auth user ID
    deliveredAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()),
    viewedBy: v.optional(v.string()), // Better Auth user ID of parent who viewed
    acknowledgedAt: v.optional(v.number()), // When parent marked as read/acknowledged
    acknowledgedBy: v.optional(v.string()), // Better Auth user ID of parent who acknowledged

    // Auto-approval decision (Phase 2)
    autoApprovalDecision: v.optional(
      v.object({
        shouldAutoApprove: v.boolean(),
        reason: v.string(),
        tier: v.union(
          v.literal("auto_send"),
          v.literal("manual_review"),
          v.literal("flagged")
        ),
        decidedAt: v.number(),
      })
    ),

    // Scheduled delivery (1-hour revoke window)
    scheduledDeliveryAt: v.optional(v.number()), // When summary will be delivered to parent

    // Revocation tracking
    revokedAt: v.optional(v.number()), // When coach revoked auto-approval
    revokedBy: v.optional(v.string()), // userId of coach who revoked
    revocationReason: v.optional(v.string()), // Why coach revoked

    // Override tracking (Phase 4 - Learning Loop)
    // Tracks when coach overrides AI decisions to learn patterns
    overrideType: v.optional(
      v.union(
        v.literal("coach_approved_low_confidence"), // Coach approved despite low confidence (<70%)
        v.literal("coach_rejected_high_confidence"), // Coach rejected despite high confidence (>70%)
        v.literal("coach_edited"), // Coach edited before sending
        v.literal("coach_revoked_auto") // Coach revoked auto-approved summary
      )
    ),
    overrideReason: v.optional(v.string()), // Optional text explanation
    overrideFeedback: v.optional(
      v.object({
        wasInaccurate: v.boolean(), // Summary didn't match voice note
        wasTooSensitive: v.boolean(), // Too sensitive for parent
        timingWasWrong: v.boolean(), // Wrong time to send
        otherReason: v.optional(v.string()), // Free-text other reason
      })
    ),
  })
    .index("by_voiceNote", ["voiceNoteId"])
    .index("by_player", ["playerIdentityId"])
    .index("by_coach", ["coachId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_org_player_sport", [
      "organizationId",
      "playerIdentityId",
      "sportId",
    ])
    .index("by_coach_org_status", ["coachId", "organizationId", "status"])
    .index("by_player_org_status", [
      "playerIdentityId",
      "organizationId",
      "status",
    ])
    .index("by_player_acknowledged", ["playerIdentityId", "acknowledgedAt"])
    .index("by_player_status_created", [
      "playerIdentityId",
      "status",
      "createdAt",
    ]) // Added for N+1 query optimization
    .index("by_status_scheduledDeliveryAt", ["status", "scheduledDeliveryAt"]), // Added for scheduled delivery processing

  // AI usage tracking for cost visibility and analytics (Phase 5.3)
  // Logs every AI API call with token counts and costs
  aiUsageLog: defineTable({
    // When the call was made
    timestamp: v.number(), // Date.now()

    // Context: who and where
    organizationId: v.string(), // Better Auth organization ID (string, not Convex ID)
    coachId: v.string(), // Better Auth user ID of coach who triggered the call
    playerId: v.optional(v.id("orgPlayerEnrollments")), // Which player (if applicable)

    // What was done
    operation: v.string(), // Type of operation: 'parent_summary', 'voice_note_transcription', etc.
    model: v.string(), // Model used: 'claude-3-haiku-20240307', 'claude-3-5-haiku-20241022', etc.

    // Token usage
    inputTokens: v.number(), // Total input tokens sent to API
    cachedTokens: v.number(), // Tokens read from cache (0 if no cache hit)
    outputTokens: v.number(), // Output tokens generated by API

    // Cost (in USD)
    cost: v.number(), // Total cost in dollars (e.g., 0.00015)

    // Cache efficiency
    cacheHitRate: v.number(), // Percentage of input tokens that were cached (0.0-1.0)
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_coachId", ["coachId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_operation", ["operation"])
    .index("by_org_timestamp", ["organizationId", "timestamp"])
    .index("by_coach_timestamp", ["coachId", "timestamp"]),

  // ============================================================
  // PHASE 6.4: PERFORMANCE OPTIMIZATION
  // Pre-aggregated daily AI usage stats for faster dashboard queries
  // ============================================================

  // Daily aggregated AI usage statistics (Phase 6.4 - US-023)
  // Pre-computed daily rollups for 100x faster dashboard queries
  // Cron job runs nightly at 1 AM UTC to aggregate previous day's data
  aiUsageDailyAggregates: defineTable({
    // Date dimension (YYYY-MM-DD format, e.g., "2026-01-25")
    date: v.string(),

    // Organization dimension
    organizationId: v.string(), // Better Auth organization ID

    // Aggregated metrics
    totalCost: v.number(), // Sum of all costs for this org on this date
    totalCalls: v.number(), // Count of API calls
    totalInputTokens: v.number(), // Sum of input tokens
    totalCachedTokens: v.number(), // Sum of cached tokens
    totalOutputTokens: v.number(), // Sum of output tokens
    avgCacheHitRate: v.number(), // Average cache hit rate (0.0-1.0)

    // Metadata
    createdAt: v.number(), // When this aggregate was created (timestamp)
  })
    .index("by_date", ["date"])
    .index("by_org_date", ["organizationId", "date"])
    .index("by_org", ["organizationId"]),

  // ============================================================
  // PHASE 6.1: COST MONITORING & BUDGET CONTROLS
  // Per-org budget tracking with daily/monthly spending caps
  // ============================================================

  // Per-organization cost budgets (Phase 6.1)
  // Tracks spending and enforces daily/monthly limits to prevent runaway costs
  orgCostBudgets: defineTable({
    organizationId: v.string(), // Better Auth organization ID

    // Budget limits (in USD)
    dailyBudgetUsd: v.number(), // Daily spending cap
    monthlyBudgetUsd: v.number(), // Monthly spending cap

    // Alert settings
    alertThresholdPercent: v.number(), // Default 80 - triggers warning at 80% of budget

    // Current spend tracking
    currentDailySpend: v.number(), // Accumulated spend today
    currentMonthlySpend: v.number(), // Accumulated spend this month

    // Reset tracking
    lastResetDate: v.string(), // Last daily reset (YYYY-MM-DD format)
    lastResetMonth: v.string(), // Last monthly reset (YYYY-MM format)

    // Status
    isEnabled: v.boolean(), // Enable/disable budget enforcement
  }).index("by_org", ["organizationId"]),

  // Platform cost alerts audit trail (Phase 6.1)
  // Logs all cost alerts for monitoring and analytics
  platformCostAlerts: defineTable({
    // Alert type and context
    alertType: v.union(
      v.literal("org_daily_threshold"), // Warning: approaching daily limit
      v.literal("org_daily_exceeded"), // Critical: daily limit exceeded
      v.literal("org_monthly_threshold"), // Warning: approaching monthly limit
      v.literal("org_monthly_exceeded"), // Critical: monthly limit exceeded
      v.literal("platform_spike") // Critical: unusual platform-wide spike
    ),
    organizationId: v.optional(v.string()), // Which org (null for platform-wide alerts)

    // Alert severity
    severity: v.union(v.literal("warning"), v.literal("critical")),

    // Alert details
    message: v.string(), // Human-readable alert message
    triggerValue: v.number(), // Current value that triggered alert (e.g., current spend)
    thresholdValue: v.number(), // Threshold value that was exceeded

    // Timestamps
    timestamp: v.number(), // When alert was created

    // Acknowledgment tracking
    acknowledged: v.boolean(), // Has this been reviewed by platform staff?
    acknowledgedBy: v.optional(v.string()), // User ID who acknowledged
    acknowledgedAt: v.optional(v.number()), // When acknowledged
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_org", ["organizationId"])
    .index("by_severity_ack", ["severity", "acknowledged"]),

  // Rate limiting infrastructure (Phase 6.1)
  // Tracks API usage limits to prevent abuse or runaway loops
  rateLimits: defineTable({
    // Scope definition
    scope: v.union(v.literal("platform"), v.literal("organization")),
    scopeId: v.string(), // 'platform' for global limits, organizationId for org-specific

    // Limit type
    limitType: v.union(
      v.literal("messages_per_hour"), // Message count limit per hour
      v.literal("messages_per_day"), // Message count limit per day
      v.literal("cost_per_hour"), // Cost limit per hour (in USD)
      v.literal("cost_per_day") // Cost limit per day (in USD)
    ),

    // Limit value and current usage
    limitValue: v.number(), // Maximum allowed (count or cost in USD)
    currentCount: v.number(), // Current message count in window
    currentCost: v.number(), // Current cost in window (USD)

    // Rolling window tracking
    windowStart: v.number(), // Window start timestamp
    windowEnd: v.number(), // Window end timestamp
    lastResetAt: v.number(), // Last time counters were reset
  }).index("by_scope_type", ["scope", "scopeId", "limitType"]),

  // ============================================================
  // PHASE 6.2: GRACEFUL DEGRADATION & CIRCUIT BREAKER
  // Track AI service health and implement circuit breaker pattern
  // ============================================================

  // AI service health tracking (Phase 6.2)
  // Singleton table - only one record tracks Anthropic API health
  // Circuit breaker: stops calling failing API after threshold
  aiServiceHealth: defineTable({
    // Service identifier (singleton - always 'anthropic')
    service: v.literal("anthropic"),

    // Current health status
    status: v.union(
      v.literal("healthy"), // Normal operation
      v.literal("degraded"), // Some failures but not critical
      v.literal("down") // Service unavailable
    ),

    // Timestamp tracking
    lastSuccessAt: v.number(), // Last successful API call timestamp
    lastFailureAt: v.number(), // Last failed API call timestamp

    // Failure tracking for circuit breaker
    recentFailureCount: v.number(), // Count of failures in current window
    failureWindow: v.number(), // Time window for failure counting (default 5 minutes)

    // Circuit breaker state
    circuitBreakerState: v.union(
      v.literal("closed"), // Normal operation, API calls allowed
      v.literal("open"), // Too many failures, API calls blocked
      v.literal("half_open") // Testing if service recovered
    ),

    // Last health check
    lastCheckedAt: v.number(), // Last time health was evaluated
  }),
  // No indexes needed - singleton table with only one record

  // Platform-wide messaging and AI feature settings
  // Singleton table - only one record controls all platform settings
  platformMessagingSettings: defineTable({
    // Setting identifier (singleton - always 'global')
    settingId: v.literal("global"),

    // Feature toggles - control individual AI features
    aiGenerationEnabled: v.boolean(), // Enable/disable AI summary generation
    autoApprovalEnabled: v.boolean(), // Enable/disable auto-approval for trusted coaches
    parentNotificationsEnabled: v.boolean(), // Enable/disable parent notifications

    // Emergency controls
    emergencyMode: v.boolean(), // Emergency kill switch - disables ALL AI features
    emergencyMessage: v.optional(v.string()), // Message shown to users when emergency mode active

    // Audit tracking
    lastUpdatedAt: v.number(), // Last time settings were modified
    lastUpdatedBy: v.optional(v.id("user")), // Platform staff who made the change
  }),
  // No indexes needed - singleton table with only one record

  // Track when parents view summaries
  parentSummaryViews: defineTable({
    summaryId: v.id("coachParentSummaries"),
    guardianIdentityId: v.id("guardianIdentities"),
    viewedAt: v.number(),
    viewSource: v.union(
      v.literal("dashboard"),
      v.literal("notification_click"),
      v.literal("direct_link")
    ),
  })
    .index("by_summary", ["summaryId"])
    .index("by_guardian", ["guardianIdentityId"]),

  // Track when parents share summaries
  summaryShares: defineTable({
    summaryId: v.id("coachParentSummaries"),
    guardianIdentityId: v.id("guardianIdentities"),
    sharedAt: v.number(),
    shareDestination: v.union(
      v.literal("download"),
      v.literal("native_share"),
      v.literal("copy_link")
    ),
  })
    .index("by_summary", ["summaryId"])
    .index("by_guardian", ["guardianIdentityId"]),

  // Coach Trust Levels - PLATFORM-WIDE (one record per coach across all orgs)
  // Trust is earned globally based on approval/suppression patterns
  // Level 0 (New): Manual review for all summaries
  // Level 1 (Learning): Quick review with AI suggestions (10+ approvals)
  // Level 2 (Trusted): Auto-approve normal, review sensitive (50+ approvals, <10% suppression)
  // Level 3 (Expert): Full automation, requires opt-in (200+ approvals)
  coachTrustLevels: defineTable({
    // Identity - one record per coach (platform-wide)
    coachId: v.string(), // Better Auth user ID

    // Current trust state
    currentLevel: v.number(), // 0-3, current automation level
    preferredLevel: v.optional(v.number()), // 0-3, coach's max desired level (caps auto-upgrade)

    // Metrics for calculating trust level (aggregated across all orgs)
    totalApprovals: v.number(), // Count of approved summaries
    totalSuppressed: v.number(), // Count of suppressed summaries
    consecutiveApprovals: v.number(), // Current streak of approvals (resets on suppress)

    // Level change history
    levelHistory: v.array(
      v.object({
        level: v.number(), // New level achieved
        changedAt: v.number(), // Timestamp
        reason: v.string(), // e.g., "Reached 50 approvals", "Coach opted down to level 1"
      })
    ),

    // Activity tracking
    lastActivityAt: v.optional(v.number()), // Last time metrics were updated
    createdAt: v.number(),
    updatedAt: v.number(),

    // Preview mode tracking (Phase 5 - Parent Summaries)
    previewModeStats: v.optional(
      v.object({
        wouldAutoApproveSuggestions: v.number(), // Count of summaries AI would auto-approve
        coachApprovedThose: v.number(), // Of those suggestions, how many coach approved
        coachRejectedThose: v.number(), // Of those suggestions, how many coach suppressed
        agreementRate: v.number(), // coachApprovedThose / wouldAutoApproveSuggestions
        startedAt: v.number(), // When preview mode started
        completedAt: v.optional(v.number()), // When 20 summaries reviewed (undefined until then)
      })
    ),
    confidenceThreshold: v.optional(v.number()), // Minimum confidence score for parent summary auto-approval (default 0.7)
    personalizedThreshold: v.optional(v.number()), // Phase 4: AI-learned threshold based on coach patterns (overrides confidenceThreshold if set)

    // Phase 7: Insight auto-apply tracking (separate from parent summaries)
    // Coaches may trust AI differently for summaries vs player profile updates
    insightPreviewModeStats: v.optional(
      v.object({
        wouldAutoApplyInsights: v.number(), // Count of insights AI would auto-apply
        coachAppliedThose: v.number(), // Of those, how many coach applied
        coachDismissedThose: v.number(), // Of those, how many coach dismissed
        agreementRate: v.number(), // coachAppliedThose / wouldAutoApplyInsights
        startedAt: v.number(), // When insight preview mode started
        completedAt: v.optional(v.number()), // After 20 insights reviewed
      })
    ),
    insightConfidenceThreshold: v.optional(v.number()), // Minimum confidence for insight auto-apply (default 0.7, separate from summary threshold)
    insightAutoApplyPreferences: v.optional(
      v.object({
        skills: v.boolean(), // Auto-apply skill rating updates
        attendance: v.boolean(), // Auto-apply attendance records
        goals: v.boolean(), // Auto-apply development goal updates
        performance: v.boolean(), // Auto-apply performance notes
        // injury and medical always excluded (never auto-apply)
      })
    ),
  }).index("by_coach", ["coachId"]),

  // Coach Per-Org Preferences - settings that vary by organization
  // Separate from trust level which is platform-wide
  coachOrgPreferences: defineTable({
    coachId: v.string(), // Better Auth user ID
    organizationId: v.string(), // Better Auth organization ID

    // Feature toggles (per-org)
    parentSummariesEnabled: v.optional(v.boolean()), // Generate parent summaries (default true)
    aiInsightMatchingEnabled: v.optional(v.boolean()), // Auto-match players, classify insights (default true)
    autoApplyInsightsEnabled: v.optional(v.boolean()), // Auto-apply skill ratings, injuries (default true)
    skipSensitiveInsights: v.optional(v.boolean()), // Skip injury/behavior from summaries (default false)
    parentSummaryTone: v.optional(
      v.union(v.literal("warm"), v.literal("professional"), v.literal("brief"))
    ), // Tone for AI-generated parent summaries (default warm)

    // Trust Gate Individual Override (P8 Week 1.5)
    trustGateOverride: v.optional(v.boolean()), // true = bypass gates, false/null = follow org
    overrideGrantedBy: v.optional(v.string()), // Admin or platform staff user ID
    overrideGrantedAt: v.optional(v.number()),
    overrideReason: v.optional(v.string()), // Why this coach got bypass
    overrideExpiresAt: v.optional(v.number()), // Optional: time-boxed access

    // AI Control Rights - Coach Self-Service Access (P8 Week 1.5)
    // Renamed from parentAccessEnabled - grants control over ALL AI automation features
    aiControlRightsEnabled: v.optional(v.boolean()), // Coach granted rights to control AI features
    grantedBy: v.optional(v.string()), // Admin/platform staff who granted rights
    grantedAt: v.optional(v.number()), // When rights were granted
    grantNote: v.optional(v.string()), // Admin's note when granting
    revokedBy: v.optional(v.string()), // Who revoked rights
    revokedAt: v.optional(v.number()), // When rights were revoked
    revokeReason: v.optional(v.string()), // Why rights were revoked

    // Admin Block Individual Coach from AI (P8 Week 1.5)
    // Renamed from adminBlocked - blocks ALL AI automation features
    adminBlockedFromAI: v.optional(v.boolean()), // Admin blocked this coach from AI features
    blockReason: v.optional(v.string()), // Why admin blocked
    blockedBy: v.optional(v.string()), // User ID who blocked
    blockedAt: v.optional(v.number()), // When blocked

    // Notification Preferences (P9 Week 2)
    // Channels per priority level: critical, important, normal
    // Values: "push", "email", "digest", "none"
    notificationChannels: v.optional(
      v.object({
        critical: v.array(v.string()), // Default: ["push", "email"]
        important: v.array(v.string()), // Default: ["push", "email"]
        normal: v.array(v.string()), // Default: ["push", "email"]
      })
    ),
    // Daily digest schedule (e.g., send batched notifications at 08:00)
    digestSchedule: v.optional(
      v.object({
        enabled: v.boolean(), // Default: false
        time: v.string(), // 24h format (e.g., "08:00")
      })
    ),
    // Quiet hours - suppress notifications during specified time range
    quietHours: v.optional(
      v.object({
        enabled: v.boolean(), // Default: false
        start: v.string(), // 24h format (e.g., "22:00")
        end: v.string(), // 24h format (e.g., "08:00")
      })
    ),

    // Team Insights View Preference (P9 Week 3)
    teamInsightsViewPreference: v.optional(
      v.union(
        v.literal("list"),
        v.literal("board"),
        v.literal("calendar"),
        v.literal("players")
      )
    ), // Default: "list"

    // Mobile Gesture Preferences (P9 Week 3)
    gesturesEnabled: v.optional(v.boolean()), // Default: true
    swipeRightAction: v.optional(
      v.union(v.literal("apply"), v.literal("dismiss"), v.literal("disabled"))
    ), // Default: "apply"
    swipeLeftAction: v.optional(
      v.union(v.literal("apply"), v.literal("dismiss"), v.literal("disabled"))
    ), // Default: "dismiss"

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_coach_org", ["coachId", "organizationId"])
    .index("by_coach", ["coachId"])
    .index("by_org", ["organizationId"]),

  // Injury Approval Checklist Responses
  // Audit trail for coach due diligence on injury-related summaries
  // Tracks that coach personally observed injury, verified severity, and ensured no medical advice
  injuryApprovalChecklist: defineTable({
    summaryId: v.id("coachParentSummaries"), // Link to the summary
    coachId: v.string(), // Better Auth user ID of approving coach

    // Checklist responses (all must be true to approve)
    personallyObserved: v.boolean(), // "I personally observed this injury"
    severityAccurate: v.boolean(), // "The severity description is accurate"
    noMedicalAdvice: v.boolean(), // "This contains no medical advice"

    // Timestamp
    completedAt: v.number(), // When checklist was completed
  }).index("by_summary", ["summaryId"]),

  // Organization Admin Permissions (P8 Week 1.5)
  // Tracks which admins have been delegated permission to manage feature flags
  orgAdminPermissions: defineTable({
    organizationId: v.string(),
    memberId: v.string(), // Admin member ID from member table
    canManageFeatureFlags: v.boolean(),
    canManageCoachOverrides: v.boolean(),
    grantedBy: v.string(), // Platform staff user ID who granted
    grantedAt: v.number(),
  }).index("by_org_member", ["organizationId", "memberId"]),

  // Coach Override Requests (P8 Week 1.5)
  // Request workflow for coaches to request trust gate bypass from admins
  coachOverrideRequests: defineTable({
    coachId: v.string(),
    organizationId: v.string(),
    featureType: v.string(), // "trust_gates" for now
    reason: v.string(), // Coach's justification
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("expired")
    ),
    requestedAt: v.number(),
    reviewedBy: v.optional(v.string()), // Admin who reviewed
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()), // Admin's notes
  })
    .index("by_coach_org", ["coachId", "organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_coach", ["coachId"]),

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

    // YouTube-style voting (likes visible, dislikes hidden)
    likeCount: v.optional(v.number()), // Public like count
    dislikeCount: v.optional(v.number()), // Hidden dislike count for algorithm

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

    // Library vs Cache distinction (Issue #234 follow-up)
    // When false/undefined: Plan is cached for Quick Actions blue badge but NOT shown in library
    // When true: Plan is explicitly saved to library and shown in My Plans
    savedToLibrary: v.optional(v.boolean()),

    // Regeneration tracking (Issue #234)
    // When true: Plan was created via "Regenerate Plan" button (not initial generation)
    isRegenerated: v.optional(v.boolean()),

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

  // Plan Votes - YouTube-style like/dislike tracking for session plans
  planVotes: defineTable({
    planId: v.id("sessionPlans"),
    voterId: v.string(), // User ID who voted
    voteType: v.union(v.literal("like"), v.literal("dislike")),
    votedAt: v.number(),
  })
    .index("by_plan", ["planId"])
    .index("by_voter", ["voterId"])
    .index("by_plan_and_voter", ["planId", "voterId"]),

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

  // ============================================================
  // PASSPORT SHARING SYSTEM
  // Cross-organization passport sharing with parent consent and coach acceptance
  // See: docs/features/PRD-passport-sharing.md
  // ============================================================

  // Passport Share Consents
  // Records explicit sharing consent from guardian/adult player
  // One record per guardian-player-receiving_org combination
  passportShareConsents: defineTable({
    // Who is sharing
    playerIdentityId: v.id("playerIdentities"),
    grantedBy: v.string(), // userId of guardian or adult player
    grantedByType: v.union(v.literal("guardian"), v.literal("self")),
    guardianIdentityId: v.optional(v.id("guardianIdentities")), // If guardian

    // HOW sharing was initiated (analytics/tracking)
    initiationType: v.optional(
      v.union(
        v.literal("parent_initiated"), // Parent proactively shared via wizard
        v.literal("coach_requested") // Parent approved a coach access request
      )
    ),
    sourceRequestId: v.optional(v.id("passportShareRequests")), // Link to original request if coach_requested

    // Where data comes from (can be all orgs or specific)
    sourceOrgMode: v.union(
      v.literal("all_enrolled"), // All orgs player is enrolled in
      v.literal("specific_orgs") // Only selected orgs
    ),
    sourceOrgIds: v.optional(v.array(v.string())), // If specific_orgs mode

    // Who can see the data
    receivingOrgId: v.string(), // The org receiving shared access

    // What can be seen (granular element control)
    sharedElements: v.object({
      basicProfile: v.boolean(), // Name, age group, photo
      skillRatings: v.boolean(), // Skill assessments
      skillHistory: v.boolean(), // Historical ratings
      developmentGoals: v.boolean(), // Goals & milestones
      coachNotes: v.boolean(), // Public coach notes
      benchmarkData: v.boolean(), // Benchmark comparisons
      attendanceRecords: v.boolean(), // Training/match attendance
      injuryHistory: v.boolean(), // Injury records (safety-critical)
      medicalSummary: v.boolean(), // Medical profile summary
      contactInfo: v.boolean(), // Guardian/coach contact for coordination
    }),

    // Cross-Sport Visibility (granular control over multi-sport passports)
    allowCrossSportVisibility: v.optional(v.boolean()), // Whether receiving org can see player has other sport passports
    visibleSportCodes: v.optional(v.array(v.string())), // Which specific sports to make visible (if cross-sport visibility enabled)

    // Consent lifecycle
    consentedAt: v.number(), // Timestamp of consent
    expiresAt: v.number(), // When consent expires
    renewalReminderSent: v.boolean(), // Whether reminder was sent

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("revoked"),
      v.literal("suspended") // Platform intervention
    ),
    revokedAt: v.optional(v.number()),
    revokedReason: v.optional(v.string()),

    // Renewal tracking
    renewalCount: v.number(), // How many times renewed
    lastRenewedAt: v.optional(v.number()),

    // Coach Acceptance
    coachAcceptanceStatus: v.union(
      v.literal("pending"), // Awaiting coach acceptance
      v.literal("accepted"), // Coach accepted the share
      v.literal("declined") // Coach declined the share
    ),
    acceptedByCoachId: v.optional(v.string()),
    acceptedAt: v.optional(v.number()),
    declinedAt: v.optional(v.number()),
    declineReason: v.optional(v.string()),
    declineCount: v.optional(v.number()), // Track repeated declines for cooling-off

    // Age 18 Transition
    pausedForAge18Review: v.optional(v.boolean()), // True when player turns 18
    age18ReviewCompletedAt: v.optional(v.number()),

    // Metadata
    consentVersion: v.string(), // Version of consent terms accepted
    ipAddress: v.optional(v.string()), // For audit purposes
  })
    .index("by_player", ["playerIdentityId"])
    .index("by_player_and_status", ["playerIdentityId", "status"])
    .index("by_receiving_org", ["receivingOrgId"])
    .index("by_granted_by", ["grantedBy"])
    .index("by_expiry", ["status", "expiresAt"])
    .index("by_coach_acceptance", ["receivingOrgId", "coachAcceptanceStatus"]),

  // Passport Share Access Logs
  // Immutable audit trail of all access to shared passport data
  passportShareAccessLogs: defineTable({
    consentId: v.id("passportShareConsents"),
    playerIdentityId: v.id("playerIdentities"),

    // Who accessed
    accessedBy: v.string(), // userId
    accessedByName: v.string(), // Denormalized for audit
    accessedByRole: v.string(), // coach, admin, etc.
    accessedByOrgId: v.string(), // Better Auth organization ID
    accessedByOrgName: v.string(), // Denormalized for audit

    // What was accessed
    accessType: v.union(
      v.literal("view_summary"), // Viewed shared passport overview
      v.literal("view_skills"), // Viewed skill details
      v.literal("view_goals"), // Viewed development goals
      v.literal("view_notes"), // Viewed coach notes
      v.literal("view_medical"), // Viewed medical/injury info
      v.literal("view_contact"), // Viewed contact information
      v.literal("export_pdf"), // Exported shared data as PDF
      v.literal("view_insights") // Viewed AI insights
    ),

    // Context
    accessedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),

    // Source information
    sourceOrgId: v.optional(v.string()), // Which org's data was viewed
  })
    .index("by_consent", ["consentId"])
    .index("by_player", ["playerIdentityId"])
    .index("by_accessor", ["accessedBy"])
    .index("by_date", ["accessedAt"]),

  // Passport Share Requests
  // Coach-initiated requests for passport access
  passportShareRequests: defineTable({
    // Target player
    playerIdentityId: v.id("playerIdentities"),

    // Requesting coach/org
    requestedBy: v.string(), // userId of coach
    requestedByName: v.string(), // Denormalized for display
    requestedByRole: v.string(), // e.g., "Head Coach"
    requestingOrgId: v.string(), // Better Auth organization ID
    requestingOrgName: v.string(), // Denormalized for display

    // Request details
    reason: v.optional(v.string()), // Why coach wants access

    // Request lifecycle
    status: v.union(
      v.literal("pending"), // Awaiting parent response
      v.literal("approved"), // Parent approved, consent flow started
      v.literal("declined"), // Parent declined
      v.literal("expired") // Auto-expired after 14 days
    ),

    // Timestamps
    requestedAt: v.number(),
    respondedAt: v.optional(v.number()),
    respondedBy: v.optional(v.string()), // userId of responding guardian
    expiresAt: v.number(), // Auto-expire timestamp (14 days)

    // Resulting consent (if approved)
    resultingConsentId: v.optional(v.id("passportShareConsents")),
  })
    .index("by_player", ["playerIdentityId"])
    .index("by_player_and_status", ["playerIdentityId", "status"])
    .index("by_requesting_org", ["requestingOrgId"])
    .index("by_expiry", ["status", "expiresAt"]),

  // Organization-to-Organization Passport Enquiries
  // Coaches can send enquiries to other organizations about shared players
  passportEnquiries: defineTable({
    // Target player
    playerIdentityId: v.id("playerIdentities"),
    playerName: v.string(), // Denormalized for display

    // Source organization (where the enquiry is coming FROM)
    sourceOrgId: v.string(), // Better Auth organization ID
    sourceOrgName: v.string(), // Denormalized for display
    sourceUserId: v.string(), // Coach sending enquiry
    sourceUserName: v.string(), // Denormalized
    sourceUserEmail: v.string(), // Denormalized

    // Target organization (where the enquiry is going TO)
    targetOrgId: v.string(), // Organization being enquired about
    targetOrgName: v.string(), // Denormalized for display

    // Enquiry details
    subject: v.string(), // e.g., "Request training schedule info"
    message: v.string(), // Full enquiry message
    contactPreference: v.union(v.literal("email"), v.literal("phone")), // How coach wants to be contacted

    // Enquiry lifecycle
    status: v.union(
      v.literal("open"), // New enquiry
      v.literal("processing"), // Admin is working on it
      v.literal("closed") // Admin has resolved it
    ),

    // Resolution details
    closedAt: v.optional(v.number()),
    closedBy: v.optional(v.string()), // userId of admin who closed it
    closedByName: v.optional(v.string()), // Denormalized
    resolution: v.optional(v.string()), // What action was taken (required when closing)

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_target_org", ["targetOrgId"])
    .index("by_target_org_and_status", ["targetOrgId", "status"])
    .index("by_source_org", ["sourceOrgId"])
    .index("by_player", ["playerIdentityId"])
    .index("by_status", ["status"]),

  // Parent Notification Preferences
  // Customizable notification settings for parents
  parentNotificationPreferences: defineTable({
    guardianIdentityId: v.id("guardianIdentities"),
    playerIdentityId: v.optional(v.id("playerIdentities")), // null = global default

    // Access notification frequency
    accessNotificationFrequency: v.union(
      v.literal("realtime"), // Immediate notification on every access
      v.literal("daily"), // Daily digest
      v.literal("weekly"), // Weekly digest (default)
      v.literal("none") // No access notifications
    ),

    // Other notification preferences
    notifyOnCoachRequest: v.optional(v.boolean()), // Default: true
    notifyOnShareExpiring: v.optional(v.boolean()), // Default: true
    notifyOnGuardianChange: v.optional(v.boolean()), // Default: true
    allowEnrollmentVisibility: v.optional(v.boolean()), // Legacy field - will be removed after production cleanup

    updatedAt: v.number(),
  })
    .index("by_guardian", ["guardianIdentityId"])
    .index("by_guardian_and_player", [
      "guardianIdentityId",
      "playerIdentityId",
    ]),

  // Passport Share Notifications
  // In-app notification records for sharing events
  passportShareNotifications: defineTable({
    userId: v.string(), // Recipient (Better Auth user ID)

    // Notification type
    notificationType: v.union(
      v.literal("share_enabled"), // Someone shared passport with your org
      v.literal("share_revoked"), // Share was revoked
      v.literal("share_expiring"), // Reminder that share is expiring
      v.literal("share_expired"), // Share has expired
      v.literal("coach_acceptance_pending"), // Coach needs to accept share
      v.literal("coach_accepted"), // Coach accepted share offer
      v.literal("coach_declined"), // Coach declined share offer
      v.literal("share_request"), // Coach requested access to passport
      v.literal("guardian_change"), // Another guardian modified sharing
      v.literal("access_alert") // Someone accessed shared data (for digest notifications)
    ),

    // References
    consentId: v.optional(v.id("passportShareConsents")),
    playerIdentityId: v.optional(v.id("playerIdentities")),
    requestId: v.optional(v.id("passportShareRequests")),

    // Content
    title: v.string(),
    message: v.string(),
    actionUrl: v.optional(v.string()), // Optional URL for navigation

    // Status
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "notificationType"])
    .index("by_user_unread", ["userId", "readAt"])
    .index("by_consent", ["consentId"])
    .index("by_player", ["playerIdentityId"]),

  // Admin Notifications
  // In-app notifications for organization admins
  adminNotifications: defineTable({
    userId: v.string(), // Recipient (Better Auth user ID)
    organizationId: v.string(), // Organization context

    // Notification type
    notificationType: v.union(
      v.literal("child_declined"), // Parent declined a child link
      v.literal("invitation_requested"), // User requested new invitation
      v.literal("member_joined"), // New member joined organization
      v.literal("guardian_added") // New guardian added to player
    ),

    // References
    guardianPlayerLinkId: v.optional(v.id("guardianPlayerLinks")),
    invitationRequestId: v.optional(v.id("invitationRequests")),

    // Content
    title: v.string(),
    message: v.string(),
    actionUrl: v.optional(v.string()), // URL for navigation

    // Status
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_org", ["userId", "organizationId"])
    .index("by_org", ["organizationId"])
    .index("by_user_unread", ["userId", "readAt"]),

  // User Notifications (Real-time Toast Notifications)
  // General-purpose notifications for all users - role grants, team assignments, etc.
  notifications: defineTable({
    userId: v.string(), // Recipient (Better Auth user ID)
    organizationId: v.string(), // Organization context
    type: v.union(
      v.literal("role_granted"), // User granted Admin/Coach role
      v.literal("team_assigned"), // Coach assigned to team
      v.literal("team_removed"), // Coach removed from team
      v.literal("child_declined"), // Admin notified parent declined child
      v.literal("invitation_request") // Admin notified of invitation request
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()), // URL for navigation
    createdAt: v.number(),
    seenAt: v.optional(v.number()), // null means unseen
    dismissedAt: v.optional(v.number()), // When manually dismissed
  })
    .index("by_user_unseen", ["userId", "seenAt"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_org_type", ["organizationId", "type"]),

  // ============================================================
  // USER PREFERENCES & USAGE TRACKING
  // Stores user preferences for default org/role and tracks
  // usage patterns for smart defaults
  // ============================================================

  userPreferences: defineTable({
    userId: v.string(), // Better Auth user ID

    // Landing page defaults
    defaultOrganizationId: v.optional(v.string()),
    defaultRole: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("coach"),
        v.literal("parent"),
        v.literal("player")
      )
    ),
    defaultPage: v.optional(v.string()), // e.g., "/dashboard", "/teams", etc.

    // Legacy field names (for backwards compatibility with existing data)
    preferredDefaultOrg: v.optional(v.string()),
    preferredDefaultRole: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("coach"),
        v.literal("parent"),
        v.literal("player")
      )
    ),

    // Usage tracking for smart defaults
    // Array of org access history with frequency scoring
    orgAccessHistory: v.optional(
      v.array(
        v.object({
          orgId: v.string(),
          orgName: v.optional(v.string()), // Optional to support existing data
          role: v.union(
            v.literal("admin"),
            v.literal("coach"),
            v.literal("parent"),
            v.literal("player")
          ),
          accessCount: v.number(), // Total number of times accessed
          totalMinutesSpent: v.number(), // Total time spent in this org/role
          firstAccessedAt: v.optional(v.number()), // Unix timestamp of first access
          lastAccessedAt: v.number(), // Unix timestamp of last access
        })
      )
    ),

    // UI preferences
    themePreference: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    densityPreference: v.optional(
      v.union(
        v.literal("compact"),
        v.literal("comfortable"),
        v.literal("spacious")
      )
    ),

    // Coach Comparison View Preferences
    coachComparisonSettings: v.optional(
      v.object({
        defaultViewMode: v.union(
          v.literal("insights"),
          v.literal("split"),
          v.literal("overlay")
        ),
        highlightDivergence: v.boolean(),
        divergenceThreshold: v.number(), // e.g., 1.0 - skills with rating diff > this are highlighted
      })
    ),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ============================================================
  // AI MODEL CONFIGURATION
  // Platform-level and per-organization AI model settings
  // Managed by Platform Staff via /platform/ai-config
  // ============================================================

  aiModelConfig: defineTable({
    // Feature identifier - which AI feature this config applies to
    feature: v.union(
      v.literal("voice_transcription"), // Audio to text (OpenAI)
      v.literal("voice_insights"), // Extract insights from transcription (OpenAI)
      v.literal("sensitivity_classification"), // Classify insight sensitivity (Anthropic)
      v.literal("parent_summary"), // Generate parent-friendly summary (Anthropic)
      v.literal("session_plan"), // Generate training session plans (Anthropic)
      v.literal("recommendations"), // Coaching recommendations (Anthropic)
      v.literal("comparison_insights") // Passport comparison analysis (Anthropic)
    ),

    // Scope: platform-wide default or organization-specific override
    scope: v.union(v.literal("platform"), v.literal("organization")),
    organizationId: v.optional(v.string()), // Required if scope is "organization"

    // Provider and model configuration
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("openrouter") // Future: unified gateway
    ),
    modelId: v.string(), // e.g., "gpt-4o", "claude-3-5-haiku-20241022"

    // Model parameters
    maxTokens: v.optional(v.number()),
    temperature: v.optional(v.number()), // 0.0 - 1.0

    // Status
    isActive: v.boolean(),

    // Audit trail
    updatedBy: v.string(), // User ID of who made the change
    updatedAt: v.number(),
    notes: v.optional(v.string()), // E.g., "Testing sonnet for better quality"

    createdAt: v.number(),
  })
    .index("by_feature", ["feature"])
    .index("by_scope", ["scope"])
    .index("by_feature_and_scope", ["feature", "scope"])
    .index("by_feature_scope_org", ["feature", "scope", "organizationId"])
    .index("by_organization", ["organizationId"]),

  // AI Model Config Change Log - audit trail of all changes
  aiModelConfigLog: defineTable({
    configId: v.id("aiModelConfig"),
    feature: v.string(),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("deactivated")
    ),

    // What changed
    previousValue: v.optional(
      v.object({
        provider: v.optional(v.string()),
        modelId: v.optional(v.string()),
        maxTokens: v.optional(v.number()),
        temperature: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
      })
    ),
    newValue: v.object({
      provider: v.string(),
      modelId: v.string(),
      maxTokens: v.optional(v.number()),
      temperature: v.optional(v.number()),
      isActive: v.boolean(),
    }),

    // Who and when
    changedBy: v.string(), // User ID
    changedAt: v.number(),
    reason: v.optional(v.string()), // Why the change was made
  })
    .index("by_config", ["configId"])
    .index("by_feature", ["feature"])
    .index("by_changedAt", ["changedAt"]),

  // ============================================================
  // WHATSAPP INTEGRATION (TWILIO)
  // Receive voice notes and messages from coaches via WhatsApp
  // ============================================================

  whatsappMessages: defineTable({
    // Twilio message identifiers
    messageSid: v.string(),
    accountSid: v.string(),

    // Sender/receiver info
    fromNumber: v.string(), // E.164 format (without whatsapp: prefix)
    toNumber: v.string(), // Our Twilio WhatsApp number

    // Message content
    messageType: v.union(
      v.literal("text"),
      v.literal("audio"),
      v.literal("image"),
      v.literal("video"),
      v.literal("document")
    ),
    body: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),

    // Coach linking (matched by phone number)
    coachId: v.optional(v.string()),
    coachName: v.optional(v.string()),
    organizationId: v.optional(v.string()),

    // Processing status
    status: v.union(
      v.literal("received"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("unmatched"),
      v.literal("rejected"),
      v.literal("duplicate")
    ),
    errorMessage: v.optional(v.string()),

    // Quality gate results (US-VN-001)
    messageQualityCheck: v.optional(
      v.object({
        isValid: v.boolean(),
        reason: v.optional(v.string()),
        checkedAt: v.number(),
      })
    ),

    // Duplicate detection (US-VN-003)
    isDuplicate: v.optional(v.boolean()),
    duplicateOfMessageId: v.optional(v.id("whatsappMessages")),

    // Link to created voice note
    voiceNoteId: v.optional(v.id("voiceNotes")),

    // Auto-apply results (for WhatsApp reply)
    processingResults: v.optional(
      v.object({
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
            reason: v.string(), // "sensitive" | "low_trust" | "unmatched_player"
          })
        ),
        unmatched: v.array(
          v.object({
            insightId: v.string(),
            mentionedName: v.optional(v.string()),
            title: v.string(),
          })
        ),
      })
    ),

    // Timestamps
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_messageSid", ["messageSid"])
    .index("by_fromNumber", ["fromNumber"])
    .index("by_coachId", ["coachId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_receivedAt", ["receivedAt"])
    .index("by_fromNumber_and_receivedAt", ["fromNumber", "receivedAt"])
    .index("by_duplicateOfMessageId", ["duplicateOfMessageId"]),

  // WhatsApp session memory for multi-org coaches
  // Remembers which org a coach was recently messaging about (2-hour timeout)
  whatsappSessions: defineTable({
    phoneNumber: v.string(), // E.164 format
    coachId: v.string(), // User ID

    // Current session org context
    organizationId: v.string(),
    organizationName: v.string(),

    // How the org was determined
    resolvedVia: v.union(
      v.literal("single_org"), // Coach only has one org
      v.literal("explicit_mention"), // Coach mentioned org name in message
      v.literal("player_match"), // Unique player name matched to org
      v.literal("team_match"), // Unique team name matched to org
      v.literal("coach_match"), // Unique coach name matched to org
      v.literal("age_group_match"), // Unique age group matched to org (e.g., "u12s")
      v.literal("sport_match"), // Unique sport matched to org (e.g., "soccer training")
      v.literal("user_selection"), // Coach replied with selection
      v.literal("session_memory") // Continued from previous message
    ),

    // Timestamps
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_phone", ["phoneNumber"])
    .index("by_coach", ["coachId"]),

  // Pending WhatsApp messages awaiting org clarification
  whatsappPendingMessages: defineTable({
    messageSid: v.string(),
    phoneNumber: v.string(),
    coachId: v.string(),
    coachName: v.string(),

    // Original message content
    messageType: v.union(
      v.literal("text"),
      v.literal("audio"),
      v.literal("image"),
      v.literal("video"),
      v.literal("document")
    ),
    body: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaContentType: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),

    // Available orgs for selection
    availableOrgs: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
      })
    ),

    // Status
    status: v.union(
      v.literal("awaiting_selection"), // Waiting for coach to reply
      v.literal("resolved"), // Coach selected, processing
      v.literal("expired") // Timed out (24 hours)
    ),

    // Timestamps
    createdAt: v.number(),
    expiresAt: v.number(), // 24 hours from creation
  })
    .index("by_phone", ["phoneNumber"])
    .index("by_phone_and_status", ["phoneNumber", "status"])
    .index("by_status", ["status"])
    .index("by_messageSid", ["messageSid"]),

  // WhatsApp review links for coach Quick Review microsite
  // ONE active link per coach, reused across multiple voice notes (48h expiry)
  whatsappReviewLinks: defineTable({
    code: v.string(), // 8-char alphanumeric (excludes 0OIl)
    organizationId: v.string(), // Better Auth org ID
    coachUserId: v.string(), // Better Auth user ID of coach

    // Voice notes aggregated under this link
    voiceNoteIds: v.array(v.id("voiceNotes")),

    // Lifecycle
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("used")
    ),
    createdAt: v.number(),
    expiresAt: v.number(), // 48h from creation
    lastNoteAddedAt: v.number(), // Updated when new note appended

    // Access tracking
    accessedAt: v.optional(v.number()), // Last access timestamp
    deviceFingerprint: v.optional(v.string()), // Cookie-based, set on first access
    accessCount: v.number(), // Incremented on each access
    accessLog: v.array(
      v.object({
        timestamp: v.number(),
        ip: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      })
    ),
    // Snooze/remind later (US-VN-012c)
    snoozeRemindAt: v.optional(v.number()), // Timestamp to send reminder
    snoozeCount: v.optional(v.number()), // Times snoozed (max 3)
  })
    .index("by_code", ["code"])
    .index("by_coachUserId_and_status", ["coachUserId", "status"])
    .index("by_expiresAt_and_status", ["expiresAt", "status"])
    .index("by_status", ["status"]),

  // ============================================================
  // REVIEW ANALYTICS EVENTS (US-VN-012a)
  // Tracks all coach actions on the /r/ review microsite
  // ============================================================
  reviewAnalyticsEvents: defineTable({
    linkCode: v.string(),
    coachUserId: v.string(),
    organizationId: v.string(),
    eventType: v.union(
      v.literal("apply"),
      v.literal("dismiss"),
      v.literal("edit"),
      v.literal("snooze"),
      v.literal("batch_apply"),
      v.literal("batch_dismiss")
    ),
    insightId: v.optional(v.string()),
    voiceNoteId: v.optional(v.id("voiceNotes")),
    category: v.optional(v.string()),
    confidenceScore: v.optional(v.number()),
    wasAutoApplyCandidate: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_coachUserId_and_timestamp", ["coachUserId", "timestamp"])
    .index("by_organizationId_and_timestamp", ["organizationId", "timestamp"])
    .index("by_linkCode", ["linkCode"]),

  // ============================================================
  // PLATFORM STAFF INVITATIONS
  // Invitations for granting platform staff access to new users
  // ============================================================
  platformStaffInvitations: defineTable({
    email: v.string(), // Email address being invited
    invitedBy: v.string(), // User ID of person sending invitation
    invitedByName: v.optional(v.string()),
    invitedByEmail: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("cancelled"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    expiresAt: v.number(), // Expiration timestamp
    acceptedAt: v.optional(v.number()),
    acceptedByUserId: v.optional(v.string()),
    cancelledAt: v.optional(v.number()),
    cancelledBy: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_email_and_status", ["email", "status"]),

  // ============================================================
  // GDPR VERSION TRACKING
  // Policy version tracking for GDPR compliance (Phase 2)
  // ============================================================
  gdprVersions: defineTable({
    version: v.number(), // 1, 2, 3...
    effectiveDate: v.number(), // When this version becomes active
    summary: v.string(), // Short description of changes
    fullText: v.string(), // Complete policy text
    createdBy: v.string(), // Platform staff userId
    createdAt: v.number(),
  })
    .index("by_version", ["version"])
    .index("by_effective_date", ["effectiveDate"]),

  // ============================================================
  // USER NOTIFICATION PREFERENCES
  // Per-user notification settings for email, push, and in-app
  // ============================================================
  notificationPreferences: defineTable({
    userId: v.string(), // User ID from Better Auth
    organizationId: v.optional(v.string()), // Optional org-specific prefs

    // Email notification preferences
    emailEnabled: v.boolean(), // Master toggle for all email
    emailTeamUpdates: v.boolean(), // Team schedule, roster changes
    emailPlayerUpdates: v.boolean(), // Player progress, assessments
    emailAnnouncements: v.boolean(), // Org-wide announcements
    emailAssessments: v.boolean(), // Assessment reminders and results

    // Push notification preferences
    pushEnabled: v.boolean(), // Master toggle for push
    pushSubscription: v.optional(v.string()), // Browser push subscription JSON

    // In-app notification preferences
    inAppEnabled: v.boolean(), // Master toggle for in-app
    inAppSound: v.boolean(), // Play sound on notification
    inAppBadge: v.boolean(), // Show badge count

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_orgId", ["userId", "organizationId"]),
});
