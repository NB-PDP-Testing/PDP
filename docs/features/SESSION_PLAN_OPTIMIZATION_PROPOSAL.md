# Session Plan Optimization & Feedback - Implementation Proposal

**Date:** January 12, 2026
**Status:** Proposal for Implementation
**Priority:** High (Cost Optimization + User Engagement)

## Current Status

### ✅ What's Working
1. **Generate Session Plan Feature** - Fully functional
   - Accessible via Quick Actions menu
   - Modal displays on mobile and desktop with proper UX
   - Calls Anthropic Claude API via Next.js API route
   - Falls back to simulated plan if API fails
   - Regenerate button allows users to get new plans

2. **Recent Fixes Completed**
   - Infinite loop bug fixed (commit 5a91341)
   - Mobile/desktop UX enhanced (commit 9045252)
   - All 13 linting errors resolved (commit 2555253)

### ❌ What's Missing

1. **No Cost Optimization**
   - ❌ No caching of generated plans
   - ❌ No rate limiting (users can spam "Generate" button)
   - ❌ Every click = new API call = cost accumulation
   - ❌ No tracking of generation history

2. **No User Feedback Loop**
   - ❌ No thumbs up/down rating system
   - ❌ No way to know if plans are useful
   - ❌ No data for improving future plans
   - ❌ No quality metrics

3. **No Analytics**
   - ❌ No tracking of how often plans are generated
   - ❌ No data on which teams/coaches use the feature
   - ❌ No cost visibility

## Cost Impact Analysis

### Current Situation (No Optimization)
- **Per Session Plan API Call:**
  - Model: Claude 3.5 Sonnet
  - Estimated input tokens: ~500-800 (team data)
  - Estimated output tokens: ~800-1200 (detailed plan)
  - Cost per call: ~$0.015-0.025 USD

- **Potential Monthly Cost (Example Club with 5 coaches):**
  - If each coach generates 3 plans/day: `5 coaches × 3 plans × 30 days = 450 calls/month`
  - Monthly cost: `450 × $0.02 = $9.00 USD`
  - **Annual cost: ~$108 USD per club**

### With Optimization (24-hour caching)
- **Cached Requests:** If coach regenerates same team within 24h, use cached plan
- **Estimated Cache Hit Rate:** 40-60% (coaches often refine same team)
- **Cost Reduction:** 40-60% = **$43-65 saved annually per club**
- **With 100 clubs:** **$4,300-6,500 annual savings**

## Proposed Solution

### Phase 1: Database Schema (Add Session Plans Table)

Create new table in `packages/backend/convex/schema.ts`:

```typescript
sessionPlans: defineTable({
  // Who and what
  organizationId: v.string(), // Better Auth organization ID
  teamId: v.id("team"), // Which team this plan is for
  coachId: v.string(), // Better Auth user ID who generated it

  // Plan content
  teamName: v.string(),
  sessionPlan: v.string(), // The full AI-generated plan text
  focus: v.optional(v.string()), // Optional focus area (e.g., "Tackling")

  // Team context (snapshot at generation time)
  teamData: v.object({
    playerCount: v.number(),
    ageGroup: v.string(),
    avgSkillLevel: v.number(),
    strengths: v.array(v.object({ skill: v.string(), avg: v.number() })),
    weaknesses: v.array(v.object({ skill: v.string(), avg: v.number() })),
    attendanceIssues: v.number(),
    overdueReviews: v.number(),
  }),

  // AI metadata
  usedRealAI: v.boolean(), // Was this real AI or simulated?
  generatedAt: v.number(), // Timestamp

  // User feedback
  rating: v.optional(v.union(v.literal("up"), v.literal("down"))),
  ratedAt: v.optional(v.number()),
  feedbackComment: v.optional(v.string()),

  // Usage tracking
  viewCount: v.number(), // How many times this plan was viewed
  shareCount: v.number(), // How many times shared
  regenerateCount: v.number(), // How many times user clicked "regenerate"

  // Metadata
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_team", ["teamId"])
  .index("by_coach", ["coachId"])
  .index("by_team_and_date", ["teamId", "generatedAt"]) // For finding recent plans
  .index("by_organization_and_date", ["organizationId", "generatedAt"]) // For analytics
```

### Phase 2: Backend Functions

**File:** `packages/backend/convex/models/sessionPlans.ts`

```typescript
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Get most recent plan for a team (within last 24 hours)
export const getRecentPlanForTeam = query({
  args: {
    teamId: v.id("team"),
    maxAgeHours: v.optional(v.number()), // Default 24 hours
  },
  returns: v.union(v.object({
    _id: v.id("sessionPlans"),
    sessionPlan: v.string(),
    focus: v.optional(v.string()),
    usedRealAI: v.boolean(),
    generatedAt: v.number(),
    teamData: v.any(),
    rating: v.optional(v.union(v.literal("up"), v.literal("down"))),
  }), v.null()),
  handler: async (ctx, args) => {
    // Get current user and organization
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const maxAge = args.maxAgeHours ?? 24;
    const cutoffTime = Date.now() - (maxAge * 60 * 60 * 1000);

    // Find most recent plan for this team
    const recentPlan = await ctx.db
      .query("sessionPlans")
      .withIndex("by_team_and_date", (q) =>
        q.eq("teamId", args.teamId).gt("generatedAt", cutoffTime)
      )
      .order("desc")
      .first();

    return recentPlan;
  },
});

// Save a new session plan
export const savePlan = mutation({
  args: {
    teamId: v.id("team"),
    teamName: v.string(),
    sessionPlan: v.string(),
    focus: v.optional(v.string()),
    teamData: v.any(),
    usedRealAI: v.boolean(),
  },
  returns: v.id("sessionPlans"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject;
    const orgId = identity.orgId; // From Better Auth organization plugin

    const now = Date.now();

    const planId = await ctx.db.insert("sessionPlans", {
      organizationId: orgId,
      teamId: args.teamId,
      coachId: userId,
      teamName: args.teamName,
      sessionPlan: args.sessionPlan,
      focus: args.focus,
      teamData: args.teamData,
      usedRealAI: args.usedRealAI,
      generatedAt: now,
      viewCount: 1, // First view is the generation
      shareCount: 0,
      regenerateCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return planId;
  },
});

// Rate a session plan (thumbs up/down)
export const ratePlan = mutation({
  args: {
    planId: v.id("sessionPlans"),
    rating: v.union(v.literal("up"), v.literal("down")),
    feedbackComment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    // Verify user has access (same organization)
    if (plan.organizationId !== identity.orgId) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.planId, {
      rating: args.rating,
      ratedAt: Date.now(),
      feedbackComment: args.feedbackComment,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Increment view count
export const incrementViewCount = mutation({
  args: { planId: v.id("sessionPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) return null;

    await ctx.db.patch(args.planId, {
      viewCount: plan.viewCount + 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Track regeneration
export const incrementRegenerateCount = mutation({
  args: { planId: v.id("sessionPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) return null;

    await ctx.db.patch(args.planId, {
      regenerateCount: plan.regenerateCount + 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Track sharing
export const incrementShareCount = mutation({
  args: { planId: v.id("sessionPlans") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) return null;

    await ctx.db.patch(args.planId, {
      shareCount: plan.shareCount + 1,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Get analytics for organization (admin/platform staff)
export const getOrganizationAnalytics = query({
  args: {
    organizationId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.object({
    totalPlans: v.number(),
    realAIPlans: v.number(),
    simulatedPlans: v.number(),
    averageRating: v.number(),
    thumbsUp: v.number(),
    thumbsDown: v.number(),
    totalViews: v.number(),
    totalShares: v.number(),
    totalRegenerations: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify user has admin access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Query all plans for organization
    const plans = await ctx.db
      .query("sessionPlans")
      .withIndex("by_organization_and_date", (q) => {
        let query = q.eq("organizationId", args.organizationId);
        if (args.startDate) {
          query = query.gt("generatedAt", args.startDate);
        }
        return query;
      })
      .collect();

    // Calculate analytics
    const totalPlans = plans.length;
    const realAIPlans = plans.filter(p => p.usedRealAI).length;
    const ratedPlans = plans.filter(p => p.rating);
    const thumbsUp = plans.filter(p => p.rating === "up").length;
    const thumbsDown = plans.filter(p => p.rating === "down").length;

    return {
      totalPlans,
      realAIPlans,
      simulatedPlans: totalPlans - realAIPlans,
      averageRating: ratedPlans.length > 0 ? thumbsUp / ratedPlans.length : 0,
      thumbsUp,
      thumbsDown,
      totalViews: plans.reduce((sum, p) => sum + p.viewCount, 0),
      totalShares: plans.reduce((sum, p) => sum + p.shareCount, 0),
      totalRegenerations: plans.reduce((sum, p) => sum + p.regenerateCount, 0),
    };
  },
});
```

### Phase 3: Frontend Integration

**Update:** `apps/web/src/components/smart-coach-dashboard.tsx`

```typescript
const handleGenerateSessionPlan = useCallback(async () => {
  setLoadingSessionPlan(true);
  setShowSessionPlan(true);

  try {
    const team = teamAnalytics.find((t) => t.playerCount > 0);
    if (!team) {
      setSessionPlan("No teams with players found.");
      return;
    }

    // NEW: Check for cached plan first
    const teamId = getTeamIdFromName(team.teamName); // Need to pass team ID
    const cachedPlan = await convex.query(api.models.sessionPlans.getRecentPlanForTeam, {
      teamId,
      maxAgeHours: 24, // Cache for 24 hours
    });

    if (cachedPlan) {
      console.log("✅ Using cached session plan from", new Date(cachedPlan.generatedAt));
      setSessionPlan(cachedPlan.sessionPlan);
      setCurrentPlanId(cachedPlan._id); // Track for rating
      setShowCachedBadge(true); // Show "Generated X hours ago" badge

      // Increment view count
      await convex.mutation(api.models.sessionPlans.incrementViewCount, {
        planId: cachedPlan._id,
      });

      return;
    }

    // No cached plan - generate new one
    console.log("📡 No cached plan found - generating new one");

    const teamPlayers = players.filter((p) => {
      const playerTeamsList = getPlayerTeams(p);
      return playerTeamsList.includes(team.teamName);
    });

    const teamData = {
      teamName: team.teamName,
      playerCount: teamPlayers.length,
      ageGroup: teamPlayers[0]?.ageGroup || "U12",
      avgSkillLevel: team.avgSkillLevel,
      strengths: team.strengths,
      weaknesses: team.weaknesses,
      attendanceIssues: team.attendanceIssues,
      overdueReviews: team.overdueReviews,
    };

    const focus = team.weaknesses.length > 0 ? team.weaknesses[0].skill : undefined;
    const plan = await generateSessionPlan(teamData, focus);

    setSessionPlan(plan);
    setShowCachedBadge(false);

    // NEW: Save plan to database
    const planId = await convex.mutation(api.models.sessionPlans.savePlan, {
      teamId,
      teamName: team.teamName,
      sessionPlan: plan,
      focus,
      teamData,
      usedRealAI: true, // Track from API response
    });

    setCurrentPlanId(planId); // Track for rating

  } catch (error) {
    console.error("Error generating session plan:", error);
    setSessionPlan("Error generating session plan. Please try again.");
  } finally {
    setLoadingSessionPlan(false);
  }
}, [teamAnalytics, players, convex]);

// NEW: Handle rating
const handleRating = useCallback(async (rating: "up" | "down") => {
  if (!currentPlanId) return;

  try {
    await convex.mutation(api.models.sessionPlans.ratePlan, {
      planId: currentPlanId,
      rating,
    });

    toast.success(
      rating === "up" ? "Thanks for the positive feedback!" : "Thanks for your feedback. We'll work on improving!",
      { description: "Your rating helps us improve session plans." }
    );

    setCurrentRating(rating); // Update UI
  } catch (error) {
    console.error("Error rating plan:", error);
    toast.error("Failed to save rating");
  }
}, [currentPlanId, convex]);

// NEW: Handle regeneration
const handleRegenerate = useCallback(async () => {
  if (currentPlanId) {
    // Track that user wanted to regenerate
    await convex.mutation(api.models.sessionPlans.incrementRegenerateCount, {
      planId: currentPlanId,
    });
  }

  // Clear current plan and generate new one (bypass cache)
  setCurrentPlanId(null);
  setCurrentRating(null);
  await handleGenerateSessionPlan();
}, [currentPlanId, handleGenerateSessionPlan, convex]);
```

### Phase 4: UI Enhancements

Add to the modal footer:

```tsx
{/* Feedback Section */}
{!loadingSessionPlan && (
  <div className="flex flex-shrink-0 flex-col gap-3 border-gray-200 border-t bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.12)] backdrop-blur-sm md:p-5">
    {/* Cached Plan Badge */}
    {showCachedBadge && cachedPlanAge && (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-blue-700 text-sm">
        <Clock size={16} />
        <span>Generated {cachedPlanAge} ago • Click "Regenerate" for a fresh plan</span>
      </div>
    )}

    {/* Rating Buttons */}
    <div className="flex items-center justify-center gap-3">
      <span className="text-gray-600 text-sm">Was this plan helpful?</span>
      <div className="flex gap-2">
        <Button
          className={`transition-all ${
            currentRating === "up"
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => handleRating("up")}
          size="sm"
          variant="ghost"
        >
          <ThumbsUp size={18} className={currentRating === "up" ? "fill-current" : ""} />
        </Button>
        <Button
          className={`transition-all ${
            currentRating === "down"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={() => handleRating("down")}
          size="sm"
          variant="ghost"
        >
          <ThumbsDown size={18} className={currentRating === "down" ? "fill-current" : ""} />
        </Button>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        className="flex h-11 w-full items-center justify-center gap-2 bg-blue-600 font-medium text-sm shadow-sm transition-colors hover:bg-blue-700 sm:flex-1 md:h-10 md:text-base"
        onClick={handleShare}
      >
        <Share2 className="flex-shrink-0" size={18} />
        <span>Share Plan</span>
      </Button>
      <Button
        className="flex h-11 w-full items-center justify-center gap-2 bg-green-600 font-medium text-sm shadow-sm transition-colors hover:bg-green-700 sm:flex-1 md:h-10 md:text-base"
        onClick={handleRegenerate}
      >
        <Brain className="flex-shrink-0" size={18} />
        <span>Regenerate Plan</span>
      </Button>
      <Button
        className="h-11 w-full bg-gray-600 font-medium text-sm shadow-sm transition-colors hover:bg-gray-700 sm:flex-1 md:h-10 md:text-base"
        onClick={() => setShowSessionPlan(false)}
      >
        Close
      </Button>
    </div>
  </div>
)}
```

## Implementation Timeline

### Week 1: Backend Foundation
- [ ] Create database schema
- [ ] Write Convex queries/mutations
- [ ] Test with sample data
- [ ] Deploy schema changes

### Week 2: Frontend Integration
- [ ] Update `handleGenerateSessionPlan` with caching logic
- [ ] Add rating UI components
- [ ] Add "cached plan" badge
- [ ] Track share/regenerate events
- [ ] Test on mobile and desktop

### Week 3: Analytics Dashboard
- [ ] Create admin analytics page
- [ ] Display cost savings metrics
- [ ] Show rating distribution
- [ ] Usage trends over time

### Week 4: Testing & Optimization
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Documentation
- [ ] Production deployment

## Success Metrics

### Cost Optimization
- **Target:** 40-60% reduction in AI API calls
- **Measure:** Cache hit rate tracking
- **Expected Savings:** $43-65/year per club with 5 coaches

### User Engagement
- **Target:** 70%+ plans rated (up or down)
- **Measure:** Rating rate vs total generations
- **Expected Quality Score:** 80%+ thumbs up

### Feature Adoption
- **Target:** 50%+ of coaches use session plan monthly
- **Measure:** Unique coaches generating plans
- **Expected Growth:** 20% month-over-month

## Risk Mitigation

### Risk 1: Cache Staleness
**Issue:** Cached plan doesn't reflect recent team changes
**Mitigation:**
- Show "generated X hours ago" badge
- Easy "Regenerate" button always available
- Consider cache invalidation on team roster changes

### Risk 2: Low Rating Participation
**Issue:** Users don't rate plans
**Mitigation:**
- Make rating very easy (just 2 buttons)
- No required fields (rating is sufficient)
- Show appreciation message when rated

### Risk 3: Too Aggressive Caching
**Issue:** Users feel they never get fresh plans
**Mitigation:**
- 24-hour cache is reasonable (training plans don't change daily)
- Clear visual indication when cached
- "Regenerate" always bypasses cache

## Future Enhancements

1. **Feedback Comments** - Optional text feedback on thumbs down
2. **Plan History** - View past plans for a team
3. **Favorite Plans** - Save best plans for reuse
4. **Plan Templates** - Create custom plan templates
5. **Share with Team** - Email plan to all team members
6. **Print Formatting** - Better PDF export

## Questions for User

1. **Cache Duration:** Is 24 hours appropriate? Or should it be:
   - 12 hours (fresher but higher costs)
   - 48 hours (more savings but potentially stale)
   - Configurable per organization?

2. **Rating Requirement:** Should we:
   - Keep rating optional (better UX)
   - Require rating before regenerating (more data)
   - Gentle prompt after 3rd view?

3. **Regenerate Behavior:** When user clicks "Regenerate":
   - Always generate new plan (costs money but fresh)
   - Offer cached + "force regenerate" option (more choice)
   - Smart regenerate (only if team changed)?

4. **Analytics Access:** Who should see analytics?
   - Platform staff only
   - Organization admins
   - Individual coaches (own stats only)

## Conclusion

This proposal addresses the missing cost optimization and feedback features. Implementation is straightforward and provides significant value:

- ✅ **Cost Savings:** 40-60% reduction in AI API costs
- ✅ **Better UX:** Faster load times for cached plans
- ✅ **Quality Feedback:** Data-driven plan improvements
- ✅ **Usage Insights:** Understand feature adoption

**Recommended Next Step:** Get user approval on approach, then implement in 4-week sprint.
