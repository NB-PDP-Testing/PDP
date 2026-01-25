# Coach Trust System - Production-Ready Proposal
**Date:** January 24, 2026
**Based on:** Deep research of Zendesk, GitHub Copilot, Stripe, Google, Anthropic production systems

---

## Executive Summary

Based on extensive research of production AI trust systems, I'm proposing a **4-phase implementation** that balances automation with safety, using proven patterns from companies processing billions of AI decisions.

### Key Research Findings:

1. **Confidence Thresholds:** Industry standard is 60-70%, not 80%+
   - Zendesk: 60% default for customer service AI
   - GitHub Copilot: ~30% acceptance rate is considered excellent
   - Higher thresholds = almost no automation

2. **Trust Escalation:** All successful systems use 3-4 stages, not instant automation
   - Google Smart Reply: Preview mode before auto-send
   - GitHub Copilot: Show suggestion, user chooses
   - LangGraph: Human-in-the-loop checkpoints

3. **Learning Loops:** Track WHY users override, not just IF they override
   - GitHub tracks "accepted and retained" not just "accepted"
   - Active learning: Focus feedback collection on uncertain cases
   - RLHF: Use pairwise preferences (A vs B), not binary good/bad

4. **Cost Management:** Anthropic prompt caching = 90% cost savings
   - Cache static context (child profile, sport info)
   - Only pay for dynamic content (today's observation)
   - Costs drop from $0.10/message to $0.01/message

5. **Graceful Degradation:** Circuit breakers prevent cascading failures
   - Stripe detects model degradation in real-time
   - Fallback hierarchy: AI → Cache → Template → Human
   - Never show "error" to end user

---

## PHASE 1: Transparent Preview Mode (Weeks 1-2)

**What:** Show coaches what AI WOULD do, build trust before automation

### Implementation:

#### 1.1 Add Confidence Visualization to Approval Cards

```typescript
// apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx

interface SummaryWithPrediction extends Summary {
  wouldAutoApprove?: {
    eligible: boolean;
    reason: string;
    confidenceScore: number;
    similarPastApprovals: number;
  };
}

export function SummaryApprovalCard({ summary }: { summary: SummaryWithPrediction }) {
  return (
    <Card>
      {/* Existing card content */}

      {/* NEW: Confidence Visualization */}
      <div className="mt-4 space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">AI Confidence</span>
          <span className="text-sm text-muted-foreground">
            {Math.round(summary.publicSummary.confidenceScore * 100)}%
          </span>
        </div>

        {/* Progress bar visualization */}
        <Progress
          value={summary.publicSummary.confidenceScore * 100}
          className="h-2"
        />

        {/* Confidence tier */}
        <div className="flex items-center gap-2">
          <Badge variant={
            summary.publicSummary.confidenceScore >= 0.8 ? "default" :
            summary.publicSummary.confidenceScore >= 0.6 ? "secondary" : "outline"
          }>
            {summary.publicSummary.confidenceScore >= 0.8 ? "High Confidence" :
             summary.publicSummary.confidenceScore >= 0.6 ? "Medium Confidence" : "Low Confidence"}
          </Badge>

          {summary.wouldAutoApprove?.eligible && (
            <Badge variant="outline" className="border-green-500 text-green-700">
              ✓ Would auto-send at Level 2
            </Badge>
          )}
        </div>

        {/* Reasoning (collapsible) */}
        <Collapsible>
          <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground">
            Why this confidence? ▼
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-1">
            <p>• {summary.sensitivityReason}</p>
            {summary.wouldAutoApprove && (
              <p>• Similar to {summary.wouldAutoApprove.similarPastApprovals} messages you approved</p>
            )}
            <p>• Category: {summary.sensitivityCategory}</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  );
}
```

#### 1.2 Backend: Calculate Auto-Approval Prediction

```typescript
// packages/backend/convex/models/coachParentSummaries.ts

export const getCoachPendingSummaries = query({
  args: { organizationId: v.string() },
  returns: v.array(v.object({
    // ... existing fields
    wouldAutoApprove: v.optional(v.object({
      eligible: v.boolean(),
      reason: v.string(),
      confidenceScore: v.number(),
      similarPastApprovals: v.number(),
    })),
  })),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const coachId = user.userId;

    // Get pending summaries
    const summaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_coach_org_status", q =>
        q.eq("coachId", coachId)
         .eq("organizationId", args.organizationId)
         .eq("status", "pending_review")
      )
      .collect();

    // Get coach's trust level
    const trustLevel = await ctx.runQuery(
      internal.models.coachTrustLevels.getCoachTrustLevelInternal,
      { coachId }
    );

    // For each summary, calculate if it WOULD auto-approve
    const enrichedSummaries = await Promise.all(
      summaries.map(async (summary) => {
        const wouldAutoApprove = calculateWouldAutoApprove(
          trustLevel,
          summary.publicSummary.confidenceScore,
          summary.sensitivityCategory
        );

        // Count similar past approvals (for transparency)
        const similarApprovals = await countSimilarApprovals(
          ctx,
          coachId,
          summary.privateInsight.category
        );

        return {
          ...summary,
          wouldAutoApprove: wouldAutoApprove.eligible ? {
            eligible: true,
            reason: wouldAutoApprove.reason,
            confidenceScore: summary.publicSummary.confidenceScore,
            similarPastApprovals: similarApprovals,
          } : undefined,
        };
      })
    );

    return enrichedSummaries;
  },
});

// Helper: Would this auto-approve?
function calculateWouldAutoApprove(
  trustLevel: any,
  confidenceScore: number,
  sensitivityCategory: string
) {
  // Never auto-approve sensitive
  if (sensitivityCategory !== "normal") {
    return { eligible: false, reason: "Sensitive content requires manual review" };
  }

  const effectiveLevel = Math.min(
    trustLevel.currentLevel,
    trustLevel.preferredLevel ?? trustLevel.currentLevel
  );

  // Level 0-1: Never
  if (effectiveLevel < 2) {
    return { eligible: false, reason: "Trust level insufficient (need Level 2+)" };
  }

  // Level 2: High confidence only
  const threshold = trustLevel.confidenceThreshold ?? 0.7;
  if (effectiveLevel === 2 && confidenceScore < threshold) {
    return {
      eligible: false,
      reason: `Confidence ${Math.round(confidenceScore * 100)}% below threshold ${Math.round(threshold * 100)}%`
    };
  }

  // Level 3: All normal messages
  return {
    eligible: true,
    reason: `Trust Level ${effectiveLevel}, ${Math.round(confidenceScore * 100)}% confidence`
  };
}

async function countSimilarApprovals(
  ctx: any,
  coachId: string,
  category: string
): Promise<number> {
  const approvedSummaries = await ctx.db
    .query("coachParentSummaries")
    .withIndex("by_coach", q => q.eq("coachId", coachId))
    .filter(q =>
      q.and(
        q.eq(q.field("status"), "approved"),
        q.eq(q.field("privateInsight.category"), category)
      )
    )
    .collect();

  return approvedSummaries.length;
}
```

#### 1.3 Track Preview Mode Progress

```typescript
// packages/backend/convex/schema.ts - Add to coachTrustLevels table

coachTrustLevels: defineTable({
  // ... existing fields

  // NEW: Preview mode tracking
  previewModeStats: v.optional(v.object({
    wouldAutoApproveSuggestions: v.number(),  // How many times AI suggested auto-send
    coachApprovedThose: v.number(),           // How many coach actually approved
    coachRejectedThose: v.number(),           // How many coach suppressed
    agreementRate: v.number(),                // Percentage agreement
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })),
})

// packages/backend/convex/models/coachTrustLevels.ts

export const updatePreviewModeStats = internalMutation({
  args: {
    coachId: v.string(),
    summaryWouldAutoApprove: v.boolean(),
    coachActuallyApproved: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trustLevel = await getOrCreateTrustLevelHelper(ctx, args.coachId);

    const stats = trustLevel.previewModeStats ?? {
      wouldAutoApproveSuggestions: 0,
      coachApprovedThose: 0,
      coachRejectedThose: 0,
      agreementRate: 0,
      startedAt: Date.now(),
    };

    // Update counters
    if (args.summaryWouldAutoApprove) {
      stats.wouldAutoApproveSuggestions += 1;

      if (args.coachActuallyApproved) {
        stats.coachApprovedThose += 1;
      } else {
        stats.coachRejectedThose += 1;
      }

      // Recalculate agreement rate
      stats.agreementRate = stats.coachApprovedThose / stats.wouldAutoApproveSuggestions;
    }

    // Check if preview mode completed (20+ suggestions, 85%+ agreement)
    if (
      stats.wouldAutoApproveSuggestions >= 20 &&
      stats.agreementRate >= 0.85 &&
      !stats.completedAt
    ) {
      stats.completedAt = Date.now();
    }

    await ctx.db.patch(trustLevel._id, {
      previewModeStats: stats,
    });

    return null;
  },
});

// Call from approveSummary/suppressSummary
export const approveSummary = mutation({
  // ... existing implementation
  handler: async (ctx, args) => {
    // ... existing approval logic

    // NEW: Track preview mode stats
    const summary = await ctx.db.get(args.summaryId);
    if (summary) {
      const wouldAutoApprove = /* calculate based on confidence */;

      await ctx.runMutation(
        internal.models.coachTrustLevels.updatePreviewModeStats,
        {
          coachId: summary.coachId,
          summaryWouldAutoApprove: wouldAutoApprove,
          coachActuallyApproved: true,
        }
      );
    }
  },
});
```

#### 1.4 Show Preview Mode Progress Banner

```typescript
// apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/preview-mode-banner.tsx

export function PreviewModeBanner({ trustLevel }: { trustLevel: any }) {
  const stats = trustLevel.previewModeStats;

  if (!stats || trustLevel.currentLevel < 2) {
    return null;
  }

  const isComplete = stats.completedAt !== undefined;
  const progress = Math.min(100, (stats.wouldAutoApproveSuggestions / 20) * 100);

  if (isComplete) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>You're Ready for Auto-Approval!</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            AI suggested auto-sending {stats.wouldAutoApproveSuggestions} messages,
            and you approved {stats.coachApprovedThose} ({Math.round(stats.agreementRate * 100)}% agreement).
          </p>
          <Button onClick={() => enableAutoApproval()}>
            Enable Auto-Approval →
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Sparkles className="h-4 w-4 text-blue-600" />
      <AlertTitle>Preview Mode: Learning Your Approval Style</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          AI is watching which messages you approve. After 20 suggestions with 85%+ agreement,
          you can enable auto-approval.
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Progress: {stats.wouldAutoApproveSuggestions}/20 suggestions</span>
            <span>Agreement: {Math.round(stats.agreementRate * 100)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

**Expected Outcome Week 1-2:**
- ✅ Coaches see AI confidence scores
- ✅ Coaches learn what AI would do (but still approve manually)
- ✅ System tracks agreement rate
- ✅ After 20+ suggestions with 85%+ agreement → Ready for auto-approval

---

## PHASE 2: Supervised Auto-Approval with Revoke Window (Weeks 3-4)

**What:** AI auto-sends high-confidence messages, 1-hour revoke window before parent sees it

### Implementation:

#### 2.1 Auto-Approval Decision Logic

```typescript
// packages/backend/convex/lib/autoApprovalDecision.ts

export interface AutoApprovalDecision {
  shouldAutoApprove: boolean;
  reason: string;
  tier: "auto_send" | "manual_review" | "flagged";
}

export function decideAutoApproval(
  trustLevel: {
    currentLevel: number;
    preferredLevel: number | null;
    confidenceThreshold: number | null;
  },
  summary: {
    confidenceScore: number;
    sensitivityCategory: "normal" | "injury" | "behavior";
  }
): AutoApprovalDecision {
  // NEVER auto-approve sensitive
  if (summary.sensitivityCategory !== "normal") {
    return {
      shouldAutoApprove: false,
      reason: `${summary.sensitivityCategory} requires manual review`,
      tier: "flagged",
    };
  }

  const effectiveLevel = Math.min(
    trustLevel.currentLevel,
    trustLevel.preferredLevel ?? trustLevel.currentLevel
  );

  // Level 0-1: Manual review
  if (effectiveLevel < 2) {
    return {
      shouldAutoApprove: false,
      reason: "Trust level too low (need Level 2+)",
      tier: "manual_review",
    };
  }

  // Level 2: Confidence threshold (default 70%)
  const threshold = trustLevel.confidenceThreshold ?? 0.7;

  if (effectiveLevel === 2) {
    if (summary.confidenceScore >= threshold) {
      return {
        shouldAutoApprove: true,
        reason: `Level 2, ${Math.round(summary.confidenceScore * 100)}% confidence`,
        tier: "auto_send",
      };
    } else {
      return {
        shouldAutoApprove: false,
        reason: `Confidence ${Math.round(summary.confidenceScore * 100)}% below threshold ${Math.round(threshold * 100)}%`,
        tier: "manual_review",
      };
    }
  }

  // Level 3: Auto-approve all normal messages
  return {
    shouldAutoApprove: true,
    reason: `Level 3 full automation, ${Math.round(summary.confidenceScore * 100)}% confidence`,
    tier: "auto_send",
  };
}
```

#### 2.2 Scheduled Delivery with Revoke Window

```typescript
// packages/backend/convex/models/coachParentSummaries.ts

// Add fields to schema
coachParentSummaries: defineTable({
  // ... existing fields

  autoApprovalDecision: v.optional(v.object({
    shouldAutoApprove: v.boolean(),
    reason: v.string(),
    tier: v.union(v.literal("auto_send"), v.literal("manual_review"), v.literal("flagged")),
    decidedAt: v.number(),
  })),

  scheduledDeliveryAt: v.optional(v.number()),  // When to actually send to parent
  revokedAt: v.optional(v.number()),
  revokedBy: v.optional(v.string()),
  revocationReason: v.optional(v.string()),
})

export const createParentSummary = internalMutation({
  // ... existing args
  handler: async (ctx, args) => {
    // Fetch coach trust level
    const trustLevel = await ctx.runQuery(
      internal.models.coachTrustLevels.getCoachTrustLevelInternal,
      { coachId: args.coachId }  // Assume coachId passed in args
    );

    // Make auto-approval decision
    const decision = decideAutoApproval(trustLevel, {
      confidenceScore: args.publicSummary.confidenceScore,
      sensitivityCategory: args.sensitivityCategory,
    });

    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    // Insert summary
    const summaryId = await ctx.db.insert("coachParentSummaries", {
      ...args,
      status: decision.shouldAutoApprove ? "auto_approved" : "pending_review",
      autoApprovalDecision: {
        ...decision,
        decidedAt: now,
      },
      // Schedule delivery 1 hour from now (revoke window)
      scheduledDeliveryAt: decision.shouldAutoApprove ? now + ONE_HOUR : undefined,
      createdAt: now,
    });

    // Schedule actual delivery
    if (decision.shouldAutoApprove) {
      await ctx.scheduler.runAfter(
        ONE_HOUR,
        internal.models.coachParentSummaries.deliverAutoApprovedSummary,
        { summaryId }
      );
    }

    return summaryId;
  },
});

// Scheduled delivery handler
export const deliverAutoApprovedSummary = internalMutation({
  args: { summaryId: v.id("coachParentSummaries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const summary = await ctx.db.get(args.summaryId);

    if (!summary) {
      console.error("Summary not found:", args.summaryId);
      return null;
    }

    // Check if revoked
    if (summary.revokedAt) {
      console.log("Summary was revoked, not delivering:", args.summaryId);
      return null;
    }

    // Check if still auto-approved status
    if (summary.status !== "auto_approved") {
      console.log("Summary status changed, not delivering:", args.summaryId);
      return null;
    }

    // Actually deliver to parent
    await ctx.db.patch(args.summaryId, {
      status: "delivered",
      deliveredAt: Date.now(),
    });

    // TODO: Trigger notification to parent

    return null;
  },
});
```

#### 2.3 Revoke Capability

```typescript
// packages/backend/convex/models/coachParentSummaries.ts

export const revokeAutoApproval = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const summary = await ctx.db.get(args.summaryId);

    if (!summary) {
      return { success: false, message: "Summary not found" };
    }

    // Verify ownership
    if (summary.coachId !== user.userId) {
      return { success: false, message: "Not authorized" };
    }

    // Can only revoke auto-approved messages
    if (summary.status !== "auto_approved") {
      return { success: false, message: "Can only revoke auto-approved messages" };
    }

    // Check if already delivered
    if (summary.deliveredAt) {
      return {
        success: false,
        message: "Message already delivered to parent (cannot revoke)"
      };
    }

    // Revoke it
    await ctx.db.patch(args.summaryId, {
      status: "suppressed",
      revokedAt: Date.now(),
      revokedBy: user.userId,
      revocationReason: args.reason ?? "Coach revoked auto-approval",
    });

    // Cancel scheduled delivery (Convex will skip it due to status change)

    return {
      success: true,
      message: "Auto-approval revoked. Message will not be sent.",
    };
  },
});
```

#### 2.4 Auto-Approved Review Dashboard

```typescript
// apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-approved-tab.tsx

export function AutoApprovedTab({ orgId }: { orgId: string }) {
  const autoApprovedSummaries = useQuery(
    api.models.coachParentSummaries.getCoachAutoApprovedSummaries,
    { organizationId: orgId, timeRangeHours: 24 }
  );

  const revokeAutoApproval = useMutation(
    api.models.coachParentSummaries.revokeAutoApproval
  );

  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());

  const handleRevoke = async (summaryId: string) => {
    setRevokingIds(prev => new Set(prev).add(summaryId));

    try {
      const result = await revokeAutoApproval({ summaryId });

      if (result.success) {
        toast.success("Auto-approval revoked");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to revoke");
    } finally {
      setRevokingIds(prev => {
        const next = new Set(prev);
        next.delete(summaryId);
        return next;
      });
    }
  };

  if (!autoApprovedSummaries || autoApprovedSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Empty>
            <EmptyTitle>No auto-sent messages</EmptyTitle>
            <EmptyDescription>
              Messages auto-approved in the last 24 hours will appear here.
            </EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertTitle>Auto-Approved Messages (1-Hour Revoke Window)</AlertTitle>
        <AlertDescription>
          These messages were auto-approved and will be sent to parents within 1 hour.
          You can revoke them before delivery.
        </AlertDescription>
      </Alert>

      {autoApprovedSummaries.map((summary) => {
        const timeUntilDelivery = summary.scheduledDeliveryAt
          ? Math.max(0, summary.scheduledDelivery - Date.now())
          : 0;
        const minutesRemaining = Math.floor(timeUntilDelivery / (60 * 1000));
        const canRevoke = !summary.deliveredAt && timeUntilDelivery > 0;

        return (
          <Card key={summary._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {summary.playerName} - {summary.sportName}
                  </CardTitle>
                  <CardDescription>
                    Auto-approved {formatDistanceToNow(summary._creationTime)} ago
                    {canRevoke && ` • ${minutesRemaining} min until delivery`}
                  </CardDescription>
                </div>
                <Badge variant={summary.deliveredAt ? "outline" : "default"}>
                  {summary.deliveredAt ? "Delivered" : "Pending Delivery"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Message to Parent:</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {summary.publicSummary.content}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {Math.round(summary.publicSummary.confidenceScore * 100)}% confidence
                </Badge>
                <span>• {summary.autoApprovalDecision?.reason}</span>
              </div>

              {canRevoke && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevoke(summary._id)}
                  disabled={revokingIds.has(summary._id)}
                >
                  {revokingIds.has(summary._id) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    <>Revoke Auto-Send</>
                  )}
                </Button>
              )}

              {summary.deliveredAt && (
                <p className="text-sm text-muted-foreground">
                  Delivered {formatDistanceToNow(summary.deliveredAt)} ago
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

**Expected Outcome Week 3-4:**
- ✅ High-confidence normal messages auto-approve
- ✅ 1-hour buffer before parent sees message
- ✅ Coach can revoke within window
- ✅ Separate review dashboard for auto-sent messages
- ✅ Manual review still required for low confidence/sensitive

---

## PHASE 3: Cost Optimization & Monitoring (Weeks 5-6)

**What:** Anthropic prompt caching (90% cost savings) + usage monitoring

### Implementation:

#### 3.1 Prompt Caching for Cost Reduction

```typescript
// packages/backend/convex/actions/coachParentSummaries.ts

export const generateParentSummary = internalAction({
  args: {
    insightTitle: v.string(),
    insightDescription: v.string(),
    playerFirstName: v.string(),
    sportName: v.string(),
    playerIdentityId: v.id("playerIdentities"),  // NEW: For fetching profile
  },
  returns: v.object({
    summary: v.string(),
    confidenceScore: v.number(),
  }),
  handler: async (ctx, args) => {
    // Fetch STATIC player context (will be cached)
    const player = await ctx.runQuery(internal.models.playerIdentities.getById, {
      id: args.playerIdentityId,
    });

    const passport = await ctx.runQuery(
      internal.models.sportPassports.getByPlayerIdentityId,
      { playerIdentityId: args.playerIdentityId }
    );

    // Build CACHED system context
    const systemContext = `You are an expert coach communication specialist.
Your role: Transform coach observations into parent-friendly messages.

Guidelines:
1. Be specific about observations
2. Focus on growth, not criticism
3. Offer concrete next steps
4. Be warm and supportive
5. Avoid technical jargon`;

    // Build CACHED player profile
    const playerProfile = `
PLAYER PROFILE (Reference):
Name: ${player.firstName} ${player.lastName}
Age: ${player.dateOfBirth ? calculateAge(player.dateOfBirth) : 'Unknown'}
Sport: ${args.sportName}
Current Level: ${passport?.currentLevel ?? 'Unknown'}
Position: ${passport?.primaryPosition ?? 'Unknown'}
Recent Performance: ${JSON.stringify(passport?.recentAssessments?.slice(0, 3) ?? [])}
`;

    // DYNAMIC content (changes each time)
    const todaysObservation = `
Today's Coaching Observation:
Title: ${args.insightTitle}
Details: ${args.insightDescription}

Transform this into a parent-friendly message (2-3 sentences).`;

    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: systemContext,
          cache_control: { type: "ephemeral" },  // CACHE THIS (lasts 5 min)
        },
        {
          type: "text",
          text: playerProfile,
          cache_control: { type: "ephemeral" },  // CACHE THIS
        },
      ],
      messages: [
        {
          role: "user",
          content: todaysObservation,  // Only this changes
        },
      ],
    });

    // Log cache usage for monitoring
    const usage = response.usage;
    console.log({
      cache_creation_tokens: usage.cache_creation_input_tokens,
      cache_read_tokens: usage.cache_read_input_tokens,
      regular_input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
    });

    // Calculate cost savings
    const costWithoutCache =
      ((usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens) / 1_000_000) * 0.05 +
      (usage.output_tokens / 1_000_000) * 0.25;

    const costWithCache =
      (usage.cache_creation_input_tokens / 1_000_000) * 0.0625 +  // 25% markup for cache write
      (usage.cache_read_input_tokens / 1_000_000) * 0.005 +       // 90% discount for cache read
      (usage.input_tokens / 1_000_000) * 0.05 +
      (usage.output_tokens / 1_000_000) * 0.25;

    console.log({
      costWithoutCache: `$${costWithoutCache.toFixed(4)}`,
      costWithCache: `$${costWithCache.toFixed(4)}`,
      savings: `${Math.round((1 - costWithCache / costWithoutCache) * 100)}%`,
    });

    const summaryText = response.content[0].text;

    // Parse confidence from response (or calculate heuristically)
    const confidenceScore = estimateConfidence(summaryText, args.insightDescription);

    return {
      summary: summaryText,
      confidenceScore,
    };
  },
});
```

**Cost Impact:**
- **Before caching:** ~500 tokens/message × $0.05/1M = $0.025/message
- **With caching:** ~50 new tokens + 450 cached tokens × $0.005/1M = $0.0025/message
- **Savings:** 90% reduction ($0.025 → $0.0025)
- **At scale:** 1000 messages/month = $2.50 vs $25

#### 3.2 Usage Monitoring Dashboard

```typescript
// packages/backend/convex/models/aiUsageTracking.ts

// Schema
aiUsageLog: defineTable({
  organizationId: v.string(),
  operation: v.union(
    v.literal("generate_summary"),
    v.literal("classify_sensitivity"),
  ),
  modelUsed: v.string(),  // "claude-opus-4-5"

  tokensInput: v.number(),
  tokensOutput: v.number(),
  tokensCacheCreation: v.number(),
  tokensCacheRead: v.number(),

  costCents: v.number(),  // Total cost in cents
  timestamp: v.number(),
})
  .index("by_org_date", ["organizationId", "timestamp"])
  .index("by_date", ["timestamp"])

export const trackUsage = internalMutation({
  args: {
    organizationId: v.string(),
    operation: v.string(),
    modelUsed: v.string(),
    usage: v.object({
      input_tokens: v.number(),
      output_tokens: v.number(),
      cache_creation_input_tokens: v.optional(v.number()),
      cache_read_input_tokens: v.optional(v.number()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { usage } = args;

    // Calculate cost (Opus 4.5 pricing Jan 2026)
    const cacheCreationCost = (usage.cache_creation_input_tokens ?? 0) / 1_000_000 * 0.0625;  // $6.25/M
    const cacheReadCost = (usage.cache_read_input_tokens ?? 0) / 1_000_000 * 0.005;  // $0.50/M (90% off)
    const inputCost = usage.input_tokens / 1_000_000 * 0.05;  // $5/M
    const outputCost = usage.output_tokens / 1_000_000 * 0.25;  // $25/M

    const totalCostCents = (cacheCreationCost + cacheReadCost + inputCost + outputCost) * 100;

    await ctx.db.insert("aiUsageLog", {
      organizationId: args.organizationId,
      operation: args.operation,
      modelUsed: args.modelUsed,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      tokensCacheCreation: usage.cache_creation_input_tokens ?? 0,
      tokensCacheRead: usage.cache_read_input_tokens ?? 0,
      costCents: totalCostCents,
      timestamp: Date.now(),
    });

    return null;
  },
});

export const getUsageStats = query({
  args: {
    organizationId: v.optional(v.string()),
    daysBack: v.optional(v.number()),
  },
  returns: v.object({
    totalCostCents: v.number(),
    totalMessages: v.number(),
    averageCostPerMessage: v.number(),
    cacheSavingsPercent: v.number(),
    breakdown: v.array(v.object({
      date: v.string(),
      costCents: v.number(),
      messageCount: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const daysBack = args.daysBack ?? 7;
    const startTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    let query = ctx.db.query("aiUsageLog");

    if (args.organizationId) {
      query = query.withIndex("by_org_date", q =>
        q.eq("organizationId", args.organizationId)
         .gte("timestamp", startTime)
      );
    } else {
      query = query.withIndex("by_date", q =>
        q.gte("timestamp", startTime)
      );
    }

    const logs = await query.collect();

    const totalCostCents = logs.reduce((sum, log) => sum + log.costCents, 0);
    const totalMessages = logs.length;
    const averageCostPerMessage = totalMessages > 0 ? totalCostCents / totalMessages : 0;

    // Calculate cache savings
    const totalCacheReadTokens = logs.reduce((sum, log) => sum + log.tokensCacheRead, 0);
    const totalRegularTokens = logs.reduce((sum, log) => sum + log.tokensInput, 0);
    const cacheSavingsPercent = totalCacheReadTokens + totalRegularTokens > 0
      ? (totalCacheReadTokens / (totalCacheReadTokens + totalRegularTokens)) * 90  // 90% savings on cached tokens
      : 0;

    // Group by date
    const byDate = new Map<string, { costCents: number; messageCount: number }>();

    for (const log of logs) {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      const existing = byDate.get(date) ?? { costCents: 0, messageCount: 0 };
      byDate.set(date, {
        costCents: existing.costCents + log.costCents,
        messageCount: existing.messageCount + 1,
      });
    }

    const breakdown = Array.from(byDate.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    return {
      totalCostCents,
      totalMessages,
      averageCostPerMessage,
      cacheSavingsPercent,
      breakdown,
    };
  },
});
```

**Expected Outcome Week 5-6:**
- ✅ 90% cost reduction via prompt caching
- ✅ Usage tracking per organization
- ✅ Cost dashboard showing trends
- ✅ Alert if costs spike unexpectedly

---

## PHASE 4: Learning Loop & Confidence Calibration (Weeks 7-8)

**What:** Track WHY coaches override, improve confidence scores over time

### Implementation:

#### 4.1 Override Feedback Collection

```typescript
// packages/backend/convex/models/coachParentSummaries.ts

export const suppressSummary = mutation({
  args: {
    summaryId: v.id("coachParentSummaries"),
    reason: v.union(
      v.literal("too_sensitive"),
      v.literal("inaccurate"),
      v.literal("wrong_tone"),
      v.literal("timing_not_right"),
      v.literal("parent_not_ready"),
      v.literal("other"),
    ),
    reasonDetail: v.optional(v.string()),  // Free text for "other"
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const summary = await ctx.db.get(args.summaryId);

    // ... existing ownership check

    await ctx.db.patch(args.summaryId, {
      status: "suppressed",
      overrideType: "coach_rejected_auto_approved",  // NEW
      overrideReason: args.reason,  // NEW
      overrideReasonDetail: args.reasonDetail,  // NEW
      suppressedAt: Date.now(),
    });

    // Update trust metrics
    await ctx.runMutation(
      internal.models.coachTrustLevels.updateTrustMetrics,
      {
        coachId: summary.coachId,
        organizationId: summary.organizationId,
        action: "suppressed",
        overrideContext: {  // NEW: Pass context for learning
          confidenceScore: summary.publicSummary.confidenceScore,
          category: summary.privateInsight.category,
          reason: args.reason,
        },
      }
    );

    return null;
  },
});

// Frontend: Suppress dialog with reason selection
function SuppressDialog({ summary, onSuppress }: Props) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why suppress this message?</DialogTitle>
          <DialogDescription>
            Help us improve AI accuracy by telling us why.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason}>
          <div className="space-y-2">
            <RadioGroupItem value="too_sensitive" label="Too sensitive for this parent" />
            <RadioGroupItem value="inaccurate" label="Information is inaccurate" />
            <RadioGroupItem value="wrong_tone" label="Tone isn't right" />
            <RadioGroupItem value="timing_not_right" label="Not the right time" />
            <RadioGroupItem value="parent_not_ready" label="Parent isn't ready for this feedback" />
            <RadioGroupItem value="other" label="Other reason..." />
          </div>
        </RadioGroup>

        {reason === "other" && (
          <Textarea
            placeholder="Please explain..."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSuppress(reason, detail)}>
            Suppress Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4.2 Override Pattern Analytics

```typescript
// packages/backend/convex/models/overrideAnalytics.ts

export const getCoachOverridePatterns = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    overallSuppressionRate: v.number(),
    byCategory: v.array(v.object({
      category: v.string(),
      suppressionRate: v.number(),
      commonReasons: v.array(v.object({
        reason: v.string(),
        count: v.number(),
      })),
    })),
    recommendations: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    const coachId = user.userId;

    // Get all coach's summaries (approved + suppressed)
    const summaries = await ctx.db
      .query("coachParentSummaries")
      .withIndex("by_coach_org_status", q =>
        q.eq("coachId", coachId)
         .eq("organizationId", args.organizationId)
      )
      .collect();

    const approved = summaries.filter(s => s.status === "approved" || s.status === "auto_approved");
    const suppressed = summaries.filter(s => s.status === "suppressed");

    const overallSuppressionRate = suppressed.length / summaries.length;

    // Group by category
    const byCategory = new Map<string, { total: number; suppressed: number; reasons: Map<string, number> }>();

    for (const summary of summaries) {
      const category = summary.privateInsight.category;
      const existing = byCategory.get(category) ?? { total: 0, suppressed: 0, reasons: new Map() };

      existing.total += 1;

      if (summary.status === "suppressed") {
        existing.suppressed += 1;

        if (summary.overrideReason) {
          const reasonCount = existing.reasons.get(summary.overrideReason) ?? 0;
          existing.reasons.set(summary.overrideReason, reasonCount + 1);
        }
      }

      byCategory.set(category, existing);
    }

    const categoryStats = Array.from(byCategory.entries()).map(([category, stats]) => ({
      category,
      suppressionRate: stats.suppressed / stats.total,
      commonReasons: Array.from(stats.reasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    }));

    // Generate recommendations
    const recommendations: string[] = [];

    for (const cat of categoryStats) {
      if (cat.suppressionRate > 0.3) {
        recommendations.push(
          `You suppress ${Math.round(cat.suppressionRate * 100)}% of ${cat.category} messages. ` +
          `Consider enabling "Skip Sensitive Insights" for this category.`
        );
      }
    }

    if (overallSuppressionRate < 0.05) {
      recommendations.push(
        `You rarely suppress AI suggestions (${Math.round(overallSuppressionRate * 100)}%). ` +
        `You might be ready to increase automation to Level 3.`
        );
    }

    return {
      overallSuppressionRate,
      byCategory: categoryStats,
      recommendations,
    };
  },
});
```

#### 4.3 Adaptive Confidence Thresholds

```typescript
// packages/backend/convex/models/coachTrustLevels.ts

export const adjustConfidenceThreshold = mutation({
  args: {
    organizationId: v.string(),
    newThreshold: v.number(),  // 0.5 to 1.0
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    // Validate range
    if (args.newThreshold < 0.5 || args.newThreshold > 1.0) {
      throw new Error("Confidence threshold must be between 50% and 100%");
    }

    const trustLevel = await getOrCreateTrustLevelHelper(ctx, user.userId);

    await ctx.db.patch(trustLevel._id, {
      confidenceThreshold: args.newThreshold,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Frontend: Confidence threshold slider in settings
function ConfidenceThresholdSlider({ currentThreshold, onChange }: Props) {
  const [value, setValue] = useState(currentThreshold ?? 0.7);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Label>Confidence Threshold for Auto-Approval</Label>
        <span className="text-sm font-medium">{Math.round(value * 100)}%</span>
      </div>

      <Slider
        min={50}
        max={100}
        step={5}
        value={[value * 100]}
        onValueChange={([newValue]) => setValue(newValue / 100)}
        onValueCommit={([newValue]) => onChange(newValue / 100)}
      />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>More automation (lower bar)</span>
        <span>More careful (higher bar)</span>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {value <= 0.6 && "Aggressive: AI will auto-send more messages, but may make more mistakes."}
          {value > 0.6 && value <= 0.8 && "Balanced: Good mix of automation and safety (recommended)."}
          {value > 0.8 && "Conservative: AI will only auto-send when very confident, less automation."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

**Expected Outcome Week 7-8:**
- ✅ Coaches explain WHY they suppress
- ✅ System learns coach's preferences
- ✅ Personalized recommendations ("You suppress 40% of injury messages, consider skipping them")
- ✅ Adjustable confidence threshold per coach

---

## RECOMMENDED IMPLEMENTATION ORDER

### **Option A: Conservative (Safest)**
Weeks 1-2: Phase 1 (Preview Mode)
Weeks 3-4: Phase 3 (Cost Optimization)
Weeks 5-6: Phase 2 (Auto-Approval)
Weeks 7-8: Phase 4 (Learning Loop)

**Rationale:** Build cost controls BEFORE enabling automation

### **Option B: Balanced (Recommended)**
Weeks 1-2: Phase 1 (Preview Mode)
Weeks 3-4: Phase 2 (Auto-Approval)
Weeks 5-6: Phase 3 (Cost Optimization)
Weeks 7-8: Phase 4 (Learning Loop)

**Rationale:** Natural progression, coach sees value early

### **Option C: Aggressive (Fastest to Automation)**
Weeks 1-2: Phase 1 + Phase 2 (combined)
Weeks 3-4: Phase 3 (Cost Optimization)
Weeks 5-6: Phase 4 (Learning Loop)

**Rationale:** Skip preview mode, go straight to auto-approval (riskier)

---

## SUCCESS METRICS

### Week 4 (After Auto-Approval Launch)
- **Target:** 40%+ of normal messages auto-approved
- **Target:** <5% revocation rate (coaches trust the system)
- **Target:** Zero parent complaints about auto-sent messages
- **Red flag:** >10% revocation rate = threshold too low

### Week 6 (After Cost Optimization)
- **Target:** 80%+ cache hit rate (cost savings working)
- **Target:** <$0.01 per message average cost
- **Red flag:** Costs not dropping = caching not working

### Week 8 (After Learning Loop)
- **Target:** Suppression rate decreasing over time
- **Target:** 3+ personalized recommendations per coach
- **Target:** Coaches adjusting thresholds = they understand the system
- **Red flag:** No pattern changes = learning not working

---

## RISK MITIGATION

### Risk 1: Coaches Don't Trust Auto-Approval
**Mitigation:**
- Preview mode FIRST (build trust)
- 1-hour revoke window (safety net)
- Clear confidence scores (transparency)
- Coach can always lower their level

### Risk 2: Parents Complain About Auto-Sent Messages
**Mitigation:**
- Only auto-approve HIGH confidence (>70%)
- NEVER auto-approve injury/behavior
- Coach can revoke before delivery
- Track complaints, disable auto-approval if pattern emerges

### Risk 3: AI Costs Spiral Out of Control
**Mitigation:**
- Prompt caching (90% savings)
- Usage tracking from day 1
- Alert if daily costs exceed threshold
- Rate limiting if needed

### Risk 4: Confidence Scores Are Wrong (Miscalibrated)
**Mitigation:**
- Track actual accuracy vs predicted confidence
- Recalibrate quarterly using Platt scaling
- Show uncertainty when AI isn't sure
- Override feedback improves calibration over time

---

## NEXT STEPS

1. **Review this proposal** - Does the phased approach make sense?

2. **Answer strategy questions:**
   - Preview mode: Yes or skip to auto-approval?
   - Revoke window: 1 hour, 24 hours, or instant?
   - Confidence threshold: Start at 70%, 80%, or 60%?
   - Override feedback: Required or optional?

3. **Choose implementation order:**
   - Option A (Conservative), B (Balanced), or C (Aggressive)?

4. **Greenlight Phase 1:**
   - I can start implementing preview mode this week
   - 2-week sprint to get confidence scores visible
   - Coaches will see value immediately

**What do you think? Ready to proceed with Phase 1?**
