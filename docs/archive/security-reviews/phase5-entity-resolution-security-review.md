# Phase 5 Entity Resolution Security Review
**Date:** 2026-02-07
**Commit Range:** 4b4a4f27..71bc8088
**Reviewer:** Claude Code Agent (Security Review)
**Scope:** Voice Note Entity Resolution & Disambiguation System

---

## Executive Summary

Phase 5 implementation introduces entity resolution and disambiguation for voice note processing. The review identified **1 CRITICAL vulnerability**, **3 HIGH-severity issues**, and **2 MEDIUM-severity issues** requiring immediate attention before production deployment.

**Overall Security Posture:** ⚠️ **NOT PRODUCTION READY**

---

## Findings

### 🔴 CRITICAL - Auth Bypass in getRecentArtifacts Query

**Severity:** CRITICAL
**File:** `packages/backend/convex/models/voiceNoteArtifacts.ts` (lines 195-221)
**CWE:** CWE-306 (Missing Authentication)

**Vulnerability:**
```typescript
export const getRecentArtifacts = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(artifactObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];  // ❌ Returns empty array instead of throwing error
    }
    const limit = Math.min(
      args.limit ?? DEFAULT_RECENT_ARTIFACTS,
      MAX_RECENT_ARTIFACTS
    );
    return await ctx.db.query("voiceNoteArtifacts").order("desc").take(limit);
    // ❌ NO organizationId filter - returns artifacts from ALL orgs
    // ❌ NO coach ownership check - returns artifacts from ALL coaches
  },
});
```

**Risk:**
- Any authenticated user can access voice note artifacts from ALL organizations
- Exposes sensitive audio metadata including `senderUserId`, `orgContextCandidates`, `whatsappMessageId`
- Violates multi-tenancy isolation guarantees

**Exploitation:**
```typescript
// Attacker in Org A can read artifacts from Org B
const allArtifacts = await ctx.runQuery(
  api.models.voiceNoteArtifacts.getRecentArtifacts,
  { limit: 200 }
);
// Returns artifacts from ALL organizations
```

**Remediation:**
```typescript
export const getRecentArtifacts = query({
  args: {
    organizationId: v.string(),  // Add required org filter
    limit: v.optional(v.number()),
  },
  returns: v.array(artifactObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");  // Don't silently return []
    }

    // Verify user is member of requested org
    const membership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: identity.subject, operator: "eq" },
          { field: "organizationId", value: args.organizationId, operator: "eq" }
        ]
      }
    );
    if (!membership) {
      throw new Error("Access denied: Not a member of this organization");
    }

    const limit = Math.min(
      args.limit ?? DEFAULT_RECENT_ARTIFACTS,
      MAX_RECENT_ARTIFACTS
    );

    return await ctx.db
      .query("voiceNoteArtifacts")
      .withIndex("by_org", q => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(limit);
  },
});
```

**Note:** This query appears unused in the current diff. If it's for a future feature (platform claims viewer), it needs platform staff role check instead.

---

### 🟠 HIGH - Cross-Org Data Leakage in getDisambiguationQueue

**Severity:** HIGH
**File:** `packages/backend/convex/models/voiceNoteEntityResolutions.ts` (lines 235-263)
**CWE:** CWE-639 (Insecure Direct Object Reference)

**Vulnerability:**
```typescript
export const getDisambiguationQueue = query({
  args: {
    organizationId: v.string(),  // ✅ Takes orgId as input
    limit: v.optional(v.number()),
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];  // ✅ Auth check exists
    }

    const limit = Math.min(
      args.limit ?? DEFAULT_DISAMBIGUATION_LIMIT,
      MAX_DISAMBIGUATION_LIMIT
    );

    return await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_org_and_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", "needs_disambiguation")
      )
      .order("desc")
      .take(limit);
    // ❌ NO membership verification - accepts ANY organizationId
  },
});
```

**Risk:**
- User in Org A can query disambiguation queue for Org B by changing `organizationId` parameter
- Exposes player names, coach aliases, and entity matching data across org boundaries
- Violates org-scoped data isolation

**Exploitation:**
```typescript
// Attacker enumerates all org IDs and harvests player data
const stolenData = await ctx.runQuery(
  api.models.voiceNoteEntityResolutions.getDisambiguationQueue,
  { organizationId: "victim_org_id", limit: 200 }
);
// Returns resolutions with player names, rawText mentions
```

**Remediation:**
```typescript
export const getDisambiguationQueue = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // ✅ Verify user is member of requested org
    const membership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: identity.subject, operator: "eq" },
          { field: "organizationId", value: args.organizationId, operator: "eq" }
        ]
      }
    );
    if (!membership) {
      throw new Error("Access denied: Not a member of this organization");
    }

    const limit = Math.min(
      args.limit ?? DEFAULT_DISAMBIGUATION_LIMIT,
      MAX_DISAMBIGUATION_LIMIT
    );

    return await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_org_and_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("status", "needs_disambiguation")
      )
      .order("desc")
      .take(limit);
  },
});
```

---

### 🟠 HIGH - Missing Coach Ownership Validation in resolveEntity

**Severity:** HIGH
**File:** `packages/backend/convex/models/voiceNoteEntityResolutions.ts` (lines 265-400)
**CWE:** CWE-639 (Authorization Bypass)

**Vulnerability:**
```typescript
export const resolveEntity = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    resolvedEntityId: v.string(),
    resolvedEntityName: v.string(),
    selectedScore: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Auth guard
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // 2. Get the resolution record
    const resolution = await ctx.db.get(args.resolutionId);
    if (!resolution) {
      throw new Error("Resolution not found");
    }
    // ❌ NO check that resolution belongs to authenticated user's artifacts
    // ❌ NO check that user is member of resolution.organizationId
    // ❌ Attacker can resolve ANY resolution if they know the ID

    const now = Date.now();

    // 3. Update THIS resolution: user_resolved
    await ctx.db.patch(args.resolutionId, { ... });

    // 4-7. Update claims, batch same-name resolutions, store aliases...
  },
});
```

**Risk:**
- Coach A can resolve Coach B's entity mentions if they guess/enumerate resolution IDs
- Cross-coach data pollution (Coach A creates alias in Coach B's namespace)
- Integrity violation (wrong coach credited for disambiguation decisions)

**Exploitation:**
```typescript
// Attacker enumerates resolution IDs and hijacks another coach's resolutions
for (let i = 0; i < 1000; i++) {
  const resolutionId = `jd7...${i}` as Id<"voiceNoteEntityResolutions">;
  await resolveEntity({
    resolutionId,
    resolvedEntityId: "attacker_entity",
    resolvedEntityName: "Polluted Data",
    selectedScore: 1.0,
  });
  // Resolves other coaches' resolutions, creates aliases in their namespace
}
```

**Remediation:**
```typescript
export const resolveEntity = mutation({
  args: { /* same */ },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const resolution = await ctx.db.get(args.resolutionId);
    if (!resolution) {
      throw new Error("Resolution not found");
    }

    // ✅ Get artifact to verify ownership
    const artifact = await ctx.db.get(resolution.artifactId);
    if (!artifact) {
      throw new Error("Artifact not found");
    }

    // ✅ Verify artifact belongs to authenticated user
    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Resolution does not belong to you");
    }

    // ✅ Verify user is member of resolution's organization
    const membership = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "member",
        where: [
          { field: "userId", value: identity.subject, operator: "eq" },
          { field: "organizationId", value: resolution.organizationId, operator: "eq" }
        ]
      }
    );
    if (!membership) {
      throw new Error("Access denied: Not a member of this organization");
    }

    // ✅ Optionally check coach role
    const hasCoachRole = (membership as any).functionalRoles?.includes("Coach");
    if (!hasCoachRole) {
      throw new Error("Access denied: Coach role required");
    }

    // Now proceed with resolution...
  },
});
```

**Same Issue Exists In:**
- `rejectResolution` (lines 401-436)
- `skipResolution` (lines 437-472)

All three mutations need identical ownership validation.

---

### 🟠 HIGH - getDisambiguationForArtifact Missing Ownership Check

**Severity:** HIGH
**File:** `packages/backend/convex/models/voiceNoteEntityResolutions.ts` (lines 210-229)
**CWE:** CWE-639 (IDOR)

**Vulnerability:**
```typescript
export const getDisambiguationForArtifact = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId_and_status", (q) =>
        q.eq("artifactId", args.artifactId).eq("status", "needs_disambiguation")
      )
      .collect();
    // ❌ NO check that artifactId belongs to authenticated user
  },
});
```

**Risk:**
- User can view disambiguation data for ANY artifact by changing `artifactId` parameter
- Exposes player names and entity candidates across coaches/orgs

**Remediation:**
```typescript
export const getDisambiguationForArtifact = query({
  args: {
    artifactId: v.id("voiceNoteArtifacts"),
  },
  returns: v.array(resolutionObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // ✅ Get artifact and verify ownership
    const artifact = await ctx.db.get(args.artifactId);
    if (!artifact) {
      return [];
    }

    if (artifact.senderUserId !== identity.subject) {
      throw new Error("Access denied: Artifact does not belong to you");
    }

    return await ctx.db
      .query("voiceNoteEntityResolutions")
      .withIndex("by_artifactId_and_status", (q) =>
        q.eq("artifactId", args.artifactId).eq("status", "needs_disambiguation")
      )
      .collect();
  },
});
```

---

### 🟡 MEDIUM - Input Validation Missing for Entity IDs

**Severity:** MEDIUM
**File:** `packages/backend/convex/models/voiceNoteEntityResolutions.ts` (lines 265-400)
**CWE:** CWE-20 (Improper Input Validation)

**Vulnerability:**
```typescript
export const resolveEntity = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    resolvedEntityId: v.string(),  // ❌ Accepts ANY string
    resolvedEntityName: v.string(), // ❌ Accepts ANY string
    selectedScore: v.number(),      // ❌ No bounds check
  },
  // ...
  handler: async (ctx, args) => {
    // No validation that resolvedEntityId is a valid player/team/coach ID
    // No validation that resolvedEntityName matches resolvedEntityId
    // No validation that selectedScore is 0-1
  },
});
```

**Risk:**
- Attacker can inject arbitrary entity IDs that don't exist
- Score values outside 0-1 range corrupt analytics
- Invalid entityName values don't match database records

**Exploitation:**
```typescript
await resolveEntity({
  resolutionId: validId,
  resolvedEntityId: "'; DROP TABLE players; --",  // SQL injection attempt (Convex not vulnerable but shows lack of validation)
  resolvedEntityName: "<script>alert('xss')</script>",
  selectedScore: 9999,  // Invalid score
});
```

**Remediation:**
```typescript
export const resolveEntity = mutation({
  args: {
    resolutionId: v.id("voiceNoteEntityResolutions"),
    resolvedEntityId: v.string(),
    resolvedEntityName: v.string(),
    selectedScore: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // ✅ Validate score bounds
    if (args.selectedScore < 0 || args.selectedScore > 1) {
      throw new Error("selectedScore must be between 0 and 1");
    }

    // ✅ Validate entityId format (Convex IDs are specific format)
    if (args.resolvedEntityId.startsWith("jd7")) {
      // Looks like Convex ID - verify it exists
      try {
        const entity = await ctx.db.get(args.resolvedEntityId as Id<"playerIdentities">);
        if (!entity) {
          throw new Error("Invalid entity ID: player not found");
        }
      } catch {
        throw new Error("Invalid entity ID format");
      }
    }

    // ✅ Sanitize entity name (basic length check)
    if (args.resolvedEntityName.length > 200) {
      throw new Error("Entity name too long");
    }

    // Continue with resolution...
  },
});
```

---

### 🟡 MEDIUM - Missing Index for Coach Alias Lookup

**Severity:** MEDIUM
**File:** `packages/backend/convex/schema.ts` + `models/coachPlayerAliases.ts`
**CWE:** CWE-400 (Performance Issue / DoS)

**Issue:**
The `coachPlayerAliases` table has index:
```typescript
.index("by_coach_org_rawText", ["coachUserId", "organizationId", "rawText"])
.index("by_coach_org", ["coachUserId", "organizationId"])
```

But the `lookupAlias` query does:
```typescript
return await ctx.db
  .query("coachPlayerAliases")
  .withIndex("by_coach_org_rawText", (q) =>
    q
      .eq("coachUserId", args.coachUserId)
      .eq("organizationId", args.organizationId)
      .eq("rawText", normalized)  // ✅ Uses composite index correctly
  )
  .first();
```

**Status:** ✅ **False Alarm** - Index is correctly defined and used. This is actually secure.

However, there's a **normalization inconsistency**:
```typescript
// In entityResolution.ts (action):
const rawText = mention.rawText.toLowerCase().trim();

// In coachPlayerAliases.ts (mutation):
const normalized = args.rawText.toLowerCase().trim();
```

Both normalize identically, but the action passes pre-normalized text. If normalization changes in one place but not the other, alias lookups will fail silently.

**Recommendation:**
```typescript
// Create shared normalization function
export function normalizePlayerName(rawText: string): string {
  return rawText.toLowerCase().trim();
}
```

---

## Additional Security Observations

### ✅ **GOOD:** Internal Action Security
The `resolveEntities` action is correctly marked as `internalAction` and can only be called by the backend scheduler, not by clients. This prevents direct manipulation of the entity resolution pipeline.

### ✅ **GOOD:** Alias Learning Uses Normalized Keys
Coach aliases normalize `rawText` before storage, preventing case-sensitivity issues and ensuring consistent lookups.

### ✅ **GOOD:** Batch Resolution Prevents Race Conditions
The `resolveEntity` mutation handles batch updates for same-name resolutions in a single transaction, preventing race conditions.

### ⚠️ **CONCERN:** Frontend Direct Mutation Access
The disambiguation UI (`disambiguation/[artifactId]/page.tsx`) directly calls mutations without server-side validation:
```typescript
const resolveEntity = useMutation(api.models.voiceNoteEntityResolutions.resolveEntity);
```

This is secure IF the mutations themselves have proper auth checks (which they currently lack - see HIGH findings above).

### ⚠️ **CONCERN:** No Rate Limiting on Disambiguation Actions
A malicious coach could spam the `resolveEntity` mutation to:
- Create thousands of junk aliases
- Trigger analytics events (potential DoS on analytics writes)
- Exhaust Convex function call budget

**Recommendation:** Add per-user rate limiting:
```typescript
const rateLimitKey = `resolve_entity:${identity.subject}`;
const recentCalls = await ctx.scheduler.listScheduledJobs({ key: rateLimitKey });
if (recentCalls.length > 100) {
  throw new Error("Rate limit exceeded: Too many disambiguation actions");
}
```

---

## Schema Security Analysis

### voiceNoteEntityResolutions Table
```typescript
voiceNoteEntityResolutions: defineTable({
  claimId: v.id("voiceNoteClaims"),
  artifactId: v.id("voiceNoteArtifacts"),
  mentionIndex: v.number(),
  mentionType: v.union(...),
  rawText: v.string(),  // ⚠️ PII - player names
  candidates: v.array(...),  // ⚠️ PII - player names in candidates
  status: v.union(...),
  resolvedEntityId: v.optional(v.string()),
  resolvedEntityName: v.optional(v.string()),  // ⚠️ PII
  resolvedAt: v.optional(v.number()),
  organizationId: v.string(),  // ✅ Org isolation field
  createdAt: v.number(),
})
  .index("by_claimId", ["claimId"])
  .index("by_artifactId", ["artifactId"])
  .index("by_artifactId_and_status", ["artifactId", "status"])
  .index("by_org_and_status", ["organizationId", "status"]);
```

**Missing Index:** No index for `by_coach_and_org` to efficiently filter resolutions by coach ownership. Currently requires joining through `artifactId` → `artifact.senderUserId`.

**Recommendation:**
```typescript
// Add to schema
.index("by_org_and_artifact", ["organizationId", "artifactId"])
```

---

## Testing Recommendations

### Security Test Cases (HIGH PRIORITY)

1. **Cross-Org Access Test:**
   ```typescript
   // Coach in Org A tries to access Org B's disambiguation queue
   test("getDisambiguationQueue rejects cross-org access", async () => {
     const coachA = await createCoach({ orgId: "org_a" });
     expect(() =>
       getDisambiguationQueue({ organizationId: "org_b" })
     ).rejects.toThrow("Access denied");
   });
   ```

2. **Cross-Coach Resolution Test:**
   ```typescript
   // Coach A tries to resolve Coach B's resolution
   test("resolveEntity rejects cross-coach access", async () => {
     const coachB_resolution = await createResolution({ coach: "coach_b" });
     expect(() =>
       resolveEntity({ resolutionId: coachB_resolution._id, ... })
     ).rejects.toThrow("Access denied");
   });
   ```

3. **Enumeration Attack Test:**
   ```typescript
   // Attacker tries to enumerate all artifacts
   test("getRecentArtifacts enforces org membership", async () => {
     const attacker = await createUser({ orgId: "org_attacker" });
     const result = await getRecentArtifacts({ organizationId: "org_victim" });
     expect(result).toEqual([]);  // Should throw instead
   });
   ```

---

## Remediation Priority

| Priority | Finding | Estimated Effort | Blocker? |
|----------|---------|------------------|----------|
| P0 | CRITICAL: getRecentArtifacts auth bypass | 2 hours | YES |
| P0 | HIGH: getDisambiguationQueue cross-org | 2 hours | YES |
| P0 | HIGH: resolveEntity ownership check | 4 hours | YES |
| P0 | HIGH: getDisambiguationForArtifact IDOR | 2 hours | YES |
| P1 | MEDIUM: Input validation | 3 hours | NO |
| P2 | MEDIUM: Rate limiting | 4 hours | NO |

**Total Critical Path:** ~10 hours of security fixes before Phase 5 can ship.

---

## Sign-Off Checklist

- [ ] All P0 findings remediated
- [ ] Security test cases added for cross-org/cross-coach access
- [ ] Input validation added for all public mutations
- [ ] Rate limiting implemented for disambiguation actions
- [ ] Manual pen-test performed by security reviewer
- [ ] Code reviewed by second engineer
- [ ] QA sign-off with security test plan

---

## References

- **OWASP Top 10 2021:** A01:2021 – Broken Access Control
- **CWE-639:** Authorization Bypass Through User-Controlled Key
- **CWE-306:** Missing Authentication for Critical Function
- **Better Auth Docs:** Organization membership validation patterns

---

**Reviewer Signature:** Claude Code Agent (Security Review)
**Date:** 2026-02-07
**Status:** ⚠️ **BLOCKED - CRITICAL ISSUES FOUND**
