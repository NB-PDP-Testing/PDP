# QA Analysis Report: Phase 2 Injury Recovery Management

**Issue:** #261
**Date:** February 3, 2026
**Analyst:** Claude Code QA
**Status:** Analysis Complete

---

## Executive Summary

The Phase 2 implementation is **functionally complete** with good code organization and proper error handling. However, there are **12 issues identified** across security, performance, and robustness categories that should be addressed.

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 1 | Security |
| High | 3 | Security, Data Integrity |
| Medium | 5 | Performance, UX, Edge Cases |
| Low | 3 | Code Quality, Accessibility |

---

## Critical Issues

### 1. API Route Missing Authentication (CRITICAL)

**File:** `apps/web/src/app/api/injury-document-url/route.ts`
**Lines:** 14-58

**Issue:** The API route accepts `userId` as a query parameter without server-side authentication verification. A malicious user could pass any userId to access documents they shouldn't see.

```typescript
// Current - userId comes from untrusted client
const userId = searchParams.get("userId");
```

**Risk:** Any user could access private documents by guessing document IDs and user IDs.

**Recommendation:** Verify the authenticated user matches the requested userId using session/auth middleware.

```typescript
// Should verify server-side authentication
import { auth } from "@/lib/auth"; // or your auth library

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Use session.user.id instead of query param
}
```

---

## High Severity Issues

### 2. Private Document Access Control Bypass (HIGH)

**File:** `packages/backend/convex/models/injuryDocuments.ts`
**Lines:** 186-198 (getDownloadUrl)

**Issue:** Access control relies on `userId` passed from client. The server should verify the caller's identity rather than trusting client-provided data.

**Current Code:**
```typescript
// Check access for private documents
if (document.isPrivate && document.uploadedBy !== args.userId) {
  return null;
}
```

**Risk:** Client can pass any userId to bypass private document restrictions.

**Recommendation:** Use Convex's built-in authentication context to verify the actual caller.

---

### 3. No File Type Validation on Server (HIGH)

**File:** `packages/backend/convex/models/injuryDocuments.ts`
**Lines:** 42-98 (saveDocument)

**Issue:** File type validation only happens on the client. Server accepts any file type.

**Client validates:**
```typescript
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", ...];
```

**Server does not validate `fileType` against allowed types.**

**Risk:** Malicious files could be uploaded by bypassing client validation.

**Recommendation:** Add server-side validation:
```typescript
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", ...];
if (!ALLOWED_TYPES.includes(args.fileType)) {
  throw new Error("Invalid file type");
}
```

---

### 4. No File Size Validation on Server (HIGH)

**File:** `packages/backend/convex/models/injuryDocuments.ts`
**Lines:** 42-98

**Issue:** File size limit (10MB) only enforced on client. Server accepts any size.

**Risk:** Large files could be uploaded, causing storage costs and performance issues.

**Recommendation:** Add server-side size check:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (args.fileSize > MAX_FILE_SIZE) {
  throw new Error("File too large");
}
```

---

## Medium Severity Issues

### 5. Missing Loading State During Delete (MEDIUM)

**File:** `apps/web/src/components/injuries/document-list.tsx`
**Lines:** 126-139

**Issue:** Delete button doesn't show loading state while deletion is in progress.

**Current:** User can spam-click delete button.

**Recommendation:** Add `isDeleting` state and disable button during operation.

---

### 6. No Optimistic Updates (MEDIUM)

**File:** `apps/web/src/components/injuries/milestone-tracker.tsx`

**Issue:** Milestone completion waits for server response before UI updates. This causes perceived lag.

**Recommendation:** Consider optimistic updates for better UX:
```typescript
// Optimistically mark as complete
setOptimisticCompleted(milestoneId);
try {
  await onComplete(milestoneId, notes);
} catch {
  // Revert on error
  setOptimisticCompleted(null);
}
```

---

### 7. Form State Not Reset on Dialog Close (MEDIUM)

**File:** `apps/web/src/components/injuries/recovery-plan-form.tsx`
**Lines:** 68-86

**Issue:** When dialog is closed without saving, form state persists. Reopening shows stale data.

**Recommendation:** Reset form state when dialog opens or closes:
```typescript
useEffect(() => {
  if (open) {
    // Reset to existing plan values
    setEstimatedDays(existingPlan?.estimatedRecoveryDays?.toString() || "");
    // ... reset other fields
  }
}, [open, existingPlan]);
```

---

### 8. Missing Confirmation for Milestone Removal (MEDIUM)

**File:** `apps/web/src/components/injuries/milestone-tracker.tsx`
**Lines:** 188-198

**Issue:** Clicking remove button immediately deletes milestone without confirmation.

**Recommendation:** Add confirmation dialog like the one used for document deletion.

---

### 9. Timeline Performance with Many Updates (MEDIUM)

**File:** `apps/web/src/components/injuries/recovery-timeline.tsx`
**Lines:** 122

**Issue:** Sorts all updates on every render:
```typescript
const sortedUpdates = [...updates].sort((a, b) => b.createdAt - a.createdAt);
```

**Recommendation:** Memoize the sorted array:
```typescript
const sortedUpdates = useMemo(
  () => [...updates].sort((a, b) => b.createdAt - a.createdAt),
  [updates]
);
```

---

## Low Severity Issues

### 10. Duplicate Type Definitions (LOW)

**Files:** Multiple frontend components

**Issue:** `Severity` and `InjuryStatus` types are defined in multiple files:
- `injury-detail-modal.tsx` (lines 31-32)
- Coach injuries page
- Parents injuries page

**Recommendation:** Extract to shared types file:
```typescript
// apps/web/src/types/injuries.ts
export type Severity = "minor" | "moderate" | "severe" | "long_term";
export type InjuryStatus = "active" | "recovering" | "cleared" | "healed";
```

---

### 11. Missing ARIA Labels (LOW)

**File:** `apps/web/src/components/injuries/milestone-tracker.tsx`

**Issue:** Checkbox and buttons lack descriptive ARIA labels for screen readers.

**Current:**
```tsx
<Checkbox checked={false} ... />
```

**Recommendation:**
```tsx
<Checkbox
  aria-label={`Mark "${milestone.description}" as complete`}
  ...
/>
```

---

### 12. Console.error in Production (LOW)

**Files:** All frontend components

**Issue:** `console.error` calls will pollute production console logs.

**Recommendation:** Use a proper logging service or conditionally log:
```typescript
if (process.env.NODE_ENV === "development") {
  console.error("Error:", error);
}
```

---

## Edge Cases Not Handled

| Scenario | Current Behavior | Recommended |
|----------|------------------|-------------|
| Upload while offline | Fails silently | Show offline warning |
| File upload interrupted | Orphaned storage file | Cleanup job or retry mechanism |
| Concurrent milestone completion | Race condition possible | Optimistic locking |
| Very long file names | Truncated in UI | Tooltip with full name |
| Special characters in notes | Works but not sanitized | XSS protection (React handles) |
| Empty milestones array vs undefined | Handled differently | Normalize to empty array |

---

## Missing Test Coverage

### Unit Tests Needed

| Component | Test Cases |
|-----------|------------|
| `document-list.tsx` | Render with 0/1/many docs, delete flow, download flow |
| `document-upload.tsx` | File validation, upload success/failure, form reset |
| `milestone-tracker.tsx` | Progress calculation, completion flow, add/remove |
| `recovery-plan-form.tsx` | Save with valid/invalid data, milestone management |
| `recovery-timeline.tsx` | Empty state, time formatting, update types |

### Integration Tests Needed

| Flow | Description |
|------|-------------|
| Coach creates recovery plan | End-to-end from modal open to save |
| Parent completes milestone | Notification to coach, timeline update |
| Document upload and download | Full upload → view → delete cycle |
| Access control | Verify private doc restrictions |

### Backend Tests Needed

| Function | Test Cases |
|----------|------------|
| `saveDocument` | Valid upload, invalid injury ID, max size |
| `getDownloadUrl` | Private doc access, non-existent doc |
| `deleteDocument` | Owner vs non-owner, cascading cleanup |
| `setRecoveryPlan` | Create new, update existing, invalid data |

---

## Code Quality Observations

### Positives

1. **Consistent error handling** - Try/catch with toast notifications
2. **Good TypeScript usage** - Proper interfaces and type safety
3. **Real-time updates** - Using Convex subscriptions correctly
4. **Component composition** - Well-structured reusable components
5. **Proper loading states** - Skeleton/spinner during data fetch
6. **Good UX patterns** - Confirmation dialogs, disabled states

### Areas for Improvement

1. **State management** - Consider React Query or similar for server state
2. **Form handling** - Could benefit from react-hook-form for complex forms
3. **Error boundaries** - No error boundaries around components
4. **Retry logic** - No automatic retry on failed operations

---

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Authentication on API routes | ❌ | Missing server-side auth verification |
| Input validation (client) | ✅ | File type/size checked |
| Input validation (server) | ❌ | File type/size not validated |
| XSS protection | ✅ | React escapes by default |
| CSRF protection | ✅ | Convex handles via tokens |
| SQL injection | N/A | NoSQL with typed queries |
| File upload security | ⚠️ | Client-only validation |
| Access control | ⚠️ | Relies on client-provided userId |

---

## Recommendations Priority

### Immediate (Before Production)

1. Add server-side authentication to API route
2. Add server-side file type/size validation
3. Fix access control to use server-verified identity

### Short Term (Next Sprint)

4. Add delete confirmation for milestones
5. Add loading states for all mutations
6. Memoize timeline sorting
7. Reset form state on dialog close

### Long Term (Technical Debt)

8. Extract shared types to central location
9. Add comprehensive test coverage
10. Add ARIA labels for accessibility
11. Implement proper logging service

---

## Conclusion

The Phase 2 implementation provides solid functionality with good code organization. The **critical security issue with the API route** should be addressed before production deployment. The access control pattern using client-provided userId is a recurring concern that should be refactored to use server-verified authentication.

Overall code quality is good, with proper TypeScript usage and consistent patterns. Adding the recommended tests would significantly improve confidence in the implementation.

---

**Next Steps:**
1. Address critical/high severity issues
2. Create test plan based on missing coverage
3. Schedule technical debt items for future sprints
