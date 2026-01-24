# Coach-Parent AI Summaries - P5 Phase 1 (Preview Mode + Trust Slider)

> Auto-generated documentation - Last updated: 2026-01-24 19:05

## Status

- **Branch**: `ralph/coach-parent-summaries-p5`
- **Progress**: 8 / 8 stories complete
- **Phase Status**: ✅ Complete

## Completed Features

### US-001: Add preview mode fields to coachTrustLevels schema

As a coach, the system tracks my preview mode progress to measure AI agreement.

**Acceptance Criteria:**
- Edit packages/backend/convex/schema.ts
- Find coachTrustLevels table definition (around line 1795)
- Add previewModeStats field: v.optional(v.object({ wouldAutoApproveSuggestions: v.number(), coachApprovedThose: v.number(), coachRejectedThose: v.number(), agreementRate: v.number(), startedAt: v.number(), completedAt: v.optional(v.number()) }))
- Add confidenceThreshold field: v.optional(v.number())
- Run: npx -w packages/backend convex codegen
- Typecheck passes: npm run check-types

### US-002: Add wouldAutoApprove calculation to getCoachPendingSummaries

As a coach, I see which summaries would auto-approve at my current trust level.

**Acceptance Criteria:**
- Edit packages/backend/convex/models/coachParentSummaries.ts
- Find getCoachPendingSummaries query (around line 468)
- Import internal from '../_generated/api'
- After fetching coach trust level, calculate wouldAutoApprove for each summary:
-   const effectiveLevel = Math.min(trustLevel.currentLevel, trustLevel.preferredLevel ?? trustLevel.currentLevel)
-   const threshold = trustLevel.confidenceThreshold ?? 0.7
-   const wouldAutoApprove = summary.sensitivityCategory === 'normal' && effectiveLevel >= 2 && summary.publicSummary.confidenceScore >= threshold
- Add wouldAutoApprove to each summary object returned
- Update returns validator to include wouldAutoApprove: v.boolean()
- Typecheck passes: npm run check-types

### US-003: Add confidence visualization to SummaryApprovalCard

As a coach, I see AI confidence scores that are currently hidden.

**Acceptance Criteria:**
- Edit apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx
- Import Progress component from '@/components/ui/progress'
- After the summary content display (around line 60-80), add confidence section:
-   <div className='mt-4 space-y-2'>
-     <div className='flex items-center justify-between text-sm'>
-       <span className={cn('font-medium', confidenceScore < 0.6 ? 'text-red-600' : confidenceScore < 0.8 ? 'text-amber-600' : 'text-green-600')}>
-         AI Confidence: {Math.round(summary.publicSummary.confidenceScore * 100)}%
-       </span>
-     </div>
-     <Progress value={summary.publicSummary.confidenceScore * 100} className='h-2' />
-   </div>
- Position above collapsible original insight section (if exists)
- Import cn from '@/lib/utils' for className concatenation
- Typecheck passes: npm run check-types

### US-004: Add preview mode prediction badge to SummaryApprovalCard

As a coach in preview mode, I see what AI would do with this summary.

**Acceptance Criteria:**
- In summary-approval-card.tsx, add wouldAutoApprove to props interface
- After confidence visualization section, add prediction badge:
-   {wouldAutoApprove ? (
-     <Badge variant='secondary' className='bg-blue-100 text-blue-700'>
-       <Sparkles className='mr-1 h-3 w-3' />
-       AI would auto-send this at Level 2+
-     </Badge>
-   ) : (
-     <p className='text-sm text-muted-foreground'>Requires manual review</p>
-   )}
- Import Badge from '@/components/ui/badge'
- Import Sparkles from 'lucide-react'
- Parent component (ParentsTab) must pass wouldAutoApprove prop from query data
- Typecheck passes: npm run check-types

### US-005: Track preview mode statistics when coaches approve/suppress

As a coach, the system learns my agreement rate with AI predictions.

**Acceptance Criteria:**
- Edit packages/backend/convex/models/coachParentSummaries.ts
- Find approveSummary mutation (around line 232)
- Before calling ctx.runMutation for updateTrustMetrics, add preview mode tracking:
-   const trustLevel = await ctx.db.query('coachTrustLevels').withIndex('by_coach_org', q => q.eq('coachId', summary.coachId).eq('organizationId', summary.organizationId)).first()
-   if (trustLevel?.previewModeStats && !trustLevel.previewModeStats.completedAt) {
-     const effectiveLevel = Math.min(trustLevel.currentLevel, trustLevel.preferredLevel ?? trustLevel.currentLevel)
-     const threshold = trustLevel.confidenceThreshold ?? 0.7
-     const wouldAutoApprove = summary.sensitivityCategory === 'normal' && effectiveLevel >= 2 && summary.publicSummary.confidenceScore >= threshold
-     const newSuggestions = trustLevel.previewModeStats.wouldAutoApproveSuggestions + (wouldAutoApprove ? 1 : 0)
-     const newApproved = trustLevel.previewModeStats.coachApprovedThose + (wouldAutoApprove ? 1 : 0)
-     const agreementRate = newSuggestions > 0 ? newApproved / newSuggestions : 0
-     await ctx.db.patch(trustLevel._id, {
-       previewModeStats: {
-         ...trustLevel.previewModeStats,
-         wouldAutoApproveSuggestions: newSuggestions,
-         coachApprovedThose: newApproved,
-         agreementRate,
-         completedAt: newSuggestions >= 20 ? Date.now() : undefined
-       }
-     })
-   }
- Similar logic in suppressSummary mutation (increment wouldAutoApproveSuggestions but NOT coachApprovedThose)
- Typecheck passes: npm run check-types

### US-006: Create TrustLevelSlider component replacing radio buttons

As a coach, I use a horizontal slider for gradual trust control instead of discrete radio buttons.

**Acceptance Criteria:**
- Create apps/web/src/components/coach/trust-level-slider.tsx
- Add 'use client' directive at top
- Props interface: { currentLevel: number; preferredLevel: number | null; earnedLevel: number; onLevelChange: (level: number) => void; progressToNext: { percentage: number; threshold: number; currentCount: number } }
- Import Slider from '@/components/ui/slider'
- Import Badge from '@/components/ui/badge'
- Implement component:
-   const selectedLevel = preferredLevel ?? currentLevel
-   const levelNames = ['Manual', 'Learning', 'Trusted', 'Expert']
-   return (
-     <div className='space-y-6'>
-       <div className='space-y-4'>
-         <div className='flex justify-between text-sm'>
-           {[0,1,2,3].map(level => (
-             <div key={level} className={cn('text-center', level > earnedLevel && 'opacity-40')}>
-               <div className='font-medium'>{levelNames[level]}</div>
-               <div className='text-xs text-muted-foreground'>Lvl {level}</div>
-             </div>
-           ))}
-         </div>
-         <Slider
-           min={0}
-           max={earnedLevel}
-           step={1}
-           value={[selectedLevel]}
-           onValueChange={([level]) => onLevelChange(level)}
-           className='py-4'
-         />
-         <p className='text-sm text-muted-foreground'>Your Setting: Level {selectedLevel} - {levelNames[selectedLevel]}</p>
-       </div>
-     </div>
-   )
- Typecheck passes: npm run check-types

### US-007: Add real-time progress visualization to slider

As a coach, I see progress TO next level, not just AT current level.

**Acceptance Criteria:**
- In trust-level-slider.tsx, add progress section after slider:
-   {earnedLevel < 3 && (
-     <div className='rounded-lg border p-4 space-y-3'>
-       <div>
-         <div className='flex items-center justify-between mb-2'>
-           <span className='text-sm font-medium'>Progress to {levelNames[earnedLevel + 1]}</span>
-           <span className='text-xs text-muted-foreground'>{progressToNext.currentCount} / {progressToNext.threshold}</span>
-         </div>
-         <Progress value={progressToNext.percentage} className='h-2' />
-       </div>
-       <div className='text-xs text-muted-foreground'>
-         {progressToNext.percentage >= 80 ? (
-           <span className='text-green-600 font-medium'>Almost there! Keep approving quality summaries.</span>
-         ) : (
-           <span>{progressToNext.threshold - progressToNext.currentCount} more approvals needed</span>
-         )}
-       </div>
-     </div>
-   )}
-   {earnedLevel === 3 && (
-     <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
-       <p className='text-sm text-green-700'>🎉 Maximum level reached!</p>
-     </div>
-   )}
- Import Progress from '@/components/ui/progress'
- Import cn from '@/lib/utils'
- Typecheck passes: npm run check-types

### US-008: Integrate TrustLevelSlider into voice notes settings

As a coach, the new slider replaces old radio buttons in my settings.

**Acceptance Criteria:**
- Edit apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx
- Import TrustLevelSlider from '@/components/coach/trust-level-slider'
- Import { TRUST_LEVEL_THRESHOLDS } from '@/../../packages/backend/convex/lib/trustLevelCalculator' (or copy constants)
- Replace TrustPreferenceSettings component with TrustLevelSlider
- Calculate progressToNext using trustLevel data:
-   const nextLevel = (trustLevel?.currentLevel ?? 0) + 1
-   const threshold = nextLevel === 1 ? 10 : nextLevel === 2 ? 50 : nextLevel === 3 ? 200 : 0
-   const currentCount = trustLevel?.totalApprovals ?? 0
-   const percentage = threshold > 0 ? Math.min(100, (currentCount / threshold) * 100) : 100
- Pass props to TrustLevelSlider:
-   currentLevel={trustLevel?.currentLevel ?? 0}
-   preferredLevel={trustLevel?.preferredLevel ?? null}
-   earnedLevel={trustLevel?.currentLevel ?? 0}
-   onLevelChange={handleLevelChange}
-   progressToNext={{ percentage, threshold, currentCount }}
- Wire handleLevelChange to existing setCoachPreferredLevel mutation
- Show toast on success: toast.success(`Trust level updated to ${levelNames[level]}`)
- Import toast from 'sonner'
- Typecheck passes: npm run check-types


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Preview mode tracking happens BEFORE updateTrustMetrics in mutations (tracks predictions first, then updates actual metrics)
- Trust level calculation uses Math.min(currentLevel, preferredLevel ?? currentLevel) for effective level
- wouldAutoApprove logic: normal category + effectiveLevel >= 2 + confidenceScore >= threshold
- Progress calculation shows progress TO next level, not AT current level (more motivating)
- Slider max is earnedLevel (can't select unearned levels)
- Linter (biome) auto-formats on save and sometimes removes imports temporarily
- Must run `npx -w packages/backend convex codegen` after schema changes
- Preview mode stats only update when previewModeStats exists AND completedAt is undefined

**Gotchas encountered:**
- Linter (biome) auto-formats on save and sometimes removes imports temporarily
- Must run `npx -w packages/backend convex codegen` after schema changes
- Preview mode stats only update when previewModeStats exists AND completedAt is undefined
- When suppressing, increment wouldAutoApproveSuggestions but NOT coachApprovedThose (only increment coachRejectedThose)
- Progress component must be imported separately: `import { Progress } from '@/components/ui/progress'`
- SummaryApprovalCard changes require updates in both parents-tab.tsx AND review-tab.tsx
- Trust level thresholds hardcoded in settings-tab.tsx (level1: 10, level2: 50, level3: 200)
- TrustLevelSlider requires progressToNext calculation in parent component

### Files Changed

- packages/backend/convex/schema.ts (+15, -2)
- packages/backend/convex/models/coachParentSummaries.ts (+89, -2)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx (+37, -2)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/parents-tab.tsx (+1, -0)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/review-tab.tsx (+1, -0)
- apps/web/src/components/coach/trust-level-slider.tsx (+92 new file)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx (+30, -8)
- scripts/ralph/prd.json (all 8 stories marked passes: true)
- ✅ Type check: passed (npm run check-types)
- ✅ Linting: passed (pre-commit hooks with biome)
- ✅ Schema changes: Convex codegen successful
- ⚠️ Browser verification: Not performed (backend/UI changes, manual testing required)
- Preview mode tracking happens BEFORE updateTrustMetrics in mutations (tracks predictions first, then updates actual metrics)
- Trust level calculation uses Math.min(currentLevel, preferredLevel ?? currentLevel) for effective level


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
