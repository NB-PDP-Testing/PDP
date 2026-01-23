# Consolidated Learnings from Phases 1-3: Coach-Parent AI Summaries

**Extracted**: 2026-01-20
**Phases Covered**: Phase 1 (AI Summary Infrastructure), Phase 2 (Trust Levels), Phase 3 (Sensitive Content Handling)

---

## Critical Patterns - MUST FOLLOW

### 1. Convex Backend Patterns

```typescript
// ALWAYS use .withIndex(), NEVER use .filter()
const result = await ctx.db
  .query("coachParentSummaries")
  .withIndex("by_coach_org_status", q =>
    q.eq("coachId", coachId).eq("organizationId", orgId).eq("status", "pending_review")
  )
  .collect();

// Auth check pattern
const user = await authComponent.safeGetAuthUser(ctx);
if (!user?.userId) {
  throw new Error("Not authenticated");
}

// Guardian lookup pattern (for parent features)
const guardian = await ctx.db
  .query("guardianIdentities")
  .withIndex("by_userId", q => q.eq("userId", user.userId))
  .first();

// Guardian-player access verification
const link = await ctx.db
  .query("guardianPlayerLinks")
  .withIndex("by_guardian_and_player", q =>
    q.eq("guardianIdentityId", guardian._id).eq("playerIdentityId", playerId)
  )
  .first();
if (!link) throw new Error("Access denied");

// Storage pattern (for image uploads)
const storageId = await ctx.storage.store(new Blob([buffer]));
const url = await ctx.storage.getUrl(storageId);

// Local variable narrowing for optional args in callbacks
const status = args.status; // assign to const first
if (status) {
  query.withIndex("by_status", q => q.eq("status", status)); // now narrowed
}
```

### 2. TypeScript Patterns

```typescript
// DO: Use local const for narrowing
const sportCode = args.sportCode;
if (sportCode) {
  // sportCode is now string, not string | undefined
}

// DON'T: Try to narrow args directly in callbacks
if (args.sportCode) {
  // args.sportCode is STILL string | undefined here
}

// Regex patterns MUST be at top-level (not inline)
const SKILL_RATING_PATTERN = /pattern/i; // at module level

// NOT inside functions:
function handler() {
  const pattern = /pattern/i; // Biome error!
}
```

### 3. Biome Lint Rules - CRITICAL

```typescript
// NO increment operators
assignmentsUpdated += 1; // CORRECT
assignmentsUpdated++;    // ERROR

// NO non-null assertions
const value = obj.field!; // ERROR
const value = obj.field;  // Use narrowing instead
if (value) { /* now narrowed */ }

// Import handling - Biome AGGRESSIVELY removes unused imports
// SOLUTION: Use Write tool with complete file (imports + usage together)
// DON'T add imports separately with Edit tool

// Regex must be at top-level
const PATTERN = /regex/; // at file scope, not in function
```

### 4. React/Frontend Patterns

```tsx
// Import paths for Convex
import { api } from "@pdp/backend/convex/_generated/api"; // CORRECT
import { api } from "@/../convex/_generated/api";         // WRONG

// React key must be explicit JSX attribute
{items.map(item => <Card key={item._id} {...props} />)} // CORRECT
{items.map(item => <Card {...{key: item._id, ...props}} />)} // WRONG

// Conditional rendering with different components
// DON'T try to use a variable for component type
const CardComponent = isInjury ? InjuryCard : NormalCard;
return <CardComponent {...props} />; // TypeScript can't narrow

// DO use explicit if statements
if (sensitivityCategory === "injury") {
  return <InjuryApprovalCard {...injuryProps} />;
}
return <SummaryApprovalCard {...normalProps} />;

// Card loading state pattern
const [isApproving, setIsApproving] = useState(false);
const [isSuppressing, setIsSuppressing] = useState(false);
// Each card manages own state for better UX
```

---

## File Locations Reference

| Type | Location |
|------|----------|
| Schema | `packages/backend/convex/schema.ts` |
| Parent Summary Model | `packages/backend/convex/models/coachParentSummaries.ts` |
| Parent Summary Actions | `packages/backend/convex/actions/coachParentSummaries.ts` |
| Trust Levels Model | `packages/backend/convex/models/coachTrustLevels.ts` |
| Trust Calculator | `packages/backend/convex/lib/trustLevelCalculator.ts` |
| Parent Components | `apps/web/src/app/orgs/[orgId]/parents/components/` |
| Coach Components | `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/` |
| Shared Coach UI | `apps/web/src/components/coach/` |
| Layout Components | `apps/web/src/components/layout/` |

---

## Common Errors and Fixes

### Error: "File has been modified since read"
**Cause**: Biome auto-fixed the file while you were editing
**Fix**: Re-read the file before editing, or use Write for new files

### Error: Type not narrowing in callback
**Cause**: TypeScript can't narrow `args.field` inside callbacks
**Fix**: Assign to local const: `const field = args.field; if(field){...}`

### Error: Biome removes imports
**Cause**: Import added but usage not in same edit
**Fix**: Use Write tool to create complete file with imports + usage together

### Error: "Cannot find name 'internalMutation'"
**Cause**: Missing import from Convex server
**Fix**: Import from `"../_generated/server"`

### Error: Non-null assertion not allowed
**Cause**: Using `value!` to assert non-null
**Fix**: Use proper narrowing with if statements

---

## Existing Tables Schema Summary

### coachParentSummaries
- voiceNoteId, insightId, coachId, playerIdentityId, organizationId, sportId
- privateInsight: { title, description, category, sentiment }
- publicSummary: { content, confidenceScore, generatedAt }
- status: pending_review | approved | suppressed | auto_approved | delivered | viewed
- sensitivityCategory: normal | injury | behavior
- sensitivityReason, sensitivityConfidence

### parentSummaryViews
- summaryId, guardianIdentityId, viewedAt, viewSource

### coachTrustLevels
- coachId, organizationId, currentLevel (0-3)
- preferredLevel, parentSummariesEnabled, skipSensitiveInsights
- totalApprovals, totalSuppressed, consecutiveApprovals

### guardianIdentities
- firstName, lastName, email, phone, address fields
- userId (links to Better Auth), verificationStatus

### guardianPlayerLinks
- guardianIdentityId, playerIdentityId, relationship
- isPrimary, hasParentalResponsibility, consentedToSharing

---

## Quality Check Commands

```bash
# Run before marking stories complete
npx -w packages/backend convex codegen  # Schema validation
npm run check-types                      # TypeScript
npx biome check --write --unsafe <files> # Lint + format

# Check specific files
npm run check-types 2>&1 | grep -E "error TS" | head -20
```

---

## Commit Message Format

```bash
git commit -m "$(cat <<'EOF'
feat: US-XXX - Brief description

- Bullet point of what was done
- Another change

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 Specific Notes

### New Dependencies Needed
```bash
npm install satori @resvg/resvg-js -w packages/backend
```

### Satori/Image Generation
- Satori uses flexbox, NOT grid
- All styles must be inline (no className)
- Image size: 1200x630 (OG image standard)
- Font loading required (Inter from Google Fonts)

### Browser Tab Notifications
- Use `document.title` with useEffect
- Format: `(${count}) Messages | PlayerARC`
- Store original title in useRef for cleanup

### Web Share API
- Check `navigator.share` availability
- Convert URL to Blob before sharing files
- Handle cancellation gracefully
