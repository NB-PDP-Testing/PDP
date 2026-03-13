# Voice Notes Market-Readiness Checklist

**Created:** 2026-03-13
**Assessment Date:** 2026-03-13
**Source:** [Comprehensive Audit](../../audit/voice-insights-comprehensive-audit.md), [Known Issues](known-issues-gaps.md)

---

## Overall Assessment: CONDITIONAL GO

**Criteria:** >80% workflows Ready = Go, any Critical bug = No-Go
**Result:** 5/8 workflows Ready (62.5%), 1 Critical bug (#624)

**Recommendation:** Fix #624 (parent queue) before launch. All other workflows function correctly for core use cases.

---

## Workflow Readiness Scores

| # | Workflow | Status | Blocking Issues | Workaround |
|---|----------|--------|-----------------|------------|
| 1 | In-App Voice Recording | **Ready** | None | - |
| 2 | In-App Typed Notes | **Ready** | None | - |
| 3 | WhatsApp Audio Notes | **Ready** | None | - |
| 4 | WhatsApp Text Notes | **Ready** | None | - |
| 5 | Parent Summaries | **Blocked** | #624 (parent queue broken) | None -- core workflow non-functional |
| 6 | Trust Gates & Auto-Apply | **Ready** | None (verified in US-VR-009) | - |
| 7 | Review Microsite | **Partial** | #618 (apply without assignment), #592 (iOS lock) | Desktop-only for now |
| 8 | My Impact Dashboard | **Ready** | Minor data gap (11 categories don't write downstream) | Documented as known limitation |

---

## Critical Blockers (Must Fix Before Launch)

### #624 — Parent Queue Broken (CRITICAL)

- **Impact:** Voice insights not reaching parent approval queue. Core parent communication completely non-functional.
- **Fix complexity:** Medium
- **Affected code:** `actions/coachParentSummaries.ts` (processVoiceNoteInsight), `actions/whatsapp.ts` (checkAndAutoApply)
- **Recommendation:** Fix before any launch. This is the primary value proposition for parent communication.

---

## High-Priority Issues (Fix Before Wide Launch)

### #592 — iOS Microsite Screen Lock

- **Impact:** Mobile approval workflow broken on iPhones
- **Fix complexity:** Low (CSS fix)
- **Workaround:** Use desktop browser for review microsite
- **Recommendation:** Fix before promoting WhatsApp integration to coaches

### #634 — Duplicate Insight Detection

- **Impact:** Same insight recorded repeatedly, inflating data
- **Fix complexity:** Medium
- **Workaround:** Coaches manually dismiss duplicates
- **Recommendation:** Acceptable for soft launch, fix before scale

---

## Medium-Priority Issues (Can Launch With)

### #618 — Apply Without Player Assignment (Microsite)

- **Impact:** Zombie data from microsite apply without player
- **Fix complexity:** Low (add guard check)
- **Workaround:** Coaches should assign player before applying
- **Note:** Dashboard-side fix implemented in US-VR-008

### #616 — Ghost Players

- **Impact:** Phantom insights for non-existent players
- **Fix complexity:** Medium
- **Workaround:** Partial fix shipped (#612: amber badge + roster injection)

### #614 — Coach Entity Matching

- **Impact:** Can't delegate tasks to coaches via voice
- **Fix complexity:** Medium
- **Workaround:** Manually assign coaches in UI

---

## Known Limitations (Document, Don't Fix)

### Type-Specific Application Gap

- **Issue:** 11 of 16 insight categories mark "applied" without writing to domain tables
- **Affected categories:** wellbeing, behavior, attendance, fitness, nutrition, sleep, recovery, attitude, coach_note, general_observation, parent_communication
- **Working categories:** injury, skill_rating, skill_progress, team_culture, todo
- **Impact:** "Applied" is acknowledgment, not execution for most categories
- **Workaround:** Coaches must manually update player profiles for non-working categories
- **Recommendation:** Document as V1 limitation. Plan domain table writes for V2.

### InsightsTab Size (2000+ lines)

- **Issue:** Maintenance risk, not a user-facing bug
- **Recommendation:** Plan decomposition for next sprint

### v1/v2 Dual Pipeline

- **Issue:** Both pipelines run in parallel, doubling surface area for bugs
- **Recommendation:** Plan v1 deprecation path after v2 stability confirmed

---

## Launch Readiness by Use Case

### Use Case 1: Coach records voice notes, reviews insights
**Status: READY**
- In-app recording and typed notes work correctly
- Insight extraction with categories and player matching functional
- Apply, dismiss, edit, assign all working
- Button context-awareness fixed (US-VR-008)

### Use Case 2: Coach sends voice notes via WhatsApp
**Status: READY (desktop)**
- WhatsApp audio and text processing works
- Review microsite functional on desktop
- iOS users should use in-app dashboard instead (#592)

### Use Case 3: Coach approves parent summaries
**Status: BLOCKED (#624)**
- Parent queue broken -- summaries not reaching approval
- Trust gates and visibility logic verified correct
- Once #624 fixed, this workflow is ready

### Use Case 4: Coach views impact metrics
**Status: READY**
- My Impact dashboard correctly aggregates data
- Auto-applied insights included in counts (contrary to audit finding)
- Date range filtering works
- Known limitation: 11 categories don't reflect actual domain changes

### Use Case 5: Admin manages coach access
**Status: READY**
- Trust gate cascade verified (7 priority levels)
- Admin can block, override, grant individual access
- Coach can self-disable and request access

---

## Minimum Fixes Required for Launch

| Priority | Issue | Effort | Status |
|----------|-------|--------|--------|
| P0 | #624 Parent queue broken | Medium | Must fix |
| P1 | #592 iOS microsite lock | Low | Should fix |
| P1 | #618 Apply without assignment (microsite) | Low | Should fix |
| P2 | #634 Duplicate detection | Medium | Can defer |
| P2 | #616 Ghost players | Medium | Partial fix shipped |
| P3 | #614 Coach matching | Medium | Can defer |

**Minimum viable launch:** Fix #624 only (P0).
**Recommended launch:** Fix #624 + #592 + #618 (P0 + P1).

---

## Documentation Deliverables (This Phase)

| Document | Status | Location |
|----------|--------|----------|
| Pipeline Architecture | Complete | `docs/features/voice-notes/pipeline-architecture.md` |
| UX Button Action Map | Complete | `docs/features/voice-notes/ux-button-action-map.md` |
| Data Flow & Tables | Complete | `docs/features/voice-notes/data-flow-tables.md` |
| Known Issues & Gaps | Complete | `docs/features/voice-notes/known-issues-gaps.md` |
| UAT Test Plan | Complete | `docs/features/voice-notes/uat-test-plan.md` |
| Market Readiness | Complete | `docs/features/voice-notes/market-readiness-checklist.md` |
