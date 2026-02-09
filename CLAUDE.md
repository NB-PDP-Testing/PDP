# CLAUDE.md - PlayerARC/PDP Project Context

This is the canonical reference document for AI agents working on this project. Read this first before making any changes.

## What is PlayerARC/PDP?

**PlayerARC** (formerly PDP - Player Development Platform) is a comprehensive sports club management and player development platform. It enables athletic organizations to manage teams, track player development, assess performance, and facilitate communication between coaches, players, and parents.

### Target Users
- **Platform Staff** - System operators who manage the overall platform
- **Organization Owners/Admins** - Club management (create teams, manage members)
- **Coaches** - Team management, player assessments, voice notes, development goals
- **Parents/Guardians** - View child progress, medical info, communicate with coaches
- **Players (18+)** - Self-access to their own profile when granted permission

### Primary Use Case
Multi-sport, multi-team player assessment and development tracking with organization-scoped data isolation.

---

## Project Structure

This is a **Turborepo monorepo** using npm workspaces:

```
pdp/
├── apps/
│   └── web/              # Next.js 14 frontend (App Router)
│       └── src/
│           ├── app/      # Route handlers and pages
│           ├── components/  # Reusable components
│           ├── hooks/    # Custom React hooks
│           └── lib/      # Utilities, auth-client, access control
├── packages/
│   └── backend/          # Convex backend
│       └── convex/
│           ├── models/   # Queries and mutations by domain
│           ├── actions/  # External API integrations
│           ├── lib/      # Shared utilities
│           └── betterAuth/  # Auth schema extensions
├── docs/                 # Detailed documentation
├── .ruler/               # Development rules and standards
└── mvp-app/              # Reference MVP (READ ONLY - do not modify)
```

---

## Technology Stack

### Frontend
- **Next.js 14** with App Router (TypeScript)
- **shadcn/ui** components with **Tailwind CSS**
- **Lucide Icons** for iconography
- **Better Auth** client SDK for authentication
- **Sonner** for toast notifications
- **React Hook Form** for form handling

### Backend
- **Convex** - Serverless, real-time TypeScript backend
- **Better Auth** with organization plugin for multi-tenancy
- Auto-generated TypeScript types from Convex functions

### Code Quality
- **Biome** (via Ultracite) for linting and formatting
- **TypeScript** strict mode throughout
- Run `npx ultracite fix` before committing

### Deployment
- **Vercel** for frontend hosting
- **Convex Cloud** for backend
- **GitHub Actions** for CI (lint/type-check)

---

## Running the App

The dev server is typically **already running on port 3000**. Don't start another instance.

```bash
# Type check
npm run check-types

# Lint and format
npm run check
npx ultracite fix

# Build
npm run build

# Convex codegen (verify backend types)
npx -w packages/backend convex codegen
```

### Testing
- **E2E tests only:** Playwright in `apps/web/uat/tests/` -- do NOT create Vitest tests
- Config: `apps/web/uat/playwright.config.ts`
- Run with the `/e2e` command; dev server must be on `localhost:3000`

---

## Authentication & Authorization

### Authentication Methods
- Email/Password (built-in)
- Google OAuth
- Microsoft Azure Entra ID (enterprise)

### Authorization Model
Uses Better Auth's organization plugin with custom extensions:

| Role | Access |
|------|--------|
| **Owner** | Full access to organization |
| **Admin** | Team/player/user management |
| **Coach** | View assigned teams/players, create assessments |
| **Parent** | View linked children only |
| **Member** | View-only basic access |

### Key Patterns
- Use `authClient` for client-side operations
- Check Better Auth docs first: https://www.better-auth.com/llms.txt/docs/plugins/organization.md
- Only add backend functions for business logic not covered by client methods
- Better Auth + Convex integration is already set up - ask context7 for docs on `get-convex/better-auth` if needed

---

## Database Schema (Key Tables)

### Better Auth Tables (Extended)
- `user` - Extended with `isPlatformStaff`, `firstName`, `lastName`, `phone`, `currentOrgId`
- `organization` - Extended with `colors[]`, social links, website
- `member` - Extended with `functionalRoles[]`, `activeFunctionalRole`
- `team` - Extended with `sport`, `ageGroup`, `gender`, `season`, `trainingSchedule`, `homeVenue`

### Application Tables
- `orgPlayerEnrollments` - Organization-scoped player enrollment with sport, ageGroup, status
- `teamPlayerIdentities` - Player-team membership (supports multi-team players)
- `flows` - Onboarding flows, announcements, alerts
- `userFlowProgress` - User progress through flows
- `injuries`, `medicalProfiles`, `developmentGoals` - Player health & development
- `voiceNotes` - Coach voice notes with AI transcription
- `coachAssignments` - Coach-team mapping
- `orgJoinRequests` - Join request workflow
- `sportAgeGroupConfig`, `sportEligibilityRules` - Multi-sport eligibility
- `ageGroupEligibilityOverrides` - Individual exceptions for playing up/down

---

## Key Features Implemented

### Core Platform
- Multi-tenant organization system with data isolation
- Role-based access control with functional roles
- Organization join request workflow
- Organization theming (3 custom colors per org)
- First-user onboarding with platform staff auto-assignment

### Team & Player Management
- Team CRUD with sports-specific fields
- Multi-team player assignments (player can be on multiple teams)
- Player bulk import (GAA member imports)
- Sport-specific eligibility rules with age group validation
- Admin override system for eligibility exceptions

### Player Development
- Player Passport (comprehensive player profile)
- Skill rating system (1-5 scale, sport-specific skills)
- Development goals with milestones
- Performance reviews with scheduling

### Health & Safety
- Injury tracking with severity and return-to-play protocol
- Medical profiles (blood type, allergies, medications)
- Emergency contacts
- Attendance tracking

### Coach Features
- Dashboard showing assigned teams and players
- Multi-team player display with filtering
- Voice notes with AI transcription/insights
- Development goal tracking

### Parent Features
- Dashboard showing linked children
- View player passport and progress
- Smart parent matching using email/phone/address

### Flow System (NEW)
- Modular wizard system for onboarding, announcements, alerts
- Platform staff admin UI for flow management
- Organization admin announcements
- Multiple display types: page, modal, banner, toast
- User progress tracking

---

## Important Patterns & Conventions

### TypeScript Edit Rule (MANDATORY)
When adding new imports to TypeScript files, **always add the import AND its usage in the same edit operation**. Never add an import in one edit and the usage in a separate edit — the linter will remove the "unused" import between edits, causing errors on the next edit.

### Branch & Environment Verification
Before making changes, always verify the current git branch with `git branch --show-current`. For database operations, migrations, or deployments: **always ASK** which environment (dev vs production) — never assume dev.

### Multi-Tenancy
All routes are scoped under `/orgs/[orgId]`. Data is filtered by `organizationId` at the database level.

### Multi-Sport Support
- Each player enrollment has a `sport` field
- Teams have a `sport` field for filtering
- Dual-sport players have multiple enrollments

### Multi-Team Players
- Players can belong to multiple teams via `teamPlayerIdentities`
- "Core team" matches enrollment's sport + ageGroup
- Additional teams marked as playing up, different sport, etc.

### Query Patterns (Convex)
- Use indexes for all queries (never use `.filter()`)
- Real-time subscriptions via `useQuery` hook
- Include both argument and return validators

### Component Architecture
- Create feature-specific components in the same folder as `page.tsx`
- Reusable components go in `apps/web/src/components`
- shadcn/ui components in `apps/web/src/components/ui` (don't modify)
- Use `useOrgTheme` hook for organization branding

### Organization Theming
Organizations have three colors (primary, secondary, tertiary) applied via CSS custom properties:
- `--org-primary`, `--org-primary-rgb`
- `--org-secondary`, `--org-secondary-rgb`
- `--org-tertiary`, `--org-tertiary-rgb`

---

## Convex Development Rules

### Function Syntax
Always use the new function syntax with validators:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getPlayer = query({
  args: { playerId: v.id("orgPlayerEnrollments") },
  returns: v.union(v.object({ /* ... */ }), v.null()),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### File Organization
- Queries/mutations: `packages/backend/convex/models/<domain>.ts`
- Actions (external APIs): `packages/backend/convex/actions/<domain>.ts`
- Internal helpers: `packages/backend/convex/lib/`

### Key Rules
- NEVER use `.filter()` - always use `.withIndex()`
- Always include `returns` validator (use `v.null()` if no return)
- Use `Id<"tableName">` types, not `string`
- Actions cannot access `ctx.db` - use `ctx.runQuery`/`ctx.runMutation`
- Index names should include all fields: `by_orgId_and_status`

---

## Performance & Query Optimization (MANDATORY)

> **⚠️ CRITICAL: All future backend and frontend changes MUST follow these patterns.**
>
> These optimizations reduced Convex function calls from **3.2M to ~800K/month** (75% reduction).
> Violating these patterns will cause billing overages and performance issues.
>
> **Review this section before writing ANY new queries or data fetching code.**
>
> Reference: GitHub Issue #330 (Performance Crisis), January 2026 optimization project.

### N+1 Query Prevention (MANDATORY)

**NEVER do this (N+1 anti-pattern):**
```typescript
// ❌ BAD: Query in a loop - makes N database calls
const enriched = await Promise.all(
  items.map(async (item) => {
    const related = await ctx.db.get(item.relatedId); // Query per item!
    return { ...item, related };
  })
);
```

**ALWAYS do this (Batch pattern):**
```typescript
// ✅ GOOD: Batch fetch with Map lookup - makes 1 database call
// 1. Collect unique IDs
const uniqueIds = [...new Set(items.map(item => item.relatedId))];

// 2. Batch fetch all at once
const results = await Promise.all(
  uniqueIds.map(id => ctx.db.get(id))
);

// 3. Create Map for O(1) lookup
const dataMap = new Map();
for (const result of results) {
  if (result) dataMap.set(result._id, result);
}

// 4. Synchronous map using pre-fetched data (no await needed)
const enriched = items.map(item => ({
  ...item,
  related: dataMap.get(item.relatedId)
}));
```

### Index Usage (MANDATORY)

**NEVER use `.filter()` - always use `.withIndex()`:**
```typescript
// ❌ BAD: filter() scans entire table
const players = await ctx.db
  .query("players")
  .filter(q => q.eq(q.field("status"), "active"))
  .collect();

// ✅ GOOD: withIndex() uses database index
const players = await ctx.db
  .query("players")
  .withIndex("by_status", q => q.eq("status", "active"))
  .collect();
```

**Use composite indexes for multi-field filters:**
```typescript
// ✅ GOOD: Composite index for multiple conditions
const players = await ctx.db
  .query("players")
  .withIndex("by_org_and_status", q =>
    q.eq("organizationId", orgId).eq("status", "active")
  )
  .collect();
```

### Frontend Query Patterns (MANDATORY)

**Lift queries to parent components:**
```typescript
// ❌ BAD: Each ChildCard makes its own queries
function ChildCard({ childId }) {
  const passport = useQuery(api.getPassport, { childId });
  const injuries = useQuery(api.getInjuries, { childId });
  // 5 queries per child × 10 children = 50 queries!
}

// ✅ GOOD: Parent fetches all data, passes as props
function ParentDashboard({ children }) {
  const bulkData = useQuery(api.getBulkChildData, {
    childIds: children.map(c => c.id)
  });
  return children.map(child => (
    <ChildCard key={child.id} bulkData={bulkData[child.id]} />
  ));
}
// 1 bulk query regardless of child count
```

**Use query skipping when data not needed:**
```typescript
// ✅ GOOD: Skip query when user not authenticated
const data = useQuery(
  api.getData,
  userId ? { userId } : "skip"
);
```

**Cache shared data in React Context:**
```typescript
// ✅ GOOD: Fetch once at app level, share via context
// See: CurrentUserProvider, MembershipProvider
const { user } = useCurrentUser(); // Reads from context, no query
```

### Common Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `Promise.all(items.map(async => query))` | N+1 queries | Batch fetch + Map lookup |
| `.withIndex().filter()` | Post-query filtering | Use composite index |
| `useQuery` in list item components | Query per item | Lift to parent, pass props |
| Multiple components calling same query | Duplicate subscriptions | Use shared context/provider |
| Query without checking auth state | Wasted calls | Add skip condition |

### Better Auth User Data Patterns

**CRITICAL: Better Auth user object structure:**
- Use `user._id` for user ID (NOT `user.id`, NOT `userId` in queries)
- Use `user.name` for display name (NOT `user.firstName`/`user.lastName` - these fields don't exist!)
- Use `user.email` as fallback when name is missing

```typescript
// ❌ BAD: These fields DO NOT EXIST
const displayName = `${user.firstName} ${user.lastName}`;  // Wrong!
const userId = user.id;  // Wrong, use user._id

// ✅ GOOD: Correct Better Auth fields
const displayName = user.name || user.email || "Unknown";
const userId = user._id;
```

**When querying users by ID:**
```typescript
// ❌ BAD: userId field is always null in this app
const user = await adapter.findOne({
  model: "user",
  where: { field: "userId", value: id }  // Always returns null!
});

// ✅ GOOD: _id is the correct field
const user = await adapter.findOne({
  model: "user",
  where: { field: "_id", value: id }
});
```

**When populating user lookup maps:**
```typescript
// ❌ BAD: Using wrong ID field
userMap.set(user.id, user);

// ✅ GOOD: Use _id field
userMap.set(user._id, user);
```

**See `.ruler/better-auth-patterns.md` for complete batch fetch patterns and examples.**

### Performance Checklist (Before Every PR)

- [ ] No `Promise.all` with queries inside the map callback
- [ ] No `.filter()` after `.withIndex()` - use composite index instead
- [ ] No `useQuery` in list item components - lift to parent
- [ ] Shared data (user, memberships) read from context, not queried
- [ ] Queries skip when data not needed (auth check, visibility)
- [ ] New indexes added for any new query patterns

**If unsure, ask before implementing - performance regression is costly.**

---

## Current Development Status (as of Jan 5, 2026)

### Production Ready
- Multi-team assignment system
- Sport eligibility backend
- Admin override management
- Organization management
- Coach/Parent dashboards
- Flow system (onboarding, announcements)
- CI/CD pipeline

### Needs Testing
- Coach dashboard multi-team display
- Team filtering functionality
- Flow system end-to-end

### Not Yet Implemented
- Sport configuration admin UI (backend ready, no frontend)
- Enhanced team management page (eligibility badges)
- Bulk operations UI
- Platform-level player identity architecture (planned)

---

## Terminology

| Term | Meaning |
|------|---------|
| Organization / Org | Better Auth grouping - displayed as "Club" in UI |
| Player Enrollment | Organization-scoped player record |
| Player Identity | Platform-level player (future architecture) |
| Core Team | Team matching player's sport + age group |
| Playing Up | Player assigned to team above their age group |
| Flow | Onboarding wizard, announcement, alert, or feature tour |

---

## Documentation Index

All documentation is organized in the `docs/` folder. See `docs/README.md` for full navigation.

### Architecture (`docs/architecture/`)
- `system-overview.md` - Full system architecture
- `flow-wizard-system.md` - Modular wizard/flow system design
- `multi-team-system.md` - Multi-team player assignment
- `identity-system.md` - Platform-level identity (planned)
- `player-passport.md` - Player passport architecture
- `season-management.md` - Season management analysis

### Features (`docs/features/`)
- `organization-theming.md` - Organization branding/colors
- `organization-join-requests.md` - Join request workflow
- `user-management.md` - User/member management
- `functional-roles.md` - Custom roles (Coach, Parent, Admin)
- `voice-notes.md` - Voice notes with AI transcription
- `first-user-onboarding.md` - First user onboarding wizard

### Setup Guides (`docs/setup/`)
- `microsoft-auth.md` - Microsoft Azure Entra ID setup
- `posthog-analytics.md` - PostHog analytics integration
- `vercel-deployment.md` - Vercel deployment guide

### Testing (`docs/testing/`)
- `master-test-plan.md` - Master UAT test plan (166 test cases)
- `flow-system-tests.md` - Flow system tests (67 test cases)

### Development (`docs/development/`)
- `ci-cd-guide.md` - CI/CD pipeline documentation
- `linting-guide.md` - Biome/Ultracite linting
- `typescript-guide.md` - TypeScript patterns

### Status (`docs/status/`)
- `current-status.md` - Current implementation status
- `outstanding-features.md` - Features not yet implemented

### Development Rules (`.ruler/`)
- `convex_rules.md` - Convex best practices
- `ultracite.md` - Code style standards
- `bts.md` - Project-specific patterns

---

## Common Tasks

### Adding a New Page
1. Create route folder in `apps/web/src/app/orgs/[orgId]/...`
2. Add `page.tsx` and feature-specific components as siblings
3. Add navigation link if needed

### Adding a Backend Function
1. Add to appropriate file in `packages/backend/convex/models/`
2. Include args and returns validators
3. Use appropriate indexes
4. Run `npx -w packages/backend convex codegen` to verify

### Modifying Schema
1. Update `packages/backend/convex/schema.ts`
2. Add necessary indexes
3. Run codegen to verify types
4. Consider migration if production data exists
5. **Before removing any field** from a schema or validator, grep for all usages across the codebase first (`grep -r "fieldName" apps/ packages/`). A removed field that's still referenced by API consumers will break production.

---

## Important Warnings

- **Never modify `mvp-app/`** - It's a reference only
- **Dev server usually running** - Don't start another instance
- **Use indexes, not filter** - Performance critical
- **Check Better Auth docs first** - Many operations are built-in
- **Players are org-scoped** - Same child at different clubs = separate records (known limitation)
- **Run `npx ultracite fix`** before committing

---

## Before You Code (Pre-Implementation Checklist)

Before implementing any fix or feature:

1. **Map the architecture first.** Search for all related files using Glob and Grep before editing anything. Look for existing components that handle similar functionality to avoid creating duplicates.
2. **Identify the correct file.** This project has multiple similar pages and components per role. If ambiguous, list the candidates and confirm with the user which to modify.
3. **Check both table systems.** Better Auth component tables (`user`, `member`, `organization`, `team`) use the adapter. Application tables (`orgPlayerEnrollments`, `voiceNotes`, etc.) use `ctx.db`. Never mix these up.
4. **Co-locate imports with usage.** Add imports in the same edit as the code that uses them -- the auto-formatter removes unused imports.
5. **Consider mobile viewport.** All dialog/modal/form changes must work at 375px width. Buttons must be reachable without scrolling on small screens.

---

## MVP Reference App

There is an MVP version of the app in the `./mvp-app` folder. This is **for reference only**.

- The MVP used **Vite** and **Clerk auth**
- We are using **Next.js** and **Better Auth** in the main app
- We are rebuilding features from the MVP into `apps/web` and `packages/backend` in a structured way
- **NEVER write to this folder** - only read from it when specifically instructed to use the MVP as a reference for building features

When the user asks to implement a feature "like in the MVP" or "based on the MVP", read the relevant MVP code first to understand the existing implementation, then adapt it to our Next.js/Better Auth/Convex architecture.

---

## GitHub Issue Updates

When updating GitHub issues with bug fix details or analysis:

1. **ALWAYS create an MD file first** in `docs/archive/bug-fixes/` (e.g., `BUG_FIX_123_DESCRIPTION.md`)
2. **Use `--body-file` flag** to submit: `gh issue comment <number> --repo NB-PDP-Testing/PDP --body-file <path-to-md-file>`
3. **NEVER use inline `--body "..."`** - content gets truncated with long messages

This ensures full documentation is preserved both in the repository and on GitHub.

---

## Bug Fixing Workflow

When the user indicates we're going to fix bugs, follow this process **before making any code changes**:

### Step 1: Analyze the Bug Report
- Thoroughly review all bug details provided (description, reproduction steps, expected vs actual behavior)
- Do not make assumptions - ask clarifying questions if anything is unclear

### Step 2: Investigate the Codebase
- Explore relevant code paths comprehensively
- Determine if the bug is still active or already fixed
- Identify the root cause (not just symptoms)
- Search for ALL related files (e.g., multiple edit pages, duplicate components) and confirm the correct target with the user

### Step 3: Present Findings
- Summarize the bug and its root cause
- Propose potential fixes with trade-offs
- Ask any pertinent questions

### Step 4: Wait for Approval
- **Do not make any code changes** until the user reviews the analysis
- Wait for explicit direction on which fix to implement
- Confirm next steps before proceeding

### Step 5: Verify and Validate
- Run `npx -w packages/backend convex codegen` and `npm run check-types` after implementing
- When the user reports the fix didn't work, DO NOT dismiss the concern -- re-investigate thoroughly with actual command output as evidence

---

## Ralph Agent Orchestration

This project uses **Ralph** — an autonomous coding agent orchestrated via PRD files and phase-based execution.

### Key Paths
- **PRDs:** `scripts/ralph/prds/` — JSON files defining phases, stories, and acceptance criteria
- **Agent definitions:** `.claude/agents/` — Claude agent role definitions
- **Agent output:** `scripts/ralph/agents/output/` — feedback.md, progress logs
- **Hooks:** `.claude/hooks/` — session-start, quality-check, security-check scripts

### Critical Rules
- Hook scripts must output to **stdout** (not stderr) for Claude Code to see the output
- Ralph branches follow naming: `ralph/<feature-name>`
- Always verify PRD exists and is valid before launching Ralph (`bash scripts/ralph/validate-prd.sh`)
- Monitor Ralph via git log and file changes, not process status

### Monitoring Commands
```bash
# Check Ralph's recent commits
git log --oneline -10

# Check feedback pending for Ralph
wc -l scripts/ralph/agents/output/feedback.md

# Validate PRD before launch
bash scripts/ralph/validate-prd.sh scripts/ralph/prds/<prd-file>.json
```

---

## Getting Help

- Check existing `.md` files for feature documentation
- Review `docs/` folder for detailed specifications
- Reference `.ruler/` for development standards
- Look at MVP app for feature reference (read-only)

## Visual Testing with dev-browser

When making frontend changes, **verify the layout visually** using the dev-browser tool. This is especially important for mobile-responsive and desktop layouts.

### Setup (Already Configured)
- Dev-browser is installed at `~/.claude/skills/dev-browser`
- Server runs on `ws://127.0.0.1:9223`
- Test account: `neil.B@blablablak.com` / `lien1979`

### Starting the Browser Server
If the server isn't running:
```bash
~/.claude/skills/dev-browser/server.sh &
```

### Visual Verification Pattern
After making frontend changes, verify the layout: