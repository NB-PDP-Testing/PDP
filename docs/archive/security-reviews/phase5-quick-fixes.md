# Phase 5 Security Quick Fixes

**CRITICAL:** These patches must be applied before Phase 5 can be deployed to production.

---

## Fix 1: getRecentArtifacts Auth Bypass (CRITICAL)

**File:** `packages/backend/convex/models/voiceNoteArtifacts.ts`

**Option A:** If this query is unused, delete it entirely:
```typescript
// DELETE lines 195-221 (the entire getRecentArtifacts query)
```

**Option B:** If needed for platform staff, add role check:
```typescript
export const getRecentArtifacts = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(artifactObjectValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Check platform staff role
    const user = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "user",
        where: [{ field: "_id", value: identity.subject, operator: "eq" }]
      }
    );

    if (!(user as any)?.isPlatformStaff) {
      throw new Error("Access denied: Platform staff only");
    }

    const limit = Math.min(
      args.limit ?? DEFAULT_RECENT_ARTIFACTS,
      MAX_RECENT_ARTIFACTS
    );

    return await ctx.db.query("voiceNoteArtifacts").order("desc").take(limit);
  },
});
```

---

## Fix 2: getDisambiguationQueue Cross-Org Leak (HIGH)

**File:** `packages/backend/convex/models/voiceNoteEntityResolutions.ts`

Replace lines 235-263 with:
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

    // Verify membership
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

## Fix 3: resolveEntity Missing Ownership Check (HIGH)

**File:** `packages/backend/convex/models/voiceNoteEntityResolutions.ts`

Add this helper function at the top of the file (after imports):
```typescript
/**
 * Verify that resolution belongs to authenticated user and they're in the org.
 * Throws error if validation fails.
 */
async function validateResolutionOwnership(
  ctx: { auth: any; db: any; runQuery: any },
  resolutionId: Id<"voiceNoteEntityResolutions">,
  userId: string
): Promise<{
  resolution: Doc<"voiceNoteEntityResolutions">;
  artifact: Doc<"voiceNoteArtifacts">;
}> {
  const resolution = await ctx.db.get(resolutionId);
  if (!resolution) {
    throw new Error("Resolution not found");
  }

  const artifact = await ctx.db.get(resolution.artifactId);
  if (!artifact) {
    throw new Error("Artifact not found");
  }

  if (artifact.senderUserId !== userId) {
    throw new Error("Access denied: Resolution does not belong to you");
  }

  const membership = await ctx.runQuery(
    components.betterAuth.adapter.findOne,
    {
      model: "member",
      where: [
        { field: "userId", value: userId, operator: "eq" },
        { field: "organizationId", value: resolution.organizationId, operator: "eq" }
      ]
    }
  );

  if (!membership) {
    throw new Error("Access denied: Not a member of this organization");
  }

  return { resolution, artifact };
}
```

Then update `resolveEntity` (line 273):
```typescript
handler: async (ctx, args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  // Validate ownership
  const { resolution } = await validateResolutionOwnership(
    ctx,
    args.resolutionId,
    identity.subject
  );

  // Validate score
  if (args.selectedScore < 0 || args.selectedScore > 1) {
    throw new Error("selectedScore must be between 0 and 1");
  }

  const now = Date.now();
  // ... rest of the function unchanged
```

Update `rejectResolution` (line 408):
```typescript
handler: async (ctx, args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  // Validate ownership
  const { resolution } = await validateResolutionOwnership(
    ctx,
    args.resolutionId,
    identity.subject
  );

  // Validate score
  if (args.topCandidateScore < 0 || args.topCandidateScore > 1) {
    throw new Error("topCandidateScore must be between 0 and 1");
  }

  // ... rest unchanged
```

Update `skipResolution` (line 444):
```typescript
handler: async (ctx, args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  // Validate ownership
  const { resolution } = await validateResolutionOwnership(
    ctx,
    args.resolutionId,
    identity.subject
  );

  // ... rest unchanged
```

---

## Fix 4: getDisambiguationForArtifact IDOR (HIGH)

**File:** `packages/backend/convex/models/voiceNoteEntityResolutions.ts`

Replace lines 210-229 with:
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

    // Verify artifact ownership
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

## Fix 5: Add components import (Required for Fixes 2-4)

**File:** `packages/backend/convex/models/voiceNoteEntityResolutions.ts`

Update the imports at the top:
```typescript
import { v } from "convex/values";
import { components, internal } from "../_generated/api";  // Add components
import type { Id, Doc } from "../_generated/dataModel";  // Add Doc
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
```

---

## Testing After Fixes

Run these manual tests to verify:

```typescript
// Test 1: Cross-org access blocked
const coach_a = await signIn({ email: "coach_a@org_a.com" });
const queue = await getDisambiguationQueue({ organizationId: "org_b_id" });
// Should throw "Access denied: Not a member of this organization"

// Test 2: Cross-coach resolution blocked
const coach_b_resolution_id = "jd7...abc";  // Resolution created by coach B
await resolveEntity({
  resolutionId: coach_b_resolution_id,
  resolvedEntityId: "player_id",
  resolvedEntityName: "John Smith",
  selectedScore: 0.95,
});
// Should throw "Access denied: Resolution does not belong to you"

// Test 3: Invalid score rejected
await resolveEntity({
  resolutionId: valid_id,
  resolvedEntityId: "player_id",
  resolvedEntityName: "John Smith",
  selectedScore: 5.0,  // Invalid score
});
// Should throw "selectedScore must be between 0 and 1"
```

---

## Deployment Checklist

- [ ] Apply Fix 1 (getRecentArtifacts)
- [ ] Apply Fix 2 (getDisambiguationQueue)
- [ ] Apply Fix 3 (resolveEntity + rejectResolution + skipResolution)
- [ ] Apply Fix 4 (getDisambiguationForArtifact)
- [ ] Apply Fix 5 (imports)
- [ ] Run Convex codegen: `npx -w packages/backend convex codegen`
- [ ] Run type check: `npm run check-types`
- [ ] Manual security testing (3 tests above)
- [ ] Deploy to staging
- [ ] QA verification
- [ ] Deploy to production

**Estimated time:** 2-3 hours for all fixes + testing
