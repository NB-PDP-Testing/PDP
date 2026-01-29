# Issue #347: PostHog Logs Not Showing for Active Users

## Root Cause Analysis

### The Problem
User `martin.canning20@googlemail.com` (UserID: `k17916vdtmvdykfrfn2qq8v0ph7zxvn5`) is **actively using the production system** (confirmed via Convex logs showing role switches) but is **completely invisible in PostHog analytics**.

### Root Cause: Client-Side Only Tracking
Our current PostHog implementation relies **exclusively on client-side JavaScript tracking**. This is blocked by:
- Ad blockers (uBlock Origin, AdBlock Plus, etc.)
- Privacy-focused browsers (Brave, Firefox with strict protection)
- Safari's Intelligent Tracking Prevention
- Browser extensions (Privacy Badger, Ghostery)

**Industry data shows 10-25% of users block client-side tracking scripts.**

### Evidence
| System | User Visible? | Proof |
|--------|---------------|-------|
| Convex Database | ✅ Yes | User record exists, created Jan 25, 2026 @ 20:32 UTC |
| Convex Logs | ✅ Yes | Multiple `switchActiveFunctionalRole` mutations logged |
| PostHog | ❌ No | No events, no person profile, no session recordings |

---

## Current Implementation Status

### What's Working (Client-Side)
- ✅ PostHog Provider initialization
- ✅ Feature flag bootstrap (server-side fetching via `proxy.ts`)
- ✅ User identification on login (`posthog.identify()`)
- ✅ Page view tracking (`$pageview`)
- ✅ Auth events: `user_signed_up`, `user_logged_in`, `user_logged_out`

### What's NOT Working
- ❌ **Backend tracking not connected** - `trackEvent()` in `convex/lib/analytics.ts` only logs to console
- ❌ **60+ defined events never sent** - Organization, team, player, voice note, goal, injury events
- ❌ **No server-side tracking** - All tracking depends on client JavaScript

### Code Evidence
```typescript
// packages/backend/convex/lib/analytics.ts (current)
export function trackEvent(ctx, event) {
  console.log("[Analytics]", event.event, event.properties || {});
  // TODO: Send to PostHog via API  <-- THIS IS THE PROBLEM
}
```

---

## Comprehensive Review Findings

### Architecture Analysis

#### Files Reviewed
| File | Purpose | Status |
|------|---------|--------|
| `apps/web/src/providers/posthog-provider.tsx` | Client-side PostHog init | ✅ Working |
| `apps/web/src/providers/posthog-auth-tracker.tsx` | User identification | ⚠️ Partial (missing org/role) |
| `apps/web/src/providers/posthog-pageview.tsx` | Page view tracking | ✅ Working |
| `apps/web/src/proxy.ts` | Server-side feature flags | ✅ Working |
| `apps/web/src/lib/analytics.ts` | Frontend analytics hook | ✅ Working |
| `packages/backend/convex/lib/analytics.ts` | Backend tracking | ❌ **NOT CONNECTED** |
| `docs/setup/posthog-analytics.md` | Implementation guide | Documents ~95 events to implement |

#### Event Tracking Status
| Category | Events Defined | Events Implemented | Completion |
|----------|---------------|-------------------|------------|
| Authentication | 5 | 3 | 60% |
| Organization | 4 | 0 | 0% |
| Join Requests | 3 | 0 | 0% |
| Teams | 3 | 0 | 0% |
| Players | 4 | 0 | 0% |
| Voice Notes | 4 | 0 | 0% |
| Skills | 3 | 0 | 0% |
| Goals | 5 | 0 | 0% |
| Injuries | 4 | 0 | 0% |
| Guardians | 3 | 0 | 0% |
| **Total** | **40+** | **3** | **~7%** |

---

## Industry Best Practices Research

### Sources Consulted
1. [PostHog Node.js SDK Documentation](https://posthog.com/docs/libraries/node)
2. [PostHog Next.js Integration Guide](https://posthog.com/docs/libraries/next-js)
3. [Segment Naming Conventions for Clean Data](https://segment.com/academy/collecting-data/naming-conventions-for-clean-data/)
4. [Avo Event Naming Best Practices](https://www.avo.app/docs/data-design/best-practices/naming-conventions)
5. [Server-Side Tracking to Bypass Ad Blockers (2025)](https://www.marvelpixel.io/resources/how-to-use-server-side-tracking-to-bypass-ad-blockers-in-2025)
6. [Ad Blockers and Server-Side Tracking Analysis](https://lukas-oldenburg.medium.com/ad-blockers-and-server-side-tracking-part-1-the-ever-more-challenging-world-of-client-side-ace3b1c049b)

### Key Findings

#### 1. Hybrid Tracking is Industry Standard
> "Track events on both the frontend and backend whenever possible. This ensures maximum reliability." - PostHog Documentation

#### 2. Server-Side for Business-Critical Events
> "We strongly recommend tracking sign-up events and CRUD events from the server-side, given how high value these events are." - PostHog Best Practices

#### 3. Ad Blocker Impact is Significant
> "The rough percentage of users who block tracking scripts goes from between 10% of users to 25%, depending on the type of users." - Industry Analysis

#### 4. Serverless Considerations
> "When using PostHog in an AWS Lambda function or similar serverless environment, set `flushAt` to 1 and `flushInterval` to 0. Always call `await posthog.shutdown()` at the end." - PostHog Node.js Docs

---

## Recommended Solution: Server-Side Tracking

### Option 1: `@samhoque/convex-posthog` Component (RECOMMENDED)

A purpose-built Convex component for server-side PostHog tracking.

**Package:** [@samhoque/convex-posthog](https://www.npmjs.com/package/@samhoque/convex-posthog)
**Version:** 0.1.1 (Apache-2.0 license)
**Last Updated:** ~3 months ago

#### Features
- Non-blocking (uses `ctx.scheduler.runAfter(0, ...)`)
- Full TypeScript support
- Designed for Convex's serverless model
- Simple API

#### Implementation
```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import posthog from "@samhoque/convex-posthog/convex.config";

const app = defineApp();
app.use(posthog);
export default app;
```

```typescript
// convex/lib/analytics.ts (updated)
import { PostHog } from "@samhoque/convex-posthog";
import { components } from "../_generated/api";

const posthog = new PostHog(components.posthog);

export async function track(ctx: MutationCtx, event: string, properties?: Record<string, any>) {
  const userId = await getUserId(ctx);
  if (userId) {
    await posthog.trackUserEvent(ctx, { userId, event, properties });
  }
}
```

### Option 2: Direct `posthog-node` SDK

Use PostHog's official Node SDK with manual serverless handling.

```typescript
import { PostHog } from "posthog-node";

const client = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: "https://eu.i.posthog.com",
  flushAt: 1,        // Flush immediately
  flushInterval: 0,  // No batching delay
});

// Must call flush() before function terminates
await client.flush();
```

---

## Implementation Plan

### Phase 1: Infrastructure (1-2 hours)
- [ ] Install `@samhoque/convex-posthog` package
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to Convex environment
- [ ] Update `convex.config.ts` to register component
- [ ] Update `convex/lib/analytics.ts` to use component

### Phase 2: Critical Business Events (2-3 hours)
Server-side tracking for high-value events:
- [ ] `user_signed_up` - Ensure captured even with ad blockers
- [ ] `invitation_accepted` - Track invite conversions
- [ ] `organization_created` - Track org growth
- [ ] `team_created` - Track team adoption
- [ ] `player_enrolled` - Track player growth
- [ ] `join_request_*` - Track onboarding funnel

### Phase 3: Feature Usage Events (2-3 hours)
- [ ] `voice_note_recorded` - Core feature usage
- [ ] `skill_assessment_completed` - Coach engagement
- [ ] `goal_created` - Development tracking adoption
- [ ] `injury_reported` - Health feature usage

### Phase 4: Enhanced User Context (1 hour)
Update user identification to include:
- [ ] `current_org_id` - Organization context
- [ ] `functional_roles` - User role (coach, parent, admin)
- [ ] `is_platform_staff` - Internal user flag

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HYBRID TRACKING ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CLIENT-SIDE (existing)              SERVER-SIDE (new)              │
│  ┌─────────────────────────┐         ┌─────────────────────────┐   │
│  │ • $pageview             │         │ • user_signed_up        │   │
│  │ • user_logged_in/out    │         │ • invitation_accepted   │   │
│  │ • UI interactions       │         │ • organization_*        │   │
│  │ • Session recordings    │         │ • team_*                │   │
│  │ • Feature flag checks   │         │ • player_*              │   │
│  │ • A/B test exposure     │         │ • voice_note_*          │   │
│  └───────────┬─────────────┘         │ • skill_*               │   │
│              │                       │ • goal_*                │   │
│              ▼                       │ • injury_*              │   │
│         posthog-js                   └───────────┬─────────────┘   │
│      (can be blocked)                            │                 │
│              │                                   ▼                 │
│              │                    @samhoque/convex-posthog         │
│              │                       (cannot be blocked)           │
│              │                                   │                 │
│              └───────────────┬───────────────────┘                 │
│                              ▼                                     │
│                     ┌───────────────┐                              │
│                     │   PostHog     │                              │
│                     │   (EU Cloud)  │                              │
│                     └───────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

After implementation, we should see:
1. **100% of business-critical events captured** (regardless of ad blockers)
2. **Martin Canning visible in PostHog** with server-side events
3. **Complete onboarding funnel visibility** (signup → join request → approval → first action)
4. **Feature usage analytics** for voice notes, assessments, goals, injuries

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/backend/package.json` | Add `@samhoque/convex-posthog` dependency |
| `packages/backend/convex/convex.config.ts` | Register PostHog component |
| `packages/backend/convex/lib/analytics.ts` | Connect to PostHog API |
| `apps/web/src/providers/posthog-auth-tracker.tsx` | Add org/role to identify |
| Various model files | Add `track()` calls for events |

---

## Timeline Estimate

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Infrastructure | 1-2 hours | P0 - Critical |
| Phase 2: Business Events | 2-3 hours | P0 - Critical |
| Phase 3: Feature Events | 2-3 hours | P1 - High |
| Phase 4: User Context | 1 hour | P1 - High |
| **Total** | **6-9 hours** | |

---

## Related Documentation

- `docs/setup/posthog-analytics.md` - Existing implementation guide
- `packages/backend/convex/lib/analytics.ts` - Backend tracking helper
- `apps/web/src/lib/analytics.ts` - Frontend analytics hook

---

## Decision Required

**Recommendation:** Proceed with Option 1 (`@samhoque/convex-posthog`) for fastest implementation.

**Alternatives:**
- Option 2: Direct `posthog-node` - More control, more boilerplate
- Hybrid: Combine both - Best reliability, more complexity

Please confirm approach before implementation begins.
