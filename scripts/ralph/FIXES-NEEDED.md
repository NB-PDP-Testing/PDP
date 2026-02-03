# Ralph - Issues Requiring Fixes

**Generated:** 2026-02-01 13:15
**Source:** Agent feedback analysis from feedback.md

---

## 🔴 BLOCKING ISSUES (Fix Immediately)

### 1. Better Auth Adapter Violation ⚠️ CRITICAL
**File:** `packages/backend/convex/models/sessionPlans.ts`
**Problem:** Direct database access to Better Auth tables violates architecture
**Fix:**
```typescript
// ❌ BAD: Direct DB access
const user = await ctx.db.get(userId);

// ✅ GOOD: Use Better Auth adapter
const user = await ctx.runQuery(
  components.betterAuth.adapter.findOne,
  { model: "user", where: { field: "_id", value: userId } }
);
```
**Impact:** Security/architecture violation, potential data integrity issues
**Status:** ✅ Detected by Auto Quality Check hook, flagged in progress.txt

---

### 2. Performance Anti-Pattern: .filter() Usage
**File:** `packages/backend/convex/models/sessionPlans.ts`
**Problem:** Using `.filter()` instead of `.withIndex()` violates CLAUDE.md mandatory patterns
**Fix:**
```typescript
// ❌ BAD: Scans entire table
const results = await ctx.db
  .query("tableName")
  .filter(q => q.eq(q.field("status"), "active"))
  .collect();

// ✅ GOOD: Uses index
const results = await ctx.db
  .query("tableName")
  .withIndex("by_status", q => q.eq("status", "active"))
  .collect();
```
**Impact:** Performance degradation, violates performance optimization rules
**Reference:** CLAUDE.md lines 177-200 (Performance & Query Optimization)

---

### 3. TypeScript Type Errors (10-11 errors)
**Files:**
- `apps/web/src/components/notification-center.tsx` (3 errors)
- `packages/backend/convex/models/sessionPlans.ts` (2 errors)
- `packages/backend/convex/models/teamCollaboration.ts` (6 errors)

**Errors:**
- notification-center.tsx: Implicit 'any' types
- sessionPlans.ts: Undefined string handling
- teamCollaboration.ts: ActionType incompatibility

**Fix:** Resolve all type errors
**Test:** `npm run check-types` should pass
**Impact:** Type safety compromised, build may fail in production

---

## 📋 INCOMPLETE FEATURES (Stories Marked PARTIAL)

### 4. US-P9-025b: Real-Time Collaboration Missing Components
**Status:** PARTIAL (marked as complete but incomplete)
**Missing:**
1. Conflict detection logic
2. "Another coach is editing this plan" toast notification
3. Visual verification/UAT testing

**What works:**
- ✅ Presence indicators (who's viewing)
- ✅ Auto-save with debounce
- ✅ Unsaved changes warning

**What's missing:**
- ❌ Conflict detection/resolution
- ❌ Last-write-wins notification
- ❌ UAT validation

**Fix:** Either:
- Option A: Implement missing conflict detection
- Option B: Mark story as PARTIAL in prd.json with notes

---

### 5. US-P9-045: SwipeableInsightCard NOT Integrated
**Status:** PARTIAL (component built but disconnected)
**Problem:** Component exists but has zero usage in codebase

**Component location:**
- `apps/web/src/components/voice-notes/swipeable-insight-card.tsx`

**Should be used in:**
- `insights-tab.tsx` (line ~794)
- `review-tab.tsx` (lines ~268-343)
- `team-insights-tab.tsx` (lines ~316-414)

**Fix:**
```typescript
// Import
import { SwipeableInsightCard } from "./swipeable-insight-card";

// Wrap each insight card
<SwipeableInsightCard
  onApply={() => handleApplyInsight(insight.id)}
  onDismiss={() => handleDismissInsight(insight.id)}
>
  {/* existing card content */}
</SwipeableInsightCard>
```

**Impact:** Feature 100% complete but users can't access it (shelf-ware)

---

## ⚠️ CODE QUALITY (Lower Priority)

### 6. Biome Lint Errors
**Status:** Recurring warnings
**Fix:** `npx biome check --write --unsafe`
**Priority:** Low (doesn't block functionality)

---

### 7. Debug Logging (console.log)
**Files:**
- apps/web/src/contexts/session-plan-context.tsx
- apps/web/src/app/demo/ux-mockups/page.tsx
- apps/web/src/app/orgs/join/page.tsx
- apps/web/src/app/orgs/accept-invitation/[invitationId]/page.tsx
- apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx

**Fix:** Remove console.log statements before production
**Priority:** Low (can be cleaned up in polish phase)

---

### 8. XSS Risks (dangerouslySetInnerHTML)
**Files:**
- apps/web/src/components/ui/confetti.tsx (shadcn component)
- apps/web/src/components/ui/chart.tsx (shadcn component)
- apps/web/src/components/onboarding/gdpr-policy-viewer.tsx (static content)

**Assessment:** Low risk (shadcn trusted components, static GDPR content)
**Fix:** Only needed if dynamic user content added
**Action:** Add DOMPurify sanitization if needed in future
**Priority:** Low (acceptable for current usage)

---

### 9. Missing Authorization Checks
**Status:** ~60 mutations flagged without getUserOrgRole() checks
**Assessment:** Many false positives (platform staff functions, internal utilities)
**Action:** Manual audit required - many legitimately don't need auth
**Priority:** Low (requires case-by-case review)

---

## 📊 Summary

| Priority | Count | Category |
|----------|-------|----------|
| 🔴 CRITICAL | 3 | Blocking issues (auth, performance, types) |
| 📋 HIGH | 2 | Incomplete features (integration gaps) |
| ⚠️ LOW | 4 | Code quality (lint, logging, security review) |

**Recommended Action:**
1. Fix #1-3 (CRITICAL) immediately
2. Decide on #4-5 (incomplete features):
   - Either complete them
   - Or mark stories as PARTIAL with notes
3. Address #6-9 (code quality) in polish/pre-production phase

**Total Blocking Issues:** 3
**Total Feature Gaps:** 2
**Total Code Quality Items:** 4
