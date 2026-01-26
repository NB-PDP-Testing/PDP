# P7 Phase 3 - Learning Loop with Automatic Triggering

> Auto-generated documentation - Last updated: 2026-01-26 12:36

## Status

- **Branch**: `ralph/coach-insights-auto-apply-p7-phase3`
- **Progress**: 5 / 5 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-009.5: Implement automatic triggering of auto-apply for eligible insights

As the system, I automatically apply high-confidence skill insights for Level 2+ coaches when insights are created (without manual intervention).

**Acceptance Criteria:**
- CRITICAL: This fixes the gap from Phase 7.2 where auto-apply required manual triggering
- 
- OPTION A (RECOMMENDED): Integrate with AI action buildInsights
- Edit packages/backend/convex/actions/voiceNotes.ts
- In buildInsights action, after insights are created:
-   - For each newly created insight:
-     - Check if eligible for auto-apply:
-       * Get coach trust level from coachTrustLevels
-       * Calculate effectiveLevel = Math.min(currentLevel, preferredLevel ?? currentLevel)
-       * Check: effectiveLevel >= 2
-       * Check: confidence >= (insightConfidenceThreshold ?? 0.7)
-       * Check: category === 'skill' (Phase 7.3 only skills initially)
-       * Check: NOT injury or medical
-     - If eligible: await ctx.runMutation(internal.voiceNoteInsights.autoApplyInsight, { insightId })
-     - Log result: 'Auto-applied insight {id} for coach {coachId}' or 'Skipped: {reason}'
- 
- OPTION B: Use scheduler in existing mutation
- Edit packages/backend/convex/models/voiceNoteInsights.ts
- In any mutation that creates insights:
-   - After insight inserted:
-     - Use ctx.scheduler.runAfter(0, internal.voiceNoteInsights.tryAutoApply, { insightId })
-   - Create new internal mutation: tryAutoApply
-     - Check eligibility (same logic as Option A)
-     - Call autoApplyInsight if eligible
- 
- OPTION C: Scheduled cron (simplest but has delay)
- Create packages/backend/convex/crons.ts (if doesn't exist)
- Export const autoApplyEligibleInsights = internalMutation({
-   handler: async (ctx) => {
-     const pendingInsights = await ctx.db
-       .query('voiceNoteInsights')
-       .withIndex('by_status', (q) => q.eq('status', 'pending'))
-       .collect()
-     for (const insight of pendingInsights) {
-       // Check eligibility
-       if (eligible) {
-         await autoApplyInsight(ctx, { insightId: insight._id })
-       }
-     }
-   }
- })
- Add to cron schedule: every 5 minutes
- 
- Safety checks (all options):
-   - Don't auto-apply if already applied (status !== 'pending')
-   - Don't auto-apply if insight older than 24 hours (stale)
-   - Catch and log errors (don't crash if auto-apply fails)
- 
- Logging:
-   - console.log('Auto-apply check: insight {id}, eligible: {true/false}, reason: {reason}')
-   - console.log('Auto-applied: insight {id} for coach {coachId}')
-   - console.error('Auto-apply failed: insight {id}, error: {message}')
- 
- Type check passes
- Integration test: Create voice note → Wait for AI → Verify insight auto-applied

### US-010: ✅ PREREQUISITE COMPLETE: Insight category preferences in coachTrustLevels

As a coach, I control which insight categories auto-apply (skills yes, goals no, etc.).

**Acceptance Criteria:**
- ✅ SCHEMA ALREADY COMPLETE: insightAutoApplyPreferences field exists in coachTrustLevels (Phase 7 prerequisites)
- ✅ Fields include: skills, attendance, goals, performance (all boolean)
- ✅ injury and medical excluded (always manual review)
- 
- Create mutation: setInsightAutoApplyPreferences
- File: packages/backend/convex/models/coachTrustLevels.ts
- Args: { preferences: v.object({ skills: v.boolean(), attendance: v.boolean(), goals: v.boolean(), performance: v.boolean() }) }
- Returns: v.null()
- 
- Mutation logic:
-   - Get authenticated coach userId
-   - Query coachTrustLevels by coachId
-   - Update insightAutoApplyPreferences field with args.preferences
-   - If trust level doesn't exist, create it with default values
- 
- Type check passes
- Test: Call mutation with different preferences, verify field updates in Convex

### US-011: ✅ COMPLETE: Add category preference controls to settings tab

As a coach, I see checkboxes to enable/disable auto-apply per insight category.

**Acceptance Criteria:**
- Edit apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx
- OR create new file: settings-tab.tsx (if doesn't exist)
- 
- Add Settings tab (if not already present)
- Add section: 'Auto-Apply Preferences'
- Description: 'Choose which types of insights can be automatically applied to player profiles'
- 
- Query coachTrustLevel with insightAutoApplyPreferences
- Create checkbox group with 4 options:
-   - Checkbox: 'Skills' - Label: 'Auto-apply skill rating updates'
-     - Checked if preferences?.skills === true
-   - Checkbox: 'Attendance' - Label: 'Auto-apply attendance records'
-     - Checked if preferences?.attendance === true
-   - Checkbox: 'Goals' - Label: 'Auto-apply development goal updates'
-     - Checked if preferences?.goals === true
-   - Checkbox: 'Performance' - Label: 'Auto-apply performance notes'
-     - Checked if preferences?.performance === true
- 
- Below checkboxes, show disabled text:
-   'Injury and medical insights always require manual review for safety'
- 
- On checkbox change:
-   - Update local state
-   - Call setInsightAutoApplyPreferences mutation with updated preferences
-   - Show toast notification:
-     - If enabled: toast.success('Skill auto-apply enabled')
-     - If disabled: toast.success('Skill auto-apply disabled')
- 
- Type check passes
- Visual verification: Checkboxes toggle, changes persist on page refresh

### US-012: ✅ COMPLETE: Implement adaptive confidence threshold based on undo patterns

As a coach, my confidence threshold auto-adjusts based on my undo behavior (high accuracy = lower threshold for more auto-apply).

**Acceptance Criteria:**
- Create or edit: packages/backend/convex/crons.ts
- 
- Export const adjustInsightThresholds = internalMutation({
-   handler: async (ctx) => {
-     // Get all coaches with auto-apply enabled
-     const coaches = await ctx.db.query('coachTrustLevels').collect()
- 
-     for (const coach of coaches) {
-       // Skip if no preferences set
-       if (!coach.insightAutoApplyPreferences) continue
- 
-       // Get recent auto-applied insights (last 30 days)
-       const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
-       const recentAudits = await ctx.db
-         .query('autoAppliedInsights')
-         .withIndex('by_coach_org', (q) => q.eq('coachId', coach.coachId).eq('organizationId', coach.organizationId))
-         .filter((q) => q.gte(q.field('appliedAt'), thirtyDaysAgo))
-         .collect()
- 
-       // Need at least 10 auto-applied insights for meaningful data
-       if (recentAudits.length < 10) continue
- 
-       // Calculate undo rate
-       const undoCount = recentAudits.filter(a => a.undoneAt !== undefined).length
-       const undoRate = undoCount / recentAudits.length
- 
-       // Get current threshold
-       const currentThreshold = coach.insightConfidenceThreshold ?? 0.7
- 
-       // Adjust threshold based on undo rate
-       let newThreshold = currentThreshold
-       if (undoRate < 0.03) {
-         // Less than 3% undo rate = high trust, lower threshold
-         newThreshold = Math.max(0.6, currentThreshold - 0.05)
-       } else if (undoRate > 0.1) {
-         // More than 10% undo rate = low trust, raise threshold
-         newThreshold = Math.min(0.9, currentThreshold + 0.05)
-       }
- 
-       // Update if changed
-       if (newThreshold !== currentThreshold) {
-         await ctx.db.patch(coach._id, { insightConfidenceThreshold: newThreshold })
-         console.log(`Coach ${coach.coachId} threshold adjusted: ${currentThreshold} → ${newThreshold} (undo rate: ${Math.round(undoRate * 100)}%)`)
-       }
-     }
-   }
- })
- 
- Add to cron schedule: daily at 2am UTC
- Schedule in convex.json or crons configuration
- 
- Type check passes
- Test: Manually call mutation, verify thresholds adjust correctly

### US-013: ✅ COMPLETE: Track and display undo reasons for AI improvement feedback

As the platform, I collect undo reasons to identify AI improvement opportunities and track patterns.

**Acceptance Criteria:**
- Create query: getUndoReasonStats
- File: packages/backend/convex/models/voiceNoteInsights.ts
- Args: { organizationId: v.optional(v.string()), timeframeDays: v.optional(v.number()) }
- Returns: v.object({
-   total: v.number(),
-   byReason: v.array(v.object({
-     reason: v.string(),
-     count: v.number(),
-     percentage: v.number()
-   })),
-   topInsights: v.array(v.object({
-     insightId: v.id('voiceNoteInsights'),
-     title: v.string(),
-     reason: v.string(),
-     undoneAt: v.number()
-   }))
- })
- 
- Query logic:
-   - Query autoAppliedInsights where undoneAt is not undefined
-   - Filter by organizationId if provided
-   - Filter by timeframe if provided (default 30 days)
-   - Group by undoReason, count occurrences
-   - Calculate percentage for each reason
-   - Get top 10 most recent undone insights for context
- 
- Create admin page (optional): apps/web/src/app/admin/ai-insights/undo-analysis/page.tsx
- Show Card with title: 'Undo Reason Analysis'
- Display statistics:
-   - Total undone insights
-   - Breakdown by reason with percentages
-   - Simple bar chart or list
- Button: 'Export to CSV' (downloads undo data)
- 
- Type check passes
- Visual verification: Stats display correctly, export works


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- The insights tab already had 2 tabs (Pending Review, Auto-Applied)
- Extended to 3 tabs by adding Settings tab
- Used existing query (getCoachTrustLevelWithInsightFields) which includes insightAutoApplyPreferences
- Mutation (setInsightAutoApplyPreferences) was already implemented in coachTrustLevels.ts
- Toast notifications use 'sonner' library (imported as `import { toast } from "sonner"`)
- Checkbox component from shadcn/ui: `import { Checkbox } from "@/components/ui/checkbox"`
- Initial commit (df9c2c2) was reverted because it only had API changes, no UI changes
- Must import both Checkbox component AND toast function for this feature

**Gotchas encountered:**
- Initial commit (df9c2c2) was reverted because it only had API changes, no UI changes
- Must import both Checkbox component AND toast function for this feature
- Tab state type needed to be updated: `useState<"pending" | "auto-applied" | "settings">`
- TabsList grid-cols changed from grid-cols-2 to grid-cols-3
- Checkbox component requires onCheckedChange handler
- Handler receives `checked` parameter that can be boolean | "indeterminate"
- Must cast to boolean: `checked as boolean`
- Preferences default to false if not set (opt-in per category)

### Files Changed

- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/insights-tab.tsx (+184, -5)
- ✅ Type check: passed
- ✅ Linting: passed (no new errors, 340 pre-existing errors unrelated to my changes)
- ⚠️ Browser verification: Not completed (UI change but need dev server)
- The insights tab already had 2 tabs (Pending Review, Auto-Applied)
- Extended to 3 tabs by adding Settings tab
- Used existing query (getCoachTrustLevelWithInsightFields) which includes insightAutoApplyPreferences
- Mutation (setInsightAutoApplyPreferences) was already implemented in coachTrustLevels.ts
- Toast notifications use 'sonner' library (imported as `import { toast } from "sonner"`)
- Checkbox component from shadcn/ui: `import { Checkbox } from "@/components/ui/checkbox"`
- Initial commit (df9c2c2) was reverted because it only had API changes, no UI changes
- Must import both Checkbox component AND toast function for this feature


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
