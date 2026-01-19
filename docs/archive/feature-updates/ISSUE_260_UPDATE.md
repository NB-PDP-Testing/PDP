## Implementation Update: Coach Comparison View for Shared Passports

### Summary

Building on the existing cross-organization passport sharing infrastructure, we've now implemented the **Coach Comparison View** - enabling coaches to meaningfully compare their local assessments with shared passport data received from other organizations.

### What Was Added

#### New Comparison Feature

The coach can now click "Compare" on any active shared passport to access a dedicated comparison view with three modes:

1. **Insights Dashboard** (Default)
   - Agreement/divergence analysis
   - AI-powered coaching insights using Claude
   - Blind spot identification
   - Actionable recommendations

2. **Split View**
   - Side-by-side local vs shared data
   - Responsive: panels on desktop, tabs on mobile

3. **Overlay View**
   - Dual-dataset radar chart
   - Visual skills comparison

#### AI-Powered Analysis

Integrated Claude AI to provide meaningful coaching insights:
- Executive summary of comparison
- Prioritized key insights with action items
- Development focus (immediate/short-term/long-term)
- Questions to investigate
- Positive observations

#### Navigation Entry Point

Added "Compare" button to the Active Shares tab in the Shared Passports Hub (`/orgs/[orgId]/coach/shared-passports`).

### Technical Implementation

#### Backend
- `packages/backend/convex/models/passportComparison.ts`
  - `getComparisonData` query - fetches local/shared data, computes insights
  - `getComparisonPreferences` / `saveComparisonPreferences` - preference persistence

#### Frontend
- New route: `/orgs/[orgId]/coach/shared-passports/[playerId]/compare`
- Components for each view mode
- AI insights panel with Claude integration

#### API Route
- `/api/comparison-insights` - Proxies to Anthropic Claude API

#### Schema
- Added `coachComparisonSettings` to `userPreferences` table for view mode persistence

### How It Works

1. Coach navigates to Shared Passports Hub
2. Views Active Shares tab showing received shared passports
3. Clicks "Compare" on a player's shared passport
4. Comparison view loads with consent-validated data
5. Coach can toggle between view modes
6. AI insights can be generated on-demand
7. Preferences are saved for future sessions

### Color Coding

| Delta | Color | Meaning |
|-------|-------|---------|
| ≤0.5 | Green | Strong agreement |
| 0.5-1.0 | Yellow | Minor divergence |
| >1.0 | Red | Significant divergence |

### Files Created

See full list in: `docs/archive/feature-updates/COACH_PASSPORT_COMPARISON_IMPLEMENTATION.md`

### Testing

1. Ensure there's an active shared passport for testing
2. Navigate to `/orgs/[orgId]/coach/shared-passports`
3. Click "Compare" on Active Shares tab
4. Test all three view modes
5. Generate AI insights
6. Verify mobile responsiveness
7. Check preference persistence

### Status

✅ **Complete** - All planned features implemented:
- [x] Backend comparison query with insights computation
- [x] Insights Dashboard view
- [x] Split View (desktop panels, mobile tabs)
- [x] Overlay View with radar chart
- [x] Cross-sport comparison handling
- [x] AI-powered insights integration
- [x] Preference persistence
- [x] Navigation from Shared Passports Hub
