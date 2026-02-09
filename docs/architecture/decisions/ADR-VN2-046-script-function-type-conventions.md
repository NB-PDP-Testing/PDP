# ADR-VN2-046: Script Function Type Conventions

**Date:** 2026-02-08
**Status:** Accepted
**Context:** Phase 7D, Story US-VN-029

## Context and Problem Statement

Phase 7D creates 4 Convex scripts that operators run via `npx -w packages/backend convex run`. The scripts need to call internal functions (like `setFeatureFlag`, which is an `internalMutation`) and access the database. The choice of function type (query, mutation, action) for each script affects what it can do and how it is invoked.

Key constraint: `convex run` can only execute functions exported from files in the Convex directory. It can call public `query`, `mutation`, and `action` functions. It CANNOT call `internalQuery`, `internalMutation`, or `internalAction` directly.

## Decision Drivers

- Scripts must be runnable via `npx -w packages/backend convex run scripts/<name>`
- Some scripts need to call internal functions (setFeatureFlag is internalMutation)
- Some scripts need to read from multiple tables (v2MigrationStatus)
- The migration action is internalAction and needs a public wrapper
- Existing script convention: `getOrgId.ts` uses `query`, `bootstrapPlatformStaff.ts` uses `mutation`, `seedDemoClub.ts` uses both `mutation` and `query`

## Decision Outcome

### Script function type assignments

| Script | Type | Rationale |
|--------|------|-----------|
| `enableV2ForOrg` | `mutation` | Calls `ctx.runMutation(internal.lib.featureFlags.setFeatureFlag)` -- mutations can call internal mutations |
| `disableV2ForOrg` | `mutation` | Same as above |
| `v2MigrationStatus` | `query` | Read-only, queries multiple tables via `ctx.db` |
| `runMigration` | `action` | Calls `ctx.runAction(internal.actions.migration.migrateVoiceNotesToV2)` -- actions can call internal actions |

### Why `mutation` for enable/disable (not `action`)

Mutations can call `ctx.runMutation()` to invoke internal mutations. Actions can also call `ctx.runAction()` to invoke internal actions, but `setFeatureFlag` is an `internalMutation`, not an `internalAction`. From an action, you would use `ctx.runMutation()` which can call internal mutations. However, mutations are simpler, transactional, and have `ctx.db` access (not needed here, but available).

The key distinction: mutations are synchronous/transactional, actions are async/non-transactional. Since `setFeatureFlag` is a simple DB write, a mutation wrapper is the natural fit.

### Why `query` for v2MigrationStatus (not `mutation`)

The status script is read-only. Using `query` enforces this at the type level -- `ctx.db` in a query context only allows reads. This prevents accidental writes.

### Why `action` for runMigration (not `mutation`)

The migration action (`migrateVoiceNotesToV2`) is an `internalAction` that performs many operations over time. From a `mutation`, you cannot call `ctx.runAction()` to invoke internal actions. You can only call `ctx.scheduler.runAfter()` which is async. An `action` wrapper can directly `await ctx.runAction()` and return the result synchronously to the caller.

### Security note

These scripts are public functions (not internal). Anyone with Convex dashboard access or CLI access can run them. This is acceptable because:
1. `convex run` requires CLI authentication
2. The scripts only modify feature flags (not user data)
3. The migration script is idempotent
4. Production Convex deployments have access controls

If tighter security is needed in the future, consider adding an auth check or platform staff verification.

## Implementation Notes

### File naming convention

Use camelCase filenames matching existing convention:
- `enableV2ForOrg.ts` (matches `getOrgId.ts`, `seedDemoClub.ts`)
- `disableV2ForOrg.ts`
- `v2MigrationStatus.ts`
- `runMigration.ts`

### Export naming convention

The exported function name determines the `convex run` invocation:

```bash
# If file exports: export const enableV2ForOrg = mutation({...})
npx -w packages/backend convex run scripts/enableV2ForOrg

# If file exports: export const v2MigrationStatus = query({...})
npx -w packages/backend convex run scripts/v2MigrationStatus
```

When a file exports a single default function with the same name as the file, the `:functionName` suffix is optional.

### Return type validators

All scripts MUST include `returns` validators (per CLAUDE.md mandatory pattern). This ensures type safety and clear output for operators.

## References

- Phase 7D PRD: US-VN-029
- Convex docs: Function types and calling conventions
- Existing scripts: `packages/backend/convex/scripts/getOrgId.ts`, `bootstrapPlatformStaff.ts`
