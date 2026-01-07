# AI Key Management Approach Comparison

## Current Approaches

### Voice Notes (Convex Actions)
- **Location**: `packages/backend/convex/actions/voiceNotes.ts`
- **Environment Variable**: `OPENAI_API_KEY`
- **Setup Method**: Convex environment variables (`npx convex env set OPENAI_API_KEY`)
- **Access**: `process.env.OPENAI_API_KEY` in Convex actions
- **Provider**: OpenAI
- **Execution Context**: Convex backend (Node.js runtime)
- **Key Management**: Convex dashboard or CLI

### Coaches Dashboard (Next.js API Routes)
- **Location**: `apps/web/src/app/api/recommendations/route.ts` and `apps/web/src/app/api/session-plan/route.ts`
- **Environment Variable**: `ANTHROPIC_API_KEY`
- **Setup Method**: Next.js environment variables (`.env.local` for local, Vercel dashboard for production)
- **Access**: `process.env.ANTHROPIC_API_KEY` in Next.js API routes
- **Provider**: Anthropic Claude
- **Execution Context**: Next.js server (Vercel serverless functions)
- **Key Management**: Vercel dashboard or `.env.local`

## Comparison Table

| Aspect | Voice Notes | Coaches Dashboard |
|--------|-------------|-------------------|
| **Backend Framework** | Convex Actions | Next.js API Routes |
| **Env Var Location** | Convex | Next.js/Vercel |
| **Setup Command** | `npx convex env set` | Vercel dashboard or `.env.local` |
| **Provider** | OpenAI | Anthropic |
| **Key Variable** | `OPENAI_API_KEY` | `ANTHROPIC_API_KEY` |
| **Server-Side** | ✅ Yes | ✅ Yes |
| **Secure** | ✅ Yes | ✅ Yes |
| **Consistent** | ❌ Different approach | ❌ Different approach |

## Pros and Cons

### Voice Notes Approach (Convex)
**Pros:**
- ✅ Centralized backend logic in Convex
- ✅ Consistent with other Convex backend operations
- ✅ Easy to manage via Convex CLI
- ✅ Works well for scheduled/background tasks
- ✅ Can be called from other Convex functions

**Cons:**
- ❌ Requires Convex-specific setup
- ❌ Different from Next.js patterns
- ❌ Less familiar to Next.js developers

### Coaches Dashboard Approach (Next.js API Routes)
**Pros:**
- ✅ Standard Next.js pattern
- ✅ Easy to set up in Vercel
- ✅ Familiar to Next.js developers
- ✅ Works well for request/response patterns
- ✅ Can leverage Next.js middleware/authentication

**Cons:**
- ❌ Requires separate Vercel configuration
- ❌ Different from Convex backend patterns
- ❌ Less centralized

## Recommendation: Unified Approach

### Option 1: Move All AI to Convex Actions (Recommended for Consistency)

**Benefits:**
- ✅ Single location for all AI operations
- ✅ Consistent environment variable management
- ✅ Centralized error handling and logging
- ✅ Easier to add rate limiting and caching
- ✅ Better for background/scheduled tasks

**Implementation:**
1. Create Convex actions for recommendations and session plans
2. Move AI logic from Next.js API routes to Convex actions
3. Update `ai-service.ts` to call Convex actions instead of API routes
4. Use `ANTHROPIC_API_KEY` in Convex (set via `npx convex env set`)
5. Remove Next.js API routes

**Files to Change:**
- Create `packages/backend/convex/actions/coaching.ts`
- Update `apps/web/src/lib/ai-service.ts` to use Convex actions
- Remove `apps/web/src/app/api/recommendations/route.ts`
- Remove `apps/web/src/app/api/session-plan/route.ts`

### Option 2: Keep Current Approach but Standardize Documentation

**Benefits:**
- ✅ No code changes required
- ✅ Each approach works well for its use case
- ✅ Maintains separation of concerns

**Implementation:**
1. Document why each uses different approaches
2. Create unified setup guide that covers both
3. Add clear comments in code explaining the choice

### Option 3: Move Voice Notes to Next.js API Routes

**Benefits:**
- ✅ Single pattern (Next.js API routes)
- ✅ Easier for Next.js developers

**Cons:**
- ❌ Less optimal for Convex-based operations
- ❌ Would require refactoring voice notes
- ❌ Loses benefits of Convex actions (scheduling, etc.)

## Recommended Plan: Option 1

### Phase 1: Create Convex Actions for Coaching AI

1. **Create `packages/backend/convex/actions/coaching.ts`**:
   ```typescript
   "use node";
   
   import { internalAction } from "../_generated/server";
   import { v } from "convex/values";
   
   export const generateRecommendations = internalAction({
     args: { teamData: v.any() },
     returns: v.any(),
     handler: async (ctx, args) => {
       const apiKey = process.env.ANTHROPIC_API_KEY;
       if (!apiKey) {
         throw new Error("ANTHROPIC_API_KEY not set");
       }
       // Call Anthropic API
       // Return recommendations
     },
   });
   
   export const generateSessionPlan = internalAction({
     args: { teamData: v.any(), focus: v.optional(v.string()) },
     returns: v.string(),
     handler: async (ctx, args) => {
       // Similar implementation
     },
   });
   ```

2. **Update `apps/web/src/lib/ai-service.ts`**:
   - Replace `fetch("/api/recommendations")` with `ctx.runAction(api.actions.coaching.generateRecommendations)`
   - Replace `fetch("/api/session-plan")` with `ctx.runAction(api.actions.coaching.generateSessionPlan)`
   - Note: This requires passing Convex context, so may need to be called from a Convex query/mutation

### Phase 2: Update Environment Variable Setup

1. **Add to Convex environment**:
   ```bash
   npx convex env set ANTHROPIC_API_KEY
   ```

2. **Update documentation**:
   - Update `docs/AI_API_SETUP.md` to reflect Convex approach
   - Add instructions for Convex environment variables

### Phase 3: Clean Up

1. Remove Next.js API routes
2. Update any references to the old API routes
3. Test thoroughly

## Alternative: Hybrid Approach (If Option 1 is Too Complex)

If moving to Convex actions is too complex due to client-side calling patterns, we could:

1. **Keep Next.js API routes** for client-side calls
2. **Use Convex environment variables** for both:
   - Set `ANTHROPIC_API_KEY` in Convex
   - Set `ANTHROPIC_API_KEY` in Vercel
   - Document that both need to be set
3. **Standardize on single variable name** (`ANTHROPIC_API_KEY` for both)

## Decision Matrix

| Factor | Weight | Option 1 (Convex) | Option 2 (Keep Both) | Option 3 (Next.js Only) |
|--------|--------|-------------------|----------------------|------------------------|
| Consistency | High | ✅ Best | ❌ Poor | ✅ Good |
| Ease of Setup | Medium | ⚠️ Medium | ✅ Easy | ✅ Easy |
| Maintainability | High | ✅ Best | ⚠️ Medium | ⚠️ Medium |
| Developer Familiarity | Low | ⚠️ Medium | ✅ Best | ✅ Best |
| Scalability | High | ✅ Best | ⚠️ Medium | ⚠️ Medium |
| **Total Score** | | **Best** | Medium | Good |

## Final Recommendation

**Go with Option 1 (Move to Convex Actions)** because:
1. ✅ Better consistency across the codebase
2. ✅ Centralized AI operations
3. ✅ Easier to add features like caching, rate limiting
4. ✅ Better for future AI features
5. ✅ Aligns with existing voice notes pattern

**If Option 1 is too complex**, use the **Hybrid Approach**:
- Keep Next.js API routes for client-side calls
- Use same environment variable name (`ANTHROPIC_API_KEY`)
- Set in both Convex and Vercel
- Document clearly why both are needed

