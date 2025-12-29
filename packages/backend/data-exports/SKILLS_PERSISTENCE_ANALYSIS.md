# Skills Data Persistence Analysis

This document analyzes approaches for making skills data persistent across Convex deployments and environments.

## Current State

### Data Location
- **Tables**: `skillCategories` and `skillDefinitions` in Convex
- **Current Behavior**: Data is stored in the database and persists across deployments within the same Convex project
- **Risk**: Data could be lost if:
  - Convex project is deleted
  - Database is reset/cleared
  - Migration to new Convex project
  - Environment changes (dev → prod)

### Data Characteristics

**Skill Categories:**
- Sport-specific groupings (e.g., "Ball Mastery", "Passing & Distribution")
- Relatively stable reference data
- Changes infrequently
- Structure: `sportCode`, `code`, `name`, `description`, `sortOrder`, `isActive`

**Skill Definitions:**
- Individual assessable skills within categories
- More detailed with level descriptors (1-5 rating scale)
- Age group relevance information
- Structure: `categoryId`, `sportCode`, `code`, `name`, `levelDescriptors`, `ageGroupRelevance`

## Persistence Approaches

### 1. Seed Data Functions (Recommended for Initial Setup)

**Approach**: Create internal mutation functions that seed reference data from code.

**Pros:**
- ✅ Version controlled in git
- ✅ Reproducible across environments
- ✅ Easy to review changes
- ✅ Can be run on-demand
- ✅ Works well for initial setup

**Cons:**
- ❌ Requires code changes to update data
- ❌ Not ideal for frequent updates
- ❌ Manual process to keep in sync

**Implementation Pattern:**
```typescript
// Already exists: seedGAASkills, seedSoccerSkills, seedRugbySkills
export const seedSkillsForSport = internalMutation({
  args: { sportCode: v.string() },
  handler: async (ctx, args) => {
    // Seed categories and definitions from hardcoded data
  }
});
```

**Use Case**: Initial setup, new sports, major structural changes

---

### 2. JSON Import/Export System (Recommended for Updates)

**Approach**: Store skills data as JSON files in the codebase, import via mutation.

**Pros:**
- ✅ Version controlled
- ✅ Easy to edit (JSON is human-readable)
- ✅ Can be updated without code changes
- ✅ Supports bulk updates
- ✅ Can be reviewed in PRs

**Cons:**
- ❌ Requires import process
- ❌ Need to handle conflicts/updates
- ❌ JSON files can get large

**Implementation Pattern:**
```typescript
// Already exists: importSkillsForSport
export const importSkillsForSport = mutation({
  args: {
    sportCode: v.string(),
    skills: v.array(/* skill structure */)
  },
  handler: async (ctx, args) => {
    // Upsert categories and definitions
  }
});
```

**File Structure:**
```
packages/backend/data/
  skills/
    gaa.json
    soccer.json
    rugby.json
```

**Use Case**: Regular updates, versioning skills data, multi-environment sync

---

### 3. Migration System

**Approach**: Use Convex migrations to manage schema and data changes.

**Pros:**
- ✅ Official Convex pattern
- ✅ Versioned migrations
- ✅ Can handle schema + data changes together
- ✅ Rollback capability

**Cons:**
- ❌ More complex setup
- ❌ Migrations are one-way (typically)
- ❌ Better for schema changes than data updates

**Implementation Pattern:**
```typescript
// convex/migrations/addSkills.ts
export default migration({
  version: "2024-01-15",
  up: async (ctx) => {
    // Insert skills data
  },
  down: async (ctx) => {
    // Remove skills data (if needed)
  }
});
```

**Use Case**: Major version changes, schema migrations, production deployments

---

### 4. External Configuration Service

**Approach**: Store skills data in external service (e.g., CMS, database, config service).

**Pros:**
- ✅ Can be updated without deployments
- ✅ Non-technical users can edit
- ✅ Supports multiple environments
- ✅ Can have approval workflows

**Cons:**
- ❌ Additional infrastructure
- ❌ More complex architecture
- ❌ Need to sync with Convex
- ❌ Potential for drift

**Use Case**: Frequent updates, non-technical content managers, multi-tenant scenarios

---

### 5. Hybrid Approach (Recommended)

**Best Practice**: Combine multiple approaches based on use case.

#### Initial Setup: Seed Functions
- Use seed functions for initial data
- Version controlled, reproducible

#### Updates: JSON Import
- Store canonical data in JSON files
- Import via mutation when needed
- Version controlled in git

#### Production: Migration Scripts
- Use migrations for major changes
- Ensure consistency across environments

#### Backup: Export Scripts
- Regular exports for backup
- Store in `data-exports/` directory

## Recommended Implementation

### Phase 1: Current State (What We Have)
- ✅ Seed functions exist (`seedGAASkills`, `seedSoccerSkills`, `seedRugbySkills`)
- ✅ Import function exists (`importSkillsForSport`)
- ✅ Export queries created (`exportAllSkillCategories`, `exportAllSkillDefinitions`)

### Phase 2: Enhance JSON Import System

1. **Create JSON data files**:
   ```
   packages/backend/data/skills/
     gaa.json
     soccer.json
     rugby.json
   ```

2. **Enhance import function** to:
   - Support full category + skills structure
   - Handle updates (upsert by code)
   - Preserve IDs when possible
   - Log changes

3. **Create sync script**:
   ```typescript
   // scripts/sync-skills-from-json.ts
   // Reads JSON files and imports to Convex
   ```

### Phase 3: Add Versioning

1. **Add version field** to skills data:
   ```typescript
   skillCategories: {
     // ... existing fields
     dataVersion: v.string(), // "1.0.0"
   }
   ```

2. **Track changes** in JSON files with version numbers

3. **Migration helper** to check and update versions

### Phase 4: Automation (Optional)

1. **Pre-deploy hook** to sync skills data
2. **CI/CD integration** to validate JSON structure
3. **Automated backups** of current state

## Data Classification

### What Should Be Persistent?

**High Priority (Must Persist):**
- ✅ Skill category definitions (structure)
- ✅ Skill definitions (structure)
- ✅ Level descriptors (assessment criteria)
- ✅ Age group relevance

**Medium Priority (Should Persist):**
- ⚠️ Sort orders (can be regenerated)
- ⚠️ Descriptions (can be updated)

**Low Priority (Can Regenerate):**
- ❌ Internal IDs (generated by Convex)
- ❌ Creation timestamps (metadata)

### What Changes Frequently?

**Rarely Changes:**
- Skill category structure
- Skill definition structure
- Level descriptors

**Occasionally Changes:**
- Descriptions
- Age group relevance
- Sort orders

**Frequently Changes:**
- `isActive` flags (soft deletes)
- New skills added

## Recommendations

### Immediate Actions

1. **Export current data** (✅ Done - script created)
   - Run export script to capture current state
   - Store in `data-exports/` for reference

2. **Create JSON data files** from exports
   - Convert exported data to canonical JSON format
   - Store in `packages/backend/data/skills/`

3. **Enhance import function** if needed
   - Ensure it handles all current data structure
   - Add conflict resolution

### Short-term (Next Sprint)

1. **Document data structure** in JSON schema
2. **Create sync script** to import from JSON
3. **Add versioning** to track changes

### Long-term (Future)

1. **Automate sync** in deployment process
2. **Add validation** for JSON structure
3. **Create admin UI** for editing (optional)

## Questions to Consider

1. **Who updates skills data?**
   - Developers → JSON files + git
   - Admins → Need UI or import process
   - External → Need API or import process

2. **How often does it change?**
   - Rarely → Seed functions are fine
   - Occasionally → JSON import system
   - Frequently → External service or admin UI

3. **Multi-environment sync?**
   - Same data across all → Seed/JSON approach
   - Different per environment → External service

4. **Version control needs?**
   - Track history → Git + JSON files
   - Audit trail → Add versioning fields

## Conclusion

**Recommended Approach**: **Hybrid (Seed + JSON Import)**

- Use seed functions for initial setup
- Store canonical data in JSON files (version controlled)
- Use import function for updates
- Regular exports for backup
- Consider migrations for major structural changes

This provides:
- ✅ Version control
- ✅ Reproducibility
- ✅ Easy updates
- ✅ Backup/recovery
- ✅ Multi-environment support


