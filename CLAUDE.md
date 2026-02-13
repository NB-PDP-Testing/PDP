# CLAUDE.md - PlayerARC/PDP Project Context

**PlayerARC** is a sports club management and player development platform. Multi-sport, multi-team player assessment with organization-scoped data isolation.

## Project Structure

Turborepo monorepo with npm workspaces:
- `apps/web/` — Next.js 14 frontend (App Router, shadcn/ui, Tailwind)
- `packages/backend/` — Convex backend (Better Auth + organization plugin)
- `docs/` — Detailed documentation
- `.ruler/` — Development rules and standards (read on-demand)
- `mvp-app/` — Reference MVP (**READ ONLY**, never modify)

## Tech Stack

- **Frontend:** Next.js 14, shadcn/ui, Tailwind, Lucide Icons, React Hook Form, Sonner
- **Backend:** Convex (real-time TypeScript), Better Auth (multi-tenant)
- **Quality:** Biome/Ultracite, TypeScript strict mode
- **Deploy:** Vercel + Convex Cloud, GitHub Actions CI

## Commands

Dev server is typically **already running on port 3000**.

```bash
npm run check-types                         # Type check
npm run check && npx ultracite fix          # Lint and format
npx -w packages/backend convex codegen      # Verify backend types
npm run build                               # Build
```

**Testing:** E2E only (Playwright) in `apps/web/uat/tests/`. Run with `/e2e`. No Vitest.

## Critical Rules

1. **User ID is `user._id`**, NOT `user.id`. Display name is `user.name`, NOT `firstName`/`lastName`. See `.ruler/better-auth-patterns.md`.
2. **NEVER use `.filter()` in Convex** — always `.withIndex()`. See `.ruler/performance-patterns.md`.
3. **Batch fetch, never N+1** — collect IDs, fetch all, build Map, then map synchronously. See `.ruler/performance-patterns.md`.
4. **Co-locate imports with usage** — add import AND usage in same edit (linter removes unused imports between edits).
5. **All routes scoped under `/orgs/[orgId]/`** — data filtered by `organizationId` at DB level.
6. **Two table systems:** Better Auth tables (`user`, `member`, `organization`, `team`) use the adapter. Application tables (`orgPlayerEnrollments`, etc.) use `ctx.db`. Never mix.
7. **Run `npx ultracite fix` before committing.**
8. **Before removing schema fields**, grep for all usages across `apps/` and `packages/` first.

## Convex Patterns

```typescript
// Always use new function syntax with args + returns validators
export const getPlayer = query({
  args: { playerId: v.id("orgPlayerEnrollments") },
  returns: v.union(v.object({ /* ... */ }), v.null()),
  handler: async (ctx, args) => { /* ... */ },
});
```

- Queries/mutations: `packages/backend/convex/models/<domain>.ts`
- Actions: `packages/backend/convex/actions/<domain>.ts` (cannot access `ctx.db`)
- Always include `returns` validator. Use `Id<"tableName">`, not `string`.
- Index names include all fields: `by_orgId_and_status`
- See `.ruler/convex_rules.md` for full rules.

## Auth & Roles

| Role | Access |
|------|--------|
| Owner | Full org access |
| Admin | Team/player/user management |
| Coach | Assigned teams/players, assessments |
| Parent | Linked children only |
| Member | View-only |

Check Better Auth docs first: https://www.better-auth.com/llms.txt/docs/plugins/organization.md

## Before You Code

1. **Map the architecture first.** Glob/Grep for related files before editing. Avoid creating duplicates.
2. **Identify the correct file.** Multiple similar pages per role — confirm with user if ambiguous.
3. **Consider mobile viewport.** Dialogs/forms must work at 375px width.
4. **Verify git branch** with `git branch --show-current`. For DB operations: **always ASK** which environment.

## Component Architecture

- Feature-specific components: same folder as `page.tsx`
- Reusable components: `apps/web/src/components`
- shadcn/ui: `apps/web/src/components/ui` (don't modify)
- Org theming: `useOrgTheme` hook, CSS vars `--org-primary`, `--org-secondary`, `--org-tertiary`

## Bug Fixing

Follow the workflow in `.ruler/bug-fix-workflow.md` — investigate and present findings before making changes.

## Ralph Agent Orchestration

- **PRDs:** `scripts/ralph/prds/` — JSON files with phases, stories, acceptance criteria
- **Agent output:** `scripts/ralph/agents/output/`
- Branches: `ralph/<feature-name>`
- Validate PRD before launch: `bash scripts/ralph/validate-prd.sh scripts/ralph/prds/<file>.json`

## Visual Testing

- Dev-browser at `~/.claude/skills/dev-browser`, server on `ws://127.0.0.1:9223`
- Test account: `neil.B@blablablak.com` / `lien1979`
- Start: `~/.claude/skills/dev-browser/server.sh &`

## Reference Files (Read On-Demand)

- `.ruler/performance-patterns.md` — N+1 prevention, index usage, frontend query patterns, PR checklist
- `.ruler/better-auth-patterns.md` — User data patterns, batch fetch, display names
- `.ruler/convex_rules.md` — Full Convex best practices
- `.ruler/bug-fix-workflow.md` — Bug investigation and GitHub issue workflow
- `.ruler/ultracite.md` — Code style standards
- `.ruler/bts.md` — Project-specific patterns
