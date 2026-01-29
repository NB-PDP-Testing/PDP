# Phase 7 & Knowledge Graph Architecture Alignment

**Date**: 2026-01-25
**Status**: ✅ Aligned - No Changes Required
**Context**: Analysis of P7 design vs future knowledge graph implementation

---

## Executive Summary

Our Phase 7 prerequisite design **already aligns perfectly** with the planned knowledge graph architecture documented in `docs/architecture/knowledge-graph.md`. The `voiceNoteInsights` and `autoAppliedInsights` tables are positioned to become the foundation for graph relationship tracking.

**No changes needed to P7 prerequisites**, but implementation should be mindful of future graph sync requirements.

---

## Knowledge Graph Vision for Insights

### Graph Node Design (from knowledge-graph.md:104)

```cypher
(:Insight {id, category, description, status})
```

### Graph Relationships (from knowledge-graph.md:126-129)

```cypher
(:Coach)-[:CREATED]->(:VoiceNote)-[:CONTAINS]->(:Insight)
(:Insight)-[:ABOUT]->(:Player)
(:Insight)-[:LED_TO]->(:Assessment | :Goal | :Injury)
```

### Key Use Case: "Voice Note → Improvement Path" (lines 224-244)

The knowledge graph will track:
- Which insights were acted upon (manual or auto-applied)
- What improvements resulted (skill assessments, goals created)
- How coach observations lead to measurable outcomes

**This is EXACTLY what Phase 7 is building!**

---

## P7 Design Alignment Check

### ✅ Perfect Alignments

| Knowledge Graph Requirement | P7 Implementation | Status |
|-----------------------------|-------------------|--------|
| **Insights as nodes** (not embedded) | `voiceNoteInsights` dedicated table | ✅ DONE |
| **Confidence scoring** | `confidenceScore: v.number()` field | ✅ DONE |
| **Status tracking** | `status: pending \| applied \| dismissed \| auto_applied` | ✅ DONE |
| **Category classification** | `category: v.string()` (skill, attendance, goal, etc.) | ✅ DONE |
| **Player association** | `playerIdentityId: v.id("playerIdentities")` | ✅ DONE |
| **Source tracking** | `voiceNoteId: v.id("voiceNotes")` | ✅ DONE |

### ✅ Critical Future-Proofing: [:LED_TO] Relationship

The knowledge graph's **most important relationship** for Phase 7 is:

```cypher
(:Insight)-[:LED_TO]->(:Assessment | :Goal | :Injury)
```

**Our `autoAppliedInsights` table already supports this!**

```typescript
// autoAppliedInsights schema (from P7 prerequisites)
{
  insightId: v.id("voiceNoteInsights"),      // 🔗 Source insight
  targetTable: v.string(),                    // "skillAssessments" | "passportGoals" | etc.
  targetRecordId: v.optional(v.string()),    // 🔗 Created/updated record ID
  changeType: v.string(),                     // "skill_rating" | "goal_created" | etc.
  // ... audit fields
}
```

When the knowledge graph is implemented, sync will be straightforward:

```cypher
// Sync auto-applied insight to graph
MATCH (i:Insight {id: $insightId})
MATCH (a:Assessment {id: $targetRecordId})
CREATE (i)-[:LED_TO]->(a)
```

---

## Phase 7 Implementation Guidance

### Phase 7.2: Supervised Auto-Apply (Critical)

When implementing auto-apply mutations, **ensure `targetRecordId` is populated correctly**:

#### Example: Auto-Apply Skill Insight

```typescript
// packages/backend/convex/mutations/insights.ts

export const autoApplySkillInsight = mutation({
  args: { insightId: v.id("voiceNoteInsights") },
  returns: v.id("autoAppliedInsights"),
  handler: async (ctx, args) => {
    const insight = await ctx.db.get(args.insightId);

    // Create skill assessment (player profile update)
    const assessmentId = await ctx.db.insert("skillAssessments", {
      playerIdentityId: insight.playerIdentityId,
      skillCode: extractedSkillCode,
      rating: extractedRating,
      assessorRole: "system", // AI-generated assessment
      assessmentType: "training",
      assessedBy: "system",
      assessmentDate: Date.now(),
      // ... other fields
    });

    // 🔗 CRITICAL: Store targetRecordId for future graph sync
    const auditId = await ctx.db.insert("autoAppliedInsights", {
      insightId: insight._id,
      voiceNoteId: insight.voiceNoteId,
      playerIdentityId: insight.playerIdentityId,
      coachId: insight.coachId,
      organizationId: insight.organizationId,

      // Snapshot
      category: insight.category,
      confidenceScore: insight.confidenceScore,
      insightTitle: insight.title,
      insightDescription: insight.description,

      // Auto-apply tracking
      appliedAt: Date.now(),
      autoAppliedByAI: true,

      // 🔗 Graph sync enablement
      changeType: "skill_rating",
      targetTable: "skillAssessments",
      targetRecordId: assessmentId, // 🎯 This enables [:LED_TO] relationship

      // Change tracking
      previousValue: JSON.stringify(null), // New assessment
      newValue: JSON.stringify({ skillCode, rating }),
    });

    // Update insight status
    await ctx.db.patch(insight._id, {
      status: "auto_applied",
      appliedAt: Date.now(),
      appliedBy: "system",
    });

    return auditId;
  },
});
```

#### Example: Auto-Apply Goal Insight

```typescript
// Similar pattern for goals
const goalId = await ctx.db.insert("passportGoals", {
  // ... goal data
});

await ctx.db.insert("autoAppliedInsights", {
  // ... audit fields
  targetTable: "passportGoals",
  targetRecordId: goalId, // 🔗 Enables (:Insight)-[:LED_TO]->(:Goal)
  changeType: "goal_created",
});
```

### Code Comments (Recommended)

Add comments in Phase 7.2 implementation:

```typescript
/**
 * KNOWLEDGE GRAPH INTEGRATION:
 * The targetRecordId stored here will enable the [:LED_TO] relationship
 * when the knowledge graph is implemented. This allows tracking:
 *   (:VoiceNote)-[:CONTAINS]->(:Insight)-[:LED_TO]->(:Assessment)
 *
 * See: docs/architecture/knowledge-graph.md (lines 126-129)
 */
targetRecordId: assessmentId,
```

---

## Future Knowledge Graph Sync Strategy

When Phase 3 of the knowledge graph launches (weeks 9-12 per roadmap), the sync will be:

### Event-Driven Sync Example

```typescript
// packages/backend/convex/actions/graphSync.ts

export const syncAutoAppliedInsightToGraph = action({
  args: { auditId: v.id("autoAppliedInsights") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const audit = await ctx.runQuery(internal.insights.getAuditById, {
      id: args.auditId,
    });

    // Sync to Neo4j
    await fetch(process.env.NEO4J_HTTP_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEO4J_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statements: [
          {
            statement: `
              MERGE (i:Insight {id: $insightId})
              SET i.category = $category,
                  i.status = "auto_applied",
                  i.confidence = $confidence

              WITH i
              MERGE (a:Assessment {id: $targetRecordId})

              // Create the [:LED_TO] relationship
              MERGE (i)-[:LED_TO {
                appliedAt: datetime($appliedAt),
                confidence: $confidence,
                autoApplied: true
              }]->(a)
            `,
            parameters: {
              insightId: audit.insightId,
              category: audit.category,
              confidence: audit.confidenceScore,
              targetRecordId: audit.targetRecordId, // 🔗 Key field
              appliedAt: new Date(audit.appliedAt).toISOString(),
            },
          },
        ],
      }),
    });

    return null;
  },
});
```

---

## Success Metrics Alignment

### Knowledge Graph Phase 3 Target (from knowledge-graph.md:567)

| Metric | Target | How P7 Enables This |
|--------|--------|---------------------|
| **Insight-to-improvement tracking** | > 60% traced | `autoAppliedInsights.targetRecordId` enables [:LED_TO] edges |
| **Recommendation relevance** | > 70% useful | Confidence scoring + undo tracking trains the model |
| **AI query accuracy** | > 85% | Auto-apply audit trail provides ground truth data |

### Knowledge Graph Use Case 4 Success (lines 241-244)

**Target**: _"Voice note insights marked 'skill_progress' lead to measurable improvement 73% of the time"_

**How P7 Enables This**:
1. `voiceNoteInsights.category = "skill"` → filters for skill insights
2. `autoAppliedInsights.targetRecordId` → links to `skillAssessments._id`
3. Graph query can then follow `[:FOLLOWED_BY]` chain to see if rating improved
4. Confidence score + undo rate → accuracy metric

---

## Data Model Compatibility

### P7 Tables → Knowledge Graph Nodes

| P7 Table | Graph Node | Sync Strategy |
|----------|------------|---------------|
| `voiceNoteInsights` | `(:Insight)` | Event-driven on insert |
| `voiceNotes` | `(:VoiceNote)` | Already exists (would sync separately) |
| `skillAssessments` | `(:Assessment)` | Existing sync (knowledge graph Phase 1) |
| `passportGoals` | `(:Goal)` | Event-driven on insert |
| `autoAppliedInsights` | N/A (becomes [:LED_TO] edge) | Drives relationship creation |

### P7 Relationships → Graph Edges

| P7 Foreign Key | Graph Relationship | Notes |
|----------------|-------------------|-------|
| `voiceNoteInsights.voiceNoteId` | `(:VoiceNote)-[:CONTAINS]->(:Insight)` | Direct mapping |
| `voiceNoteInsights.playerIdentityId` | `(:Insight)-[:ABOUT]->(:Player)` | Direct mapping |
| `autoAppliedInsights.targetRecordId` | `(:Insight)-[:LED_TO]->(:Assessment\|:Goal)` | **Critical for causality tracking** |

---

## Recommendations for Phase 7

### ✅ No Changes to Prerequisites Required

Our prerequisite work is already aligned. The following are implementation reminders:

### 📋 Phase 7.1 (Preview Mode)
- Track `wouldAutoApply` predictions (already in schema)
- No graph sync needed yet (preview only)

### 📋 Phase 7.2 (Supervised Auto-Apply)
1. **Always populate `targetRecordId`** when creating records
2. **Add code comments** about knowledge graph intent
3. **Ensure `changeType` is accurate** for future filtering:
   - `"skill_rating"` → `(:Assessment)` nodes
   - `"goal_created"` → `(:Goal)` nodes
   - `"attendance_record"` → TBD (might not be graphed)
   - `"performance_note"` → TBD (might link to `(:VoiceNote)` directly)

### 📋 Phase 7.3 (Learning Loop)
- Undo tracking already supports graph analytics
- `undoReason` can train ML models for confidence calibration
- High undo rate → lower confidence threshold → fewer [:LED_TO] edges (quality over quantity)

---

## PRD Update Recommendations

Add a note to `p7-coach-insight-auto-apply-phase7.prd.json` in the technical notes:

```json
{
  "technicalNotes": {
    "knowledgeGraphAlignment": {
      "summary": "Phase 7 implementation is designed to support future knowledge graph integration (docs/architecture/knowledge-graph.md)",
      "keyFields": {
        "autoAppliedInsights.targetRecordId": "Enables (:Insight)-[:LED_TO]->(:Assessment|:Goal) relationships",
        "voiceNoteInsights.confidenceScore": "Matches (:Insight {confidence}) node property",
        "autoAppliedInsights.changeType": "Used for filtering edge creation by target node type"
      },
      "futureSync": "When knowledge graph launches (Phase 3, weeks 9-12), event-driven sync will use autoAppliedInsights as source of truth for causal relationships"
    }
  }
}
```

---

## Conclusion

**✅ Phase 7 Prerequisites: FULLY ALIGNED with Knowledge Graph Architecture**

Our design decisions were forward-looking and already support the knowledge graph vision:

1. **Extracted insights to dedicated table** → Enables (:Insight) nodes
2. **Added confidence scoring** → Matches graph schema
3. **Audit trail with targetRecordId** → Powers [:LED_TO] relationships
4. **Category-based classification** → Graph query filtering

**No architectural changes needed.** Proceed with Ralph Phase 7.1 as planned.

When the knowledge graph launches in ~3-6 months, Phase 7's auto-applied insights will become one of the most valuable data sources for:
- Tracking coach effectiveness (which observations lead to improvement)
- Training AI confidence calibration (undo patterns)
- Validating insight quality (measured outcomes)
- Building predictive models (insight → outcome chains)

---

**Prepared by**: Claude Sonnet 4.5
**Date**: 2026-01-25
**Related Docs**:
- `docs/architecture/knowledge-graph.md`
- `scripts/ralph/P7_PREREQUISITES_COMPLETED.md`
- `scripts/ralph/prds/p7-coach-insight-auto-apply-phase7.prd.json`
