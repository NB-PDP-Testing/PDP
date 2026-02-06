# Security Fix: API Route Authentication - Issue #261

**Date:** February 6, 2026
**Commit:** `a5610d56`
**Severity:** Critical

---

## Summary

Fixed a critical security vulnerability in the injury document download API route. The route was accepting `userId` as a query parameter without server-side verification, allowing potential unauthorized access to private documents.

---

## Vulnerability Details

**File:** `apps/web/src/app/api/injury-document-url/route.ts`

**Issue:** The API route accepted `userId` from the client without authentication:

```typescript
// BEFORE (Vulnerable)
const userId = searchParams.get("userId");
const downloadUrl = await fetchQuery(
  api.models.injuryDocuments.getDownloadUrl,
  { documentId, userId }  // userId from untrusted client!
);
```

**Risk:** Any user could access private documents by:
1. Guessing document IDs
2. Passing any userId to bypass private document restrictions

---

## Fix Applied

### API Route Changes

```typescript
// AFTER (Secure)
import { getToken } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  // 1. Verify authentication server-side
  const token = await getToken();
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized - not logged in" },
      { status: 401 }
    );
  }

  // 2. Get authenticated user from Convex
  const currentUser = await fetchQuery(
    api.models.users.getCurrentUser,
    {},
    { token }
  );

  if (!currentUser?._id) {
    return NextResponse.json(
      { error: "Unauthorized - invalid session" },
      { status: 401 }
    );
  }

  // 3. Use server-verified user ID
  const downloadUrl = await fetchQuery(
    api.models.injuryDocuments.getDownloadUrl,
    {
      documentId: documentId as Id<"injuryDocuments">,
      userId: currentUser._id,  // Server-verified, not client-provided
    },
    { token }
  );
}
```

### Frontend Changes

Updated `document-list.tsx` to remove client-provided `userId`:

```typescript
// BEFORE
const response = await fetch(
  `/api/injury-document-url?documentId=${doc._id}&userId=${userId}`
);

// AFTER
const response = await fetch(
  `/api/injury-document-url?documentId=${doc._id}`
);
```

---

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/app/api/injury-document-url/route.ts` | Added server-side auth, use verified user ID |
| `apps/web/src/components/injuries/document-list.tsx` | Removed userId from API call, improved error handling |

---

## Testing

- [x] Unauthenticated requests return 401
- [x] Authenticated users can download their own documents
- [x] Private document access control still enforced
- [x] Pre-commit linting passed

---

## Related Documentation

- Full QA Analysis: `docs/archive/bug-fixes/QA_ANALYSIS_PHASE2_261.md`
- Phase 2 Implementation: `docs/archive/bug-fixes/PHASE2_COMPLETE_261_RECOVERY_MANAGEMENT.md`
