# Mobile Quick Actions Research: Leading Platforms (2025)

**Research Date:** January 10, 2026
**Focus:** Coach/Admin/Management interface quick action patterns on mobile
**Objective:** Identify best practices for 8+ quick actions on mobile dashboards

---

## Executive Summary

This research analyzes how leading web applications handle quick actions on mobile dashboards, with a focus on coach, admin, and management interfaces. The study examines 7 major platform categories and synthesizes common patterns, best practices, and specific recommendations for coach dashboard contexts.

**Key Finding:** Industry leaders in 2025 converge on 4-5 dominant patterns, with **progressive disclosure using bottom sheets** and **grid-based layouts with icons+labels** emerging as the most effective approaches for 8+ actions.

---

## Platform Analysis

### 1. Google Workspace (Gmail, Drive Mobile)

**Quick Actions Implementation:**
- **Pattern:** Floating Action Button (FAB) + Bottom Sheet expansion
- **Gmail Mobile:**
  - Primary FAB for "Compose" in bottom-right
  - Quick actions accessible via tap-and-hold or swipe gestures on emails
  - AI-powered summary cards for shared files with "Summarise" action
  - Integrated task creation via drag-and-drop from emails
- **Drive Mobile:**
  - First-letters navigation for quick file access (type initial letters to jump)
  - Multi-key shortcuts replacing single-letter shortcuts
  - Widget support for quick task creation on home screen

**Key Observations:**
- **Layout:** FAB + contextual menus
- **Number of Actions:** 3-5 primary actions visible, 10+ in contextual menus
- **Progressive Disclosure:** Heavy use of AI-powered suggestions to reduce cognitive load
- **Icons vs Text:** Icons with labels on long-press
- **Mobile Optimization:** Gemini integration for voice-based actions, smart features that auto-populate from emails to Calendar/Wallet

**Source:** [Google Workspace Updates](https://workspaceupdates.googleblog.com/)

---

### 2. Slack Mobile

**Quick Actions Implementation:**
- **Pattern:** Bottom Navigation Bar + Lightning Bolt Menu + Swipe Gestures
- **Lightning Bolt Icon:** Quick access to shortcuts menu matching desktop experience
  - Create channel
  - Set status
  - Add files
  - Record clips
  - Access shortcuts
- **Home Tab Customization:** Users can prioritize "Catch up," "Threads," "Drafts"
- **Three-Dot Menu:** Context-specific actions (Activity view for monitoring)
- **Swipe Actions:** Swipe to delete or access quick replies

**Key Observations:**
- **Layout:** Bottom navigation (3-4 core icons) + overflow menu
- **Number of Actions:** 4 primary in bottom nav, 8+ in shortcuts menu
- **Progressive Disclosure:** Customizable shortcuts based on usage patterns
- **Icons vs Text:** Icons only in bottom nav, icons + text in menus
- **Scrolling Behavior:** Persistent bottom nav, scrollable content area
- **Mobile Optimization:** Parity with desktop shortcuts, draft management with batch operations

**Sources:**
- [Slack Mobile Features](https://slack.com/blog/productivity/get-more-from-slack-on-mobile)
- [Slack Shortcuts](https://slack.com/help/articles/360057554553-Use-shortcuts-to-take-actions-in-Slack)

---

### 3. Notion Mobile

**Quick Actions Implementation:**
- **Pattern:** Widget + Shortcuts Integration + In-App Buttons + Quick Capture
- **iPhone Shortcuts Integration:**
  - "Create database page" action for quick note capture
  - Voice dictation to Notion (Dictate Text → Create Page)
  - Home screen and lock screen widgets for instant access
- **Dashboard Buttons:** Automation buttons for creating tasks, assigning, opening in side peek
- **Plus (+) Symbol Menu:** Type-ahead for adding elements (heading, database, page, toggle)

**Key Observations:**
- **Layout:** Multiple entry points (widgets, in-app buttons, keyboard shortcuts)
- **Number of Actions:** 5-8 quick capture methods, unlimited button actions in dashboards
- **Progressive Disclosure:** Buttons reveal forms/tasks on tap, widgets link to full pages
- **Icons vs Text:** Mixed - widgets show page icons, buttons show icon + label
- **Mobile Optimization:** Native OS integration (iOS Shortcuts, widgets), voice capture for hands-free input

**Sources:**
- [Notion Quick Capture Guide](https://www.easlo.co/blog/how-to-quick-capture-into-notion)
- [Notion Mobile-Friendly Dashboards](https://super.so/blog/how-to-make-a-mobile-friendly-notion-dashboard)

---

### 4. Linear Mobile

**Quick Actions Implementation:**
- **Pattern:** Speed-Optimized Composer + Inbox + Native UI
- **Quick Issue Composer:**
  - "Obsessive focus on speed" for capturing ideas
  - Photo/screenshot sharing to initiate issues
  - Palm-perfect ergonomic design
- **Inbox Management:**
  - Swipe left/right to action, delete, or snooze
  - High-priority task notifications
- **Native Performance:** Built with Swift (iOS) and Kotlin (Android) for fluid UX

**Key Observations:**
- **Layout:** Inbox-first approach with quick composer
- **Number of Actions:** 3-5 primary actions (file, comment, snooze, delete, react)
- **Progressive Disclosure:** Inbox acts as triage, full details on tap
- **Icons vs Text:** Minimal text, gesture-based interactions
- **Scrolling Behavior:** Swipe-based navigation through inbox items
- **Mobile Optimization:** Frosted glass material design, optimized for one-handed use, real-time updates

**Sources:**
- [Linear Mobile App](https://linear.app/mobile)
- [Linear Mobile Workflows](https://www.superbcrew.com/linear-revolutionizes-product-management-with-new-mobile-app-for-on-the-go-workflows/)

---

### 5. Athletic/Sports Platforms (TeamSnap, SportsEngine, Hudl)

**Quick Actions Implementation:**

#### TeamSnap
- **Pattern:** Dashboard Grid + Bottom Navigation + Quick Messaging
- **Core Actions (Dashboard):**
  - Roster management (on the fly)
  - Availability tracking (who's coming to games/practices)
  - Individual/group messaging
  - Schedule building/importing
  - Postgame reports
- **Real-time Updates:** Push notifications for schedule/venue changes

#### SportsEngine
- **Pattern:** Centralized Management App + Auto-Sync
- **Quick Actions:**
  - Send real-time updates (parents, coaches, players)
  - Make changes in HQ → auto-populate to rosters, schedules, scores
- **Mobile Integration:** Changes sync from management app to participant apps

#### Hudl
- **Pattern:** Video-Centric + Analytics Dashboard
- **Quick Actions:**
  - Automated indexing of video
  - Rich visualization dashboard
  - Intelligent report building
  - Video integration with stats

**Key Observations:**
- **Layout:** Grid of action cards on dashboard, bottom nav for core sections
- **Number of Actions:** 6-10 primary coach actions visible
- **Progressive Disclosure:** Dashboard shows overview, tap for detailed views (roster, schedule, stats)
- **Icons vs Text:** Icons + text labels for all primary actions
- **Mobile Optimization:** Optimized for field-side use, real-time updates, offline-first for roster/schedule access

**Sources:**
- [TeamSnap Features](https://www.teamsnap.com/teams/features/mobile-apps)
- [SportsEngine vs TeamSnap Comparison](https://www.softwareadvice.com/club-management/sportsengine-profile/vs/teamsnap/)

---

### 6. Banking Apps (Chase, Revolut)

**Quick Actions Implementation:**

#### Chase Mobile
- **Pattern:** Customizable Dashboard + Quick Action Tiles
- **Dashboard Customization:** Users select which quick actions appear based on importance
- **Bird's Eye View:** Account balances at login, tap for details
- **J.D. Power Rating:** 3rd place with 673 points, 4.8/5 stars on App Store

#### Revolut
- **Pattern:** Tab Bar + Recent Payments + Smart Insights
- **Quick Actions:**
  - Face ID login (instant access)
  - Recent payments tab
  - Spending insights with real-time updates
  - Cost sorting and trend visualization
- **Award:** Best Consumer Banking Mobile App 2025

**Key Observations:**
- **Layout:** Dashboard with customizable action tiles (4-8 visible), bottom tab bar for navigation
- **Number of Actions:** 6-8 quick actions on home dashboard
- **Progressive Disclosure:** Dashboard shows balances + frequent actions, tap for full transaction history
- **Icons vs Text:** Icons + concise labels (e.g., "Transfer," "Pay," "Cards")
- **Scrolling Behavior:** Vertical scroll for transaction list, horizontal swipe for account switching
- **Mobile Optimization:** AI-driven personalization, anticipatory design (show relevant actions based on time/behavior), biometric login

**Sources:**
- [Chase Mobile Banking](https://www.chase.com/digital/mobile-banking)
- [Top Banking Apps 2025](https://www.velmie.com/post/top-banking-apps-with-the-best-ux)

---

### 7. Modern SaaS Dashboards (General Patterns)

**Quick Actions Implementation (2025 Best Practices):**

#### Mobile-First Design
- Large, easily tappable elements (44pt iOS, 48pt Android minimum)
- Intuitive gestures and optimized navigation for touchscreens
- F-pattern and Z-pattern layouts for high-priority items

#### Progressive Web App (PWA) Technology
- Enhanced mobile performance
- Offline capabilities
- App-like experience without app store installation

#### AI-Powered Personalization
- Dashboards adapt to user preferences and usage patterns
- Prioritize metrics/actions based on relevance to each user
- Real-time interactivity expected as standard

#### Microinteractions
- Button hover states (or tap feedback on mobile)
- Chart tooltips
- Filter loading animations
- Icon transitions showing system responsiveness

#### Actionable Insights with Color-Coded CTAs
- Visual hierarchy using badges, alerts, or buttons linked to insights
- Prioritize warnings and actionable items
- Surface key items for action, allow drill-down for details

**Key Observations:**
- **Layout:** Card-based grid with F/Z-pattern for priority actions
- **Number of Actions:** 6-8 primary actions, "More" option for overflow
- **Progressive Disclosure:** Critical KPIs + top actions visible, expandable sections for secondary actions
- **Icons vs Text:** Icons + labels required (accessibility and clarity)
- **Mobile Optimization:** Calm, deliberate design (not overwhelming), touch-optimized spacing (16-20px margins)

**Sources:**
- [Dashboard UX Best Practices 2025](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-ux)
- [Mobile Dashboard UI Best Practices](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui)
- [Admin Dashboard Best Practices 2025](https://medium.com/@CarlosSmith24/admin-dashboard-ui-ux-best-practices-for-2025-8bdc6090c57d)

---

## UI Pattern Deep Dives

### FAB (Floating Action Button) vs Bottom Sheet

#### Material 3 Expressive (2025 Update)
Google unveiled **Material 3 Expressive** at Google I/O 2025, introducing the **FAB Menu** pattern:
- FAB Menu keeps primary actions one tap away while putting secondary actions out of sight until needed
- Maintains minimalist interface without sacrificing functionality
- Expands into multiple actions when needed (bridging gap between single-action FAB and multi-action menus)

#### When to Use FAB
- **Single, primary action** that's consistently important across a screen
- Not every screen needs a FAB - only use for promoted actions
- One FAB per screen maximum (due to prominence/intrusiveness)
- **Placement:** Bottom-right for right-handed users (most common), but conflicts with optimal thumb zone (bottom-left)

#### When to Use Bottom Sheet
- **Multiple contextual actions or options** without disrupting user flow
- 25-30% higher engagement rates than traditional modals (less intrusive, easier to dismiss)
- Quick interactions (not for complex content requiring significant review time)
- **Advantages:** Thumb-friendly zone, horizontal space utilization, page-in-page experience with reduced cognitive load

#### Key Difference: Reachability
- Common misconception: bottom sheets improve reachability
- **Reality:** Middle of screen is most reachable (users hold devices in various ways)
- Bottom sheets work well because they're **transient** and **task-focused**, not purely due to placement

**Sources:**
- [Material 3 Expressive FAB Menu](https://medium.com/@renaud.mathieu/discovering-material-3-expressive-fab-menu-ecfae766a946)
- [Bottom Sheets UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/)
- [Bottom Sheet Design Guide](https://blog.logrocket.com/ux-design/bottom-sheets-optimized-ux/)

---

### Grid vs Carousel Layouts

#### Grid Layouts (Recommended for Quick Actions)
- **Advantages:**
  - Display multiple pieces of content simultaneously
  - Easy to scan without extra clicks
  - Better for SEO (search engines crawl all items)
  - Natural for mobile (vertical scrolling feels intuitive)
- **Best Use Cases:** Task-focused actions, essential features, admin dashboards

#### Carousels (Use with Caution)
- **Performance Data (2025):**
  - First feature in carousel: 40% click-through rate
  - Last feature in carousel: 11% click-through rate
- **When Carousels Work:** Optional content (feature announcements, product highlights, onboarding personality)
- **Mobile Considerations:** Vertical scrolling > horizontal swiping on mobile

#### 2025 Verdict
- For 8+ quick actions on mobile dashboard: **Grid layout preferred**
- Carousels suitable for secondary/optional content, not primary actions

**Sources:**
- [Grid vs Carousel Patterns](https://goodui.org/patterns/104/)
- [Mobile Carousels Best Practices](https://userpilot.com/blog/mobile-carousels/)
- [Carousel UI Alternatives](https://www.justinmind.com/ui-design/carousel)

---

### Progressive Disclosure Strategies for 8+ Actions

#### Multi-Layer Menus
- Show only essentials initially
- Provide access to important features through nested menus
- Keeps UI clean while maintaining functionality

#### Reducing Cognitive Load
- Split actions over multiple screens rather than cramming everything on one screen
- **Principle:** Limit immediate set of actions to reduce error likelihood

#### Prompted Unveiling
- Wait for user to indicate need/interest (hover, click-through, user-initiated actions)
- Don't pre-emptively show all features

#### Mobile Dashboard Specific Techniques
- **Summary metrics first** with drill-down to details
- **Simplified visualizations** (line/bar charts > scatter plots on small screens)
- **Consistency in design** - natural flow without jarring transitions

#### Best Practices for 8+ Actions
1. **Tier 1 (4-6 actions):** Most frequent actions always visible in grid
2. **Tier 2 (4-6 actions):** Accessible via "More" button or bottom sheet
3. **Tier 3 (Advanced):** Nested within Tier 2 menus or settings

**Sources:**
- [Progressive Disclosure Guide](https://www.interaction-design.org/literature/topics/progressive-disclosure)
- [Progressive Disclosure in SaaS UX](https://lollypop.design/blog/2025/may/progressive-disclosure/)
- [Mobile Dashboard Best Practices](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui)

---

### Icons vs Text Labels

#### 2025 Consensus: Icons + Text Labels

**Research Findings:**
- **Text labels boost icon usability** and help users eliminate doubt, avoid symbolic misinterpretation
- **Especially important during onboarding** - users should have every button's label spelled out until acclimated
- When combined with icons, text helps users confirm intent before taking action

#### When Icons Without Labels Are Acceptable
- **Common features only:** Search, Share, Settings in top corners
- **Frequent interactions** where icon is easy to find and action isn't disruptive
- **User acclimation:** After repeat usage, labels may become less critical

#### Mobile-Specific Guidance
- **Primary actions:** Always use icon + text label
- **Secondary actions:** May use icon-only if space is limited, but label on long-press
- **Touch targets:** 44pt iOS / 48pt Android minimum (icons need breathing room)
- **Accessibility:** All actionable items must have descriptive labels for screen readers

#### Design Principles
- Icons should be clear, consistent, easily recognized
- Text label or icon should connote semantic meaning and intended function
- Replace repetitive labels with icons (but label for accessibility)
- Secondary buttons can be smaller (icon-only) to prioritize crucial full-size buttons

**Sources:**
- [Icon Usability Best Practices](https://www.toptal.com/designers/ui/icon-usability-and-design)
- [Icons Without Labels in Mobile](https://www.telerik.com/blogs/is-it-ever-ok-use-icons-without-labels-mobile-app-design)
- [Mobile Dashboard UI Components](https://uitop.design/blog/design/mobile-dashboard-ui-components/)

---

### Grid Layout: Optimal Configurations

#### Common Grid Sizes
- **4-column grid:** Simpler layouts, fewer actions (4-8 actions)
- **6-column grid:** Complex interfaces, more flexibility (8+ actions)
- **Home Screen Grids:** 4x4, 4x5, 3x3, 2x2 (Android)

#### Spacing Guidelines (2025)
- **Grid margins:** 16px or 20px on mobile
- **Gutters (between columns):** 16px typical
- **Touch targets:** Minimum 44pt (iOS) / 48pt (Android)

#### 2025 Design Trend
- **Adaptive grids** that resize without breaking functionality
- **Responsive layouts** that adapt to screen size and orientation

#### Recommended Configuration for 8+ Quick Actions
- **3x3 grid** (9 visible actions) or **4x2 grid** (8 visible actions)
- Last tile as "More" or "See All" for overflow
- Vertical scroll for additional actions if needed

**Sources:**
- [Mobile Layouts & Grids](https://infinum.com/blog/mobile-layouts-and-grids/)
- [Mobile Spacing Rules](https://thisisglance.com/learning-centre/what-spacing-rules-create-better-mobile-app-layouts)

---

## Additional Pattern Examples

### Spotify Mobile (Content-First with Quick Access)
- **Bottom navigation bar** for core functions (Home, Search, Library)
- **Quick access to categories** and personalized playlists
- **Categorized browse sections** with visual hierarchy
- **Anticipatory design:** Suggests playlists based on time of day (workout mixes in morning, relaxing tunes in evening)
- **Dark mode UI** for readability and reduced eye strain

**Source:** [Mobile UX Design Examples](https://www.eleken.co/blog-posts/mobile-ux-design-examples)

---

### Netflix Mobile (Personalized Navigation)
- **3-4 icon bottom navigation bar** (simple, content-first)
- **Smart row structure:** Organizes content by theme, mood, behavior
- **Auto-play previews** for quick decision-making
- **AI-driven personalization:** Adapts UI based on viewing history, prioritizes "Continue Watching"
- **Gesture-based UI** for quick interaction
- **Persistent mini-player** for multitasking

**Source:** [Netflix Mobile App Redesign](https://bionicux.com/netflix-mobile-app-uiux-redesign-concept)

---

### Project Management Apps (Asana, Trello, Monday)

#### Mobile App Quality (2025)
- **Asana & ClickUp:** Highly rated mobile apps with all major features available
- **Monday.com:** Functional but less intuitive compared to Asana's mobile UX
- **Trello:** Smooth mobile app but can feel limited for complex projects

#### Key Observation
- **Asana:** Structured and analytical, ideal for goal-oriented teams managing multiple projects
- **Trello:** Simple, visual, affordable - great for individuals and creative teams (lacks proper user roles)
- **Monday.com:** Feature-rich and automated, perfect for scaling startups and cross-functional collaboration

**Note:** Search results didn't specifically mention quick action patterns for these platforms in 2025.

**Source:** [Asana vs Trello vs Monday Comparison](https://www.appvizer.com/magazine/operations/project-management/asana-vs-trello-vs-monday)

---

## Top 5 Common Patterns (Industry Leaders)

Based on the research, here are the top patterns used by industry leaders in 2025:

### 1. **Bottom Navigation Bar + Dashboard Grid**
**Who uses it:** Slack, Spotify, Netflix, Banking Apps, Sports Platforms

**Implementation:**
- 3-5 primary navigation icons in bottom bar (Home, Search, Profile, etc.)
- Dashboard displays grid of quick action cards (typically 4-8 visible)
- Vertical scroll for additional content

**Pros:**
- Thumb-friendly navigation
- Clear visual hierarchy
- Easy to scan and understand
- Familiar pattern (user expectation)

**Cons:**
- Limited space in bottom bar (3-5 max)
- Can feel cluttered with too many dashboard cards
- Requires scrolling for 8+ actions

**Best for:** Multi-section apps with 8-12 quick actions distributed across sections

---

### 2. **FAB + Bottom Sheet Expansion**
**Who uses it:** Google Workspace, Linear (inbox pattern), Material 3 apps

**Implementation:**
- Single FAB for most important action (Create, Compose, Add)
- FAB can expand into FAB Menu (Material 3 Expressive) for 3-5 related actions
- Bottom sheet for contextual actions on long-press or swipe

**Pros:**
- Minimal UI clutter
- Emphasizes primary action
- Quick access to most common action
- Expandable for related actions

**Cons:**
- Limited to 1-5 actions without additional UI
- FAB can obscure content
- Not ideal for 8+ equally important actions

**Best for:** Apps with one dominant action and a few secondary actions

---

### 3. **Customizable Dashboard Tiles + Progressive Disclosure**
**Who uses it:** Chase, Revolut, Modern SaaS Dashboards

**Implementation:**
- User selects which quick actions appear on dashboard (6-8 tiles)
- "More" or "All Actions" button for overflow
- AI-powered personalization suggests relevant actions

**Pros:**
- User control over priority actions
- Reduces cognitive load (only show what's needed)
- Scalable to 20+ actions with tiered disclosure
- Personalization improves engagement

**Cons:**
- Requires onboarding to set up customization
- Less discoverability for non-prioritized actions
- Complexity in implementation (personalization engine)

**Best for:** Power user tools with diverse user needs and 10+ actions

---

### 4. **Grid of Action Cards (No Bottom Nav)**
**Who uses it:** TeamSnap, SportsEngine, Admin Dashboards

**Implementation:**
- Full-screen grid of action cards (3x3 or 4x2 layout)
- Each card has icon + text label
- Vertical scroll for additional actions
- Optional top navigation or hamburger menu for major sections

**Pros:**
- Maximum space for actions (8-12 visible without scroll)
- Clear labeling reduces errors
- Easy to implement
- Suitable for infrequent users (no learning curve)

**Cons:**
- Can feel overwhelming with too many options
- Less space for content previews (tiles take up room)
- Scrolling required for 12+ actions

**Best for:** Admin/coach dashboards with 8-12 equally important actions, infrequent users

---

### 5. **Hybrid: Bottom Nav + FAB + Swipe Gestures**
**Who uses it:** Slack, Linear, Modern productivity apps

**Implementation:**
- Bottom navigation for major sections (3-4 icons)
- FAB for primary action within each section
- Swipe gestures for quick actions (archive, delete, snooze)
- Lightning bolt / overflow menu for additional shortcuts

**Pros:**
- Multi-modal interaction (tap, swipe, long-press)
- Efficient for power users
- Supports 10+ actions across different interaction methods
- Reduces visual clutter

**Cons:**
- Steeper learning curve (gestures not always discoverable)
- Inconsistent across platforms (iOS vs Android gesture conventions)
- Requires onboarding / tutorials

**Best for:** Productivity apps with power users who perform frequent actions

---

## Best Practices for 8+ Quick Actions on Mobile

### 1. **Use Progressive Disclosure with Tiered Actions**
- **Tier 1 (4-6 actions):** Most frequent, always visible in grid or bottom nav
- **Tier 2 (4-6 actions):** Accessible via "More" button, bottom sheet, or FAB menu
- **Tier 3 (Advanced):** Nested menus, settings, or contextual long-press

### 2. **Combine Icons + Text Labels**
- Always use text labels for primary actions (especially during onboarding)
- Icon-only acceptable for universally recognized actions (Search, Settings, Share) in navigation bars
- Ensure 44pt (iOS) / 48pt (Android) touch targets

### 3. **Prioritize with Data**
- Use analytics to identify most frequent actions
- AI-powered personalization to surface relevant actions per user
- Allow user customization for power users

### 4. **Optimize for One-Handed Use**
- Place frequent actions in thumb-friendly zone (bottom 60% of screen)
- Avoid top-right corner for critical actions
- Consider swipe gestures for common actions

### 5. **Use Consistent Patterns**
- Follow platform conventions (iOS Human Interface Guidelines, Material Design)
- Use familiar patterns (bottom nav, FAB, bottom sheets)
- Maintain consistency across your app

### 6. **Implement Smart Defaults**
- Show 6-8 actions initially based on user role or context
- Use contextual menus (long-press, swipe) for secondary actions
- Provide "Quick Actions" widget for home screen

### 7. **Test and Iterate**
- A/B test different layouts (grid vs carousel, 3x3 vs 4x2)
- Monitor engagement rates per action
- Gather user feedback on discoverability

### 8. **Optimize Performance**
- Use native UI components (Swift/Kotlin) for smooth interactions
- Implement skeleton screens while loading
- Cache frequent actions for offline access

---

## Specific Recommendations for Coach Dashboard Context

Based on the research and the PlayerARC/PDP coach dashboard requirements, here are specific recommendations:

### Context: Coach Dashboard Quick Actions
- **User Type:** Coaches (varying technical proficiency)
- **Frequency:** Daily use during season, weekly during off-season
- **Environment:** Often used on-the-go (field-side, commute, home)
- **Actions:** 8-12 primary actions (roster, attendance, goals, injuries, voice notes, assessments, match day, medical, etc.)

### Recommended Pattern: **Grid of Action Cards + Bottom Navigation**

#### Implementation Details

**Bottom Navigation (4 tabs):**
1. **Dashboard** (home icon) - Quick actions grid
2. **Players** (users icon) - Player list/search
3. **Calendar** (calendar icon) - Schedule/upcoming events
4. **Profile** (user icon) - Settings/notifications

**Dashboard Grid (3x3 layout - 9 visible actions):**
1. **Take Attendance** (check-square icon + label)
2. **Record Voice Note** (mic icon + label)
3. **View Roster** (users icon + label)
4. **Track Injury** (heart-pulse icon + label)
5. **Set Development Goal** (target icon + label)
6. **Match Day Prep** (calendar-check icon + label)
7. **Player Assessments** (clipboard-check icon + label)
8. **Medical Info** (first-aid icon + label)
9. **More Actions** (grid-3x3 icon + label) → Bottom sheet with additional actions

**Bottom Sheet (Tier 2 Actions):**
- Team Settings
- Export Reports
- Send Message to Parents
- View Past Assessments
- Training Schedule

#### Why This Pattern for Coaches

**Pros:**
1. **Low Learning Curve:** Coaches of all tech levels can understand grid immediately
2. **Field-Side Usability:** Large touch targets, clear labels reduce errors in distracting environments
3. **Discoverability:** All actions visible at a glance (no hidden gestures)
4. **Offline-First:** Grid can show cached actions, work offline
5. **Scalable:** Easy to add/remove actions based on sport or season
6. **Familiar:** Matches TeamSnap, SportsEngine patterns (sports platform expectations)

**Cons:**
1. **Visual Density:** 9 cards can feel busy (mitigate with org theming, consistent icons)
2. **Scrolling:** May require scroll for content below grid (acceptable for dashboard)

#### Design Specifications

**Grid Layout:**
- **Columns:** 3
- **Rows:** 3 visible (vertical scroll for more content below)
- **Card Size:** ~100-110px height (including icon + label)
- **Spacing:** 16px margins, 12px gutters
- **Touch Target:** 48px minimum (Android standard)

**Card Design:**
- **Background:** White card with subtle shadow (or org-themed color)
- **Icon:** 32px, org-primary color
- **Label:** 14px, semibold, 2 lines max (truncate with ellipsis)
- **Hover/Tap:** Slight scale (1.05x) + shadow increase

**Responsive Behavior:**
- **Small phones (<375px):** 2 columns, 4 rows visible
- **Large phones (>400px):** 3 columns, 3 rows (recommended)
- **Tablets:** 4 columns, 2-3 rows

#### Alternative Pattern: **Bottom Nav + FAB + Swipe**

If power users emerge (coaches using app 10+ times/day):
- Bottom nav for sections
- FAB for "Record Voice Note" (most frequent action)
- Swipe on player cards for quick actions (message, view passport, track injury)
- Lightning bolt menu for all actions

**When to switch:** If analytics show >50% of coaches use 1-2 actions repeatedly, consider FAB pattern.

---

### Mobile-Specific Optimizations for Coach Dashboard

1. **Voice-First Actions:**
   - Large "Record Voice Note" button
   - Voice-to-text for attendance notes
   - Speech-to-action ("Hey Coach, mark John as absent")

2. **Offline Support:**
   - Cache roster, schedule, recent notes
   - Queue actions (attendance, goals) for sync when online
   - Visual indicator for offline mode

3. **Quick Capture Widgets:**
   - iOS/Android home screen widget for "Quick Attendance"
   - Lock screen widget for "Record Voice Note"
   - Shortcuts integration (Siri: "Mark attendance for U12 practice")

4. **Contextual Intelligence:**
   - Show "Take Attendance" 30 minutes before scheduled practice
   - Suggest "Match Day Prep" on game days
   - Highlight injured players in roster view

5. **Multi-Team Support:**
   - Team switcher in top bar (dropdown or swipe between teams)
   - Color-code actions by team (use org theming per team)
   - Filter grid by selected team

6. **Performance:**
   - Lazy load player data (load names only, fetch details on tap)
   - Prefetch next likely action (e.g., load roster when attendance button is visible)
   - Use skeleton screens for perceived performance

---

## Implementation Checklist for Coach Dashboard

### Phase 1: Core Grid Layout
- [ ] Create 3x3 grid component with responsive layout
- [ ] Design action cards with icon + label
- [ ] Implement bottom navigation (Dashboard, Players, Calendar, Profile)
- [ ] Add "More Actions" card with bottom sheet

### Phase 2: Quick Actions
- [ ] Implement 8 primary actions (attendance, voice note, roster, injury, goals, match day, assessments, medical)
- [ ] Add bottom sheet with Tier 2 actions
- [ ] Integrate with existing Convex queries/mutations

### Phase 3: Mobile Optimizations
- [ ] Add offline support with queue sync
- [ ] Create home screen widget (iOS/Android)
- [ ] Implement contextual intelligence (show relevant actions based on schedule)
- [ ] Add team switcher for multi-team coaches

### Phase 4: Polish
- [ ] A/B test grid layouts (3x3 vs 4x2 vs 2x4)
- [ ] Add microinteractions (tap feedback, loading states)
- [ ] Implement org theming for cards
- [ ] Add onboarding tour for first-time users

### Phase 5: Advanced (Post-Launch)
- [ ] Add swipe gestures on player cards
- [ ] Implement FAB for most frequent action (based on analytics)
- [ ] Voice-to-action integration
- [ ] AI-powered action suggestions

---

## Conclusion

The research reveals a clear industry trend toward **progressive disclosure using grid layouts with bottom sheets** for mobile dashboards with 8+ quick actions. For coach dashboards specifically, a **3x3 grid of action cards with bottom navigation** provides the optimal balance of:

1. **Usability:** Low learning curve, suitable for all tech levels
2. **Efficiency:** Quick access to 8-9 primary actions without scrolling
3. **Scalability:** Easy to add/remove actions, expandable with bottom sheet
4. **Familiarity:** Matches patterns from TeamSnap, SportsEngine (sports platform conventions)
5. **Performance:** Lightweight, offline-capable, fast to render

**Key Success Factors:**
- Always use **icon + text labels** for clarity
- Implement **progressive disclosure** (Tier 1: 8 visible, Tier 2: bottom sheet)
- Optimize for **one-handed use** and **field-side environments**
- Leverage **contextual intelligence** (show relevant actions based on schedule/time)
- Support **offline-first** workflows (cache roster, queue actions)

**Next Steps:**
1. Prototype 3x3 grid layout with coach action cards
2. User test with 5-10 coaches (field-side scenarios)
3. Measure engagement per action (identify candidates for FAB or swipe)
4. Iterate based on usage patterns and feedback

---

## Sources

### Google Workspace
- [Google Workspace Updates](https://workspaceupdates.googleblog.com/)
- [Google Tasks Workflow Guide](https://www.geeky-gadgets.com/how-to-use-google-tasks-2025/)

### Slack
- [Get More from Slack on Mobile](https://slack.com/blog/productivity/get-more-from-slack-on-mobile)
- [Use Shortcuts in Slack](https://slack.com/help/articles/360057554553-Use-shortcuts-to-take-actions-in-Slack)
- [Redesigned Slack](https://slack.com/blog/productivity/a-redesigned-slack-built-for-focus)

### Notion
- [Notion Quick Capture Guide](https://www.easlo.co/blog/how-to-quick-capture-into-notion)
- [Mobile-Friendly Notion Dashboards](https://super.so/blog/how-to-make-a-mobile-friendly-notion-dashboard)
- [Notion iPhone Shortcuts](https://bennybuildsit.com/blog/how-to-take-notion-quick-notes-iphone-shortcuts)

### Linear
- [Linear Mobile App](https://linear.app/mobile)
- [Linear Mobile Workflows](https://www.superbcrew.com/linear-revolutionizes-product-management-with-new-mobile-app-for-on-the-go-workflows/)
- [Linear App Review 2025](https://www.siit.io/tools/trending/linear-app-review)

### Sports Platforms
- [TeamSnap Features](https://www.teamsnap.com/teams/features/mobile-apps)
- [TeamSnap Coach Dashboard](https://www.teamsnap.com/teams/coach-toolkit)
- [SportsEngine vs TeamSnap](https://www.softwareadvice.com/club-management/sportsengine-profile/vs/teamsnap/)
- [Best Sports Team Management Apps 2025](https://www.spond.com/en-us/news-and-blog/5-best-sports-team-management-apps/)

### Banking Apps
- [Chase Mobile Banking](https://www.chase.com/digital/mobile-banking)
- [Top Banking Apps with Best UX 2025](https://www.velmie.com/post/top-banking-apps-with-the-best-ux)
- [Build Revolut-Style Banking App](https://www.flutterflowdevs.com/blog/how-to-build-a-revolut-style-banking-app-with-flutterflow-in-2025)

### UI/UX Patterns
- [Dashboard UX Best Practices 2025](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-ux)
- [Mobile Dashboard UI Best Practices](https://www.toptal.com/designers/dashboard-design/mobile-dashboard-ui)
- [Dashboard Design Principles 2025](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [Admin Dashboard Best Practices 2025](https://medium.com/@CarlosSmith24/admin-dashboard-ui-ux-best-practices-for-2025-8bdc6090c57d)
- [Real-Time Dashboards UX Strategies](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)

### FAB and Bottom Sheets
- [Material 3 FAB Overview](https://m3.material.io/components/floating-action-button/overview)
- [Material 3 Expressive FAB Menu](https://medium.com/@renaud.mathieu/discovering-material-3-expressive-fab-menu-ecfae766a946)
- [Bottom Sheets UX Guidelines](https://www.nngroup.com/articles/bottom-sheet/)
- [Bottom Sheet Design Guide](https://blog.logrocket.com/ux-design/bottom-sheets-optimized-ux/)
- [Bottom Sheet Best Practices](https://mobbin.com/glossary/bottom-sheet)

### Grid vs Carousel
- [Carousel vs Static Grid](https://goodui.org/patterns/104/)
- [Mobile Carousels Guide](https://userpilot.com/blog/mobile-carousels/)
- [Carousel UI Best Practices](https://www.justinmind.com/ui-design/carousel)

### Icons and Labels
- [Icon Usability Best Practices](https://www.toptal.com/designers/ui/icon-usability-and-design)
- [Icons Without Labels in Mobile](https://www.telerik.com/blogs/is-it-ever-ok-use-icons-without-labels-mobile-app-design)
- [How to Use Icons in UI/UX Design](https://blog.thenounproject.com/how-to-use-icons-in-ui-and-ux-design-best-practices/)

### Progressive Disclosure
- [Progressive Disclosure Overview](https://www.interaction-design.org/literature/topics/progressive-disclosure)
- [Progressive Disclosure NN/G](https://www.nngroup.com/articles/progressive-disclosure/)
- [Progressive Disclosure in SaaS UX](https://lollypop.design/blog/2025/may/progressive-disclosure/)
- [Progressive Disclosure Examples](https://userpilot.com/blog/progressive-disclosure-examples/)

### Mobile Layouts
- [Mobile Layouts & Grids](https://infinum.com/blog/mobile-layouts-and-grids/)
- [Mobile Spacing Rules](https://thisisglance.com/learning-centre/what-spacing-rules-create-better-mobile-app-layouts)

### Modern App Examples
- [Mobile UX Design Examples](https://www.eleken.co/blog-posts/mobile-ux-design-examples)
- [Netflix Mobile App Redesign](https://bionicux.com/netflix-mobile-app-uiux-redesign-concept)
- [Mobile App Design Trends 2025](https://theapptrix.com/top-mobile-app-design-trends-2025/)
- [Mobile Design Innovations 2025](https://medium.com/@uidesign0005/the-next-wave-of-mobile-apps-2025-design-innovations-a229b7690bb6)

### Project Management Apps
- [Asana vs Trello vs Monday 2025](https://www.appvizer.com/magazine/operations/project-management/asana-vs-trello-vs-monday)
- [Trello vs Asana Comparison](https://plaky.com/blog/trello-vs-asana/)

---

**Document Version:** 1.0
**Last Updated:** January 10, 2026
**Next Review:** Q2 2026 (after initial implementation and user testing)
