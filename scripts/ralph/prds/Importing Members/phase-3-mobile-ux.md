# Phase 3: Mobile UX & Conflict Resolution

**Timeline**: Weeks 9-12
**Status**: Pending Phase 2 Completion
**Dependencies**: Phase 1, Phase 2

---

## Objectives

1. Mobile-responsive import wizard (iOS Safari, Chrome Android)
2. Enhanced conflict resolution with visual confidence indicators
3. Partial undo (selective record removal)
4. Import analytics dashboard for platform staff

---

## Success Criteria

- [ ] Import wizard fully functional on mobile (iPhone, iPad, Android)
- [ ] Touch targets meet Apple HIG guidelines (44x44px minimum)
- [ ] Swipe gestures work for conflict navigation
- [ ] Confidence indicators clear at-a-glance (🟢🟡🔴)
- [ ] Partial undo removes selected records only
- [ ] Import analytics dashboard shows real-time data
- [ ] Mobile performance: wizard loads <2s on 3G

---

## Features

### 1. Mobile Responsive Design

**Breakpoints**:
- 320px: Mobile (iPhone SE)
- 768px: Tablet Portrait (iPad)
- 1024px: Tablet Landscape
- 1280px+: Desktop

**Touch Optimization**:
- 44x44px minimum touch targets (Apple HIG)
- 8px spacing between interactive elements
- Swipe gestures for navigation
- No hover-only features

**PWA Capabilities**:
- Offline file viewing
- Install prompt
- App-like experience

**WCAG 2.2 AA Compliance**:
- Color contrast ratio 4.5:1
- Screen reader support
- Keyboard navigation

### 2. Visual Confidence Indicators

**Color-Coded Levels**:
- 🟢 High (60+): Auto-link, green progress bar
- 🟡 Medium (40-59): Review required, yellow progress bar
- 🔴 Low (<40): Skip, red progress bar

**Match Score Breakdown**:
- Show which signals contributed points
- Explain why score is high/medium/low
- Link to help article on algorithm

**Admin Override Controls**:
- Force link even with low confidence
- Reject high confidence match
- All overrides logged in audit trail

### 3. Partial Undo

**Selective Record Removal**:
- Search/filter player list
- Select specific players to remove
- Impact preview per player
- Atomic removal transaction

---

## Frontend Implementation

### Files to Create

#### 1. Mobile-Specific Components

**/apps/web/src/components/import/mobile/MobileImportWizard.tsx** (~300 lines)
- Single column layout
- Accordion-style steps
- Fixed header with mini progress
- Large touch targets

**/apps/web/src/components/import/mobile/MobileMappingStep.tsx** (~200 lines)
- One column at a time
- Full-screen dropdowns
- Swipe to navigate

**/apps/web/src/components/import/mobile/MobileConflictResolution.tsx** (~250 lines)
- Full-screen modal per conflict
- Swipe left/right to navigate
- Sticky action buttons

#### 2. Enhanced Conflict Resolution

**/apps/web/src/components/import/EnhancedDuplicateResolution.tsx** (~400 lines)
- Visual confidence indicators
- Match score breakdown
- Search/filter by confidence level
- Bulk actions by confidence tier

#### 3. Partial Undo

**/apps/web/src/components/import/PartialUndoDialog.tsx** (~300 lines)
- Select players to remove
- Search/filter list
- Impact preview
- Confirmation step

#### 4. Analytics Dashboard

**/apps/web/src/app/platform-admin/import-analytics/page.tsx** (~400 lines)
- Cross-org import metrics
- Success rate tracking
- Common error patterns
- Template usage statistics

---

## Backend Implementation

### Files to Create

**/packages/backend/convex/models/importAnalytics.ts** (~200 lines)

**Queries**:
```typescript
export const getOrgImportHistory = query({...})
export const getImportAnalytics = query({...})
export const getTemplateUsageStats = query({...})
export const getCommonErrors = query({...})
```

---

## Ralph Integration

### Parallel Work Streams

#### Stream 1: Mobile UX (2 weeks)
- Agent 1: Mobile wizard shell
- Agent 2: Mobile mapping UI
- Agent 3: Mobile conflict resolution
- Agent 4: Touch optimization & gestures

#### Stream 2: Visual Enhancements (1.5 weeks)
- Agent 5: Confidence indicators
- Agent 6: Match signal display
- Agent 7: Enhanced duplicate cards

#### Stream 3: Partial Undo (1 week)
- Agent 8: Backend selective removal
- Agent 9: Frontend selection UI
- Agent 10: Impact preview

#### Stream 4: Analytics (1.5 weeks)
- Agent 11: Backend analytics queries
- Agent 12: Platform dashboard
- Agent 13: Org history page

---

**Previous Phase**: [Phase 2: Enhanced UX](./phase-2-enhanced-ux.md)
**Next Phase**: [Phase 4: Federation Connectors](./phase-4-federation-connectors.md)
