# Phase 1.4: Import Template Management UI

**Timeline**: 1-2 weeks
**Status**: Ready for Implementation
**Dependencies**: Phase 1.1 (Database), Phase 1.3 (Frontend Wizard)

---

## Objectives

1. Give platform staff a web UI to create, edit, clone, and delete import templates
2. Give org admins a way to create organization-specific templates
3. Enable "upload a sample CSV" flow that auto-generates a template draft
4. Provide a column mapping builder with drag-and-drop or table interface
5. Show template usage statistics (how often used, success rate)

---

## Success Criteria

- [ ] Template management page accessible at `/orgs/[orgId]/admin/templates`
- [ ] Platform staff can create platform-wide templates
- [ ] Org admins can create organization-scoped templates
- [ ] Upload sample CSV auto-detects columns and pre-fills column mappings
- [ ] Column mapping builder allows adding/removing/reordering mappings
- [ ] Each mapping row: source pattern, target field dropdown, required toggle, aliases
- [ ] Age group mapping editor (source value to target age group)
- [ ] Skill initialization strategy selector with preview
- [ ] Default behaviors configuration (createTeams, createPassports, season)
- [ ] Clone template creates editable copy
- [ ] Delete template soft-deletes (sets isActive=false)
- [ ] Template list shows usage count and last used date
- [ ] Admin sidebar includes "Manage Templates" link
- [ ] All type checks pass: npm run check-types

---

## Context: What Already Exists

### Backend (100% Ready)

All CRUD operations are implemented in `packages/backend/convex/models/importTemplates.ts`:

| Mutation | Args | Description |
|----------|------|-------------|
| `createTemplate` | name, description, sportCode, sourceType, scope, organizationId, columnMappings, ageGroupMappings, skillInitialization, defaults, createdBy | Create new template |
| `updateTemplate` | templateId + optional field overrides | Update existing template |
| `deleteTemplate` | templateId | Soft-delete (isActive=false) |
| `cloneTemplate` | templateId, newName, createdBy | Clone with new name |
| `getTemplate` | templateId | Get single template |
| `listTemplates` | scope, sportCode?, organizationId? | List active templates |

### Schema (`importTemplates` table)

```typescript
{
  name: string,
  description?: string,
  sportCode?: string,                    // null = any sport
  sourceType: "csv" | "excel" | "paste",
  scope: "platform" | "organization",
  organizationId?: string,

  columnMappings: Array<{
    sourcePattern: string,               // "Forename" or regex "/first.*name/i"
    targetField: string,                 // "firstName"
    required: boolean,
    transform?: string,                  // "toUpperCase", "parseDate"
    aliases?: string[],                  // Alternative column names
  }>,

  ageGroupMappings?: Array<{
    sourceValue: string,                 // "JUVENILE", "U12"
    targetAgeGroup: string,              // "u12", "auto"
  }>,

  skillInitialization: {
    strategy: "blank" | "middle" | "age-appropriate" | "ngb-benchmarks" | "custom",
    customBenchmarkTemplateId?: Id<"benchmarkTemplates">,
    applyToPassportStatus?: string[],
  },

  defaults: {
    createTeams: boolean,
    createPassports: boolean,
    season?: string,
  },

  isActive: boolean,
  createdBy: string,
  createdAt: number,
  updatedAt: number,
}
```

### Available Target Fields (from mapper.ts DEFAULT_TARGET_FIELDS)

| Field | Label | Required |
|-------|-------|----------|
| firstName | First Name | Yes |
| lastName | Last Name | Yes |
| dateOfBirth | Date of Birth | Yes |
| gender | Gender | Yes |
| email | Email | No |
| phone | Phone | No |
| playerAddress | Player Address | No |
| playerTown | Player Town | No |
| playerPostcode | Player Postcode | No |
| country | Country | No |
| ageGroup | Age Group | No |
| membershipType | Membership Type | No |
| season | Season | No |
| team | Team | No |
| parentFirstName | Parent First Name | No |
| parentLastName | Parent Last Name | No |
| parentEmail | Parent Email | No |
| parentPhone | Parent Phone | No |
| guardian1Address | Guardian 1 Address | No |
| guardian1Town | Guardian 1 Town | No |
| guardian1Postcode | Guardian 1 Postcode | No |
| parent2FirstName | Parent 2 First Name | No |
| parent2LastName | Parent 2 Last Name | No |
| parent2Email | Parent 2 Email | No |
| parent2Phone | Parent 2 Phone | No |
| guardian2Address | Guardian 2 Address | No |
| guardian2Town | Guardian 2 Town | No |
| guardian2Postcode | Guardian 2 Postcode | No |

---

## Frontend Implementation

### New Files

#### 1. `apps/web/src/app/orgs/[orgId]/admin/templates/page.tsx`

Template management listing page.

**Features:**
- Table view: Name, Sport, Scope, Source Type, # Mappings, Created By, Last Used, Actions
- Filter by sport, scope (platform/organization)
- Search by name/description
- "Create Template" button
- "Upload Sample" button (opens sample upload flow)
- Role check: admin/owner only
- Platform templates shown as read-only for org admins (clone only)

#### 2. `apps/web/src/components/import/templates/template-list.tsx`

Template list table component.

**Features:**
- Sortable columns (name, sport, created date, usage count)
- Action buttons per row: Edit, Clone, Delete
- Badge for scope (Platform / Organization)
- Badge for sport (or "Any Sport")
- Usage stats: "Used X times, last used Y"

#### 3. `apps/web/src/components/import/templates/template-form.tsx`

Template create/edit form component (used in dialog or full page).

**Sections:**
1. **Basic Info**: Name, description, sport dropdown, source type radio, scope selector
2. **Column Mappings**: Table with add/remove rows
   - Source Pattern (text input)
   - Target Field (dropdown from DEFAULT_TARGET_FIELDS)
   - Required (toggle)
   - Transform (optional dropdown: parseDate, normalizeGender, toUpperCase, toLowerCase, trim)
   - Aliases (comma-separated text input)
3. **Age Group Mappings**: Table with add/remove rows
   - Source Value (text input, e.g., "JUVENILE")
   - Target Age Group (text input, e.g., "u12")
4. **Skill Initialization**: Radio group for strategy + custom template selector
5. **Defaults**: Toggles for createTeams, createPassports, season input

#### 4. `apps/web/src/components/import/templates/sample-upload-dialog.tsx`

Upload a sample CSV to auto-generate template mappings.

**Flow:**
1. User uploads or pastes a sample CSV (reuse UploadStep's file/paste logic)
2. System parses the CSV using `parseCSV`
3. System runs `suggestMappingsSimple` on the headers
4. Results pre-fill the column mappings section of the template form
5. User reviews, adjusts, names the template, and saves

#### 5. `apps/web/src/components/import/templates/clone-dialog.tsx`

Simple dialog: enter new name, confirm clone.

#### 6. `apps/web/src/components/import/templates/delete-dialog.tsx`

Confirmation dialog with warning about soft-delete.

### Files to Modify

#### `apps/web/src/components/layout/admin-sidebar.tsx`

Add "Manage Templates" link under "Data & Import" group, using `FileSpreadsheet` icon.

---

## Backend Changes

### New Query: Template Usage Stats

Add a query to `importSessions.ts` that counts how many times each template was used and when it was last used. This avoids N+1 queries when displaying the template list.

```typescript
export const getTemplateUsageStats = query({
  args: {
    templateIds: v.array(v.id("importTemplates")),
  },
  returns: v.array(v.object({
    templateId: v.id("importTemplates"),
    usageCount: v.number(),
    lastUsedAt: v.union(v.number(), v.null()),
  })),
  handler: async (ctx, args) => {
    // Batch fetch sessions by template, aggregate counts
  },
});
```

### New Index

Add index on `importSessions` table for template lookup:
```typescript
.index("by_templateId", ["templateId"])
```

---

## UX Patterns

### Platform Staff vs Org Admins

| Action | Platform Staff | Org Admin |
|--------|---------------|-----------|
| View all templates | Yes | Yes (own org + platform) |
| Create platform template | Yes | No |
| Create org template | Yes | Yes (own org only) |
| Edit platform template | Yes | No (clone instead) |
| Edit org template | Yes | Yes (own org only) |
| Clone any template | Yes | Yes |
| Delete platform template | Yes | No |
| Delete org template | Yes | Yes (own org only) |

**Note:** For initial implementation, all admin/owner users see the same UI. Platform staff detection can use `user.isPlatformStaff` field. Org admins who aren't platform staff see platform templates as read-only with a "Clone to My Org" button.

### Sample Upload Flow

This is the key differentiator — admins don't need to understand source patterns or target fields. They just upload a real CSV and the system figures it out:

1. Click "Create from Sample"
2. Upload/paste a CSV (same UI as import wizard step 1)
3. System parses headers and runs auto-mapping
4. Pre-fills the template form with detected mappings
5. Admin reviews: green checkmarks for high-confidence mappings, yellow for medium, red for unmapped
6. Admin names the template, adjusts any mappings, saves
7. Template is immediately available in the import wizard

---

## Testing Requirements

### Manual Tests

1. **Create template manually**: Fill all form sections, save, verify in list
2. **Create from sample CSV**: Upload CSV, verify auto-detected mappings, save
3. **Edit template**: Change name, add/remove mappings, verify saved
4. **Clone template**: Clone platform template to org, verify new copy
5. **Delete template**: Delete org template, verify soft-deleted (not in list)
6. **Use in wizard**: Create template, start import, verify template appears and mappings apply
7. **Role check**: Verify non-admin users cannot access templates page
8. **Platform vs org**: Verify org admins can't edit platform templates

---

## Definition of Done

- [ ] Template list page at `/orgs/[orgId]/admin/templates`
- [ ] Create/edit form with all 5 sections
- [ ] Sample CSV upload auto-generates mappings
- [ ] Clone and delete dialogs functional
- [ ] Admin sidebar link added
- [ ] Usage stats displayed in list
- [ ] Role check enforced
- [ ] `npm run check-types` passes
- [ ] `npx ultracite fix` clean
