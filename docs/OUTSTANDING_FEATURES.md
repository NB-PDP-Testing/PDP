# Outstanding Features - PDP/PlayerARC System

> **Last Updated:** 2025-12-22
> **Status:** Comprehensive backlog for MVP parity and enhancement

## Overview

This document tracks all outstanding features that need to be built to achieve MVP parity and beyond. Features are organized by priority and complexity.

---

## System Architecture Summary

| Component | Current State |
|-----------|--------------|
| **Authentication** | ✅ Complete - Better Auth with Google/Microsoft OAuth |
| **User Management** | ✅ Complete - Role assignment, approval workflow |
| **Voice Notes** | ✅ Complete - Recording, AI transcription (OpenAI), insights |
| **Player Passports** | ⚠️ Partial - View only, no skill editing sliders |
| **Parent Dashboard** | ⚠️ Partial - Basic view, missing MVP features |
| **Coach Dashboard** | ⚠️ Partial - Smart dashboard exists but needs enhancement |
| **Goals System** | ❌ Schema only - No UI built |
| **Injuries System** | ⚠️ Partial - Coach injury page exists, parent view missing |
| **Medical Profiles** | ❌ Schema only - No UI built |
| **PDF/Sharing** | ❌ Not started |
| **Analytics** | ❌ Not started |

---

## HIGH PRIORITY - Core Missing UI

### 1. Goals Dashboard for Coaches
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `passportGoals.ts` with full CRUD |
| **UI** | ❌ No dedicated page |
| **Location** | `/orgs/[orgId]/coach/goals` |
| **MVP Reference** | `GoalsDashboard.tsx` in MVP |

**Features Needed:**
- Goal creation wizard with skill linking
- Milestone tracking interface
- Progress visualization
- Bulk goal creation for teams
- Goal-to-skill linkage

---

### 2. Skill Assessment Rating Sliders
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `skillAssessments.ts` |
| **UI** | ❌ View only - no editing |
| **Location** | `/orgs/[orgId]/coach/assess` (enhance) |
| **MVP Reference** | `RatingSlider`, `EditPlayer` in MVP |

**Features Needed:**
- Rating slider component (1-5 scale with colors)
- Skill assessment form
- Before/after comparison
- Assessment history view

---

### 3. Apply Voice Note Insights to Player Profiles
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ Insights extracted |
| **Integration** | ❌ Insights marked as "applied" but no actual update |
| **Impact** | Critical - breaks coach workflow |

**Features Needed:**
- Route insights to correct tables (injuries, goals, notes)
- Update player skill assessments from insights
- Create injury records from injury insights
- Add notes to player profiles

---

### 4. Parent Dashboard Enhancement
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ Parent linking works |
| **UI** | ⚠️ Basic - missing MVP features |
| **Location** | `/orgs/[orgId]/parents` |
| **MVP Reference** | `ParentInsightsDashboard` |

**Features Needed:**
- Children overview cards with all metrics
- Top strengths display
- Attendance visualization
- Coach feedback section
- Weekly schedule calendar (with mock data initially)
- AI Practice Assistant
- Injury status for children
- Goals view for children (parent-visible only)

---

### 5. Medical Profiles Dashboard
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `medicalProfiles` table exists |
| **UI** | ❌ No page built |
| **Location** | `/orgs/[orgId]/admin/medical` or coach section |
| **MVP Reference** | `MedicalProfilesDashboard.tsx` |

**Features Needed:**
- Medical profile viewing
- Allergy tracking
- Medication management
- Emergency contact display
- Medical notes

---

### 6. Emergency Contacts Management (Adult Players)
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `playerEmergencyContacts.ts` with full CRUD |
| **UI** | ❌ No page built |
| **Location** | Player profile settings |

**Features Needed:**
- Add/edit/delete emergency contacts
- Priority ordering
- Contact type selection

---

## MEDIUM PRIORITY - Enhanced Functionality

### 7. PDF Generation & Sharing
| Aspect | Status |
|--------|--------|
| **Backend** | ⚠️ `pdf-generator.ts` file exists but not wired |
| **UI** | ❌ No ShareModal |
| **MVP Reference** | `pdfGenerator.ts`, `ShareModal.tsx` |

**Features Needed:**
- Player passport PDF export
- Customizable templates
- Share via email
- Share via WhatsApp
- Direct download

---

### 8. Analytics Dashboard
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `getClubBenchmarkAnalytics` query exists |
| **UI** | ❌ No page built |
| **Location** | `/orgs/[orgId]/admin/analytics` |
| **MVP Reference** | `AnalyticsDashboard.tsx` |

**Features Needed:**
- Club-wide skill distribution
- Team comparison charts
- Progress over time visualization
- Radar chart for individual/team skills
- Benchmark comparison across age groups

---

### 9. Team Roster Management UI
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `teamPlayerIdentities.ts` with full CRUD |
| **UI** | ⚠️ Basic team list only |
| **Location** | `/orgs/[orgId]/admin/teams/[teamId]` |

**Features Needed:**
- Drag-and-drop roster management
- Bulk player assignment
- Transfer between teams
- Squad/position visualization
- Coach assignment interface

---

### 10. Guardian Profile Management
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `orgGuardianProfiles.ts` with full CRUD |
| **UI** | ❌ No page |
| **Location** | `/orgs/[orgId]/parents/profile` |

**Features Needed:**
- Communication preferences
- Emergency priority settings
- View club notes
- Notification settings

---

### 11. Guardian Registration & Self-Service Linking
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `guardianIdentities.ts` find-or-create |
| **UI** | ❌ No self-service flow |

**Features Needed:**
- Guardian self-registration
- Child linking workflow (verification code)
- Multiple guardian support
- Primary guardian designation

---

### 12. Voice Notes Enhancements
| Aspect | Status |
|--------|--------|
| **Core** | ✅ Recording + AI works |
| **Missing** | Multiple UX features |
| **Reference** | `VOICE_NOTES_MVP_COMPARISON_AND_ENHANCEMENTS.md` |

**Features Needed:**
- Apply All / Reject All buttons
- Edit insight before applying
- Real-time transcription display while speaking
- Search & filter notes
- View source note link from insight
- Coach stats panel
- Export to CSV
- Success/warning animated banners

---

## LOW PRIORITY - Nice to Have

### 13. Reference Data Management (Admin)
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ `referenceData.ts` |
| **UI** | ❌ No admin interface |
| **Impact** | Admin-only, low urgency |

**Features Needed:**
- Sports management
- Age group management
- Skill category editing
- Skill definition management

---

### 14. Parent Notification System
| Aspect | Status |
|--------|--------|
| **Backend** | ❌ Not built |
| **UI** | ❌ Not built |

**Features Needed:**
- Notify parents when insights applied
- Injury notifications
- Review due reminders
- Parent-friendly message templates

---

### 15. Team Briefing Generator
| Aspect | Status |
|--------|--------|
| **Backend** | ❌ Not built |
| **UI** | ❌ Not built |

**Features Needed:**
- Auto-generate weekly briefing from voice notes
- Injury summary
- Top performers
- Focus areas
- Shareable parent report

---

### 16. Multi-Sport Passport Views
| Aspect | Status |
|--------|--------|
| **Backend** | ✅ Players can have multiple sports |
| **UI** | ❌ Single sport view only |

**Features Needed:**
- Sport switcher in passport view
- Cross-sport skill comparison
- Combined development view

---

### 17. Audit Logging
| Aspect | Status |
|--------|--------|
| **Backend** | ❌ Not built |
| **UI** | ❌ Not built |
| **MVP Reference** | `AuditLogViewer` |

**Features Needed:**
- Track all data changes
- User action logging
- Admin audit dashboard
- Export audit logs

---

### 18. Schedule/Calendar System
| Aspect | Status |
|--------|--------|
| **Backend** | ❌ No schema |
| **UI** | ❌ Not built |

**Features Needed:**
- Training sessions table
- Match fixtures table
- Parent schedule view
- Coach schedule management

---

## Implementation Checklist by Sprint

### Sprint A: Core Coach Features (1 week)
- [ ] Skill assessment rating sliders
- [ ] Apply insight to player profile (injuries, goals, notes)
- [ ] Goals dashboard basic CRUD

### Sprint B: Parent Experience (1 week)
- [ ] Enhanced parent dashboard with child cards
- [ ] Goals view for parents
- [ ] Injury view for parents
- [ ] Coach feedback section

### Sprint C: Voice Notes UX (1 week)
- [ ] Apply All / Reject All
- [ ] Edit insight before applying
- [ ] Search & filter notes
- [ ] Success/warning messages

### Sprint D: Analytics & Visualization (1 week)
- [ ] Analytics dashboard
- [ ] Radar charts
- [ ] Benchmark comparison visualization

### Sprint E: Export & Sharing (1 week)
- [ ] PDF generation
- [ ] Share modal
- [ ] Email/WhatsApp sharing

### Sprint F: Advanced Features (1+ week)
- [ ] Team roster management
- [ ] Guardian self-service
- [ ] Medical profiles dashboard
- [ ] Parent notification system

---

## Backend Status Summary

### Complete Models (Frontend UI Needed)
| Model | Status |
|-------|--------|
| `passportGoals.ts` | ✅ Full CRUD |
| `playerInjuries.ts` | ✅ Full CRUD |
| `orgInjuryNotes.ts` | ✅ Full CRUD |
| `medicalProfiles` (schema) | ✅ Defined |
| `playerEmergencyContacts.ts` | ✅ Full CRUD |
| `orgGuardianProfiles.ts` | ✅ Full CRUD |
| `skillAssessments.ts` | ✅ Full CRUD |
| `skillBenchmarks.ts` | ✅ Full CRUD |
| `teamPlayerIdentities.ts` | ✅ Full CRUD |

### Complete UI (Working)
| Component | Status |
|-----------|--------|
| Voice notes dashboard | ✅ Working |
| Coach injury tracking | ✅ Working |
| User management | ✅ Working |
| Player passport view | ✅ Working |
| GAA import | ✅ Working |
| Benchmarks admin | ✅ Working |

---

## Feature Count Summary

| Category | Count |
|----------|-------|
| **High Priority (Core Missing)** | 6 features |
| **Medium Priority (Enhanced)** | 6 features |
| **Low Priority (Nice to Have)** | 6 features |
| **Total Outstanding** | 18 features |

---

**Document Version:** 2.0
**Previous Update:** 2025-12-18
**Next Review:** After Sprint A completion
