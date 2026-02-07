# Security Audit: Injury Tracking Feature (Branch: feature/261-injury-tracking-phase3-analytics)

**Audit Date:** 2026-02-07
**Branch:** `feature/261-injury-tracking-phase3-analytics`
**Reviewer:** Security Audit (deep review)
**Scope:** All backend and frontend changes vs `main` -- 14 files covering injury CRUD, analytics, medical document upload/download, notifications, and admin/coach/parent UI.
**Data Classification:** This feature handles **Protected Health Information (PHI)** -- injury details, medical provider names, treatment plans, medical clearance records, and uploaded medical documents (X-rays, doctor's notes, therapy reports).

---

## Severity Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 1 | Cross-organization data access (authorization bypass) |
| **HIGH** | 5 | Missing role authorization, client-trusted identity fields, admin query without admin check |
| **MEDIUM** | 5 | PII in logs, file upload validation gaps, unused userId parameter, missing audit trail for deletes |
| **LOW** | 4 | No rate limiting, missing CSRF consideration, information disclosure patterns, file name sanitization |

**Total findings: 15**

---

## CRITICAL Findings

### SEC-CRIT-001: Cross-Organization Data Access -- No Org Membership Verification on Any Query

**Files:**
- `packages/backend/convex/models/playerInjuries.ts` (lines 265-315, 321-392, 398-482, 764-816, 887-1018, 1040-1158, 1164-1341)
- `packages/backend/convex/models/injuryDocuments.ts` (all queries)

**Description:** Every single Convex query and mutation that accepts an `organizationId` parameter performs ONLY authentication checks (`authComponent.safeGetAuthUser(ctx)`). None verify that the authenticated user is actually a **member** of the specified organization. This applies to ALL 7 analytics/listing queries and ALL mutations in `playerInjuries.ts`.

An authenticated user from Organization A can call any of these functions with Organization B's ID and receive:
- Full injury analytics (body parts, severity distribution, recovery data)
- Player names, team names, age groups
- Individual injury records including medical provider names, treatment details, expected return dates
- Medical clearance status
- Document metadata

**Affected functions (all accept client-provided `organizationId` with no membership check):**
- `getActiveInjuriesForOrg`
- `getAllActiveInjuriesForOrg`
- `getAllInjuriesForOrg`
- `getOrgInjuryAnalytics`
- `getInjuriesByTeam`
- `getInjuryTrends`
- `getRecentInjuriesForAdmin`

**Exploitation:** Any authenticated user can enumerate organization IDs (they are exposed in URLs as `/orgs/[orgId]`) and query medical data for organizations they do not belong to. This is achievable by calling the Convex API directly, bypassing the frontend entirely.

**Current mitigation:** The admin layout (`apps/web/src/app/orgs/[orgId]/admin/layout.tsx`) performs a client-side role check. This is **not a security control** -- it is a UX convenience. The underlying API is completely unprotected.

**Fix recommendation:** Create a reusable `requireOrgMembership(ctx, organizationId)` or `requireOrgRole(ctx, organizationId, ["admin", "owner"])` helper that:
1. Looks up the user's membership in the target organization via the Better Auth adapter
2. Throws an authorization error if the user is not a member
3. Is called at the top of every query/mutation that accepts `organizationId`

**CVSS approximation:** 8.5 (High confidentiality impact on protected health data, network-exploitable, low attack complexity)

---

## HIGH Findings

### SEC-HIGH-001: `getInjuryById` Returns Any Injury to Any Authenticated User

**File:** `packages/backend/convex/models/playerInjuries.ts`, lines 122-132

**Description:** The `getInjuryById` query accepts an `injuryId` and returns the full injury record (including medical notes, treatment, provider info) to any authenticated user. There is no check that:
- The user is a member of the organization where the injury occurred
- The user has a relationship to the player (coach, parent, admin)
- The injury's visibility settings (`isVisibleToAllOrgs`, `restrictedToOrgIds`) are respected

**Exploitation:** An authenticated user who obtains or guesses a Convex document ID can read any injury record in the entire system.

**Fix recommendation:** Add organization membership verification. Determine the injury's org context from `occurredAtOrgId` or from the player's enrollment, then verify the requesting user is a member of that org with an appropriate role.

### SEC-HIGH-002: `getDocumentsAdmin` Has No Admin Role Verification

**File:** `packages/backend/convex/models/injuryDocuments.ts`, lines 166-199

**Description:** The `getDocumentsAdmin` query is named and documented as an "admin view" that "includes private" documents. However, it only checks authentication -- it does NOT verify the user is an admin. Any authenticated user can call this query with any `injuryId` and receive ALL documents, including private ones marked by guardians.

**Impact:** Private medical documents (uploaded by parents, marked as private) are exposed to any authenticated user who knows or guesses the injury ID.

**Fix recommendation:** Add role verification. Either:
1. Accept `organizationId` and verify the user has admin/owner role in that org
2. Look up the injury's org context and verify the user's role there

### SEC-HIGH-003: Client-Provided `updatedBy`, `reportedBy`, `uploadedBy` Identity Fields

**Files:**
- `packages/backend/convex/models/playerInjuries.ts`: `reportInjury` (line 1368), `setRecoveryPlan` (line 1849), `addMilestone` (line 1909), `updateMilestone` (line 1969), `addProgressUpdate` (line 2103), `recordMedicalClearance` (line 2191), `updateInjuryStatus` (line 1445)
- `packages/backend/convex/models/injuryDocuments.ts`: `saveDocument` (line 59), `deleteDocument` (line 236)

**Description:** Multiple mutations accept identity fields (`updatedBy`, `updatedByName`, `updatedByRole`, `reportedBy`, `reportedByRole`, `uploadedBy`, `uploadedByName`, `uploadedByRole`) as client-provided arguments rather than deriving them from the authenticated session. While the auth check via `authComponent.safeGetAuthUser(ctx)` ensures the caller is logged in, the actual user ID recorded in the database and used for:
- Audit trail ("who reported this injury")
- Notification routing ("don't notify the reporter")
- Document access control ("only uploader can delete")

...comes from the client, not the server.

**Exploitation:** A user could:
1. Report an injury as `reportedByRole: "admin"` when they are actually a `"guardian"`, altering notification routing
2. Upload a document with `uploadedBy: "<someone-else's-id>"` to frame another user
3. Set `updatedBy` to another user's ID to forge the audit trail
4. Call `deleteDocument` with `userId: "<document-owner's-id>"` to bypass the "only uploader can delete" check

**Note on `deleteDocument`:** The handler at line 251 checks `document.uploadedBy !== user._id`, which correctly uses the server-derived user ID. This is good. However, the `userId` parameter is still accepted and was previously used. The `getDocuments` and `getDownloadUrl` functions also accept `userId` but then use `user._id` from the session (lines 153, 222). The unused `userId` parameter is misleading and should be removed to prevent future confusion.

**Fix recommendation:**
1. Derive `updatedBy`/`reportedBy`/`uploadedBy` from `user._id` (the authenticated session) inside the handler, not from args
2. Look up the user's role in the organization via membership query rather than trusting client-provided role
3. Remove unused `userId` parameters from `getDocuments`, `getDownloadUrl`, and `deleteDocument`

### SEC-HIGH-004: `getInjuriesForPlayer` and `getInjuryHistoryByBodyPart` -- No Player-Relationship Verification

**File:** `packages/backend/convex/models/playerInjuries.ts`, lines 137-178, 487-514

**Description:** These queries accept a `playerIdentityId` and return all injuries for that player to any authenticated user. There is no verification that the caller:
- Is a parent/guardian of the player
- Is a coach assigned to the player's team
- Is an admin in the player's organization

**Impact:** Any authenticated user can enumerate player identity IDs and view complete injury histories for any player in the system.

**Fix recommendation:** Require an `organizationId` parameter and verify the caller is a member of that org. Then filter results through `isInjuryVisibleToOrg`.

### SEC-HIGH-005: `getInjuriesForMultiplePlayers` -- No Guardian-Player Relationship Verification

**File:** `packages/backend/convex/models/playerInjuries.ts`, lines 184-260

**Description:** This query accepts an array of `playerIdentityIds` and returns injury data for all of them. The frontend (parent injuries page) correctly passes only the parent's own children's IDs, but the backend does not verify the caller actually has a guardian relationship to any of these players.

**Impact:** Any authenticated user can pass arbitrary player IDs and receive their injury data (including injury type, body part, severity, description, treatment, days out).

**Fix recommendation:** Accept an `organizationId`, verify org membership, and verify the caller has a guardian relationship to the specified players (or is a coach/admin in the org).

---

## MEDIUM Findings

### SEC-MED-001: PII and Sensitive Data in Backend Console Logs

**File:** `packages/backend/convex/lib/injuryNotifications.ts`, lines 168-176, 186, 194, 201-204, 216-221, 250-252, 334-336, 369-373, 418-419, 448-452, 487-488

**Description:** The notification helpers log extensive PII and sensitive data to the Convex server console:
- Player names (line 175: `playerName`)
- User IDs of coaches, guardians, and admins (lines 186, 194, 201-204)
- Injury IDs (line 169)
- Full recipient lists with user IDs (lines 216-221)
- Body part and injury details (line 449)
- Milestone descriptions (line 372)

In a Convex deployment, these logs are accessible to anyone with access to the Convex dashboard. For a platform handling medical/health data, logging PII creates a data exposure surface that may violate GDPR, HIPAA-adjacent requirements, or organizational data handling policies.

**Fix recommendation:**
1. Remove all `console.log` calls that include PII (player names, user IDs)
2. Replace with structured logging that includes only non-PII identifiers (e.g., counts, anonymized IDs)
3. Keep `console.error` for failure cases but sanitize the error output

### SEC-MED-002: File Upload -- No Server-Side MIME Type Validation

**File:** `packages/backend/convex/models/injuryDocuments.ts`, lines 49-111

**Description:** The `saveDocument` mutation accepts `fileType` (MIME type) as a client-provided string with no server-side validation. While the frontend (`document-upload.tsx`, lines 53-61) validates file type against an allowlist (`ALLOWED_TYPES`), the backend accepts any value.

A malicious client could:
1. Upload an executable file with a spoofed MIME type
2. Upload an HTML file that could be served with content-type from the `fileType` field, potentially enabling stored XSS if the download URL serves content inline

The `generateUploadUrl` action (line 34-44) generates an unsigned upload URL that accepts any file content.

**Fix recommendation:**
1. Validate `fileType` against an allowlist in the `saveDocument` mutation
2. Validate `fileSize` against a maximum (e.g., 10MB) on the server side
3. Consider setting `Content-Disposition: attachment` headers when serving document URLs to prevent inline rendering

### SEC-MED-003: Document Download URL Proxy Lacks Rate Limiting

**File:** `apps/web/src/app/api/injury-document-url/route.ts`

**Description:** The API route fetches a document download URL from Convex. While it correctly derives the user ID from the session (not from client input), it has no rate limiting. An attacker could:
1. Enumerate document IDs by cycling through values
2. Harvest download URLs (which are Convex storage URLs and may be time-limited but still usable)

**Fix recommendation:** Add rate limiting (e.g., 10 requests per minute per user) using a Next.js middleware or API route rate limiter.

### SEC-MED-004: Unused `userId` Parameter Creates Confusion and Potential Future Vulnerability

**Files:**
- `packages/backend/convex/models/injuryDocuments.ts`: `getDocuments` (line 121), `getDownloadUrl` (line 207), `deleteDocument` (line 236), `updateDocumentPrivacy` (line 277)

**Description:** Multiple functions accept a `userId` parameter from the client but then correctly use `user._id` from the authenticated session for access control. However, the parameter is still present in the API surface. This creates:
1. Confusion for developers who may use the wrong variable in future changes
2. A vestigial parameter that could be accidentally used instead of the session-derived ID

**Fix recommendation:** Remove the `userId` parameter from all functions that derive the effective user ID from the session. This is a defense-in-depth measure.

### SEC-MED-005: No Audit Trail for Hard Deletes

**Files:**
- `packages/backend/convex/models/playerInjuries.ts`: `deleteInjury` (lines 1784-1801)
- `packages/backend/convex/models/injuryDocuments.ts`: `deleteDocument` (lines 233-268)

**Description:** Both `deleteInjury` and `deleteDocument` perform hard deletes with no audit logging. For medical data:
- `deleteInjury` permanently removes the injury record and all its data. There is no soft-delete mechanism, no record of who deleted it or when, and no way to recover the data.
- `deleteDocument` deletes the storage file and metadata. While it does delete the storage blob, the progress update that was created when the document was uploaded will reference a non-existent document ID.

**Impact:** A malicious or accidental hard delete of medical records is unrecoverable and unauditable.

**Fix recommendation:**
1. Implement soft-delete for injuries (add `deletedAt`, `deletedBy` fields)
2. Log deletion events in `injuryProgressUpdates`
3. Restrict `deleteInjury` to admin role only

---

## LOW Findings

### SEC-LOW-001: No Rate Limiting on Mutation Endpoints

**Files:**
- `packages/backend/convex/models/playerInjuries.ts` (all mutations)
- `packages/backend/convex/models/injuryDocuments.ts` (all mutations)

**Description:** There is no rate limiting on any mutation. An attacker could:
- Flood the system with injury reports (`reportInjury`)
- Spam progress updates
- Upload many large files rapidly
- Trigger excessive notification creation

**Fix recommendation:** Implement Convex-level rate limiting or add client-side debouncing as a first defense layer. Consider per-user rate limits for mutations.

### SEC-LOW-002: File Name Not Sanitized

**File:** `packages/backend/convex/models/injuryDocuments.ts`, line 80

**Description:** The `fileName` is stored as-is from the client with no sanitization. While Convex storage handles the actual file separately (the name is metadata only), a malicious file name could contain:
- Path traversal characters (`../../etc/passwd`)
- Very long strings (DoS on display)
- HTML/script content that could be rendered in notification strings (line 99: `Uploaded ${args.documentType.replace("_", " ")}: ${args.fileName}`)

The file name is used in a notification progress update note, which is stored and later displayed in the UI. If the UI renders this without escaping (React does escape by default), it would be safe. But the stored value remains dirty.

**Fix recommendation:** Sanitize `fileName` to strip path separators, limit length, and remove potentially dangerous characters before storage.

### SEC-LOW-003: CSRF Considerations for Next.js API Route

**File:** `apps/web/src/app/api/injury-document-url/route.ts`

**Description:** The API route is a GET endpoint that returns a document download URL. While it checks authentication via session token, GET requests can be triggered via `<img src="...">` tags in cross-site contexts. The route returns JSON (not a redirect), which mitigates direct exploitation, but the pattern should be noted.

**Fix recommendation:** This is low risk because the route returns JSON, not a redirect. However, consider adding `SameSite=Strict` cookie attributes and CORS headers as defense in depth.

### SEC-LOW-004: Error Messages May Disclose Internal State

**Files:**
- `packages/backend/convex/models/playerInjuries.ts`: "Injury not found", "Player identity not found", "No return to play protocol set", "No milestones exist for this injury", "Milestone not found"
- `packages/backend/convex/models/injuryDocuments.ts`: "Document not found", "Not authorized to delete this document"

**Description:** Detailed error messages can help an attacker understand the system's internal state. For example, "Milestone not found" vs "No milestones exist" tells an attacker whether the injury has milestones at all. "Not authorized to delete this document" vs "Document not found" tells an attacker whether a document exists.

**Fix recommendation:** Use generic error messages for unauthorized/not-found cases: "Resource not found or access denied."

---

## Positive Security Observations

These are things the implementation got RIGHT from a security perspective:

### 1. Authentication on All Public Functions
Every exported `query` and `mutation` in both `playerInjuries.ts` and `injuryDocuments.ts` begins with `authComponent.safeGetAuthUser(ctx)` and throws if the user is not authenticated. No unauthenticated access paths exist.

### 2. API Route Uses Server-Derived User ID
The `injury-document-url` API route (`route.ts`) correctly:
- Verifies the session server-side via `getToken()`
- Fetches the user from Convex using the token
- Uses `currentUser._id` (not a client-provided value) for the document access query
- This was apparently a fix for a previous security issue (per `docs/archive/bug-fixes/SECURITY_FIX_261_API_AUTH.md`)

### 3. Document Privacy Model Uses Session ID
The `getDocuments`, `getDownloadUrl`, `deleteDocument`, and `updateDocumentPrivacy` functions all use `user._id` (from the authenticated session) for privacy and ownership checks, not the client-provided `userId` parameter. (The unused `userId` param should still be removed -- see SEC-MED-004.)

### 4. Internal Mutation for Notification Creation
The `createNotification` function in `notifications.ts` is marked `internalMutation`, preventing direct client invocation.

### 5. No XSS via dangerouslySetInnerHTML
No component uses `dangerouslySetInnerHTML`. All user-provided content (injury descriptions, player names, milestone notes) is rendered via React's standard text interpolation, which auto-escapes HTML.

### 6. Notification Ownership Verification
The `markNotificationSeen` and `dismissNotification` mutations correctly verify `notification.userId !== userId` before allowing modification, preventing users from marking other users' notifications as seen.

### 7. File Upload Client-Side Validation
The `document-upload.tsx` component validates file type against an allowlist and enforces a 10MB size limit before uploading. This is not a security control (it is bypassable), but it reduces accidental misuse.

### 8. Injury Visibility Model
The `isInjuryVisibleToOrg` helper correctly implements three-tier visibility (global, restricted list, occurred-at-org). This logic is consistently applied across all org-scoped queries.

### 9. CSV Export Properly Escapes Data
The `escapeCsvField` function in the admin page handles CSV injection vectors (commas, quotes, newlines) correctly.

---

## Verdict

**Overall Risk Level: HIGH**

The most significant finding is **SEC-CRIT-001**: the complete absence of organization membership verification on all backend queries and mutations. This means any authenticated user can access injury/medical data for any organization by calling the API directly. Combined with **SEC-HIGH-001** through **SEC-HIGH-005** (no per-record access control), the backend authorization model relies entirely on client-side route guards, which is not a valid security boundary.

For a platform handling medical/health data for minors (player injuries in youth sports), this authorization gap is a privacy regulation risk. The data exposed includes player names, injury types, body parts, treatment details, medical provider names, recovery plans, and uploaded medical documents.

### Priority Remediation Order

1. **Immediate (before release):** SEC-CRIT-001 -- Add org membership verification to all queries accepting `organizationId`
2. **Immediate (before release):** SEC-HIGH-002 -- Add admin role check to `getDocumentsAdmin`
3. **High priority:** SEC-HIGH-001, SEC-HIGH-004, SEC-HIGH-005 -- Add relationship verification to per-player queries
4. **High priority:** SEC-HIGH-003 -- Derive identity fields from session, not client args
5. **Medium priority:** SEC-MED-001 -- Remove PII from server logs
6. **Medium priority:** SEC-MED-002 -- Add server-side file type validation
7. **Lower priority:** SEC-MED-004, SEC-MED-005, SEC-LOW-* findings

### Comparison with Previous Review

The previous architectural review (also in this file) identified RISK-1 (No Backend Role Authorization) as MEDIUM-HIGH. This security audit escalates it to **CRITICAL** because:
1. The data is medical/health information, not just operational data
2. The attack is trivially exploitable by any authenticated user
3. The previous review noted "project-wide pattern" which means this is a systemic issue, but it must be fixed before shipping new medical data endpoints

---

*End of security audit.*
