# PlayerARC Import System - Comprehensive Guide

**Last Updated**: February 17, 2026
**For**: Engineering Team Onboarding & Support
**Status**: Production (Active on main branch)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Route 1: Admin Templates Management](#route-1-admin-templates-management)
3. [Route 2: Import Wizard](#route-2-import-wizard)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [Common Workflows](#common-workflows)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

The PlayerARC Import System is a **multi-sport, configurable import framework** that enables organizations to import player data from CSV files or pasted data. The system consists of two main user-facing routes and a comprehensive backend infrastructure.

### Key Features

- **Multi-sport support**: Works with GAA, Soccer, Rugby, Basketball, and custom sports
- **Template-based configuration**: Reusable column mappings for different data sources
- **Intelligent field mapping**: AI-powered auto-detection with manual override
- **Per-player selection**: Granular control over which players to import
- **Data quality scoring**: Real-time validation and quality assessment
- **Dry-run simulation**: Preview import results before committing
- **Draft resume**: Save progress and resume later
- **Full audit trail**: Complete import history with undo capability
- **Guardian matching**: Smart parent-child linking with confidence scoring

### User Personas

| Persona | Access | Routes |
|---------|--------|--------|
| **Platform Staff** | Full system access | `/platform/templates` |
| **Organization Admin** | Org-scoped access | `/orgs/[orgId]/admin/templates`, `/orgs/[orgId]/import` |
| **Organization Owner** | Org-scoped access | `/orgs/[orgId]/admin/templates`, `/orgs/[orgId]/import` |

---

## Route 1: Admin Templates Management

### URL Pattern

- **Org-level**: `https://www.playerarc.io/orgs/[orgId]/admin/templates`
- **Platform-level**: `https://www.playerarc.io/platform/templates`

### Purpose

Manage import templates that define how CSV/Excel columns map to PlayerARC's player data model. Templates enable consistent, repeatable imports and reduce manual configuration.

### Access Control

**Org Admin/Owner**:
- View platform-wide templates (read-only)
- View organization-specific templates
- Create/edit/delete organization-specific templates
- Clone platform templates to customize for their organization

**Platform Staff**:
- Full CRUD access to platform-wide templates
- View all organization templates (for support)

### Page Layout

#### Header Section
```
┌─────────────────────────────────────────────────────┐
│ Import Templates                [Upload Sample] [+] │
│ Manage import configurations for player data        │
├─────────────────────────────────────────────────────┤
│ [Search box]              [Sport Filter Dropdown]   │
└─────────────────────────────────────────────────────┘
```

#### Template Table (Desktop)

| Column | Description | Example |
|--------|-------------|---------|
| **Name** | Template name | "GAA Foireann Export" |
| **Sport** | Sport code or "Any Sport" | GAA Football |
| **Scope** | Platform or Organization | Platform / Custom |
| **Source** | File type supported | CSV |
| **Mappings** | Number of field mappings | 15 fields |
| **Last Used** | Most recent import date | 2 hours ago |
| **Actions** | Edit, Clone, Delete buttons | ... |

#### Template Cards (Mobile)
- Stacked card layout showing same information
- Swipeable actions on mobile
- Responsive design for all viewports

### Features in Detail

#### 1. **Upload Sample** Feature

**Purpose**: Generate a template by analyzing a sample CSV file

**Workflow**:
1. User clicks "Upload Sample"
2. Uploads a CSV file with representative data
3. System analyzes headers and sample values
4. AI-powered mapper suggests field mappings
5. Pre-fills template form with detected mappings
6. User reviews and saves as new template

**Code Location**: `apps/web/src/components/import/templates/sample-upload-dialog.tsx`

**Backend Processing**:
- File: `packages/backend/convex/lib/import/parser.ts`
- Function: `parseCSV()` - detects headers, validates format
- Function: `suggestMappingsSimple()` - AI field mapping

**Example**:
```csv
Forename,Surname,DOB,Team Name
John,Smith,2010-05-15,U14 Boys
```
→ Detects:
- `Forename` → `firstName` (confidence: 95%)
- `Surname` → `lastName` (confidence: 95%)
- `DOB` → `dateOfBirth` (confidence: 90%)
- `Team Name` → `teamName` (confidence: 85%)

#### 2. **Create Template** Feature

**Purpose**: Manually configure a new import template

**Form Sections**:

**Basic Information**:
- Template Name (required)
- Description (optional)
- Sport Code (optional - leave blank for multi-sport)
- Source Type: CSV / Excel / Paste

**Column Mappings**:
- Source Column Pattern (e.g., "Forename", "/first.*name/i")
- Target Field (dropdown: firstName, lastName, etc.)
- Required checkbox
- Transform function (optional): toUpperCase, parseDate, etc.
- Aliases (alternative column names)

**Age Group Mappings** (Sport-specific):
- Source Value (e.g., "JUVENILE", "U12")
- Target Age Group (u6, u7, u8, ... senior)

**Skill Initialization Strategy**:
- **blank**: All ratings set to 1
- **middle**: All ratings set to 3
- **age-appropriate**: Based on age group standards
- **ngb-benchmarks**: Use governing body benchmarks
- **custom**: Use custom benchmark template

**Default Behaviors**:
- Auto-create teams (checkbox)
- Auto-create passports (checkbox)
- Default season (optional)

**Code Location**: `apps/web/src/components/import/templates/template-form.tsx`

**Validation**:
- At least one column mapping required
- Required fields must be mapped
- No duplicate target fields (except "_skip")
- Valid regex patterns for source patterns

#### 3. **Edit Template**

**Purpose**: Modify existing template configuration

**Permissions**:
- Org admins can only edit organization-scoped templates
- Platform staff can edit platform-scoped templates

**Behavior**:
- Same form as Create Template
- Pre-populated with existing values
- Saves update to existing template ID

#### 4. **Clone Template**

**Purpose**: Duplicate a template to customize it

**Use Cases**:
- Organization wants to customize a platform template
- Creating variations for different data sources
- Testing new mapping configurations

**Dialog**: `apps/web/src/components/import/templates/clone-dialog.tsx`

**Workflow**:
1. User clicks Clone on platform template
2. Dialog prompts for new name
3. System creates organization-scoped copy
4. User can then edit the clone

**Backend**:
```typescript
// packages/backend/convex/models/importTemplates.ts
export const cloneTemplate = mutation({
  args: {
    templateId: v.id("importTemplates"),
    newName: v.string(),
    createdBy: v.string(),
  },
  // Creates duplicate with new scope/org
});
```

#### 5. **Delete Template**

**Purpose**: Soft-delete a template (sets `isActive: false`)

**Safety**:
- Confirmation dialog required
- Shows usage count if template has been used
- Cannot delete if actively used in imports
- Soft delete preserves audit trail

**Backend**:
```typescript
// Soft delete - template remains in DB
await ctx.db.patch(templateId, {
  isActive: false,
  updatedAt: Date.now(),
});
```

#### 6. **Search & Filter**

**Search**:
- Searches template name and description
- Case-insensitive
- Real-time filtering

**Sport Filter**:
- Options: All Sports, GAA Football, Hurling, Soccer, Rugby, Basketball
- Special handling: GAA sports share templates (Foireann covers all GAA codes)
- Shows templates with matching sport code OR no sport code (multi-sport)

**Code**:
```typescript
// apps/web/src/components/import/templates/template-list-helpers.ts
export function filterTemplates(
  templates: Template[],
  search: string,
  sportFilter: string
): Template[] {
  // Search + sport filter logic
}
```

#### 7. **Usage Statistics**

**Displays**:
- Total usage count
- Last used timestamp
- Relative time display (e.g., "2 hours ago", "3 days ago")

**Backend Query**:
```typescript
// packages/backend/convex/models/importSessions.ts
export const getTemplateUsageStats = query({
  args: { templateIds: v.array(v.id("importTemplates")) },
  returns: v.array(v.object({
    templateId: v.id("importTemplates"),
    usageCount: v.number(),
    lastUsedAt: v.union(v.number(), v.null()),
  })),
  // Batched fetch for performance
});
```

**Performance Note**: Uses batch fetch + Map lookup to avoid N+1 queries

---

## Route 2: Import Wizard

### URL Pattern

- **Landing Page**: `https://www.playerarc.io/orgs/[orgId]/import`
- **Wizard Flow**: `https://www.playerarc.io/orgs/[orgId]/import/wizard?templateId=...&sport=...`
- **Resume Flow**: `https://www.playerarc.io/orgs/[orgId]/import/wizard?resume=true`
- **Import History**: `https://www.playerarc.io/orgs/[orgId]/import/history`

### Purpose

Multi-step wizard that guides admins through importing player data from CSV files or pasted data.

### Access Control

**Required Roles**:
- Organization Owner OR
- Organization Admin (Better Auth role) OR
- Admin functional role

**Access Check**:
```typescript
// apps/web/src/app/orgs/[orgId]/import/page.tsx
const functionalRoles = (member as any).functionalRoles || [];
const hasAdminFunctionalRole = functionalRoles.includes("admin");
const hasBetterAuthAdminRole =
  member.role === "admin" || member.role === "owner";

setHasAccess(hasAdminFunctionalRole || hasBetterAuthAdminRole);
```

### Landing Page (`/import`)

#### Header
```
← Import Players
Import players from CSV files or spreadsheets
```

#### Resume Draft Card (if exists)
```
┌─────────────────────────────────────────────────────┐
│ ▶ Resume Import                                     │
│ You have an unfinished import. Pick up where you    │
│ left off.                                           │
│                                                     │
│ File: players.csv  Progress: Map Columns           │
│ Saved: 2 hours ago  Rows: 150                      │
│ Expires in 6 days                                   │
│                                                     │
│ [Resume Import]              [Discard]              │
└─────────────────────────────────────────────────────┘
```

**Backend**:
```typescript
// Draft expires after 7 days
const DRAFT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;
```

#### Undo Notification (if recent import)
```
⚠ Last import can be undone
Your most recent import can be undone within the next 18h 42m.
[View Import History]
```

**Rule**: Imports can be undone within 24 hours of completion

#### Sport Selection
```
┌─────────────────────────────────────────────────────┐
│ Select Sport                                        │
│ Choose a sport to filter available templates        │
│                                                     │
│ [Dropdown: All Sports / GAA Football / Soccer ...]  │
└─────────────────────────────────────────────────────┘
```

#### Template Selection

**Template Card Example**:
```
┌─────────────────────────────────────────────────────┐
│ GAA Foireann Export                            ✓    │
│ Standard import for GAA Football member exports     │
│                                                     │
│ [GAA Football] [CSV] [15 fields] [Custom]          │
└─────────────────────────────────────────────────────┘
```

**Badges**:
- Sport name
- Source type (CSV/Excel/Paste)
- Field count
- Scope (Platform/Custom)

#### Start Import Button
```
[Start Import with "GAA Foireann Export"]
```

#### Recent Imports (last 5)
```
┌─────────────────────────────────────────────────────┐
│ players.csv                    [✓ Completed]        │
│ Jan 15, 2026 10:30 AM  •  150 rows  •  145 created  │
├─────────────────────────────────────────────────────┤
│ new_members.csv                [✓ Completed]        │
│ Jan 12, 2026 14:20 PM  •  75 rows  •  72 created    │
└─────────────────────────────────────────────────────┘

[View Import History]
```

#### Legacy Importers
```
┌─────────────────────────────────────────────────────┐
│ Legacy Importers                                    │
│ Use the original GAA or basic importer              │
│                                                     │
│                      [GAA Import] [Basic Import]    │
└─────────────────────────────────────────────────────┘
```

**Note**: These link to old import systems for backward compatibility

### Wizard Flow (`/import/wizard`)

The import wizard consists of **8 steps**:

#### Step 1: Upload

**Purpose**: Get data into the system

**Input Methods**:

1. **File Upload**:
   - Drag & drop CSV file
   - Click to browse
   - Supports up to 10MB files
   - Auto-detects headers

2. **Paste Data**:
   - Paste from Excel/Google Sheets
   - Tab-separated values
   - Auto-detects format

**Preview**:
```
┌─────────────────────────────────────────────────────┐
│ #  Forename  Surname   DOB        Team Name         │
├─────────────────────────────────────────────────────┤
│ 1  John      Smith     2010-05-15 U14 Boys          │
│ 2  Sarah     Jones     2011-03-20 U13 Girls         │
│ 3  Michael   O'Brien   2009-08-10 U15 Boys          │
└─────────────────────────────────────────────────────┘
Showing first 3 of 150 rows
```

**Validation**:
- Minimum 2 columns required
- Maximum 100 columns
- Minimum 1 row (excluding header)
- Maximum 10,000 rows per import

**Code**: `apps/web/src/components/import/steps/upload-step.tsx`

**Backend Parser**:
```typescript
// packages/backend/convex/lib/import/parser.ts
export function parseCSV(content: string): ParseResult {
  // Detects delimiter (comma, semicolon, tab)
  // Validates UTF-8 encoding
  // Handles quoted fields
  // Returns { headers, rows, totalRows }
}
```

#### Step 2: Map Columns

**Purpose**: Map CSV columns to PlayerARC fields

**Auto-Mapping**:
- Uses template mappings if template selected
- Falls back to AI-powered fuzzy matching
- Shows confidence score per mapping

**Mapping Row**:
```
┌─────────────────────────────────────────────────────┐
│ Forename                                [✓ 95%]     │
│ John, Sarah, Michael                                │
│                                                     │
│ Maps to: [First Name ▼]                    [🔒]     │
└─────────────────────────────────────────────────────┘
```

**Confidence Badges**:
- **Green (95%+)**: High confidence match
- **Yellow (70-94%)**: Medium confidence match
- **Red (<70%)**: Unmapped or low confidence

**Lock Feature**:
- Lock mappings to prevent auto-remapping
- Useful when correcting AI suggestions

**Validation**:
- Required fields must be mapped
- No duplicate target fields (except "_skip")
- At least firstName + lastName required

**Available Target Fields**:
```typescript
// packages/backend/convex/lib/import/mapper.ts
export const DEFAULT_TARGET_FIELDS: FieldDefinition[] = [
  { name: "firstName", label: "First Name", required: true },
  { name: "lastName", label: "Last Name", required: true },
  { name: "dateOfBirth", label: "Date of Birth", required: false },
  { name: "email", label: "Email Address", required: false },
  { name: "phone", label: "Phone Number", required: false },
  { name: "address", label: "Street Address", required: false },
  { name: "city", label: "City/Town", required: false },
  { name: "county", label: "County", required: false },
  { name: "postcode", label: "Postcode/Eircode", required: false },
  { name: "gender", label: "Gender", required: false },
  { name: "teamName", label: "Team Name", required: false },
  { name: "ageGroup", label: "Age Group", required: false },
  { name: "guardianName", label: "Guardian Name", required: false },
  { name: "guardianEmail", label: "Guardian Email", required: false },
  { name: "guardianPhone", label: "Guardian Phone", required: false },
  // ... more fields
];
```

**Code**: `apps/web/src/components/import/steps/mapping-step.tsx`

#### Step 3: Select Players

**Purpose**: Choose which players to import (per-row granular control)

**UI**:
```
┌─────────────────────────────────────────────────────┐
│ [Search players...]              [All] [None] [125] │
├─────────────────────────────────────────────────────┤
│ [✓] John Smith       2010-05-15  U14 Boys           │
│ [✓] Sarah Jones      2011-03-20  U13 Girls          │
│ [ ] Michael O'Brien  2009-08-10  U15 Boys  [⚠]      │
│     (Duplicate - already exists)                    │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Checkbox per player
- Bulk select/deselect all
- Search to filter list
- Warning indicators for duplicates/errors
- Count of selected players

**Duplicate Detection**:
- Matches on: firstName + lastName + dateOfBirth
- Shows existing player info
- Option to skip or merge

**Code**: `apps/web/src/components/import/steps/player-selection-step.tsx`

**Backend**:
```typescript
// Stored in session
playerSelections: v.array(v.object({
  rowIndex: v.number(),
  selected: v.boolean(),
  reason: v.optional(v.string()),
}))
```

#### Step 4: Quality Check

**Purpose**: Review data quality and fix validation errors

**Quality Score**:
```
┌─────────────────────────────────────────────────────┐
│ Data Quality Score: 87%                    [Good]   │
│                                                     │
│ ████████████████████░░░                             │
│                                                     │
│ ✓ 140 rows valid                                    │
│ ⚠ 10 rows have warnings                             │
│ ✗ 0 rows have critical errors                      │
└─────────────────────────────────────────────────────┘
```

**Quality Categories**:

1. **Critical Issues** (blocks import):
   - Missing required fields
   - Invalid date formats
   - Invalid email formats
   - Invalid phone formats

2. **Warnings** (proceeds with caution):
   - Missing optional fields
   - Inconsistent capitalization
   - Unusual age values
   - Missing team names

3. **Suggestions**:
   - Data normalization opportunities
   - Potential duplicates
   - Guardian matching improvements

**Issue Table**:
```
┌─────────────────────────────────────────────────────┐
│ Row  Field       Issue              Value     Action│
├─────────────────────────────────────────────────────┤
│ 15   Email       Invalid format     john@        [Fix]│
│ 23   DOB         Invalid date       32/13/2010   [Fix]│
│ 45   Phone       Missing country    555-1234     [Fix]│
└─────────────────────────────────────────────────────┘
```

**Code**: `apps/web/src/components/import/data-quality-report.tsx`

**Backend Validation**:
```typescript
// packages/backend/convex/lib/import/dataQuality.ts
export function calculateDataQuality(
  rows: Record<string, string>[],
  mappings: Record<string, string>
): QualityReport {
  // Validates each row
  // Returns scores, issues, suggestions
}
```

#### Step 5: Benchmarks

**Purpose**: Configure skill rating initialization for new players

**Strategies**:

1. **Blank** (All 1s):
   - Safest option
   - Forces coaches to assess every skill
   - Best for new programs

2. **Middle** (All 3s):
   - Assumes average ability
   - Quick start for established programs

3. **Age-Appropriate**:
   - Uses age group standards
   - Different baselines per age group
   - Example: U8 = 1, U10 = 2, U12 = 2, U14 = 3

4. **NGB Benchmarks**:
   - Uses governing body standards
   - Sport-specific expectations
   - Requires NGB benchmark data

5. **Custom Template**:
   - Uses custom benchmark template
   - Fully configurable per skill

**UI**:
```
┌─────────────────────────────────────────────────────┐
│ Skill Rating Initialization                         │
│                                                     │
│ ○ Blank (All 1s)                                    │
│ ● Age-Appropriate                                   │
│ ○ Middle (All 3s)                                   │
│ ○ NGB Benchmarks                                    │
│ ○ Custom Template                                   │
│                                                     │
│ Apply to: [✓] All new players                       │
│           [✓] Players without passports             │
└─────────────────────────────────────────────────────┘
```

**Passport Status Filter**:
- Apply only to new players
- Apply to players without passports
- Apply to all players (overwrites existing)

**Code**: `apps/web/src/components/import/steps/benchmark-config-step.tsx`

#### Step 6: Review

**Purpose**: Final validation and duplicate resolution

**Summary**:
```
┌─────────────────────────────────────────────────────┐
│ Import Summary                                      │
│                                                     │
│ 150 total rows                                      │
│ 145 selected for import                             │
│ 140 valid rows                                      │
│ 5 duplicates detected                               │
│ 0 critical errors                                   │
│                                                     │
│ [< Back to Quality Check]      [Start Import >]     │
└─────────────────────────────────────────────────────┘
```

**Duplicate Resolution**:
```
┌─────────────────────────────────────────────────────┐
│ Duplicate: John Smith (DOB: 2010-05-15)             │
│                                                     │
│ Existing Player:                New Data:           │
│ U14 Boys                        U15 Boys            │
│ john.smith@email.com           john@newemail.com    │
│                                                     │
│ Resolution:                                         │
│ ○ Skip (don't import)                               │
│ ● Merge (update existing)                           │
│ ○ Create New (duplicate name OK)                    │
└─────────────────────────────────────────────────────┘
```

**Guardian Matching Confidence**:
```
┌─────────────────────────────────────────────────────┐
│ Guardian Match: Mary Smith                          │
│                                                     │
│ Confidence: 95% [High]                              │
│                                                     │
│ Matches on:                                         │
│ ✓ Email: mary.smith@email.com                       │
│ ✓ Phone: +353 87 123 4567                           │
│ ✓ Address: Same postcode                            │
│                                                     │
│ [Accept Match]  [Manual Link]  [Skip]               │
└─────────────────────────────────────────────────────┘
```

**Validation Checks**:
- All required fields mapped
- No critical errors unresolved
- All duplicates have resolution strategy
- At least 1 player selected

**Code**: `apps/web/src/components/import/steps/review-step.tsx`

#### Step 7: Import

**Purpose**: Execute the import and show real-time progress

**Progress**:
```
┌─────────────────────────────────────────────────────┐
│ Importing Players...                                │
│                                                     │
│ ████████████████████████░░░░░░  75%                 │
│                                                     │
│ Processing row 113 of 150                           │
│                                                     │
│ ✓ 108 players created                               │
│ ✓ 42 guardians created                              │
│ ✓ 15 guardians linked                               │
│ ✓ 8 teams created                                   │
│ ✓ 108 passports created                             │
│ ✓ 108 benchmarks applied                            │
│                                                     │
│ [Cancel Import]                                     │
└─────────────────────────────────────────────────────┘
```

**Real-time Updates**:
- Progress bar
- Current row being processed
- Running counts of created entities
- Estimated time remaining

**Cancellation**:
- User can cancel mid-import
- Already-created entities remain
- Session marked as "cancelled"

**Code**: `apps/web/src/components/import/steps/import-step.tsx`

**Backend**:
```typescript
// packages/backend/convex/models/importSessions.ts
export const executeImport = mutation({
  // Batched creation for performance
  // Updates session stats in real-time
  // Handles errors gracefully (row-level, not file-level)
});
```

#### Step 8: Complete

**Purpose**: Show final results and next steps

**Success**:
```
┌─────────────────────────────────────────────────────┐
│ ✓ Import Complete!                                  │
│                                                     │
│ Successfully imported 145 of 150 players            │
│                                                     │
│ Results:                                            │
│ ✓ 140 players created                               │
│ ✓ 5 players updated                                 │
│ ⊝ 5 players skipped (duplicates)                    │
│ ✓ 45 guardians created                              │
│ ✓ 18 guardians linked                               │
│ ✓ 12 teams created                                  │
│ ✓ 140 passports created                             │
│ ✓ 140 benchmarks applied                            │
│                                                     │
│ [View Players]  [Import More]  [View History]       │
└─────────────────────────────────────────────────────┘
```

**With Errors**:
```
┌─────────────────────────────────────────────────────┐
│ ⚠ Import Completed with Warnings                    │
│                                                     │
│ Imported 140 of 150 players                         │
│                                                     │
│ ✗ 10 rows failed:                                   │
│   • Row 15: Invalid email format                    │
│   • Row 23: Invalid date of birth                   │
│   • Row 45: Missing required field                  │
│   ... [View All Errors]                             │
│                                                     │
│ [Download Error Report]  [Try Again]                │
└─────────────────────────────────────────────────────┘
```

**Next Actions**:
- View imported players
- Start another import
- View import history
- Download error report (if errors)

**Code**: `apps/web/src/components/import/steps/complete-step.tsx`

### Import History Page (`/import/history`)

**Purpose**: View all past imports with filtering and undo capability

**Filters**:
```
┌─────────────────────────────────────────────────────┐
│ [Status: All ▼]  [Date: Last 30 Days ▼]            │
└─────────────────────────────────────────────────────┘
```

**Import Table**:
```
┌─────────────────────────────────────────────────────┐
│ Date/Time         File         Status    Results    │
├─────────────────────────────────────────────────────┤
│ Jan 15, 10:30 AM  players.csv  [Success] 145/150    │
│                                          [Details] [Undo]│
├─────────────────────────────────────────────────────┤
│ Jan 12, 2:20 PM   members.csv  [Partial] 72/75      │
│                                          [Details]   │
└─────────────────────────────────────────────────────┘
```

**Status Options**:
- All
- Success (completed, no errors)
- Partial (completed, some errors)
- Failed

**Date Ranges**:
- Last 7 days
- Last 30 days
- All time

**Undo Feature**:
- Available for 24 hours after completion
- Deletes all entities created in that import
- Confirmation dialog required
- Irreversible after undo

**Partial Undo**:
- Undo specific players from an import
- Select which entities to remove
- Useful when only part of import was wrong

**Details Dialog**:
```
┌─────────────────────────────────────────────────────┐
│ Import Details: players.csv                         │
│                                                     │
│ Imported: Jan 15, 2026 at 10:30 AM                  │
│ By: admin@club.com                                   │
│ Template: GAA Foireann Export                       │
│                                                     │
│ Statistics:                                         │
│ • 150 total rows                                    │
│ • 145 selected                                      │
│ • 140 players created                               │
│ • 5 players updated                                 │
│ • 45 guardians created                              │
│ • 12 teams created                                  │
│                                                     │
│ Errors (5):                                         │
│ • Row 15: Invalid email                             │
│ • Row 23: Invalid DOB                               │
│ ...                                                 │
│                                                     │
│ [Download Full Report]  [Close]                     │
└─────────────────────────────────────────────────────┘
```

**Code**: `apps/web/src/app/orgs/[orgId]/import/history/page.tsx`

---

## Backend Architecture

### Core Components

#### 1. **Parser Engine**

**Location**: `packages/backend/convex/lib/import/parser.ts`

**Responsibilities**:
- Detect file format (CSV delimiter, encoding)
- Parse headers and rows
- Validate structure
- Handle edge cases (quoted fields, escaped characters)

**Key Function**:
```typescript
export function parseCSV(content: string): ParseResult {
  // Detects delimiter (comma, semicolon, tab, pipe)
  // Handles quoted fields with embedded delimiters
  // Validates UTF-8 encoding
  // Returns structured data
}
```

**Return Type**:
```typescript
type ParseResult = {
  headers: string[];      // Column names
  rows: Record<string, string>[]; // Data rows
  totalRows: number;      // Row count
};
```

#### 2. **Mapper Engine**

**Location**: `packages/backend/convex/lib/import/mapper.ts`

**Responsibilities**:
- AI-powered field mapping
- Fuzzy string matching
- Historical learning from past imports
- Confidence scoring

**Key Function**:
```typescript
export function suggestMappingsSimple(
  headers: string[],
  sampleRows: Record<string, string>[],
  targetFields: FieldDefinition[]
): MappingSuggestion[] {
  // Fuzzy match header names to target fields
  // Analyzes sample values for type detection
  // Returns confidence-scored suggestions
}
```

**Mapping Algorithm**:
1. **Exact Match** (100%): "firstName" → "firstName"
2. **Fuzzy Match** (95%): "Forename" → "firstName"
3. **Alias Match** (90%): "First Name" → "firstName"
4. **Regex Match** (85%): "/first.*name/i" → "firstName"
5. **Value Analysis** (70%): Email format → "email"

#### 3. **Validator Engine**

**Location**: `packages/backend/convex/lib/import/dataQuality.ts`

**Responsibilities**:
- Schema validation (required fields, data types)
- Business rules (age ranges, valid dates)
- Data quality scoring
- Error and warning collection

**Key Function**:
```typescript
export function calculateDataQuality(
  rows: Record<string, string>[],
  mappings: Record<string, string>
): QualityReport {
  // Validates each row
  // Scores data quality (0-100)
  // Categorizes issues (critical/warning/suggestion)
}
```

**Quality Metrics**:
- **Completeness**: % of required fields filled
- **Validity**: % of values passing validation
- **Consistency**: % of values following patterns
- **Accuracy**: % of values within expected ranges

#### 4. **Writer Engine**

**Location**: `packages/backend/convex/models/importSessions.ts`

**Responsibilities**:
- Batch entity creation
- Transaction management
- Error handling (row-level, not file-level)
- Statistics tracking

**Key Mutation**:
```typescript
export const executeImport = mutation({
  args: {
    sessionId: v.id("importSessions"),
    organizationId: v.string(),
    // ... row data
  },
  handler: async (ctx, args) => {
    // Batch create players
    // Batch create guardians
    // Link guardians to players
    // Create teams
    // Create passports
    // Apply benchmarks
    // Update session stats
  }
});
```

**Batch Processing**:
- Creates entities in batches of 50
- Continues on individual row errors
- Tracks successes and failures separately

#### 5. **Guardian Matcher**

**Location**: `packages/backend/convex/lib/matching/guardianMatcher.ts`

**Responsibilities**:
- Match imported guardian data to existing guardians
- Multi-factor confidence scoring
- Smart fallback strategies

**Matching Algorithm**:
```typescript
export function findGuardianMatches(
  guardianData: GuardianInput,
  existingGuardians: Guardian[]
): GuardianMatch[] {
  // Scores each existing guardian
  // Factors: email, phone, address, name
  // Returns sorted by confidence
}
```

**Confidence Scoring**:
- **High (95%+)**: Email exact match
- **Medium (70-94%)**: Phone + partial name match
- **Low (<70%)**: Name match only

**Match Reasons**:
- Email match
- Phone match
- Postcode match
- Name similarity
- Multiple children at same organization

### Database Tables

#### `importTemplates`

**Purpose**: Store reusable import configurations

**Schema**:
```typescript
defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  sportCode: v.optional(v.string()),
  sourceType: v.union(v.literal("csv"), v.literal("excel"), v.literal("paste")),
  scope: v.union(v.literal("platform"), v.literal("organization")),
  organizationId: v.optional(v.string()),

  columnMappings: v.array(v.object({
    sourcePattern: v.string(),
    targetField: v.string(),
    required: v.boolean(),
    transform: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
  })),

  ageGroupMappings: v.optional(v.array(v.object({
    sourceValue: v.string(),
    targetAgeGroup: v.string(),
  }))),

  skillInitialization: v.object({
    strategy: v.string(),
    customBenchmarkTemplateId: v.optional(v.id("benchmarkTemplates")),
    applyToPassportStatus: v.optional(v.array(v.string())),
  }),

  defaults: v.object({
    createTeams: v.boolean(),
    createPassports: v.boolean(),
    season: v.optional(v.string()),
  }),

  isActive: v.boolean(),
  createdBy: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_scope", ["scope"])
  .index("by_sportCode", ["sportCode"])
  .index("by_organizationId", ["organizationId"])
  .index("by_scope_and_sport", ["scope", "sportCode"])
```

**Indexes**:
- `by_scope`: List all platform or organization templates
- `by_sportCode`: Filter by sport
- `by_organizationId`: Org-specific templates
- `by_scope_and_sport`: Combined filter (performance)

**Example**:
```json
{
  "_id": "jh71234...",
  "name": "GAA Foireann Export",
  "description": "Standard import for GAA Football member exports from Foireann system",
  "sportCode": "gaa_football",
  "sourceType": "csv",
  "scope": "platform",
  "organizationId": undefined,
  "columnMappings": [
    {
      "sourcePattern": "Forename",
      "targetField": "firstName",
      "required": true,
      "aliases": ["First Name", "Given Name"]
    },
    // ... more mappings
  ],
  "skillInitialization": {
    "strategy": "age-appropriate"
  },
  "defaults": {
    "createTeams": true,
    "createPassports": true,
    "season": "2025-2026"
  },
  "isActive": true,
  "createdBy": "user_123",
  "createdAt": 1705334400000,
  "updatedAt": 1705334400000
}
```

#### `importSessions`

**Purpose**: Track each import execution with full audit trail

**Schema**:
```typescript
defineTable({
  organizationId: v.string(),
  templateId: v.optional(v.id("importTemplates")),
  initiatedBy: v.string(),

  status: v.union(
    v.literal("uploading"),
    v.literal("mapping"),
    v.literal("selecting"),
    v.literal("reviewing"),
    v.literal("importing"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("cancelled"),
    v.literal("undone")
  ),

  sourceInfo: v.object({
    type: v.union(v.literal("file"), v.literal("paste"), v.literal("api")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    rowCount: v.number(),
    columnCount: v.number(),
  }),

  mappings: v.record(v.string(), v.string()),

  playerSelections: v.array(v.object({
    rowIndex: v.number(),
    selected: v.boolean(),
    reason: v.optional(v.string()),
  })),

  benchmarkSettings: v.optional(v.object({
    applyBenchmarks: v.boolean(),
    strategy: v.string(),
    customTemplateId: v.optional(v.id("benchmarkTemplates")),
    passportStatuses: v.array(v.string()),
  })),

  stats: v.object({
    totalRows: v.number(),
    selectedRows: v.number(),
    validRows: v.number(),
    errorRows: v.number(),
    duplicateRows: v.number(),
    playersCreated: v.number(),
    playersUpdated: v.number(),
    playersSkipped: v.number(),
    guardiansCreated: v.number(),
    guardiansLinked: v.number(),
    teamsCreated: v.number(),
    passportsCreated: v.number(),
    benchmarksApplied: v.number(),
  }),

  errors: v.array(v.object({
    rowNumber: v.number(),
    field: v.string(),
    error: v.string(),
    value: v.optional(v.string()),
    resolved: v.boolean(),
  })),

  duplicates: v.array(v.object({
    rowNumber: v.number(),
    existingPlayerId: v.id("playerIdentities"),
    resolution: v.union(
      v.literal("skip"),
      v.literal("merge"),
      v.literal("replace")
    ),
    guardianConfidence: v.optional(v.object({
      score: v.number(),
      level: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
      matchReasons: v.array(v.string()),
    })),
  })),

  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  undoneAt: v.optional(v.number()),
  undoneBy: v.optional(v.string()),
  undoReason: v.optional(v.string()),
})
  .index("by_organizationId", ["organizationId"])
  .index("by_status", ["status"])
  .index("by_initiatedBy", ["initiatedBy"])
  .index("by_startedAt", ["startedAt"])
  .index("by_org_and_status", ["organizationId", "status"])
```

**Status Transitions**:
```
uploading → mapping → selecting → reviewing → importing → completed
                                              ↓
                                            failed
          ↓
        cancelled

completed → undone
```

#### `importSessionDrafts`

**Purpose**: Save wizard progress for resume capability

**Schema**:
```typescript
defineTable({
  organizationId: v.string(),
  step: v.number(),

  templateId: v.optional(v.id("importTemplates")),
  sourceFileName: v.optional(v.string()),

  parsedHeaders: v.optional(v.array(v.string())),
  parsedRowCount: v.optional(v.number()),

  mappings: v.optional(v.record(v.string(), v.string())),

  playerSelections: v.optional(v.array(v.object({
    rowIndex: v.number(),
    selected: v.boolean(),
    reason: v.optional(v.string()),
  }))),

  benchmarkSettings: v.optional(v.object({
    applyBenchmarks: v.boolean(),
    strategy: v.string(),
    customTemplateId: v.optional(v.id("benchmarkTemplates")),
    passportStatuses: v.array(v.string()),
  })),

  lastSavedAt: v.number(),
  expiresAt: v.number(), // 7 days from last save
})
  .index("by_organizationId", ["organizationId"])
  .index("by_expiresAt", ["expiresAt"])
```

**Expiration**: Drafts expire after 7 days of inactivity

#### `importMappingHistory`

**Purpose**: Learn from past imports to improve auto-mapping

**Schema**:
```typescript
defineTable({
  organizationId: v.optional(v.string()),
  templateId: v.optional(v.id("importTemplates")),

  sourceColumnName: v.string(),
  normalizedColumnName: v.string(),
  targetField: v.string(),

  usageCount: v.number(),
  lastUsedAt: v.number(),
  createdAt: v.number(),
})
  .index("by_normalized", ["normalizedColumnName"])
  .index("by_org", ["organizationId"])
  .index("by_template", ["templateId"])
```

**Learning Process**:
1. User confirms mapping in wizard
2. System records: `"Forename" → "firstName"`
3. Next import with "Forename" auto-suggests "firstName"
4. Confidence increases with usage count

---

## Common Workflows

### Workflow 1: First-Time Import with New Template

**Scenario**: Organization wants to import GAA members for the first time

**Steps**:

1. **Navigate to Templates**
   - Go to `/orgs/[orgId]/admin/templates`
   - Click "Upload Sample"

2. **Upload Sample File**
   - Upload CSV with 5-10 representative rows
   - System analyzes headers and data

3. **Review Auto-Detected Mappings**
   - Check confidence scores
   - Adjust any incorrect mappings
   - Add any missing mappings

4. **Configure Template Settings**
   - Name: "Our Club GAA Import"
   - Sport: GAA Football
   - Skill Strategy: Age-Appropriate
   - Auto-create teams: Yes
   - Auto-create passports: Yes

5. **Save Template**
   - Template saved as organization-scoped
   - Available for future imports

6. **Navigate to Import**
   - Go to `/orgs/[orgId]/import`
   - Select sport: GAA Football
   - Select template: "Our Club GAA Import"
   - Click "Start Import"

7. **Upload Full Dataset**
   - Upload complete member CSV
   - Review auto-mapped columns (should be 95%+ confidence)

8. **Select Players**
   - Review all players
   - Deselect any duplicates or test data

9. **Review Quality**
   - Check data quality score
   - Fix any critical errors

10. **Configure Benchmarks**
    - Strategy: Age-Appropriate
    - Apply to: All new players

11. **Review & Import**
    - Check summary
    - Resolve duplicates
    - Start import

12. **Complete**
    - View results
    - Navigate to players list

**Time**: 15-20 minutes

### Workflow 2: Subsequent Import with Existing Template

**Scenario**: Organization imports updated member list monthly

**Steps**:

1. **Navigate to Import**
   - Go to `/orgs/[orgId]/import`

2. **Select Template**
   - Sport: GAA Football (or "All")
   - Template: "Our Club GAA Import"
   - Click "Start Import"

3. **Upload File**
   - Upload latest member export
   - All columns auto-map (100% confidence)
   - Click "Next"

4. **Select Players**
   - All players pre-selected
   - System flags duplicates automatically
   - Click "Next"

5. **Quality Check**
   - Review any new warnings
   - Click "Next"

6. **Benchmarks**
   - Use saved settings from last import
   - Click "Next"

7. **Review**
   - Duplicates auto-resolved (merge existing)
   - Click "Start Import"

8. **Complete**
   - View update summary
   - X players updated, Y new players created

**Time**: 5-10 minutes

### Workflow 3: Resume Interrupted Import

**Scenario**: User's browser closed mid-import

**Steps**:

1. **Navigate to Import**
   - Go to `/orgs/[orgId]/import`
   - See "Resume Import" card

2. **Review Draft Info**
   - File: members.csv
   - Progress: Step 4 (Quality Check)
   - Saved: 1 hour ago

3. **Click Resume**
   - Wizard opens at Step 1 (Upload)
   - Must re-upload file (for security)

4. **Re-upload File**
   - Upload same file
   - All previous settings auto-restored:
     - Column mappings
     - Player selections
     - Benchmark settings

5. **Continue from Where Left Off**
   - Skip to Quality Check step
   - Continue to completion

**Time**: 5 minutes

### Workflow 4: Undo Recent Import

**Scenario**: Admin imported wrong file by mistake

**Steps**:

1. **Navigate to History**
   - Go to `/orgs/[orgId]/import/history`

2. **Find Recent Import**
   - Status: Completed
   - Shows "Undo" button (within 24 hours)

3. **Click Undo**
   - Confirmation dialog appears
   - Shows what will be deleted:
     - 150 players
     - 45 guardians
     - 12 teams
     - 150 passports

4. **Confirm Undo**
   - Provide reason: "Wrong file imported"
   - Click "Confirm Undo"

5. **Undo Executes**
   - All entities deleted
   - Session marked as "undone"
   - Can no longer undo

**Time**: 2 minutes

**Warning**: Undo is permanent and cannot be reversed!

### Workflow 5: Clone Platform Template for Customization

**Scenario**: Organization wants to modify standard GAA template

**Steps**:

1. **Navigate to Templates**
   - Go to `/orgs/[orgId]/admin/templates`

2. **Find Platform Template**
   - Filter: Sport = GAA Football
   - Template: "GAA Foireann Standard Export"
   - Scope: Platform (read-only)

3. **Click Clone**
   - Dialog appears
   - Enter name: "Our Club Modified GAA Import"

4. **Clone Created**
   - New template created as organization-scoped
   - All settings copied

5. **Click Edit**
   - Modify column mappings
   - Change skill initialization strategy
   - Update defaults

6. **Save Changes**
   - Custom template ready for use

**Time**: 5 minutes

---

## Troubleshooting Guide

### Issue 1: "No templates found"

**Symptom**: Empty template list after filtering

**Causes**:
1. No templates exist for selected sport
2. All templates are inactive
3. Network error loading templates

**Solutions**:
1. Change sport filter to "All Sports"
2. Check if platform has seeded default templates
3. Contact platform staff to activate templates
4. Create custom template if needed

### Issue 2: "Column mapping confidence low"

**Symptom**: Many red badges (< 70% confidence)

**Causes**:
1. CSV headers don't match standard names
2. No template selected
3. Template doesn't match data source

**Solutions**:
1. Select appropriate template for data source
2. Manually adjust mappings using dropdown
3. Lock correct mappings to save for future
4. Create new template via "Upload Sample"

### Issue 3: "Import fails at validation step"

**Symptom**: Critical errors block import

**Common Errors**:
- **Invalid email format**: Fix email addresses (must contain @)
- **Invalid date format**: Use YYYY-MM-DD or DD/MM/YYYY
- **Missing required field**: Map firstName or lastName
- **Invalid phone format**: Use international format (+353...)

**Solutions**:
1. Download error report
2. Fix data in source file
3. Re-upload corrected file
4. Or fix inline using quality check UI

### Issue 4: "Duplicate detection too aggressive"

**Symptom**: Many false positive duplicates

**Causes**:
1. Common names (e.g., John Smith)
2. Same DOB (e.g., twins)
3. Missing DOB causes name-only match

**Solutions**:
1. Use "Create New" resolution for non-duplicates
2. Add DOB to improve accuracy
3. Add unique identifiers (member ID) if available
4. Contact platform staff to adjust matching rules

### Issue 5: "Guardian not matching automatically"

**Symptom**: Low confidence guardian matches

**Causes**:
1. Email/phone not in data
2. Email/phone changed since last import
3. Address mismatch
4. Name spelling variation

**Solutions**:
1. Use "Manual Link" to search guardians
2. Update guardian contact info first
3. Include email/phone in import data
4. Create new guardian if truly new

### Issue 6: "Draft not appearing on resume"

**Symptom**: No "Resume Import" card shown

**Causes**:
1. Draft expired (> 7 days old)
2. Draft was deleted
3. Draft belongs to different organization

**Solutions**:
1. Start fresh import
2. Check if on correct organization
3. Drafts can't be recovered after expiration

### Issue 7: "Import stuck at 'importing' status"

**Symptom**: Progress bar frozen

**Causes**:
1. Network interruption
2. Large dataset (> 5,000 rows)
3. Server error

**Solutions**:
1. Wait 5-10 minutes for large imports
2. Refresh page to check if completed
3. Check import history for status
4. Contact support if stuck > 15 minutes
5. Cancel and retry with smaller batches

### Issue 8: "Cannot undo import"

**Symptom**: Undo button disabled or missing

**Causes**:
1. > 24 hours since import
2. Already undone
3. Import failed or cancelled
4. Missing permissions

**Solutions**:
1. Check timestamp (24-hour limit is strict)
2. Use partial undo if some entities can be removed
3. Manual cleanup required if outside window
4. Verify admin/owner role

### Issue 9: "Template not appearing in import wizard"

**Symptom**: Template visible on templates page but not in import wizard

**Causes**:
1. Sport filter mismatch
2. Template is inactive
3. Template is organization-scoped (different org)

**Solutions**:
1. Change sport filter to "All Sports"
2. Check template `isActive` status
3. Verify on correct organization
4. Platform templates should always show

### Issue 10: "Performance slow with large imports"

**Symptom**: Import taking > 5 minutes for 1,000 rows

**Causes**:
1. Complex guardian matching
2. Many duplicates to resolve
3. Benchmark application overhead
4. Network latency

**Solutions**:
1. Split into smaller batches (< 500 rows)
2. Pre-resolve duplicates in source file
3. Use "blank" benchmark strategy
4. Import players first, then apply benchmarks separately

---

## Additional Resources

### Related Documentation

- **Architecture**: `docs/architecture/multi-team-system.md`
- **API Reference**: `packages/backend/convex/models/importTemplates.ts`
- **PRD**: `scripts/ralph/prds/Importing Members/generic-import-framework.md`
- **Phase 1 Implementation**: `scripts/ralph/prds/Importing Members/phase-1-foundation.md`

### Code Locations

**Frontend**:
- Templates page: `apps/web/src/app/orgs/[orgId]/admin/templates/page.tsx`
- Import landing: `apps/web/src/app/orgs/[orgId]/import/page.tsx`
- Import wizard: `apps/web/src/app/orgs/[orgId]/import/wizard/page.tsx`
- Import history: `apps/web/src/app/orgs/[orgId]/import/history/page.tsx`
- Wizard steps: `apps/web/src/components/import/steps/*.tsx`
- Template components: `apps/web/src/components/import/templates/*.tsx`

**Backend**:
- Templates CRUD: `packages/backend/convex/models/importTemplates.ts`
- Sessions lifecycle: `packages/backend/convex/models/importSessions.ts`
- Drafts: `packages/backend/convex/models/importSessionDrafts.ts`
- Analytics: `packages/backend/convex/models/importAnalytics.ts`
- Parser: `packages/backend/convex/lib/import/parser.ts`
- Mapper: `packages/backend/convex/lib/import/mapper.ts`
- Validator: `packages/backend/convex/lib/import/dataQuality.ts`
- Guardian matcher: `packages/backend/convex/lib/matching/guardianMatcher.ts`

### Support Contacts

- **Platform Issues**: platform-support@playerarc.io
- **Template Configuration**: Ask platform staff via admin dashboard
- **Bug Reports**: GitHub Issues
- **Feature Requests**: Product team via Slack

---

## Appendix: Wizard Step Reference

| Step | Name | Purpose | Key Actions | Next Enabled When |
|------|------|---------|-------------|-------------------|
| 1 | Upload | Get data into system | Upload CSV / Paste data | Valid file parsed |
| 2 | Map Columns | Map CSV to PlayerARC fields | Adjust mappings / Lock mappings | Required fields mapped |
| 3 | Select Players | Choose which players to import | Select/deselect / Search | At least 1 player selected |
| 4 | Quality Check | Review data quality | Fix errors / Review warnings | No critical errors |
| 5 | Benchmarks | Configure skill initialization | Choose strategy / Set filters | Strategy selected |
| 6 | Review | Final validation | Resolve duplicates | All duplicates resolved |
| 7 | Import | Execute import | Monitor progress / Cancel | Import completes |
| 8 | Complete | View results | View players / Import more | Always |

---

**Document Version**: 1.0
**Last Reviewed**: February 17, 2026
**Next Review**: March 17, 2026
