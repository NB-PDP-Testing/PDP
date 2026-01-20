# Coach Passport Comparison Feature - Implementation Summary

**Date**: January 19, 2026
**Related Issues**: #19 (Multi-Sport Passport Views), #260 (Cross-Organization Player Passport Sharing)

---

## Feature Overview

Implemented a comprehensive coach passport comparison feature that allows coaches to compare their local player assessments with shared passport data from other organizations. The feature includes:

- **Multiple View Modes**: Insights Dashboard (primary), Split View, and Overlay View
- **AI-Powered Insights**: Uses Claude AI to generate meaningful coaching recommendations
- **Cross-Sport Support**: Smart handling of comparisons between different sports
- **Mobile-First Design**: Responsive layouts for mobile, tablet, and desktop
- **Preference Persistence**: Coach view mode preferences are saved and restored

---

## New Route

```
/orgs/[orgId]/coach/shared-passports/[playerId]/compare?consentId=[consentId]
```

Accessible via the "Compare" button on the Active Shares tab of the Shared Passports Hub.

---

## Files Created

### Backend

| File | Purpose |
|------|---------|
| `packages/backend/convex/models/passportComparison.ts` | Backend queries for comparison data, insights computation, and preference persistence |

### Frontend - Comparison Page

| File | Purpose |
|------|---------|
| `apps/web/src/app/orgs/[orgId]/coach/shared-passports/[playerId]/compare/page.tsx` | Route page component |
| `.../compare/comparison-view.tsx` | Main client component managing view modes and data |
| `.../compare/components/view-mode-selector.tsx` | Toggle between Insights/Split/Overlay views |
| `.../compare/components/insights-dashboard.tsx` | Primary view with stats, divergences, recommendations |
| `.../compare/components/ai-insights-panel.tsx` | AI-powered insights using Claude |
| `.../compare/components/split-view.tsx` | Side-by-side comparison view |
| `.../compare/components/overlay-view.tsx` | Overlaid radar chart comparison |
| `.../compare/components/comparison-radar-chart.tsx` | Dual-dataset radar chart component |
| `.../compare/components/skill-comparison-row.tsx` | Individual skill comparison display |
| `.../compare/components/recommendation-card.tsx` | Action recommendation cards |
| `.../compare/components/cross-sport-notice.tsx` | Alert for cross-sport comparisons |

### API Route

| File | Purpose |
|------|---------|
| `apps/web/src/app/api/comparison-insights/route.ts` | Next.js API route proxying to Anthropic Claude API |

### Schema Update

| File | Change |
|------|--------|
| `packages/backend/convex/schema.ts` | Added `coachComparisonSettings` to userPreferences table |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/src/app/orgs/[orgId]/coach/shared-passports/shared-passports-view.tsx` | Added "Compare" button to Active Shares tab |

---

## View Modes

### 1. Insights Dashboard (Default)

The primary view focused on actionable coaching insights:

- **Summary Card**: Agreement percentage, divergence count, assessment counts
- **Divergences Section**: Expanded by default, highlights skills with >1.0 rating difference
- **Agreements Section**: Collapsed by default, shows skills with ≤1.0 difference
- **Blind Spots Section**: Skills only in one assessment (local or shared)
- **AI Insights Panel**: Claude-powered analysis with:
  - Executive summary
  - Key insights with priority levels
  - Development focus (immediate/short-term/long-term)
  - Investigation questions
  - Positive observations
- **Recommendations Section**: Actionable cards for investigate/align/leverage/explore actions

### 2. Split View

Side-by-side comparison:

- **Desktop**: Resizable panel group with local and shared data
- **Mobile**: Tab-based switching between views

### 3. Overlay View

Visual comparison:

- **Radar Chart**: Dual-dataset chart overlaying local (green) and shared (blue) assessments
- **Skills Table**: Detailed comparison with delta values
- **Category Toggle**: Option to view by skill category

---

## Color Coding System

| State | Color | When Used |
|-------|-------|-----------|
| Strong Agreement (≤0.5 diff) | Green | Skills rated similarly |
| Minor Divergence (0.5-1.0 diff) | Yellow/Amber | Worth noting |
| Significant Divergence (>1.0 diff) | Red | Needs attention |
| Local Only | Blue | Your blind spot |
| Shared Only | Purple | New information |

---

## Cross-Sport Handling

When comparing assessments from different sports:

- **Universal Skills**: Physical attributes (speed, endurance, strength), mental attributes (focus, resilience) - always comparable
- **Sport-Specific Skills**: Displayed with context and sport labels
- **Alert Banner**: Clearly indicates cross-sport comparison with guidance

---

## AI Integration

The AI insights feature uses **Anthropic Claude 3.5 Haiku** for cost-effective analysis:

1. **Trigger**: User clicks "Generate AI Insights" button
2. **Data Sent**: Anonymized comparison data (divergences, agreements, blind spots)
3. **Response**: Structured JSON with:
   - Summary of key findings
   - Prioritized insights with actionable recommendations
   - Development focus timeline
   - Questions to investigate
   - Positive observations

**API Endpoint**: `/api/comparison-insights` (POST)

---

## Preference Persistence

Coach preferences are saved to the `userPreferences` table:

```typescript
coachComparisonSettings: {
  defaultViewMode: "insights" | "split" | "overlay",
  highlightDivergence: boolean,
  divergenceThreshold: number
}
```

---

## Backend Query: `getComparisonData`

The main backend query fetches and computes:

1. **Player Information**: Basic profile data
2. **Local Data**: Coach's own assessments (skills, goals)
3. **Shared Data**: Data from other organizations via consent
4. **Computed Insights**:
   - Sports match detection
   - Agreement/divergence classification
   - Blind spot identification
   - Generated recommendations

---

## Testing

To test the feature:

1. Navigate to `/orgs/[orgId]/coach/shared-passports`
2. Find a player with an active shared passport (Active Shares tab)
3. Click the "Compare" button
4. Verify:
   - Insights Dashboard loads with comparison data
   - AI Insights can be generated
   - View mode switching works
   - Cross-sport notice appears when applicable
   - Mobile layouts are responsive
   - Preferences persist after refresh

---

## Dependencies

- **Anthropic Claude API**: Requires `ANTHROPIC_API_KEY` environment variable
- **Recharts**: For radar chart visualization
- **ResizablePanelGroup**: From radix-ui for split view

---

## Future Enhancements

Potential improvements for future iterations:

1. Historical comparison (compare over time)
2. Bulk comparison (compare multiple players)
3. Export comparison as PDF/report
4. Share insights with parents
5. Integration with development goals
