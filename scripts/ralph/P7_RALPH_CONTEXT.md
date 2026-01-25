# Phase 7 Ralph Context - Complete Learnings from P5 & P6

**Date**: 2026-01-25
**Purpose**: Provide Ralph with all learnings, patterns, and insights from P5/P6 to ensure high-quality P7 implementation
**Base Branch**: `phase7/prerequisites-insight-auto-apply`

---

## Executive Summary

Phase 7 implements auto-apply for **coach insights** (updating player profiles), mirroring the trust system built in Phase 5 for **parent summaries** (sending messages to parents).

**P5 Pattern**: Trust-based progressive automation for parent communication
**P7 Pattern**: Trust-based progressive automation for player data updates

Both use the same philosophy:
1. **Preview Mode** - Show what AI would do, don't do it yet
2. **Supervised Mode** - Do it, but track undo patterns
3. **Learning Loop** - Adapt to each coach's preferences

---

## Phase 5 Learnings - Trust System for Parent Summaries

### Core Architecture Pattern

**The Trust Ladder** (3 levels):
- **Level 0-1**: Manual only - AI assists but doesn't auto-send
- **Level 2**: Supervised automation - AI auto-sends, coach can undo
- **Level 3**: Full automation - AI trusted completely

**Preview Mode Stats** (from P5):
```typescript
// coachTrustLevels.parentSummaryPreviewModeStats
{
  wouldAutoSendSummaries: number,      // How many AI predicted auto-send
  coachSentThose: number,              // How many coach actually sent
  coachSuppressedThose: number,        // How many coach suppressed
  agreementRate: number,               // coachSentThose / wouldAutoSendSummaries
  startedAt: number,
  completedAt: number | undefined      // After 20 summaries
}
```

**Key Insight**: 20-item preview period establishes baseline trust. If agreement rate >70%, coach likely trusts AI.

### What Worked in P5

1. **Confidence Visualization** (US-003):
   - Progress bar + percentage (e.g., "AI Confidence: 85%")
   - Color coding: Red <60%, Amber 60-79%, Green 80%+
   - **Pattern**: `<Progress value={score * 100} className="h-2" />`

2. **Preview Mode Badges** (US-004):
   - "AI would auto-send this at Level 2+" badge
   - Used `Sparkles` icon from lucide-react
   - Blue color scheme (`bg-blue-100 text-blue-700`)
   - **Pattern**: Show prediction BEFORE enabling automation

3. **Tracking Preview Stats** (US-005):
   - Increment counters in mutations BEFORE applying action
   - Calculate agreement rate: `applied / totalPredicted`
   - Mark complete after 20 items
   - **Critical**: Track both "apply" and "dismiss" to get full picture

4. **Override Tracking** (P5 Phase 4 - US-016):
   - Track when coach disagrees with AI (rejects high confidence, approves low confidence)
   - Optional feedback: "Was inaccurate", "Too sensitive", "Wrong timing"
   - **Pattern**: Make feedback optional (low friction, most coaches skip it)

5. **Learning Loop** (P5 Phase 4 - US-019):
   - Analyze override patterns per coach
   - Adjust confidence thresholds: Conservative coaches get higher threshold
   - **Example**: Coach rejects 3+ high confidence items → increase threshold from 0.7 to 0.8

### What Didn't Work in P5

1. **Too Many Feedback Fields**: Original design had 8 checkboxes. Reduced to 4. Lesson: Keep UI simple.

2. **No Skip Button**: Original feedback modal was blocking. Added "Skip" button. Lesson: Never force feedback.

3. **Per-Org Trust Levels**: Initial design was per-org. Changed to per-coach. Lesson: Trust is personal, not organizational.

---

## Phase 6 Learnings - Monitoring & Safety

### Cost Control Architecture

**Pattern from P6.1**:
```typescript
// Check budget BEFORE calling AI
const budget = await checkOrgBudget(orgId);
if (budget.dailySpend >= budget.dailyLimit) {
  throw new ConvexError("Daily budget exceeded");
}

// Make AI call...

// Log usage AFTER AI call
await logAIUsage({
  orgId,
  feature: "parent_summaries",
  tokensUsed,
  estimatedCost
});
```

**Lesson**: **Fail fast** - Check limits before expensive operations, not after.

### Circuit Breaker Pattern (P6.2)

**When Anthropic API is down**:
1. Track consecutive failures
2. After 5 failures, open circuit (stop calling API)
3. Return fallback content (template messages)
4. Self-heal: Test call every 5 minutes, close circuit when API recovers

**Implementation**:
```typescript
// lib/circuitBreaker.ts
if (circuitState === "open") {
  console.warn("Circuit open - using fallback");
  return fallbackTemplate();
}

try {
  const result = await aiCall();
  resetFailureCount(); // Success!
  return result;
} catch (error) {
  incrementFailureCount();
  if (failureCount >= 5) {
    openCircuit();
  }
  throw error;
}
```

**Lesson**: Don't retry forever. Gracefully degrade when external services fail.

### Rate Limiting (P6.1)

**Per-org limits**:
- 10 messages per hour
- 50 messages per day
- $5 cost per day

**Pattern**:
```typescript
const rateLimit = await getRateLimit(orgId);
if (rateLimit.messagesThisHour >= 10) {
  throw new ConvexError("Rate limit exceeded");
}
```

**Lesson**: Protect against runaway costs. Limits reset automatically via cron.

---

## Common Ralph Patterns (From P5/P6 Experience)

### 1. Schema Changes

**Pattern**:
```typescript
// Always add fields as optional to support existing data
newField: v.optional(v.object({ /* ... */ }))

// Always run codegen after schema changes
// npx -w packages/backend convex codegen
```

**Ralph Behavior**: Ralph sometimes forgets to run codegen. Remind it in acceptance criteria.

### 2. Query/Mutation Structure

**Pattern**:
```typescript
export const queryName = query({
  args: { param: v.string() },
  returns: v.union(v.object({ /* ... */ }), v.null()),
  handler: async (ctx, args) => {
    // Always use indexes
    const result = await ctx.db
      .query("tableName")
      .withIndex("by_field", q => q.eq("field", args.param))
      .first();

    return result;
  }
});
```

**Ralph Behavior**: Ralph sometimes uses `.filter()` instead of `.withIndex()`. Watch for this.

### 3. Frontend Components

**Pattern for Shadcn UI**:
```typescript
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Color-coded confidence
<span className={cn(
  "font-medium",
  score < 0.6 ? "text-red-600" :
  score < 0.8 ? "text-amber-600" : "text-green-600"
)}>
  AI Confidence: {Math.round(score * 100)}%
</span>

// Progress bar
<Progress value={score * 100} className="h-2" />
```

**Ralph Behavior**: Ralph is good at UI but sometimes forgets imports. Check import statements.

### 4. Mutation Side Effects

**Pattern**:
```typescript
export const applyAction = mutation({
  handler: async (ctx, args) => {
    // 1. Check permissions
    const userId = await getCurrentUser(ctx);

    // 2. Apply main action
    await ctx.db.patch(recordId, { status: "applied" });

    // 3. Update related records (preview stats, trust levels, etc.)
    await updatePreviewStats(ctx, userId, wasAutoApply);

    // 4. Log for analytics (optional)
    await logEvent(ctx, "insight_applied", metadata);

    return recordId;
  }
});
```

**Lesson**: Side effects (tracking, logging) happen AFTER main action, inside same mutation (transactional).

### 5. Error Handling

**Pattern**:
```typescript
// Use ConvexError for user-facing errors
if (!hasPermission) {
  throw new ConvexError("You don't have permission to do this");
}

// Let system errors bubble up
const result = await ctx.db.get(id);
if (!result) {
  throw new ConvexError("Record not found");
}
```

**Ralph Behavior**: Ralph is good at error handling. Rarely an issue.

---

## Phase 7 Specific Context

### Key Differences from P5

| Aspect | P5 (Parent Summaries) | P7 (Insights Auto-Apply) |
|--------|----------------------|--------------------------|
| **What's Automated** | Sending messages to parents | Updating player profiles |
| **Risk Level** | Medium (bad message = upset parent) | **HIGH** (bad data = corrupted records) |
| **Undo Complexity** | Easy (message stays in DB) | **Hard** (need to revert field changes) |
| **Safety Categories** | All summaries treated equally | **Injury/Medical NEVER auto-apply** |
| **Data Changes** | Creates new records | **Modifies existing records** |

### Critical Safety Requirements for P7

**NEVER auto-apply these categories**:
```typescript
if (insight.category === "injury" || insight.category === "medical") {
  wouldAutoApply = false; // ALWAYS manual review
}
```

**Audit trail is CRITICAL**:
```typescript
// autoAppliedInsights table stores:
{
  targetRecordId: string,      // Which record was changed
  previousValue: string,        // JSON snapshot of old value
  newValue: string,             // JSON snapshot of new value
  changeType: string,           // "skill_rating", "goal_created", etc.
}
```

**Why**: We need to undo player profile changes. Message can't be unsent, but data can be reverted.

### P7 Trust Threshold Strategy

**Confidence minimums by category** (from prerequisites):
- **Skills**: 0.6 minimum (60%) - Less critical, safe to be aggressive
- **Attendance**: 0.7 minimum (70%) - Factual data, medium confidence needed
- **Goals**: 0.8 minimum (80%) - Subjective, high confidence required
- **Performance**: 0.8 minimum (80%) - Coach notes, high confidence required

**Why different thresholds?**: Skill ratings are low-stakes (can be updated easily). Goals and performance notes are higher-stakes (more subjective).

### Knowledge Graph Integration

**Critical field**: `autoAppliedInsights.targetRecordId`

**Why**: Future knowledge graph will track:
```cypher
(:Insight)-[:LED_TO]->(:Assessment | :Goal)
```

**Ralph Implementation Note**: When auto-applying creates a record, **always store the targetRecordId**:

```typescript
// Example from P7.2 (future phase)
const assessmentId = await ctx.db.insert("skillAssessments", {
  // ... skill data
});

await ctx.db.insert("autoAppliedInsights", {
  insightId: insight._id,
  targetRecordId: assessmentId, // 🔗 CRITICAL for knowledge graph
  targetTable: "skillAssessments",
  changeType: "skill_rating",
  // ... rest of audit fields
});
```

**Lesson**: Think beyond current phase. Design for future integrations.

---

## Code Style & Conventions (From All Phases)

### Import Organization

```typescript
// 1. React/Next
import { useState } from "react";

// 2. External libraries
import { useQuery, useMutation } from "convex/react";

// 3. UI components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 4. Icons
import { Sparkles, AlertTriangle } from "lucide-react";

// 5. Local utilities
import { cn } from "@/lib/utils";

// 6. Convex API
import { api } from "@/convex/_generated/api";
```

### Component Structure

```typescript
interface ComponentProps {
  insight: {
    _id: Id<"voiceNoteInsights">;
    confidenceScore: number;
    wouldAutoApply?: boolean;
    // ... other fields
  };
  onApply: (id: Id<"voiceNoteInsights">) => void;
  onDismiss: (id: Id<"voiceNoteInsights">) => void;
}

export function InsightCard({ insight, onApply, onDismiss }: ComponentProps) {
  // 1. Hooks at top
  const [loading, setLoading] = useState(false);

  // 2. Derived values
  const confidenceColor = insight.confidenceScore < 0.6 ? "red" :
                          insight.confidenceScore < 0.8 ? "amber" : "green";

  // 3. Event handlers
  const handleApply = async () => {
    setLoading(true);
    await onApply(insight._id);
    setLoading(false);
  };

  // 4. Render
  return (
    <div className="border rounded-lg p-4">
      {/* Component JSX */}
    </div>
  );
}
```

### Mutation Patterns

```typescript
export const applyInsight = mutation({
  args: {
    insightId: v.id("voiceNoteInsights"),
    reason: v.optional(v.string())
  },
  returns: v.id("voiceNoteInsights"),
  handler: async (ctx, args) => {
    // 1. Get user context
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // 2. Fetch data
    const insight = await ctx.db.get(args.insightId);
    if (!insight) throw new ConvexError("Insight not found");

    // 3. Business logic checks
    if (insight.status !== "pending") {
      throw new ConvexError("Insight already processed");
    }

    // 4. Apply main change
    await ctx.db.patch(args.insightId, {
      status: "applied",
      appliedAt: Date.now(),
      appliedBy: userId
    });

    // 5. Side effects (tracking, logging)
    await updatePreviewStats(ctx, userId, insight);

    // 6. Return
    return args.insightId;
  }
});
```

---

## Testing Checklist (From P5/P6 Success)

### Backend Testing

- [ ] Schema compiles: `npx -w packages/backend convex codegen`
- [ ] Types valid: `npm run check-types`
- [ ] Linting passes: `npx ultracite fix`
- [ ] Query returns expected shape
- [ ] Mutation updates correct records
- [ ] Side effects trigger (preview stats, logs)

### Frontend Testing

- [ ] Component renders without errors
- [ ] Props passed correctly from parent
- [ ] State updates trigger re-renders
- [ ] Event handlers call mutations
- [ ] Loading states work
- [ ] Error states handled
- [ ] **Visual verification in browser** (CRITICAL)

### Integration Testing

- [ ] End-to-end flow works (trigger → query → mutation → UI update)
- [ ] Real-time updates work (Convex subscriptions)
- [ ] Edge cases handled (null data, missing fields)

---

## Ralph Execution Tips

### What Ralph Does Well

1. **Schema changes** - Rarely makes mistakes
2. **Query/mutation structure** - Follows patterns consistently
3. **UI components** - Good at replicating existing patterns
4. **Type safety** - Catches type errors early

### What to Watch For

1. **Index usage** - Sometimes uses `.filter()` instead of `.withIndex()`
2. **Side effect order** - Sometimes forgets to update related records
3. **Import statements** - Sometimes misses imports (check build errors)
4. **Visual verification** - Can't test in browser, needs manual check

### How to Help Ralph Succeed

1. **Clear acceptance criteria** - Be specific about what to do
2. **Reference existing code** - Point to similar components from P5/P6
3. **Incremental verification** - Run codegen after each story
4. **Visual checks** - Plan to verify UI in browser after each story

---

## Phase 7.1 Specific Notes

### US-001: Schema (Already Done)

✅ **Complete** - Fields added in prerequisites:
- `insightPreviewModeStats`
- `insightConfidenceThreshold`
- `insightAutoApplyPreferences`

**Ralph Action**: Verify fields exist, mark story complete.

### US-002: wouldAutoApply Calculation

**Pattern to follow**:
```typescript
// In getPendingInsights query
const trustLevel = await ctx.db
  .query("coachTrustLevels")
  .withIndex("by_coach", q => q.eq("coachId", userId))
  .first();

const effectiveLevel = Math.min(
  trustLevel?.currentLevel ?? 0,
  trustLevel?.preferredLevel ?? trustLevel?.currentLevel ?? 0
);

const threshold = trustLevel?.insightConfidenceThreshold ?? 0.7;

const wouldAutoApply =
  insight.category !== "injury" &&
  insight.category !== "medical" &&
  effectiveLevel >= 2 &&
  insight.confidenceScore >= threshold;
```

**Testing**: Query returns `wouldAutoApply` boolean for each insight.

### US-003: Confidence Visualization

**Pattern from P5 US-003**:
```tsx
<div className="mt-4 space-y-2">
  <div className="flex items-center justify-between text-sm">
    <span className={cn(
      "font-medium",
      confidenceScore < 0.6 ? "text-red-600" :
      confidenceScore < 0.8 ? "text-amber-600" : "text-green-600"
    )}>
      AI Confidence: {Math.round(insight.confidenceScore * 100)}%
    </span>
  </div>
  <Progress value={insight.confidenceScore * 100} className="h-2" />
</div>
```

**Testing**: Render insight card, see confidence bar.

### US-004: Preview Badge

**Pattern from P5 US-004**:
```tsx
{wouldAutoApply ? (
  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
    <Sparkles className="mr-1 h-3 w-3" />
    AI would auto-apply this at Level 2+
  </Badge>
) : (
  <p className="text-sm text-muted-foreground">Requires manual review</p>
)}
```

**Testing**: High-confidence insight shows badge, low-confidence shows "manual review".

### US-005: Preview Tracking

**Pattern from P5 US-005**:
```typescript
// In applyInsight mutation
const trustLevel = await ctx.db
  .query("coachTrustLevels")
  .withIndex("by_coach", q => q.eq("coachId", userId))
  .first();

if (trustLevel?.insightPreviewModeStats && !trustLevel.insightPreviewModeStats.completedAt) {
  const { wouldAutoApply } = calculateWouldAutoApply(insight, trustLevel);

  const stats = trustLevel.insightPreviewModeStats;
  const newInsights = stats.wouldAutoApplyInsights + (wouldAutoApply ? 1 : 0);
  const newApplied = stats.coachAppliedThose + (wouldAutoApply ? 1 : 0);
  const agreementRate = newInsights > 0 ? newApplied / newInsights : 0;

  await ctx.db.patch(trustLevel._id, {
    insightPreviewModeStats: {
      ...stats,
      wouldAutoApplyInsights: newInsights,
      coachAppliedThose: newApplied,
      agreementRate,
      completedAt: newInsights >= 20 ? Date.now() : undefined
    }
  });
}
```

**Testing**: Apply 20 insights, check `completedAt` is set.

---

## Summary: Key Takeaways for Ralph

1. **Preview before automation** - Show what AI would do, track agreement, then enable automation
2. **Safety first** - Never auto-apply injury/medical insights, always track previous values
3. **Low friction** - Make feedback optional, never block workflows
4. **Trust is personal** - Per-coach trust levels, not per-org
5. **Fail fast** - Check budgets/limits before expensive operations
6. **Graceful degradation** - Circuit breakers when external services fail
7. **Knowledge graph ready** - Store `targetRecordId` for future graph integration
8. **Visual verification** - Always check UI in browser after frontend changes

---

**Ready for Ralph Phase 7.1** 🚀

All P5 and P6 learnings have been consolidated. Ralph has full context to build Phase 7.1 with the same quality and patterns that made P5 and P6 successful.

---

**Prepared by**: Claude Sonnet 4.5
**Date**: 2026-01-25
**Related Docs**:
- `scripts/ralph/P5_PHASE4_HANDOFF.md` (P5 learnings)
- `scripts/ralph/P6_PHASED_IMPLEMENTATION_PLAN.md` (P6 learnings)
- `scripts/ralph/P7_PREREQUISITES_COMPLETED.md` (P7 infrastructure)
- `scripts/ralph/P7_PHASE1_PREREQUISITES_NOTE.md` (What's already done)
