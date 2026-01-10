# Coach Dashboard Mobile Specification

**Based on:** Mobile Quick Actions Research 2025
**Target:** PlayerARC/PDP Coach Mobile Dashboard
**Date:** January 10, 2026

---

## Visual Layout

```
┌─────────────────────────────────────────┐
│  ☰  Coach Dashboard        👤  ⚙️       │  ← Top Bar (org name, team switcher)
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┬──────────┬──────────┐   │
│  │  ✓       │  🎤      │  👥      │   │
│  │  Take    │  Record  │  View    │   │
│  │  Attend. │  Voice   │  Roster  │   │  ← Row 1 (Primary Actions)
│  │          │  Note    │          │   │
│  └──────────┴──────────┴──────────┘   │
│                                         │
│  ┌──────────┬──────────┬──────────┐   │
│  │  ❤️‍🩹     │  🎯      │  📅      │   │
│  │  Track   │  Set     │  Match   │   │
│  │  Injury  │  Goal    │  Day     │   │  ← Row 2 (Secondary Actions)
│  │          │          │  Prep    │   │
│  └──────────┴──────────┴──────────┘   │
│                                         │
│  ┌──────────┬──────────┬──────────┐   │
│  │  📋      │  🏥      │  ⋮        │   │
│  │  Player  │  Medical │  More    │   │
│  │  Assess. │  Info    │  Actions │   │  ← Row 3 (Tertiary + Overflow)
│  │          │          │          │   │
│  └──────────┴──────────┴──────────┘   │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  📊  Recent Activity            │  │
│  │  ─────────────────────────────  │  │  ← Content Section
│  │  • Practice attendance: 18/22   │  │    (below grid, scrollable)
│  │  • Voice note: U12 training     │  │
│  │  • New injury: John Smith       │  │
│  └─────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  🏠      👥       📅       👤          │  ← Bottom Navigation
│  Home   Players  Calendar  Profile     │
└─────────────────────────────────────────┘
```

---

## Technical Specifications

### Grid Layout
- **Structure:** 3 columns × 3 rows
- **Total visible actions:** 9 (8 primary + 1 overflow)
- **Responsive:** Adapts to 2 columns on small screens (<375px)

### Card Dimensions
```
Card Size: 110px height × ~32% width (responsive)
├─ Icon: 32px × 32px (org-primary color)
├─ Label: 14px font, semibold, 2 lines max
├─ Padding: 16px vertical, 12px horizontal
└─ Touch Target: 48px minimum (Android standard)
```

### Spacing
- **Grid Margins:** 16px (left/right/top)
- **Card Gutters:** 12px (between cards)
- **Bottom Nav Height:** 64px
- **Top Bar Height:** 56px

### Colors
- **Card Background:** White (`#FFFFFF`) or org-tertiary tint
- **Card Shadow:** `0 1px 3px rgba(0,0,0,0.12)`
- **Icon Color:** `var(--org-primary)` (organization theming)
- **Label Color:** `#1F2937` (neutral-800)
- **Active State:** Scale 1.05x + deeper shadow

---

## Action Grid Definition

### Row 1: Primary Actions (Highest Frequency)
| Position | Action | Icon | Priority | Use Case |
|----------|--------|------|----------|----------|
| 1,1 | Take Attendance | ✓ check-square | High | Daily practice/game attendance |
| 1,2 | Record Voice Note | 🎤 mic | High | Quick observations, post-practice notes |
| 1,3 | View Roster | 👥 users | High | See team list, contact parents |

### Row 2: Secondary Actions (Frequent)
| Position | Action | Icon | Priority | Use Case |
|----------|--------|------|----------|----------|
| 2,1 | Track Injury | ❤️‍🩹 heart-pulse | Medium | Log injury, update return-to-play |
| 2,2 | Set Development Goal | 🎯 target | Medium | Set player goals, milestones |
| 2,3 | Match Day Prep | 📅 calendar-check | Medium | Pre-game checklist, lineup |

### Row 3: Tertiary Actions + Overflow
| Position | Action | Icon | Priority | Use Case |
|----------|--------|------|----------|----------|
| 3,1 | Player Assessments | 📋 clipboard-check | Medium | View/create player assessments |
| 3,2 | Medical Info | 🏥 first-aid | Low | Emergency contacts, allergies |
| 3,3 | More Actions | ⋮ grid-3x3 | — | Opens bottom sheet with Tier 2 actions |

---

## Bottom Sheet (Tier 2 Actions)

When "More Actions" is tapped, a bottom sheet slides up with additional actions:

```
┌─────────────────────────────────────────┐
│  ━━━  (Drag handle)                     │
│                                         │
│  More Actions                           │
│                                         │
│  ⚙️  Team Settings                      │
│  📊  Export Reports                     │
│  📨  Message Parents                    │
│  📈  View Past Assessments              │
│  🕐  Training Schedule                  │
│  📁  Manage Files                       │
│                                         │
└─────────────────────────────────────────┘
```

**Tier 2 Actions (6 additional):**
1. Team Settings
2. Export Reports
3. Message Parents
4. View Past Assessments
5. Training Schedule
6. Manage Files

---

## Bottom Navigation

4 primary sections accessible app-wide:

| Icon | Label | Route | Purpose |
|------|-------|-------|---------|
| 🏠 Home | Dashboard | `/orgs/[orgId]/coach` | Quick actions + recent activity |
| 👥 Users | Players | `/orgs/[orgId]/coach/players` | Full player list, search, filter |
| 📅 Calendar | Calendar | `/orgs/[orgId]/coach/calendar` | Schedule, upcoming events |
| 👤 User | Profile | `/orgs/[orgId]/coach/profile` | Settings, notifications, help |

---

## Responsive Breakpoints

### Small Phone (<375px width)
```
2 columns × 4 rows + scroll
┌──────────┬──────────┐
│  Take    │  Record  │
│  Attend. │  Voice   │
├──────────┼──────────┤
│  View    │  Track   │
│  Roster  │  Injury  │
├──────────┼──────────┤
│  Set     │  Match   │
│  Goal    │  Day     │
├──────────┼──────────┤
│  Player  │  Medical │
│  Assess. │  Info    │
└──────────┴──────────┘
     ↓ Scroll for "More"
```

### Standard Phone (375px - 428px)
```
3 columns × 3 rows (recommended)
See main layout above
```

### Large Phone/Small Tablet (>428px)
```
4 columns × 2 rows
┌────────┬────────┬────────┬────────┐
│ Take   │ Record │ View   │ Track  │
│ Attend.│ Voice  │ Roster │ Injury │
├────────┼────────┼────────┼────────┤
│ Set    │ Match  │ Player │ Medical│
│ Goal   │ Day    │ Assess.│ Info   │
└────────┴────────┴────────┴────────┘
```

---

## Contextual Intelligence

### Schedule-Based Action Highlighting

**30 minutes before practice:**
```
┌──────────────────────────────────────┐
│  ✓ Take Attendance  ← Highlighted    │
│  (Practice starts in 25 min)         │
└──────────────────────────────────────┘
```

**Game Day (3 hours before):**
```
┌──────────────────────────────────────┐
│  📅 Match Day Prep  ← Highlighted    │
│  (U12 vs Rivals FC at 2:00 PM)       │
└──────────────────────────────────────┘
```

**Post-Practice (within 1 hour):**
```
┌──────────────────────────────────────┐
│  🎤 Record Voice Note  ← Highlighted │
│  (Capture today's observations)      │
└──────────────────────────────────────┘
```

### Smart Notifications

- **Badge on "Medical Info"** if player has active injury
- **Badge on "Players"** if pending parent messages
- **Badge on "More Actions"** if unread announcements

---

## Mobile Optimizations

### Offline Support
**Cached Data:**
- Team roster (names, jersey numbers, positions)
- Upcoming 7 days of schedule
- Last 10 voice notes

**Queued Actions:**
- Attendance records
- Voice note recordings
- Injury updates
- Development goal changes

**Sync Indicator:**
```
┌─────────────────────────────────────┐
│  ⟳  Syncing 3 pending actions...   │
└─────────────────────────────────────┘
```

### Voice-First Features
- **Large mic button** for voice notes (32px icon)
- **Voice-to-text** for attendance notes ("John Smith absent - flu")
- **Siri Shortcuts:**
  - "Mark attendance for U12 practice"
  - "Record coach note for Emma Jones"
  - "Show injured players"

### Quick Capture Widgets

**iOS Home Screen Widget (Small):**
```
┌─────────────┐
│  PlayerARC  │
│  ─────────  │
│  🎤 Voice   │
│  ✓ Attend.  │
│  👥 Roster  │
└─────────────┘
```

**iOS Lock Screen Widget:**
```
┌─────────────┐
│  🎤 Quick   │
│     Note    │
└─────────────┘
(Tap to record voice note)
```

---

## Interaction States

### Card States
1. **Default:**
   - White background
   - `shadow-sm` (subtle)
   - Icon in `--org-primary`

2. **Tap (Active):**
   - Scale to 105%
   - `shadow-md` (deeper)
   - Haptic feedback (iOS)
   - 150ms transition

3. **Disabled:**
   - Opacity 50%
   - Icon grayscale
   - No tap feedback

4. **Loading:**
   - Spinner overlay
   - Disabled state
   - Progress indicator if needed

### Microinteractions
- **Card tap:** 150ms scale + shadow animation
- **Bottom sheet:** Slide up 300ms ease-out
- **Badge appear:** Bounce animation 200ms
- **Offline indicator:** Fade in 200ms

---

## Accessibility

### Screen Reader Support
- Each action has descriptive label: "Take attendance for current team"
- Bottom nav labeled: "Dashboard, Players, Calendar, Profile"
- Bottom sheet: "More actions menu"

### Keyboard Navigation
- Tab order: Top-left to bottom-right, then bottom nav
- Enter/Space activates card
- Escape closes bottom sheet

### Color Contrast
- WCAG AA compliance (4.5:1 minimum)
- Icon color tested against background
- Active state has sufficient contrast

### Touch Targets
- Minimum 48px (Android) / 44pt (iOS)
- Spacing between targets >8px

---

## Performance Targets

### Loading
- **Initial render:** <200ms (skeleton screen)
- **Data fetch:** <500ms (cached roster)
- **Navigation:** <100ms (instant feedback)

### Interactions
- **Card tap feedback:** <16ms (60fps)
- **Bottom sheet animation:** 300ms (smooth 60fps)
- **Scroll performance:** 60fps maintained

### Network
- **Offline-first:** All actions work offline
- **Sync:** Background sync every 30s when online
- **Error handling:** Retry failed syncs 3x with exponential backoff

---

## Implementation Phases

### Phase 1: Core Grid (Week 1-2)
```typescript
// apps/web/src/app/orgs/[orgId]/coach/components/quick-actions-grid.tsx

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: number;
  disabled?: boolean;
}

const actions: QuickAction[] = [
  { id: 'attendance', label: 'Take Attendance', icon: CheckSquare, href: '/attendance' },
  { id: 'voice-note', label: 'Record Voice Note', icon: Mic, onClick: openVoiceRecorder },
  // ... 7 more actions
];
```

**Components to create:**
- `<QuickActionsGrid>` - Main grid container
- `<ActionCard>` - Individual action card
- `<BottomSheet>` - Tier 2 actions sheet
- `<BottomNav>` - App-wide navigation

### Phase 2: Actions Integration (Week 3-4)
- Hook up 8 primary actions to existing routes/modals
- Implement bottom sheet with Tier 2 actions
- Add loading states and error handling

### Phase 3: Mobile Optimizations (Week 5-6)
- Offline support (IndexedDB cache + sync queue)
- Home screen widget (iOS/Android)
- Contextual intelligence (highlight based on schedule)
- Team switcher for multi-team coaches

### Phase 4: Polish (Week 7-8)
- A/B test layouts (3x3 vs 4x2 vs 2x4)
- Microinteractions (scale, shadow, haptics)
- Org theming integration
- Onboarding tour (first-time user flow)

---

## Success Metrics

### Engagement
- [ ] 60% of coaches use mobile dashboard daily
- [ ] 3-5 actions per session (target average)
- [ ] <30s time-to-complete common tasks

### Top Actions (Expected)
1. Take Attendance (35-40% of actions)
2. Record Voice Note (20-25%)
3. View Roster (15-20%)
4. Track Injury (5-10%)
5. Set Development Goal (5-10%)

### Performance
- [ ] <2s page load time (p50)
- [ ] 95%+ offline success rate for cached actions
- [ ] 10%+ widget adoption (coaches using home screen widget)

### Satisfaction
- [ ] NPS >40 for mobile experience
- [ ] <5% support tickets related to mobile discoverability
- [ ] User feedback: "Easy to find actions" >4.0/5.0

---

## A/B Test Variations

### Variation A: 3×3 Grid (Recommended)
- Default layout as specified above
- 9 visible actions (8 primary + 1 overflow)

### Variation B: 4×2 Grid
- 8 visible actions (no overflow card)
- "More Actions" accessible via hamburger menu in top bar
- Test if users discover overflow menu less

### Variation C: 2×4 Grid (Small Screens)
- Narrower cards, 4 rows visible
- Less scrolling required for content below grid
- Test on small phones (<375px)

### Variation D: FAB + Swipe (Power Users)
- Remove grid entirely
- FAB for "Record Voice Note" (most frequent)
- Swipe gestures on player cards for actions
- Test with coaches using app 10+ times/day

**Decision Criteria:**
- After 4 weeks with 100+ coaches on each variation
- Measure: Actions per session, time-to-action, NPS
- If Variation A performs <10% better on all metrics, keep default
- If Variation D shows >20% better engagement with power users, consider hybrid approach

---

## Component Code Sketch

```typescript
// apps/web/src/app/orgs/[orgId]/coach/components/quick-actions-grid.tsx

import { CheckSquare, Mic, Users, HeartPulse, Target, CalendarCheck, ClipboardCheck, FirstAid, MoreHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface ActionCardProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  badge?: number;
  highlighted?: boolean;
}

function ActionCard({ icon: Icon, label, onClick, badge, highlighted }: ActionCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center p-4 cursor-pointer",
        "transition-all duration-150 active:scale-105 active:shadow-md",
        highlighted && "ring-2 ring-org-primary shadow-md"
      )}
      onClick={onClick}
    >
      <div className="relative">
        <Icon className="w-8 h-8 text-org-primary" />
        {badge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="mt-2 text-sm font-semibold text-center line-clamp-2">
        {label}
      </span>
    </Card>
  );
}

export function QuickActionsGrid({ orgId, teamId }: { orgId: string; teamId?: string }) {
  const router = useRouter();
  const [showMoreActions, setShowMoreActions] = useState(false);

  const actions = [
    { icon: CheckSquare, label: 'Take Attendance', onClick: () => router.push(`/orgs/${orgId}/coach/attendance`) },
    { icon: Mic, label: 'Record Voice Note', onClick: () => openVoiceRecorder() },
    { icon: Users, label: 'View Roster', onClick: () => router.push(`/orgs/${orgId}/coach/players`) },
    { icon: HeartPulse, label: 'Track Injury', onClick: () => router.push(`/orgs/${orgId}/coach/injuries`) },
    { icon: Target, label: 'Set Development Goal', onClick: () => router.push(`/orgs/${orgId}/coach/goals`) },
    { icon: CalendarCheck, label: 'Match Day Prep', onClick: () => router.push(`/orgs/${orgId}/coach/match-day`) },
    { icon: ClipboardCheck, label: 'Player Assessments', onClick: () => router.push(`/orgs/${orgId}/coach/assess`) },
    { icon: FirstAid, label: 'Medical Info', onClick: () => router.push(`/orgs/${orgId}/coach/medical`) },
    { icon: MoreHorizontal, label: 'More Actions', onClick: () => setShowMoreActions(true) },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3 p-4">
        {actions.map((action, idx) => (
          <ActionCard key={idx} {...action} />
        ))}
      </div>

      <BottomSheet open={showMoreActions} onClose={() => setShowMoreActions(false)}>
        {/* Tier 2 actions */}
      </BottomSheet>
    </>
  );
}
```

---

## Design Tokens

```css
/* apps/web/src/app/globals.css */

/* Quick Action Grid */
--quick-action-card-height: 110px;
--quick-action-icon-size: 32px;
--quick-action-label-size: 14px;
--quick-action-grid-gap: 12px;
--quick-action-grid-margin: 16px;

/* Touch Targets */
--touch-target-min: 48px;

/* Animation Timings */
--animation-tap-feedback: 150ms;
--animation-bottom-sheet: 300ms;
--animation-badge-bounce: 200ms;

/* Responsive Breakpoints */
--breakpoint-small-phone: 375px;
--breakpoint-large-phone: 428px;
```

---

## Testing Checklist

### Unit Tests
- [ ] `QuickActionsGrid` renders 9 cards
- [ ] Clicking card triggers correct navigation
- [ ] Badge displays when count > 0
- [ ] Disabled state prevents interaction

### Integration Tests
- [ ] Bottom sheet opens on "More Actions" tap
- [ ] Bottom nav navigates to correct routes
- [ ] Offline queue stores actions correctly
- [ ] Sync resumes when connection restored

### Manual Testing (Device)
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 15 Pro (standard)
- [ ] Test on iPad Mini (tablet)
- [ ] Test on Pixel 6 (Android)
- [ ] Test offline mode (airplane mode)
- [ ] Test widget on home screen
- [ ] Test Siri Shortcuts integration

### Accessibility Testing
- [ ] VoiceOver (iOS) announces all actions
- [ ] TalkBack (Android) navigation works
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets meet 48px minimum
- [ ] Keyboard navigation (tab order correct)

---

## Related Documentation

- **Full Research:** [mobile-quick-actions-research-2025.md](./mobile-quick-actions-research-2025.md)
- **Summary:** [mobile-quick-actions-summary.md](./mobile-quick-actions-summary.md)
- **Project Context:** [../CLAUDE.md](../../CLAUDE.md)

---

**Spec Version:** 1.0
**Last Updated:** January 10, 2026
**Status:** Ready for implementation
