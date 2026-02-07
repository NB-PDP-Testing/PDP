# ADR-003: Injury Analytics Security Model

**Status:** Accepted (with noted gaps)
**Date:** 2026-02-07
**Feature:** Injury Tracking Phase 3 - Analytics & Prevention (Issue #261)
**Deciders:** Architecture Review (post-implementation)

---

## Context

The Injury Analytics feature exposes organization-wide injury data through four backend queries. This data includes:

- Aggregate statistics (counts, percentages, averages)
- Player names and injury details
- Team-level breakdowns
- Individual injury records with medical information (treatment, medical provider, body part, severity)

Medical and health data requires careful access control. The analytics queries serve admin users who need organization-wide visibility, but the security model must ensure:

1. Only authenticated users can access injury data.
2. Only users with appropriate organizational roles can view the analytics dashboard.
3. Cross-organization data leakage is prevented.
4. Injury visibility rules (set by guardians) are respected.

## Decision Drivers

1. **Regulatory sensitivity:** Injury/medical data is sensitive (GDPR, child protection considerations). Unauthorized access to a child's injury history is a serious concern.
2. **Existing auth pattern:** The project uses Better Auth with organization plugin. Admin access is enforced at the frontend layout level (`admin/layout.tsx`).
3. **Convex security model:** Convex queries are callable by any authenticated frontend client. Backend authorization must independently verify access.
4. **Multi-org visibility:** The `playerInjuries` table supports cross-organization visibility via `isVisibleToAllOrgs` and `restrictedToOrgIds` fields.

## Considered Options

### Option A: Authentication-only backend checks (CURRENT)

Backend queries verify that the caller is authenticated (`authComponent.safeGetAuthUser`), but do not verify organizational membership or role. Frontend layout enforces admin access.

### Option B: Full backend role verification

Backend queries verify both authentication AND that the authenticated user holds an admin/owner role in the requested organization.

### Option C: Row-level security with Convex rules

Implement Convex-level access rules that restrict data access based on user-organization relationships.

## Decision Outcome

**Option A is what was implemented.** The current code checks authentication only at the backend level. Role-based access control is enforced exclusively by the frontend admin layout.

**This is identified as an architectural gap** that should be addressed before production deployment of this feature.

## Implementation Notes

### Current Authentication Checks

Every analytics query begins with:

```typescript
const user = await authComponent.safeGetAuthUser(ctx);
if (!user) {
  throw new Error("Not authenticated");
}
```

This verifies the caller has a valid session. However, it does **not** verify:
- That the user belongs to the organization specified by `args.organizationId`.
- That the user has an admin or owner role in that organization.
- That the user has any functional role that permits viewing injury analytics.

### Frontend Access Control

The admin layout (`apps/web/src/app/orgs/[orgId]/admin/layout.tsx`) performs client-side role checking:

```typescript
// Check if user has admin functional role OR Better Auth admin/owner role
const functionalRoles = (member as any).functionalRoles || [];
const hasAdminFunctionalRole = functionalRoles.includes("admin");
const hasBetterAuthAdminRole = member.role === "admin" || member.role === "owner";
setHasAccess(hasAdminFunctionalRole || hasBetterAuthAdminRole);
```

If access is denied, the user is redirected to `/orgs`. The admin injuries page inherits this protection by being nested under the admin layout.

**However, this is client-side only.** A determined user could call the Convex queries directly (via the Convex client or developer tools) with any `organizationId` and receive data, as long as they have a valid authentication session.

### Injury Visibility Filtering

The analytics queries do respect guardian-configured visibility rules via the `isInjuryVisibleToOrg()` helper:

```typescript
function isInjuryVisibleToOrg(injury, organizationId) {
  if (injury.isVisibleToAllOrgs) return true;
  if (injury.restrictedToOrgIds?.includes(organizationId)) return true;
  return injury.occurredAtOrgId === organizationId;
}
```

This correctly filters injuries based on the queried organization, ensuring that:
- Injuries marked as visible to all orgs are included.
- Injuries restricted to specific orgs are only shown to those orgs.
- Injuries that occurred at the querying org are always visible to that org.

This is a data-level control that works correctly regardless of who is calling the query.

### Cross-Organization Isolation

Queries are parameterized by `organizationId` and use org-scoped indexes:
- `orgPlayerEnrollments.by_org_and_status` ensures only enrollments for the specified org are fetched.
- `teamPlayerIdentities.by_org_and_status` ensures only team assignments for the specified org are fetched.
- Better Auth adapter queries filter by `organizationId`.

Data isolation is achieved through query parameterization, not through user-context filtering. This means a user who belongs to Org A could potentially query Org B's data by changing the `organizationId` argument.

### Per-Query Security Assessment

| Query | Auth Check | Role Check | Org Membership Check | Visibility Filter |
|-------|-----------|------------|---------------------|-------------------|
| `getOrgInjuryAnalytics` | Yes | No | No | Yes |
| `getInjuriesByTeam` | Yes | No | No | Yes |
| `getInjuryTrends` | Yes | No | No | Yes |
| `getRecentInjuriesForAdmin` | Yes | No | No | Yes |

### Comparison with Other Admin Queries

This pattern (auth-only backend, role check in frontend layout) is consistent with how other admin pages in the application work. The admin layout provides the gate, and backend queries trust that the frontend has verified access. This is a project-wide architectural pattern, not specific to the injury analytics feature.

## Consequences

### Positive

- **Consistent with existing patterns:** All admin-facing queries in the project follow the same auth-only backend pattern. Adding role checks only to injury analytics would create inconsistency.
- **Simple implementation:** No additional adapter calls needed per query to verify membership.
- **Injury visibility is enforced:** Guardian-configured visibility restrictions work correctly at the data level.
- **Org-scoped data isolation:** Queries return data only for the specified organization, preventing accidental data mixing in the UI.

### Negative / Risks

- **Backend authorization gap:** An authenticated user who is not an admin in Organization X could call `getOrgInjuryAnalytics({ organizationId: orgX })` and receive injury data. This is a security concern for medical/health data.
- **No audit trail:** There is no logging of who accesses injury analytics data. For compliance purposes, access to medical data may need to be auditable.
- **Sensitive data in `getRecentInjuriesForAdmin`:** This query returns player names, injury details, treatment information, and medical provider names. This is the most sensitive of the four queries.

### Recommended Mitigations (for Phase 4+)

**Priority 1 -- Backend org membership verification:**

Add a reusable helper that verifies the caller is a member of the specified organization with an admin/owner role:

```typescript
async function requireOrgAdmin(ctx, organizationId: string) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");

  const membership = await ctx.runQuery(
    components.betterAuth.adapter.findMany, {
      model: "member",
      where: [
        { field: "organizationId", value: organizationId, operator: "eq" },
        { field: "userId", value: user._id, operator: "eq" },
      ],
      paginationOpts: { cursor: null, numItems: 1 },
    }
  );

  const member = membership?.page?.[0];
  if (!member || !["admin", "owner"].includes(member.role)) {
    throw new Error("Insufficient permissions");
  }

  return user;
}
```

**Priority 2 -- Audit logging:**

Consider logging access to `getRecentInjuriesForAdmin` (which returns PII) for compliance purposes.

**Priority 3 -- Rate limiting:**

Apply rate limits to analytics queries to prevent data scraping. The project already has a rate limiting infrastructure (`models/rateLimits.ts`).

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Authenticated non-admin queries injury data | Low (requires knowing org ID) | High (medical data exposure) | Backend role check |
| Cross-org data access | Low (requires valid org ID) | High (multi-tenant isolation breach) | Backend membership check |
| Analytics data used for profiling | Low | Medium | Audit logging |
| Bulk data extraction via repeated queries | Very Low | Medium | Rate limiting |

The overall risk is **moderate** -- the attack surface requires an authenticated user who knows or guesses another organization's ID, but the impact of unauthorized medical data access is high. Backend role verification should be prioritized.

---

*This ADR was created as part of the post-implementation architectural review of Issue #261, Phase 3.*
