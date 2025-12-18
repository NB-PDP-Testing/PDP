# Player Self-Access Feature Design

## Executive Summary

This document outlines a comprehensive design for enabling players to directly access their own passport data when enabled by their club, coach, and/or guardian. This feature recognizes that older youth players and adults benefit from direct engagement with their development journey.

---

## 1. Problem Statement

Currently, youth players cannot directly access their passport data - they must rely on:
- Parents/guardians viewing and sharing information
- Coaches showing them data during sessions

This creates friction for:
- **Older youth players (14-17)** who are increasingly autonomous and want to track their own progress
- **Players at multiple clubs** who need a unified view of their development
- **Self-motivated players** who want to practice independently based on feedback

---

## 2. Design Goals

1. **Safety First**: Robust controls for age-appropriate access
2. **Parental Control**: Guardians must always be in the loop
3. **Club Policy Compliance**: Organizations can set boundaries
4. **Progressive Trust**: Access can be granted incrementally
5. **Multi-Sport View**: Players see all their passports in one place
6. **Engagement Features**: Tools that make direct access valuable

---

## 3. User Stories

### 3.1 Guardian Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| G1 | Guardian | Enable my child's direct access | They can check their progress independently |
| G2 | Guardian | Set what my child can see | Sensitive notes remain private |
| G3 | Guardian | Disable access at any time | I maintain control |
| G4 | Guardian | Get notified when they log in | I know they're using it |
| G5 | Guardian | See what they've viewed | I can discuss it with them |

### 3.2 Club Admin Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| A1 | Club Admin | Set minimum age for player access | We comply with child protection policies |
| A2 | Club Admin | Require guardian approval | Parents are always in control |
| A3 | Club Admin | Control what players can see | Sensitive data stays private |
| A4 | Club Admin | Enable/disable the feature org-wide | We can phase it in gradually |
| A5 | Club Admin | See which players have access | We have oversight |

### 3.3 Coach Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| C1 | Coach | Recommend access for a player | Mature players get early access |
| C2 | Coach | Share specific feedback directly | Players can review my notes |
| C3 | Coach | See if player viewed recent updates | I know they're engaged |
| C4 | Coach | Flag content as "player visible" | I control what they see |

### 3.4 Player Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| P1 | Player | See my skill ratings | I know where I stand |
| P2 | Player | Track my progress over time | I see my improvement |
| P3 | Player | View coach feedback | I know what to work on |
| P4 | Player | See upcoming reviews | I can prepare |
| P5 | Player | Access all my sports in one place | I get a complete picture |
| P6 | Player | Get practice recommendations | I can train independently |
| P7 | Player | See my injury status | I know my restrictions |

---

## 4. Access Control Model

### 4.1 Three-Level Permission Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLUB POLICY LAYER                            │
│  • Master enable/disable for entire organization                │
│  • Minimum age requirement (e.g., 14+)                         │
│  • Default visibility settings                                  │
│  • Require guardian approval: Yes/No                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GUARDIAN PERMISSION LAYER                      │
│  • Guardian must explicitly enable (if club requires)           │
│  • Visibility restrictions (what child can/can't see)          │
│  • Can revoke at any time                                       │
│  • Notification preferences                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PLAYER ACCESS LAYER                           │
│  • Player creates/links account                                 │
│  • Access granted based on above layers                        │
│  • Visibility scoped to permissions                            │
│  • Audit trail of access                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Permission Matrix

| Data Type | Club Default | Guardian Override | Player Visibility |
|-----------|--------------|-------------------|-------------------|
| Skill ratings | Visible | Can hide | Sees if allowed |
| Skill history | Visible | Can hide | Sees if allowed |
| Coach notes (public) | Visible | Can hide | Sees if allowed |
| Coach notes (private) | Hidden | Cannot override | Never |
| Parent notes | Hidden | Can show | Only if guardian allows |
| Admin notes | Hidden | Cannot override | Never |
| Injury status | Visible | Can hide | Sees if allowed |
| Medical notes | Hidden | Can show | Only if guardian allows |
| Benchmark comparison | Visible | Can hide | Sees if allowed |
| Practice recommendations | Visible | Can hide | Sees if allowed |
| Development goals | Visible | Can hide | Sees if allowed |
| Attendance records | Hidden | Can show | Only if guardian allows |

### 4.3 Age Considerations

| Age Group | Recommended Policy | Rationale |
|-----------|-------------------|-----------|
| U6-U9 | Disabled | Too young for direct access |
| U10-U13 | Optional, guardian-only control | Emerging independence |
| U14-U17 | Enabled with guardian approval | Developing autonomy |
| 18+ (Adult) | Auto-enabled | Full autonomy |

---

## 5. Schema Extensions

### 5.1 New Tables

```typescript
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
})
  .index("by_organizationId", ["organizationId"])

// Guardian permission grants for player self-access
playerAccessGrants: defineTable({
  // Links
  playerIdentityId: v.id("playerIdentities"),
  guardianIdentityId: v.id("guardianIdentities"),
  organizationId: v.string(), // Grants are per-org

  // Status
  isEnabled: v.boolean(),

  // Visibility overrides (null = use org default)
  visibilityOverrides: v.optional(v.object({
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
  })),

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
  .index("by_player", ["playerIdentityId"])

// Player account links (when player creates their own account)
playerAccountLinks: defineTable({
  playerIdentityId: v.id("playerIdentities"),
  userId: v.string(), // Better Auth user ID

  // Verification
  verificationMethod: v.union(
    v.literal("guardian_verified"), // Guardian confirmed identity
    v.literal("email_verified"),    // Email verification
    v.literal("code_verified"),     // One-time code from guardian
    v.literal("admin_verified")     // Admin manually verified
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
  .index("by_userId", ["userId"])

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
  .index("by_user", ["userId", "timestamp"])
```

### 5.2 Schema Modifications

Add to `playerIdentities`:

```typescript
// In playerIdentities table, modify:
playerIdentities: defineTable({
  // ... existing fields ...

  // Player's own account (when they have direct access)
  userId: v.optional(v.string()), // Better Auth user ID
  email: v.optional(v.string()),  // Player's own email
  phone: v.optional(v.string()),

  // Self-access settings
  selfAccessEnabled: v.optional(v.boolean()),

  // ... existing fields ...
})
```

---

## 6. UI/UX Design

### 6.1 Guardian Flow: Enabling Access

```
┌─────────────────────────────────────────────────────────────────┐
│  "My Children" Dashboard                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  👤 Sean Murphy (Age 15)                                   │  │
│  │  ──────────────────────────────────────────────────────── │  │
│  │  📱 Direct Access: Not Enabled                            │  │
│  │                                                           │  │
│  │  [Enable Sean's Access →]                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              ↓ Click "Enable"

┌─────────────────────────────────────────────────────────────────┐
│  Enable Direct Access for Sean                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sean will be able to log in and view his development data     │
│  directly. You control what he can see.                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  What can Sean see?                                       │  │
│  │                                                           │  │
│  │  ☑ Skill ratings & progress                              │  │
│  │  ☑ Coach feedback (public notes)                         │  │
│  │  ☐ Your notes                                            │  │
│  │  ☑ Practice recommendations                              │  │
│  │  ☑ Development goals                                     │  │
│  │  ☑ Injury status (current only)                          │  │
│  │  ☐ Full injury history                                   │  │
│  │  ☐ Attendance records                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Notifications                                            │  │
│  │                                                           │  │
│  │  ☑ Notify me when Sean logs in                           │  │
│  │  ☐ Notify me when Sean views sensitive data              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  How will Sean log in?                                    │  │
│  │                                                           │  │
│  │  ○ Send invite to Sean's email: [               ]        │  │
│  │  ● Generate one-time code for Sean                       │  │
│  │  ○ I'll help Sean create account now                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│         [Cancel]                    [Enable Access →]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Player Dashboard (When Access Granted)

```
┌─────────────────────────────────────────────────────────────────┐
│  🏆 My Sports Development                         Sean Murphy   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  ⚽ Soccer      │ │  🏈 GAA         │ │  🏉 Rugby       │   │
│  │  St. Francis FC │ │  Local GAA Club │ │  Club Rugby    │   │
│  │  Overall: 4.2   │ │  Overall: 3.8   │ │  Not Active    │   │
│  │  ↑ 0.3 this mo  │ │  ↑ 0.1 this mo  │ │                 │   │
│  │  [View →]       │ │  [View →]       │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  📈 Recent Progress                                       │  │
│  │  ──────────────────────────────────────────────────────── │  │
│  │  Ball Control: 3 → 4  ⭐                                  │  │
│  │  "Great improvement in training this week!" - Coach Mike  │  │
│  │                                                           │  │
│  │  First Touch: 4 → 4 (steady)                             │  │
│  │                                                           │  │
│  │  Passing: 5 (Exceptional!) 🌟                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🎯 This Week's Focus                                     │  │
│  │  ──────────────────────────────────────────────────────── │  │
│  │  Based on your assessments, try these drills:            │  │
│  │                                                           │  │
│  │  1. Ball Control - Cone dribbling (10 mins)              │  │
│  │  2. Weak foot practice - 30 passes each foot             │  │
│  │                                                           │  │
│  │  [Watch tutorial videos →]                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ⚠️ Health Note                                          │  │
│  │  ──────────────────────────────────────────────────────── │  │
│  │  Ankle sprain - Cleared for full training                │  │
│  │  Last updated: Dec 15                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Club Admin: Policy Settings

```
┌─────────────────────────────────────────────────────────────────┐
│  Player Self-Access Settings                         [Enabled]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Age Requirements                                         │  │
│  │                                                           │  │
│  │  Minimum age for self-access: [14] years                 │  │
│  │                                                           │  │
│  │  ℹ️ Players younger than this cannot have direct access  │  │
│  │     even if guardian enables it.                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Approval Requirements                                    │  │
│  │                                                           │  │
│  │  ☑ Guardian approval required                            │  │
│  │  ☐ Coach recommendation required                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Default Data Visibility                                  │  │
│  │                                                           │  │
│  │  By default, players can see:                            │  │
│  │  ☑ Skill ratings and history                             │  │
│  │  ☑ Public coach notes                                    │  │
│  │  ☑ Benchmark comparisons                                 │  │
│  │  ☑ Practice recommendations                              │  │
│  │  ☑ Development goals                                     │  │
│  │  ☑ Current injury status                                 │  │
│  │  ☐ Attendance records                                    │  │
│  │                                                           │  │
│  │  Guardians can expand (not restrict) this list.          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Audit & Notifications                                    │  │
│  │                                                           │  │
│  │  ☑ Log all player access (required for compliance)       │  │
│  │  ☑ Allow guardians to receive login notifications        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                        [Save Settings]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Backend)
1. Create `playerAccessPolicies` table and model
2. Create `playerAccessGrants` table and model
3. Create `playerAccountLinks` table and model
4. Create `playerAccessLogs` table and model
5. Extend `playerIdentities` with self-access fields

### Phase 2: Admin Controls
1. Club policy settings page
2. Player access overview/dashboard
3. Access audit log viewer

### Phase 3: Guardian Controls
1. "Enable Access" flow in parent dashboard
2. Visibility configuration UI
3. Notification settings
4. Access management (revoke, modify)

### Phase 4: Player Experience
1. Player account creation flow
2. Player dashboard (multi-sport view)
3. Passport viewer (read-only)
4. Progress tracking view
5. Practice recommendations view

### Phase 5: Engagement Features
1. Achievement badges
2. Goal tracking
3. Progress notifications
4. Video tutorials integration

---

## 8. Security Considerations

### 8.1 Authentication
- Players use separate Better Auth accounts
- Link verification required before access granted
- Session management independent of guardian sessions

### 8.2 Data Isolation
- Strict scoping: players only see their own data
- No cross-player visibility
- No coach/admin impersonation

### 8.3 Audit Trail
- All access logged with timestamp, IP, action
- Guardian notification capability
- Club admin oversight

### 8.4 Age Verification
- DOB from player identity used for age checks
- Age recalculated on each access attempt
- Access auto-revokes if policy changes

---

## 9. Integration Points

### 9.1 Better Auth
- New "player" role in organization hierarchy
- Player accounts linked to player identities
- SSO consideration for players with multiple clubs

### 9.2 Notifications
- Guardian notification on player login
- Coach notification when player views feedback
- Push notifications for mobile (future)

### 9.3 Analytics
- Player engagement metrics
- Feature adoption tracking
- Age group usage patterns

---

## 10. Open Questions

1. **Email Requirements**: Do players need their own email, or can they use a parent's email with a separate account?

2. **Cross-Org Access**: If a player is at two clubs, should one grant give access to both, or require per-org grants?

3. **Adult Transition**: When a youth player turns 18, should access become automatic?

4. **Data Portability**: Should players be able to export their own data?

5. **Social Features**: Should players ever see anonymized comparisons to peers?

---

## 11. Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Guardian enablement rate | 30% of eligible players | Grants / Eligible players |
| Player login frequency | 2x per week | Access logs |
| Feature engagement | 70% view skills | Access logs by action |
| Guardian satisfaction | >4/5 rating | Survey |
| Player satisfaction | >4/5 rating | Survey |
| Support tickets | <5% of users | Support system |

---

## 12. References

- [PLAYER_PASSPORT_ARCHITECTURE.md](./PLAYER_PASSPORT_ARCHITECTURE.md)
- [IDENTITY_MIGRATION_PROGRESS.md](./IDENTITY_MIGRATION_PROGRESS.md)
- [COMPREHENSIVE_AUTH_PLAN.md](./COMPREHENSIVE_AUTH_PLAN.md)

---

*Design Document Version: 1.0*
*Created: December 17, 2025*
*Status: Draft - Pending Review*
