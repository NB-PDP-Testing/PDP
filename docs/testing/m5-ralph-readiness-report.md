# M5 Ralph Readiness Report

**Generated:** 2026-02-17
**Phase:** M5 - Dashboard UI
**Status:** ✅ READY FOR EXECUTION

---

## ✅ All Setup Complete

### 1. PRD Configuration ✅

**File:** `scripts/ralph/prd.json`

- ✅ Updated to Phase M5
- ✅ Points to `PHASE_M5.json`
- ✅ All context files included (M1-M4 lessons learned)
- ✅ Mandatory patterns updated for frontend
- ✅ Success criteria defined (14 criteria)
- ✅ User story US-VNM-008 added
- ✅ PRD validates successfully (1 warning about many criteria - expected for frontend)

**Branch:** `ralph/voice-monitor-harness` ✅

---

### 2. Context Files ✅

**All lessons learned files present:**

| File | Status | Content |
|------|--------|---------|
| M1_LESSONS_LEARNED.md | ✅ | Backend instrumentation patterns |
| M2_LESSONS_LEARNED.md | ✅ | Metrics & aggregation patterns |
| M3_LESSONS_LEARNED.md | ✅ | Retry operations patterns |
| M4_LESSONS_LEARNED.md | ✅ | **NEWLY CREATED** - Alert patterns, counter schema |
| MAIN_CONTEXT.md | ✅ | Voice pipeline overview |
| PERFORMANCE_PATTERNS.md | ✅ | N+1 prevention, batch fetching |

---

### 3. Architectural Guidance ✅

**ADRs Generated:** 7 new ADRs for M5 (total: 20 across M1-M5)

| ADR | Decision |
|-----|----------|
| ADR-VNM-014 | Frontend Route Structure (client layout, not server) |
| ADR-VNM-015 | Real-Time Data Fetching (3 useQuery calls, skip pattern) |
| ADR-VNM-016 | Component Hierarchy (no queries in components) |
| ADR-VNM-017 | Responsive Design (375px minimum, mobile-first) |
| ADR-VNM-018 | SVG Flow Graph (two variants, inline React) |
| ADR-VNM-019 | Tab Navigation (Link + usePathname, NOT shadcn Tabs) |
| ADR-VNM-020 | Loading States (progressive skeleton per component) |

**Implementation Guide:** `scripts/ralph/agents/output/m5-implementation-guide.md`

- 12 files with complete code examples
- Exact backend query signatures
- Responsive breakpoint reference
- 10-step execution order
- Common pitfalls table
- Pre/post implementation checklists

---

### 4. Backend Dependencies ✅

**All backend APIs ready for frontend integration:**

| API | Purpose | Status |
|-----|---------|--------|
| `getRealTimeMetrics()` | Counter aggregation | ✅ M2 |
| `getRecentEvents({ filters, paginationOpts })` | Activity feed | ✅ M1 |
| `getActiveAlerts()` | Alert list | ✅ M4 |
| `getHistoricalMetrics()` | Latency baseline | ✅ M2 |

**Counter Schema:** Documented in M4_LESSONS_LEARNED.md
- Query by `counterType` (string)
- Access `currentValue` (number)
- Platform-wide: `organizationId: undefined`

---

### 5. Agent Files ✅

**All monitoring agents ready:**

| Agent | Purpose | Status |
|-------|---------|--------|
| architect.md | Pre-phase architectural review | ✅ |
| architecture-reviewer.md | Detailed architecture analysis | ✅ |
| build-error-resolver.md | Fix TypeScript/build errors | ✅ |
| code-reviewer.md | Code quality gate | ✅ |
| qa-tester.md | Story acceptance verification | ✅ |
| e2e-runner.md | Playwright test execution | ✅ |

---

### 6. Progress Tracking ✅

**File:** `scripts/ralph/progress.txt`

- ✅ Updated with complete M5 section
- ✅ All critical patterns documented
- ✅ Execution order specified (10 steps)
- ✅ Gotchas list (8 items)
- ✅ Testing checklist (14 items)
- ✅ M4 section archived

---

## 🎯 M5 Implementation Overview

### User Story: US-VNM-008

**Title:** Build Dashboard Overview UI

**Goal:** Create main monitoring dashboard at `/platform/voice-monitoring` with:
1. Pipeline flow graph (5 stages, SVG)
2. Real-time status cards (6 metrics)
3. Recent activity feed (20 events)

**Duration:** 4-5 days

**Files to Create:** 12 files
- 1 layout.tsx (client component with auth)
- 1 page.tsx (client component with useQuery)
- 3 components (PipelineFlowGraph, StatusCards, ActivityFeed)
- 6 placeholder pages (artifacts, metrics, events, pipeline, alerts, settings)
- 1 platform hub update

---

## 🚨 Critical Corrections from Architectural Review

**The following PRD assumptions were INCORRECT and have been corrected in ADRs:**

### ❌ PRD Says: "Server component with platform staff auth" for layout.tsx
**✅ ADR-VNM-014 Corrects:** Client component required (parent `/platform/layout.tsx` is client)

### ❌ PRD Says: "Use shadcn/ui Tabs component"
**✅ ADR-VNM-019 Corrects:** Use `Link` + `usePathname()` for URL routing (Tabs is for state, not URLs)

### ❌ PRD Implies: Use `usePaginatedQuery` for events
**✅ ADR-VNM-015 Corrects:** Use regular `useQuery` with `cursor: null` (custom pagination format)

**Ralph MUST follow ADR guidance, not PRD, on these points.**

---

## 📋 Pre-Implementation Checklist

Before Ralph starts US-VNM-008:

- [x] PRD updated to M5
- [x] M4_LESSONS_LEARNED.md created
- [x] All context files available
- [x] Architectural review complete (7 ADRs)
- [x] Implementation guide written (m5-implementation-guide.md)
- [x] Backend APIs verified (M1-M4 complete)
- [x] Agent files ready
- [x] Progress.txt updated
- [x] PRD validated (passes with warnings)
- [x] Branch confirmed (ralph/voice-monitor-harness)

**ALL SYSTEMS GO ✅**

---

## 🔑 Key Patterns Ralph Must Follow

### 1. Client Component Pattern
```typescript
"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function Layout() {
  const { user } = useCurrentUser();
  if (!user?.isPlatformStaff) redirect("/platform");
  // ...
}
```

### 2. Query Lifting Pattern
```typescript
// ✅ ALL queries at page level
function Page() {
  const metrics = useQuery(api.models.voicePipelineMetrics.getRealTimeMetrics, isStaff ? {} : "skip");
  return <StatusCards metrics={metrics} />;
}

// ✅ Components receive props only (NO queries)
function StatusCards({ metrics }) {
  if (!metrics) return <Skeleton />;
  // ...
}
```

### 3. Tab Navigation Pattern
```typescript
// ✅ Link + usePathname (NOT shadcn Tabs)
import Link from "next/link";
import { usePathname } from "next/navigation";

const pathname = usePathname();
<Link
  href="/platform/voice-monitoring"
  className={pathname === "/platform/voice-monitoring" ? "active" : ""}
>
  Overview
</Link>
```

### 4. Counter Schema Pattern
```typescript
// ✅ Query by counterType, access currentValue
// getRealTimeMetrics already aggregates for you
const completed = metrics?.artifactsCompleted1h ?? 0;
```

### 5. Responsive SVG Pattern
```typescript
// ✅ Two variants (horizontal + vertical)
<svg viewBox="0 0 1200 300" className="hidden md:block w-full h-auto">
  {/* Horizontal */}
</svg>
<svg viewBox="0 0 400 900" className="block md:hidden w-full h-auto">
  {/* Vertical */}
</svg>
```

---

## 📊 Testing Strategy

**Manual testing with dev-browser:**

1. Platform staff access → verify dashboard
2. Non-staff access → verify redirect
3. Create voice note → verify real-time update
4. Test responsive: 375px, 768px, 1024px
5. Test tab navigation
6. Verify loading states

**Verification Tools:**
- dev-browser (visual testing)
- Chrome DevTools responsive mode
- Real voice note creation

---

## 🚀 Execution Order

**Ralph should follow this order:**

1. Read all context files (M1-M4 lessons, PHASE_M5.json, m5-implementation-guide.md)
2. Create 6 placeholder pages first (quick wins)
3. Create layout.tsx (client component, auth, tabs)
4. Create page.tsx (client component, 3 useQuery calls)
5. Create PipelineFlowGraph (2 SVG variants)
6. Create StatusCards (6 cards, responsive grid)
7. Create ActivityFeed (event list)
8. Update platform hub (add link, remove v2-claims)
9. Test responsive design (375px, 768px, 1024px)
10. Test real-time updates

---

## ✅ Success Criteria (14 items)

- [ ] Route at /platform/voice-monitoring
- [ ] Layout with 8 tabs
- [ ] Page with 3 useQuery calls
- [ ] PipelineFlowGraph (5 stages)
- [ ] StatusCards (6 metrics)
- [ ] ActivityFeed (20 events)
- [ ] Platform hub link added
- [ ] v2-claims link removed
- [ ] Platform staff auth enforced
- [ ] Real-time updates < 10s
- [ ] Loading states show
- [ ] Responsive works (375px minimum)
- [ ] Tab navigation works
- [ ] Type check passes

---

## 🎓 M5 vs M1-M4 Differences

**Backend (M1-M4):**
- Convex mutations/queries
- Internal functions
- Database schema changes
- No UI

**Frontend (M5):**
- Next.js App Router (server + client components)
- React hooks (useQuery, usePathname)
- shadcn/ui components
- Responsive design (375px minimum)
- Real-time Convex subscriptions

**Key Shift:** Ralph transitions from backend to frontend implementation.

---

## 📞 Support Resources

**If Ralph encounters issues:**

1. **ADRs:** `docs/architecture/decisions/ADR-VNM-014-*.md` through `ADR-VNM-020-*.md`
2. **Implementation Guide:** `scripts/ralph/agents/output/m5-implementation-guide.md`
3. **Lessons Learned:** `scripts/ralph/prds/voice-monitor-harness/context/M4_LESSONS_LEARNED.md`
4. **Backend APIs:** Check M1/M2 implementation files for query signatures

---

## 🎯 Final Status

**M5 IS READY TO START ✅**

All files configured, all dependencies met, all guidance documented.

**Next Step:** Ralph should begin with US-VNM-008 execution.
