# Issue #261 - Security Audit: Injury Tracking (All Phases)

**Date:** 2026-02-07
**Branch:** `feature/261-injury-tracking-phase3-analytics`
**Scope:** Deep review of all 14 backend and frontend source files vs `main`
**Data Classification:** Protected Health Information (PHI) — injury details, medical providers, treatment plans, clearance records, uploaded medical documents

---

## Verdict: HIGH RISK — 15 findings (1 Critical, 5 High, 5 Medium, 4 Low)

| Severity | Count | Summary |
|----------|-------|---------|
| **CRITICAL** | 1 | Cross-org data access — no org membership verification |
| **HIGH** | 5 | Missing role auth, client-trusted identity fields, unprotected admin query |
| **MEDIUM** | 5 | PII in logs, file upload gaps, unused params, no delete audit trail |
| **LOW** | 4 | Rate limiting, file name sanitization, CSRF, error disclosure |

---

## CRITICAL

### SEC-CRIT-001: Cross-Organization Data Access

Every backend query/mutation accepting `organizationId` only checks authentication, **not org membership**. Any authenticated user can query medical data for any organization by calling the Convex API directly.

**Affected:** `getActiveInjuriesForOrg`, `getAllActiveInjuriesForOrg`, `getAllInjuriesForOrg`, `getOrgInjuryAnalytics`, `getInjuriesByTeam`, `getInjuryTrends`, `getRecentInjuriesForAdmin`

**Fix:** Create `requireOrgMembership(ctx, organizationId)` helper using Better Auth adapter. **Note: This is a project-wide pattern, not specific to injury tracking.**

---

## HIGH

| ID | Finding | File |
|----|---------|------|
| SEC-HIGH-001 | `getInjuryById` returns any injury to any authenticated user — no org/relationship check | `playerInjuries.ts:122` |
| SEC-HIGH-002 | `getDocumentsAdmin` exposes private medical docs to any authenticated user — no admin role check | `injuryDocuments.ts:166` |
| SEC-HIGH-003 | `updatedBy`/`reportedBy`/`uploadedBy` trusted from client args, not derived from session — enables audit trail forgery and notification routing manipulation | Multiple mutations |
| SEC-HIGH-004 | `getInjuriesForPlayer` / `getInjuryHistoryByBodyPart` — no player-relationship verification | `playerInjuries.ts:137,487` |
| SEC-HIGH-005 | `getInjuriesForMultiplePlayers` — no guardian-player relationship verification | `playerInjuries.ts:184` |

---

## MEDIUM

| ID | Finding | File |
|----|---------|------|
| SEC-MED-001 | PII in server logs (player names, user IDs, injury details) | `injuryNotifications.ts` |
| SEC-MED-002 | No server-side MIME type validation on file uploads | `injuryDocuments.ts:49` |
| SEC-MED-003 | Document download URL proxy lacks rate limiting | `route.ts` |
| SEC-MED-004 | Unused `userId` parameter in 4 functions creates confusion | `injuryDocuments.ts` |
| SEC-MED-005 | Hard deletes with no audit trail for injuries and documents | `playerInjuries.ts`, `injuryDocuments.ts` |

---

## LOW

| ID | Finding |
|----|---------|
| SEC-LOW-001 | No rate limiting on any mutation endpoint |
| SEC-LOW-002 | File name not sanitized before storage |
| SEC-LOW-003 | CSRF considerations for API route (mitigated by JSON response) |
| SEC-LOW-004 | Error messages disclose internal state (e.g., "Milestone not found" vs "No milestones exist") |

---

## Positive Observations

9 things done correctly:
1. Authentication on all public functions (no unauthenticated access)
2. API route uses server-derived user ID (previous security fix)
3. Document privacy checks use session ID, not client-provided
4. `createNotification` is `internalMutation` (not client-callable)
5. No `dangerouslySetInnerHTML` — React auto-escapes all content
6. Notification ownership verification on mark-seen/dismiss
7. Client-side file type/size validation (defense in depth)
8. Injury visibility model (`isInjuryVisibleToOrg`) applied consistently
9. CSV export properly escapes injection vectors

---

## Remediation Priority

1. **Before release:** SEC-CRIT-001 (org membership) + SEC-HIGH-002 (admin check on getDocumentsAdmin)
2. **High priority:** SEC-HIGH-001/004/005 (relationship verification) + SEC-HIGH-003 (server-derived identity)
3. **Medium priority:** SEC-MED-001 (PII in logs) + SEC-MED-002 (server-side file validation)
4. **Lower priority:** Remaining MEDIUM and LOW findings

Full audit details in `scripts/ralph/agents/output/feedback.md`.
