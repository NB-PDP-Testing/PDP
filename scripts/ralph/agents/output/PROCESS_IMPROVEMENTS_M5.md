# Process Improvements - Post-M5 Analysis

**Date:** 2026-02-17
**Trigger:** M5 implementation gaps (4 functional requirements missed)
**Impact:** Process updates to prevent future gaps

---

## Problem Statement

Ralph delivered M5 in 10-12 minutes with perfect architecture but missed 30% of functional requirements.

**Root Cause:** Implementation guides focused on architectural patterns (HOW) but didn't capture functional requirements (WHAT).

**Result:** 30 minutes of rework to add missing queries and calculations.

---

## New Process: PRD → Implementation (Updated)

### OLD PROCESS (M1-M5)

```
1. Read PRD
2. Run /architect-review
3. Generate ADRs (architectural decisions)
4. Create implementation guide (code examples)
5. Ralph implements
6. Manual testing
```

**Gap:** Steps 2-4 focused on HOW (patterns), not WHAT (requirements).

### NEW PROCESS (M6+)

```
1. Read PRD
2. Extract Functional Requirements Checklist (NEW!)
3. Run /architect-review
4. Generate ADRs (architectural decisions)
5. Create implementation guide with:
   - Architecture (ADRs)
   - Functional Requirements (checklist)  ← NEW!
   - Code Examples (complete, not simplified)
   - Verification Checklist  ← NEW!
6. Ralph implements
7. Run automated gap check  ← NEW!
8. Manual testing
```

**Fix:** Step 2 extracts ALL functional requirements from PRD.
**Fix:** Step 5 includes requirements alongside architecture.
**Fix:** Step 7 validates deliverables vs requirements.

---

## Template 1: Functional Requirements Extraction

**File:** `scripts/ralph/prds/<project>/context/<PHASE>_FUNCTIONAL_REQUIREMENTS.md`

**Format:**

```markdown
# <PHASE> Functional Requirements Checklist

**Generated from:** <PRD_FILE>.json
**Story:** <STORY_ID>
**Date:** <DATE>

---

## Backend Queries Required

List ALL queries that must be called:

- [ ] <query_name>(<args>) → <result_variable>
  - **Purpose:** <what data this provides>
  - **Used for:** <which UI components need this>
  - **Signature:** <exact API signature>

Example:
- [ ] getActiveArtifacts({ paginationOpts: { numItems: 100, cursor: null } }) → activeArtifacts
  - **Purpose:** Accurate count of artifacts currently processing
  - **Used for:** Status Card 1
  - **Signature:** Returns { page: Artifact[], isDone: boolean, continueCursor: string }

---

## Data Calculations Required

List ALL calculations/transformations:

- [ ] <calculation_name>
  - **Formula:** <exact formula>
  - **Used for:** <which UI component>

Example:
- [ ] completedToday
  - **Formula:** metrics.artifactsCompleted1h × 24
  - **Used for:** Status Card 2 value

---

## UI Copy & Labels

List ALL user-facing text:

- [ ] <component> → <field> → "<exact text>"

Example:
- [ ] Status Card 2 → title → "Completed Today"
- [ ] Status Card 2 → subtitle → "Last 24 hours (est)"

---

## Components Required

List ALL components to create:

- [ ] <ComponentName>
  - **Props:** <list props>
  - **Renders:** <what it displays>

---

## Verification Checklist

Before marking story complete:

- [ ] All queries implemented
- [ ] All calculations correct
- [ ] All labels match PRD
- [ ] No placeholder values ("--", "Available in...")
- [ ] Type check passes
- [ ] Manual testing passed
```

---

## Template 2: Implementation Guide (Enhanced)

**File:** `scripts/ralph/agents/output/<phase>-implementation-guide.md`

**Add these sections:**

### Section 1: Functional Requirements (NEW!)

```markdown
## Functional Requirements

**Read this section FIRST before implementing!**

This section lists ALL queries, calculations, and labels required by the PRD.
Use this as a checklist during implementation.

### Queries to Call (5 total)

1. ✅ getRealTimeMetrics()
   - Returns: { artifactsReceived1h, artifactsCompleted1h, ... }
   - Used for: Status cards 2, 3, pipeline flow graph

2. ✅ getRecentEvents({ filters: {}, paginationOpts: { numItems: 20, cursor: null } })
   - Returns: { page: Event[], isDone, continueCursor }
   - Used for: Activity feed, cost calculation

3. ✅ getActiveAlerts()
   - Returns: Alert[]
   - Used for: Circuit breaker status

4. ✅ getActiveArtifacts({ paginationOpts: { numItems: 100, cursor: null } })
   - Returns: { page: Artifact[], isDone, continueCursor }
   - Used for: Active artifacts count (Card 1)

5. ✅ getHistoricalMetrics({ periodType: "hourly", startTime, endTime })
   - Returns: MetricSnapshot[]
   - Used for: Average latency calculation (Card 4)

### Calculations Required

- completedToday = metrics.artifactsCompleted1h × 24
- failedToday = metrics.artifactsFailed1h × 24
- avgLatency = avg(historicalMetrics.map(m => m.avgEndToEndLatency))
- totalCost = sum(events.map(e => e.metadata.aiCost ?? 0))
- activeCount = activeArtifacts.page.length
```

### Section 2: Architecture (Existing ADRs)

```markdown
## Architecture Decisions

See ADRs for detailed rationale:
- ADR-VNM-014: Client component pattern
- ADR-VNM-015: Query lifting
- etc.
```

### Section 3: Code Examples (Complete)

```markdown
## Complete Code Examples

**IMPORTANT:** These examples include ALL requirements, not simplified versions.

### page.tsx (Complete)

```typescript
// Show ACTUAL code with all 5 queries
const realTimeMetrics = useQuery(...);
const recentEvents = useQuery(...);
const activeAlerts = useQuery(...);
const activeArtifacts = useQuery(...);  // Don't skip this!
const historicalMetrics = useQuery(...);  // Don't skip this!
```
```

### Section 4: Pre-Commit Verification (NEW!)

```markdown
## Pre-Commit Verification Checklist

Before committing, verify:

**Queries:**
- [ ] All 5 queries called in page.tsx
- [ ] All queries use skip pattern
- [ ] All queries passed as props (NOT queried in components)

**Calculations:**
- [ ] Card 2 shows × 24 estimate
- [ ] Card 3 shows × 24 estimate
- [ ] Card 4 calculates average from historicalMetrics
- [ ] Card 6 sums aiCost from events

**Labels:**
- [ ] Card 2 subtitle = "Last 24 hours (est)"
- [ ] Card 3 subtitle = "Last 24 hours (est)"
- [ ] Card 4 subtitle = "End-to-end (24h avg)"
- [ ] Card 6 subtitle = "Pipeline AI costs (est)"

**No Placeholders:**
- [ ] No "--" placeholder values
- [ ] No "Available in M7" text
- [ ] All cards show real data

**Type Safety:**
- [ ] npm run check-types passes
- [ ] No type assertions except for Next.js Link routing
```

---

## Template 3: Automated Gap Check Script

**File:** `scripts/ralph/verify-prd-requirements.sh`

```bash
#!/bin/bash

# Usage: ./verify-prd-requirements.sh <phase>
# Example: ./verify-prd-requirements.sh M5

PHASE=$1
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verifying ${PHASE} Requirements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for required queries
echo -e "\n${YELLOW}Checking queries...${NC}"

if grep -q "getActiveArtifacts" apps/web/src/app/platform/voice-monitoring/page.tsx; then
  echo -e "${GREEN}✓${NC} getActiveArtifacts found"
else
  echo -e "${RED}✗${NC} MISSING: getActiveArtifacts"
fi

if grep -q "getHistoricalMetrics" apps/web/src/app/platform/voice-monitoring/page.tsx; then
  echo -e "${GREEN}✓${NC} getHistoricalMetrics found"
else
  echo -e "${RED}✗${NC} MISSING: getHistoricalMetrics"
fi

# Check for placeholders (should not exist)
echo -e "\n${YELLOW}Checking for placeholders...${NC}"

if grep -q "Available in M7" apps/web/src/app/platform/voice-monitoring/_components/status-cards.tsx; then
  echo -e "${RED}✗${NC} FOUND placeholder: 'Available in M7'"
else
  echo -e "${GREEN}✓${NC} No placeholders found"
fi

# Check for correct labels
echo -e "\n${YELLOW}Checking labels...${NC}"

if grep -q "Last 24 hours" apps/web/src/app/platform/voice-monitoring/_components/status-cards.tsx; then
  echo -e "${GREEN}✓${NC} '24 hours' label found"
else
  echo -e "${RED}✗${NC} MISSING: '24 hours' label"
fi

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

## Updated Workflow for M6

### 1. Pre-Implementation (Before Ralph Starts)

```bash
# Step 1: Extract functional requirements from PRD
node scripts/ralph/extract-prd-requirements.js \
  scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M6.json \
  > scripts/ralph/prds/voice-monitor-harness/context/M6_FUNCTIONAL_REQUIREMENTS.md

# Step 2: Run architectural review
/architect-review

# Step 3: Create implementation guide (include functional requirements)
# Manually combine:
# - M6_FUNCTIONAL_REQUIREMENTS.md
# - Generated ADRs
# - Complete code examples
# - Verification checklist

# Step 4: Update progress.txt with M6 section
```

### 2. Implementation (Ralph Working)

Ralph reads:
1. PHASE_M6.json (full PRD)
2. M6_FUNCTIONAL_REQUIREMENTS.md (checklist)
3. ADR-VNM-021-*.md through ADR-VNM-027-*.md (architecture)
4. m6-implementation-guide.md (complete examples)

### 3. Post-Implementation (After Ralph Commits)

```bash
# Step 1: Run automated gap check
./scripts/ralph/verify-prd-requirements.sh M6

# Step 2: Manual PRD comparison (5 minutes)
# Compare deliverables vs PRD JSON

# Step 3: Fix any gaps

# Step 4: Type check
npm run check-types

# Step 5: Manual testing
```

---

## Success Metrics

### Target for M6

- **First-time-right:** 100% of functional requirements
- **Gap fixes needed:** 0
- **Time to implement:** ~15 minutes (vs 10 for M5, accounting for more queries)
- **Time to verify:** ~5 minutes
- **Total time:** ~20 minutes (vs 55 for M5 with fixes)

**Expected savings:** 35 minutes per phase × 4 remaining phases (M6-M9) = **140 minutes saved**

---

## Rollout Plan

### Immediate (M6)

- [x] Create M5_LESSONS_LEARNED.md
- [ ] Create M6_FUNCTIONAL_REQUIREMENTS.md
- [ ] Update m6-implementation-guide.md template
- [ ] Create verify-prd-requirements.sh script
- [ ] Test on M6 implementation

### Short-term (M7-M9)

- [ ] Refine templates based on M6 results
- [ ] Automate PRD requirement extraction
- [ ] Add to /architect-review skill
- [ ] Document in CLAUDE.md

### Long-term (Future Projects)

- [ ] Make functional requirements extraction standard
- [ ] Include in all PRD reviews
- [ ] Add to Ralph onboarding docs

---

## Conclusion

**Problem:** Ralph built perfect architecture but missed functional requirements.

**Root Cause:** Implementation guides lacked functional requirement checklists.

**Solution:** Extract requirements from PRD, include in implementation guide, verify post-commit.

**Expected Impact:** 100% first-time-right implementations, 35+ minutes saved per phase.

---

**File:** `scripts/ralph/agents/output/PROCESS_IMPROVEMENTS_M5.md`
**Date:** 2026-02-17
**Status:** Approved - Ready for M6
