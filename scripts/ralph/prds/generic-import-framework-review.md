# Generic Import Framework PRD - Comprehensive Review

**Review Date**: January 30, 2026
**Reviewer**: Technical Analysis
**PRD Version**: 1.0

---

## Executive Summary

This document provides a comprehensive review of the Generic Import Framework PRD, incorporating:
- **Fresh industry research** on 2025-2026 best practices
- **Deep analysis** of the existing GAA import implementation
- **Recommendations** for enhancements and additions to the PRD

**Overall Assessment**: The PRD is **excellent** and covers all major areas comprehensively. This review identifies additional opportunities to incorporate cutting-edge approaches and preserve valuable patterns from the GAA import.

---

## Table of Contents

1. [Industry Research Findings (2025-2026)](#1-industry-research-findings-2025-2026)
2. [GAA Import Feature Analysis](#2-gaa-import-feature-analysis)
3. [PRD Strengths](#3-prd-strengths)
4. [Enhancement Opportunities](#4-enhancement-opportunities)
5. [Technical Recommendations](#5-technical-recommendations)
6. [Implementation Priority Matrix](#6-implementation-priority-matrix)
7. [Appendix: Research Sources](#7-appendix-research-sources)

---

## 1. Industry Research Findings (2025-2026)

### 1.1 AI-Powered Import Revolution

**Key Finding**: AI is fundamentally transforming data import experiences in 2025-2026.

#### Modern AI Capabilities

| Capability | Description | Industry Adoption | Recommendation for PlayerARC |
|------------|-------------|-------------------|------------------------------|
| **GPT-Driven Column Matching** | AI models automatically map imported data to schema with 95% accuracy | High (Flatfile, OneSchema, ImportCSV) | ✅ Already in PRD - expand with specific implementation |
| **Real-Time Validation** | AI-powered CSV importers provide instant data validation and corrections | Medium-High | ✅ In PRD - consider ML-based anomaly detection |
| **Semantic Understanding** | Systems understand data's semantics and context beyond pattern matching | Emerging | ⚠️ Consider for Phase 2+ |
| **LLM-Vision Integration** | Extract, map, and format documents using vision AI | Cutting-edge (OneSchema) | 📋 Phase 5 - mobile import feature |

**Sources**:
- [OneSchema AI Features](https://www.oneschema.co/) - AI coding agents for document extraction
- [Flatfile Transform (July 2025)](https://flatfile.com/news/flatfile-announces-transform-an-advanced-agentic-experience-for-data/) - 80% reduction in data prep time
- [ImportCSV](https://importcsv-marketing.vercel.app/) - AI-native importer for developers

#### AI Implementation Insights

**From Flatfile Transform (July 2025)**:
> "Transform builds on previous AI features to offer customers a context-aware and repeatable data transformation experience. The AI agent reviews each record, referencing validation rules and past user decisions, to recommend relevant transformations."

**Key Principle**: AI should learn from admin decisions and apply them consistently across the import.

**PRD Enhancement**:
- Add "AI Learning Loop" section describing how the system improves with each import
- Specify confidence thresholds for automatic vs. suggested fixes
- Document how AI learns from admin corrections

---

### 1.2 Data Quality Scoring & ML Validation

**Key Finding**: Machine learning is now standard for data quality validation.

#### ML-Driven Quality Techniques

**Anomaly Detection**:
- ML algorithms trained to identify outliers and drifts via historical analysis
- Detect data points that deviate significantly from expected behavior
- Uncover quality issues like out-of-range values, unexpected patterns, duplicates

**Data Profiling**:
- Automated exploration to understand structure, identify patterns, spot issues
- Reveals inconsistencies, patterns, and potential areas for improvement
- Generates quality profiles capturing requirements, attributes, dimensions, scores, rules

**Validation Methods**:
- Schema validation to verify data types, constraints, relationships
- Prescriptive ML techniques for automated error correction
- Completeness, uniqueness, distribution predictions

**Sources**:
- [Telmai ML for Data Quality](https://www.telm.ai/blog/leveraging-ml-to-supercharge-data-quality-validation-processes/) - 8 ways to leverage ML
- [Talend Machine Learning](https://www.talend.com/resources/using-machine-learning-data-quality/) - ML for data quality
- [Metaplane ML Checks](https://www.metaplane.dev/blog/how-to-use-machine-learning-for-robust-data-quality-checks) - Robust quality checks

**PRD Gap**: The current PRD mentions validation but doesn't include ML-based quality scoring.

**Recommendation**: Add **Section 6.9: Data Quality Scoring**

```markdown
### 6.9 Data Quality Scoring

**Objective**: Provide admins with confidence scores for imported data quality.

#### Quality Dimensions

| Dimension | Description | Calculation Method |
|-----------|-------------|-------------------|
| **Completeness** | Percentage of required fields populated | Count(populated) / Count(total) |
| **Consistency** | Data follows expected formats and patterns | ML anomaly detection score |
| **Accuracy** | Data matches expected values (e.g., valid postcodes, email formats) | Pattern matching + ML validation |
| **Uniqueness** | Duplicate detection confidence | Fuzzy matching algorithm |
| **Timeliness** | Data freshness vs. expected update frequency | Date comparison |

#### Scoring Display

Show quality score prominently during Step 3: Review & Resolve:

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA QUALITY SCORE: 87% (Good)                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                 │
│  ✓ Completeness:  95%  (190 of 200 required fields filled)     │
│  ✓ Consistency:   92%  (ML detected 8 potential format issues) │
│  ⚠ Accuracy:      78%  (12 invalid postcodes, 5 bad emails)    │
│  ✓ Uniqueness:    98%  (4 potential duplicates)                │
│  ✓ Timeliness:    94%  (Data appears current)                  │
│                                                                 │
│  [View Details] [Export Quality Report]                        │
└─────────────────────────────────────────────────────────────────┘
```

#### ML Model Training

- Train on historical import data to establish baselines
- Learn patterns specific to each sport/organization
- Continuously improve with feedback loop
```

---

### 1.3 Multi-Step Form UX Patterns (2025 Best Practices)

**Key Finding**: Progressive disclosure with skip logic is now expected, not exceptional.

#### Modern Wizard Design Principles

**From NN/G and Webstacks Research**:

| Principle | Description | Example |
|-----------|-------------|---------|
| **Conditional Steps** | Dynamically show/hide steps based on user input | PRD already implements: Step 2 skippable if high-confidence mapping |
| **Field Limits** | Max 5-9 fields per step to avoid cognitive overload | ✅ GAA import follows this |
| **Progress Indicators** | Clear visual indication of position and remaining steps | ✅ Already in PRD |
| **Save & Resume** | Enable users to save progress and return later | ⚠️ Not in PRD - consider for large imports |
| **Real-Time Validation** | Instant feedback on user input with clear error guidance | ✅ Already in PRD |
| **Mobile-First** | Responsive design for all device sizes | 📋 Should be explicit requirement |

**Sources**:
- [Multi-Step Form Best Practices 2025](https://www.webstacks.com/blog/multi-step-form) - 8 examples + best practices
- [NN/G Wizards](https://www.nngroup.com/articles/wizards/) - Definition and design recommendations
- [Progressive Forms](https://medium.com/patternfly/comparing-web-forms-a-progressive-form-vs-a-wizard-110eefc584e7) - Progressive vs wizard comparison

**PRD Enhancement**:

Add explicit requirements:

1. **Save & Resume Feature** (Phase 2):
   - Autosave import progress at each step
   - Generate unique resume link
   - Session expires after 7 days
   - Use case: Large imports (500+ records) that may take time to review

2. **Mobile Optimization** (Phase 1):
   - Touch-friendly UI elements (min 44px tap targets)
   - Responsive column mapping interface
   - Swipe gestures for duplicate review navigation
   - Progressive web app capabilities

3. **Question Ordering Strategy**:
   - Start with low-friction questions (file upload)
   - Build momentum with auto-mapped columns
   - Complex decisions (conflicts) come later
   - End with celebratory success state

---

### 1.4 Rollback & Undo Strategies

**Key Finding**: Modern systems provide granular undo, not just full rollback.

#### Database Transaction Patterns

**Traditional ACID Approach**:
- All-or-nothing transactions
- Rollback via transaction log or MVCC
- Simple but inflexible

**Modern Saga Pattern**:
- Compensating transactions for distributed systems
- Each step has explicit undo operation
- More complex but more granular control

**DevOps Automated Rollback**:
- Automatic reversal if errors detected
- Point-in-time recovery (PITR)
- Idempotent rollback scripts

**Sources**:
- [Microservices Saga Pattern](https://microservices.io/patterns/data/saga.html) - Compensating transactions
- [Database Rollback Strategies](https://www.harness.io/harness-devops-academy/database-rollback-strategies-in-devops) - DevOps approaches
- [WAL Redo/Undo](https://medium.com/@moali314/database-logging-wal-redo-and-undo-mechanisms-58c076fbe36e) - Database mechanisms

**PRD Decision**: No undo feature (Question 11, item 2).

**Challenge**: This may be too restrictive for admins who make mistakes during large imports.

**Recommendation**: Reconsider with **granular undo** approach:

```markdown
### Soft Undo (Phase 2)

Instead of full transaction rollback, provide:

1. **Session-Based Undo** (during import session only):
   - Mark imported records with sessionId
   - "Undo This Import" button available for 24 hours
   - Soft-delete: change status to "imported_pending_review"
   - Admin can review and permanently delete or restore

2. **Selective Undo**:
   - Admin can remove individual players from import
   - "I imported the wrong file" scenario
   - Compensating transactions delete related records (enrollments, team assignments)

3. **Audit Trail**:
   - Every undo action logged
   - Cannot undo twice (idempotent)
   - Platform staff can see all undo operations

**Implementation Note**: Use Convex mutations for compensating transactions, not database-level rollback.
```

---

### 1.5 Real-World Platform Comparisons

**Key Finding**: Leading platforms excel at different aspects of import UX.

#### Comparative Analysis

**Airtable**:
- ✅ Beginner-friendly CSV import
- ✅ Simple field mapping during import
- ✅ Quick view building post-import
- ❌ Limited validation pre-import

**Notion**:
- ⚠️ Requires manual cleanup post-import
- ❌ Property types must be set before import
- ✅ Good for simple imports
- ❌ Linked fields become text/select

**Coda**:
- 🔄 Evolving CSV importer (limited currently)
- ✅ Planned: import to existing tables
- ✅ Planned: merge/overwrite data
- ✅ Planned: live preview

**Retool/Budibase** (Low-Code Platforms):
- ✅ Wizard components built-in
- ✅ Connect to multiple data sources
- ✅ 100+ UI components for custom importers

**Sources**:
- [Airtable vs Coda vs Notion](https://www.akveo.com/budibase-vs-retool) - Platform comparison
- [CSV Import Comparison](https://dev.to/xxbricksquadxx/mapping-csv-airtable-or-notion-without-tears-template-inside-2lnd) - Practical experiences

**Key Takeaway**: PlayerARC's PRD already exceeds most of these platforms' capabilities. The combination of AI-powered mapping, conflict resolution UI, and guardian matching is more sophisticated than any single competitor.

---

## 2. GAA Import Feature Analysis

### 2.1 Code Architecture Review

**Location**: `/apps/web/src/components/gaa-import.tsx` (2,824 lines)

#### Component Structure

```typescript
// State Management (Lines 209-262)
- step: Current wizard step (1, 1.5, 2, 2.5, 3)
- csvData: Raw CSV text
- parsedMembers: Parsed and enriched member data
- teamAssignments: Maps member index → teamId
- duplicates: Array of detected duplicates
- duplicateResolutions: Maps member index → resolution choice
- detectedTeams: Teams auto-detected from CSV
- localTeams: Current + newly created teams

// Key Functions
- parseCSV(): Two-pass parsing with parent lookup (lines 587-830)
- calculateAge(): Age group determination (lines 394-416)
- Guardian matching: Multi-signal scoring (backend)
- validateCSVColumns(): Real-time column validation (lines 919-1057)
```

**Architectural Strength**: Clear separation of concerns with well-defined state transitions.

---

### 2.2 What's Exceptional in GAA Import

#### 2.2.1 Two-Pass CSV Parsing Strategy

**Lines 591-829**: Innovative approach to guardian matching.

```typescript
// Pass 1: Build parent lookup maps
const parentsByEmail = new Map<string, ParsedParent>();
const parentsByPhone = new Map<string, ParsedParent>();
const parentsByAddress = new Map<string, ParsedParent>();

// Pass 2: Process members and match parents
for (const row of rows) {
  // Match youth players to parents within same import
  if (isYouth) {
    const matchedParent = findParentMatch(row, parentMaps);
  }
}
```

**Why It's Exceptional**:
- Handles "all membership data" scenario intelligently
- Discovers family relationships within the import itself
- No external API calls needed
- Reduces manual parent linking work

**PRD Status**: ✅ Covered in Section 6.4.3 "Guardian Discovery from Membership Data"

**Recommendation**: Highlight this as a **differentiating feature** in the PRD. Most import systems require explicit parent columns; this auto-discovers relationships.

---

#### 2.2.2 Multi-Signal Guardian Scoring

**Backend Implementation** (`playerImport.ts` lines 125-223):

| Signal | Points | Detection Method |
|--------|--------|------------------|
| Email match | 50 | Exact string match |
| Surname + Postcode | 45 | Household inference |
| Surname + Town | 35 | Geographic proximity |
| Phone (last 10 digits) | 30 | Contact matching |
| Postcode only | 20 | Weak household signal |
| Town only | 10 | Very weak signal |
| House number | 5 | Address component match |

**Why It's Exceptional**:
- Probabilistic matching vs. exact-match requirement
- Confidence tiers (high 60+, medium 40-59, low 20-39)
- Graceful degradation (works with partial data)
- Explainable AI (shows reasoning for each match)

**PRD Status**: ✅ Fully covered in Section 6.4.2

**Recommendation**: Add **visual confidence indicators** to PRD:

```markdown
#### Guardian Match Confidence UI

```
┌─────────────────────────────────────────────────────────────────┐
│  GUARDIAN MATCHES (42 suggested)                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  HIGH CONFIDENCE (32 matches) - Auto-applied ✓          │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                                         │   │
│  │  John Murphy ←→ Tom Murphy                             │   │
│  │  Score: 95 (Email + Surname + Postcode match)          │   │
│  │  [✓ Applied automatically]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MEDIUM CONFIDENCE (8 matches) - Review required ⚠️     │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                                         │   │
│  │  Sarah Kelly ←→ Mary Kelly                             │   │
│  │  Score: 55 (Surname + Town match)                      │   │
│  │  [Approve] [Skip]                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LOW CONFIDENCE (2 matches) - Manual review needed ℹ️   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
```

---

#### 2.2.3 Smart Team Auto-Creation (Step 1.5)

**Lines 1911-2064**: Intermediate step that only appears when needed.

**UI Elements**:
- Visual summary: Total teams, existing, to create, total players
- Checkbox selection for which teams to create
- "Select All" bulk action
- Existing teams shown with checkmark (non-editable)
- Player count per team

**Why It's Exceptional**:
- **Conditional display**: Only shows if teams are missing
- **Smart defaults**: Pre-selects all missing teams
- **Transparent**: Shows exactly what will be created
- **Efficient**: Creates teams in parallel (Promise.all)

**PRD Status**: ✅ Covered in Section 6.2.4 (Step 3c: Team Creation)

**Recommendation**: Emphasize the **conditional step** pattern as a best practice:

```markdown
### Conditional Steps Design Pattern

Steps should only appear when necessary:

| Step | Condition | Skip If |
|------|-----------|---------|
| Map Columns | Some columns unmapped | All columns auto-mapped >90% confidence |
| Create Teams | Missing teams detected | All teams exist |
| Review Duplicates | Duplicates found | No duplicates |
| Resolve Conflicts | Validation errors | All data valid |

**Benefit**: Reduces clicks for clean imports, provides help when needed.
```

---

#### 2.2.4 Duplicate Resolution UX

**Lines 2066-2265**: Comprehensive duplicate handling UI.

**Features**:
1. **Search**: Filter duplicates by name, DOB, or team
2. **Bulk Selection**: Select all + bulk actions (Replace All, Keep All, Skip All)
3. **Side-by-Side Comparison**: Import data vs. existing record
4. **Three Resolution Options**:
   - Skip: Don't import this record
   - Keep: Use existing player, ignore import
   - Replace: Overwrite with new data
5. **Field-Level Details**: Shows team, season, last review date

**Why It's Exceptional**:
- **Search-first**: Large imports may have many duplicates
- **Bulk operations**: Handle similar cases efficiently
- **Clear visualization**: Side-by-side makes decision easy
- **Selective display**: Shows only filtered results

**PRD Status**: ⚠️ Partially covered - PRD has UI mockup but missing search/filter features

**Recommendation**: Update PRD Section 6.2.4 (Step 3a) to include:

```markdown
**Enhanced Duplicate Resolution Features**:

1. **Search & Filter**:
   - Real-time search across name, DOB, team
   - Show "X of Y duplicates" when filtering
   - Preserves resolutions when searching

2. **Bulk Selection**:
   - "Select All" checkbox (respects filters)
   - Bulk actions: Replace All, Keep All, Skip All
   - Apply to selected subset or all

3. **Smart Defaults**:
   - All duplicates default to "Skip" (safest)
   - Admin must explicitly choose to replace/keep

4. **Progress Tracking**:
   - "12 resolved, 8 pending" indicator
   - Cannot proceed until all resolved
```

---

#### 2.2.5 Import Progress Display

**Lines 2554-2568**: Real-time progress with detailed status.

```typescript
│  ████████████████████░░░░░░░░░░  67%                           │
│                                                                 │
│  ✓ Teams created (3 of 3)                                      │
│  ✓ Player identities (45 of 67)                                │
│  → Guardian matching (processing...)                           │
│  ○ Team assignments (pending)                                  │
│  ○ Sport passports (pending)                                   │
│                                                                 │
│  Current: Creating identity for "Emma Walsh"                   │
```

**Why It's Exceptional**:
- **Multi-level detail**: Overall progress + step-by-step status
- **Current item**: Shows exactly what's happening right now
- **Clear iconography**: ✓ (done), → (processing), ○ (pending)
- **Transparent**: Admin sees all phases of import

**PRD Status**: ✅ Covered in Section 6.2.5

**Recommendation**: Add **error handling during progress**:

```markdown
#### Error Handling During Import

If errors occur mid-import:

```
│  IMPORT ERRORS DETECTED                                        │
│  ████████████████████░░░░░░░░░░  67% (paused)                 │
│                                                                 │
│  ✓ Teams created (3 of 3)                                      │
│  ✓ Player identities (45 of 67)                                │
│  ✗ Guardian matching (3 errors)                                │
│  ○ Team assignments (paused)                                   │
│  ○ Sport passports (paused)                                    │
│                                                                 │
│  Errors:                                                       │
│  • Row 23: Guardian email invalid                              │
│  • Row 45: Guardian phone format error                         │
│  • Row 67: Duplicate guardian detected                         │
│                                                                 │
│  [Fix Errors & Retry] [Skip Error Rows] [Cancel Import]       │
```

**Options**:
- Fix errors and retry failed rows
- Skip error rows and continue with successful records
- Cancel import (partial data will be rolled back if <Phase 2>)
```

---

### 2.3 What Should Be Preserved from GAA Import

✅ **Must Preserve**:

1. **Two-pass parsing with guardian discovery** - Unique differentiator
2. **Multi-signal guardian scoring** - Best-in-class matching
3. **Conditional step display** - Excellent UX pattern
4. **Real-time column validation** - Immediate feedback
5. **Duplicate search & bulk actions** - Scalable for large imports
6. **Detailed progress tracking** - Builds trust during long operations
7. **Step indicator visual design** - Clear, professional
8. **Import filter options** (All/Youth/Senior) - Useful for large datasets

✅ **Should Generalize**:

1. **Skill rating strategies** - Make sport-agnostic:
   - Blank (no ratings)
   - Middle (neutral baseline)
   - Age-appropriate (per sport config)
   - Custom (admin sets defaults)

2. **Age group detection** - Use sport configuration:
   - Current: Hardcoded U8-U18, Senior
   - Future: Load from `sportAgeGroupConfig` table

3. **Team naming convention** - Template-based:
   - Current: "Senior Men", "U12 Female"
   - Future: `{ageGroup} {gender}` or custom template

4. **CSV column aliases** - Expand alias database:
   - Current: GAA Foireann columns
   - Future: FAI, IRFU, soccer, rugby specific aliases

---

### 2.4 What Could Be Improved

⚠️ **Opportunities**:

1. **Step 1: Upload**:
   - ❌ No template download for other sports (only GAA)
   - ❌ No recent files/import history
   - ✅ Good: Drag-drop + paste options

2. **Step 2: Mapping** (Implicit):
   - ❌ Not visible as separate step in GAA import
   - ❌ Column validation happens but no mapping UI shown
   - **Why**: Hardcoded for GAA Foireann format
   - **Future**: Needs explicit mapping UI for generic imports

3. **Step 3: Import Execution**:
   - ❌ No pause/cancel option during import
   - ❌ Limited error recovery options
   - ✅ Good: Detailed progress display

4. **Step 5: Complete**:
   - ❌ No import log export
   - ❌ No "What went wrong" summary if partial success
   - ✅ Good: "What's Next" actions (View Dashboard)

---

## 3. PRD Strengths

### 3.1 Comprehensive Coverage

✅ **Excellent Areas**:

1. **Problem Statement**: Clear articulation of current limitations
2. **Success Metrics**: Measurable, specific targets
3. **Design Principles**: 7 well-defined principles with examples
4. **System Architecture**: Clear component responsibilities
5. **Smart Field Mapping**: Industry-leading approach with 6 strategies
6. **Guardian Matching**: Preserves sophisticated existing logic
7. **Phased Rollout**: Realistic 20-week timeline with clear deliverables
8. **Security & Privacy**: GDPR compliance, audit logging, access control

### 3.2 Industry Alignment

✅ **Matches Best Practices**:

- Progressive disclosure (conditional steps)
- AI-powered column mapping
- Real-time validation
- Conflict resolution UI
- Multi-sport architecture
- Template-based sources
- Federation connector framework

### 3.3 Technical Soundness

✅ **Strong Technical Foundation**:

- Leverages existing `batchImportPlayersWithIdentity`
- Performance-optimized (batch processing, indexes, no N+1)
- New tables well-designed (`importTemplates`, `importSessions`, etc.)
- TypeScript interfaces for all engines
- Clear separation of concerns

---

## 4. Enhancement Opportunities

### 4.1 High-Priority Additions

#### 4.1.1 Data Quality Scoring (Phase 2)

**Why**: Industry standard in 2025-2026, builds admin confidence.

**Add to PRD**: Section 6.9 (see detailed specification in Section 1.2 above)

**Implementation**:
- ML anomaly detection for consistency scores
- Pattern matching for accuracy (email, phone, postcode validation)
- Duplicate detection confidence scoring
- Real-time quality dashboard during Step 3: Review

---

#### 4.1.2 Save & Resume Feature (Phase 2)

**Why**: Large imports (500+ records) may require review over multiple sessions.

**Add to PRD**: Section 6.2.7

```markdown
### 6.2.7 Save & Resume

**Objective**: Allow admins to pause and resume large imports.

#### Triggers

- Import session >30 minutes active
- User navigates away from page
- Browser closes unexpectedly
- Admin clicks "Save & Continue Later"

#### Implementation

1. **Auto-save state** after each step completion:
   - CSV data (stored in Convex)
   - Column mappings
   - Duplicate resolutions
   - Team creation selections
   - Validation fixes

2. **Resume link generation**:
   - Unique session token
   - Sent via email if admin requests
   - Accessible from import history

3. **Session expiration**:
   - 7 days default
   - Warning at 6 days
   - Data deleted after expiration

4. **Security**:
   - Session token required
   - Same user only (userId validation)
   - Cannot resume completed imports
```

---

#### 4.1.3 Import Templates UI (Phase 1)

**Why**: Template selection is mentioned but UI not fully specified.

**Add to PRD**: Enhance Section 6.6.3 with detailed interaction design:

```markdown
#### Template Management UI (Platform Staff)

**Create Template**:
1. Select source sport (or "All sports")
2. Upload sample file or paste column names
3. Map columns to PlayerARC fields
4. Set default behaviors:
   - Auto-create teams: Yes/No
   - Auto-create passports: Yes/No
   - Skill rating strategy: Blank/Middle/Age-appropriate
5. Add validation rules (optional)
6. Add instructions for admins using this template
7. Publish to all orgs or specific sport

**Edit Template**:
- Version history (track changes)
- Test template with sample data
- View usage statistics (how many orgs use it)

**Admin Template Selection**:
- Filter by sport
- See template description and last updated date
- Preview required columns
- Download sample template file
```

---

#### 4.1.4 Mobile-Responsive Design Requirements (Phase 1)

**Why**: Explicit mobile requirements missing from PRD.

**Add to PRD**: Section 6.2.8

```markdown
### 6.2.8 Mobile & Responsive Design

**Objective**: Ensure import wizard works seamlessly on tablets and smartphones.

#### Responsive Breakpoints

| Device | Width | UI Adaptations |
|--------|-------|----------------|
| Desktop | >1024px | Full side-by-side layouts |
| Tablet | 768-1024px | Stacked layouts, maintain wizard structure |
| Mobile | <768px | Single column, touch-optimized controls |

#### Touch Optimizations

- **Tap targets**: Minimum 44x44px (Apple HIG standard)
- **Drag-drop**: Works with touch gestures
- **Swipe navigation**: Swipe left/right for duplicate review
- **Pinch-zoom**: Disabled on form elements
- **Keyboard**: Auto-focus and smart input types

#### Mobile-Specific Features

- **File upload**: Access camera and photo library
- **Paste**: Long-press gesture support
- **Progress**: Sticky header with % complete
- **Offline handling**: Show error if connection lost during import

#### PWA Capabilities

- Install as app on home screen
- Offline column mapping (cache mappings locally)
- Background sync for large imports
- Push notifications when import completes
```

---

### 4.2 Medium-Priority Additions

#### 4.2.1 Import Analytics Dashboard (Phase 3)

**Why**: Platform staff need visibility into import health.

**Add to PRD**: Enhance Section 6.8.4

```markdown
### 6.8.4 Analytics & Insights

**Platform Staff Dashboard**:

1. **Volume Metrics**:
   - Imports per day/week/month
   - Records imported (players, guardians, teams)
   - Peak usage times

2. **Quality Metrics**:
   - Success rate (first attempt)
   - Average data quality score
   - Common validation errors
   - Duplicate detection rate

3. **Performance Metrics**:
   - Average completion time
   - Median time per step
   - Drop-off points (which step do admins abandon?)

4. **Template Metrics**:
   - Most popular templates
   - Template success rates
   - Column mapping accuracy by template

5. **Support Metrics**:
   - Imports requiring staff intervention
   - Common support ticket types
   - Admin satisfaction scores

**Admin Dashboard**:

- Import history (last 10 imports)
- Success/failure summary
- Data quality trends over time
- "Your org vs. average" comparison
```

---

#### 4.2.2 Granular Undo Feature (Phase 2)

**Why**: Current "no undo" decision may be too restrictive.

**Add to PRD**: Section 9.5

```markdown
### 9.5 Import Undo & Rollback

**Objective**: Allow admins to reverse imports without data loss.

#### Soft Undo (24-hour window)

After import completes, admin can:

1. **"Undo This Import"** button available for 24 hours
2. Changes imported records status to "pending_removal"
3. Records hidden from UI but not deleted
4. Admin reviews and confirms deletion or restoration
5. After 24 hours, permanent deletion occurs

#### Selective Removal

Admin can:

1. View imported players in a filtered list
2. Select individual players to remove
3. System handles cascading deletes:
   - Team assignments
   - Guardian links (if guardian not linked to other players)
   - Sport passports
4. Audit trail logs all removals

#### Limitations

- Cannot undo after 24-hour window
- Cannot undo if data has been modified by coaches
- Cannot undo if parents have claimed accounts

#### Implementation

Use `importSessionId` field to identify related records.

```sql
-- Find all records from import session
SELECT * FROM playerIdentities
WHERE importSessionId = 'abc123'

-- Mark for removal
UPDATE playerIdentities
SET status = 'pending_removal',
    removalRequestedAt = NOW()
WHERE importSessionId = 'abc123'
```
```

---

### 4.3 Nice-to-Have Additions

#### 4.3.1 Import Simulation/Dry Run (Phase 2)

**Status**: Mentioned in Phase 2 deliverables but not specified.

**Add to PRD**: Section 6.10

```markdown
### 6.10 Import Simulation (Dry Run)

**Objective**: Let admins preview import results without committing changes.

#### How It Works

1. Admin completes wizard through Step 3: Review
2. Clicks "Preview Import" instead of "Import"
3. System simulates import:
   - Counts: players, guardians, teams to be created
   - No database writes
   - Shows what would happen
4. Admin reviews and decides:
   - "Looks good, proceed with import"
   - "Go back and fix issues"

#### Simulation Output

```
┌─────────────────────────────────────────────────────────────────┐
│  IMPORT SIMULATION RESULTS                                      │
│                                                                 │
│  If you proceed, this will happen:                              │
│                                                                 │
│  ✓ Create 67 player identities                                 │
│  ✓ Create 42 guardian identities                               │
│  ✓ Link 89 guardian-player relationships                       │
│  ✓ Create 3 new teams (U12 Male, U14 Female, Senior Men)       │
│  ✓ Assign 67 players to teams                                  │
│  ✓ Create 67 sport passports                                   │
│  ⚠ Skip 4 duplicate players (as per your selections)           │
│                                                                 │
│  Estimated time: 2-3 minutes                                    │
│                                                                 │
│  [Go Back] [Proceed with Import]                               │
└─────────────────────────────────────────────────────────────────┘
```
```

---

#### 4.3.2 AI-Powered Smart Suggestions (Phase 3+)

**Why**: Next evolution of AI beyond column mapping.

**Add to PRD**: Section 6.11 (Future Enhancements)

```markdown
### 6.11 AI-Powered Smart Suggestions (Future)

**Objective**: Provide intelligent recommendations throughout import.

#### Suggestion Types

1. **Age Group Correction**:
   - "Player John Smith (DOB: 2015-03-20) is in U12 team but should be U10 based on age"
   - Offer to reassign with one click

2. **Duplicate Likelihood**:
   - "Mary Murphy and Maria Murphy have similar names, same DOB, different spellings"
   - "Likely same person - consider merging"

3. **Data Anomalies**:
   - "12 players have postcode format 'XXXX' which looks invalid"
   - "Suggest: Leave blank or fix manually?"

4. **Best Practice Tips**:
   - "You're importing 200 players but no emergency contacts"
   - "Consider collecting this info to improve safety"

5. **Optimization Suggestions**:
   - "You import weekly - consider setting up automatic sync"
   - "Template available for your data format - save time next import"

#### Implementation

- LLM analyzes import data patterns
- Surfaces suggestions at relevant steps
- Admin can dismiss or act on suggestions
- System learns from admin decisions
```

---

## 5. Technical Recommendations

### 5.1 Parser Engine Enhancements

**Current PRD**: Basic TypeScript interfaces.

**Recommendation**: Add specific libraries and techniques:

```markdown
### 8.1 Parser Engine (Enhanced)

#### Libraries

| Library | Purpose | Why |
|---------|---------|-----|
| **papaparse** | CSV parsing | Battle-tested, handles edge cases (quoted fields, multi-line, encodings) |
| **xlsx** | Excel parsing | Supports .xlsx, .xls, multiple sheets |
| **detect-character-encoding** | Encoding detection | Handle UTF-8, UTF-16, Windows-1252, etc. |
| **encoding-japanese** | Japanese text | If expanding internationally |

#### Advanced Features

1. **Header Row Detection Algorithm**:
```typescript
function detectHeaderRow(rows: string[][]): number {
  // Score each row based on likelihood of being headers
  const scores = rows.slice(0, 10).map((row, idx) => ({
    index: idx,
    score: calculateHeaderScore(row)
  }));

  // Header characteristics:
  // - Contains text (not numbers)
  // - No empty cells
  // - Unique values
  // - Common header words (name, email, dob)

  return scores.sort((a, b) => b.score - a.score)[0].index;
}
```

2. **Delimiter Detection**:
   - Try comma, semicolon, tab, pipe
   - Count occurrences per line
   - Most consistent delimiter wins

3. **Date Format Detection**:
   - Analyze sample values
   - Detect MM/DD/YYYY vs DD/MM/YYYY vs YYYY-MM-DD
   - Handle ambiguous dates (ask admin to clarify)

4. **Error Recovery**:
   - Malformed rows: log warning, skip row
   - Encoding errors: attempt conversion
   - Quote escaping issues: use papaparse's lenient mode
```

---

### 5.2 Mapper Engine Enhancements

**Current PRD**: Good foundation with 6 strategies.

**Recommendation**: Add implementation details:

```markdown
### 8.2 Mapper Engine (Enhanced)

#### Strategy Priority Queue

```typescript
async function suggestMappings(columns: string[]): Promise<MappingSuggestion[]> {
  const suggestions: MappingSuggestion[] = [];

  for (const column of columns) {
    // Try strategies in priority order
    let suggestion = await exactMatch(column);
    if (suggestion.confidence >= 100) {
      suggestions.push(suggestion);
      continue;
    }

    suggestion = await aliasMatch(column);
    if (suggestion.confidence >= 95) {
      suggestions.push(suggestion);
      continue;
    }

    suggestion = await historicalMatch(column, organizationId);
    if (suggestion.confidence >= 85) {
      suggestions.push(suggestion);
      continue;
    }

    suggestion = await fuzzyMatch(column);
    if (suggestion.confidence >= 70) {
      suggestions.push(suggestion);
      continue;
    }

    suggestion = await contentAnalysis(column, sampleValues);
    if (suggestion.confidence >= 75) {
      suggestions.push(suggestion);
      continue;
    }

    // Last resort: AI inference
    suggestion = await aiInference(column, sampleValues);
    suggestions.push(suggestion);
  }

  return suggestions;
}
```

#### Fuzzy Matching Algorithm

Use Levenshtein distance with threshold:

```typescript
import { distance } from 'fastest-levenshtein';

function fuzzyMatch(source: string, targets: string[]): { target: string; score: number }[] {
  const normalized = source.toLowerCase().trim();

  return targets
    .map(target => ({
      target,
      distance: distance(normalized, target.toLowerCase()),
      similarity: 1 - (distance / Math.max(normalized.length, target.length))
    }))
    .filter(m => m.similarity >= 0.7) // 70% threshold
    .sort((a, b) => b.similarity - a.similarity)
    .map(m => ({
      target: m.target,
      score: Math.round(m.similarity * 100)
    }));
}
```

#### AI Inference Caching

```typescript
// Cache AI suggestions to avoid repeated LLM calls
const aiCache = new Map<string, MappingSuggestion>();

async function aiInference(column: string, samples: string[]): Promise<MappingSuggestion> {
  const cacheKey = `${column}:${samples.slice(0, 3).join(',')}`;

  if (aiCache.has(cacheKey)) {
    return aiCache.get(cacheKey)!;
  }

  const suggestion = await callLLM({
    columnName: column,
    sampleValues: samples,
    targetFields: AVAILABLE_FIELDS
  });

  aiCache.set(cacheKey, suggestion);
  return suggestion;
}
```
```

---

### 5.3 Validator Engine Enhancements

**Current PRD**: Basic validation concept.

**Recommendation**: Add comprehensive validation rules:

```markdown
### 8.3 Validator Engine (Enhanced)

#### Validation Rule Types

| Rule Type | Description | Example |
|-----------|-------------|---------|
| **Required** | Field must be present and non-empty | firstName, lastName, dateOfBirth |
| **Format** | Field must match regex pattern | Email: `/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/` |
| **Range** | Numeric field must be within range | Age: 4-99 |
| **Enum** | Field must be one of allowed values | Gender: ["male", "female", "other"] |
| **Date** | Valid date in acceptable format | DOB: YYYY-MM-DD |
| **Reference** | Foreign key must exist | TeamId must be valid team |
| **Conditional** | Required if another field has value | Parent email required if player <18 |
| **Custom** | Business logic validation | "Player cannot be on 2 teams in same age group" |

#### Auto-Fix Suggestions

```typescript
const autoFixRules = [
  {
    rule: 'date_format_mismatch',
    detect: (value) => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value),
    suggest: (value) => {
      // Detect if MM/DD/YY or DD/MM/YY
      const [a, b, y] = value.split('/');
      const year = y.length === 2 ? (Number(y) < 50 ? '20' + y : '19' + y) : y;

      if (Number(a) > 12) {
        // Must be DD/MM/YYYY
        return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      } else if (Number(b) > 12) {
        // Must be MM/DD/YYYY
        return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
      } else {
        // Ambiguous - ask user
        return null; // Triggers manual review
      }
    }
  },
  {
    rule: 'phone_format_variation',
    detect: (value) => /^[\d\s\-\(\)]+$/.test(value),
    suggest: (value) => {
      // Strip all non-digits
      const digits = value.replace(/\D/g, '');

      // Irish mobile: 087-123-4567
      if (digits.startsWith('087') || digits.startsWith('085') || digits.startsWith('086')) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
      }

      return digits; // Store digits only
    }
  },
  // ... more rules
];
```

#### Validation Error Messages

User-friendly, actionable messages:

```typescript
const errorMessages = {
  required: (field) => `${field} is required and cannot be empty`,
  format: (field, expected) => `${field} format is invalid. Expected: ${expected}`,
  date_invalid: (field, value) => `"${value}" is not a valid date. Use YYYY-MM-DD format`,
  email_invalid: (field, value) => `"${value}" is not a valid email address`,
  age_out_of_range: (field, value, min, max) =>
    `Age ${value} is outside valid range (${min}-${max} years)`,
  duplicate_detected: (field, existing) =>
    `This ${field} already exists for ${existing}. See duplicate resolution.`
};
```
```

---

### 5.4 Performance Optimizations

**Current PRD**: Good foundation (batch processing, indexes, no N+1).

**Recommendation**: Add specific techniques:

```markdown
### 8.5 Performance Optimizations (Enhanced)

#### Streaming Import for Large Files

For imports >10,000 records:

```typescript
async function streamingImport(file: File) {
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let batch: Record<string, string>[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete rows
    const rows = buffer.split('\n');
    buffer = rows.pop() || ''; // Keep incomplete row in buffer

    for (const row of rows) {
      const parsed = parseRow(row);
      batch.push(parsed);

      // Process in batches of 100
      if (batch.length >= 100) {
        await processBatch(batch);
        batch = [];

        // Update progress UI
        updateProgress();
      }
    }
  }

  // Process remaining batch
  if (batch.length > 0) {
    await processBatch(batch);
  }
}
```

#### Worker Thread for Parsing

Offload parsing to Web Worker:

```typescript
// main thread
const worker = new Worker('/parsing-worker.js');
worker.postMessage({ csvData, mappings });

worker.onmessage = (event) => {
  const { parsed, errors } = event.data;
  setParsedData(parsed);
  setErrors(errors);
};

// parsing-worker.js
self.onmessage = (event) => {
  const { csvData, mappings } = event.data;

  const result = parseAndValidate(csvData, mappings);

  self.postMessage(result);
};
```

#### Database Write Optimization

```typescript
// Use Convex's batch operations
async function batchCreatePlayers(players: Player[]) {
  // Split into chunks of 100
  const chunks = chunk(players, 100);

  // Process chunks sequentially (Convex limitation)
  const results = [];
  for (const chunk of chunks) {
    const chunkResults = await ctx.runMutation(api.batchImport, { players: chunk });
    results.push(...chunkResults);

    // Brief pause to avoid rate limits
    await sleep(100);
  }

  return results;
}
```

#### Caching Strategies

```typescript
// Cache organization data for duration of import session
const orgCache = {
  teams: new Map(),
  existingPlayers: new Map(),
  ageGroupConfig: new Map()
};

// Load once at start
await Promise.all([
  loadTeams(orgCache.teams),
  loadPlayers(orgCache.existingPlayers),
  loadAgeGroupConfig(orgCache.ageGroupConfig)
]);

// Use cached data throughout import
function findExistingPlayer(name, dob) {
  const key = `${name}:${dob}`;
  return orgCache.existingPlayers.get(key);
}
```
```

---

## 6. Implementation Priority Matrix

### 6.1 Impact vs. Effort Analysis

| Enhancement | Impact | Effort | Priority | Phase |
|-------------|--------|--------|----------|-------|
| **Data Quality Scoring** | High | Medium | 🟢 High | 2 |
| **Save & Resume** | Medium | Medium | 🟡 Medium | 2 |
| **Mobile Optimization** | High | Low | 🟢 High | 1 |
| **Import Templates UI** | High | Low | 🟢 High | 1 |
| **Granular Undo** | Medium | High | 🟡 Medium | 2 |
| **Import Simulation** | Medium | Medium | 🟡 Medium | 2 |
| **Analytics Dashboard** | Low | Medium | 🟠 Low | 3 |
| **AI Smart Suggestions** | Low | High | 🟠 Low | 4+ |

### 6.2 Recommended Phase Adjustments

**Phase 1 Additions**:
- ✅ Mobile-responsive requirements (LOW EFFORT, HIGH IMPACT)
- ✅ Template selection UI details (LOW EFFORT, HIGH IMPACT)

**Phase 2 Additions**:
- ✅ Data quality scoring (MEDIUM EFFORT, HIGH IMPACT)
- ✅ Save & Resume feature (MEDIUM EFFORT, MEDIUM IMPACT)
- ⚠️ Granular undo (HIGH EFFORT, MEDIUM IMPACT) - Consider deferring to Phase 3

**Phase 3 Considerations**:
- Import analytics dashboard
- Granular undo (if deferred from Phase 2)

---

## 7. Appendix: Research Sources

### AI-Powered Import

- [Flatfile Transform (July 2025)](https://flatfile.com/news/flatfile-announces-transform-an-advanced-agentic-experience-for-data/) - Agentic AI for data preparation
- [OneSchema AI](https://www.oneschema.co/) - LLM-vision for document extraction
- [ImportCSV](https://importcsv-marketing.vercel.app/) - AI-native importer
- [Osmos AI Blog](https://www.osmos.io/blog/solving-data-ingestion-using-ai) - Solving data ingestion with AI
- [Dromo AI Blog](https://dromo.io/blog/how-ai-is-transforming-data-imports-and-validation) - AI transforming validation

### Data Quality & ML

- [Telmai ML Techniques](https://www.telm.ai/blog/leveraging-ml-to-supercharge-data-quality-validation-processes/) - 8 ways to leverage ML
- [Talend ML for Data Quality](https://www.talend.com/resources/using-machine-learning-data-quality/) - Using ML for quality
- [Metaplane ML Checks](https://www.metaplane.dev/blog/how-to-use-machine-learning-for-robust-data-quality-checks) - Robust quality checks
- [Anomalo Best Practices](https://www.anomalo.com/blog/data-quality-in-machine-learning-best-practices-and-techniques) - ML best practices

### Multi-Step Wizard UX

- [Webstacks Multi-Step Forms (2025)](https://www.webstacks.com/blog/multi-step-form) - 8 best examples
- [NN/G Wizards](https://www.nngroup.com/articles/wizards/) - Definition and design
- [PatternFly Progressive Forms](https://medium.com/patternfly/comparing-web-forms-a-progressive-form-vs-a-wizard-110eefc584e7) - Progressive vs wizard
- [Growform UX Best Practices](https://www.growform.co/must-follow-ux-best-practices-when-designing-a-multi-step-form/) - Must-follow practices
- [WeWeb Multi-Step Design](https://www.weweb.io/blog/multi-step-form-design) - Single vs multi-step

### Database Transactions

- [Microservices Saga Pattern](https://microservices.io/patterns/data/saga.html) - Compensating transactions
- [Harness Rollback Strategies](https://www.harness.io/harness-devops-academy/database-rollback-strategies-in-devops) - DevOps approaches
- [Medium WAL Mechanisms](https://medium.com/@moali314/database-logging-wal-redo-and-undo-mechanisms-58c076fbe36e) - Undo/redo logs
- [Stitch Fix SOA Patterns](https://multithreaded.stitchfix.com/blog/2017/11/22/patterns-of-soa-database-transactions/) - Database transactions

### Platform Comparisons

- [Airtable vs Coda vs Notion](https://community.coda.io/t/updated-coda-notion-airtable-and-the-future-looks-like/13340) - Platform comparison
- [CSV Import Comparison](https://dev.to/xxbricksquadxx/mapping-csv-airtable-or-notion-without-tears-template-inside-2lnd) - Practical experiences
- [Budibase vs Retool](https://uibakery.io/blog/budibase-vs-retool-comparison-of-platforms) - Low-code platforms

### SaaS UX Best Practices

- [OneSchema CSV Uploader](https://www.oneschema.co/blog/building-a-csv-uploader) - 5 best practices
- [Flatfile Seamless Import](https://flatfile.com/blog/optimizing-csv-import-experiences-flatfile-portal/) - Optimizing experiences
- [Kalzumeus CSV/Excel Upload](https://www.kalzumeus.com/2015/01/28/design-and-implementation-of-csvexcel-upload-for-saas/) - Design and implementation
- [Smashing Magazine Data Importer](https://www.smashingmagazine.com/2020/12/designing-attractive-usable-data-importer-app/) - Attractive and usable

---

## Conclusion

The Generic Import Framework PRD is **excellent** and ready for implementation with minor enhancements.

**Key Strengths**:
- Comprehensive coverage of all major areas
- Aligned with 2025-2026 industry best practices
- Strong technical foundation
- Realistic phased rollout plan

**Recommended Additions** (Priority Order):
1. ✅ Mobile-responsive requirements (Phase 1)
2. ✅ Template selection UI details (Phase 1)
3. ✅ Data quality scoring (Phase 2)
4. ✅ Save & Resume feature (Phase 2)
5. ⚠️ Granular undo (Phase 2-3)
6. 📋 Import simulation (Phase 2)

**From GAA Import - Must Preserve**:
- Two-pass parsing with guardian discovery
- Multi-signal guardian scoring
- Conditional step display pattern
- Duplicate search & bulk actions
- Real-time column validation
- Detailed progress tracking

**Verdict**: ✅ **Approve for implementation** with recommended enhancements incorporated.

---

*End of Review*
