# Player Passport Architecture: Multi-Sport, Scalable, Knowledge Graph-Ready

## Executive Summary

This document defines a modular, scalable architecture for the Player Passport system that:
1. **Supports multiple sports** with sport-specific skills, benchmarks, and positions
2. **Aligns with national governing body (NGB) frameworks** (FAI, IRFU, GAA)
3. **Implements Long-Term Athlete Development (LTAD)** best practices
4. **Prepares for knowledge graph augmentation** for insights and pattern recognition
5. **Maintains backward compatibility** with existing data structures
6. **Scales efficiently** as organizations and sports grow

---

## 1. Research Findings & Industry Best Practices

### 1.1 Long-Term Athlete Development (LTAD) Framework

The internationally recognized LTAD model provides the foundation for age-appropriate player development:

| Stage | Ages | Focus | Training Ratio |
|-------|------|-------|----------------|
| **Active Start** | 0-6 | Fun, basic movement | 100% play |
| **FUNdamentals** | 6-9 | ABC's (Agility, Balance, Coordination) | 80% play, 20% structure |
| **Learn to Train** | 8-12 | Sport-specific skill introduction | 70% training, 30% competition |
| **Train to Train** | 11-16 | Aerobic base, sport skills | 60% training, 40% competition |
| **Train to Compete** | 15-21 | Competition preparation | 40% training, 60% competition |
| **Train to Win** | 18+ | Elite performance | Competition focused |

**Key Principle**: Windows of trainability - certain physical and skill qualities are best developed at specific ages.

### 1.2 Irish NGB Frameworks

#### FAI (Football Association of Ireland) - Soccer
- **Framework**: FAI Player Development Plan with Football Pathways Plan
- **Phases**: FUNdamental → Youth Development → High Performance
- **Key Focus**: Technical skills before tactical, small-sided games (4v4 to 11v11 progression)
- **Age Groups**: U6, U7, U8, U9, U10, U11, U12, U13, U14, U15, U16, U17, U18, U19, Senior

Sources: [FAI Football Pathways Plan](https://www.fai.ie/play-and-participate/football-pathways-plan/), [FAI Player Development Plan](https://www.stfrancisfc1958.ie/images/coaching/FAI_Player_Development_Plan.pdf)

#### IRFU (Irish Rugby Football Union) - Rugby
- **Framework**: Long-Term Player Development (LTPD) with 6 phases
- **Five Capacities**: Technical, Tactical, Physical, Mental, Lifestyle
- **Key Principle**: No positional specialization before age 14
- **Age Groups**: Leprechaun (non-contact), Mini Rugby, U13-U19, Adult

Sources: [IRFU Long Term Player Development](https://www.irishrugby.ie/2007/06/14/long-term-player-development/), [IRFU Youth Rugby](https://www.irishrugby.ie/playing-the-game/age-grade/youth-rugby/)

#### GAA (Gaelic Athletic Association) - GAA Football & Hurling
- **Framework**: Gaelic Games Player Pathway (based on FTEM model)
- **Stages**: F1 (Fundamental 4-11) → F2 (Extension 7-11) → F3 (Youth 12-17) → T1-T4 (Talent) → Elite
- **Key Programs**: Go Games, FUNdamentals, ABC Nursery Programme
- **Dual Sport**: Many players play both Football and Hurling

Sources: [GAA Player Pathway](https://learning.gaa.ie/playerpathway), [GAA Skill Acquisition](https://www.gaa.ie/article/skill-acquisition-key-to-unlocking-a-young-player-s-potential)

### 1.3 Skills Taxonomy Best Practices

From industry research on skills classification:

1. **Hierarchical Structure**: Skills → Categories → Domains
2. **Proficiency Levels**: Clear descriptors for each level (1-5 scale)
3. **Skill Relationships**: Prerequisites, related skills, transferable skills
4. **Context Awareness**: Open vs Closed skills, Gross vs Fine motor skills
5. **Non-Linear Development**: Acknowledge individual variation in progression

Sources: [Skills Taxonomy Guide](https://365talents.com/en/resources/your-comprehensive-guide-to-skills-taxonomy/), [Sports Skill Classification](https://sportscienceinsider.com/skill-classification-continuums/)

### 1.4 Knowledge Graph Architecture

From research on sports analytics and knowledge graphs:

1. **Entity Types**: Player, Skill, Sport, Team, Coach, Assessment, Benchmark
2. **Relationship Types**: HAS_SKILL, PLAYS_FOR, COACHED_BY, PREREQUISITE_FOR, TRANSFERS_TO
3. **Triple Structure**: `<entity, relation, entity>` with attributes
4. **Benefits**: Pattern recognition, rising star identification, performance prediction

Sources: [Graph Databases for Pro Sports](https://graphable.ai/blog/graph-databases-for-pro-sports/), [Sports Big Data Knowledge Graphs](https://www.hindawi.com/journals/complexity/2021/6676297/)

### 1.5 Assessment Best Practices

From sports psychology and performance assessment research:

1. **Multi-Source Assessment**: Coach, self, parent, peer evaluations
2. **Temporal Tracking**: Point-in-time assessments, not just current state
3. **Context Capture**: Assessment type (training, match, formal review)
4. **Benchmark Comparison**: Compare to age/gender/level norms
5. **Developmental Sensitivity**: Age-appropriate expectations

Sources: [Assessment in Youth Sport Best Practices](https://pmc.ncbi.nlm.nih.gov/articles/PMC3919511/), [Sports School Data Model](https://vertabelo.com/blog/a-sports-school-data-model/)

---

## 2. Current State Analysis

### 2.1 MVP App Analysis

The MVP (`/mvp-app`) implements a comprehensive player passport with:

**Strengths:**
- Three sport-specific skill sets (GAA: 17, Soccer: 29, Rugby: 42 skills)
- Well-organized skill categories per sport
- 1-5 rating scale with clear labels
- PDF generation with sport-specific skill selection
- Multi-sport athlete support (same player, multiple passports)
- Family linking via email and familyId
- Rich parent/guardian data structure

**Skill Categories by Sport:**

| Sport | Categories | Total Skills |
|-------|-----------|--------------|
| GAA Football | Ball Mastery, Catching, Free Taking, Tactical, Laterality, Defensive | 17 |
| Soccer | Ball Mastery, Passing/Distribution, Shooting/Finishing, Tactical, Physical, Character/Team | 29 |
| Rugby | Passing/Handling, Catching/Receiving, Running/Ball Carry, Kicking, Contact/Breakdown, Tactical/Game Awareness | 42 |

**Limitations:**
- Skills stored as JSON string (not queryable)
- No temporal tracking (only current state)
- No benchmark data
- No skill relationships/prerequisites
- Single sport per player record (multi-sport = multiple records)

### 2.2 Current Main App Analysis

The main app (`/apps/web` + `/packages/backend`) has:

**Implemented:**
- Player CRUD with organization scoping
- `skills` as `Record<string, number>` (improvement over JSON string)
- Team-player junction table (`teamPlayers`)
- Smart parent matching with confidence scoring
- Development goals table (structured, separate from MVP `actions` field)
- Injuries table with return-to-play protocol
- Medical profiles table
- Coach assignments

**Schema Fields (from `schema.ts`):**
```typescript
players: {
  // Core identity
  name, ageGroup, sport, gender, organizationId, season,

  // Skills (flat record)
  skills: Record<string, number>,

  // Positions & Fitness
  positions: { favourite, leastFavourite, coachesPref, dominantSide, goalkeeper },
  fitness: { pushPull, core, endurance, speed, broncoBeep },

  // Attendance
  attendance: { training, matches },

  // Review tracking
  reviewedWith, reviewStatus, lastReviewDate, nextReviewDue,

  // Notes
  coachNotes, parentNotes, playerNotes, injuryNotes, actions,

  // Parent/Family linking
  parents[], parentEmail, familyId, inferredParent*
}
```

**Gaps:**
- Single `sport` field (no multi-sport)
- Flat skills (no categories, history, or context)
- No benchmark integration
- No skill definitions/taxonomy
- Limited graph-ready structure

---

## 3. Proposed Architecture

### 3.1 Core Design Principles

1. **Player-Centric**: Player identity separate from sport-specific data
2. **LTAD-Aligned**: Age-appropriate expectations and benchmarks
3. **NGB-Compatible**: Map to FAI/IRFU/GAA frameworks
4. **Temporal**: All assessments are timestamped snapshots
5. **Hierarchical**: Sport → Category → Skill → Assessment
6. **Graph-Ready**: Entities and relationships suitable for knowledge graph
7. **Backward Compatible**: Existing data migrates cleanly

### 3.2 Entity Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PLAYER PASSPORT DATA MODEL                             │
└─────────────────────────────────────────────────────────────────────────────────┘

REFERENCE DATA (Sport Configuration)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌──────────┐     ┌─────────────────┐     ┌─────────────────┐                   │
│  │  sports  │────▶│ skillCategories │────▶│ skillDefinitions│                   │
│  └──────────┘     └─────────────────┘     └─────────────────┘                   │
│       │                                           │                              │
│       │           ┌─────────────────┐             │                              │
│       └──────────▶│   benchmarks    │◀────────────┘                              │
│                   └─────────────────┘                                            │
│                                                                                  │
│  ┌──────────────────┐     ┌─────────────────┐                                   │
│  │ positionsBySpor  │     │ ageGroupConfig  │                                   │
│  └──────────────────┘     └─────────────────┘                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

PLAYER DATA (Per-Player Records)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                           ┌──────────────┐                                       │
│                           │   players    │                                       │
│                           │  (identity)  │                                       │
│                           └──────┬───────┘                                       │
│                                  │                                               │
│           ┌──────────────────────┼──────────────────────┐                        │
│           │                      │                      │                        │
│           ▼                      ▼                      ▼                        │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐                │
│  │ sportPassports │    │  teamPlayers   │    │ medicalProfiles │                │
│  │  (per sport)   │    │ (team links)   │    │ (health data)   │                │
│  └───────┬────────┘    └────────────────┘    └─────────────────┘                │
│          │                                                                       │
│          │ 1:N                                                                   │
│          ▼                                                                       │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐                │
│  │skillAssessments│    │developmentGoals│    │fitnessAssessments│               │
│  │  (temporal)    │    │   (per sport)  │    │   (temporal)    │                │
│  └────────────────┘    └────────────────┘    └─────────────────┘                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

KNOWLEDGE GRAPH LAYER (Future)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌────────────────────┐     ┌─────────────────────┐                             │
│  │skillRelationships  │     │ graphRelationships  │                             │
│  │(prerequisite, etc) │     │ (computed insights) │                             │
│  └────────────────────┘     └─────────────────────┘                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Detailed Schema Design

#### 3.3.1 `sports` - Sport Configuration

```typescript
sports: defineTable({
  // Identity
  code: v.string(),              // "soccer", "rugby_union", "gaa_football", "gaa_hurling"
  name: v.string(),              // "Soccer", "Rugby Union", "GAA Football"
  shortName: v.string(),         // "Soccer", "Rugby", "GAA"
  variant: v.optional(v.string()), // "union", "league", "sevens" for rugby variants

  // Governing body reference
  governingBody: v.string(),     // "FAI", "IRFU", "GAA"
  governingBodyFullName: v.string(), // "Football Association of Ireland"
  governingBodyUrl: v.optional(v.string()),

  // LTAD Configuration
  ltadFramework: v.optional(v.string()), // "FAI Player Development Plan", "IRFU LTPD"
  ageGroupProgression: v.array(v.string()), // ["U6", "U7", "U8", ... "Senior"]

  // Game configuration
  hasPositions: v.boolean(),
  hasGoalkeeper: v.boolean(),
  standardTeamSize: v.number(),  // 11, 15, 6, etc.
  pitchType: v.optional(v.string()), // "rectangular", "oval"

  // Visual
  icon: v.optional(v.string()),
  primaryColor: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),

  // Status
  isActive: v.boolean(),
  displayOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_code", ["code"])
  .index("by_governingBody", ["governingBody"])
  .index("by_isActive", ["isActive"])
```

#### 3.3.2 `skillCategories` - Skill Groupings

Aligned with NGB frameworks (FAI Technical/Tactical/Physical/Mental, IRFU 5 Capacities, GAA domains).

```typescript
skillCategories: defineTable({
  // References
  sportCode: v.string(),

  // Identity
  code: v.string(),              // "technical_ball_mastery", "tactical_positioning"
  name: v.string(),              // "Ball Mastery", "Positioning & Awareness"
  shortName: v.string(),         // "Ball Mastery"
  description: v.optional(v.string()),

  // LTAD alignment
  domain: v.union(               // Aligns with IRFU 5 Capacities / FAI domains
    v.literal("technical"),
    v.literal("tactical"),
    v.literal("physical"),
    v.literal("mental"),
    v.literal("lifestyle"),      // IRFU includes this
    v.literal("character")       // Team/social skills
  ),

  // Ordering & UI
  displayOrder: v.number(),
  icon: v.optional(v.string()),
  color: v.optional(v.string()),

  // Flags
  isCore: v.boolean(),           // Core category for the sport
  isAdvanced: v.boolean(),       // Advanced category (older ages)
  isActive: v.boolean(),

  // Age applicability
  minAgeGroup: v.optional(v.string()), // Earliest age this category applies
  maxAgeGroup: v.optional(v.string()), // Latest age (usually "Senior")

  createdAt: v.number(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_domain", ["sportCode", "domain"])
  .index("by_displayOrder", ["sportCode", "displayOrder"])
```

#### 3.3.3 `skillDefinitions` - Individual Skills

Each assessable skill with full metadata.

```typescript
skillDefinitions: defineTable({
  // References
  sportCode: v.string(),
  categoryCode: v.string(),

  // Identity
  code: v.string(),              // "first_touch", "passing_accuracy", "solo_run"
  name: v.string(),              // "First Touch", "Passing Accuracy", "Solo Run"
  shortName: v.string(),         // For compact displays
  description: v.string(),       // Detailed description for coaches

  // Assessment guidance - what each rating means
  ratingDescriptors: v.array(v.object({
    rating: v.number(),          // 1-5
    label: v.string(),           // "Developing", "Emerging", etc.
    description: v.string(),     // Detailed criteria
    ageContext: v.optional(v.string()), // "Expected at U10 level"
  })),

  // Skill classification (sports science)
  skillType: v.optional(v.union(
    v.literal("open"),           // Environment-dependent (tackling)
    v.literal("closed"),         // Stable environment (free kick)
    v.literal("mixed")           // Both contexts
  )),
  motorType: v.optional(v.union(
    v.literal("gross"),          // Large muscle groups (running)
    v.literal("fine"),           // Precision (ball control)
    v.literal("mixed")
  )),

  // Age applicability
  minAgeGroup: v.optional(v.string()),
  maxAgeGroup: v.optional(v.string()),
  isAgeAppropriate: v.optional(v.record(v.string(), v.boolean())), // {"U8": true, "U10": true}

  // Ordering & display
  displayOrder: v.number(),
  isCore: v.boolean(),           // Fundamental skill
  isAdvanced: v.boolean(),       // Advanced skill
  isActive: v.boolean(),

  // Knowledge graph preparation
  prerequisiteSkills: v.optional(v.array(v.string())), // Skill codes
  relatedSkills: v.optional(v.array(v.string())),      // Similar/complementary
  transfersTo: v.optional(v.array(v.object({          // Cross-sport transfer
    sportCode: v.string(),
    skillCode: v.string(),
    transferWeight: v.number(),  // 0-1 how much transfers
  }))),

  // Metadata
  ngbReference: v.optional(v.string()), // Reference to NGB documentation
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_category", ["sportCode", "categoryCode"])
  .index("by_code", ["sportCode", "code"])
  .index("by_displayOrder", ["sportCode", "categoryCode", "displayOrder"])
```

#### 3.3.4 `benchmarks` - NGB Standards

Age/gender/level appropriate expectations from governing bodies.

```typescript
benchmarks: defineTable({
  // References
  sportCode: v.string(),
  skillCode: v.string(),

  // Context (what this benchmark applies to)
  ageGroup: v.string(),          // "U8", "U10", "U12", etc.
  gender: v.union(
    v.literal("male"),
    v.literal("female"),
    v.literal("all")
  ),
  level: v.union(
    v.literal("recreational"),   // Fun/participation focused
    v.literal("competitive"),    // Club competitive
    v.literal("development"),    // Development pathway
    v.literal("elite")           // High performance
  ),

  // Benchmark values (1-5 scale)
  expectedRating: v.number(),    // Expected for this age/level
  minAcceptable: v.number(),     // Minimum acceptable
  developingThreshold: v.number(), // Below this = needs work
  excellentThreshold: v.number(), // Above this = exceptional

  // Percentile data (if available from NGB)
  percentile25: v.optional(v.number()),
  percentile50: v.optional(v.number()),
  percentile75: v.optional(v.number()),
  percentile90: v.optional(v.number()),

  // Source attribution
  source: v.string(),            // "FAI", "IRFU", "GAA", "internal"
  sourceDocument: v.optional(v.string()), // "FAI Player Development Plan 2024"
  sourceUrl: v.optional(v.string()),
  sourceYear: v.number(),
  validFrom: v.optional(v.string()),  // ISO date
  validTo: v.optional(v.string()),    // ISO date (null = current)

  // Notes
  notes: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_skill", ["sportCode", "skillCode"])
  .index("by_context", ["sportCode", "skillCode", "ageGroup", "gender", "level"])
  .index("by_source", ["source", "sourceYear"])
```

#### 3.3.5 `sportPassports` - Player's Sport-Specific Passport

Links a player to a specific sport with their current status.

```typescript
sportPassports: defineTable({
  // References
  playerId: v.id("players"),
  sportCode: v.string(),
  organizationId: v.string(),

  // Status
  status: v.union(
    v.literal("active"),
    v.literal("inactive"),       // Taking a break
    v.literal("archived")        // Historical record
  ),

  // Position preferences (if sport has positions)
  primaryPosition: v.optional(v.string()),
  secondaryPositions: v.optional(v.array(v.string())),
  coachPreferredPosition: v.optional(v.string()),
  leastPreferredPosition: v.optional(v.string()),

  // Physical attributes
  dominantSide: v.optional(v.union(
    v.literal("left"),
    v.literal("right"),
    v.literal("both")
  )),
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
  .index("by_playerId", ["playerId"])
  .index("by_playerId_and_sport", ["playerId", "sportCode"])
  .index("by_organizationId", ["organizationId"])
  .index("by_organizationId_and_sport", ["organizationId", "sportCode"])
  .index("by_status", ["organizationId", "sportCode", "status"])
```

#### 3.3.6 `skillAssessments` - Point-in-Time Skill Records

Individual skill assessments with full context for temporal tracking.

```typescript
skillAssessments: defineTable({
  // References
  passportId: v.id("sportPassports"),
  playerId: v.id("players"),       // Denormalized for querying
  sportCode: v.string(),           // Denormalized
  skillCode: v.string(),
  organizationId: v.string(),      // Denormalized

  // Assessment data
  rating: v.number(),              // 1-5 scale
  previousRating: v.optional(v.number()), // For delta tracking

  // Context
  assessmentDate: v.string(),      // ISO date
  assessmentType: v.union(
    v.literal("initial"),          // First assessment
    v.literal("training"),         // Regular training observation
    v.literal("match"),            // Post-match assessment
    v.literal("trial"),            // Trial/tryout
    v.literal("formal_review"),    // Scheduled formal review
    v.literal("self"),             // Player self-assessment
    v.literal("parent"),           // Parent observation
    v.literal("import")            // Imported from external source
  ),

  // Assessor information
  assessedBy: v.optional(v.string()),     // User ID
  assessedByName: v.optional(v.string()), // Denormalized name
  assessorRole: v.optional(v.union(
    v.literal("coach"),
    v.literal("head_coach"),
    v.literal("assistant_coach"),
    v.literal("parent"),
    v.literal("self"),
    v.literal("admin"),
    v.literal("system")
  )),

  // Benchmark comparison (snapshot at time of assessment)
  benchmarkRating: v.optional(v.number()),
  benchmarkLevel: v.optional(v.string()),  // "competitive", "recreational"
  benchmarkDelta: v.optional(v.number()),  // rating - benchmarkRating
  benchmarkStatus: v.optional(v.union(
    v.literal("below"),
    v.literal("developing"),
    v.literal("on_track"),
    v.literal("exceeding"),
    v.literal("exceptional")
  )),

  // Notes
  notes: v.optional(v.string()),
  privateNotes: v.optional(v.string()), // Coach-only notes

  // Session context (if applicable)
  sessionId: v.optional(v.string()),    // Link to training session
  matchId: v.optional(v.string()),      // Link to match record

  // Metadata
  confidence: v.optional(v.union(       // Assessor's confidence
    v.literal("low"),
    v.literal("medium"),
    v.literal("high")
  )),
  createdAt: v.number(),
})
  .index("by_passportId", ["passportId"])
  .index("by_playerId", ["playerId"])
  .index("by_playerId_and_sport", ["playerId", "sportCode"])
  .index("by_skill", ["passportId", "skillCode"])
  .index("by_date", ["passportId", "assessmentDate"])
  .index("by_assessor", ["assessedBy", "assessmentDate"])
  .index("by_organizationId", ["organizationId", "assessmentDate"])
  .index("by_type", ["passportId", "assessmentType"])
```

#### 3.3.7 `fitnessAssessments` - Physical Fitness Records

Sport-agnostic physical development tracking.

```typescript
fitnessAssessments: defineTable({
  // References
  playerId: v.id("players"),
  organizationId: v.string(),
  passportId: v.optional(v.id("sportPassports")), // Optional sport context

  // Assessment timing
  assessmentDate: v.string(),
  assessmentType: v.union(
    v.literal("pre_season"),
    v.literal("mid_season"),
    v.literal("post_season"),
    v.literal("regular"),
    v.literal("return_from_injury")
  ),

  // Core ratings (1-5 scale)
  speedRating: v.optional(v.number()),
  agilityRating: v.optional(v.number()),
  enduranceRating: v.optional(v.number()),
  strengthRating: v.optional(v.number()),
  flexibilityRating: v.optional(v.number()),
  balanceRating: v.optional(v.number()),
  coordinationRating: v.optional(v.number()),

  // Measured values (objective tests)
  sprint10m: v.optional(v.number()),      // seconds
  sprint20m: v.optional(v.number()),
  sprint40m: v.optional(v.number()),
  beepTestLevel: v.optional(v.string()),  // "8.4", "10.2"
  beepTestShuttles: v.optional(v.number()),
  broncoTime: v.optional(v.number()),     // seconds
  yoyoTestLevel: v.optional(v.string()),
  verticalJump: v.optional(v.number()),   // cm
  standingBroadJump: v.optional(v.number()), // cm
  sitAndReach: v.optional(v.number()),    // cm

  // Body metrics (optional, age-appropriate)
  height: v.optional(v.number()),         // cm
  weight: v.optional(v.number()),         // kg

  // Context
  assessedBy: v.optional(v.string()),
  notes: v.optional(v.string()),

  createdAt: v.number(),
})
  .index("by_playerId", ["playerId"])
  .index("by_date", ["playerId", "assessmentDate"])
  .index("by_organizationId", ["organizationId"])
  .index("by_type", ["playerId", "assessmentType"])
```

#### 3.3.8 `positionsBySport` - Sport-Specific Positions

Reference data for positions by sport.

```typescript
positionsBySport: defineTable({
  sportCode: v.string(),
  code: v.string(),              // "goalkeeper", "midfielder", "half_forward"
  name: v.string(),              // "Goalkeeper", "Midfielder", "Half Forward"
  shortName: v.string(),         // "GK", "MF", "HF"
  category: v.optional(v.string()), // "defense", "midfield", "attack"

  // Position details
  description: v.optional(v.string()),
  keySkills: v.optional(v.array(v.string())), // Skill codes important for this position
  physicalRequirements: v.optional(v.array(v.string())), // "speed", "height", etc.

  // Display
  displayOrder: v.number(),
  pitchZone: v.optional(v.string()), // For visual pitch representation
  isActive: v.boolean(),
})
  .index("by_sportCode", ["sportCode"])
  .index("by_code", ["sportCode", "code"])
```

#### 3.3.9 `ageGroupConfig` - Age Group Configuration

Configurable age group settings per organization/sport.

```typescript
ageGroupConfig: defineTable({
  // Scope
  organizationId: v.optional(v.string()), // null = global default
  sportCode: v.optional(v.string()),      // null = all sports

  // Age group
  code: v.string(),              // "U8", "U10", "U12", etc.
  name: v.string(),              // "Under 8", "Under 10"

  // Age range
  minAge: v.number(),            // 6
  maxAge: v.number(),            // 8
  birthYearCutoff: v.optional(v.string()), // "January 1" or "September 1"

  // LTAD alignment
  ltadStage: v.union(
    v.literal("active_start"),
    v.literal("fundamentals"),
    v.literal("learn_to_train"),
    v.literal("train_to_train"),
    v.literal("train_to_compete"),
    v.literal("train_to_win")
  ),

  // Game format
  teamSize: v.optional(v.number()),      // 4v4, 7v7, 11v11
  gameDuration: v.optional(v.number()),  // minutes
  fieldSize: v.optional(v.string()),     // "small", "medium", "full"

  // Assessment guidance
  assessmentFrequency: v.optional(v.string()), // "monthly", "quarterly"
  focusAreas: v.optional(v.array(v.string())), // ["fundamentals", "fun"]

  displayOrder: v.number(),
  isActive: v.boolean(),
})
  .index("by_code", ["code"])
  .index("by_organization", ["organizationId", "sportCode"])
```

---

## 4. Multi-Sport Support

### 4.1 Player with Multiple Sports Example

```
Player: "Clodagh Barlow" (playerId: "player_123")
├── Basic Info: name, dateOfBirth, familyId, parents[]
│
├── sportPassport: GAA Football (passportId: "sp_gaa")
│   ├── ageGroup: U12
│   ├── primaryPosition: "half_forward"
│   ├── currentOverallRating: 4.2
│   └── skillAssessments: [solo: 4, kick_pass: 5, hand_pass: 4, ...]
│
├── sportPassport: Rugby (passportId: "sp_rugby")
│   ├── ageGroup: U12
│   ├── primaryPosition: "centre"
│   ├── currentOverallRating: 3.8
│   └── skillAssessments: [catch_pass: 4, tackle_technique: 3, ...]
│
├── sportPassport: Soccer (passportId: "sp_soccer")
│   ├── ageGroup: U12
│   ├── primaryPosition: "midfielder"
│   ├── currentOverallRating: 4.0
│   └── skillAssessments: [first_touch: 4, passing: 5, dribbling: 4, ...]
│
└── fitnessAssessments: [speed: 4, agility: 5, endurance: 4, ...]
```

### 4.2 Cross-Sport Skill Transfer

Some skills transfer between sports. The `transfersTo` field in `skillDefinitions` captures this:

```typescript
// Example: Passing transfers across sports
{
  sportCode: "soccer",
  code: "short_passing",
  transfersTo: [
    { sportCode: "gaa_football", skillCode: "hand_pass", transferWeight: 0.6 },
    { sportCode: "rugby_union", skillCode: "pop_pass", transferWeight: 0.5 },
  ]
}

// Example: Tackling transfers
{
  sportCode: "rugby_union",
  code: "tackle_technique",
  transfersTo: [
    { sportCode: "gaa_football", skillCode: "tackling", transferWeight: 0.7 },
  ]
}
```

### 4.3 UI Handling

```typescript
// In Player Passport page
const passports = useQuery(api.players.getPlayerPassports, { playerId });

if (passports.length === 1) {
  // Single sport: Show standard passport view
  return <SingleSportPassport passport={passports[0]} />;
}

if (passports.length > 1) {
  // Multi-sport: Show tabbed interface
  return (
    <Tabs defaultValue={passports[0].sportCode}>
      <TabsList>
        {passports.map(p => (
          <TabsTrigger key={p.sportCode} value={p.sportCode}>
            {getSportName(p.sportCode)}
          </TabsTrigger>
        ))}
        <TabsTrigger value="overview">Overview</TabsTrigger>
      </TabsList>
      {passports.map(p => (
        <TabsContent key={p.sportCode} value={p.sportCode}>
          <SingleSportPassport passport={p} />
        </TabsContent>
      ))}
      <TabsContent value="overview">
        <CrossSportOverview passports={passports} />
      </TabsContent>
    </Tabs>
  );
}
```

---

## 5. Benchmark Integration

### 5.1 Benchmark Sources by Sport

| Sport | Source | Framework | Document |
|-------|--------|-----------|----------|
| Soccer | FAI | Player Development Plan | [FAI PDP](https://www.fai.ie/play-and-participate/football-pathways-plan/) |
| Rugby | IRFU | LTPD / 5 Capacities | [IRFU LTPD](https://www.irishrugby.ie/2007/06/14/long-term-player-development/) |
| GAA | GAA | Gaelic Games Player Pathway | [GAA Pathway](https://learning.gaa.ie/playerpathway) |

### 5.2 Benchmark Comparison Logic

```typescript
function getBenchmarkStatus(
  rating: number,
  benchmark: Benchmark
): "below" | "developing" | "on_track" | "exceeding" | "exceptional" {
  if (rating >= benchmark.excellentThreshold) return "exceptional";
  if (rating >= benchmark.expectedRating) return "exceeding";
  if (rating >= benchmark.developingThreshold) return "on_track";
  if (rating >= benchmark.minAcceptable) return "developing";
  return "below";
}

function getBenchmarkColor(status: string): string {
  switch (status) {
    case "exceptional": return "text-blue-600 bg-blue-50";
    case "exceeding": return "text-green-600 bg-green-50";
    case "on_track": return "text-lime-600 bg-lime-50";
    case "developing": return "text-yellow-600 bg-yellow-50";
    case "below": return "text-red-600 bg-red-50";
  }
}
```

### 5.3 Benchmark Display

```typescript
// In skill assessment display
<div className="flex items-center gap-2">
  <span className="font-medium">{skill.name}</span>
  <Badge variant={getBenchmarkColor(benchmarkStatus)}>
    {rating}/5 ({benchmarkStatus})
  </Badge>
  {benchmarkDelta !== 0 && (
    <span className={benchmarkDelta > 0 ? "text-green-600" : "text-red-600"}>
      {benchmarkDelta > 0 ? "+" : ""}{benchmarkDelta.toFixed(1)} vs benchmark
    </span>
  )}
</div>
```

---

## 6. Knowledge Graph Preparation

### 6.1 Entity Types

```typescript
type GraphEntityType =
  | "player"           // Individual athlete
  | "skill"            // Skill definition
  | "skill_assessment" // Point-in-time rating
  | "sport"            // Sport configuration
  | "category"         // Skill category
  | "team"             // Team
  | "coach"            // Coach user
  | "organization"     // Club/organization
  | "benchmark"        // NGB benchmark
  | "goal"             // Development goal
  | "session"          // Training session
  | "match";           // Match/game
```

### 6.2 Relationship Types

```typescript
type GraphRelationship =
  // Player relationships
  | { type: "PLAYS_SPORT"; from: "player"; to: "sport"; since?: string }
  | { type: "HAS_SKILL"; from: "player"; to: "skill"; rating: number; date: string }
  | { type: "PLAYS_FOR"; from: "player"; to: "team"; position?: string }
  | { type: "COACHED_BY"; from: "player"; to: "coach"; sport?: string }
  | { type: "MEMBER_OF"; from: "player"; to: "organization" }

  // Skill relationships
  | { type: "PREREQUISITE_FOR"; from: "skill"; to: "skill"; strength: number }
  | { type: "RELATED_TO"; from: "skill"; to: "skill"; strength: number }
  | { type: "TRANSFERS_TO"; from: "skill"; to: "skill"; weight: number }
  | { type: "BELONGS_TO"; from: "skill"; to: "category" }

  // Assessment relationships
  | { type: "IMPROVED_FROM"; from: "assessment"; to: "assessment"; delta: number }
  | { type: "MEETS_BENCHMARK"; from: "assessment"; to: "benchmark"; status: string }

  // Derived relationships (computed)
  | { type: "SIMILAR_PROFILE"; from: "player"; to: "player"; similarity: number }
  | { type: "RECOMMENDED_FOCUS"; from: "player"; to: "skill"; priority: number };
```

### 6.3 Graph Query Examples

```typescript
// Find players with similar skill profiles
export const findSimilarPlayers = query({
  args: {
    playerId: v.id("players"),
    sportCode: v.string(),
    minSimilarity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const targetAssessments = await getLatestAssessments(ctx, args.playerId, args.sportCode);
    const targetVector = assessmentsToVector(targetAssessments);

    // Find all players in same sport/age group
    const candidates = await getCandidatePlayers(ctx, args.sportCode);

    // Calculate similarity scores
    const similarities = candidates.map(player => ({
      player,
      similarity: cosineSimilarity(targetVector, player.skillVector),
    }));

    return similarities
      .filter(s => s.similarity >= (args.minSimilarity || 0.7))
      .sort((a, b) => b.similarity - a.similarity);
  },
});

// Recommend skills to focus on based on benchmark gaps
export const getRecommendedFocusAreas = query({
  args: {
    passportId: v.id("sportPassports"),
  },
  handler: async (ctx, args) => {
    const passport = await ctx.db.get(args.passportId);
    const assessments = await getLatestAssessments(ctx, passport.playerId, passport.sportCode);
    const benchmarks = await getBenchmarksForContext(ctx, passport);

    // Find skills below benchmark
    const gaps = assessments
      .map(a => {
        const benchmark = benchmarks.find(b => b.skillCode === a.skillCode);
        if (!benchmark) return null;
        return {
          skillCode: a.skillCode,
          gap: benchmark.expectedRating - a.rating,
          priority: calculatePriority(a, benchmark),
        };
      })
      .filter(g => g && g.gap > 0)
      .sort((a, b) => b.priority - a.priority);

    return gaps.slice(0, 5); // Top 5 focus areas
  },
});
```

### 6.4 Future Graph Database Migration

```
Phase 1: Relational (Current - Convex)
├── All data in Convex tables
├── Relationships via foreign keys and denormalization
├── Queries compute relationships on-demand
└── Works for <100k players

Phase 2: Hybrid (Mid-term)
├── Core transactional data in Convex
├── Add graphRelationships table for precomputed relationships
├── Background jobs compute and update relationships
├── Query from cache for insights
└── Works for 100k-1M players

Phase 3: Full Graph (Long-term)
├── Core identity/transactional data in Convex
├── Neo4j or Amazon Neptune for relationship queries
├── Sync via Convex actions/webhooks
├── Advanced graph algorithms (PageRank, community detection)
├── Real-time recommendations and insights
└── Works for 1M+ players with complex queries
```

---

## 7. Seed Data: Initial Sport Configuration

### 7.1 Soccer Skills (FAI-aligned)

```typescript
const soccerCategories = [
  { code: "technical_ball_mastery", name: "Ball Mastery", domain: "technical", displayOrder: 1 },
  { code: "technical_passing", name: "Passing & Distribution", domain: "technical", displayOrder: 2 },
  { code: "technical_shooting", name: "Shooting & Finishing", domain: "technical", displayOrder: 3 },
  { code: "tactical", name: "Tactical Awareness", domain: "tactical", displayOrder: 4 },
  { code: "physical", name: "Physical Attributes", domain: "physical", displayOrder: 5 },
  { code: "mental", name: "Mental & Character", domain: "mental", displayOrder: 6 },
];

const soccerSkills = [
  // Ball Mastery (5 skills)
  { category: "technical_ball_mastery", code: "first_touch", name: "First Touch", isCore: true },
  { category: "technical_ball_mastery", code: "ball_control", name: "Ball Control", isCore: true },
  { category: "technical_ball_mastery", code: "ball_control_pressure", name: "Ball Control Under Pressure", isCore: false },
  { category: "technical_ball_mastery", code: "dribbling", name: "Dribbling", isCore: true },
  { category: "technical_ball_mastery", code: "turns_feints", name: "Turns & Feints", isCore: false },

  // Passing (4 skills)
  { category: "technical_passing", code: "short_passing", name: "Short Passing", isCore: true },
  { category: "technical_passing", code: "long_passing", name: "Long Passing", isCore: false },
  { category: "technical_passing", code: "through_balls", name: "Through Balls", isCore: false },
  { category: "technical_passing", code: "crossing", name: "Crossing", isCore: false },

  // Shooting (4 skills)
  { category: "technical_shooting", code: "finishing", name: "Finishing", isCore: true },
  { category: "technical_shooting", code: "shot_power", name: "Shot Power", isCore: false },
  { category: "technical_shooting", code: "shot_accuracy", name: "Shot Accuracy", isCore: true },
  { category: "technical_shooting", code: "heading", name: "Heading", isCore: false },

  // Tactical (5 skills)
  { category: "tactical", code: "positioning", name: "Positioning", isCore: true },
  { category: "tactical", code: "off_ball_movement", name: "Off-Ball Movement", isCore: false },
  { category: "tactical", code: "decision_making", name: "Decision Making", isCore: true },
  { category: "tactical", code: "game_awareness", name: "Game Awareness", isCore: true },
  { category: "tactical", code: "defensive_awareness", name: "Defensive Awareness", isCore: false },

  // Physical (4 skills)
  { category: "physical", code: "speed", name: "Speed", isCore: true },
  { category: "physical", code: "agility", name: "Agility", isCore: true },
  { category: "physical", code: "strength", name: "Strength", isCore: false },
  { category: "physical", code: "endurance", name: "Endurance", isCore: false },

  // Mental (4 skills)
  { category: "mental", code: "communication", name: "Communication", isCore: true },
  { category: "mental", code: "coachability", name: "Coachability", isCore: true },
  { category: "mental", code: "leadership", name: "Leadership", isCore: false },
  { category: "mental", code: "resilience", name: "Resilience", isCore: false },
];
```

### 7.2 Rugby Skills (IRFU-aligned)

```typescript
const rugbyCategories = [
  { code: "passing_handling", name: "Passing & Handling", domain: "technical", displayOrder: 1 },
  { code: "catching_receiving", name: "Catching & Receiving", domain: "technical", displayOrder: 2 },
  { code: "running_evasion", name: "Running & Evasion", domain: "technical", displayOrder: 3 },
  { code: "kicking", name: "Kicking", domain: "technical", displayOrder: 4 },
  { code: "contact_breakdown", name: "Contact & Breakdown", domain: "technical", displayOrder: 5 },
  { code: "tactical", name: "Tactical & Game Awareness", domain: "tactical", displayOrder: 6 },
  { code: "physical", name: "Physical Attributes", domain: "physical", displayOrder: 7 },
];

// Similar structure for rugby skills...
```

### 7.3 GAA Football Skills (GAA-aligned)

```typescript
const gaaFootballCategories = [
  { code: "ball_handling", name: "Ball Handling & Control", domain: "technical", displayOrder: 1 },
  { code: "passing_kicking", name: "Passing & Kicking", domain: "technical", displayOrder: 2 },
  { code: "catching", name: "Catching & Fielding", domain: "technical", displayOrder: 3 },
  { code: "scoring", name: "Scoring Skills", domain: "technical", displayOrder: 4 },
  { code: "defending", name: "Defending", domain: "technical", displayOrder: 5 },
  { code: "tactical", name: "Tactical Awareness", domain: "tactical", displayOrder: 6 },
  { code: "physical", name: "Physical Attributes", domain: "physical", displayOrder: 7 },
];

const gaaSkills = [
  // Ball Handling (4 skills)
  { category: "ball_handling", code: "solo", name: "Solo Run", isCore: true },
  { category: "ball_handling", code: "toe_tap", name: "Toe Tap / Bounce", isCore: true },
  { category: "ball_handling", code: "pick_up", name: "Pick Up", isCore: true },
  { category: "ball_handling", code: "ball_control", name: "Ball Control", isCore: true },

  // Passing & Kicking (3 skills)
  { category: "passing_kicking", code: "hand_pass", name: "Hand Pass", isCore: true },
  { category: "passing_kicking", code: "kick_pass", name: "Kick Pass", isCore: true },
  { category: "passing_kicking", code: "long_kick", name: "Long Kicking", isCore: false },

  // And so on...
];
```

---

## 8. Migration Strategy

### 8.1 Phase 1: Reference Data (Week 1)

**Tasks:**
1. Create `sports` table and seed with Soccer, Rugby, GAA Football, GAA Hurling
2. Create `skillCategories` table and seed per sport
3. Create `skillDefinitions` table and seed all skills
4. Create `positionsBySport` table and seed
5. Create `ageGroupConfig` table with defaults

**Validation:**
- All sports have complete skill hierarchies
- Display order is correct
- Skills map to existing MVP skill keys

### 8.2 Phase 2: Player Passports (Week 2)

**Tasks:**
1. Create `sportPassports` table
2. Create `skillAssessments` table
3. Create `fitnessAssessments` table
4. Migrate existing `players.skills` to `skillAssessments`
5. Migrate existing `players.fitness` to `fitnessAssessments`

**Migration Script:**
```typescript
// For each player with skills
const passport = await createSportPassport({
  playerId: player._id,
  sportCode: player.sport,
  organizationId: player.organizationId,
  status: "active",
});

// Convert skills record to individual assessments
for (const [skillCode, rating] of Object.entries(player.skills)) {
  await createSkillAssessment({
    passportId: passport._id,
    playerId: player._id,
    sportCode: player.sport,
    skillCode,
    rating,
    assessmentDate: player.lastReviewDate || new Date().toISOString(),
    assessmentType: "import",
    assessedBy: "system",
  });
}
```

### 8.3 Phase 3: UI Updates (Week 3)

**Tasks:**
1. Update Player Passport page to read from new structure
2. Add multi-sport tab interface
3. Update skill edit forms to write to `skillAssessments`
4. Add benchmark comparison display
5. Add skill history/progression view

### 8.4 Phase 4: Benchmarks (Week 4)

**Tasks:**
1. Create `benchmarks` table
2. Seed benchmark data (start with Soccer/FAI)
3. Build benchmark comparison queries
4. Add benchmark indicators to UI
5. Create benchmark report view

### 8.5 Phase 5: Knowledge Graph Prep (Week 5+)

**Tasks:**
1. Add `skillRelationships` table (prerequisite, transfer)
2. Create similarity computation queries
3. Build recommendation engine for focus areas
4. Add "Similar Players" feature
5. Add "Skill Progression Insights" feature

---

## 9. API Design

### 9.1 Core Queries

```typescript
// Reference data
getSports(): Sport[]
getSkillCategories(sportCode): SkillCategory[]
getSkillDefinitions(sportCode, categoryCode?): SkillDefinition[]
getPositions(sportCode): Position[]
getBenchmarks(sportCode, ageGroup, gender?, level?): Benchmark[]

// Player passports
getPlayerPassports(playerId): SportPassport[]
getPlayerPassport(playerId, sportCode): SportPassport
getLatestSkillAssessments(passportId): SkillAssessment[]
getSkillHistory(passportId, skillCode, limit?): SkillAssessment[]
getSkillProgression(passportId): ProgressionData[]

// Comparison & insights
getBenchmarkComparison(passportId): BenchmarkComparison[]
getRecommendedFocusAreas(passportId, limit?): FocusArea[]
findSimilarPlayers(passportId, minSimilarity?): SimilarPlayer[]
getCrossSportInsights(playerId): CrossSportInsight[]
```

### 9.2 Core Mutations

```typescript
// Passport management
createSportPassport(playerId, sportCode, organizationId, initialData?)
updatePassportPositions(passportId, positions)
archiveSportPassport(passportId)

// Skill assessments
createSkillAssessment(passportId, skillCode, rating, type, notes?)
batchCreateSkillAssessments(passportId, assessments[], type)
updateSkillAssessment(assessmentId, rating, notes?)

// Fitness
createFitnessAssessment(playerId, data)
```

---

## 10. Success Criteria

### 10.1 Functional Requirements

- [ ] Players can have multiple sport passports
- [ ] Skills are hierarchically organized by sport → category → skill
- [ ] All skill assessments are temporal with history
- [ ] Benchmarks can be loaded and compared against
- [ ] Cross-sport skill transfer is modeled
- [ ] UI supports multi-sport players with tabs
- [ ] Backward compatible with existing player data
- [ ] PDF export works with new structure

### 10.2 Performance Requirements

- [ ] Passport page loads < 2s (including all sports)
- [ ] Skill history query < 500ms for 100 assessments
- [ ] Benchmark comparison < 200ms
- [ ] Batch skill update (20 skills) < 1s
- [ ] Similar player search < 3s

### 10.3 Data Quality

- [ ] 100% of existing skills mapped to new definitions
- [ ] All assessments have valid dates
- [ ] No orphan assessments (passportId always valid)
- [ ] Benchmarks have source attribution

---

## 11. Open Questions

1. **Benchmark Sourcing**: How do we get official benchmark data from NGBs?
2. **Assessment Frequency**: What's the recommended cadence per age group?
3. **Historical Retention**: How long do we keep assessment history?
4. **Cross-Org Benchmarks**: Global benchmarks vs organization-specific?
5. **Self-Assessment Weight**: How should player self-assessments factor in?
6. **Coach Credentials**: Should assessor qualifications affect weighting?
7. **Graph DB Timing**: When is the data volume sufficient for dedicated graph DB?

---

## 12. Related Documents

- [PLAYER_PASSPORT_ANALYSIS.md](./PLAYER_PASSPORT_ANALYSIS.md) - Original MVP analysis
- [PARENT_DASHBOARD_ANALYSIS.md](./PARENT_DASHBOARD_ANALYSIS.md) - Parent view requirements
- [COMPREHENSIVE_AUTH_PLAN.md](./COMPREHENSIVE_AUTH_PLAN.md) - Section 12-13 (Knowledge Graph)
- [AUTH_IMPLEMENTATION_LOG.md](./AUTH_IMPLEMENTATION_LOG.md) - Implementation progress

---

## 13. References

### Industry Frameworks
- [Long-Term Athlete Development (LTAD) Model](https://sportforlife.ca/long-term-development/)
- [FTEM Framework (Australia)](https://www.ais.gov.au/ftem)

### Irish Governing Bodies
- [FAI Football Pathways Plan](https://www.fai.ie/play-and-participate/football-pathways-plan/)
- [IRFU Long Term Player Development](https://www.irishrugby.ie/2007/06/14/long-term-player-development/)
- [GAA Player Pathway](https://learning.gaa.ie/playerpathway)

### Technical Resources
- [Graph Databases for Pro Sports](https://graphable.ai/blog/graph-databases-for-pro-sports/)
- [Assessment in Youth Sport Best Practices](https://pmc.ncbi.nlm.nih.gov/articles/PMC3919511/)
- [Sports School Data Model](https://vertabelo.com/blog/a-sports-school-data-model/)
- [Skills Taxonomy Guide](https://365talents.com/en/resources/your-comprehensive-guide-to-skills-taxonomy/)

---

## 14. Next Steps

1. **Review and approve** this architecture with stakeholders
2. **Prioritize** initial sports (recommend: Soccer first, then GAA, then Rugby)
3. **Create seed data** for skill definitions
4. **Contact NGBs** for benchmark data or use internal estimates
5. **Begin Phase 1** schema implementation
6. **Create detailed tickets** for each phase
