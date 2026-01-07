# Outstanding Features - PDP/PlayerARC System

> **Last Updated:** December 29, 2025 (Afternoon Review)  
> **Synced with GitHub Project:** https://github.com/orgs/NB-PDP-Testing/projects/4  
> **Note:** Issue #12 shows "Ready" in GitHub but UI is complete - recommend updating GitHub status to "Done"

---

## Quick Status Summary

| Status | Count | Features |
|--------|-------|----------|
| ✅ Done | 12 | Core features complete |
| 🔄 In Progress | 1 | Actively being worked on |
| 📋 Ready | 2 | Prioritized for next sprint |
| 📝 Backlog | 11 | Planned for future |

---

## ✅ COMPLETED FEATURES

### HIGH Priority - Done
| Issue | Feature | Notes |
|-------|---------|-------|
| #4 | Goals Dashboard for Coaches | Full CRUD, milestone tracking, parent visibility |
| #5 | Skill Assessment Rating Sliders | 1-5 scale, color coding, batch assessment |
| #6 | Apply Voice Note Insights | Routes to injuries, goals, notes |
| #7 | Parent Dashboard Enhancement | Children cards, coach feedback, goals view |
| #8 | Medical Profiles Dashboard | Allergies, medications, emergency contacts |
| #9 | Emergency Contacts (Adults) | ICE designation, priority ordering |
| #25 | Adult Player Workflow | Full setup, teams, passport, dashboard |
| #23 | Remove Legacy Tables | Identity system migration complete |

### MEDIUM Priority - Done
| Issue | Feature | Notes |
|-------|---------|-------|
| #10 | PDF Generation and Sharing | Passport export, email/WhatsApp share |
| #11 | Analytics Dashboard | Skill distribution, team comparison charts |
| #12 | Team Roster Management | Team CRUD, player assignment, roster display (Admin page) |

---

## 🔄 IN PROGRESS

| Issue | Feature | Priority | Backend | UI | Notes |
|-------|---------|----------|---------|----|----|
| #26 | Adult Player Daily Wellness Check-in | MEDIUM | ⚠️ | ⚠️ | Currently being implemented |

---

## 📋 READY FOR DEVELOPMENT

| Issue | Feature | Priority | Backend | UI | Effort |
|-------|---------|----------|---------|----|----|
| - | **Coach Assignment UI in Teams** | MEDIUM | ✅ | ❌ | 1-2 days |
| - | **Transfer Players Between Teams** | MEDIUM | ✅ | ❌ | 1 day |

### Team Roster Enhancements (Post #12)
**Current State:**
- ✅ Backend: `teamPlayerIdentities.ts` with full CRUD
- ✅ Backend: `teams.ts` with getTeamsByOrganization, create/update/delete  
- ✅ UI: `/orgs/[orgId]/admin/teams` page with full functionality
- ✅ Team CRUD (create, edit, delete)
- ✅ Player assignment with tap-to-toggle UI
- ✅ Roster display in expanded team view
- ✅ Search/filter by sport, age group, team name
- ✅ Age eligibility validation (backend with overrides)

**Remaining Enhancements:**
1. ❌ Drag-and-drop player assignment (optional - tap-to-toggle works well)
2. ❌ Coach assignment interface on team form (backend ready via `coachAssignments.ts`)
3. ❌ Direct transfer UI between teams (currently add/remove separately)

---

## 📝 BACKLOG - MEDIUM Priority

| Issue | Feature | Backend | UI | Notes |
|-------|---------|---------|----|----|
| #13 | Guardian Profile Management | ✅ `orgGuardianProfiles.ts` | ❌ | Communication prefs, notifications |
| #14 | Guardian Self-Service Registration | ✅ `guardianIdentities.ts` | ❌ | Child linking, verification flow |
| #15 | Voice Notes UX Enhancements | ✅ Core works | ⚠️ | Bulk actions, edit before apply, search/filter |

### #13 - Guardian Profile Management
- Profile page with personal info
- Communication preferences
- Notification settings  
- Emergency priority ordering
- Linked children view

### #14 - Guardian Self-Service Registration  
- Self-registration flow
- Child search and linking
- Verification methods (email code, admin approval, club code)
- Multiple guardian support

### #15 - Voice Notes UX Enhancements
- Apply All / Reject All buttons
- Edit insight before applying (modal)
- Real-time transcription display
- Search and filter notes (by type, date, player, status)
- Export to CSV

---

## 📝 BACKLOG - LOW Priority

| Issue | Feature | Backend | UI | Notes |
|-------|---------|---------|----|----|
| #16 | Reference Data Management | ✅ `referenceData.ts` | ❌ | Admin: sports, age groups, skills |
| #17 | Parent Notification System | ❌ | ❌ | Injury alerts, coach feedback, goals |
| #18 | Team Briefing Generator | ❌ | ❌ | Weekly AI summary from voice notes |
| #19 | Multi-Sport Passport Views | ⚠️ | ❌ | Sport switcher, cross-sport comparison |
| #20 | Audit Logging System | ❌ | ❌ | Action tracking, admin dashboard |
| #21 | Schedule and Calendar System | ❌ | ❌ | Training, matches, parent view, iCal |

---

## 📝 BACKLOG - Needs Clarification

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| #22 | Milestone Tracking | Backlog | Currently free-form field - needs spec |
| #24 | Legacy Tables Removed | Backlog | Migration docs provided |
| #27 | Boys/Girls vs Male/Female | Backlog | Data consistency review needed |
| #28 | Parent vs Guardian Clarification | Backlog | UI terminology standardization |
| #29 | Skill Radar Charts (Parent) | Backlog | Enhancement to parent dashboard |

---

## Non-GitHub Tracked Items

### Identified from Code Review

| Category | Item | Status | Notes |
|----------|------|--------|-------|
| **Teams** | Teams page route | ✅ Complete | `/orgs/[orgId]/admin/teams` exists with full CRUD |
| **Import** | Bulk player re-import | ⚠️ Partial | Works but needs validation improvements |
| **Auth** | Role-based nav refinement | ⚠️ Partial | Some role checks may be inconsistent |
| **Mobile** | PWA optimization | ❌ Not started | Voice notes on mobile |

---

## Feature Dependencies

```
Team Roster Management (#12)
└── Required for: Team Briefing Generator (#18)
└── Required for: Schedule and Calendar (#21)

Guardian Self-Service (#14)
└── Required for: Parent Notification System (#17)

Voice Notes UX (#15)  
└── Enhances: Team Briefing Generator (#18)
```

---

## Recommended Next Sprint

Based on dependencies and business value:

1. **Coach Assignment UI in Teams** - Backend ready, add to existing teams page
2. **Voice Notes UX Enhancements (#15)** - High coach value  
3. **Guardian Profile Management (#13)** - Parent experience
4. **Transfer Players Between Teams** - Backend ready, simple UI addition

---

## Technical Debt Notes

1. **Gender Values**: Migration from Boys/Girls to Male/Female partially done (#27)
2. **Parent vs Guardian**: Terminology inconsistent in UI (#28)
3. **Legacy Tables**: Removed but migration may be incomplete (#24)

---

## MVP Parity Status

| MVP Feature | Current App Status |
|------------|-------------------|
| Player CSV upload | ✅ Complete with GAA wizard |
| Player passport browser | ✅ Complete |
| Voice note recording | ✅ Complete |
| AI transcription | ✅ Complete |
| Insight application | ✅ Complete |
| Team management | ✅ Complete (Admin Teams page) |
| Goals dashboard | ✅ Complete |
| Medical profiles | ✅ Complete |
| Parent dashboard | ✅ Complete |
| Skill assessments | ✅ Complete |
| PDF export | ✅ Complete |
| Analytics | ✅ Complete |
