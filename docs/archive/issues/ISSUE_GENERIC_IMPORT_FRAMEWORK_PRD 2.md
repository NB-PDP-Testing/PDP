# Generic Import Framework PRD - Ready for Review

## Overview

A comprehensive Product Requirements Document has been created for the **Generic Import Framework** - transforming PlayerARC's data onboarding from a single-sport, manual-only capability into a **multi-sport, configurable, connector-based import system**.

📄 **Full PRD**: [`scripts/ralph/prds/generic-import-framework.md`](../../../scripts/ralph/prds/generic-import-framework.md)

---

## Executive Summary

The Generic Import Framework enables:
- **Platform Staff** to configure import templates and federation connectors
- **Club Admins** to self-service import membership data with intelligent field mapping
- **Federation APIs** to sync membership data automatically with manual override capability

**Goal**: Make data import **delightful, frictionless, and intuitive** — reducing time-to-value from days to < 1 hour.

---

## Key Features

### 1. Smart Field Mapping
- AI-powered column detection using multiple strategies:
  - Exact match, alias match, fuzzy match
  - Historical learning from past imports
  - LLM inference for unknown columns
  - Content pattern analysis (email, phone, date formats)
- **Target**: 80%+ columns auto-mapped for known templates

### 2. Multi-Sport Support
- Configurable age groups per sport
- Sport-specific skill definitions
- Template-based imports for different federations (GAA, FAI, IRFU, etc.)

### 3. Import Wizard UX
5-step flow with intelligent skip conditions:
1. **Upload** - File, paste, or template selection
2. **Map** - Smart column mapping (skippable if high confidence)
3. **Review** - Duplicates, validation errors, team creation (skippable if clean)
4. **Import** - Batch processing with progress
5. **Complete** - Summary + "What's Next" actions

### 4. Conflict Resolution
- Side-by-side comparison UI
- Field-level merge controls
- Bulk actions for similar conflicts
- Configurable merge rules (newer wins, non-empty wins, etc.)

### 5. Guardian Matching
- Multi-signal scoring algorithm (existing logic preserved)
- Hybrid mode: auto-apply high confidence, review medium/low
- Support for explicit parent columns in CSV
- Adult player handling (emergency contacts, self-management)

### 6. Platform Staff Tools
- Cross-organization import dashboard
- Template management
- Future: Federation connector configuration
- Import analytics and error monitoring

### 7. Recurring Syncs (Phase 3)
- Scheduled or admin-triggered data refreshes
- Change detection and conflict resolution
- Sync health monitoring

### 8. Federation Connectors (Phase 4 - Future)
- API integration with membership databases
- OAuth/API key authentication
- Real-time or batch sync options

---

## Design Principles

| Principle | Description |
|-----------|-------------|
| **Speed Over Perfection** | Get admins to value fast; perfection can come later |
| **Intelligent Defaults** | System knows what admin wants before they do |
| **Transparent Control** | Admin feels in control, never confused |
| **Error Recovery** | Assume errors happen; make them easy to fix |
| **Professional Polish** | Smooth animations, clean transitions (no gimmicks) |
| **PlayerARC Branding** | Consistent platform experience, not org theming |

**Emotional Goals**: Confidence, Speed, Control, Magic

---

## Technical Highlights

### New Database Tables
- `importTemplates` - Reusable import configurations
- `importSessions` - Audit trail for all imports
- `importMappingHistory` - Learning from past column mappings
- `federationConnectors` - API connection management (future)

### Architecture Components
- **Parser Engine** - File format detection, CSV/Excel parsing
- **Mapper Engine** - AI-powered column mapping
- **Validator Engine** - Schema and business rule validation
- **Writer Engine** - Batch creation leveraging existing identity system

### Performance
- Batch processing (100 records per batch)
- Background jobs for large imports (>500 records)
- No N+1 queries (follows existing optimization patterns)

---

## Phased Rollout

| Phase | Timeline | Goal |
|-------|----------|------|
| **Phase 1** | Weeks 1-4 | Foundation - Multi-sport import with smart mapping |
| **Phase 2** | Weeks 5-8 | Enhanced UX - Conflict resolution, polish |
| **Phase 3** | Weeks 9-12 | Recurring Sync - Scheduled refreshes |
| **Phase 4** | Weeks 13-20 | Federation Connectors - API integrations |
| **Phase 5** | Ongoing | Advanced Features - Marketplace, transfers |

---

## Decisions Made

| Topic | Decision |
|-------|----------|
| GDPR Consent | Required before import |
| Audit Logging | Yes, 2 years retention |
| Medical Data | Importable but not required |
| Connector Marketplace | Yes (future) |
| Cross-org Player Transfers | Yes (future) |
| Bi-directional Sync | Not in early phases |
| Branding | PlayerARC platform (not org theming) |
| UX Tone | Professional polish, no confetti |

---

## Open Questions

1. Maximum import size before background processing? (Suggest 500)
2. Support for historical season data import?
3. Federation API rate limit handling strategy?
4. Attachment support (photos, documents)?

---

## Industry Research

Based on best practices from:
- [Flatfile](https://flatfile.com/product/mapping/) - AI mapping, Transform feature
- [OneSchema](https://www.oneschema.co/) - Fuzzy matching, historical mapping
- [HubSpot/Salesforce](https://www.revblack.com/guides/handling-duplicates-within-the-salesforce-and-hubspot-integration) - Duplicate handling
- [Data Ladder](https://dataladder.com/merging-data-from-multiple-sources/) - Conflict resolution patterns

---

## Review Requested

Please review the full PRD and provide feedback on:

1. **Scope** - Are we missing any critical features?
2. **Priorities** - Is the phasing correct?
3. **Technical Approach** - Any concerns with the architecture?
4. **UX Flow** - Does the wizard flow make sense?
5. **Open Questions** - Input on undecided items?

---

**Branch**: `claude/generic-import-prd-JHg1h`
**Full Document**: `scripts/ralph/prds/generic-import-framework.md`
