# Phase 2: Enhanced UX & Data Quality

**Timeline**: Weeks 5-8
**Status**: Pending Phase 1 Completion
**Dependencies**: Phase 1 (Foundation)

---

## Objectives

1. Add data quality scoring (5-dimension ML-based assessment)
2. Implement import simulation (dry-run mode)
3. Enable save & resume for long imports
4. Add granular undo capability (24-hour rollback window)
5. Professional progress animations
6. Enhanced "What's Next" post-import workflow

---

## Success Criteria

- [ ] Data quality score calculated for all imports (0-100 scale)
- [ ] Quality score >95% for clean data, accurate issue detection
- [ ] Simulation mode previews accurate counts before commit
- [ ] Save & resume works across browser sessions and devices
- [ ] Undo import works within 24-hour window
- [ ] Undo blocked when dependent data exists (assessments, etc.)
- [ ] Progress animations feel professional (no gimmicks)
- [ ] "What's Next" workflow reduces post-import time by 50%
- [ ] Import history page shows all past imports with undo eligibility

---

## Features

### 1. Data Quality Scoring

**5-Dimension ML-Based Assessment**:

| Dimension | Weight | Scoring Method |
|-----------|--------|----------------|
| Completeness | 30% | (Populated required fields / Total required) × 100 |
| Consistency | 25% | Pattern matching + regex validation |
| Accuracy | 25% | Valid values (email syntax, phone format, age logic) |
| Uniqueness | 15% | Duplicate detection rate |
| Timeliness | 5% | Data freshness (recent DOBs, current season) |

**Overall Score**: Weighted average → Grade (Excellent ⭐⭐⭐⭐⭐ to Critical ⭐)

**Issue Categorization**:
- **Critical**: Must fix before import (missing required field, invalid email)
- **Warning**: Recommended to fix (inconsistent phone format, missing postcode)
- **Suggestion**: Optional improvement (add middle names, standardize capitalization)

### 2. Import Simulation (Dry Run)

**Preview Mode**: Run full import logic without database writes.

**What Simulation Does**:
- Validates all data
- Detects duplicates
- Matches guardians
- Calculates teams to create
- Generates preview IDs
- Estimates duration

**What Simulation Does NOT Do**:
- Write to database
- Send email invitations
- Create audit log entries
- Update organization counts

**Output**: Sample player cards, summary stats, downloadable report.

### 3. Save & Resume

**Auto-Save**: After each wizard step completion.

**Stored State**:
- Parsed data
- Column mappings
- Player selections
- Benchmark settings
- Conflict resolutions

**Retention**: 7 days, then auto-cleanup.

**Resume Options**:
- Browser session recovery (localStorage)
- Cross-device via backend sync
- Email resume link (Phase 3)

### 4. Granular Undo

**Full Undo**: Remove entire import within 24-hour window.

**Eligibility Checks**:
- Within 24-hour window?
- No dependent data created (assessments, sessions)?
- Records not manually edited?

**Soft Delete**: Mark records as deleted, permanent removal after 30 days.

**Partial Undo** (Phase 3): Select specific players to remove.

---

## Backend Implementation

### Files to Create

#### 1. `/packages/backend/convex/lib/import/dataQuality.ts` (~250 lines)

5-dimension scoring engine.

**Key Functions**:
```typescript
export async function calculateDataQuality(
  rows: Record<string, string>[],
  mappings: Record<string, string>,
  sportCode: string
): Promise<QualityReport>

export function scoreCompleteness(rows: Record<string, string>[], requiredFields: string[]): number
export function scoreConsistency(rows: Record<string, string>[]): number
export function scoreAccuracy(rows: Record<string, string>[]): number
export function scoreUniqueness(rows: Record<string, string>[]): number
export function scoreTimeliness(rows: Record<string, string>[], season: string): number

export function categorizeIssues(issues: Issue[]): CategorizedIssues
```

**Quality Report Structure**:
```typescript
type QualityReport = {
  overallScore: number;              // 0-100
  grade: "excellent" | "good" | "fair" | "poor" | "critical";
  completeness: number;
  consistency: number;
  accuracy: number;
  uniqueness: number;
  timeliness: number;
  issues: Issue[];
  categorized: {
    critical: Issue[];
    warnings: Issue[];
    suggestions: Issue[];
  };
}
```

#### 2. `/packages/backend/convex/lib/import/simulator.ts` (~200 lines)

Dry-run mode implementation.

**Key Function**:
```typescript
export async function simulateImport(
  ctx: MutationCtx,
  sessionId: Id<"importSessions">,
  dryRun: true
): Promise<SimulationResult>
```

**Implementation**:
- Run full import logic from `batchImportPlayersWithIdentity`
- Replace all `ctx.db.insert()` with preview ID generation
- Replace all `ctx.db.patch()` with change tracking
- Calculate all statistics without commits
- Return preview data

**Simulation Result**:
```typescript
type SimulationResult = {
  success: boolean;
  preview: {
    playersToCreate: number;
    playersToUpdate: number;
    guardiansToCreate: number;
    guardiansToLink: number;
    teamsToCreate: string[];
    passportsToCreate: number;
    benchmarksToApply: number;
    estimatedDuration: number;        // seconds
    samplePlayers: SamplePlayer[];    // 5 random samples
  };
  errors: string[];
}
```

#### 3. `/packages/backend/convex/models/importSessionDrafts.ts` (~150 lines)

Draft persistence for save & resume.

**Table Schema**:
```typescript
defineTable({
  sessionId: v.id("importSessions"),
  userId: v.string(),
  organizationId: v.string(),

  draftState: v.object({
    step: v.number(),
    parsedData: v.any(),
    mappings: v.record(v.string(), v.string()),
    playerSelections: v.array(v.object({...})),
    benchmarkSettings: v.object({...}),
    duplicateResolutions: v.record(v.string(), v.string()),
  }),

  expiresAt: v.number(),               // 7 days from last save
  lastSavedAt: v.number(),
})
  .index("by_sessionId", ["sessionId"])
  .index("by_userId", ["userId"])
  .index("by_expiresAt", ["expiresAt"])
```

**Mutations**:
```typescript
export const saveDraft = mutation({...})
export const loadDraft = mutation({...})
export const deleteDraft = mutation({...})
```

**Cron Job**: Delete expired drafts daily.

#### 4. Enhanced `/packages/backend/convex/models/importSessions.ts`

Add undo-related fields and mutations.

**New Mutations**:
```typescript
export const undoImport = mutation({
  args: {
    sessionId: v.id("importSessions"),
    reason: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    rollbackStats: v.object({
      playersRemoved: v.number(),
      guardiansUnlinked: v.number(),
      teamsRemoved: v.number(),
      passportsRemoved: v.number(),
    }),
    ineligibilityReasons: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Check eligibility
    const session = await ctx.db.get(args.sessionId);
    const eligibility = await checkUndoEligibility(ctx, session);

    if (!eligibility.eligible) {
      return { success: false, ineligibilityReasons: eligibility.reasons };
    }

    // 2. Soft delete all created records
    const rollbackStats = await performSoftDelete(ctx, session);

    // 3. Update session status
    await ctx.db.patch(args.sessionId, { status: "undone", undoneAt: Date.now() });

    return { success: true, rollbackStats };
  },
})

export const checkUndoEligibility = query({
  args: { sessionId: v.id("importSessions") },
  returns: v.object({
    eligible: v.boolean(),
    reasons: v.array(v.string()),
    expiresAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    const reasons: string[] = [];

    // Check 24-hour window
    const hoursSinceImport = (Date.now() - session.completedAt!) / (1000 * 60 * 60);
    if (hoursSinceImport > 24) {
      reasons.push("Import is older than 24 hours");
    }

    // Check for dependent data (assessments, sessions, etc.)
    const hasAssessments = await checkDependentData(ctx, session);
    if (hasAssessments) {
      reasons.push("Players have assessments or other dependent data");
    }

    // Check for manual edits
    const hasEdits = await checkManualEdits(ctx, session);
    if (hasEdits) {
      reasons.push("Some records were manually edited after import");
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      expiresAt: session.completedAt! + (24 * 60 * 60 * 1000),
    };
  },
})
```

---

## Frontend Implementation

### Files to Create

#### 1. `/apps/web/src/components/import/DataQualityReport.tsx` (~250 lines)

5-dimension score visualization.

**UI Features**:
- Overall score badge (0-100 with grade)
- Progress bars for each dimension
- Issue breakdown by severity (critical, warnings, suggestions)
- Fix actions for auto-fixable issues
- Expandable details per issue

**Component Structure**:
```typescript
export function DataQualityReport({
  qualityReport,
  onFixIssue,
  onContinue
}: DataQualityReportProps) {
  return (
    <div>
      <OverallScore score={qualityReport.overallScore} grade={qualityReport.grade} />

      <DimensionBreakdown>
        <DimensionBar name="Completeness" score={qualityReport.completeness} />
        <DimensionBar name="Consistency" score={qualityReport.consistency} />
        <DimensionBar name="Accuracy" score={qualityReport.accuracy} />
        <DimensionBar name="Uniqueness" score={qualityReport.uniqueness} />
        <DimensionBar name="Timeliness" score={qualityReport.timeliness} />
      </DimensionBreakdown>

      <IssueList>
        <IssueSection severity="critical" issues={qualityReport.categorized.critical} />
        <IssueSection severity="warning" issues={qualityReport.categorized.warnings} />
        <IssueSection severity="suggestion" issues={qualityReport.categorized.suggestions} />
      </IssueList>

      <Actions>
        <Button onClick={onContinue} disabled={hasCriticalIssues}>
          Continue to Import
        </Button>
      </Actions>
    </div>
  );
}
```

#### 2. `/apps/web/src/components/import/SimulationResults.tsx` (~200 lines)

Dry-run preview display.

**UI Features**:
- Summary stats (players, guardians, teams to create)
- Sample player cards (5 random)
- Estimated duration
- Downloadable report (PDF/CSV)
- "Run Live Import" button

#### 3. `/apps/web/src/components/import/ImportHistory.tsx` (~300 lines)

Past imports with undo capability.

**UI Features**:
- List of past imports (sortable, filterable)
- Import details (date, stats, status)
- Undo button (if eligible)
- Countdown timer for undo window
- Download import log
- View details link

#### 4. `/apps/web/src/components/import/UndoImportDialog.tsx` (~250 lines)

Undo confirmation modal.

**UI Features**:
- Warning message
- Impact preview (what will be removed)
- Eligibility checks display
- Confirmation input
- Undo button (destructive styling)

#### 5. `/apps/web/src/components/import/ImportProgress.tsx` (~150 lines)

Professional progress animations.

**UI Features**:
- Phase-by-phase breakdown (not just %)
- Live stats counter
- Current operation display ("Creating identity for Emma Walsh")
- Smooth progress bar animation
- Error collection

---

## Testing Requirements

### Unit Tests
- Data quality scoring algorithms
- Simulation logic (verify no DB writes)
- Draft persistence and expiry
- Undo eligibility checks

### Integration Tests
1. Calculate quality for 200-row import, verify accuracy
2. Run simulation, then live import, compare results
3. Save draft mid-wizard, resume from different browser
4. Complete import, undo within 24h, verify rollback
5. Attempt undo after 24h, verify blocked
6. Create assessment, attempt undo, verify blocked

### Manual UAT
1. Import with quality score <70, fix issues, re-score
2. Run simulation, review sample players, approve, run live
3. Start import, close browser, reopen, resume
4. Complete import, wait 23h, undo successfully
5. Complete import, create assessment, verify undo blocked

---

## Ralph Integration

### Parallel Work Streams

#### Stream 1: Data Quality (1.5 weeks)
- Agent 1: Scoring engine implementation
- Agent 2: Issue detection & categorization
- Agent 3: Frontend quality report UI

#### Stream 2: Simulation (1.5 weeks)
- Agent 4: Backend dry-run mode
- Agent 5: Frontend simulation results UI
- Agent 6: Report generation (PDF/CSV)

#### Stream 3: Save & Resume (1 week)
- Agent 7: Draft persistence (backend)
- Agent 8: Session recovery (frontend)
- Agent 9: Cross-device sync

#### Stream 4: Undo & Rollback (1.5 weeks)
- Agent 10: Backend undo logic
- Agent 11: Eligibility checks
- Agent 12: Frontend undo UI

#### Stream 5: Enhanced UX (1.5 weeks)
- Agent 13: Professional progress animations
- Agent 14: "What's Next" component
- Agent 15: Import history page

---

## Definition of Done

- [ ] Data quality scoring implemented and tested
- [ ] Simulation mode functional and accurate
- [ ] Save & resume works across devices
- [ ] Undo capability functional with eligibility checks
- [ ] Progress animations polished
- [ ] Import history page complete
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] UAT sign-off
- [ ] Documentation updated

---

**Previous Phase**: [Phase 1: Foundation](./phase-1-foundation.md)
**Next Phase**: [Phase 3: Mobile UX & Conflict Resolution](./phase-3-mobile-ux.md)
