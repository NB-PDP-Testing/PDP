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

---

## Important Warnings

- **Never modify `mvp-app/`** - It's a reference only
- **Dev server usually running** - Don't start another instance
- **Use indexes, not filter** - Performance critical
- **Check Better Auth docs first** - Many operations are built-in
- **Players are org-scoped** - Same child at different clubs = separate records (known limitation)
- **Run `npx ultracite fix`** before committing

---

## MVP Reference App

There is an MVP version of the app in the `./mvp-app` folder. This is **for reference only**.

- The MVP used **Vite** and **Clerk auth**
- We are using **Next.js** and **Better Auth** in the main app
- We are rebuilding features from the MVP into `apps/web` and `packages/backend` in a structured way
- **NEVER write to this folder** - only read from it when specifically instructed to use the MVP as a reference for building features

When the user asks to implement a feature "like in the MVP" or "based on the MVP", read the relevant MVP code first to understand the existing implementation, then adapt it to our Next.js/Better Auth/Convex architecture.

---

## Getting Help

- Check existing `.md` files for feature documentation
- Review `docs/` folder for detailed specifications
- Reference `.ruler/` for development standards
- Look at MVP app for feature reference (read-only)
