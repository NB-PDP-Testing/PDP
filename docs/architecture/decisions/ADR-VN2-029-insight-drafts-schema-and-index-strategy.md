# ADR-VN2-029: Insight Drafts Schema and Index Strategy

**Status**: Proposed
**Date**: 2026-02-07
**Phase**: 6 (Drafts & Confirmation Workflow)
**Story**: US-VN-019

## Context and Problem Statement

The `insightDrafts` table needs a well-designed schema with appropriate indexes for all identified query patterns. The PRD proposes several indexes and schema fields. We need to validate each and identify gaps.

## Schema Analysis

### PRD-Proposed Fields

| Field | Type | Notes | Verdict |
|-------|------|-------|---------|
| draftId | v.string() | UUID via crypto.randomUUID() | KEEP -- consistent with ADR-VN2-008 |
| artifactId | v.id("voiceNoteArtifacts") | FK to artifact | KEEP |
| claimId | v.id("voiceNoteClaims") | FK to claim | KEEP |
| playerIdentityId | v.optional(v.id("playerIdentities")) | Resolved player | KEEP -- optional because some drafts may not have a resolved player |
| insightType | v.union(...) | PRD has 8 types | EXPAND -- should match claim topics (15 topics, not 8) |
| title | v.string() | From claim | KEEP |
| description | v.string() | From claim | KEEP |
| evidence | v.object(...) | Transcript snippet | KEEP |
| aiConfidence | v.number() | From claim.extractionConfidence | KEEP |
| resolutionConfidence | v.number() | From entity resolution score | KEEP |
| overallConfidence | v.number() | ai * resolution | KEEP -- denormalized for query efficiency |
| requiresConfirmation | v.boolean() | Auto-confirm gate result | KEEP |
| status | v.union(...) | PRD has 4, main PRD has 5 | USE 5 (pending, confirmed, rejected, applied, expired) |
| organizationId | v.string() | Denormalized | KEEP -- required for org-scoped queries |
| coachUserId | v.string() | Denormalized | KEEP -- required for coach-scoped queries |
| confirmedAt | v.optional(v.number()) | When confirmed | KEEP |
| appliedAt | v.optional(v.number()) | When applied | KEEP |
| createdAt | v.number() | | KEEP |
| updatedAt | v.number() | | KEEP |

### Additional Fields Needed

| Field | Type | Rationale |
|-------|------|-----------|
| displayOrder | v.number() | 1-indexed position within artifact (ADR-VN2-028) |
| resolvedPlayerName | v.optional(v.string()) | Denormalized for WhatsApp summary message (avoids N+1 lookup) |

### insightType: 15 Topics vs 8

The PRD proposes 8 insightType values, but claims use 15 topics. We should use the FULL claim topic set to avoid lossy mapping. The draft represents a claim-to-insight bridge, so it should preserve the topic granularity.

```typescript
insightType: v.union(
  v.literal("injury"),
  v.literal("skill_rating"),
  v.literal("skill_progress"),
  v.literal("behavior"),
  v.literal("performance"),
  v.literal("attendance"),
  v.literal("wellbeing"),
  v.literal("recovery"),
  v.literal("development_milestone"),
  v.literal("physical_development"),
  v.literal("parent_communication"),
  v.literal("tactical"),
  v.literal("team_culture"),
  v.literal("todo"),
  v.literal("session_plan")
)
```

### Status: 5 Values

```typescript
status: v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("rejected"),
  v.literal("applied"),
  v.literal("expired")
)
```

## Index Analysis

### PRD-Proposed Indexes

| Index | Fields | Used By | Verdict |
|-------|--------|---------|---------|
| by_draftId | [draftId] | confirmDraft, rejectDraft (lookup by draftId string) | KEEP |
| by_artifactId | [artifactId] | getDraftsByArtifact, CONFIRM command (all drafts for an artifact) | KEEP |
| by_org_and_coach_and_status | [organizationId, coachUserId, status] | getPendingDraftsForCoach, CONFIRM ALL, CANCEL | KEEP |
| by_playerIdentityId_and_status | [playerIdentityId, status] | Future: "show all pending drafts for this player" | KEEP |

### Missing Indexes

| Proposed Index | Fields | Needed By |
|----------------|--------|-----------|
| by_artifactId_and_status | [artifactId, status] | getDraftsByArtifactAndStatus -- needed by command handler to get only "pending" drafts for an artifact efficiently | ADD |

### Index Verdict: 5 indexes

```typescript
.index("by_draftId", ["draftId"])
.index("by_artifactId", ["artifactId"])
.index("by_artifactId_and_status", ["artifactId", "status"])
.index("by_org_and_coach_and_status", ["organizationId", "coachUserId", "status"])
.index("by_playerIdentityId_and_status", ["playerIdentityId", "status"])
```

### Regarding by_org_and_coach_and_status

This is a 3-field composite index. The query pattern is:
```typescript
ctx.db.query("insightDrafts")
  .withIndex("by_org_and_coach_and_status", q =>
    q.eq("organizationId", orgId)
     .eq("coachUserId", coachUserId)
     .eq("status", "pending")
  )
```

This efficiently supports:
- Coach dashboard: "show my pending drafts"
- WhatsApp CONFIRM ALL: "confirm all pending for this coach in this org"

## Complete Schema

```typescript
insightDrafts: defineTable({
  draftId: v.string(),
  artifactId: v.id("voiceNoteArtifacts"),
  claimId: v.id("voiceNoteClaims"),
  playerIdentityId: v.optional(v.id("playerIdentities")),
  resolvedPlayerName: v.optional(v.string()),
  insightType: v.union(/* 15 topics */),
  title: v.string(),
  description: v.string(),
  evidence: v.object({
    transcriptSnippet: v.string(),
    timestampStart: v.optional(v.number()),
    audioClipStorageId: v.optional(v.id("_storage")),
  }),
  displayOrder: v.number(),
  aiConfidence: v.number(),
  resolutionConfidence: v.number(),
  overallConfidence: v.number(),
  requiresConfirmation: v.boolean(),
  status: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("rejected"),
    v.literal("applied"),
    v.literal("expired")
  ),
  organizationId: v.string(),
  coachUserId: v.string(),
  confirmedAt: v.optional(v.number()),
  appliedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_draftId", ["draftId"])
  .index("by_artifactId", ["artifactId"])
  .index("by_artifactId_and_status", ["artifactId", "status"])
  .index("by_org_and_coach_and_status", ["organizationId", "coachUserId", "status"])
  .index("by_playerIdentityId_and_status", ["playerIdentityId", "status"])
```

## Consequences

**Positive**: 5 efficient indexes cover all identified query patterns. Full topic preservation from claims. Stable numbering via displayOrder. Denormalized resolvedPlayerName avoids N+1 in WhatsApp summary.
**Negative**: 5 indexes adds write cost. The 3-field composite `by_org_and_coach_and_status` is the most expensive but is justified by the primary query pattern. The schema has 20+ fields but this is consistent with other v2 tables (voiceNoteClaims has ~25 fields).
