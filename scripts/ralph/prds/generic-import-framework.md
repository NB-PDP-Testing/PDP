# Generic Import Framework PRD

## Product Requirements Document

**Product**: PlayerARC Generic Import Framework
**Version**: 1.0
**Status**: Draft
**Author**: Product Team
**Last Updated**: January 2026

---

## Executive Summary

The Generic Import Framework transforms PlayerARC's data onboarding from a single-sport, manual-only capability into a **multi-sport, configurable, connector-based import system** that dramatically reduces time-to-value for new organizations.

This framework enables:
- **Platform Staff** to configure import templates and federation connectors
- **Club Admins** to self-service import membership data with intelligent field mapping
- **Federation APIs** to sync membership data automatically with manual override capability

The goal is to make data import **delightful, frictionless, and intuitive**—turning what is often the most painful part of software adoption into a moment that builds confidence and trust.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas & Access Model](#3-user-personas--access-model)
4. [Core Design Principles](#4-core-design-principles)
5. [System Architecture](#5-system-architecture)
6. [Feature Specifications](#6-feature-specifications)
   - 6.1 [Smart Field Mapping](#61-smart-field-mapping)
   - 6.2 [Import Wizard UX](#62-import-wizard-ux)
   - 6.3 [Conflict Resolution](#63-conflict-resolution)
   - 6.4 [Guardian Matching](#64-guardian-matching)
   - 6.5 [Data Sources & Connectors](#65-data-sources--connectors)
   - 6.6 [Import Templates](#66-import-templates)
   - 6.7 [Recurring Syncs](#67-recurring-syncs)
   - 6.8 [Platform Staff Tools](#68-platform-staff-tools)
7. [Data Model](#7-data-model)
8. [Technical Implementation](#8-technical-implementation)
9. [Security & Privacy](#9-security--privacy)
10. [Phased Rollout Plan](#10-phased-rollout-plan)
11. [Open Questions](#11-open-questions)
12. [Appendix](#12-appendix)

---

## 1. Problem Statement

### Current State

PlayerARC has a GAA-specific import wizard that:
- Only supports GAA Football (hardcoded sport code)
- Requires specific column names from GAA Foireann exports
- Creates teams with GAA-specific age groups (U8, U10, U12, etc.)
- Has hardcoded skill ratings for GAA Football

### Limitations

1. **Single Sport**: Cannot onboard soccer, rugby, basketball, or other sports clubs
2. **Manual Only**: No API integration with federation membership databases
3. **Rigid Mapping**: Column names must match expected formats
4. **No Templates**: Each import starts from scratch
5. **No Recurring Sync**: Cannot refresh membership data automatically
6. **Limited Conflict Handling**: Basic duplicate detection only

### Business Impact

- **Slow Onboarding**: Takes days instead of hours to get clubs operational
- **High Touch**: Platform staff must manually assist most imports
- **Market Limitation**: Cannot effectively serve non-GAA sports
- **Data Staleness**: No mechanism to keep membership data current

---

## 2. Goals & Success Metrics

### Primary Goals

| Goal | Description |
|------|-------------|
| **Speed to Value** | Reduce time from signup to populated organization from days to < 1 hour |
| **Multi-Sport** | Support any sport with configurable age groups, skills, and positions |
| **Self-Service** | Enable club admins to import without platform staff assistance (80%+ of imports) |
| **Data Quality** | Maintain high data integrity with intelligent validation and conflict resolution |
| **Extensibility** | Architecture supports future federation API integrations |

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Average import completion time | 45 min | < 15 min | Analytics |
| Imports requiring platform staff help | 80% | < 20% | Support tickets |
| Import success rate (first attempt) | 60% | > 90% | Error logs |
| Data quality score post-import | N/A | > 95% | Validation pass rate |
| Admin satisfaction (import experience) | N/A | > 4.5/5 | In-app survey |

---

## 3. User Personas & Access Model

### 3.1 Platform Staff

**Role**: Configure import infrastructure, assist with complex onboarding

**Capabilities**:
- Create and manage import templates for different sports/data sources
- Configure federation API connectors (future)
- Execute imports on behalf of organizations
- View cross-organization import dashboard
- Access import analytics and error logs
- Define sport-specific field mappings and validation rules

**Does NOT**:
- Perform routine imports (that's admin self-service)
- Approve individual import records (automated or admin-handled)

### 3.2 Organization Admin

**Role**: Import and maintain organization membership data

**Capabilities**:
- Upload CSV/Excel files or paste clipboard data
- Use pre-configured import templates
- Review and resolve conflicts
- Trigger ad-hoc sync from federation connectors (when configured)
- View import history and audit trail
- Configure organization-specific import preferences

**Does NOT**:
- Configure federation connectors (platform staff only)
- Access other organizations' import data

### 3.3 Federation API (Future)

**Role**: Automated background sync of membership data

**Capabilities**:
- Push membership updates to connected organizations
- Trigger by admin action or scheduled job
- Merge with conflict resolution (membership data as primary source of truth)

**Managed By**: Platform staff configures connections, admin triggers syncs

---

## 4. Core Design Principles

### 4.1 Speed Over Perfection

> "Get the admin to value fast. Perfection can come later."

- Default to auto-create (teams, passports, guardian links)
- Show overview, not every detail
- Optimize for common case (clean data), handle edge cases gracefully
- Progressive disclosure: simple view first, details on demand

### 4.2 Intelligent Defaults

> "The system should know what the admin wants before they do."

- AI-powered column mapping (learn from historical imports)
- Age-appropriate skill baselines by default
- Auto-create teams when none exist
- Smart guardian matching with confidence scoring

### 4.3 Transparent Control

> "The admin should feel in control, never confused."

- Always show what will happen before it happens (dry run)
- Clear explanations for system decisions
- Easy override for any automatic choice
- Undo-friendly architecture (within session)

### 4.4 Error Recovery, Not Error Prevention

> "Assume errors will happen. Make them easy to fix."

- Lenient parsing, strict validation with clear feedback
- Partial success is better than total failure
- Row-level error handling, not file-level rejection
- Clear path to resolution for every error type

### 4.5 Delight in the Details

> "The import experience is the admin's first impression. Make it memorable."

- **Professional polish** - Smooth animations, clean transitions (no confetti or gimmicks)
- Helpful, not condescending copy
- Fast feedback (real-time validation as they type)
- "Magic" moments (auto-detected columns, instant team creation)

### 4.6 Consistent Branding

> "The import wizard is part of the PlayerARC experience."

- Use **PlayerARC branding** throughout (not organization theming)
- Consistent with platform design language
- Builds trust in the platform, not confusion with org identity

### 4.7 Emotional Design Goals

The admin should feel:
- **Confidence** - "I know exactly what's happening"
- **Speed** - "This is so fast!"
- **Control** - "I can fix anything that goes wrong"
- **Magic** - "It just worked perfectly"

All four emotions should be present, balanced appropriately for the context.

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Import    │  │  Template   │  │  Connector  │                 │
│  │   Wizard    │  │   Config    │  │   Config    │                 │
│  │   (Admin)   │  │  (Platform) │  │  (Platform) │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
└─────────┼────────────────┼────────────────┼─────────────────────────┘
          │                │                │
┌─────────┼────────────────┼────────────────┼─────────────────────────┐
│         ▼                ▼                ▼                         │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                  IMPORT ORCHESTRATION                    │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │       │
│  │  │  Parser  │ │  Mapper  │ │ Validator│ │  Writer  │   │       │
│  │  │  Engine  │ │  Engine  │ │  Engine  │ │  Engine  │   │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │       │
│  └─────────────────────────────────────────────────────────┘       │
│                              │                                      │
│  ┌───────────────────────────┼──────────────────────────────┐      │
│  │                           ▼                               │      │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │      │
│  │  │ Template │  │   Mapping    │  │     Conflict     │   │      │
│  │  │  Store   │  │   History    │  │   Resolution     │   │      │
│  │  └──────────┘  └──────────────┘  └──────────────────┘   │      │
│  │                    IMPORT SERVICES                        │      │
│  └───────────────────────────────────────────────────────────┘      │
│                         BUSINESS LOGIC LAYER                        │
└─────────────────────────────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────────────────┐
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                    CONVEX DATABASE                       │       │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐          │       │
│  │  │  Identity  │ │ Enrollment │ │   Import   │          │       │
│  │  │   Tables   │ │   Tables   │ │   Tables   │          │       │
│  │  └────────────┘ └────────────┘ └────────────┘          │       │
│  └─────────────────────────────────────────────────────────┘       │
│                           DATA LAYER                                │
└─────────────────────────────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────────────────┐
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                 FEDERATION CONNECTORS                    │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │       │
│  │  │ Foireann │ │   FAI    │ │   IRFU   │ │  Custom  │   │       │
│  │  │   API    │ │   API    │ │   API    │ │   API    │   │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │       │
│  └─────────────────────────────────────────────────────────┘       │
│                    INTEGRATION LAYER (FUTURE)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Parser Engine** | File format detection, CSV/Excel parsing, header detection |
| **Mapper Engine** | AI-powered column mapping, historical learning, fuzzy matching |
| **Validator Engine** | Schema validation, business rules, error collection |
| **Writer Engine** | Batch creation of identities, enrollments, teams, passports |
| **Template Store** | Sport-specific and custom import templates |
| **Mapping History** | Learning from past mappings for suggestions |
| **Conflict Resolution** | Duplicate detection, merge UI, resolution tracking |

---

## 6. Feature Specifications

### 6.1 Smart Field Mapping

**Objective**: Automatically map uploaded columns to PlayerARC fields with high accuracy, reducing manual mapping effort by 90%.

#### 6.1.1 Mapping Strategies (Priority Order)

Based on industry best practices from [Flatfile](https://flatfile.com/product/mapping/) and [OneSchema](https://www.oneschema.co/):

| Strategy | Description | Confidence |
|----------|-------------|------------|
| **Exact Match** | Column name matches field name exactly | 100% |
| **Alias Match** | Column matches known alias (e.g., "Forename" → "firstName") | 95% |
| **Fuzzy Match** | Column is similar to field name (Levenshtein distance) | 70-90% |
| **Historical Match** | Column was mapped to this field in previous imports (same org or template) | 85% |
| **AI Inference** | LLM analyzes column name + sample values to suggest mapping | 60-80% |
| **Content Analysis** | Data pattern detection (email format, phone format, date format) | 75% |

#### 6.1.2 Known Aliases Database

Maintain a comprehensive alias database for common variations:

```typescript
const fieldAliases = {
  firstName: [
    "first name", "firstname", "forename", "given name",
    "givenname", "first", "name (first)", "fname"
  ],
  lastName: [
    "last name", "lastname", "surname", "family name",
    "familyname", "last", "name (last)", "lname"
  ],
  dateOfBirth: [
    "dob", "date of birth", "dateofbirth", "birth date",
    "birthdate", "birthday", "born", "d.o.b"
  ],
  // ... comprehensive list for all fields
};
```

#### 6.1.3 AI-Powered Mapping

For unmapped columns, use LLM analysis:

**Prompt Template**:
```
Analyze this column from a sports club membership import:
- Column name: "{columnName}"
- Sample values: {sampleValues}
- Available target fields: {targetFields}

Which target field should this column map to?
Return: { "targetField": string, "confidence": number, "reasoning": string }
```

**Implementation Notes**:
- Use Claude or GPT-4 for inference
- Cache results for identical column names
- Never send actual member data to LLM (only column name + anonymized patterns)

#### 6.1.4 Mapping UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  MAP YOUR COLUMNS                                               │
│                                                                 │
│  ┌───────────────────┐    ┌───────────────────┐               │
│  │  YOUR COLUMN      │ ━▶ │  PLAYERARC FIELD  │               │
│  └───────────────────┘    └───────────────────┘               │
│                                                                 │
│  ┌───────────────────┐    ┌───────────────────┐               │
│  │  Forename         │ ━▶ │  First Name    ✓  │  Auto-mapped  │
│  └───────────────────┘    └───────────────────┘               │
│                                                                 │
│  ┌───────────────────┐    ┌───────────────────┐               │
│  │  Surname          │ ━▶ │  Last Name     ✓  │  Auto-mapped  │
│  └───────────────────┘    └───────────────────┘               │
│                                                                 │
│  ┌───────────────────┐    ┌───────────────────────────────┐   │
│  │  DOB              │ ━▶ │  Date of Birth ▼             │   │
│  └───────────────────┘    │  ┌─────────────────────────┐ │   │
│                           │  │ ✓ Date of Birth (95%)  │ │   │
│                           │  │   Registration Date     │ │   │
│                           │  │   Last Updated          │ │   │
│                           │  │   ── Don't Import ──    │ │   │
│                           │  └─────────────────────────┘ │   │
│                           └───────────────────────────────┘   │
│                                                                 │
│  ┌───────────────────┐    ┌───────────────────┐               │
│  │  Member Type      │ ━▶ │  Select Field  ▼  │  Needs review │
│  └───────────────────┘    └───────────────────┘               │
│                                                                 │
│  [Preview: 3 sample values shown for each unmapped column]     │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  12 of 15 columns mapped automatically                         │
│                                                                 │
│                              [Review Mappings] [Continue →]    │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.1.5 Learning from Corrections

When an admin corrects a mapping:
1. Store the correction in `importMappingHistory` table
2. Associate with: organization, template (if used), column name, target field
3. Future imports for this org prefer historical mappings
4. Aggregate across orgs to improve global alias database

---

### 6.2 Import Wizard UX

**Objective**: Guide admins through import with minimal friction while maintaining control.

#### 6.2.1 Wizard Steps

```
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│  1   │───▶│  2   │───▶│  3   │───▶│  4   │───▶│  5   │
│Upload│    │ Map  │    │Review│    │Import│    │Done! │
└──────┘    └──────┘    └──────┘    └──────┘    └──────┘
```

**Step Behavior**:

| Step | Name | Mandatory | Skip Condition |
|------|------|-----------|----------------|
| 1 | Upload Data | Yes | Never |
| 2 | Map Columns | Conditional | All columns auto-mapped with high confidence |
| 3 | Review & Resolve | Conditional | No duplicates, no validation errors |
| 4 | Import | Yes | Never |
| 5 | Complete | Yes | Never |

#### 6.2.2 Step 1: Upload Data

**Input Methods**:
- Drag & drop file (CSV, XLSX, XLS)
- Click to browse
- Paste from clipboard (Excel copy)
- Select from recent files (if applicable)

**Immediate Feedback**:
- File size and row count
- Header row detection (with ability to change)
- Sport detection (if template selected or org has single sport)
- Column validation summary

**UI Components**:

```
┌─────────────────────────────────────────────────────────────────┐
│  IMPORT PLAYERS                                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     ┌───────┐                                           │   │
│  │     │  📄   │  Drag & drop your file here               │   │
│  │     └───────┘  or click to browse                       │   │
│  │                                                         │   │
│  │     Supports: CSV, Excel (.xlsx, .xls)                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Or paste data from clipboard:                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  [Paste area - shows preview when data pasted]          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─── OR ───                                                     │
│                                                                 │
│  📥 Download template for [GAA Football ▼]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.2.3 Step 2: Map Columns (Smart Mapping)

See [Section 6.1](#61-smart-field-mapping) for detailed mapping specifications.

**Key UX Elements**:
- Auto-mapped columns shown with checkmarks
- Unmapped columns highlighted for attention
- Sample values shown for context
- Confidence percentage for AI suggestions
- "Don't import" option for irrelevant columns

#### 6.2.4 Step 3: Review & Resolve

**Sub-sections**:

**3a. Duplicate Resolution**
```
┌─────────────────────────────────────────────────────────────────┐
│  POTENTIAL DUPLICATES (12 found)                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  IMPORT DATA              │  EXISTING RECORD            │   │
│  │  ─────────────────────────┼────────────────────────────│   │
│  │  John Smith               │  John Smith                 │   │
│  │  DOB: 2015-03-20          │  DOB: 2015-03-20           │   │
│  │  Address: 10 Main St      │  Address: 12 Main Street   │   │
│  │  Phone: 087-123-4567      │  Phone: (empty)            │   │
│  │                           │                             │   │
│  │  [ ] Skip   [●] Merge     [ ] Replace                   │   │
│  │                           │                             │   │
│  │  When merging:                                          │   │
│  │  Address: ○ Keep existing  ● Use import                 │   │
│  │  Phone:   ● Use import (existing is empty)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Apply to all similar] [Previous] [Next] [Bulk: Skip All ▼]   │
└─────────────────────────────────────────────────────────────────┘
```

**3b. Validation Errors**
```
┌─────────────────────────────────────────────────────────────────┐
│  VALIDATION ISSUES (5 rows)                                     │
│                                                                 │
│  Row 23: Missing required field "Date of Birth"                 │
│  ├─ Name: Jane Doe                                              │
│  └─ [Enter DOB: ___________] or [Exclude from import]           │
│                                                                 │
│  Row 45: Invalid date format "15/3/2015"                        │
│  ├─ Name: Tom Murphy                                            │
│  └─ Did you mean: 2015-03-15? [Yes, fix it] [Edit manually]     │
│                                                                 │
│  Row 67: Age group could not be determined                      │
│  ├─ Name: Sarah Kelly, DOB: 2010-08-12                          │
│  └─ Select age group: [U14 ▼]                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**3c. Team Creation**
```
┌─────────────────────────────────────────────────────────────────┐
│  TEAMS TO CREATE (3 new teams needed)                           │
│                                                                 │
│  [✓] U12 Male (15 players)                                      │
│  [✓] U14 Female (8 players)                                     │
│  [✓] Senior Men (22 players)                                    │
│                                                                 │
│  Existing teams that will be used:                              │
│  • U10 Male (12 players will be added)                          │
│  • U10 Female (9 players will be added)                         │
│                                                                 │
│  [Edit team names before creation]                              │
└─────────────────────────────────────────────────────────────────┘
```

**3d. Guardian Matching Preview**

See [Section 6.4](#64-guardian-matching) for detailed specifications.

#### 6.2.5 Step 4: Import Execution

**Progress Display**:
```
┌─────────────────────────────────────────────────────────────────┐
│  IMPORTING...                                                   │
│                                                                 │
│  ████████████████████░░░░░░░░░░  67%                           │
│                                                                 │
│  ✓ Teams created (3 of 3)                                       │
│  ✓ Player identities (45 of 67)                                 │
│  → Guardian matching (processing...)                            │
│  ○ Team assignments (pending)                                   │
│  ○ Sport passports (pending)                                    │
│                                                                 │
│  Current: Creating identity for "Emma Walsh"                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Error Handling During Import**:
- If errors occur, batch completes partial success
- Error rows collected and displayed
- Admin can choose to retry failed rows or skip

#### 6.2.6 Step 5: Complete

**Summary Display**:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    🎉 IMPORT COMPLETE!                          │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │   67    │ │   12    │ │   54    │ │    3    │ │   67    │  │
│  │ Players │ │Families │ │Guardians│ │  Teams  │ │Passports│  │
│  │ Created │ │ Linked  │ │ Matched │ │ Created │ │ Created │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  WHAT'S NEXT?                                                   │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 👥 View Players │  │ 📧 Invite       │  │ 🏃 Assign to    │ │
│  │                 │  │    Parents      │  │    Teams        │ │
│  │ See all 67      │  │ Send 42 pending │  │ Review team     │ │
│  │ imported        │  │ invitations     │  │ assignments     │ │
│  │ players         │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│             [View Import Log]  [Start Another Import]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.3 Conflict Resolution

**Objective**: Handle data conflicts gracefully with clear UI and smart defaults.

#### 6.3.1 Conflict Types

| Type | Trigger | Default Resolution |
|------|---------|-------------------|
| **Duplicate Player** | Name + DOB match existing | Show merge UI |
| **Field Mismatch** | Import value differs from existing | Use import (newer) |
| **Guardian Conflict** | Different guardian linked | Add as additional guardian |
| **Team Conflict** | Player already on different team | Add to new team (multi-team) |
| **Missing Required** | Required field empty | Block row, request input |

#### 6.3.2 Conflict Resolution UI

Based on best practices from [Data Ladder](https://dataladder.com/merging-data-from-multiple-sources/) and [Informatica](https://docs.informatica.com/data-quality-and-governance/data-quality/10-4-1/administrator-guide/domain-object-export-and-import/import-process/conflict-resolution.html):

**Design Principles**:
1. **Side-by-side comparison** - Show import vs existing clearly
2. **Field-level selection** - Let admin choose per field, not all-or-nothing
3. **Bulk actions** - "Apply this decision to all similar conflicts"
4. **Clear outcomes** - Show what will happen before confirming
5. **Contextual info** - Show related data to help decision

#### 6.3.3 Merge Rules (Configurable)

| Rule | Description | Default |
|------|-------------|---------|
| **Newer Wins** | Use import value (assuming import is newer) | Yes |
| **Non-Empty Wins** | Prefer non-empty value regardless of source | Yes |
| **Preserve History** | Keep both values in history/notes | No |
| **Admin Always Decides** | Force manual review for all conflicts | No |

---

### 6.4 Guardian Matching

**Objective**: Intelligently link players to guardians with high accuracy while allowing admin override.

#### 6.4.1 Matching Modes

| Mode | Description | Confidence Threshold |
|------|-------------|---------------------|
| **Hybrid (Default)** | Auto-apply high confidence, review medium/low | High: 60+ |
| **Review All** | Admin reviews every match suggestion | N/A |
| **Auto All** | Apply all matches above threshold | Configurable |

#### 6.4.2 Multi-Signal Scoring (Existing Logic)

Preserve and enhance the current scoring system:

| Signal | Points | Notes |
|--------|--------|-------|
| Email exact match | 50 | Auto-link threshold |
| Surname + Postcode match | 45 | Strong household signal |
| Surname + Town match | 35 | Moderate signal |
| Phone match (last 10 digits) | 30 | Contact signal |
| Postcode only match | 20 | Weak household signal |
| Town only match | 10 | Very weak signal |
| House number match | 5 | Additional confirmation |

**Confidence Tiers**:
- **High (60+)**: Auto-apply in hybrid mode
- **Medium (40-59)**: Suggest, require confirmation
- **Low (20-39)**: Show as possible, low priority
- **None (<20)**: Don't suggest

#### 6.4.3 Guardian Discovery from Membership Data

When ALL membership data is provided (including adult members):

1. **Parse adult members** - Identify non-player adults in the data
2. **Build household map** - Group by address/postcode/email domain
3. **Score relationships** - Apply multi-signal scoring within households
4. **Present matches** - Show suggested guardian-player links

**If only player data provided**:

1. **Extract explicit parent columns** - ParentFirstName, ParentLastName, ParentEmail, ParentPhone
2. **Create guardian identities** - Even without full data
3. **Flag for completion** - Mark guardians as "pending verification"
4. **Workflow handoff** - Admin can invite or manually complete profiles

#### 6.4.4 Explicit Parent Column Support

Support dedicated parent columns in import:

| Column | Maps To |
|--------|---------|
| Parent First Name, Parent1 First Name, Mother First Name, Father First Name | parentFirstName |
| Parent Last Name, Parent1 Last Name, Mother Last Name, Father Last Name | parentLastName |
| Parent Email, Parent1 Email, Mother Email, Father Email | parentEmail |
| Parent Phone, Parent1 Phone, Mother Phone, Father Phone | parentPhone |
| Relationship, Parent Relationship | parentRelationship |

**Relationship Normalization**:
```typescript
const relationshipMap = {
  "mother": ["mother", "mum", "mom", "mam", "mammy"],
  "father": ["father", "dad", "daddy", "da"],
  "guardian": ["guardian", "legal guardian", "carer"],
  "grandparent": ["grandparent", "grandmother", "grandfather", "granny", "grandma", "grandpa", "nana", "nanny"],
  "other": ["other", "relative", "aunt", "uncle", "sibling"]
};
```

#### 6.4.5 Adult Player Handling

For players 18+:

1. **No guardian linking** - Adults manage their own profiles
2. **Emergency contact import** - If EmergencyContactName, EmergencyContactPhone columns exist
3. **Self-management setup** - Create playerIdentity with userId link preparation
4. **Account invitation** - Option to send account creation invitation

---

### 6.5 Data Sources & Connectors

**Objective**: Support multiple data sources with appropriate handling for each.

#### 6.5.1 Supported Sources

| Source | Type | Availability |
|--------|------|--------------|
| **Generic CSV** | Manual upload | Phase 1 |
| **Generic Excel** | Manual upload | Phase 1 |
| **Clipboard Paste** | Manual paste | Phase 1 |
| **GAA Foireann Export** | Template-based CSV | Phase 1 |
| **Federation APIs** | API connector | Phase 2+ |
| **Other Platforms** | Import/export | Future |

#### 6.5.2 Template-Based Source Handling

Each data source can have a template that defines:

```typescript
type ImportTemplate = {
  id: string;
  name: string;                    // "GAA Foireann Export"
  sportCode: string;               // "gaa_football"
  sourceType: "csv" | "excel" | "api";

  // Column mapping rules
  columnMappings: {
    sourceColumn: string;          // Exact or regex pattern
    targetField: string;           // PlayerARC field name
    required: boolean;
    transform?: string;            // Transformation function name
  }[];

  // Validation rules
  validationRules: {
    field: string;
    rule: "required" | "format" | "range" | "enum";
    params?: Record<string, unknown>;
  }[];

  // Age group mapping
  ageGroupMapping: {
    sourceValue: string;           // "JUVENILE", "YOUTH", etc.
    targetAgeGroup: string;        // "U12", "U14", etc.
    minAge?: number;
    maxAge?: number;
  }[];

  // Default settings
  defaults: {
    createTeams: boolean;
    createPassports: boolean;
    skillRatingStrategy: "blank" | "middle" | "age-appropriate";
  };
};
```

#### 6.5.3 Federation Connector Architecture (Future)

```typescript
type FederationConnector = {
  id: string;
  name: string;                    // "GAA Foireann API"
  federationCode: string;          // "gaa"
  status: "active" | "inactive" | "error";

  // Authentication
  authType: "oauth2" | "api_key" | "basic";
  credentials: EncryptedCredentials;

  // Sync configuration
  syncConfig: {
    enabled: boolean;
    schedule?: string;             // Cron expression
    lastSync?: number;
    nextSync?: number;
  };

  // Data mapping (similar to template)
  dataMapping: ImportTemplate;

  // Conflict resolution
  conflictStrategy: "federation_wins" | "local_wins" | "merge";

  // Connected organizations
  connectedOrganizations: string[];
};
```

---

### 6.6 Import Templates

**Objective**: Enable reusable, pre-configured import setups for common scenarios.

#### 6.6.1 Template Types

| Type | Created By | Scope | Examples |
|------|------------|-------|----------|
| **Platform Templates** | Platform Staff | All orgs | "GAA Foireann Export", "FAI Registration Export" |
| **Organization Templates** | Org Admin | Single org | "Our Weekly Sync", "School Import" |

#### 6.6.2 Template Features

- **Saved column mappings** - Remember how columns were mapped
- **Default settings** - Team creation, passport creation, skill strategy
- **Validation rules** - Custom validation beyond standard rules
- **Pre/post processing** - Transform data before/after import
- **Notes/instructions** - Guidance for users of this template

#### 6.6.3 Template Selection UI

```
┌─────────────────────────────────────────────────────────────────┐
│  SELECT IMPORT TYPE                                             │
│                                                                 │
│  RECOMMENDED FOR YOUR SPORT                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🏐 GAA Foireann Export                                 │   │
│  │  Import directly from GAA's Foireann membership system  │   │
│  │  [Use This Template]                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  OTHER OPTIONS                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📄 Generic CSV/Excel                                   │   │
│  │  Import from any spreadsheet with manual mapping        │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📋 Paste from Clipboard                                │   │
│  │  Copy from Excel and paste directly                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  YOUR SAVED TEMPLATES                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔄 Weekly Membership Sync (last used 3 days ago)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.7 Recurring Syncs

**Objective**: Allow scheduled or triggered data refreshes from connected sources.

#### 6.7.1 Sync Types

| Type | Trigger | Manager |
|------|---------|---------|
| **Scheduled** | Cron job (daily, weekly) | Platform Staff configures |
| **Manual Trigger** | Admin clicks "Sync Now" | Org Admin |
| **Webhook** | Federation pushes update | Platform Staff configures |

#### 6.7.2 Sync Behavior

1. **Fetch data** from source (API or file location)
2. **Compare** with existing data
3. **Identify** new records, updated records, potentially removed records
4. **Apply** conflict resolution rules
5. **Log** all changes
6. **Notify** admin of significant changes

#### 6.7.3 Sync Dashboard (Admin View)

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA SYNC STATUS                                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  GAA Foireann                                           │   │
│  │  Last sync: 2 hours ago                                 │   │
│  │  Next scheduled: Tomorrow 2:00 AM                       │   │
│  │  Status: ✓ Healthy                                      │   │
│  │                                                         │   │
│  │  Last sync results:                                     │   │
│  │  • 3 new players added                                  │   │
│  │  • 12 records updated                                   │   │
│  │  • 0 conflicts (auto-resolved)                          │   │
│  │                                                         │   │
│  │  [Sync Now] [View History] [Settings]                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.8 Platform Staff Tools

**Objective**: Give platform staff visibility and control over import operations across all organizations.

#### 6.8.1 Cross-Organization Import Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  IMPORT OPERATIONS DASHBOARD                                    │
│                                                                 │
│  TODAY: 23 imports | 2,847 records | 99.2% success rate        │
│                                                                 │
│  ACTIVE IMPORTS                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Ballyhaunis GAA • 156 records • 67% complete           │   │
│  │  Castlebar Soccer • 89 records • Awaiting review        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  NEEDS ATTENTION                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Westport RFC • Failed 2 hours ago • Auth error      │   │
│  │  ⚠️ Claremorris GAA • 12 validation errors              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  RECENT ACTIVITY                                                │
│  • Knock GAA completed import (234 players) - 1 hour ago       │
│  • Swinford United started import - 2 hours ago                │
│  • Mayo Basketball scheduled sync completed - 3 hours ago      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.8.2 Template Management

Platform staff can:
- Create sport-specific templates
- Define required vs optional columns
- Set validation rules
- Configure default behaviors
- Publish templates to all organizations or specific sports

#### 6.8.3 Connector Management (Future)

Platform staff can:
- Configure OAuth/API credentials for federation systems
- Test connections
- Map federation data to PlayerARC schema
- Enable/disable connectors per organization
- Monitor sync health

#### 6.8.4 Analytics

Track and display:
- Import volume over time
- Success/failure rates
- Common errors and resolutions
- Time to complete by organization size
- Template usage statistics

---

## 7. Data Model

### 7.1 New Tables

#### `importTemplates`

```typescript
{
  _id: Id<"importTemplates">,
  name: string,                    // "GAA Foireann Export"
  description?: string,
  sportCode?: string,              // null = all sports
  sourceType: "csv" | "excel" | "api",
  scope: "platform" | "organization",
  organizationId?: string,         // null for platform templates

  columnMappings: Array<{
    sourcePattern: string,         // Exact name or regex
    targetField: string,
    required: boolean,
    transform?: string,
    aliases?: string[],
  }>,

  ageGroupMappings: Array<{
    sourceValue: string,
    targetAgeGroup: string,
  }>,

  defaults: {
    createTeams: boolean,
    createPassports: boolean,
    skillRatingStrategy: string,
    season?: string,
  },

  validationRules: Array<{
    field: string,
    rule: string,
    params?: Record<string, unknown>,
    errorMessage: string,
  }>,

  isActive: boolean,
  createdBy: string,
  createdAt: number,
  updatedAt: number,
}
```

**Indexes**: `by_scope`, `by_sportCode`, `by_organizationId`

#### `importSessions`

```typescript
{
  _id: Id<"importSessions">,
  organizationId: string,
  templateId?: Id<"importTemplates">,
  initiatedBy: string,             // userId

  status: "uploading" | "mapping" | "reviewing" | "importing" | "completed" | "failed" | "cancelled",

  sourceInfo: {
    type: "file" | "paste" | "api",
    fileName?: string,
    fileSize?: number,
    rowCount: number,
    columnCount: number,
  },

  mappings: Record<string, string>, // sourceColumn -> targetField

  stats: {
    totalRows: number,
    validRows: number,
    errorRows: number,
    duplicateRows: number,

    playersCreated: number,
    playersUpdated: number,
    playersSkipped: number,

    guardiansCreated: number,
    guardiansLinked: number,

    teamsCreated: number,
    passportsCreated: number,
  },

  errors: Array<{
    rowNumber: number,
    field: string,
    error: string,
    value?: string,
    resolved: boolean,
    resolution?: string,
  }>,

  duplicates: Array<{
    rowNumber: number,
    existingPlayerId: Id<"playerIdentities">,
    resolution: "skip" | "merge" | "replace",
    fieldResolutions?: Record<string, "import" | "existing">,
  }>,

  startedAt: number,
  completedAt?: number,
  duration?: number,
}
```

**Indexes**: `by_organizationId`, `by_status`, `by_initiatedBy`, `by_startedAt`

#### `importMappingHistory`

```typescript
{
  _id: Id<"importMappingHistory">,
  organizationId?: string,         // null for global
  templateId?: Id<"importTemplates">,

  sourceColumnName: string,        // Original column name
  normalizedColumnName: string,    // Lowercase, trimmed
  targetField: string,             // PlayerARC field

  usageCount: number,              // How many times used
  lastUsedAt: number,

  createdAt: number,
}
```

**Indexes**: `by_normalizedColumnName`, `by_organizationId`, `by_templateId`

#### `federationConnectors` (Future)

```typescript
{
  _id: Id<"federationConnectors">,
  name: string,
  federationCode: string,          // "gaa", "fai", "irfu"

  status: "active" | "inactive" | "error",
  lastError?: string,

  authType: "oauth2" | "api_key" | "basic",
  credentialsStorageId: Id<"_storage">, // Encrypted

  endpoints: {
    membershipList: string,
    memberDetail?: string,
    webhookSecret?: string,
  },

  syncConfig: {
    enabled: boolean,
    schedule?: string,             // Cron
    conflictStrategy: "federation_wins" | "local_wins" | "merge",
  },

  templateId: Id<"importTemplates">,

  connectedOrganizations: Array<{
    organizationId: string,
    federationOrgId: string,       // Their ID for the club
    enabledAt: number,
    lastSyncAt?: number,
  }>,

  createdAt: number,
  updatedAt: number,
}
```

### 7.2 Modifications to Existing Tables

#### `playerIdentities` - Add Fields

```typescript
{
  // ... existing fields ...

  createdFrom: "import" | "registration" | "manual" | "api_sync",
  importSessionId?: Id<"importSessions">,
  externalIds?: Record<string, string>,  // { "foireann": "12345", "fai": "67890" }
}
```

#### `orgPlayerEnrollments` - Add Fields

```typescript
{
  // ... existing fields ...

  importSessionId?: Id<"importSessions">,
  lastSyncedAt?: number,
  syncSource?: string,             // "foireann", "fai", etc.
}
```

---

## 8. Technical Implementation

### 8.1 Parser Engine

```typescript
// packages/backend/convex/lib/import/parser.ts

export type ParseResult = {
  success: boolean;
  headers: string[];
  rows: Record<string, string>[];
  headerRowIndex: number;
  errors: ParseError[];
  metadata: {
    fileType: "csv" | "xlsx" | "xls";
    encoding: string;
    rowCount: number;
    columnCount: number;
  };
};

export async function parseFile(
  file: ArrayBuffer,
  options?: ParseOptions
): Promise<ParseResult>;

export function parseCSV(
  text: string,
  options?: CSVParseOptions
): ParseResult;

export function detectHeaderRow(
  rows: string[][]
): number;

export function detectDelimiter(
  text: string
): string;
```

### 8.2 Mapper Engine

```typescript
// packages/backend/convex/lib/import/mapper.ts

export type MappingSuggestion = {
  sourceColumn: string;
  targetField: string;
  confidence: number;           // 0-100
  strategy: "exact" | "alias" | "fuzzy" | "historical" | "ai" | "content";
  reasoning?: string;
};

export async function suggestMappings(
  columns: string[],
  targetSchema: FieldDefinition[],
  options: {
    organizationId?: string;
    templateId?: string;
    useLLM?: boolean;
  }
): Promise<MappingSuggestion[]>;

export function getFieldAliases(
  fieldName: string
): string[];

export function fuzzyMatch(
  source: string,
  targets: string[],
  threshold?: number
): { target: string; score: number }[];
```

### 8.3 Validator Engine

```typescript
// packages/backend/convex/lib/import/validator.ts

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  transformedRow?: Record<string, unknown>;
};

export type ValidationError = {
  rowNumber: number;
  field: string;
  rule: string;
  message: string;
  value?: string;
  suggestion?: string;          // "Did you mean: 2015-03-15?"
  autoFixable: boolean;
};

export function validateRow(
  row: Record<string, string>,
  rowNumber: number,
  schema: FieldDefinition[],
  rules: ValidationRule[]
): ValidationResult;

export function validateBatch(
  rows: Record<string, string>[],
  schema: FieldDefinition[],
  rules: ValidationRule[]
): BatchValidationResult;
```

### 8.4 Writer Engine

Leverage existing `batchImportPlayersWithIdentity` with enhancements:

```typescript
// packages/backend/convex/models/playerImport.ts

export const batchImportPlayersWithIdentity = mutation({
  args: {
    organizationId: v.string(),
    sportCode: v.optional(v.string()),
    players: v.array(v.object({
      // ... existing fields ...
    })),
    options: v.optional(v.object({
      createTeams: v.boolean(),
      createPassports: v.boolean(),
      skillRatingStrategy: v.string(),
      duplicateResolutions: v.optional(v.array(v.object({
        rowIndex: v.number(),
        resolution: v.union(v.literal("skip"), v.literal("merge"), v.literal("replace")),
        fieldResolutions: v.optional(v.record(v.string(), v.string())),
      }))),
      importSessionId: v.optional(v.id("importSessions")),
    })),
  },
  // ... implementation ...
});
```

### 8.5 Performance Considerations

Following PlayerARC's [Performance & Query Optimization standards](../CLAUDE.md#performance--query-optimization-mandatory):

1. **Batch Operations**: Process in batches of 100 records
2. **No N+1 Queries**: Use Map lookups for enrichment
3. **Index Usage**: All queries use appropriate indexes
4. **Progress Streaming**: Use Convex's streaming for real-time progress
5. **Background Processing**: Large imports (>500 records) run as background jobs

---

## 9. Security & Privacy

### 9.1 GDPR Compliance

**Decision**: ✅ Required

**Consent Confirmation**:
Before import, admin must confirm:
> "By importing this data, I confirm that I have obtained appropriate consent from all individuals (or their guardians for minors) to process their personal data in accordance with PlayerARC's privacy policy and GDPR requirements."

**Data Minimization**:
- Only import fields that are necessary
- Offer "Don't import" option for all columns
- Log what data was imported for audit

### 9.2 Audit Logging

**Decision**: ✅ Required

All imports logged to `importSessions` with:
- Who initiated the import
- What data was imported (field names, not values)
- When the import occurred
- Source of data
- Any errors or resolutions

Platform staff can view audit logs for any organization.
Audit logs retained for **2 years** minimum for compliance.

### 9.3 Sensitive Data Handling

**Decision**: ✅ Importable but not required

**Medical Information**:
- Medical data (allergies, conditions, medications) **can** be imported
- However, medical fields are **not required** - can be added later
- Clearly marked as sensitive in UI
- Requires explicit confirmation when included
- Only accessible to authorized roles

**Data Encryption**:
- Federation connector credentials encrypted at rest
- Import files processed in memory, not persisted
- Temporary files deleted after processing

### 9.4 Access Control

| Action | Platform Staff | Org Owner | Org Admin | Coach |
|--------|---------------|-----------|-----------|-------|
| Configure templates | ✓ | - | - | - |
| Configure connectors | ✓ | - | - | - |
| Execute import for any org | ✓ | - | - | - |
| Execute import for own org | ✓ | ✓ | ✓ | - |
| View import history | ✓ | ✓ | ✓ | - |
| View cross-org dashboard | ✓ | - | - | - |

---

## 10. Phased Rollout Plan

### Phase 1: Foundation (Weeks 1-4)

**Goal**: Generic multi-sport import with smart mapping

**Deliverables**:
- [ ] Abstract GAA-specific logic into configurable components
- [ ] Implement smart field mapping engine
- [ ] Add sport selection to import wizard
- [ ] Support configurable age groups per sport
- [ ] Create import session tracking
- [ ] Add mapping history learning
- [ ] Build platform template management UI

**Success Criteria**:
- Import works for 3+ sports (GAA Football, Soccer, Rugby)
- 80%+ columns auto-mapped for known templates
- Import session fully auditable

### Phase 2: Enhanced UX (Weeks 5-8)

**Goal**: Delightful import experience with conflict resolution

**Deliverables**:
- [ ] Implement dry run / preview mode
- [ ] Build side-by-side conflict resolution UI
- [ ] Add field-level merge controls
- [ ] Implement "What's Next" post-import workflow
- [ ] Add professional progress animations and success states
- [ ] Build admin template saving feature

**Success Criteria**:
- Admin satisfaction > 4.5/5
- Time to complete import reduced by 50%
- Conflict resolution UI used for 100% of duplicates

### UX Principles for Phase 2:
- Professional polish over playful celebration
- Intuitive, frictionless, and helpful throughout
- Fast feedback without unnecessary delays

### Phase 3: Recurring Sync (Weeks 9-12)

**Goal**: Support scheduled and triggered data refreshes

**Deliverables**:
- [ ] Build sync scheduling system
- [ ] Implement change detection
- [ ] Add sync dashboard for admins
- [ ] Build notification system for sync results
- [ ] Create sync conflict resolution rules

**Success Criteria**:
- Organizations can set up weekly auto-sync
- Change detection accuracy > 99%
- Sync failures auto-reported to platform staff

### Phase 4: Federation Connectors (Weeks 13-20)

**Goal**: API integration with federation membership databases

**Deliverables**:
- [ ] Build connector framework
- [ ] Implement GAA Foireann connector
- [ ] Implement FAI connector
- [ ] Build connector management UI for platform staff
- [ ] Add OAuth flow for connector authentication
- [ ] Build webhook receiver for push updates

**Success Criteria**:
- 2+ live federation connectors
- Organizations can self-service connect (with platform staff setup)
- Real-time sync latency < 15 minutes

### Phase 5: Advanced Features (Ongoing)

**Confirmed Future Features**:
- ✅ **Connector Marketplace** - Third parties can build and publish integrations
- ✅ **Cross-organization player transfers** - Support player moving between clubs via import
- AI-powered data quality scoring
- Mobile import (photo of spreadsheet → import)

**Under Consideration**:
- ❓ Bi-directional sync (push back to federation) - Not in early phases, evaluate later

---

## 11. Open Questions

| # | Question | Status | Decision |
|---|----------|--------|----------|
| 1 | Should organization templates be shareable between orgs? | ✅ Decided | Yes - enables best practice sharing |
| 2 | What's the maximum import size before requiring background processing? | Open | Suggest 500 records |
| 3 | How long should import sessions be retained for audit? | ✅ Decided | 2 years minimum |
| 4 | Should we support importing historical season data? | Open | TBD |
| 5 | How do we handle federation API rate limits? | Open | Queue + backoff |
| 6 | Should imports support attachments (photos, documents)? | Open | Phase 5 candidate |
| 7 | Should bi-directional sync be supported? | ✅ Decided | Not in early phases, evaluate later |
| 8 | Should import use org theming or platform branding? | ✅ Decided | PlayerARC platform branding |
| 9 | Professional vs celebratory UX? | ✅ Decided | Professional polish, no gimmicks |

---

## 12. Appendix

### 12.1 Industry Research Sources

- [Flatfile AI Data Mapping](https://flatfile.com/product/mapping/) - AI-powered column matching, learning from past imports
- [OneSchema Best Practices](https://www.oneschema.co/blog/building-a-csv-uploader) - Fuzzy matching, historical mapping
- [Flatfile Transform](https://flatfile.com/news/flatfile-announces-transform-an-advanced-agentic-experience-for-data/) - Agentic AI for data transformation
- [Data Ladder Merging Guide](https://dataladder.com/merging-data-from-multiple-sources/) - Conflict resolution best practices
- [Informatica Conflict Resolution](https://docs.informatica.com/data-quality-and-governance/data-quality/10-4-1/administrator-guide/domain-object-export-and-import/import-process/conflict-resolution.html) - Enterprise conflict handling

### 12.2 Competitive Analysis

| Platform | Strengths | Weaknesses |
|----------|-----------|------------|
| **TeamSnap** | Dedicated onboarding team, smooth transitions | No self-service import |
| **Pitchero** | 60% admin time reduction, payment integration | Limited federation sync |
| **360Player** | Onboarding specialists, quick setup | Manual data transfer |
| **Clubforce** | GAA Foireann integration | Single sport focus |

### 12.3 Field Mapping Reference

See [gaa-import.tsx](../../apps/web/src/components/gaa-import.tsx) lines 943-1008 for current field aliases.

### 12.4 Current GAA Import Flow

**Steps**:
1. Upload/Paste → Column validation
2. Select import filter (All/Youth/Senior)
3. Create missing teams (auto-detected)
4. Review duplicates (if any)
5. Import execution
6. Results summary → Dashboard link

**Strengths to Preserve**:
- Minimal clicks design
- Real-time column validation
- Smart guardian matching (multi-signal scoring)
- Team auto-creation
- Progress indication

**Improvements Needed**:
- Multi-sport support
- Template saving
- Conflict resolution UI
- Post-import workflow
- Analytics/audit

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Product Team | Initial PRD |

---

*This PRD is a living document and will be updated as requirements evolve and implementation progresses.*
