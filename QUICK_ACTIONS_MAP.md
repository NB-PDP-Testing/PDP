# Quick Actions Architecture Map

**⚠️ This is a quick reference. For comprehensive documentation, see:**
**`/docs/features/quick-actions-system.md`**

## Components & Files

### 1. Context (`/contexts/quick-actions-context.tsx`)
- **QuickActionsProvider** - Wraps coach layout
- **State**: `actions[]`, `isMenuOpen`
- **Methods**: `setActions()`, `clearActions()`, `setIsMenuOpen()`

### 2. UI Component (`/components/quick-actions/header-quick-actions-menu.tsx`)
- Renders dropdown menu in header
- Reads actions from context
- Displays icon + label + title for each action

### 3. Hook (`/hooks/use-page-quick-actions.ts`)
- Helper for pages to register custom actions
- Calls `setActions()` on mount
- Calls `clearActions()` on unmount

### 4. Action Providers

#### A. Layout Default Actions (`/coach/layout.tsx` lines 54-129)
**When**: Sets actions if `actions.length === 0`
**Where**: ALL coach pages (unless overridden)
**Actions** (8 navigation actions):
1. "Overview" → `/coach` dashboard
2. "Players" → `/coach/players`
3. "Assess" → `/coach/assess`
4. "Voice Notes" → `/coach/voice-notes`
5. "Goals" → `/coach/goals`
6. "Injuries" → `/coach/injuries`
7. "Medical" → `/coach/medical`
8. "Tasks" → `/coach/todos`

#### B. Dashboard Actions (`/components/quick-actions/fab-variant.tsx`)
**When**: Rendered by SmartCoachDashboard on `/coach` page only
**Where**: Dashboard page (`/coach/page.tsx` → `coach-dashboard.tsx` → `smart-coach-dashboard.tsx`)
**Actions** (8 feature actions):
1. "Assess Players" → onAssessPlayers callback
2. "Generate Session Plan" → AI session generation
3. "View Analytics" → Analytics view
4. "Record Voice Note" → Voice notes page
5. "Report Injury" → Injuries page
6. "Manage Goals" → Goals page
7. "View Medical Info" → Medical page
8. "View Match Day" → Match day page

**Lifecycle**:
- `useEffect` on mount: calls `setActions(quickActions)`
- Cleanup on unmount: calls `clearActions()`

#### C. Demo Page Actions (`/coach/quick-actions-demo/page.tsx`)
**When**: Only on demo page
**Where**: `/coach/quick-actions-demo`
**Actions**: Dynamic based on draft/published state

## Navigation Flow

### Scenario 1: Load Dashboard Page
1. Layout mounts → tries to set default actions
2. Actions array is empty, so sets 8 navigation actions
3. SmartCoachDashboard renders → FABQuickActions mounts
4. FABQuickActions calls `setActions()` with 8 dashboard actions
5. **Result**: Dashboard actions override layout defaults

### Scenario 2: Navigate Dashboard → Players
1. User navigates to `/coach/players`
2. SmartCoachDashboard unmounts
3. FABQuickActions cleanup runs → calls `clearActions()`
4. Actions array becomes empty
5. Layout useEffect triggers (dependency: `actions.length`)
6. Layout sets default navigation actions
7. **Expected Result**: Shows navigation actions on Players page

### Scenario 3: Navigate Players → Dashboard
1. User navigates back to `/coach`
2. SmartCoachDashboard mounts
3. FABQuickActions mounts and sets dashboard actions
4. **Result**: Dashboard actions appear

## Expected Behavior Per Page

| Page Route | Expected Actions | Source |
|------------|------------------|--------|
| `/coach` | Dashboard actions (8) | FABQuickActions via SmartCoachDashboard |
| `/coach/players` | Navigation actions (8) | Layout defaults |
| `/coach/assess` | Navigation actions (8) | Layout defaults |
| `/coach/goals` | Navigation actions (8) | Layout defaults |
| `/coach/injuries` | Navigation actions (8) | Layout defaults |
| `/coach/medical` | Navigation actions (8) | Layout defaults |
| `/coach/voice-notes` | Navigation actions (8) | Layout defaults |
| `/coach/todos` | Navigation actions (8) | Layout defaults |
| `/coach/match-day` | Navigation actions (8) | Layout defaults |
| `/coach/quick-actions-demo` | Demo actions (varies) | usePageQuickActions hook |

## User's Report

**Issue**: "other pages on /coach are using the same screenshot quick actions"

**Screenshot shows**: Dashboard actions (Assess Players, Session Plan, Analytics, etc.)

**Possible Problems**:
1. ❌ **Cleanup not working**: FABQuickActions unmount cleanup not calling clearActions()
2. ❌ **Race condition**: Layout useEffect not re-running after clearActions()
3. ❌ **Context persistence**: Actions persisting across navigation
4. ❌ **Multiple SmartCoachDashboard**: Dashboard component being used on other pages?
5. ❌ **Feature flag**: All pages showing FAB variant instead of layout defaults?

## Questions to Clarify

1. **Which page** are you seeing dashboard actions on? (e.g., /coach/players, /coach/assess)
2. **Do you see** layout navigation actions on ANY page, or always dashboard actions?
3. **When you navigate** from Dashboard → Players → Dashboard, do the actions change?
4. **Is the feature flag** `ux_quick_actions_fab` enabled in PostHog?
