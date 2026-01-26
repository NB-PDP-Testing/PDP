# AI Coach Assistant Help Guide

## Overview

A comprehensive help guide that explains the AI Coach Assistant system to coaches. This guide opens as a modal dialog when coaches click the "Help Guide" button in their AI Coach Assistant settings.

## Location

**Help Dialog Component**: `apps/web/src/components/profile/coach-ai-help-dialog.tsx`
**Integrated in**: `apps/web/src/components/profile/coach-settings-dialog.tsx`

## User Access

Coaches can access the help guide by:
1. Going to their profile
2. Clicking on "AI Coach Assistant" settings
3. Clicking the "Help Guide" button in the footer

## Guide Structure

The help guide uses a tabbed interface with 5 main sections:

### 1. Overview Tab
- **What is the AI Coach Assistant?** - High-level introduction
- **How It Works** - 5-step process explanation:
  1. Record voice notes about players
  2. AI extracts insights (skills, attendance, goals)
  3. System auto-applies high-confidence insights
  4. Coach reviews and can undo within 1 hour
  5. AI learns from feedback and adapts
- **Benefits** - Time saving, never forget observations, automatic parent sharing
- **Safety First** - Key safety features highlighted

### 2. Trust Levels Tab
Detailed explanation of all 4 trust levels:

#### Level 0: New
- **Label**: Just getting started
- **What happens**: Manual review required for all summaries
- **Next milestone**: Approve 10 summaries to reach Level 1

#### Level 1: Learning
- **Label**: Building trust
- **What happens**: Quick review with AI suggestions, preview badges, 20-insight preview period
- **Next milestone**: Approve 50 summaries to reach Level 2 and unlock auto-send

#### Level 2: Trusted (Automation Unlocked)
- **Label**: Automation unlocked
- **What happens**: Auto-approve normal summaries, review only sensitive insights, can enable insight auto-apply
- **Next milestone**: Approve 200 summaries to reach Level 3 (Expert)

#### Level 3: Expert
- **Label**: Maximum automation
- **What happens**: Full automation capabilities (opt-in required)
- **Achievement**: Maximum level reached message

Each level is visually distinct with:
- Color-coded backgrounds (gray → blue → green → purple)
- Level-specific icons (Shield, Sparkles, Award)
- Progress milestones
- Clear descriptions

### 3. Auto-Apply Tab
Explains how the auto-apply system works:

#### Eligibility Requirements
- Trust level 2+
- AI confidence ≥ threshold (default 70%)
- Category enabled in preferences
- Not injury/medical (always manual)
- Status = pending

#### Confidence Scoring
Visual progress bars showing:
- **80-100%** (Green): High confidence - Safe to auto-apply
- **60-79%** (Amber): Moderate - May need review
- **<60%** (Red): Low confidence - Manual review required

#### Adaptive Learning
- **Low undo rate (<3%)**: System lowers threshold → more auto-apply
- **High undo rate (>10%)**: System raises threshold → fewer auto-apply
- **Adjustment frequency**: Daily at 2 AM UTC
- **Minimum data**: Requires 10+ auto-applied insights

#### Example Walkthrough
Real-world example of a skill rating update:
- Voice note: "Emma's passing was excellent today..."
- AI insight: Passing: 3 → 4 (85% confidence)
- Auto-apply: ✓ Applied (Level 2, Skills enabled, 85% > 70%)
- Result: Profile updated, 1-hour undo window

### 4. Settings Tab
Explains the two levels of settings:

#### Platform-Wide Settings
**Insight Auto-Apply Preferences** - Apply across all clubs:
- ✅ **Skills**: Skill rating updates (e.g., Passing: 3 → 4)
- ✅ **Attendance**: Attendance records (present/absent/late)
- ✅ **Goals**: Development goal updates and milestones
- ✅ **Performance**: Performance notes and observations
- ❌ **Injury & Medical**: Always require manual review (cannot be enabled)

#### Per-Club Settings
**Club Settings** - Configured separately for each club:
- **Enable Parent Summaries**: Generate AI summaries from voice notes
- **Skip Sensitive Insights**: Exclude injury/behavior from parent summaries

#### Why Two Setting Levels?
- **Platform-wide**: Automation preferences apply everywhere you coach
- **Per-club**: Each club may have different parent communication needs

### 5. Safety Tab
Comprehensive safety information:

#### Injury & Medical: Always Manual
- **NEVER** auto-apply regardless of trust level or confidence
- **Why?** Medical information requires coach judgment and potential external consultation
- Hard-coded safety rule

#### 1-Hour Undo Window
- **What**: Any auto-applied insight can be undone within 1 hour
- **How to undo**:
  1. Go to Voice Notes → AI Insights → Auto-Applied tab
  2. Find the insight
  3. Click [Undo] button (enabled for 1 hour)
  4. Select reason (helps AI learn)
  5. Confirm - profile reverts to previous value
- **Undo reasons**: Wrong player, Wrong rating, Insight incorrect, Other

#### Complete Audit Trail
Every auto-applied insight records:
- What changed (field, previous value, new value)
- When it changed (timestamp)
- Who triggered it (coach ID)
- AI confidence score at application time
- If/when undone and why

#### Other Safety Features
- **Confidence thresholds**: Bounded 60-90% (won't go too aggressive/conservative)
- **Category opt-in**: All categories default to disabled
- **Trust level gates**: Automation unlocks after proving track record
- **Stale insight handling**: Insights >24 hours don't auto-apply

#### Bottom Line
"You always have the final say. The AI is your assistant, not a replacement. Every action is transparent, reversible (within 1 hour), and under your control."

## Technical Implementation

### Components
```typescript
// Help Dialog Component
CoachAIHelpDialog({
  open: boolean,
  onOpenChange: (open: boolean) => void
})
```

### Integration Points
1. **Coach Settings Dialog** (`coach-settings-dialog.tsx`):
   - Added state: `helpDialogOpen`
   - Added footer button: "Help Guide" with HelpCircle icon
   - Renders `CoachAIHelpDialog` component

2. **Styling**:
   - Uses shadcn/ui components (Dialog, Tabs, Badge, Button, Progress)
   - Responsive design with mobile-friendly tabs
   - Color-coded sections matching trust levels
   - Visual examples with progress bars

### Dependencies
- `lucide-react`: Icons (BookOpen, Shield, Award, Sparkles, Target, etc.)
- `@/components/ui/*`: Dialog, Tabs, Badge, Button, Progress
- Responsive layout with Tailwind CSS

## Content Sources

All content is derived from:
- **Phase 7.1 PRD**: Preview mode features (US-001 to US-005)
- **Phase 7.2 PRD**: Supervised auto-apply features (US-006 to US-009)
- **Phase 7.3 PRD**: Learning loop features (US-009.5 to US-013)
- **Trust Level Constants**: From `coach-settings-dialog.tsx`
- **Settings Structure**: From existing Coach AI Settings dialog

## Visual Design

### Color Scheme
- **Level 0 (New)**: Gray (`bg-gray-50`, `border-gray-200`)
- **Level 1 (Learning)**: Blue (`bg-blue-50`, `border-blue-200`)
- **Level 2 (Trusted)**: Green (`bg-green-50`, `border-green-200`)
- **Level 3 (Expert)**: Purple (`bg-purple-50`, `border-purple-200`)
- **Safety/Warnings**: Red (`bg-red-50`, `border-red-200`)

### Layout
- **Max width**: 3xl (768px)
- **Max height**: 85vh with scroll
- **Tab layout**: 5 equal-width tabs (responsive)
- **Card structure**: Bordered cards with colored backgrounds
- **Typography**: Hierarchical (h3 for sections, h4 for subsections)

## User Experience Flow

1. **Entry**: Coach clicks "Help Guide" in settings footer
2. **Overview**: Lands on Overview tab (default)
3. **Navigation**: Can explore any of 5 tabs
4. **Learning**: Progressive disclosure - can read at own pace
5. **Exit**: "Got it, thanks!" button closes dialog

## Key Features

### Progressive Disclosure
- Tabbed interface allows coaches to jump to relevant sections
- Each tab is self-contained with complete information
- No required reading order

### Visual Learning
- Color-coded trust levels match actual UI
- Progress bars demonstrate confidence scoring
- Real-world examples with voice note → insight → auto-apply flow
- Icons reinforce concepts (Shield = safety, Sparkles = AI, Target = settings)

### Safety Emphasis
- Dedicated Safety tab
- Red warning boxes for injury/medical
- Multiple mentions of undo window
- Complete audit trail explanation

### Practical Examples
- Skill rating update walkthrough
- Confidence scoring visualization
- Undo process step-by-step

## Maintenance Notes

### Updating Content
If features change, update these sections:
- **Trust levels** (if thresholds change): Update "Trust Levels" tab
- **Auto-apply logic** (if eligibility changes): Update "Auto-Apply" tab
- **Settings** (if new categories added): Update "Settings" tab
- **Safety rules** (if undo window changes): Update "Safety" tab

### Consistency
Keep help guide content in sync with:
- PRD documents (`scripts/ralph/prds/Coaches Voice Insights/`)
- Trust level constants in `coach-settings-dialog.tsx`
- Actual system behavior in backend models

## Future Enhancements

Potential improvements:
1. **Interactive demos**: Click-through walkthroughs
2. **Video tutorials**: Embedded video explanations
3. **Contextual help**: Link directly to relevant tab from settings
4. **Search functionality**: Search across all help content
5. **Feedback mechanism**: "Was this helpful?" buttons
6. **Coach onboarding flow**: Show help guide on first settings access

## Related Documentation

- [Phase 7.1 PRD](../../scripts/ralph/prds/Coaches Voice Insights/p7-phase1-preview-mode.prd.json)
- [Phase 7.2 PRD](../../scripts/ralph/prds/Coaches Voice Insights/p7-phase2-supervised-auto-apply.prd.json)
- [Phase 7.3 PRD](../../scripts/ralph/prds/Coaches Voice Insights/p7-phase3-learning-loop.prd.json)
- [Voice Notes Documentation](./voice-notes.md)
