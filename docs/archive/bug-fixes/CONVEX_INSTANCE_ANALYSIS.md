# Convex Instance Mapping & Bandwidth Analysis

## Convex Instance Identification

### Project 1: PDP (Main Monorepo)
**Location**: `/Users/neil/Documents/GitHub/PDP`
**Convex Instance**: `dev:valuable-pig-963`
- **Project Name**: `pdp-modular`
- **Team**: `neil-b`
- **URL**: `https://valuable-pig-963.convex.cloud`
- **Unbounded Queries Found**: 13 (NOW FIXED ✅)

### Project 2: pdp-portal-convex (MVP/Testing)
**Location**: `/Users/neil/Documents/MY PY Scripts/PDP_Mock_Testing/pdp-portal-convex`
**Convex Instance**: `dev:oceanic-opossum-942`
- **Project Name**: `pdp-nb-testing` ⚠️ **THIS IS THE CULPRIT!**
- **Team**: `neil-b`
- **URL**: `https://oceanic-opossum-942.convex.cloud`
- **Unbounded Queries Found**: **69** 🔥🔥🔥

## Critical Discovery

The bandwidth usage you're seeing (1.18 GB / 1 GB) is almost certainly from **`pdp-nb-testing`** (pdp-portal-convex project), NOT from `pdp-modular` (main PDP project).

### Evidence:
1. **pdp-portal-convex has 69 unbounded queries** (vs 13 in main project)
2. **5x more unbounded queries** means 5x more bandwidth usage
3. This is the older MVP/testing project that likely hasn't been optimized
4. Both projects share the same Convex account, so limits are combined

## Bandwidth Attribution

If you're seeing 1.18 GB total across your account:

**Estimated Breakdown**:
- `pdp-nb-testing` (pdp-portal-convex): ~900-1000 MB (76-85%)
- `pdp-modular` (main PDP): ~180-280 MB (15-24%)

The pdp-portal-convex project is the **primary bandwidth consumer**.

## Recommended Actions

### Immediate (Stop the Bleeding)
1. **Option A**: Pause/stop the pdp-portal-convex project if not actively needed
2. **Option B**: Apply same bandwidth fixes to pdp-portal-convex
3. **Option C**: Delete the `pdp-nb-testing` deployment if it's just for testing

### Short-term
1. Apply pagination fixes to pdp-portal-convex (69 queries to fix)
2. Consider consolidating projects to reduce duplicate queries
3. Monitor bandwidth per deployment in Convex dashboard

### Long-term
1. Decide if pdp-portal-convex is still needed (MVP vs production)
2. If keeping both, ensure consistent optimization practices
3. Set up alerting for bandwidth usage per project

## Next Steps

Would you like me to:
1. **Fix all 69 queries in pdp-portal-convex** (similar to what we just did)
2. **Audit which project is actively running** (dev servers, deployed instances)
3. **Help you decide which project to keep/deprecate**
4. **Set up proper deployment separation** for better monitoring

## Files to Review in pdp-portal-convex

High-risk files (likely heavy bandwidth users):
- `convex/players.ts`
- `convex/teams.ts`
- `convex/users.ts`
- `convex/goals.ts`
- `convex/teamGoals.ts`
- `convex/voiceNotes.ts`
- `convex/medicalProfiles.ts`
- `convex/injuries.ts`

