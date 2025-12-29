# Platform-Level Identity Migration Plan

## Implementation Roadmap for Player Passport Architecture

This document provides a phased implementation plan for migrating from the current org-scoped player model to the Platform-Level Identity Architecture. Each phase has clear objectives, deliverables, success criteria, and testing checkpoints.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Phase 1: Foundation Tables](#3-phase-1-foundation-tables)
4. [Phase 2: Guardian Identity System](#4-phase-2-guardian-identity-system)
5. [Phase 3: Player Identity System](#5-phase-3-player-identity-system)
6. [Phase 4: Adult Player Support](#6-phase-4-adult-player-support)
7. [Phase 5: Data Migration](#7-phase-5-data-migration)
8. [Phase 6: Frontend Integration](#8-phase-6-frontend-integration)
9. [Phase 7: Sport Passport Enhancement](#9-phase-7-sport-passport-enhancement)
10. [Progress Tracking](#10-progress-tracking)
11. [Rollback Strategy](#11-rollback-strategy)

---

## 1. Overview

### 1.1 Migration Strategy

Given the small test population, we are using a **Clean Slate + Parallel Build** strategy:

1. **Keep existing tables** - Don't delete yet; they serve as reference
2. **Build new tables in parallel** - New identity tables alongside existing
3. **Build new APIs** - New queries/mutations using new tables
4. **Switch frontend** - Update UI to use new APIs
5. **Deprecate old tables** - Once verified, mark old as deprecated
6. **Remove old tables** - Final cleanup after confirmation

### 1.2 Guiding Principles

| Principle | Description |
|-----------|-------------|
| **Incremental delivery** | Each phase delivers working, testable functionality |
| **No data loss** | Old data remains accessible until migration verified |
| **Feature parity first** | Match existing functionality before adding new features |
| **Test at each step** | Explicit success criteria before proceeding |
| **Document progress** | Update progress log after each phase |

### 1.3 Timeline Overview

```
Phase 1: Foundation Tables         [████████░░] ~2-3 sessions
Phase 2: Guardian Identity         [░░░░░░░░░░] ~3-4 sessions
Phase 3: Player Identity           [░░░░░░░░░░] ~3-4 sessions
Phase 4: Adult Player Support      [░░░░░░░░░░] ~2-3 sessions
Phase 5: Data Migration            [░░░░░░░░░░] ~1-2 sessions
Phase 6: Frontend Integration      [░░░░░░░░░░] ~5-7 sessions
Phase 7: Sport Passport Enhancement[░░░░░░░░░░] ~4-5 sessions
```

---

## 2. Prerequisites

### 2.1 Before Starting

- [ ] Review `PLAYER_PASSPORT_ARCHITECTURE.md` (platform-level identity model)
- [ ] Review `EXISTING_SCHEMA_DOCUMENTATION.md` (current schema)
- [ ] Ensure dev environment is working (`npm run dev`)
- [ ] Ensure Convex codegen works (`npx -w packages/backend convex codegen`)
- [ ] Create backup of current test data (if preserving)

### 2.2 Decision Confirmations

| Decision | Confirmed Value | Notes |
|----------|-----------------|-------|
| Clean slate migration? | **Yes** | Delete existing test data |
| Medical profile scope | **Hybrid** | Platform core + org notes |
| Injury/goal scope | **Org-scoped** | Org owns assessments |
| Adult cutoff age | **18 years** | Legal adult |
| Default playerType | **Youth** | Require explicit adult designation |

---

## 3. Phase 1: Foundation Tables

### 3.1 Objective

Create the core reference data tables that other entities depend on.

### 3.2 Tables to Create

```typescript
// packages/backend/convex/schema.ts

// 1. Sports reference table
sports: defineTable({
  code: v.string(),           // "gaa_football", "soccer", "rugby"
  name: v.string(),           // "GAA Football", "Soccer", "Rugby"
  governingBody: v.optional(v.string()), // "GAA", "FAI", "IRFU"
  isActive: v.boolean(),
  createdAt: v.number(),
})
  .index("by_code", ["code"])
  .index("by_isActive", ["isActive"]),

// 2. Age group reference table
ageGroups: defineTable({
  code: v.string(),           // "u6", "u7", "u8", ... "senior"
  name: v.string(),           // "Under 6", "Under 7", ... "Senior"
  minAge: v.optional(v.number()),
  maxAge: v.optional(v.number()),
  ltadStage: v.optional(v.string()), // "FUNdamentals", "Learn to Train", etc.
  isActive: v.boolean(),
  createdAt: v.number(),
})
  .index("by_code", ["code"])
  .index("by_isActive", ["isActive"]),

// 3. Skill categories (sport-specific)
skillCategories: defineTable({
  sportCode: v.string(),      // FK to sports.code
  code: v.string(),           // "ball_mastery", "passing", etc.
  name: v.string(),           // "Ball Mastery", "Passing & Distribution"
  description: v.optional(v.string()),
  sortOrder: v.number(),
  isActive: v.boolean(),
  createdAt: v.number(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_sportCode_and_code", ["sportCode", "code"]),

// 4. Skill definitions (within categories)
skillDefinitions: defineTable({
  categoryId: v.id("skillCategories"),
  sportCode: v.string(),      // Denormalized for easier queries
  code: v.string(),           // "solo_run", "hand_pass", etc.
  name: v.string(),           // "Solo Run", "Hand Pass"
  description: v.optional(v.string()),
  level1Descriptor: v.optional(v.string()), // "Cannot perform"
  level2Descriptor: v.optional(v.string()), // "Needs significant work"
  level3Descriptor: v.optional(v.string()), // "Developing"
  level4Descriptor: v.optional(v.string()), // "Competent"
  level5Descriptor: v.optional(v.string()), // "Advanced"
  ageGroupRelevance: v.optional(v.array(v.string())), // ["u8", "u9", "u10"]
  sortOrder: v.number(),
  isActive: v.boolean(),
  createdAt: v.number(),
})
  .index("by_categoryId", ["categoryId"])
  .index("by_sportCode", ["sportCode"])
  .index("by_sportCode_and_code", ["sportCode", "code"]),
```

### 3.3 Backend Functions to Create

**File:** `packages/backend/convex/models/referenceData.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `getSports` | Query | Get all active sports |
| `getAgeGroups` | Query | Get all active age groups |
| `getSkillCategoriesBySport` | Query | Get skill categories for a sport |
| `getSkillDefinitionsByCategory` | Query | Get skills in a category |
| `getSkillDefinitionsBySport` | Query | Get all skills for a sport |
| `seedSports` | Mutation (internal) | Seed initial sports data |
| `seedAgeGroups` | Mutation (internal) | Seed initial age groups |
| `seedSkillDefinitions` | Mutation (internal) | Seed skills from MVP |

### 3.4 Seed Data

Extract from MVP and create seed functions:

```typescript
// GAA Football skills (17 from MVP)
const gaaFootballSkills = [
  { category: "ball_mastery", code: "solo_run", name: "Solo Run" },
  { category: "ball_mastery", code: "toe_tap", name: "Toe Tap" },
  // ... etc
];

// Soccer skills (29 from MVP)
// Rugby skills (42 from MVP)
```

### 3.5 Success Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| 1 | Schema compiles without errors | `npx -w packages/backend convex codegen` |
| 2 | Sports table has GAA, Soccer, Rugby | Query `getSports()` returns 3 sports |
| 3 | Age groups table has U6-U19 + Senior | Query `getAgeGroups()` returns expected groups |
| 4 | GAA has 17 skills across categories | Query `getSkillDefinitionsBySport("gaa_football")` returns 17 |
| 5 | Soccer has 29 skills | Query returns 29 |
| 6 | Rugby has 42 skills | Query returns 42 |

### 3.6 Deliverables Checklist

- [ ] Schema updated with 4 new tables
- [ ] `referenceData.ts` model file created
- [ ] Seed functions implemented
- [ ] Seed data run successfully
- [ ] All 6 success criteria pass
- [ ] Progress log updated

---

## 4. Phase 2: Guardian Identity System

### 4.1 Objective

Create platform-level guardian identity with org-level profiles.

### 4.2 Tables to Create

```typescript
// Platform-level: Guardian identity (no orgId)
guardianIdentities: defineTable({
  // Core identity
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
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
    v.literal("unverified"),      // Created from import
    v.literal("email_verified"),  // Email confirmed
    v.literal("id_verified")      // Full identity verified
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
```

### 4.3 Backend Functions to Create

**File:** `packages/backend/convex/models/guardianIdentities.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `createGuardianIdentity` | Mutation | Create new guardian identity |
| `findGuardianByEmail` | Query | Find guardian by email |
| `findGuardianByUserId` | Query | Find guardian by Better Auth user ID |
| `getGuardianForCurrentUser` | Query | Get guardian identity for logged-in user |
| `linkGuardianToUser` | Mutation | Link guardian identity to Better Auth user |
| `updateGuardianIdentity` | Mutation | Update guardian's core info |
| `findOrCreateGuardian` | Mutation | Upsert pattern for imports |

**File:** `packages/backend/convex/models/orgGuardianProfiles.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `getOrgGuardianProfile` | Query | Get guardian's profile for an org |
| `createOrgGuardianProfile` | Mutation | Create org-specific profile |
| `updateOrgGuardianProfile` | Mutation | Update org-specific preferences |
| `getGuardiansForOrganization` | Query | List all guardians at an org |

### 4.4 Identity Matching Logic

```typescript
// Matching confidence scoring
async function findMatchingGuardian(
  ctx: QueryCtx,
  email: string,
  firstName?: string,
  lastName?: string,
  phone?: string
): Promise<{ guardian: GuardianIdentity; confidence: number } | null> {

  // 1. Exact email match (highest confidence)
  const byEmail = await ctx.db
    .query("guardianIdentities")
    .withIndex("by_email", q => q.eq("email", email.toLowerCase()))
    .first();

  if (byEmail) {
    let confidence = 80; // Base for email match
    if (firstName && byEmail.firstName.toLowerCase() === firstName.toLowerCase()) {
      confidence += 10;
    }
    if (lastName && byEmail.lastName.toLowerCase() === lastName.toLowerCase()) {
      confidence += 10;
    }
    return { guardian: byEmail, confidence };
  }

  // 2. Phone match (if no email match)
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    const byPhone = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_phone", q => q.eq("phone", normalizedPhone))
      .first();

    if (byPhone) {
      let confidence = 60; // Lower than email
      if (firstName && byPhone.firstName.toLowerCase() === firstName.toLowerCase()) {
        confidence += 15;
      }
      if (lastName && byPhone.lastName.toLowerCase() === lastName.toLowerCase()) {
        confidence += 15;
      }
      return { guardian: byPhone, confidence: Math.min(confidence, 90) };
    }
  }

  // 3. Name match only (lowest confidence - requires admin review)
  if (firstName && lastName) {
    const byName = await ctx.db
      .query("guardianIdentities")
      .withIndex("by_name", q =>
        q.eq("lastName", lastName).eq("firstName", firstName)
      )
      .first();

    if (byName) {
      return { guardian: byName, confidence: 40 }; // Low - needs review
    }
  }

  return null;
}
```

### 4.5 Success Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| 1 | Schema compiles | `npx -w packages/backend convex codegen` |
| 2 | Can create guardian identity | Call `createGuardianIdentity` mutation |
| 3 | Can find guardian by email | Create guardian, then `findGuardianByEmail` |
| 4 | Can link guardian to user | Create guardian without userId, then link |
| 5 | Duplicate email prevented | Try creating second guardian with same email |
| 6 | Org profile independent | Same guardian, different prefs in different orgs |
| 7 | `findOrCreateGuardian` upserts | Call twice with same email, get same ID |

### 4.6 Deliverables Checklist

- [ ] Schema updated with guardianIdentities and orgGuardianProfiles
- [ ] `guardianIdentities.ts` model file created
- [ ] `orgGuardianProfiles.ts` model file created
- [ ] Identity matching function implemented
- [ ] All 7 success criteria pass
- [ ] Progress log updated

---

## 5. Phase 3: Player Identity System

### 5.1 Objective

Create platform-level player identity with guardian links and org enrollments.

### 5.2 Tables to Create

```typescript
// Platform-level: Player identity (no orgId)
playerIdentities: defineTable({
  // Core identity
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.string(),    // ISO format: "2015-03-20"
  gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),

  // Player type (youth vs adult)
  playerType: v.union(
    v.literal("youth"),       // Managed by guardians
    v.literal("adult")        // Self-managed
  ),

  // For adult players - direct account link
  userId: v.optional(v.string()),     // Better Auth user ID
  email: v.optional(v.string()),      // Direct contact (adults)
  phone: v.optional(v.string()),

  // Address (optional, usually from guardian for youth)
  address: v.optional(v.string()),
  town: v.optional(v.string()),
  postcode: v.optional(v.string()),
  country: v.optional(v.string()),

  // Verification
  verificationStatus: v.union(
    v.literal("unverified"),          // From import
    v.literal("guardian_verified"),   // Guardian confirmed
    v.literal("self_verified"),       // Adult self-verified
    v.literal("document_verified")    // ID document verified
  ),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  createdFrom: v.optional(v.string()),
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
  isPrimary: v.boolean(),            // Primary contact for this player
  hasParentalResponsibility: v.boolean(),
  canCollectFromTraining: v.boolean(),

  // Cross-org consent
  consentedToSharing: v.boolean(),   // Allow other orgs to see this link

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.string()), // "guardian" | "admin" | "system"
})
  .index("by_guardian", ["guardianIdentityId"])
  .index("by_player", ["playerIdentityId"])
  .index("by_guardian_and_player", ["guardianIdentityId", "playerIdentityId"]),

// Organization-level: Player enrollment
orgPlayerEnrollments: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  organizationId: v.string(),

  // Membership info
  clubMembershipNumber: v.optional(v.string()),
  ageGroup: v.string(),
  season: v.string(),

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
  attendance: v.optional(v.object({
    training: v.optional(v.number()),
    matches: v.optional(v.number()),
  })),

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
  .index("by_org_and_ageGroup", ["organizationId", "ageGroup"]),
```

### 5.3 Backend Functions to Create

**File:** `packages/backend/convex/models/playerIdentities.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `createPlayerIdentity` | Mutation | Create new player identity |
| `findPlayerByNameAndDob` | Query | Find player by name + DOB |
| `findPlayersByGuardian` | Query | Get all players for a guardian |
| `updatePlayerIdentity` | Mutation | Update player's core info |
| `findOrCreatePlayer` | Mutation | Upsert pattern for imports |
| `calculateAge` | Internal | Calculate age from DOB |
| `determineAgeGroup` | Internal | Map age to age group |

**File:** `packages/backend/convex/models/guardianPlayerLinks.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `createGuardianPlayerLink` | Mutation | Link guardian to player |
| `getGuardiansForPlayer` | Query | Get all guardians for a player |
| `getPlayersForGuardian` | Query | Get all players for a guardian |
| `updateLinkConsent` | Mutation | Update sharing consent |
| `setPrimaryGuardian` | Mutation | Set primary guardian for player |

**File:** `packages/backend/convex/models/orgPlayerEnrollments.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `enrollPlayer` | Mutation | Enroll player in org |
| `getEnrollment` | Query | Get enrollment for player+org |
| `getEnrollmentsForPlayer` | Query | Get all orgs player is enrolled in |
| `getEnrollmentsForOrg` | Query | Get all players in an org |
| `updateEnrollment` | Mutation | Update enrollment details |
| `getPlayersForOrg` | Query | Rich query with identity data |

### 5.4 Success Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| 1 | Schema compiles | `npx -w packages/backend convex codegen` |
| 2 | Can create player identity | Call `createPlayerIdentity` mutation |
| 3 | Can link guardian to player | Create both, then `createGuardianPlayerLink` |
| 4 | Can enroll player in org | Create player, then `enrollPlayer` |
| 5 | Same player, multiple orgs | Enroll same player in 2 orgs |
| 6 | Multiple guardians per player | Link 2 guardians to same player |
| 7 | Multiple players per guardian | Link guardian to 2 different players |
| 8 | `getPlayersForGuardian` works | Returns all linked players |
| 9 | `getPlayersForOrg` works | Returns enrolled players with identity |
| 10 | Age calculation correct | Test DOB "2015-03-20" on today's date |

### 5.5 Deliverables Checklist

- [ ] Schema updated with playerIdentities, guardianPlayerLinks, orgPlayerEnrollments
- [ ] `playerIdentities.ts` model file created
- [ ] `guardianPlayerLinks.ts` model file created
- [ ] `orgPlayerEnrollments.ts` model file created
- [ ] All 10 success criteria pass
- [ ] Progress log updated

---

## 6. Phase 4: Adult Player Support

### 6.1 Objective

Enable adult/senior players who self-manage without guardians.

### 6.2 Tables to Create

```typescript
// Emergency contacts for adult players (instead of guardians)
playerEmergencyContacts: defineTable({
  playerIdentityId: v.id("playerIdentities"),

  // Contact details
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),

  // Relationship
  relationship: v.string(),  // "spouse", "partner", "parent", "sibling", etc.

  // Priority
  priority: v.number(),      // 1 = first call, 2 = second, etc.

  // Notes
  notes: v.optional(v.string()),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_player", ["playerIdentityId"])
  .index("by_priority", ["playerIdentityId", "priority"]),
```

### 6.3 Backend Functions to Create

**File:** `packages/backend/convex/models/playerEmergencyContacts.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `addEmergencyContact` | Mutation | Add emergency contact for player |
| `getEmergencyContacts` | Query | Get contacts for a player |
| `updateEmergencyContact` | Mutation | Update contact details |
| `deleteEmergencyContact` | Mutation | Remove contact |
| `reorderContacts` | Mutation | Change priority order |

**File:** `packages/backend/convex/models/adultPlayers.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `registerAdultPlayer` | Mutation | Create adult player linked to user |
| `getMyPlayerProfile` | Query | Get player profile for logged-in adult |
| `transitionToAdult` | Mutation | Convert youth player to adult at 18 |
| `convertGuardiansToContacts` | Internal | Move guardians to emergency contacts |

### 6.4 Transition Logic

```typescript
/**
 * Transition a youth player to adult status.
 * Called when player turns 18 or manually by admin.
 */
export const transitionToAdult = mutation({
  args: {
    playerIdentityId: v.id("playerIdentities"),
    userId: v.optional(v.string()),  // Link to their own account if registered
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerIdentityId);
    if (!player) throw new Error("Player not found");
    if (player.playerType === "adult") throw new Error("Already adult");

    // 1. Update player to adult type
    await ctx.db.patch(args.playerIdentityId, {
      playerType: "adult",
      userId: args.userId,
      email: args.email,
      phone: args.phone,
      verificationStatus: args.userId ? "self_verified" : "unverified",
      updatedAt: Date.now(),
    });

    // 2. Convert guardians to emergency contacts
    const guardianLinks = await ctx.db
      .query("guardianPlayerLinks")
      .withIndex("by_player", q => q.eq("playerIdentityId", args.playerIdentityId))
      .collect();

    let priority = 1;
    for (const link of guardianLinks) {
      const guardian = await ctx.db.get(link.guardianIdentityId);
      if (!guardian) continue;

      // Create emergency contact from guardian
      await ctx.db.insert("playerEmergencyContacts", {
        playerIdentityId: args.playerIdentityId,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        phone: guardian.phone || "",
        email: guardian.email,
        relationship: mapRelationshipToEmergency(link.relationship),
        priority: priority++,
        notes: link.isPrimary ? "Former primary guardian" : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // 3. Optionally remove guardian links (or keep for historical reference)
    // Decision: Keep links but mark as "historical" if needed

    return { success: true, emergencyContactsCreated: guardianLinks.length };
  },
});
```

### 6.5 Success Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| 1 | Schema compiles | `npx -w packages/backend convex codegen` |
| 2 | Can create adult player | Call `registerAdultPlayer` with userId |
| 3 | Adult player has no guardians | Query `getGuardiansForPlayer` returns empty |
| 4 | Can add emergency contacts | Call `addEmergencyContact` |
| 5 | Youth→Adult transition works | Call `transitionToAdult` |
| 6 | Guardians become contacts | After transition, contacts exist |
| 7 | Adult can view own profile | Call `getMyPlayerProfile` |

### 6.6 Deliverables Checklist

- [ ] Schema updated with playerEmergencyContacts
- [ ] `playerEmergencyContacts.ts` model file created
- [ ] `adultPlayers.ts` model file created
- [ ] Transition function implemented
- [ ] All 7 success criteria pass
- [ ] Progress log updated

---

## 7. Phase 5: Data Migration

### 7.1 Objective

Migrate existing test data to new schema (or clean slate).

### 7.2 Option A: Clean Slate (Recommended)

If test data can be deleted:

```typescript
// packages/backend/convex/migrations/cleanSlate.ts

export const cleanSlateForIdentityMigration = internalMutation({
  handler: async (ctx) => {
    // 1. Delete old player-related data
    const players = await ctx.db.query("players").collect();
    for (const player of players) {
      await ctx.db.delete(player._id);
    }

    const teamPlayers = await ctx.db.query("teamPlayers").collect();
    for (const tp of teamPlayers) {
      await ctx.db.delete(tp._id);
    }

    const injuries = await ctx.db.query("injuries").collect();
    for (const injury of injuries) {
      await ctx.db.delete(injury._id);
    }

    // ... etc for developmentGoals, medicalProfiles

    console.log(`Cleaned: ${players.length} players, ${teamPlayers.length} team links`);
    return { playersDeleted: players.length };
  },
});
```

### 7.3 Option B: Migration Script

If preserving data:

```typescript
// packages/backend/convex/migrations/migrateToIdentities.ts

export const migratePlayersToIdentities = internalMutation({
  args: {
    organizationId: v.string(),
    dryRun: v.boolean(),
  },
  handler: async (ctx, args) => {
    const oldPlayers = await ctx.db
      .query("players")
      .withIndex("by_organizationId", q => q.eq("organizationId", args.organizationId))
      .collect();

    const results = {
      playersProcessed: 0,
      identitiesCreated: 0,
      identitiesReused: 0,
      guardiansCreated: 0,
      linksCreated: 0,
      errors: [] as string[],
    };

    for (const oldPlayer of oldPlayers) {
      try {
        // 1. Find or create player identity
        const existingPlayer = await findPlayerByNameAndDob(
          ctx,
          oldPlayer.name.split(" ")[0], // firstName
          oldPlayer.name.split(" ").slice(1).join(" "), // lastName
          oldPlayer.dateOfBirth
        );

        let playerIdentityId: Id<"playerIdentities">;

        if (existingPlayer) {
          playerIdentityId = existingPlayer._id;
          results.identitiesReused++;
        } else if (!args.dryRun) {
          playerIdentityId = await ctx.db.insert("playerIdentities", {
            firstName: oldPlayer.name.split(" ")[0],
            lastName: oldPlayer.name.split(" ").slice(1).join(" "),
            dateOfBirth: oldPlayer.dateOfBirth || "unknown",
            gender: oldPlayer.gender as "male" | "female" | "other",
            playerType: "youth",
            verificationStatus: "unverified",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdFrom: "migration",
          });
          results.identitiesCreated++;
        }

        // 2. Process guardians from parents array
        if (oldPlayer.parents) {
          for (const parent of oldPlayer.parents) {
            // Find or create guardian identity
            // Create guardian-player link
            // ... etc
          }
        }

        // 3. Create enrollment
        if (!args.dryRun) {
          await ctx.db.insert("orgPlayerEnrollments", {
            playerIdentityId,
            organizationId: args.organizationId,
            ageGroup: oldPlayer.ageGroup,
            season: oldPlayer.season,
            status: "active",
            attendance: oldPlayer.attendance,
            coachNotes: oldPlayer.coachNotes,
            enrolledAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        results.playersProcessed++;
      } catch (error) {
        results.errors.push(`Player ${oldPlayer._id}: ${error}`);
      }
    }

    return results;
  },
});
```

### 7.4 Success Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| 1 | Migration runs without errors | Execute migration function |
| 2 | All players have identities | Count matches |
| 3 | All guardians extracted | Count guardian identities created |
| 4 | Links created correctly | Query guardian-player links |
| 5 | Enrollments created | Query enrollments per org |
| 6 | Data integrity verified | Compare counts old vs new |

### 7.5 Deliverables Checklist

- [ ] Migration script created
- [ ] Dry-run tested
- [ ] Full migration executed
- [ ] Data integrity verified
- [ ] Progress log updated

---

## 8. Phase 6: Frontend Integration

### 8.1 Objective

Update frontend to use new identity-based APIs.

### 8.2 Pages to Update

| Page | Current State | Changes Needed | Priority |
|------|---------------|----------------|----------|
| Parent Dashboard | Uses `getPlayersForParent` | Use `getPlayersForGuardian` | High |
| Player Passport | Uses `players` table | Use identity + enrollment | High |
| Admin Player List | Uses `players` table | Use enrollments query | High |
| Player Import | Creates `players` records | Create identities + enroll | High |
| Join Request Flow | Links by email | Create/link identities | Medium |
| Coach Dashboard | Uses `getPlayersForCoach` | Update to use enrollments | Medium |

### 8.3 New API Hooks Needed

**File:** `apps/web/src/hooks/useGuardianIdentity.ts`

```typescript
export function useGuardianIdentity() {
  const { data: session } = useSession();

  // Get guardian identity for current user
  const guardianIdentity = useQuery(
    api.models.guardianIdentities.getGuardianForCurrentUser
  );

  // Get all children across all orgs
  const children = useQuery(
    api.models.guardianPlayerLinks.getPlayersForGuardian,
    guardianIdentity ? { guardianIdentityId: guardianIdentity._id } : "skip"
  );

  return { guardianIdentity, children, isLoading: !guardianIdentity };
}
```

### 8.4 Component Updates

**Parent Dashboard** (`apps/web/src/app/orgs/[orgId]/parents/page.tsx`):

```typescript
// Before: Email-based lookup
const players = useQuery(api.models.players.getPlayersForParent, {
  organizationId: currentOrg,
});

// After: Guardian identity lookup
const { children } = useGuardianIdentity();
const enrolledInCurrentOrg = children?.filter(
  child => child.enrollments.some(e => e.organizationId === currentOrg)
);
```

### 8.5 Success Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| 1 | Parent dashboard loads | Navigate to /orgs/[orgId]/parents |
| 2 | Shows children from identity | Verify children list matches |
| 3 | Player passport loads | Navigate to player detail page |
| 4 | Admin player list works | Navigate to admin players page |
| 5 | Import creates identities | Run import, verify identity created |
| 6 | Cross-org visibility works | Parent sees children in multiple orgs |

### 8.6 Deliverables Checklist

- [ ] `useGuardianIdentity` hook created
- [ ] `usePlayerIdentity` hook created
- [ ] Parent dashboard updated
- [ ] Player passport updated
- [ ] Admin player list updated
- [ ] Import flow updated
- [ ] All 6 success criteria pass
- [ ] Progress log updated

---

## 9. Phase 7: Sport Passport Enhancement

### 9.1 Objective

Implement sport-specific skill tracking with temporal assessments, benchmark comparisons, and cross-sport injury visibility.

### 9.2 Tables to Create

```typescript
// Sport-specific passport (per sport per enrollment)
sportPassports: defineTable({
  enrollmentId: v.id("orgPlayerEnrollments"),
  sportCode: v.string(),      // FK to sports.code

  // Positions (sport-specific)
  positions: v.optional(v.object({
    favourite: v.optional(v.string()),
    leastFavourite: v.optional(v.string()),
    coachesPref: v.optional(v.string()),
    dominantSide: v.optional(v.string()),
    goalkeeper: v.optional(v.boolean()),
  })),

  // Current fitness metrics
  fitness: v.optional(v.object({
    pushPull: v.optional(v.number()),
    core: v.optional(v.number()),
    endurance: v.optional(v.number()),
    speed: v.optional(v.number()),
    broncoBeep: v.optional(v.number()),
  })),

  // Latest skill ratings (denormalized for quick access)
  currentSkillRatings: v.optional(v.record(v.string(), v.number())),

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_enrollmentId", ["enrollmentId"])
  .index("by_sportCode", ["sportCode"])
  .index("by_enrollment_and_sport", ["enrollmentId", "sportCode"]),

// Temporal skill assessments
skillAssessments: defineTable({
  sportPassportId: v.id("sportPassports"),
  skillDefinitionId: v.id("skillDefinitions"),

  // Assessment details
  rating: v.number(),         // 1-5
  assessorId: v.string(),     // userId of assessor
  assessorRole: v.union(
    v.literal("coach"),
    v.literal("self"),
    v.literal("parent"),
    v.literal("peer")
  ),

  // Context
  assessmentType: v.union(
    v.literal("training"),
    v.literal("match"),
    v.literal("formal_review"),
    v.literal("self_assessment")
  ),

  // Notes
  notes: v.optional(v.string()),

  // Temporal
  assessedAt: v.number(),
  season: v.string(),
})
  .index("by_sportPassportId", ["sportPassportId"])
  .index("by_skillDefinitionId", ["skillDefinitionId"])
  .index("by_assessedAt", ["assessedAt"])
  .index("by_passport_and_skill", ["sportPassportId", "skillDefinitionId"]),

// Skill benchmarks (expected ratings by age group)
// Platform admins manage these to define what's expected at each level
skillBenchmarks: defineTable({
  skillDefinitionId: v.id("skillDefinitions"),
  sportCode: v.string(),           // Denormalized for queries
  ageGroupCode: v.string(),        // "u8", "u9", etc.

  // Benchmark ratings (what's expected at this age)
  minimumExpected: v.number(),     // 1-5: Floor for this age
  targetRating: v.number(),        // 1-5: Expected competency
  advancedRating: v.number(),      // 1-5: Above average threshold

  // Optional descriptors
  notes: v.optional(v.string()),

  // Admin management
  createdBy: v.optional(v.string()), // Platform admin userId
  updatedBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_skillDefinitionId", ["skillDefinitionId"])
  .index("by_sportCode", ["sportCode"])
  .index("by_sportCode_and_ageGroup", ["sportCode", "ageGroupCode"])
  .index("by_skill_and_ageGroup", ["skillDefinitionId", "ageGroupCode"]),

// Platform-level injury records (visible across all enrollments)
// Safety-first: all orgs should see active injuries
playerInjuries: defineTable({
  playerIdentityId: v.id("playerIdentities"),

  // Injury details
  injuryType: v.string(),
  bodyPart: v.string(),
  dateOccurred: v.string(),
  dateReported: v.string(),
  severity: v.union(v.literal("Minor"), v.literal("Moderate"), v.literal("Severe")),
  status: v.union(v.literal("Active"), v.literal("Recovering"), v.literal("Healed")),
  description: v.string(),
  treatment: v.string(),
  expectedReturn: v.optional(v.string()),
  actualReturn: v.optional(v.string()),

  // Context: Where did it occur?
  occurredDuringOrgId: v.optional(v.string()),     // Which org's activity
  occurredDuringSport: v.optional(v.string()),     // Which sport
  occurredDuringActivity: v.optional(v.union(
    v.literal("training"),
    v.literal("match"),
    v.literal("other")
  )),

  // Return to play protocol (universal across orgs)
  returnToPlayProtocol: v.array(v.object({
    id: v.string(),
    description: v.string(),
    completed: v.boolean(),
    completedDate: v.optional(v.string()),
    completedByOrgId: v.optional(v.string()),
  })),

  // Visibility control
  visibleToAllOrgs: v.boolean(),  // Default true - safety first

  // Metadata
  reportedByUserId: v.optional(v.string()),
  reportedByOrgId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_playerIdentityId", ["playerIdentityId"])
  .index("by_status", ["status"])
  .index("by_player_and_status", ["playerIdentityId", "status"]),

// Org-specific injury notes/updates
// Each org can add their own observations while seeing the shared injury record
orgInjuryNotes: defineTable({
  injuryId: v.id("playerInjuries"),
  organizationId: v.string(),

  // Coach notes specific to this org's context
  note: v.string(),
  addedBy: v.string(),           // userId
  addedByRole: v.string(),       // "coach", "admin"
  addedAt: v.number(),
})
  .index("by_injuryId", ["injuryId"])
  .index("by_organizationId", ["organizationId"]),
```

### 9.3 Backend Functions to Create

**File:** `packages/backend/convex/models/sportPassports.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `createSportPassport` | Mutation | Create passport for enrollment+sport |
| `getSportPassport` | Query | Get passport by enrollment and sport |
| `getAllPassportsForPlayer` | Query | Get all sports for a player |
| `updatePassportPositions` | Mutation | Update positions |
| `updatePassportFitness` | Mutation | Update fitness metrics |

**File:** `packages/backend/convex/models/skillAssessments.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `recordSkillAssessment` | Mutation | Record a skill rating |
| `getLatestAssessments` | Query | Get most recent ratings |
| `getAssessmentHistory` | Query | Get history for a skill |
| `getAssessmentsBySeason` | Query | Get all assessments for a season |
| `calculateSkillProgress` | Query | Calculate improvement over time |

**File:** `packages/backend/convex/models/skillBenchmarks.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `getBenchmarksForSport` | Query | Get all benchmarks for a sport |
| `getBenchmarkForSkillAndAge` | Query | Get benchmark for specific skill+age |
| `setBenchmark` | Mutation | Set/update a benchmark (platform admin) |
| `importBenchmarks` | Mutation | Bulk import benchmarks from data |
| `comparePlayerToBenchmark` | Query | Compare player ratings to benchmarks |
| `generateScorecard` | Query | Generate full scorecard with comparisons |

**File:** `packages/backend/convex/models/playerInjuries.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `reportInjury` | Mutation | Report a new injury |
| `getInjuriesForPlayer` | Query | Get all injuries for a player identity |
| `getActiveInjuriesForPlayer` | Query | Get only active/recovering injuries |
| `updateInjuryStatus` | Mutation | Update injury status |
| `updateReturnToPlay` | Mutation | Update return-to-play protocol |
| `getInjuriesVisibleToOrg` | Query | Get injuries visible to an org |

**File:** `packages/backend/convex/models/orgInjuryNotes.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `addInjuryNote` | Mutation | Add org-specific note to injury |
| `getNotesForInjury` | Query | Get all notes for an injury |
| `getNotesForOrg` | Query | Get all injury notes added by an org |

### 9.4 Success Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| 1 | Schema compiles | `npx -w packages/backend convex codegen` |
| 2 | Can create sport passport | Create enrollment, then passport |
| 3 | Can record assessment | Record skill rating |
| 4 | History preserved | Multiple assessments for same skill |
| 5 | Latest ratings denormalized | `currentSkillRatings` updated |
| 6 | Multi-sport works | Same player, different sport passports |
| 7 | Progress calculation works | Show improvement over time |
| 8 | Can set benchmarks | Platform admin sets benchmark |
| 9 | Can compare to benchmark | Query shows player vs benchmark |
| 10 | Can import benchmarks | Bulk import from data works |
| 11 | Can report injury | Create injury for player identity |
| 12 | Injury visible cross-org | Injury created in org A visible in org B |
| 13 | Org-specific notes work | Each org can add own notes |
| 14 | Return-to-play tracking | Protocol steps can be completed |

### 9.5 Deliverables Checklist

- [ ] Schema updated with sportPassports and skillAssessments
- [ ] Schema updated with skillBenchmarks
- [ ] Schema updated with playerInjuries and orgInjuryNotes
- [ ] `sportPassports.ts` model file created
- [ ] `skillAssessments.ts` model file created
- [ ] `skillBenchmarks.ts` model file created
- [ ] `playerInjuries.ts` model file created
- [ ] `orgInjuryNotes.ts` model file created
- [ ] Skill assessment recording works
- [ ] Benchmark comparison works
- [ ] Injury cross-org visibility works
- [ ] All 14 success criteria pass
- [ ] Progress log updated

---

## 10. Progress Tracking

### 10.1 Progress Log File

Create and maintain: `docs/IDENTITY_MIGRATION_PROGRESS.md`

```markdown
# Identity Migration Progress Log

## Current Status

**Phase:** [X of 7]
**Started:** [Date]
**Last Updated:** [Date]

## Phase Completion

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 1. Foundation Tables | Not Started | | | |
| 2. Guardian Identity | Not Started | | | |
| 3. Player Identity | Not Started | | | |
| 4. Adult Player Support | Not Started | | | |
| 5. Data Migration | Not Started | | | |
| 6. Frontend Integration | Not Started | | | |
| 7. Sport Passport | Not Started | | | |

## Detailed Progress

### Phase 1: Foundation Tables

**Status:** Not Started

#### Checklist
- [ ] Schema updated with 4 new tables
- [ ] `referenceData.ts` model file created
- [ ] Seed functions implemented
- [ ] Seed data run successfully
- [ ] All success criteria pass

#### Session Log
| Date | Session | Work Completed | Next Steps |
|------|---------|----------------|------------|
| | | | |

#### Issues Encountered
- None yet

---
[Repeat for each phase]
```

### 10.2 Session Handoff Template

At the end of each session, update the progress log with:

```markdown
### Session Handoff: [Date]

**Phase:** [Current phase]
**Completed This Session:**
- [What was done]
- [Files created/modified]
- [Tests passed]

**Current State:**
- [What's working]
- [What's partially complete]
- [Known issues]

**Next Steps:**
1. [Specific next action]
2. [Following action]
3. [etc.]

**Context for Next Session:**
- [Key decisions made]
- [Patterns established]
- [Important file locations]

**Commands to Resume:**
```bash
# To verify current state
npx -w packages/backend convex codegen

# To run tests
[relevant test commands]
```
```

### 10.3 Success Criteria Tracking

Create a test checklist file: `docs/IDENTITY_MIGRATION_TESTS.md`

```markdown
# Identity Migration Test Checklist

## Phase 1: Foundation Tables

### Success Criteria

| # | Test | Command/Method | Expected Result | Actual | Pass |
|---|------|----------------|-----------------|--------|------|
| 1 | Schema compiles | `npx -w packages/backend convex codegen` | No errors | | [ ] |
| 2 | Sports exist | Query `getSports()` | 3 sports returned | | [ ] |
| 3 | Age groups exist | Query `getAgeGroups()` | U6-Senior returned | | [ ] |
| 4 | GAA skills | Query by sport | 17 skills | | [ ] |
| 5 | Soccer skills | Query by sport | 29 skills | | [ ] |
| 6 | Rugby skills | Query by sport | 42 skills | | [ ] |

### Test Date: ___________
### Tested By: ___________

---
[Repeat for each phase]
```

---

## 11. Rollback Strategy

### 11.1 Phase Rollback

Each phase can be rolled back independently:

| Phase | Rollback Method |
|-------|-----------------|
| 1. Foundation | Delete reference data tables (no dependencies) |
| 2. Guardian | Delete guardian tables (check for links first) |
| 3. Player | Delete player identity tables |
| 4. Adult | Delete emergency contacts table |
| 5. Migration | Restore from backup / re-run clean slate |
| 6. Frontend | Revert git commits for frontend changes |
| 7. Sport Passport | Delete passport/assessment tables |

### 11.2 Full Rollback

If complete rollback needed:

1. Revert all frontend changes (git)
2. Delete new tables in reverse order
3. Restore old `players` data from backup (if applicable)
4. Verify old functionality works

### 11.3 Point of No Return

**The point of no return is Phase 6 (Frontend Integration)** when old APIs are removed.

Before Phase 6:
- Old frontend works with old APIs
- New tables exist but aren't used
- Can abandon new tables without impact

After Phase 6:
- Frontend depends on new APIs
- Rollback requires git revert of frontend
- Old data may no longer exist

---

## Appendix A: File Structure After Migration

```
packages/backend/convex/
├── schema.ts                    # Updated with new tables
├── models/
│   ├── referenceData.ts         # Sports, age groups, skills
│   ├── guardianIdentities.ts    # Guardian identity CRUD
│   ├── orgGuardianProfiles.ts   # Org-specific guardian prefs
│   ├── playerIdentities.ts      # Player identity CRUD
│   ├── guardianPlayerLinks.ts   # Guardian-player relationships
│   ├── orgPlayerEnrollments.ts  # Org enrollments
│   ├── playerEmergencyContacts.ts # Adult player contacts
│   ├── adultPlayers.ts          # Adult player operations
│   ├── sportPassports.ts        # Sport-specific passports
│   ├── skillAssessments.ts      # Skill assessments
│   └── [existing files...]      # Keep existing for reference
├── migrations/
│   ├── cleanSlate.ts            # Clean slate migration
│   └── migrateToIdentities.ts   # Data migration (if needed)
└── [other existing files...]

apps/web/src/
├── hooks/
│   ├── useGuardianIdentity.ts   # Guardian identity hook
│   └── usePlayerIdentity.ts     # Player identity hook
└── [updated pages...]

docs/
├── PLAYER_PASSPORT_ARCHITECTURE.md  # Architecture reference
├── EXISTING_SCHEMA_DOCUMENTATION.md # Current schema reference
├── IDENTITY_MIGRATION_PLAN.md       # This document
├── IDENTITY_MIGRATION_PROGRESS.md   # Progress tracking
└── IDENTITY_MIGRATION_TESTS.md      # Test tracking
```

---

## Appendix B: Quick Reference

### Key Table Relationships

```
guardianIdentities (1) ──┬── (N) guardianPlayerLinks (N) ──┬── (1) playerIdentities
                         │                                 │
                         │                                 │
                         ▼                                 ▼
              orgGuardianProfiles                 orgPlayerEnrollments
              (per org prefs)                     (per org membership)
                                                          │
                                                          ▼
                                                   sportPassports
                                                   (per sport)
                                                          │
                                                          ▼
                                                  skillAssessments
                                                  (temporal records)
```

### Common Queries

| Use Case | Tables Involved | Key Indexes |
|----------|-----------------|-------------|
| Parent's children | guardianPlayerLinks → playerIdentities | `by_guardian` |
| Children at org | orgPlayerEnrollments → playerIdentities | `by_organizationId` |
| Player's guardians | guardianPlayerLinks → guardianIdentities | `by_player` |
| Player's skills | sportPassports → skillAssessments | `by_sportPassportId` |
| Skill history | skillAssessments | `by_passport_and_skill` |

### Validation Rules

| Entity | Required Fields | Unique Constraints |
|--------|-----------------|-------------------|
| guardianIdentities | firstName, lastName, email | email |
| playerIdentities | firstName, lastName, dateOfBirth, gender | (name + dob) soft unique |
| guardianPlayerLinks | guardianIdentityId, playerIdentityId | (guardian + player) |
| orgPlayerEnrollments | playerIdentityId, organizationId | (player + org) |
| sportPassports | enrollmentId, sportCode | (enrollment + sport) |

---

*Document Version: 1.0*
*Created: December 2025*
*Last Updated: December 2025*
