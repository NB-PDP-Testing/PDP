# P5 & P6 PRD Index
**Created:** 2026-01-24
**Purpose:** Quick reference for all P5 and P6 phase PRDs

---

## 📂 PRD File Locations

### Full Phase PRDs (All Stories)
**P5 Complete (20 stories across 4 phases):**
- **Location:** `/scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json`
- **Stories:** US-001 to US-020
- **Phases:** Preview Mode → Auto-Approval → Cost Optimization → Learning Loop

**P6 Complete (22 stories across 4 phases):**
- **Location:** `/scripts/ralph/prds/coach-parent-summaries-phase6-REVISED.prd.json`
- **Stories:** US-001 to US-022
- **Phases:** Cost Monitoring → Rate Limiting → Graceful Degradation → Admin Dashboard

### Active Ralph PRD (Current Phase)
**P5 Phase 2 (currently ready to run):**
- **Location:** `/scripts/ralph/prd.json` (active PRD Ralph reads)
- **Stories:** US-006 to US-011 (6 stories)
- **Branch:** ralph/coach-parent-summaries-p5-phase2

---

## 🗂️ P5 Breakdown (Progressive Automation)

### ✅ Phase 1: Preview Mode + Trust Slider (COMPLETE)
**Stories:** US-001 to US-005 (Phase 1 PRD)
**Plus:** US-006 to US-008 from full PRD adapted for trust slider

**Branch:** ralph/coach-parent-summaries-p5
**Commits:** 2e040b8, f8dae44, b9c713a
**Status:** Merged/Complete

**What Was Built:**
- Preview mode tracking (20-message learning period)
- Confidence visualization (progress bars, color coding)
- Prediction badges ("AI would auto-send this")
- Trust level slider (horizontal, progress to next level)
- Preview statistics tracking (agreement rate)

**Files Modified:**
- packages/backend/convex/schema.ts
- packages/backend/convex/models/coachParentSummaries.ts
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/summary-approval-card.tsx
- apps/web/src/components/coach/trust-level-slider.tsx (NEW)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx

---

### 🚀 Phase 2: Supervised Auto-Approval (READY TO RUN)
**Stories:** US-006 to US-011 (6 stories)
**PRD Location:** `/scripts/ralph/prd.json` (active)
**Branch:** ralph/coach-parent-summaries-p5-phase2 (will be created)

**What Will Be Built:**
- Auto-approval decision fields in schema
- Pure auto-approval logic (lib/autoApprovalDecision.ts)
- Actual auto-approval in createParentSummary
- Revoke mutation (1-hour safety window)
- Auto-Sent dashboard tab
- Level 2+ conditional tab visibility

**Files to Modify:**
- packages/backend/convex/schema.ts
- packages/backend/convex/lib/autoApprovalDecision.ts (NEW)
- packages/backend/convex/models/coachParentSummaries.ts
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/auto-approved-tab.tsx (NEW)
- apps/web/src/app/orgs/[orgId]/coach/voice-notes/voice-notes-dashboard.tsx

---

### 💰 Phase 3: Cost Optimization (NEXT AFTER PHASE 2)
**Stories:** US-012 to US-015 (4 stories)
**PRD Location:** `/scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json` (US-012 to US-015)

**What Will Be Built:**
- Anthropic prompt caching (90% cost savings)
- AI usage logging table (aiUsageLog)
- Cost tracking in all AI actions
- AI usage dashboard query
- Cost per message analytics

**Impact:**
- Before: $25/mo at 1000 messages
- After: $2.50/mo at 1000 messages
- Cache static prompts, player context

---

### 🧠 Phase 4: Learning Loop (FINAL P5 PHASE)
**Stories:** US-016 to US-020 (5 stories)
**PRD Location:** `/scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json` (US-016 to US-020)

**What Will Be Built:**
- Override tracking fields (why coaches suppress)
- Capture override data in mutations
- Optional feedback on suppression
- Coach override pattern analysis
- Adaptive confidence thresholds (personalized per coach)
- Weekly batch job to adjust thresholds

**Goal:**
- AI learns from each coach's behavior
- Thresholds personalize over time
- Reduce false positives

---

## 🗂️ P6 Breakdown (Monitoring & Safeguards)

### Phase 1: Cost Monitoring & Alerts (US-001 to US-006)
- Per-org cost budgets
- Cost alert logging
- Budget checks before AI calls
- Daily spend reset
- Alert scheduled function

### Phase 2: Rate Limiting & Quotas (US-007 to US-011)
- Flexible rate limiting (messages or cost, hourly or daily)
- Platform-wide and per-org limits
- Rate limit checks
- Window resets
- Default safety limits

### Phase 3: Graceful Degradation (US-012 to US-016)
- AI service health tracking
- Circuit breaker pattern
- Fallback to template summaries
- Degradation notices
- Self-healing state transitions

### Phase 4: Admin Dashboard & Controls (US-017 to US-022)
- Platform messaging admin page
- Cost analytics tab
- Rate limits tab
- Service health tab
- Settings with kill switch
- Overview with real-time metrics

---

## 📊 Current Status

### Completed
- ✅ **P1-P4:** Backend infrastructure, trust levels, sensitive content, parent experience
- ✅ **P5 Phase 1:** Preview mode + trust slider (8 stories complete)

### Ready to Execute
- 🚀 **P5 Phase 2:** Supervised auto-approval (6 stories, PRD ready)

### Planned (After Phase 2)
- 📅 **P5 Phase 3:** Cost optimization (4 stories)
- 📅 **P5 Phase 4:** Learning loop (5 stories)
- 📅 **P6 All Phases:** Monitoring & safeguards (22 stories)

---

## 🔗 Quick Links

**Active PRD (Ralph reads this):**
```bash
/scripts/ralph/prd.json
```

**Full P5 PRD (all 20 stories):**
```bash
/scripts/ralph/prds/coach-parent-summaries-phase5-REVISED.prd.json
```

**Full P6 PRD (all 22 stories):**
```bash
/scripts/ralph/prds/coach-parent-summaries-phase6-REVISED.prd.json
```

**Progress Log:**
```bash
/scripts/ralph/progress.txt
```

**Phase 1 Archive:**
```bash
/scripts/ralph/archive/progress-p1-p4-full.txt.bak
```

---

## 🚀 How to Run Next Phase

**To start P5 Phase 2:**
```bash
cd /Users/neil/Documents/GitHub/PDP
./scripts/ralph/ralph.sh 10
```

Ralph will:
1. Read prd.json (P5 Phase 2 stories)
2. Read progress.txt (Phase 1 learnings)
3. Create branch ralph/coach-parent-summaries-p5-phase2
4. Implement US-006 through US-011
5. Commit after each story
6. Update progress.txt with learnings
