# Coach Trust Control UX Enhancement
**Date:** January 24, 2026
**Status:** Proposal for P5 Enhancement
**Purpose:** Ensure coaches always feel in full control of AI automation

---

## Core Philosophy

> **"Coaches should always feel in full control and can change the trust level when they want to. We support them as they trust AI more and suggest more trust levels for them."**

This document enhances the P5 PRD with better trust control UX based on this principle.

---

## Current Approach (P2 Implementation)

**From Phase 2 (already built):**
- Radio buttons for trust level selection (0, 1, 2, 3)
- Can only select levels you've earned
- Disabled options above current level
- Static descriptions per level

**Problems:**
- Feels binary/discrete, not gradual
- Can't easily see "I'm halfway to next level"
- No visual feedback on progress
- Changing level feels like big decision
- No proactive suggestions from system

---

## Enhanced Approach: Trust Slider + Intelligent Nudges

### 1. Visual Trust Slider (Horizontal)

**Replace radio buttons with interactive slider:**

```
Current Trust Level: Learning (Level 1)

┌─────────────────────────────────────────────┐
│  Manual    Learning    Trusted    Expert    │
│    ○──────────●═══════════○─────────○       │
│   Lvl 0     Lvl 1       Lvl 2      Lvl 3    │
│  (Earned)  (Current)  (12 more)   (Locked)  │
└─────────────────────────────────────────────┘

Your Setting: ▼ (can drag left to Level 0)
```

**Slider States:**
- **Filled section (●═══●):** Earned levels, can select any
- **Empty section (○─────○):** Not yet earned, disabled
- **Draggable marker (▼):** Your current preference
- **Progress text:** "12 more approvals to unlock Trusted"

**Interaction:**
- Drag slider left/right within earned range
- Click directly on earned level to jump
- Hover shows tooltip with level details
- Smooth animation when dragging
- Haptic feedback on mobile (if supported)

### 2. Real-Time Progress Visualization

**Show progress TO next level, not just AT current level:**

```
┌──────────────────────────────────────────────┐
│ Progress to Trusted (Level 2)                │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  38/50   │
│                                              │
│ Requirements:                                │
│ ✓ 50 approvals (you have 38)                │
│ ✗ <10% suppression rate (you have 15%)      │
│                                              │
│ Keep approving quality summaries to unlock! │
└──────────────────────────────────────────────┘
```

**Progress indicators:**
- Progress bar with percentage
- ✓ for met requirements, ✗ for unmet
- Encouraging message when close
- Color coding: green when >80%, amber 50-80%, gray <50%

### 3. Intelligent Suggestions (Proactive Nudges)

**System observes patterns and suggests changes:**

#### Suggestion Type 1: Ready to Level Up

```
┌──────────────────────────────────────────────┐
│ 🎉 You're ready for Trusted automation!     │
│                                              │
│ You've approved 52 summaries with only      │
│ 3 suppressions (6% rate). Want to enable    │
│ auto-approval for high-confidence messages? │
│                                              │
│ This would have auto-sent 8 of your last    │
│ 10 approvals, saving you time.              │
│                                              │
│ [Yes, upgrade to Trusted] [Maybe later]     │
└──────────────────────────────────────────────┘
```

**Trigger:**
- Earned next level
- Agreement rate with AI predictions >70%
- Haven't manually upgraded yet
- Wait 2 days before suggesting (not annoying)

#### Suggestion Type 2: Consider Lowering

```
┌──────────────────────────────────────────────┐
│ ⚠️ You're suppressing many auto-approvals   │
│                                              │
│ You've suppressed 6 of the last 10 auto-    │
│ approved messages. This suggests Level 2    │
│ might be too aggressive for your comfort.   │
│                                              │
│ Want to switch back to Level 1 (quick       │
│ review with suggestions)?                   │
│                                              │
│ [Yes, lower to Level 1] [No, keep Level 2]  │
└──────────────────────────────────────────────┘
```

**Trigger:**
- Revocation rate >30% over 20 messages
- Or suppression of auto-approved >40%
- Suggests dropping one level
- Non-judgmental language

#### Suggestion Type 3: You're Doing Great

```
┌──────────────────────────────────────────────┐
│ ✨ AI automation is working well for you!   │
│                                              │
│ You've had 47 auto-approved messages in     │
│ the past month with only 1 revocation.      │
│                                              │
│ Your trust level: Perfect for your needs    │
│                                              │
│ [Dismiss]                                    │
└──────────────────────────────────────────────┘
```

**Trigger:**
- High automation usage
- Low revocation rate (<5%)
- Positive reinforcement monthly
- Builds confidence in system

### 4. Confidence Threshold Slider (For Level 2+ Coaches)

**Fine-grained control within a level:**

```
┌──────────────────────────────────────────────┐
│ Auto-Approval Confidence Threshold           │
│                                              │
│ How confident should AI be to auto-send?    │
│                                              │
│  Conservative       Balanced      Aggressive │
│       60%              70%            80%     │
│        ├───────────────●───────────────┤      │
│                      (Your setting)          │
│                                              │
│ At 70%: About 15 of your last 20 normal     │
│ summaries would auto-send.                  │
│                                              │
│ Lower = more automation, some errors        │
│ Higher = less automation, fewer errors      │
└──────────────────────────────────────────────┘
```

**Dynamic preview:**
- As you drag slider, show "X of last 20 would auto-send"
- Update in real-time (no save button needed, auto-saves)
- Percentage shown below slider
- Descriptions update based on position

### 5. Settings Page Layout

**Combine all controls in cohesive UI:**

```
┌────────────────────────────────────────────────────────┐
│ AI Trust & Automation Settings                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│ [Trust Level Slider - see mockup above]               │
│                                                        │
│ ┌────────────────────────────────────────────┐       │
│ │ What happens at each level:                │       │
│ │                                             │       │
│ │ Level 0 - Manual: You review everything    │       │
│ │ Level 1 - Learning: AI suggests, you decide│       │
│ │ Level 2 - Trusted: Auto-send if confident  │       │
│ │ Level 3 - Expert: Full automation (opt-in) │       │
│ └────────────────────────────────────────────┘       │
│                                                        │
│ [Confidence Threshold Slider - if Level 2+]           │
│                                                        │
│ ┌────────────────────────────────────────────┐       │
│ │ Optional Settings:                          │       │
│ │ □ Skip sensitive insights (injury/behavior)│       │
│ │ □ Pause parent summaries temporarily       │       │
│ │                                             │       │
│ │ These override your trust level setting.   │       │
│ └────────────────────────────────────────────┘       │
│                                                        │
│                                    [Save Changes]      │
└────────────────────────────────────────────────────────┘
```

---

## Implementation in P5

### Modified Stories (Enhancements to P5 PRD)

#### Add to US-004 (Preview Mode Indicator):
- Change from Badge to slider visualization
- Show where preview predictions would place them
- "AI would auto-send at Level 2 with your patterns"

#### Replace P2's TrustPreferenceSettings Component:
Create new `trust-level-slider.tsx` component:
- Horizontal slider using Radix UI Slider primitive
- 4 stops (0, 1, 2, 3)
- Filled/empty sections based on earned levels
- Real-time progress display
- Smooth animations

#### Add New Story to P5 (US-021):
**"Create intelligent nudge system"**
- Monitor coach patterns (agreement rate, revocation rate)
- Generate suggestions based on patterns
- Store dismissed suggestions (don't nag)
- Configurable nudge frequency per coach

---

## Industry Research Supporting This Approach

### Spotify's Volume Slider
- Smooth horizontal slider
- Instant feedback
- No "save" button needed
- Haptic feedback on mobile

### iPhone's Screen Time Controls
- Slider for time limits
- Visual progress bars
- Proactive suggestions based on usage
- Non-judgmental language

### Tesla's Autopilot Levels
- Gradual progression of automation
- Driver can disengage at any time
- System learns driver behavior
- Suggests features when safe

### GitHub Copilot's Settings
- Slider for aggressiveness
- Preview of what would change
- Suggestions to try new features
- Easy to revert

---

## User Experience Principles

### 1. **Always Reversible**
- Drag slider left = instant downgrade
- No confirmation dialogs for downgrades
- Confirmation only for Level 3 (full auto)

### 2. **Transparent Predictions**
- Show "X of last 20 would auto-send at this level"
- Update in real-time as slider moves
- Historical data, not promises

### 3. **Encouraging, Not Pushy**
- Suggestions feel helpful, not nagging
- Can dismiss suggestions
- Positive reinforcement when doing well
- Non-judgmental when struggling

### 4. **Gradual, Not Binary**
- Confidence slider within levels
- Progress bars show partial progress
- Small steps toward automation
- Never force big leaps

### 5. **Learn from Behavior**
- If coach overrides often: suggest lowering
- If coach approves predicted auto-sends: suggest raising
- Personalized thresholds over time
- Respect explicit settings over predictions

---

## Technical Implementation Notes

### Slider Component (React)
```typescript
import { Slider } from "@/components/ui/slider"

<Slider
  min={0}
  max={3}
  step={1}
  value={[selectedLevel]}
  onValueChange={([level]) => handleLevelChange(level)}
  disabled={(value) => value > currentLevel} // Disable unearned levels
  className="trust-level-slider"
/>
```

### Progress Calculation
```typescript
function calculateProgress(coach: CoachTrustLevel) {
  const currentLevel = coach.currentLevel;
  const nextLevel = currentLevel + 1;

  if (nextLevel > 3) return { percentage: 100, requirements: [] };

  const threshold = TRUST_LEVEL_THRESHOLDS[`level${nextLevel}`];
  const approvalsProgress = Math.min(100, (coach.totalApprovals / threshold.minApprovals) * 100);

  const suppressionRate = coach.totalSuppressed / (coach.totalApprovals + coach.totalSuppressed);
  const suppressionOk = !threshold.maxSuppressionRate || suppressionRate <= threshold.maxSuppressionRate;

  return {
    percentage: approvalsProgress,
    requirements: [
      { met: coach.totalApprovals >= threshold.minApprovals, text: `${threshold.minApprovals} approvals` },
      { met: suppressionOk, text: `<${(threshold.maxSuppressionRate ?? 0) * 100}% suppression` }
    ]
  };
}
```

### Nudge Decision Logic
```typescript
function shouldShowNudge(coach: CoachTrustLevel, recentActivity: Activity[]) {
  const last20 = recentActivity.slice(0, 20);
  const revocations = last20.filter(a => a.type === 'revoked').length;
  const revocationRate = revocations / last20.length;

  // Suggest lowering if high revocation rate
  if (revocationRate > 0.3 && coach.currentLevel >= 2) {
    return { type: 'suggest_lower', message: '...' };
  }

  // Suggest raising if earned next level and high agreement
  const previewStats = coach.previewModeStats;
  if (previewStats && previewStats.agreementRate > 0.7 && coach.currentLevel < coach.preferredLevel) {
    return { type: 'suggest_raise', message: '...' };
  }

  return null;
}
```

---

## Migration from Current P2 Implementation

**Phase 2 already built TrustPreferenceSettings with radio buttons.**

To migrate to slider:
1. Keep existing mutation `setCoachPreferredLevel` (backend unchanged)
2. Replace `TrustPreferenceSettings` component with `TrustLevelSlider`
3. Add progress calculation logic
4. Add nudge detection scheduled function (weekly analysis)
5. Visual design polish (animations, colors)

**Timeline:**
- Can be done as part of P5 (before auto-approval goes live)
- Or as P5.5 enhancement after core auto-approval works
- Doesn't block P5 functionality

---

## Success Metrics

### UX Metrics
- **Slider engagement:** >50% coaches adjust slider in first week
- **Nudge acceptance:** >30% coaches accept level-up suggestions
- **Revocation rate:** Coaches who accept suggestions have <10% revocation
- **Time to adjust:** <30 seconds from "want to change level" to complete

### Trust Metrics
- **Comfort level:** Survey shows coaches feel "in control" (>4/5 score)
- **Understanding:** Coaches can explain what each level does (>80% accuracy)
- **Confidence:** Coaches trust AI suggestions (>70% acceptance rate)

---

## Recommendation

**Implement slider + nudges in P5:**
- Slider: US-004 enhancement (replace preview badge with slider viz)
- Progress: US-005 enhancement (add progress calculation)
- Nudges: New US-021 (intelligent suggestion system)

**This aligns perfectly with your goals:**
- ✅ Coaches always feel in control (drag slider anytime)
- ✅ Can change trust level when they want (instant, no friction)
- ✅ We support them as they trust AI more (nudges suggest level-up)
- ✅ Suggest more trust levels (proactive, data-driven suggestions)

**Industry-validated approach:**
- Spotify, Tesla, iPhone use sliders for gradual control
- GitHub Copilot uses suggestions based on behavior
- Netflix uses progress bars + personalization

---

**What do you think? Should we integrate this into P5, or make it a separate P5.5 enhancement?**
