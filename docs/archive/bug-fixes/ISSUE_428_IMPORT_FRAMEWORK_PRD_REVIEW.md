# Generic Import Framework - PRD Review & Questions

## Overview

This issue tracks the implementation of the **Generic Import Framework** - a comprehensive 5-phase initiative to transform our current GAA-specific import wizard into a universal, multi-sport, configurable import system.

**PRD Location**: `scripts/ralph/prds/Importing Members/`

---

## Executive Summary

The Generic Import Framework will enable:
- **Platform Staff** to configure import templates and federation connectors
- **Club Admins** to self-service import membership data with intelligent field mapping
- **Federation APIs** to sync membership data automatically (future phases)

---

## Phase Overview

| Phase | Timeline | Focus | Status |
|-------|----------|-------|--------|
| **Phase 1** | Weeks 1-4 | Foundation & Multi-Sport Support | **Ready for Implementation** |
| **Phase 2** | Weeks 5-8 | Enhanced UX (quality scoring, dry-run, undo) | Pending Phase 1 |
| **Phase 3** | Weeks 9-12 | Mobile UX & Analytics | Pending Phase 2 |
| **Phase 4** | Weeks 13-20 | Federation Connectors & AI Mapping | Pending Phase 3 |
| **Phase 5** | Weeks 21+ | Advanced Features (marketplace, ML) | Future |

---

## Phase 1 Key Deliverables

### New Database Tables
1. `importTemplates` - Sport/org-specific import configurations
2. `importSessions` - Track each import with full audit trail
3. `importMappingHistory` - Learn from past imports for auto-mapping
4. `benchmarkTemplates` - Custom benchmark configurations

### New Backend Files
- `/packages/backend/convex/lib/import/parser.ts` - CSV/Excel parsing
- `/packages/backend/convex/lib/import/mapper.ts` - Smart field mapping
- `/packages/backend/convex/lib/import/validator.ts` - Schema validation
- `/packages/backend/convex/lib/import/benchmarkApplicator.ts` - Apply benchmarks
- `/packages/backend/convex/lib/import/sportConfig.ts` - Sport configurations
- `/packages/backend/convex/models/importTemplates.ts` - Template CRUD
- `/packages/backend/convex/models/importSessions.ts` - Session lifecycle

### New Frontend Components
- Import wizard shell & routing
- Upload step (file/paste)
- Column mapping step (smart mapping UI)
- **Player selection step** (per-player checkboxes, search, bulk actions)
- **Benchmark configuration step** (5 strategies)
- Review step (duplicates, teams, guardians)
- Import progress & completion steps

### Key New Features
- Per-player selection during import (checkbox per player)
- Benchmark initialization strategies (blank, middle, age-appropriate, NGB, custom)
- Template system (platform + organization scoped)
- Import session tracking with audit trail
- Multi-sport support (Soccer, Rugby, etc.)

---

## Current State Analysis

| Capability | Current | Target |
|------------|---------|--------|
| Sports supported | GAA Football only | Any sport (configurable) |
| Column mapping | Hardcoded GAA columns | Smart auto-mapping with fuzzy matching |
| Import templates | None | Platform & org-scoped templates |
| Session tracking | Frontend state only | Full backend persistence |
| Player selection | All-or-nothing | Per-player with search/filter |
| Benchmark initialization | Fixed middle (3) | 5 configurable strategies |
| Import history | None | Full history with undo |

### Key Existing Files
- `packages/backend/convex/models/playerImport.ts` (1,044 lines) - Core import mutations
- `apps/web/src/components/gaa-import.tsx` (2,824 lines) - GAA wizard component
- `apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx` (~31k lines) - Generic import

---

# Questions Requiring Answers

> **IMPORTANT**: The following questions need to be addressed before implementation begins. Please respond to each question directly.

---

## 1. Scope & Priority

### Q1.1 - Phase Scope
**Are we implementing Phase 1 only for this feature sprint, or is this intended to span multiple phases?**

- [ ] Phase 1 only
- [ ] Multiple phases (specify which): _______________

### Q1.2 - Ralph Integration
**The PRD references 17+ parallel agents across 4 streams for Phase 1. Is this the intended execution model?**

- [ ] Yes, use Ralph with multiple agents
- [ ] No, single developer implementation
- [ ] Other approach: _______________

---

## 2. Existing Code Strategy

### Q2.1 - GAA Import Migration
**Should the existing GAA import continue working during development (feature flag), or is direct migration acceptable?**

The PRD says to extract reusable components from `gaa-import.tsx` (2,824 lines).

- [ ] Feature flag - both old and new coexist during development
- [ ] Direct migration - replace in place
- [ ] Other: _______________

### Q2.2 - Existing Generic Import
**What should happen to `apps/web/src/app/orgs/[orgId]/admin/player-import/page.tsx`?**

This file already exists with ~31k lines of generic import functionality.

- [ ] Replace entirely with new framework
- [ ] Merge into new framework
- [ ] Leave as-is for now
- [ ] Other: _______________

---

## 3. Database & Schema

### Q3.1 - Production Data Migration
**Are there any concerns about schema migration for existing production data?**

The PRD adds new fields to existing tables:
- `importSessionId` and `externalIds` to `playerIdentities`
- `lastSyncedAt` and `syncSource` to `orgPlayerEnrollments`

- [ ] No concerns - standard migration
- [ ] Concerns exist (specify): _______________

### Q3.2 - Skill/Benchmark Data
**Do we have existing skill definitions for non-GAA sports (Soccer, Rugby)?**

The `benchmarkTemplates` table references skill benchmarks. Do `skillBenchmarks` or `skillDefinitions` tables exist for non-GAA sports?

- [ ] Yes, data exists for Soccer/Rugby
- [ ] No, needs to be created as part of Phase 1
- [ ] Not needed for Phase 1 (GAA only first)

### Q3.3 - NGB Benchmark Source
**For the "NGB benchmarks" strategy, where does the data come from?**

- [ ] External source (specify): _______________
- [ ] Define in our database manually
- [ ] Skip NGB strategy for Phase 1

---

## 4. Guardian Matching

### Q4.1 - Preserve Algorithm
**The existing guardian matching algorithm is marked as "PRESERVE - DO NOT CHANGE" in the PRD. Confirmed?**

Current scoring weights:
- Email match: 50 points
- Surname + Postcode: 45 points
- Phone match: 30 points
- etc.

- [ ] Yes, no modifications to scoring weights or logic
- [ ] Some modifications needed (specify): _______________

---

## 5. Multi-Sport Configuration

### Q5.1 - Sport Data Availability
**For Phase 1 to support Soccer and Rugby imports, where do sport configurations come from?**

I found:
- `sportAgeGroupConfig` table exists
- `sportEligibilityRules` table exists
- No `sportSkills` table for Soccer/Rugby skills

- [ ] Sport configs exist, ready to use
- [ ] Sport configs need to be created for Phase 1
- [ ] Phase 1 is GAA-only, other sports in Phase 2+

### Q5.2 - Default Templates
**Should default templates for Soccer and Rugby be seeded as part of Phase 1?**

- [ ] Yes, seed GAA + Soccer + Rugby templates
- [ ] No, only GAA + Generic CSV for Phase 1
- [ ] Other: _______________

---

## 6. Benchmark Application

### Q6.1 - Assessment Records
**When applying benchmarks during import, should this create `skillAssessment` records?**

The PRD suggests: `assessmentType: "import"`, `source: "manual"`, `assessedBy: systemUserId`

- [ ] Yes, create skillAssessment records as described
- [ ] No, different approach: _______________

---

## 7. Frontend Architecture

### Q7.1 - Route Structure
**The PRD specifies `/apps/web/src/app/orgs/[orgId]/import/page.tsx` as new entry point.**

This is separate from existing `/admin/gaa-import/` and `/admin/player-import/` routes.

- [ ] Correct - new `/import/` route, old routes redirect
- [ ] Correct - new route, old routes stay for now
- [ ] Different approach: _______________

### Q7.2 - Design System
**Should the new Import Wizard use shadcn/ui components consistent with the app?**

- [ ] Yes, standard shadcn/ui components
- [ ] Custom design requirements (specify): _______________

---

## 8. Testing & Validation

### Q8.1 - Test Fixtures
**Do we have test CSV files for GAA/Soccer/Rugby imports?**

- [ ] Yes, test fixtures exist at: _______________
- [ ] No, need to create test fixtures
- [ ] Will use real club data for testing

### Q8.2 - Staging Environment
**Is there a staging environment for testing before production?**

- [ ] Yes, staging available
- [ ] No staging, test in development only
- [ ] Other: _______________

---

## 9. Dependencies

### Q9.1 - NPM Packages
**Are the following dependencies approved for use?**

Phase 1 lists:
- `papaparse` (CSV parsing)
- `xlsx` (Excel parsing)
- `iconv-lite` (encoding detection)
- `file-type` (format detection)
- `fastest-levenshtein` (fuzzy matching)
- `string-similarity` (fuzzy matching)
- `zod` (validation)
- `validator.js` (validation)
- `libphonenumber-js` (phone validation)
- `date-fns` (date parsing)
- `email-validator` (email validation)

- [ ] All approved
- [ ] Some need alternatives (specify): _______________

---

## 10. Performance

### Q10.1 - Batch Limits
**Are there specific batch size limits or performance constraints?**

The existing `batchImportPlayersWithIdentity` handles imports atomically. Given the 75% performance optimization previously done (per CLAUDE.md):

- [ ] No specific limits - follow existing patterns
- [ ] Limits apply (specify): _______________

---

## Key Risks Identified

1. **Large Scope** - Phase 1 involves 4 new tables, 6+ backend files, 9+ frontend components
2. **Backward Compatibility** - Must ensure existing GAA import continues working
3. **Missing Infrastructure** - NGB benchmarks, sport skill definitions for non-GAA sports may not exist

---

## Next Steps

Once questions above are answered:
1. Create detailed implementation tasks
2. Set up schema migrations
3. Begin Phase 1 implementation

---

## References

- PRD Files: `scripts/ralph/prds/Importing Members/`
- Existing GAA Import: `apps/web/src/components/gaa-import.tsx`
- Backend Import Logic: `packages/backend/convex/models/playerImport.ts`
- Schema: `packages/backend/convex/schema.ts`
