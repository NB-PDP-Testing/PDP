# PRD: URL Authorization & Access Control System

**Document Version:** 1.1
**Created:** January 12, 2026
**Last Updated:** January 12, 2026
**Author:** Platform Engineering Team
**Status:** Draft - For Review
**Priority:** CRITICAL (Security)
**Compliance Standards:** OWASP Top 10 2025, NIST SP 800-53, ISO 27001:2022, SOC 2, COPPA 2025, GDPR-K

---

## Executive Summary

This PRD addresses critical security vulnerabilities discovered in the PlayerARC platform's URL authorization and access control implementation. The audit revealed that while admin routes are protected, **coach and parent portals completely lack route-level authorization validation**, allowing any authenticated organization member to access restricted areas regardless of their functional role.

### Key Findings

| Portal | Required Role | Current Protection | Risk Level |
|--------|--------------|-------------------|------------|
| Admin | admin/owner | ✅ Protected | Low |
| Coach | coach functional role | ❌ **UNPROTECTED** | **CRITICAL** |
| Parent | parent functional role | ❌ **UNPROTECTED** | **CRITICAL** |
| Player Pages | role-dependent | ⚠️ UI-only gating | High |

### Business Impact

- **Data Exposure Risk**: Unauthorized users can view player medical records, assessments, injury data, and family information
- **Compliance Risk**: Potential GDPR, children's data protection violations
- **Trust Risk**: Parents and organizations expect role-appropriate access controls
- **Audit Risk**: No audit trail for unauthorized access attempts

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Current State Analysis](#2-current-state-analysis)
3. [Industry Best Practices](#3-industry-best-practices)
4. [Proposed Solution](#4-proposed-solution)
5. [User Experience Design](#5-user-experience-design)
6. [Technical Architecture](#6-technical-architecture)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Success Metrics](#8-success-metrics)
9. [Security Considerations](#9-security-considerations)
10. [Appendices](#10-appendices)

---

## 1. Problem Statement

### 1.1 Core Problem

Users can manipulate browser URLs to access pages they should not have permission to view or interact with. The platform lacks consistent authorization enforcement at the route level, creating significant security vulnerabilities.

### 1.2 Specific Vulnerabilities Identified

#### 1.2.1 Unauthorized Coach Portal Access
Any authenticated organization member can access:
- `/orgs/[orgId]/coach` - Coach dashboard
- `/orgs/[orgId]/coach/players` - Team player lists
- `/orgs/[orgId]/coach/voice-notes` - Recording interface
- `/orgs/[orgId]/coach/goals` - Goal management
- `/orgs/[orgId]/coach/assess` - Player assessment
- `/orgs/[orgId]/coach/injuries` - Injury tracking
- `/orgs/[orgId]/coach/medical` - Medical information
- `/orgs/[orgId]/coach/match-day` - Emergency contacts

#### 1.2.2 Unauthorized Parent Portal Access
Any authenticated organization member can access:
- `/orgs/[orgId]/parents` - Parent dashboard
- `/orgs/[orgId]/parents/children` - Child profiles
- `/orgs/[orgId]/parents/progress` - Player progress reports
- `/orgs/[orgId]/parents/achievements` - Achievement tracking

#### 1.2.3 Backend API Gaps
- Backend mutations accept role data as arguments without verification
- API routes lack authentication/authorization checks
- No audit logging of access attempts

### 1.3 Attack Scenarios

**Scenario 1: Data Harvesting**
```
1. Attacker joins organization as basic "member"
2. Navigates directly to /orgs/[orgId]/coach/players
3. Accesses complete player roster with contact details
4. Views medical records, injury history, assessments
5. No authorization check prevents access
```

**Scenario 2: Impersonation**
```
1. Non-coach user reaches /orgs/[orgId]/coach/assess
2. Submits skill assessment (backend accepts without auth check)
3. False assessment data enters system under fabricated identity
4. Data integrity compromised
```

**Scenario 3: Privacy Violation**
```
1. Member without parent role accesses /orgs/[orgId]/parents/children
2. Views other families' children and progress data
3. Potential GDPR/children's data protection violation
```

### 1.4 Stakeholders Affected

| Stakeholder | Impact |
|-------------|--------|
| **Players/Children** | Personal data, medical info, assessments exposed |
| **Parents** | Family information, child data visible to unauthorized users |
| **Coaches** | Assessment integrity compromised |
| **Organizations** | Legal liability, trust damage, compliance risk |
| **Platform** | Reputation risk, regulatory exposure |

---

## 2. Current State Analysis

### 2.1 Authentication Architecture (✅ Working)

The platform uses Better Auth with Convex backend:

```
User Login → Better Auth Session → Token-based access
                                        ↓
                               Convex Backend Queries
```

**What's working:**
- Users must authenticate to access `/orgs/*` routes
- Session management is secure
- Organization membership is validated at data layer

### 2.2 Authorization Architecture (⚠️ Inconsistent)

#### 2.2.1 Dual-Layer Role System

**Layer 1: Better Auth Organizational Roles** (standard)
| Role | Permissions |
|------|------------|
| owner | Full organizational authority |
| admin | Delegated org management |
| member | Basic organization access |

**Layer 2: Functional Roles** (custom extension)
| Role | Purpose |
|------|---------|
| admin | Administrative capabilities |
| coach | Coaching/assessment capabilities |
| parent | Guardian/parent capabilities |
| player | Adult self-access capabilities |

#### 2.2.2 Current Protection Implementation

**Admin Layout** (`/apps/web/src/app/orgs/[orgId]/admin/layout.tsx`)
```typescript
// ✅ PROTECTED - Uses Better Auth checkRolePermission
useEffect(() => {
  const checkAccess = async () => {
    const { data: member } = await authClient.organization.getActiveMember();
    const canAccess = authClient.organization.checkRolePermission({
      permissions: { organization: ["update"] },
      role: member.role as OrgMemberRole,
    });
    setHasAccess(canAccess);
  };
  checkAccess();
}, [orgId]);

// Redirects unauthorized users
useEffect(() => {
  if (hasAccess === false) {
    router.replace("/orgs");
  }
}, [hasAccess, router]);
```

**Coach Layout** (`/apps/web/src/app/orgs/[orgId]/coach/layout.tsx`)
```typescript
// ❌ UNPROTECTED - No authorization check
// Direct render without role validation
return <>{children}</>;
```

**Parent Layout** (`/apps/web/src/app/orgs/[orgId]/parents/layout.tsx`)
```typescript
// ❌ UNPROTECTED - No authorization check
// Direct render without role validation
return <>{children}</>;
```

### 2.3 Permission Helper Functions (✅ Exist, ❌ Not Used for Auth)

```typescript
// /apps/web/src/lib/permissions.ts
export function isCoach(userFunctionalRoles: string[]): boolean {
  return userFunctionalRoles.includes("coach");
}

export function isParent(userFunctionalRoles: string[]): boolean {
  return userFunctionalRoles.includes("parent");
}
```

These functions exist but are only used for UI hiding, not route protection.

### 2.4 Backend Authorization (⚠️ Trust-Based)

Backend mutations rely on frontend to validate authorization:

```typescript
// Example: No verification that caller is actually a coach
export const createSkillAssessment = mutation({
  args: {
    assessedBy: v.optional(v.string()),     // Frontend provides
    assessorRole: v.optional(v.string()),   // Frontend provides
    // ...
  },
  handler: async (ctx, args) => {
    // ❌ Creates assessment without role verification
  }
});
```

### 2.5 Error Handling (⚠️ Inconsistent)

| Portal | Error Handling |
|--------|---------------|
| Admin | Shows "Access Denied" + redirects to `/orgs` |
| Coach | Generic "Something went wrong" error |
| Parent | Generic "Something went wrong" error |

No distinction between "unauthorized" vs "system error" in coach/parent portals.

---

## 3. Industry Standards & Compliance Requirements

This section documents the industry standards, frameworks, and regulations that this implementation MUST comply with. These are not optional best practices—they represent the baseline security requirements for a platform handling sensitive children's sports data.

### 3.1 OWASP Top 10 2025 Compliance

**Reference**: [OWASP Top 10 2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

Broken Access Control remains the #1 security risk in the OWASP Top 10 2025, with the highest number of occurrences in contributed data. Our current vulnerabilities directly map to this category.

| OWASP 2025 Category | Relevance | Current Risk | Required Action |
|---------------------|-----------|--------------|-----------------|
| **A01:2025 Broken Access Control** | Direct hit | **CRITICAL** | Implement all route guards |
| A02:2025 Cryptographic Failures | N/A | Low | No action |
| A03:2025 Injection | Possible in mutations | Medium | Input validation |
| A04:2025 Insecure Design | Architecture gap | High | Defense in depth |
| A07:2025 Auth Failures | Partial | Medium | Session hardening |

**OWASP Specific Requirements We Must Implement:**

1. **Deny by Default**: Access must be denied unless explicitly granted ([OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html))
2. **Centralized Access Control**: Single routine for all access checks—no copy-paste authorization code
3. **Policy Enforcement Point**: All requests must pass through an access control verification layer
4. **Prevent Horizontal Privilege Escalation**: Users cannot change URL parameters (like `/profile/677` to `/profile/678`) to access others' data

**Current Violation Example:**
```
User navigates to /orgs/[orgId]/coach/players
→ No policy enforcement point exists
→ Access granted to ALL authenticated users
→ Horizontal privilege escalation possible
```

### 3.2 NIST Access Control Framework (SP 800-53)

**Reference**: [NIST RBAC Project](https://csrc.nist.gov/projects/role-based-access-control) | [NIST SP 800-53](https://csrc.nist.gov/CSRC/media/Projects/risk-management/800-53%20Downloads/800-53r5/SP_800-53_v5_1-derived-OSCAL.pdf)

The NIST model for RBAC was adopted as American National Standard ANSI/INCITS 359-2004. We must implement:

| NIST Control | Requirement | Implementation |
|--------------|-------------|----------------|
| **AC-3 Access Enforcement** | System enforces approved authorizations | Route guards + backend checks |
| **AC-3(7) RBAC** | Role-based access control mechanisms | Functional roles system |
| **AC-6 Least Privilege** | Minimum necessary access | Role-specific route access |
| **AC-6(1) Authorize Access** | Explicit authorization for security functions | Admin-only for sensitive ops |
| **AC-17 Remote Access** | Authorization before connection | Session validation |

**NIST RBAC Principles We Must Follow:**

1. **Role Assignment**: Users assigned to roles, roles assigned to permissions
2. **Role Authorization**: User's active role must be authorized for them
3. **Permission Authorization**: User can exercise permission only if authorized for active role
4. **Separation of Duties**: Mutually exclusive roles for sensitive operations

### 3.3 Zero Trust Architecture Requirements

**Reference**: [OWASP Zero Trust Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Zero_Trust_Architecture_Cheat_Sheet.html) | [Microsoft Zero Trust](https://www.microsoft.com/en-us/security/business/zero-trust)

Zero Trust is now the industry standard, replacing perimeter-based security. Core principle: **"Never trust, always verify."**

**Zero Trust Mandates for PlayerARC:**

| Principle | Requirement | Implementation |
|-----------|-------------|----------------|
| **Verify Explicitly** | Authenticate and authorize every request | Backend auth on every mutation |
| **Least Privilege** | Just-enough-access, just-in-time | Role-specific permissions only |
| **Assume Breach** | Minimize blast radius, segment access | Org isolation + role isolation |
| **Continuous Validation** | Verify throughout session | Real-time role checks |

**Zero Trust Architecture Layers:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ZERO TRUST LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│  Identity           │ Verify user identity (Better Auth)    │
│  Device             │ Validate device health (future)       │
│  Application        │ Route guards, component gates         │
│  Data               │ Organization + row-level isolation    │
│  Infrastructure     │ Convex managed (serverless)           │
│  Network            │ Vercel Edge (managed)                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 ISO 27001:2022 Access Control Requirements

**Reference**: [ISO 27001 Access Control Guide](https://cyberupgrade.net/blog/compliance-regulations/iso-27001-access-control-policy-guide-2025/)

Organizations certified to ISO 27001:2013 must transition to ISO 27001:2022 by **October 31, 2025**. Key requirements:

| ISO Control | Requirement | Our Implementation |
|-------------|-------------|-------------------|
| **A.5.15** | Access control policy | Route permissions config |
| **A.5.16** | Identity management | Better Auth user lifecycle |
| **A.5.17** | Authentication | MFA support, session management |
| **A.5.18** | Access rights | Functional roles system |
| **A.8.2** | Privileged access | Admin/Owner role restrictions |
| **A.8.3** | Information access restriction | Parent sees only linked children |

**ISO 27001 Access Control Policy Requirements:**
1. Documented access control policy aligned with business requirements
2. Formal user registration and de-registration process
3. Periodic access rights review
4. Access promptly removed when no longer needed

### 3.5 SOC 2 Trust Services Criteria

**Reference**: [SOC 2 Access Control Requirements](https://www.zluri.com/blog/soc-2-access-control) | [SOC 2 Audit Logs Guide](https://marutitech.com/ultimate-soc2-audit-logs-tech-guide/)

SOC 2 compliance requires demonstrable access controls and audit logging.

**SOC 2 Access Control Requirements:**

| Criteria | Requirement | Implementation |
|----------|-------------|----------------|
| **CC6.1** | Logical access security | Route guards + backend auth |
| **CC6.2** | Access provisioning | Functional role assignment |
| **CC6.3** | Access removal | Role revocation workflow |
| **CC6.6** | Logical access restrictions | Role-based permissions |

**SOC 2 Audit Logging Requirements:**

| Requirement | What to Log | Retention |
|-------------|-------------|-----------|
| Access decisions | Allow/deny with context | 90+ days |
| Who did what | User ID, action, timestamp | 90+ days |
| Security events | Failed access attempts | 90+ days |
| Role changes | Permission modifications | 1+ year |

**Evidence Required for SOC 2 Type II:**
- Access logs demonstrating controls work
- Vulnerability scan results
- Incident response documentation
- Regular access reviews

### 3.6 Children's Data Protection Regulations

**References**:
- [COPPA Compliance 2025](https://verasafe.com/blog/coppa-compliance-2025-what-organizations-need-to-know/)
- [GDPR-K Guidelines](https://pandectes.io/blog/childrens-online-privacy-rules-around-coppa-gdpr-k-and-age-verification/)

PlayerARC handles children's sports data, triggering special regulatory requirements.

#### 3.6.1 COPPA (US) - Children's Online Privacy Protection Act

**Effective June 23, 2025**: FTC finalized major COPPA amendments on January 16, 2025.

| Requirement | Implementation |
|-------------|----------------|
| Verifiable parental consent | Parent functional role + guardian linking |
| Direct notice to parents | Parent portal access |
| Data minimization | Only collect necessary data |
| Parental access to data | Parent dashboard |
| Right to delete | Data deletion workflow |
| Third-party disclosure controls | Explicit consent for sharing |

**COPPA 2025 Updates Affecting Us:**
- Biometric data now explicitly regulated
- Parents must consent to collection separately from third-party disclosure
- Safe Harbor programs face enhanced oversight

**Penalty**: Up to $50,120 per violation (2025 adjusted)

#### 3.6.2 GDPR-K (EU) - Children's Data Protection

| Requirement | Implementation |
|-------------|----------------|
| Lawful, transparent processing | Clear privacy policy |
| Parental consent for <16 | Guardian verification |
| Child's right to erasure | Data deletion workflow |
| Privacy by design | Default deny access |
| Data protection impact assessment | Required for this feature |

**Penalty**: Up to €20 million or 4% of global turnover

#### 3.6.3 UK Age Appropriate Design Code

| Principle | Requirement |
|-----------|-------------|
| Best interests of the child | Data access restricted appropriately |
| Age-appropriate application | Default high privacy settings |
| Transparency | Clear explanation of data use |
| Data minimization | Only collect what's needed |

### 3.7 Next.js Authorization Best Practices (2025)

**Reference**: [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) | [Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)

#### 3.7.1 Middleware as First Line of Defense

Middleware runs at the edge before pages load—ideal for initial security checks.

```typescript
// middleware.ts - Edge runtime
export function middleware(request: NextRequest) {
  const session = await getSession(request);
  const path = request.nextUrl.pathname;

  // Route-specific authorization
  if (path.startsWith('/orgs') && path.includes('/coach')) {
    if (!session?.functionalRoles?.includes('coach')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/orgs/:path*'],
};
```

#### 3.7.2 Don't Rely on Middleware Alone

**Critical**: Middleware is not sufficient for authorization. Per Next.js documentation:

> "You should not rely on middleware exclusively for authorization. Always ensure that the session is verified as close to your data fetching as possible."

**Required Pattern:**
1. **Middleware**: Optimistic checks (read session from cookie only)
2. **Layout Guards**: Role verification with database lookup
3. **Server Actions**: Full authorization before mutations
4. **Data Fetching**: Verify access at query level

#### 3.7.3 Server Actions Security

> "Treat Server Actions with the same security considerations as public-facing API endpoints."

All Convex mutations must verify caller authorization—client-side restrictions are not sufficient.

### 3.8 Defense in Depth Architecture

All referenced standards require multiple security layers. Our implementation must include:

```
┌─────────────────────────────────────────────────────────────┐
│                    DEFENSE IN DEPTH                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Edge/Network     │ Rate limiting, WAF (Vercel)    │
│  Layer 2: Authentication   │ Better Auth session validation │
│  Layer 3: Route Guards     │ Middleware + Layout checks     │
│  Layer 4: Component Gates  │ UI-level permission checks     │
│  Layer 5: Backend Auth     │ Convex mutation verification   │
│  Layer 6: Data Isolation   │ Org + row-level security       │
│  Layer 7: Audit Logging    │ All decisions logged           │
└─────────────────────────────────────────────────────────────┘
```

**PlayerARC Current State vs. Required:**

| Layer | Current | Required | Gap |
|-------|---------|----------|-----|
| Edge/Network | ✅ Vercel | ✅ Vercel | None |
| Authentication | ✅ Better Auth | ✅ Better Auth | None |
| Route Guards | ⚠️ Admin only | All role-based routes | **CRITICAL** |
| Component Gates | ⚠️ Inconsistent | Systematic | High |
| Backend Auth | ❌ Missing | All mutations | **CRITICAL** |
| Data Isolation | ✅ Org-level | ✅ Org-level | None |
| Audit Logging | ❌ Missing | All auth decisions | High |

### 3.9 Backend Authorization Pattern (Convex)

**Reference**: Convex security documentation + OWASP API Security

```typescript
export const createAssessment = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // 1. Verify caller identity (Zero Trust: verify explicitly)
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // 2. Verify organization membership
    const member = await getMemberWithRoles(ctx, user.id, args.orgId);
    if (!member) throw new Error("Forbidden: Not a member");

    // 3. Verify functional role (RBAC: permission authorization)
    if (!member.functionalRoles.includes("coach")) {
      // 4. Log failed attempt (SOC 2: audit logging)
      await logAuthDecision(ctx, {
        userId: user.id,
        action: 'createAssessment',
        decision: 'deny',
        reason: 'Missing coach role'
      });
      throw new Error("Forbidden: Coach role required");
    }

    // 5. Log successful access
    await logAuthDecision(ctx, {
      userId: user.id,
      action: 'createAssessment',
      decision: 'allow'
    });

    // 6. Proceed with mutation
    return ctx.db.insert(...);
  }
});
```

### 3.10 Compliance Summary Matrix

| Standard | Key Requirement | Phase | Priority |
|----------|-----------------|-------|----------|
| **OWASP A01** | Route guards, centralized auth | 1 | P0 |
| **NIST AC-3** | Access enforcement on all routes | 1 | P0 |
| **Zero Trust** | Verify every request at backend | 2 | P0 |
| **ISO 27001** | Access control policy documentation | 1 | P1 |
| **SOC 2** | Audit logging for all auth decisions | 3 | P1 |
| **COPPA** | Parent role for child data access | 1 | P0 |
| **GDPR-K** | Privacy by design, data protection | 1-4 | P0 |
| **Next.js** | Multi-layer auth, not middleware alone | 1-2 | P0 |

### 3.11 References & Sources

- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP Top 10 2025 - A01 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [OWASP Zero Trust Architecture Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Zero_Trust_Architecture_Cheat_Sheet.html)
- [NIST Role Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)
- [NIST SP 800-53 Access Control Family](https://csrc.nist.gov/CSRC/media/Projects/risk-management/800-53%20Downloads/800-53r5/SP_800-53_v5_1-derived-OSCAL.pdf)
- [ISO 27001:2022 Access Control Guide](https://cyberupgrade.net/blog/compliance-regulations/iso-27001-access-control-policy-guide-2025/)
- [SOC 2 Access Control Requirements](https://www.zluri.com/blog/soc-2-access-control)
- [SOC 2 Audit Logs Guide](https://marutitech.com/ultimate-soc2-audit-logs-tech-guide/)
- [COPPA 2025 Updates](https://verasafe.com/blog/coppa-compliance-2025-what-organizations-need-to-know/)
- [GDPR-K Children's Privacy](https://pandectes.io/blog/childrens-online-privacy-rules-around-coppa-gdpr-k-and-age-verification/)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)
- [Microsoft Zero Trust Architecture](https://www.microsoft.com/en-us/security/business/zero-trust)

---

## 4. Proposed Solution

### 4.1 Solution Overview

Implement a comprehensive, multi-layer authorization system:

```
┌─────────────────────────────────────────────────────────────┐
│               PROPOSED AUTHORIZATION FLOW                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Request                                               │
│       ↓                                                     │
│  ┌─────────────────────────────────────┐                   │
│  │ Layer 1: Next.js Middleware         │ ← Edge runtime    │
│  │ - Session validation                │                   │
│  │ - Route pattern matching            │                   │
│  │ - Early rejection for clear denials │                   │
│  └─────────────────────────────────────┘                   │
│       ↓ (if passes)                                        │
│  ┌─────────────────────────────────────┐                   │
│  │ Layer 2: Layout Guards              │ ← React server    │
│  │ - Functional role verification      │                   │
│  │ - Organization membership check     │                   │
│  │ - Graceful error UI rendering       │                   │
│  └─────────────────────────────────────┘                   │
│       ↓ (if passes)                                        │
│  ┌─────────────────────────────────────┐                   │
│  │ Layer 3: Component Permission Gates │ ← Client          │
│  │ - Feature-level permissions         │                   │
│  │ - UI element visibility             │                   │
│  │ - Action button enabling            │                   │
│  └─────────────────────────────────────┘                   │
│       ↓ (user action)                                      │
│  ┌─────────────────────────────────────┐                   │
│  │ Layer 4: Backend Authorization      │ ← Convex          │
│  │ - Caller identity verification      │                   │
│  │ - Role-based mutation guards        │                   │
│  │ - Data-level access control         │                   │
│  └─────────────────────────────────────┘                   │
│       ↓ (audit)                                            │
│  ┌─────────────────────────────────────┐                   │
│  │ Layer 5: Audit Logging              │ ← Convex          │
│  │ - Access attempt logging            │                   │
│  │ - Denial logging with context       │                   │
│  │ - Success logging for sensitive ops │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Component 1: Route Authorization Configuration

Create a centralized route-permission mapping:

```typescript
// /apps/web/src/lib/route-permissions.ts

export type RoutePermission = {
  /** Route pattern (supports wildcards) */
  pattern: string;
  /** Required Better Auth roles (OR logic) */
  betterAuthRoles?: ('owner' | 'admin' | 'member')[];
  /** Required functional roles (OR logic) */
  functionalRoles?: ('admin' | 'coach' | 'parent' | 'player')[];
  /** Specific permissions required */
  permissions?: {
    organization?: string[];
    team?: string[];
    player?: string[];
  };
  /** Redirect path on denial */
  redirectTo?: string;
  /** Custom denial message */
  denialMessage?: string;
};

export const routePermissions: RoutePermission[] = [
  // Admin routes - require admin/owner Better Auth role
  {
    pattern: '/orgs/*/admin/*',
    betterAuthRoles: ['owner', 'admin'],
    redirectTo: '/orgs',
    denialMessage: 'Admin access required',
  },

  // Coach routes - require coach functional role
  {
    pattern: '/orgs/*/coach/*',
    functionalRoles: ['coach', 'admin'],  // admins can access coach area
    redirectTo: '/orgs/[orgId]',
    denialMessage: 'Coach access required',
  },

  // Parent routes - require parent functional role
  {
    pattern: '/orgs/*/parents/*',
    functionalRoles: ['parent', 'admin'],  // admins can access parent area
    redirectTo: '/orgs/[orgId]',
    denialMessage: 'Parent access required',
  },

  // Player profile - coaches, parents of player, admins
  {
    pattern: '/orgs/*/players/*',
    functionalRoles: ['coach', 'parent', 'admin'],
    // Additional check: parents only see their linked children
  },
];
```

### 4.3 Component 2: Authorization Hook

Create a reusable hook for authorization checks:

```typescript
// /apps/web/src/hooks/useAuthorization.ts

import { useCurrentUser } from './useCurrentUser';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export type AuthorizationResult = {
  isLoading: boolean;
  isAuthorized: boolean;
  denialReason?: string;
  user?: User;
  member?: Member;
  functionalRoles: string[];
};

export function useAuthorization(
  orgId: string,
  options: {
    requiredBetterAuthRoles?: string[];
    requiredFunctionalRoles?: string[];
    requiredPermissions?: Record<string, string[]>;
  }
): AuthorizationResult {
  const user = useCurrentUser();
  const member = useQuery(api.members.getMemberByUserId,
    user?.id ? { userId: user.id, organizationId: orgId } : 'skip'
  );

  // Loading state
  if (user === undefined || member === undefined) {
    return { isLoading: true, isAuthorized: false, functionalRoles: [] };
  }

  // Not authenticated
  if (!user) {
    return {
      isLoading: false,
      isAuthorized: false,
      denialReason: 'Authentication required',
      functionalRoles: []
    };
  }

  // Not a member of this organization
  if (!member) {
    return {
      isLoading: false,
      isAuthorized: false,
      denialReason: 'Not a member of this organization',
      user,
      functionalRoles: []
    };
  }

  const functionalRoles = member.functionalRoles || [];

  // Check Better Auth roles
  if (options.requiredBetterAuthRoles?.length) {
    const hasRole = options.requiredBetterAuthRoles.includes(member.role);
    if (!hasRole) {
      return {
        isLoading: false,
        isAuthorized: false,
        denialReason: `Required role: ${options.requiredBetterAuthRoles.join(' or ')}`,
        user,
        member,
        functionalRoles
      };
    }
  }

  // Check functional roles
  if (options.requiredFunctionalRoles?.length) {
    const hasFunctionalRole = options.requiredFunctionalRoles.some(
      role => functionalRoles.includes(role)
    );
    if (!hasFunctionalRole) {
      return {
        isLoading: false,
        isAuthorized: false,
        denialReason: `Required role: ${options.requiredFunctionalRoles.join(' or ')}`,
        user,
        member,
        functionalRoles
      };
    }
  }

  // All checks passed
  return {
    isLoading: false,
    isAuthorized: true,
    user,
    member,
    functionalRoles
  };
}
```

### 4.4 Component 3: Layout Guard Component

Create a reusable layout wrapper:

```typescript
// /apps/web/src/components/auth/RouteGuard.tsx

'use client';

import { useAuthorization, type AuthorizationResult } from '@/hooks/useAuthorization';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AccessDenied } from './AccessDenied';
import { LoadingScreen } from '../LoadingScreen';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredBetterAuthRoles?: string[];
  requiredFunctionalRoles?: string[];
  redirectTo?: string;
  denialMessage?: string;
  /** If true, shows AccessDenied instead of redirecting */
  showDenialUI?: boolean;
}

export function RouteGuard({
  children,
  requiredBetterAuthRoles,
  requiredFunctionalRoles,
  redirectTo,
  denialMessage = 'You do not have permission to access this page',
  showDenialUI = false,
}: RouteGuardProps) {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const auth = useAuthorization(orgId, {
    requiredBetterAuthRoles,
    requiredFunctionalRoles,
  });

  // Handle redirect on denial
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthorized && redirectTo && !showDenialUI) {
      router.replace(redirectTo.replace('[orgId]', orgId));
    }
  }, [auth.isLoading, auth.isAuthorized, redirectTo, router, orgId, showDenialUI]);

  // Loading state
  if (auth.isLoading) {
    return <LoadingScreen message="Checking access..." />;
  }

  // Access denied - show UI
  if (!auth.isAuthorized && showDenialUI) {
    return (
      <AccessDenied
        title="Access Denied"
        message={denialMessage}
        reason={auth.denialReason}
        backUrl={`/orgs/${orgId}`}
      />
    );
  }

  // Access denied - redirect in progress
  if (!auth.isAuthorized) {
    return <LoadingScreen message="Redirecting..." />;
  }

  // Authorized
  return <>{children}</>;
}
```

### 4.5 Component 4: Access Denied Page

Create a graceful access denied UI:

```typescript
// /apps/web/src/components/auth/AccessDenied.tsx

'use client';

import { ShieldX, ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import Link from 'next/link';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  reason?: string;
  backUrl?: string;
  showContactSupport?: boolean;
}

export function AccessDenied({
  title = 'Access Denied',
  message = 'You do not have permission to view this page.',
  reason,
  backUrl = '/orgs',
  showContactSupport = true,
}: AccessDeniedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{message}</p>

          {reason && (
            <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-500">
              <strong>Reason:</strong> {reason}
            </div>
          )}

          <p className="text-sm text-gray-500">
            If you believe you should have access to this page, please contact
            your organization administrator.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href={backUrl}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Link>
          </Button>

          {showContactSupport && (
            <Button variant="ghost" asChild className="w-full">
              <Link href="/support">
                <HelpCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
```

### 4.6 Component 5: Backend Authorization Helper

Create backend authorization utilities:

```typescript
// /packages/backend/convex/lib/authorization.ts

import { QueryCtx, MutationCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';

export type AuthorizationContext = {
  userId: string;
  organizationId: string;
  betterAuthRole: string;
  functionalRoles: string[];
  isPlatformStaff: boolean;
};

/**
 * Get authorization context for the current user
 * Throws if user is not authenticated or not a member
 */
export async function getAuthContext(
  ctx: QueryCtx | MutationCtx,
  organizationId: string
): Promise<AuthorizationContext> {
  // Get authenticated user
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  // Get membership in organization
  const member = await ctx.db
    .query('member')
    .withIndex('by_userId_organizationId', q =>
      q.eq('userId', user.id).eq('organizationId', organizationId)
    )
    .unique();

  if (!member) {
    throw new Error('Forbidden: Not a member of this organization');
  }

  return {
    userId: user.id,
    organizationId,
    betterAuthRole: member.role,
    functionalRoles: member.functionalRoles || [],
    isPlatformStaff: user.isPlatformStaff || false,
  };
}

/**
 * Assert that user has one of the required functional roles
 */
export function assertFunctionalRole(
  authCtx: AuthorizationContext,
  requiredRoles: string[],
  action: string
): void {
  // Platform staff bypass
  if (authCtx.isPlatformStaff) return;

  // Admin functional role can access everything
  if (authCtx.functionalRoles.includes('admin')) return;

  const hasRole = requiredRoles.some(role =>
    authCtx.functionalRoles.includes(role)
  );

  if (!hasRole) {
    throw new Error(
      `Forbidden: ${action} requires ${requiredRoles.join(' or ')} role`
    );
  }
}

/**
 * Assert that user has one of the required Better Auth roles
 */
export function assertBetterAuthRole(
  authCtx: AuthorizationContext,
  requiredRoles: string[],
  action: string
): void {
  // Platform staff bypass
  if (authCtx.isPlatformStaff) return;

  const hasRole = requiredRoles.includes(authCtx.betterAuthRole);

  if (!hasRole) {
    throw new Error(
      `Forbidden: ${action} requires ${requiredRoles.join(' or ')} role`
    );
  }
}
```

### 4.7 Component 6: Updated Layout Implementations

#### Coach Layout (Fixed)

```typescript
// /apps/web/src/app/orgs/[orgId]/coach/layout.tsx

import { RouteGuard } from '@/components/auth/RouteGuard';

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard
      requiredFunctionalRoles={['coach', 'admin']}
      redirectTo="/orgs/[orgId]"
      denialMessage="You need coach access to view this page. Please contact your organization administrator if you believe this is an error."
      showDenialUI={true}
    >
      {/* Existing coach layout content */}
      {children}
    </RouteGuard>
  );
}
```

#### Parent Layout (Fixed)

```typescript
// /apps/web/src/app/orgs/[orgId]/parents/layout.tsx

import { RouteGuard } from '@/components/auth/RouteGuard';

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard
      requiredFunctionalRoles={['parent', 'admin']}
      redirectTo="/orgs/[orgId]"
      denialMessage="You need parent/guardian access to view this page. Please contact your organization administrator if you believe this is an error."
      showDenialUI={true}
    >
      {/* Existing parent layout content */}
      {children}
    </RouteGuard>
  );
}
```

---

## 5. User Experience Design

### 5.1 Access Denied Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ACCESS DENIED FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User navigates to protected route                          │
│           ↓                                                 │
│  ┌─────────────────┐                                       │
│  │ Show spinner    │ "Checking access..."                  │
│  │ (brief, ~500ms) │                                       │
│  └─────────────────┘                                       │
│           ↓                                                 │
│  Authorization check completes                              │
│           ↓                                                 │
│  ┌─────────────────────────────────────────┐               │
│  │ Access Denied?                          │               │
│  │                                          │               │
│  │  ┌─────────────────────────────────┐   │               │
│  │  │     🛡️ Access Denied            │   │               │
│  │  │                                  │   │               │
│  │  │  You don't have permission to   │   │               │
│  │  │  view this page.                │   │               │
│  │  │                                  │   │               │
│  │  │  Reason: Coach access required  │   │               │
│  │  │                                  │   │               │
│  │  │  Contact your organization      │   │               │
│  │  │  administrator for access.      │   │               │
│  │  │                                  │   │               │
│  │  │  [← Go Back]  [Contact Support] │   │               │
│  │  └─────────────────────────────────┘   │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Graceful Messaging Matrix

| Scenario | Message | Action |
|----------|---------|--------|
| Not logged in | "Please sign in to continue" | Redirect to login |
| Not org member | "You're not a member of this organization" | "Request to Join" button |
| Missing coach role | "Coach access required" | "Go Back" + "Contact Admin" |
| Missing parent role | "Parent/Guardian access required" | "Go Back" + "Contact Admin" |
| Missing admin role | "Admin access required" | "Go Back" |
| Invalid org ID | "Organization not found" | "Browse Organizations" |
| Deactivated account | "Your account has been deactivated" | "Contact Support" |

### 5.3 Navigation Hiding

When a user lacks a role, hide corresponding navigation items:

```typescript
// Navigation should hide links user can't access
const navItems = [
  { label: 'Dashboard', href: '/orgs/[orgId]', roles: [] }, // Everyone
  { label: 'Coach', href: '/orgs/[orgId]/coach', roles: ['coach', 'admin'] },
  { label: 'Parents', href: '/orgs/[orgId]/parents', roles: ['parent', 'admin'] },
  { label: 'Admin', href: '/orgs/[orgId]/admin', roles: ['admin', 'owner'] },
];

// Filter based on user's roles
const visibleNavItems = navItems.filter(item =>
  item.roles.length === 0 ||
  item.roles.some(role => userRoles.includes(role))
);
```

### 5.4 Error Page Design Principles

1. **Clear explanation**: Tell user exactly why they can't access
2. **No blame**: Use neutral language, not "you're not allowed"
3. **Helpful guidance**: Suggest next steps
4. **Easy escape**: Obvious way to get back to valid content
5. **Support option**: Way to escalate if they believe it's an error
6. **Brand consistent**: Use organization colors if available

---

## 6. Technical Architecture

### 6.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION ARCHITECTURE                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     FRONTEND (Next.js)                       ││
│  │                                                               ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       ││
│  │  │ Middleware   │  │ Layout Guards│  │ Components   │       ││
│  │  │ (Edge)       │  │ (RSC/Client) │  │ (Client)     │       ││
│  │  │              │  │              │  │              │       ││
│  │  │ - Session ✓  │  │ - Role check │  │ - UI gating  │       ││
│  │  │ - Pattern    │  │ - Redirect   │  │ - Feature    │       ││
│  │  │   matching   │  │ - Error UI   │  │   toggles    │       ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘       ││
│  │         ↓                 ↓                 ↓                 ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │              SHARED AUTHORIZATION LIBRARY                │││
│  │  │                                                          │││
│  │  │  • useAuthorization() hook                               │││
│  │  │  • RouteGuard component                                  │││
│  │  │  • Permission helpers                                    │││
│  │  │  • Route-permission config                               │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     BACKEND (Convex)                         ││
│  │                                                               ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       ││
│  │  │ Auth Context │  │ Query Guards │  │ Mutation     │       ││
│  │  │              │  │              │  │ Guards       │       ││
│  │  │              │  │              │  │              │       ││
│  │  │ - User ID    │  │ - Caller     │  │ - Role       │       ││
│  │  │ - Org ID     │  │   identity   │  │   assertion  │       ││
│  │  │ - Roles      │  │ - Org scope  │  │ - Audit log  │       ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘       ││
│  │                                                               ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │                   DATA LAYER                             │││
│  │  │                                                          │││
│  │  │  • Organization-scoped queries                           │││
│  │  │  • Row-level filtering                                   │││
│  │  │  • Index-based access patterns                           │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     AUDIT LOGGING                            ││
│  │                                                               ││
│  │  • Authorization decisions logged                            ││
│  │  • Denial reasons captured                                   ││
│  │  • Sensitive access tracked                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 File Structure

```
apps/web/src/
├── lib/
│   ├── authorization/
│   │   ├── index.ts              # Main exports
│   │   ├── route-permissions.ts  # Route-role mapping config
│   │   ├── permission-helpers.ts # Permission check functions
│   │   └── types.ts              # TypeScript types
│   └── auth-client.ts            # Better Auth client (existing)
├── hooks/
│   ├── useAuthorization.ts       # Authorization hook
│   └── useCurrentUser.ts         # User hook (existing)
├── components/
│   └── auth/
│       ├── RouteGuard.tsx        # Layout wrapper
│       ├── AccessDenied.tsx      # Access denied UI
│       ├── PermissionGate.tsx    # Component-level gate
│       └── index.ts              # Exports
└── app/orgs/[orgId]/
    ├── admin/layout.tsx          # Admin layout (update)
    ├── coach/layout.tsx          # Coach layout (update)
    └── parents/layout.tsx        # Parent layout (update)

packages/backend/convex/
├── lib/
│   └── authorization.ts          # Backend auth helpers
└── models/
    └── *.ts                      # Add auth checks to mutations
```

### 6.3 Database Changes

#### New Table: Authorization Audit Log

```typescript
// packages/backend/convex/schema.ts

authorizationLogs: defineTable({
  // Event metadata
  timestamp: v.number(),
  eventType: v.union(
    v.literal('access_granted'),
    v.literal('access_denied'),
    v.literal('permission_check'),
    v.literal('role_change')
  ),

  // Actor
  userId: v.optional(v.string()),
  sessionId: v.optional(v.string()),

  // Target
  organizationId: v.optional(v.string()),
  resourceType: v.optional(v.string()),  // 'route', 'mutation', 'query'
  resourceId: v.optional(v.string()),    // route path, function name

  // Decision
  decision: v.union(v.literal('allow'), v.literal('deny')),
  reason: v.optional(v.string()),

  // Context
  requiredRoles: v.optional(v.array(v.string())),
  userRoles: v.optional(v.array(v.string())),

  // Client info
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
})
  .index('by_userId', ['userId'])
  .index('by_organizationId', ['organizationId'])
  .index('by_timestamp', ['timestamp'])
  .index('by_decision_timestamp', ['decision', 'timestamp']),
```

### 6.4 API Contracts

#### Authorization Check Endpoint

```typescript
// packages/backend/convex/models/authorization.ts

export const checkRouteAccess = query({
  args: {
    organizationId: v.string(),
    routePath: v.string(),
  },
  returns: v.object({
    authorized: v.boolean(),
    reason: v.optional(v.string()),
    redirectTo: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Get user and membership
    // Check route permissions
    // Log decision
    // Return result
  },
});
```

---

## 7. Implementation Roadmap

### 7.1 Phase 1: Critical Fixes (Week 1)

**Objective**: Close immediate security gaps

| Task | Priority | Effort |
|------|----------|--------|
| Add RouteGuard to coach layout | P0 | 2 hrs |
| Add RouteGuard to parent layout | P0 | 2 hrs |
| Create AccessDenied component | P0 | 3 hrs |
| Create useAuthorization hook | P0 | 4 hrs |
| Test all protected routes | P0 | 4 hrs |

**Deliverables**:
- Coach portal requires coach functional role
- Parent portal requires parent functional role
- Graceful access denied messaging
- No redirect loops

### 7.2 Phase 2: Backend Hardening (Week 2)

**Objective**: Add server-side authorization

| Task | Priority | Effort |
|------|----------|--------|
| Create authorization.ts helpers | P1 | 4 hrs |
| Add auth to sensitive mutations | P1 | 8 hrs |
| Add auth to API routes | P1 | 4 hrs |
| Add integration tests | P1 | 6 hrs |

**Deliverables**:
- Backend mutations verify caller identity
- API routes require authentication
- Mutations reject unauthorized callers
- Test coverage for auth paths

### 7.3 Phase 3: Audit & Monitoring (Week 3)

**Objective**: Enable security monitoring

| Task | Priority | Effort |
|------|----------|--------|
| Create authorizationLogs table | P2 | 2 hrs |
| Add logging to auth decisions | P2 | 4 hrs |
| Create admin audit log viewer | P2 | 6 hrs |
| Set up alerts for anomalies | P2 | 4 hrs |

**Deliverables**:
- All auth decisions logged
- Admin can view access patterns
- Alerts on suspicious activity
- Compliance audit trail

### 7.4 Phase 4: Enhanced UX (Week 4)

**Objective**: Polish user experience

| Task | Priority | Effort |
|------|----------|--------|
| Hide nav items user can't access | P2 | 4 hrs |
| Add "Request Access" flows | P3 | 6 hrs |
| Improve error messages | P2 | 4 hrs |
| Add role explanation tooltips | P3 | 3 hrs |

**Deliverables**:
- Navigation reflects user's access
- Users can request elevated access
- Clear, helpful error messaging
- Self-service role understanding

### 7.5 Gantt Chart

```
Week 1: ████████████████████████████████ Phase 1 (Critical)
Week 2: ████████████████████████████████ Phase 2 (Backend)
Week 3: ████████████████████████████████ Phase 3 (Audit)
Week 4: ████████████████████████████████ Phase 4 (UX)
        |----|----|----|----|----|----|----|----|
        D1   D2   D3   D4   D5   D6   D7   D8
```

---

## 8. Success Metrics

### 8.1 Security Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Routes without auth | 67% | 0% | Code audit |
| Backend mutations without auth | ~80% | <10% | Code audit |
| Unauthorized access attempts blocked | 0% | 100% | Audit logs |
| Time to detect breach attempt | N/A | <5 min | Alerting |

### 8.2 User Experience Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Users seeing "Something went wrong" for auth issues | High | 0 | Error tracking |
| Auth-related support tickets | Unknown | -50% | Support system |
| User satisfaction with access denied UX | N/A | >80% | Survey |
| Navigation confusion rate | Unknown | <5% | Analytics |

### 8.3 Compliance Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Authorization decisions logged | 0% | 100% | Audit logs |
| Audit log retention | N/A | 90 days | System config |
| Time to generate compliance report | N/A | <1 hour | Process |

---

## 9. Security Considerations

### 9.1 Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| URL manipulation | High | High | Route guards, backend auth |
| Session hijacking | Medium | Critical | Better Auth security |
| Privilege escalation | Medium | Critical | Backend role verification |
| Cross-org data access | Medium | High | Org isolation at data layer |
| Insider threat | Low | High | Audit logging, least privilege |

### 9.2 Security Testing Requirements

1. **Penetration Testing**: Quarterly external pentest
2. **Code Review**: Security-focused review for auth changes
3. **Automated Scanning**: SAST/DAST in CI pipeline
4. **Access Control Testing**: Automated tests for each role combination

### 9.3 Incident Response

1. **Detection**: Audit log monitoring, anomaly alerts
2. **Response**: Immediate session revocation capability
3. **Investigation**: Full audit trail available
4. **Recovery**: Role restoration procedures documented

### 9.4 Data Protection Compliance

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| GDPR Art. 25 | Privacy by design | Default deny, explicit allow |
| GDPR Art. 32 | Security measures | Multi-layer authorization |
| COPPA | Parental access | Parent role verification |
| SOC 2 | Access controls | Audit logging, role-based access |

---

## 10. Appendices

### 10.1 Appendix A: Current Route Audit

| Route Pattern | Current Protection | Required Protection |
|--------------|-------------------|-------------------|
| `/orgs/[orgId]/admin/*` | ✅ Better Auth role check | ✅ Sufficient |
| `/orgs/[orgId]/coach/*` | ❌ None | Coach functional role |
| `/orgs/[orgId]/coach/players` | ❌ None | Coach functional role |
| `/orgs/[orgId]/coach/voice-notes` | ❌ None | Coach functional role |
| `/orgs/[orgId]/coach/assess` | ❌ None | Coach functional role |
| `/orgs/[orgId]/coach/injuries` | ❌ None | Coach functional role |
| `/orgs/[orgId]/coach/medical` | ❌ None | Coach functional role |
| `/orgs/[orgId]/parents/*` | ❌ None | Parent functional role |
| `/orgs/[orgId]/parents/children` | ❌ None | Parent + linked child check |
| `/orgs/[orgId]/players/[id]` | ⚠️ UI-only | Coach/Parent/Admin |
| `/api/recommendations` | ❌ None | Authenticated + rate limit |
| `/api/session-plan` | ❌ None | Authenticated + rate limit |

### 10.2 Appendix B: Role-Permission Matrix

| Permission | Owner | Admin | Coach | Parent | Member |
|-----------|-------|-------|-------|--------|--------|
| View org dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View coach portal | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create assessments | ✅ | ✅ | ✅ | ❌ | ❌ |
| View parent portal | ✅ | ✅ | ❌ | ✅ | ❌ |
| View linked children | ✅ | ✅ | ✅ | ✅* | ❌ |
| View all players | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ | ❌ | ❌ |

*Parents can only view their linked children

### 10.3 Appendix C: Error Message Catalog

| Code | Message | User Action |
|------|---------|-------------|
| AUTH_001 | "Please sign in to continue" | Redirect to login |
| AUTH_002 | "You're not a member of this organization" | Show "Request to Join" |
| AUTH_003 | "Coach access is required for this page" | Contact admin |
| AUTH_004 | "Parent/Guardian access is required" | Contact admin |
| AUTH_005 | "Admin access is required" | Contact owner |
| AUTH_006 | "This organization was not found" | Browse orgs |
| AUTH_007 | "Your account has been deactivated" | Contact support |
| AUTH_008 | "Session expired, please sign in again" | Redirect to login |

### 10.4 Appendix D: Testing Scenarios

**Test Case 1: Coach Route Access**
```
Given: User with member role (no coach functional role)
When: User navigates to /orgs/[orgId]/coach
Then: User sees Access Denied page
And: Message says "Coach access required"
And: User can click "Go Back" to return to org dashboard
```

**Test Case 2: Parent Route Access**
```
Given: User with coach functional role (no parent functional role)
When: User navigates to /orgs/[orgId]/parents
Then: User sees Access Denied page
And: Message says "Parent/Guardian access required"
```

**Test Case 3: Admin Can Access Coach Portal**
```
Given: User with admin functional role
When: User navigates to /orgs/[orgId]/coach
Then: User can access the coach portal
And: No access denied message shown
```

**Test Case 4: Backend Mutation Blocked**
```
Given: User without coach role
When: User attempts to call createSkillAssessment mutation
Then: Mutation throws "Forbidden" error
And: No assessment is created
And: Attempt is logged
```

### 10.5 Appendix E: Glossary

| Term | Definition |
|------|------------|
| **Better Auth Role** | Organization-level role from Better Auth (owner, admin, member) |
| **Functional Role** | Feature-access role (coach, parent, admin, player) |
| **Route Guard** | Component that checks authorization before rendering children |
| **Layout Guard** | Route guard implemented at the layout level |
| **Audit Log** | Record of authorization decisions for compliance |
| **Defense in Depth** | Multiple authorization layers for security |
| **RBAC** | Role-Based Access Control pattern |
| **Least Privilege** | Users get minimum permissions needed |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-12 | Platform Team | Initial draft |
| 1.1 | 2026-01-12 | Platform Team | Enhanced industry standards section with OWASP 2025, NIST, Zero Trust, ISO 27001, SOC 2, COPPA 2025, GDPR-K compliance requirements and references |

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Engineering Lead | | | |
| Security Lead | | | |
| Platform Architect | | | |
