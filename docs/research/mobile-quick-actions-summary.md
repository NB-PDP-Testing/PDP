# Mobile Quick Actions Research - Executive Summary

**Date:** January 10, 2026
**Research Scope:** Industry leader analysis for mobile dashboard quick actions (8+ actions)
**Target Context:** Coach/Admin dashboard for PlayerARC/PDP

---

## TL;DR - Recommended Approach

**Pattern:** 3x3 Grid of Action Cards + Bottom Navigation
**Why:** Low learning curve, field-side usability, matches sports platform conventions (TeamSnap, SportsEngine)

### Implementation Specs
- **Grid:** 3 columns × 3 rows = 9 visible actions
- **Card Size:** ~100-110px height (icon 32px + label 14px)
- **Spacing:** 16px margins, 12px gutters
- **Touch Target:** 48px minimum
- **Bottom Nav:** 4 tabs (Dashboard, Players, Calendar, Profile)
- **9th Card:** "More Actions" → Bottom sheet for Tier 2 actions

---

## Top 5 Industry Patterns (2025)

### 1. Bottom Nav + Dashboard Grid
**Used by:** Slack, Spotify, Netflix, Banking Apps, Sports Platforms
- 3-5 nav icons in bottom bar
- 4-8 action cards in dashboard grid
- Vertical scroll for more content

**Best for:** Multi-section apps with 8-12 actions distributed across sections

---

### 2. FAB + Bottom Sheet
**Used by:** Google Workspace, Linear, Material 3 apps
- Single FAB for primary action
- Expands to FAB Menu (3-5 related actions)
- Bottom sheet for contextual actions

**Best for:** Apps with 1 dominant action + few secondary actions

---

### 3. Customizable Dashboard + Progressive Disclosure
**Used by:** Chase, Revolut, Modern SaaS
- User selects 6-8 priority actions
- AI personalization suggests relevant actions
- "More" button for overflow

**Best for:** Power user tools with 10+ actions, diverse user needs

---

### 4. Grid of Action Cards (No Bottom Nav)
**Used by:** TeamSnap, SportsEngine, Admin Dashboards
- Full-screen 3x3 or 4x2 grid
- Each card: icon + text label
- Vertical scroll for 12+ actions

**Best for:** Admin/coach dashboards, 8-12 equally important actions, infrequent users

---

### 5. Hybrid: Bottom Nav + FAB + Swipe Gestures
**Used by:** Slack, Linear, Modern productivity apps
- Bottom nav (3-4 icons) + FAB + swipe actions
- Lightning bolt menu for shortcuts
- Multi-modal interaction

**Best for:** Productivity apps with power users, frequent actions

---

## Key Best Practices (8+ Actions)

### 1. Progressive Disclosure (3 Tiers)
- **Tier 1 (4-6):** Always visible (grid or bottom nav)
- **Tier 2 (4-6):** "More" button, bottom sheet, FAB menu
- **Tier 3 (Advanced):** Nested menus, settings, long-press

### 2. Icons + Text Labels
- ✅ Always use text labels for primary actions
- ✅ Icon-only OK for Search, Settings, Share (universal icons)
- ✅ 44pt iOS / 48pt Android minimum touch targets

### 3. Prioritize with Data
- Use analytics to identify frequent actions
- AI personalization for relevant actions per user
- Allow customization for power users

### 4. One-Handed Optimization
- Frequent actions in bottom 60% of screen (thumb zone)
- Avoid top-right for critical actions
- Swipe gestures for common actions

### 5. Consistent Platform Patterns
- Follow iOS HIG / Material Design guidelines
- Use familiar patterns (bottom nav, FAB, bottom sheets)
- Maintain consistency across app

---

## Grid vs Carousel (2025 Data)

### Grid Layouts ✅ RECOMMENDED
- Display multiple actions simultaneously
- Easy to scan without extra clicks
- Natural for mobile (vertical scrolling)
- **Use Case:** Task-focused actions, essential features

### Carousels ⚠️ USE WITH CAUTION
- First item: 40% CTR → Last item: 11% CTR
- Best for optional content (announcements, onboarding)
- Vertical scroll > horizontal swipe on mobile
- **Verdict:** NOT recommended for primary quick actions

---

## FAB vs Bottom Sheet

### FAB (Floating Action Button)
**Material 3 Expressive (2025):** FAB Menu bridges gap - expands to multiple actions
- **When to use:** 1 primary action consistently important
- **Max:** 1 per screen (avoid clutter)
- **Placement:** Bottom-right (right-handed), but conflicts with thumb zone

### Bottom Sheet
**Engagement:** 25-30% higher than modals (less intrusive, easier to dismiss)
- **When to use:** Multiple contextual actions without disrupting flow
- **Best for:** Quick interactions (not complex content)
- **Advantage:** Thumb-friendly, page-in-page experience

---

## Coach Dashboard Specific Recommendations

### Why Grid Pattern for Coaches?

1. **Low Learning Curve:** Coaches of all tech levels understand grid immediately
2. **Field-Side Usability:** Large targets, clear labels reduce errors
3. **Discoverability:** All actions visible (no hidden gestures)
4. **Offline-First:** Grid can show cached actions
5. **Scalable:** Easy to add/remove actions per sport/season
6. **Familiar:** Matches TeamSnap, SportsEngine (user expectations)

### Dashboard Grid (9 Actions)

1. Take Attendance
2. Record Voice Note
3. View Roster
4. Track Injury
5. Set Development Goal
6. Match Day Prep
7. Player Assessments
8. Medical Info
9. More Actions → Bottom sheet

### Mobile Optimizations

**Voice-First:**
- Large "Record Voice Note" button
- Voice-to-text for attendance notes
- Siri Shortcuts ("Mark attendance for U12")

**Offline Support:**
- Cache roster, schedule, recent notes
- Queue actions for sync when online
- Visual indicator for offline mode

**Contextual Intelligence:**
- Show "Take Attendance" 30 min before practice
- Suggest "Match Day Prep" on game days
- Highlight injured players in roster

**Quick Capture Widgets:**
- Home screen widget for quick attendance
- Lock screen widget for voice notes
- iOS Shortcuts integration

---

## Implementation Phases

### Phase 1: Core Grid (Week 1-2)
- 3x3 grid component (responsive)
- Action cards (icon + label)
- Bottom navigation (4 tabs)
- "More Actions" bottom sheet

### Phase 2: Quick Actions (Week 3-4)
- 8 primary actions integrated
- Bottom sheet Tier 2 actions
- Convex queries/mutations

### Phase 3: Mobile Optimizations (Week 5-6)
- Offline support + queue sync
- Home screen widget (iOS/Android)
- Contextual intelligence (schedule-based)
- Team switcher (multi-team coaches)

### Phase 4: Polish (Week 7-8)
- A/B test layouts (3x3 vs 4x2)
- Microinteractions (tap feedback, loading)
- Org theming for cards
- Onboarding tour

### Phase 5: Advanced (Post-Launch)
- Swipe gestures on player cards
- FAB for most frequent action (analytics-driven)
- Voice-to-action integration
- AI-powered action suggestions

---

## Key Research Insights

### 2025 Industry Trends
- **Mobile-first design** is mandatory (not desktop-first)
- **AI personalization** expected as standard
- **Progressive disclosure** over information overload
- **Gesture-based navigation** reduces interaction time 15% (TikTok-style)
- **Dark mode** and **org theming** improve engagement

### Touch Target Standards
- **iOS:** 44pt minimum
- **Android:** 48pt minimum
- **Grid margins:** 16-20px
- **Gutters:** 16px typical

### Performance Expectations
- Native UI (Swift/Kotlin) for smooth 60fps interactions
- Skeleton screens while loading
- Offline-first for frequent actions
- <200ms response time for UI feedback

### Accessibility Requirements
- All actionable items need descriptive labels (screen readers)
- Color contrast ratios (WCAG AA minimum)
- Voice control support (Siri, Google Assistant)

---

## When to Pivot from Grid to FAB

**Trigger:** If analytics show >50% of coaches use 1-2 actions repeatedly

**Recommended Pattern Shift:**
- Move most frequent action to FAB (e.g., "Record Voice Note")
- Keep bottom nav for sections
- Add swipe gestures on player cards (message, view passport, track injury)
- Lightning bolt menu for all actions

**Monitor:**
- Action usage frequency per coach
- Time-to-action metrics
- User feedback on discoverability

---

## Success Metrics (Post-Launch)

### Engagement
- % coaches using mobile dashboard daily
- Actions per session (target: 3-5)
- Most frequent actions (validate prioritization)

### Usability
- Time to complete common tasks (attendance, voice note)
- Error rate per action (mis-taps, wrong action selected)
- Completion rate for flows initiated on mobile

### Satisfaction
- Mobile NPS score (target: 40+)
- User feedback on discoverability
- Support tickets related to mobile actions

### Performance
- Page load time (<2s target)
- Offline success rate (>95% for cached actions)
- Widget usage (% coaches using home screen widget)

---

## Platform-Specific Examples

### TeamSnap (Sports Platform Benchmark)
- Grid of 8-10 action cards on coach dashboard
- Bottom nav for sections (Home, Teams, Schedule, Messages)
- Real-time updates for roster changes
- Optimized for field-side use (large buttons, high contrast)

### Linear (Speed-Focused Productivity)
- Inbox-first with swipe gestures
- Quick issue composer (minimal friction)
- Native performance (Swift/Kotlin)
- Frosted glass material design

### Chase (Banking - High Trust)
- Customizable dashboard tiles (6-8 actions)
- Bird's eye view of balances
- Biometric login (Face ID)
- Dark mode for readability

### Slack (Multi-Modal Interaction)
- Lightning bolt menu for shortcuts
- Bottom nav (3 icons) + customizable Home tab
- Swipe actions for messages
- Three-dot overflow menus

---

## Critical Don'ts

❌ **Don't use carousels** for primary actions (40% → 11% CTR drop)
❌ **Don't use icon-only buttons** for non-universal actions (confusion, errors)
❌ **Don't hide all actions** behind hamburger menu (discoverability)
❌ **Don't exceed 1 FAB per screen** (visual clutter, user confusion)
❌ **Don't design desktop-first** then adapt (mobile constraints differ)
❌ **Don't require gestures** for primary actions (not discoverable for infrequent users)
❌ **Don't skip text labels** during onboarding (accessibility + clarity)

---

## Resources for Implementation

### Design Systems
- Material Design 3 (Google): https://m3.material.io/
- iOS Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- shadcn/ui (Already in PDP): Component library with mobile-first patterns

### Mobile Components (Already Available)
- Bottom Navigation: shadcn/ui `<NavigationMenu>`
- Bottom Sheet: shadcn/ui `<Sheet>` component
- Cards: shadcn/ui `<Card>` component
- Icons: Lucide Icons (already integrated)

### Testing Tools
- iOS Simulator (Xcode)
- Android Emulator (Android Studio)
- BrowserStack (real device testing)
- Chrome DevTools (mobile emulation)

### Analytics
- PostHog (already integrated in PDP)
- Track: Action taps, time-to-action, completion rates
- Heatmaps: Identify unused actions

---

## Next Steps (Immediate Actions)

1. **[ ] Prototype 3x3 grid** in Figma with coach action cards
2. **[ ] User test with 5-10 coaches** (field-side scenarios)
3. **[ ] Implement Phase 1** (core grid + bottom nav)
4. **[ ] Measure baseline metrics** (action usage, time-to-action)
5. **[ ] Iterate based on data** (consider FAB if 1 action dominates)

---

## Full Research Document

For detailed analysis, platform-by-platform breakdowns, and complete source citations, see:
**`/Users/neil/Documents/GitHub/PDP/docs/research/mobile-quick-actions-research-2025.md`**

---

**Document Version:** 1.0
**Last Updated:** January 10, 2026
