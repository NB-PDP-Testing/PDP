# Feature Comparison: MVP vs Current PDP System

## Executive Summary

This document provides a comprehensive comparison between the **MVP Application** (mvp-app submodule using Clerk auth) and the **Current PDP System** (main monorepo using Better Auth). The goal is to identify which features need to be built/wired in the current system.

---

## Architecture Comparison

| Aspect | MVP App | Current System |
|--------|---------|----------------|
| **Authentication** | Clerk | Better Auth |
| **Database** | Convex | Convex |
| **Frontend** | React/Vite (Single Page) | Next.js (Multi-page App) |
| **Organization Support** | Single club (hardcoded Grange) | Multi-org platform |
| **User Roles** | Role field in users table | Better Auth hierarchy + functional roles |
| **Deployment** | Cloudflare Pages | Vercel |

---

## Schema Comparison

### Users/Identity System

| Feature | MVP Schema | Current Schema | Status |
|---------|------------|----------------|--------|
| User authentication | `users.clerkId` | Better Auth (external) | ✅ Different approach |
| Multiple roles | `users.roles[]` | orgJoinRequests + functional roles | ✅ Implemented differently |
| Active role switching | `users.activeRole` | Via session/context | ⚠️ Needs UI |
| Approval workflow | `users.approvalStatus` | `orgJoinRequests.status` | ✅ Different table |
| Pending role requests | `users.pendingRoleRequests[]` | `orgJoinRequests` table | ✅ Different structure |

### Players

| Feature | MVP Schema | Current Schema | Status |
|---------|------------|----------------|--------|
| Basic player info | `players` table | `players` table | ✅ Compatible |
| Skills as JSON string | `players.skills: v.string()` | `players.skills: v.record()` | ⚠️ Different format |
| Organization scoping | None (single club) | `players.organizationId` | ✅ Enhanced |
| Parent/Guardian links | Embedded in player | `guardianIdentities` + `guardianPlayerLinks` | ✅ Enhanced (new identity system) |
| Inferred parent matching | `inferredParent*` fields | Same fields | ✅ Compatible |
| Platform identity | None | `playerIdentities` table | ✅ New feature |

### Teams

| Feature | MVP Schema | Current Schema | Status |
|---------|------------|----------------|--------|
| Teams table | `teams` table | Better Auth teams | ⚠️ Different approach |
| Team membership | `teams.playerIds[]` | `teamPlayers` join table | ✅ More flexible |
| Coach assignments | `teams.headCoachId/assistantCoachIds` | `coachAssignments` table | ✅ More flexible |

### Injuries

| Feature | MVP Schema | Current Schema | Status |
|---------|------------|----------------|--------|
| Player injuries | `injuries` table | `injuries` + `playerInjuries` | ✅ Enhanced |
| Cross-org visibility | N/A | `playerInjuries.isVisibleToAllOrgs` | ✅ New feature |
| Org-specific notes | Embedded | `orgInjuryNotes` table | ✅ Enhanced |

### Development Goals

| Feature | MVP Schema | Current Schema | Status |
|---------|------------|----------------|--------|
| Individual goals | `developmentGoals` table | `developmentGoals` + `passportGoals` | ✅ Enhanced |
| Team goals | `teamGoals` table | `teamGoals` table | ✅ Compatible |
| Sport passport goals | None | `passportGoals` table | ✅ New feature |

### Voice Notes

| Feature | MVP Schema | Current Schema | Status |
|---------|------------|----------------|--------|
| Voice notes | `voiceNotes` table | `voiceNotes` table | ⚠️ Schema differences |
| Audio storage | `audioFileId` | `audioStorageId` | ⚠️ Field name change |
| AI insights | `insights[]` embedded | `insights[]` embedded | ✅ Similar structure |
| Transcription | `transcription` field | `transcription` + status fields | ✅ Enhanced |

### Medical Profiles

| Feature | MVP Schema | Current Schema | Status |
|---------|------------|----------------|--------|
| Medical profiles | `medicalProfiles` table | `medicalProfiles` table | ✅ Compatible |

### Skills/Benchmarks

| Feature | MVP Schema | Current Schema | Status |
|---------|------------|----------------|--------|
| Skill definitions | None (hardcoded) | `skillDefinitions` table | ✅ New feature |
| Skill categories | None (hardcoded) | `skillCategories` table | ✅ New feature |
| Benchmarks | None | `skillBenchmarks` table | ✅ New feature |
| Skill assessments | Embedded in player | `skillAssessments` table | ✅ Enhanced |

---

## UI Features Comparison

### Dashboard Views

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Coach Smart Dashboard | ✅ `SmartCoachDashboard` | ⚠️ Component exists but not wired | 🔧 NEEDS WIRING |
| Parent Insights Dashboard | ✅ `ParentInsightsDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Admin Summary Dashboard | ✅ `AdminSummaryDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Role Switcher | ✅ `RoleSwitcher` component | ⚠️ `org-role-switcher` exists | 🔧 NEEDS WIRING |

### Player Management

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Player list with filters | ✅ In `Dashboard` | ✅ In orgs routes | ✅ Implemented |
| Player view/passport | ✅ `ViewPlayer` | ⚠️ Partial | 🔧 NEEDS ENHANCEMENT |
| Player edit | ✅ `EditPlayer` | ⚠️ Partial | 🔧 NEEDS ENHANCEMENT |
| Skill rating sliders | ✅ `RatingSlider` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Template selector | ✅ `TemplateSelector` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Bulk import | ✅ `BulkImportModal` | ⚠️ `gaa-import.tsx` exists | 🔧 NEEDS WIRING |
| GAA Membership Wizard | ✅ `GAAMembershipWizard` | ⚠️ `gaa-import.tsx` component | 🔧 NEEDS WIRING |

### Injury Management

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Injuries Dashboard | ✅ `InjuriesDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Return-to-play protocol | ✅ In MVP | ❌ Not implemented | 🔨 NEEDS BUILDING |

### Goals Management

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Goals Dashboard | ✅ `GoalsDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Milestone tracking | ✅ In MVP | ❌ Not implemented | 🔨 NEEDS BUILDING |

### Medical Profiles

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Medical Profiles Dashboard | ✅ `MedicalProfilesDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |

### Voice Notes

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Voice Notes Dashboard | ✅ `VoiceNotesDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Audio recording | ✅ In MVP | ❌ Not implemented | 🔨 NEEDS BUILDING |
| AI insight extraction | ✅ In MVP | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Apply/dismiss insights | ✅ In MVP | ❌ Not implemented | 🔨 NEEDS BUILDING |

### Team Management

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Manage Teams Dashboard | ✅ `ManageTeamsDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Multi-team player support | ✅ In MVP | ✅ teamPlayers table | 🔧 NEEDS UI |

### User/Coach Management

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| User Approval Dashboard | ✅ `UserApprovalDashboard` | ⚠️ Join requests exist | 🔧 NEEDS UI |
| Manage Coaches Dashboard | ✅ `ManageCoachesDashboard` | ⚠️ coachAssignments exists | 🔧 NEEDS UI |
| Manage Users Dashboard | ✅ `ManageUsersDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |

### Analytics

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Team Analytics | ✅ `AnalyticsDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Benchmark comparison | ⚠️ Partial | ✅ `benchmark-comparison.tsx` | 🔧 NEEDS WIRING |

### PDF/Sharing

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| PDF Generation | ✅ `pdfGenerator.ts` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Share Modal | ✅ `ShareModal` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Email sharing | ✅ In MVP | ❌ Not implemented | 🔨 NEEDS BUILDING |
| WhatsApp sharing | ✅ In MVP | ❌ Not implemented | 🔨 NEEDS BUILDING |

### Workflow/Review

| Feature | MVP | Current | Status |
|---------|-----|---------|--------|
| Workflow Dashboard | ✅ `WorkflowDashboard` | ❌ Not implemented | 🔨 NEEDS BUILDING |
| Review status tracking | ✅ In MVP | ⚠️ Schema exists | 🔧 NEEDS UI |
| Audit Log | ✅ `AuditLogViewer` | ❌ Not implemented | 🔨 NEEDS BUILDING |

---

## Backend Functions Comparison

### MVP Convex Functions

| Function File | Purpose | Current Equivalent | Status |
|--------------|---------|-------------------|--------|
| `players.ts` | CRUD operations | `models/players.ts` | ✅ Exists but may need updates |
| `users.ts` | User management | Better Auth + models | ⚠️ Different approach |
| `teams.ts` | Team management | Better Auth teams | ⚠️ Different approach |
| `injuries.ts` | Injury CRUD | ❌ Not found | 🔨 NEEDS BUILDING |
| `goals.ts` | Goals CRUD | ❌ Not found | 🔨 NEEDS BUILDING |
| `medicalProfiles.ts` | Medical CRUD | ❌ Not found | 🔨 NEEDS BUILDING |
| `voiceNotes.ts` | Voice notes CRUD | Partial in schema | 🔧 NEEDS COMPLETION |
| `teamGoals.ts` | Team goals CRUD | ❌ Not found | 🔨 NEEDS BUILDING |
| `coachPreferences.ts` | Coach prefs | ❌ Not found | 🔨 NEEDS BUILDING |

---

## Migration Considerations

### Skills Data Format

**MVP Format** (JSON string):
```javascript
skills: JSON.stringify({
  soloing: 3, kickingLong: 3, kickingShort: 3, ...
})
```

**Current Format** (Record):
```javascript
skills: { soloing: 3, kickingLong: 3, kickingShort: 3, ... }
```

⚠️ **Action Required**: Need to handle data transformation when migrating or ensure consistency.

### User Roles

**MVP Approach**:
- Single `users` table with embedded roles
- `activeRole` for role switching

**Current Approach**:
- Better Auth for authentication
- `orgJoinRequests` for role requests
- Functional roles stored differently

⚠️ **Action Required**: Role switching UI needs to be built using the current architecture.

---

## Priority Implementation Roadmap

### Phase 1: Critical Wiring (Using Existing Components)

1. **Wire Smart Coach Dashboard** - Component exists, needs data integration
2. **Wire GAA Import** - `gaa-import.tsx` exists, needs to connect to flows
3. **Wire Benchmark Comparison** - Component exists, needs data
4. **Complete Role Switcher** - `org-role-switcher.tsx` exists

### Phase 2: High Priority Builds

1. **Injuries Dashboard + Functions** - Complete CRUD and UI
2. **Goals Dashboard + Functions** - Complete CRUD and UI  
3. **Voice Notes System** - Recording, transcription, insights
4. **Medical Profiles Dashboard** - CRUD and UI

### Phase 3: Medium Priority Builds

1. **Parent Insights Dashboard** - AI practice plans, schedule
2. **Admin Summary Dashboard** - Club-wide overview
3. **Workflow Dashboard** - Review tracking
4. **PDF Generation + Sharing** - Export and share passports

### Phase 4: Enhancement Builds

1. **Team Management UI** - Full team CRUD
2. **Audit Logging** - Security compliance
3. **Analytics Dashboard** - Advanced insights
4. **User Management Dashboard** - Full user admin

---

## Convex Flow Testing Required

### Flows to Test (Using Current Schema)

1. **Player CRUD Flow**
   - Create player with skills record format
   - Update skills (verify record update works)
   - List players with org filtering

2. **Team Assignment Flow**
   - Assign player to team via `teamPlayers`
   - Verify multi-team support works

3. **Coach Assignment Flow**
   - Create/update `coachAssignments`
   - Filter players by coach's teams

4. **Join Request Flow**
   - Create org join request
   - Approve with functional roles
   - Verify user gets correct access

5. **Voice Notes Flow**
   - Create voice note
   - Test transcription fields
   - Add/update insights

---

## Conclusion

The current system has a **more sophisticated architecture** than the MVP, with proper multi-org support, identity separation, and benchmark capabilities. However, many **UI features from the MVP need to be built or wired**.

### Summary Stats

| Category | Count |
|----------|-------|
| Features fully implemented | ~8 |
| Features needing wiring | ~10 |
| Features needing building | ~15 |
| Schema enhancements (current > MVP) | ~8 |

The current schema is **ready for most features** - the main work is building the UI components and wiring them to the existing backend functions.
