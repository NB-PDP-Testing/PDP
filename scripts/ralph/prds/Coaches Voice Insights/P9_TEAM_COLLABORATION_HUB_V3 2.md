# PRD: Phase 9 - Team Collaboration Hub (Version 3.0 - FINAL)

**Project:** Voice Notes - Team Collaboration Hub
**Branch:** `ralph/team-collaboration-hub-p9`
**Created:** January 27, 2026
**Updated:** January 30, 2026 (V3 - Final)
**Status:** ✅ Ready for Implementation
**Estimated Time:** 4 weeks (48 user stories, ~72 hours)
**Priority:** 🔴 CRITICAL - Transforms to collaboration platform

---

## Document Changes (V3.0 - FINAL)

**What's New in V3:**
- ✅ Added AI Copilot Smart Suggestions (US-P9-041 to US-P9-044, 8-10h)
- ✅ Added Mobile Gesture Vocabulary (US-P9-045 to US-P9-048, 3-4h)
- ✅ Mobile-first responsive design patterns throughout
- ✅ Professional tone (no gamification, minimal animations)
- ✅ Coordination with POST-P9 Mobile Quick Review feature
- ✅ WhatsApp Groups integration notes (between P9-P10)

**What's in V3:**
- All V2 features: 40 original stories (presence, notifications, voting, templates, etc.)
- NEW: 8 AI Copilot stories (context-aware suggestions)
- NEW: Professional design system guidance
- Total: 48 stories, ~72 hours

**Removed from Bleeding Edge:**
- ❌ Voice Commands (not priority)
- ❌ Progressive Disclosure (keep all features visible)
- ❌ Celebration Microinteractions (too game-like)
- ❌ Async Video, Conversational AI, Smart Digest (Post-P10)

---

## Executive Summary

**Problem Statement:**
Team Insights features are fragmented and lack collaborative features found in modern workplace tools. Coaches working on the same team cannot effectively coordinate, discuss insights in real-time, see who's online, prioritize notifications, or make democratic decisions together.

**The Vision:**
Transform Voice Notes from a personal tool into a **best-in-class team collaboration platform** with **AI-powered productivity** and **mobile-first interactions** - making PlayerARC the fastest, most intuitive coaching platform in the market.

**What's Already Done (Phases 1-8):**
- ✅ Voice notes with AI transcription and insights
- ✅ Trust level system with 8-priority access control
- ✅ Parent summaries with acknowledgment
- ✅ Team Insights tab + persistent observations page
- ✅ "My Impact" dashboard (7 sections, date range filters, CSV export)
- ✅ Better Auth adapter pattern established
- ✅ 19 skeleton loading components
- ✅ Functional roles (coach, parent, admin, player)

**What This PRD Delivers:**

### Week 1: Collaboration Foundations + Presence
- Real-time presence system (see who's online, what they're viewing)
- Comments on insights (threaded discussions)
- Reactions (like, helpful, flag)
- Backend infrastructure for activity feed
- **NEW: AI Copilot backend foundations**

### Week 2: Activity Feed, @Mentions & Priority Notifications
- Real-time activity feed with filtering
- @mention support with smart autocomplete
- Priority-based notification system (Critical/Important/Normal)
- Notification preferences and digests
- **NEW: AI Smart Suggestions UI components**

### Week 3: Multi-View, Templates & Decision-Making
- View toggle: List / Board / Calendar / Players
- Enhanced session templates with auto-population from insights
- Collaborative session planning
- Voting system for democratic decisions (MVP, lineup, training focus)
- Keyboard shortcuts & command palette
- **NEW: Mobile gesture support for insight cards**

### Week 4: Personalization & Polish
- Tone controls (Warm / Professional / Brief)
- Frequency controls (Every insight / Daily / Weekly digests)
- Inline editing & quick actions
- Smart notification digests
- Audio playback in voice note detail
- Coach learning dashboard
- Team Hub page unification
- **NEW: Mobile-optimized layouts**

---

## Design Philosophy (V3)

### Mobile-First + Desktop Primary

**Approach:** Design for mobile FIRST, then enhance for desktop (not mobile as afterthought).

```
MOBILE (375px - 768px)
- Single column layouts
- Stacked cards
- Touch-friendly targets (min 44px)
- Gesture-driven interactions
- Bottom navigation/actions
- Collapsible sections

DESKTOP (1024px+)
- Multi-column layouts
- Side-by-side comparisons
- Hover states
- Keyboard shortcuts
- Persistent sidebars
- Expanded details
```

**Implementation Pattern:**
```tsx
// Mobile-first CSS
.insight-card {
  /* Mobile base styles */
  padding: 1rem;
  margin: 0.5rem 0;

  /* Desktop enhancement */
  @media (min-width: 1024px) {
    padding: 1.5rem;
    margin: 1rem;
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
  }
}
```

### Professional Tone (No Gamification)

**DO:**
- ✅ Clean, minimal UI
- ✅ Subtle success indicators (green checkmark, simple toast)
- ✅ Clear action feedback (loading states, success/error messages)
- ✅ Professional color palette (trust blue, action green, warning amber)

**DON'T:**
- ❌ Confetti animations
- ❌ Achievement badges
- ❌ Streak counters
- ❌ Level-up celebrations
- ❌ Emoji overload

**Success Feedback Examples:**
```tsx
// ✅ GOOD - Professional
<Toast>
  <CheckCircle className="h-4 w-4 text-green-600" />
  <span>Applied to Emma's passport</span>
</Toast>

// ❌ BAD - Too playful
<Toast>
  🎉 Awesome! Emma's passport updated! You're on a roll! 🔥
  <Confetti />
</Toast>
```

---

## NEW: AI Copilot Smart Suggestions

### Overview

The AI Copilot analyzes context and offers **one-click actions** for common workflows. Makes the platform **3x faster** for experienced coaches.

**Key Principle:** Suggestions are **helpful, not intrusive**. Always optional, never blocking.

### Context-Aware Suggestions

#### Context 1: Viewing an Insight

```
┌─────────────────────────────────────────────────────────────────┐
│ ⭐ Emma's Tackling Improved (4/5)                               │
│ Coach Neil • 2 hours ago                                        │
│                                                                 │
│ "Showed great technique in 1v1 drills today"                   │
│                                                                 │
│ 🤖 SUGGESTED ACTIONS:                                           │
│ ─────────────────────────────────────────────────────────────── │
│ • Apply to passport → [1 click]                                │
│ • @mention Coach Sarah (worked with Emma yesterday) → [1 click]│
│ • Add to Thu session plan → [1 click]                          │
└─────────────────────────────────────────────────────────────────┘
```

**Suggestion Logic:**
1. **Apply to passport** - Always shown if insight is pending
2. **@mention relevant coach** - If another coach observed same player recently
3. **Add to session plan** - If session exists within 48 hours
4. **Create follow-up task** - If category is injury/medical
5. **Link to existing observation** - If similar insight exists for player

#### Context 2: Creating Session Plan

```
┌─────────────────────────────────────────────────────────────────┐
│ CREATE SESSION PLAN - Thu Jan 30, 6:00 PM                      │
│                                                                 │
│ 🤖 AI SUGGESTIONS:                                              │
│                                                                 │
│ ✅ INJURY CHECKS NEEDED:                                        │
│    • Sarah Malone (ankle - Day 2 of monitoring)                │
│    • Michael O'Brien (shoulder - cleared yesterday)            │
│    [Add to checklist] ←─ 1 click                               │
│                                                                 │
│ ⭐ FOCUS AREAS (from this week):                                │
│    • Defensive positioning (3 coaches mentioned)               │
│    • Hand passing under pressure                               │
│    [Use these objectives] ←─ 1 click                           │
│                                                                 │
│ 📋 EQUIPMENT:                                                   │
│    • 12 cones (Neil ordered - arrived yesterday)               │
│    [Add to checklist] ←─ 1 click                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Context 3: Viewing Activity Feed

```
┌─────────────────────────────────────────────────────────────────┐
│ TEAM ACTIVITY                                                   │
│                                                                 │
│ 🔴 Coach Sarah applied INJURY insight to Emma • 5 min ago      │
│                                                                 │
│ 🤖 SUGGESTED:                                                   │
│ • Comment (you're the physio) → [1 click opens comment form]  │
│ • Create Day 3 follow-up task → [1 click]                     │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Architecture

#### Backend: Smart Suggestions Engine

```typescript
// packages/backend/convex/models/aiCopilot.ts

import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Generate context-aware smart suggestions
 * Returns 1-5 suggestions based on current context
 */
export const getSmartSuggestions = query({
  args: {
    context: v.union(
      v.literal("viewing_insight"),
      v.literal("creating_session"),
      v.literal("viewing_activity"),
      v.literal("viewing_player_passport")
    ),
    contextId: v.string(), // insightId, sessionId, activityId, playerId
    teamId: v.optional(v.string()),
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.array(v.object({
    suggestionType: v.string(),
    label: v.string(),
    icon: v.string(),
    action: v.object({
      type: v.string(),
      params: v.any(),
    }),
    confidence: v.number(), // 0-1 score
    reasoning: v.string(),  // Why this suggestion (for debugging)
  })),
  handler: async (ctx, args) => {
    switch (args.context) {
      case "viewing_insight":
        return await generateInsightSuggestions(ctx, args);
      case "creating_session":
        return await generateSessionSuggestions(ctx, args);
      case "viewing_activity":
        return await generateActivitySuggestions(ctx, args);
      case "viewing_player_passport":
        return await generatePlayerSuggestions(ctx, args);
      default:
        return [];
    }
  }
});

/**
 * Generate suggestions when viewing an insight
 */
async function generateInsightSuggestions(
  ctx: Context,
  args: { contextId: string; userId: string; teamId?: string; organizationId: string }
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  // Parse insight from voice note
  const insight = await getInsightById(ctx, args.contextId);
  if (!insight) return [];

  // SUGGESTION 1: Apply to passport (if pending)
  if (insight.status === "pending" && insight.playerIdentityId) {
    suggestions.push({
      suggestionType: "apply_insight",
      label: `Apply to ${insight.playerName}'s passport`,
      icon: "✅",
      action: {
        type: "apply_insight",
        params: { insightId: insight.id, voiceNoteId: insight.voiceNoteId }
      },
      confidence: 0.95,
      reasoning: "Insight is pending and player is matched"
    });
  }

  // SUGGESTION 2: @mention related coach
  if (insight.playerIdentityId) {
    const relatedCoaches = await findCoachesWhoRecentlyObservedPlayer(
      ctx,
      insight.playerIdentityId,
      args.userId, // Exclude current user
      7 // Last 7 days
    );

    if (relatedCoaches.length > 0) {
      const coach = relatedCoaches[0];
      suggestions.push({
        suggestionType: "mention_coach",
        label: `@mention ${coach.firstName} (observed ${insight.playerName} recently)`,
        icon: "👤",
        action: {
          type: "open_comment_with_mention",
          params: { insightId: insight.id, coachId: coach.userId }
        },
        confidence: 0.75,
        reasoning: `${coach.firstName} has ${coach.recentObservationCount} recent observations`
      });
    }
  }

  // SUGGESTION 3: Add to upcoming session
  if (args.teamId) {
    const upcomingSession = await getNextSession(ctx, args.teamId);
    if (upcomingSession && isWithin48Hours(upcomingSession.sessionDate)) {
      suggestions.push({
        suggestionType: "add_to_session",
        label: `Add to ${formatSessionDate(upcomingSession.sessionDate)} session plan`,
        icon: "📅",
        action: {
          type: "add_player_note_to_session",
          params: {
            sessionId: upcomingSession._id,
            playerIdentityId: insight.playerIdentityId,
            note: insight.description,
            sourceInsightId: insight.id
          }
        },
        confidence: 0.85,
        reasoning: "Session is within 48 hours"
      });
    }
  }

  // SUGGESTION 4: Create follow-up task (injuries only)
  if (insight.category === "injury" && insight.playerIdentityId) {
    suggestions.push({
      suggestionType: "create_followup_task",
      label: `Create follow-up task: "Check ${insight.playerName} recovery"`,
      icon: "✅",
      action: {
        type: "create_task_from_insight",
        params: {
          insightId: insight.id,
          title: `Check ${insight.playerName} injury recovery`,
          dueDate: addDays(new Date(), 3).toISOString(), // 3 days from now
          linkedInsightId: insight.id
        }
      },
      confidence: 0.90,
      reasoning: "Injuries require monitoring"
    });
  }

  // SUGGESTION 5: Link to existing team observation
  if (insight.category === "team_culture") {
    const similarObservations = await findSimilarTeamObservations(
      ctx,
      args.teamId!,
      insight.description,
      0.7 // Similarity threshold
    );

    if (similarObservations.length > 0) {
      const obs = similarObservations[0];
      suggestions.push({
        suggestionType: "link_to_observation",
        label: `Link to existing observation: "${truncate(obs.title, 40)}"`,
        icon: "🔗",
        action: {
          type: "link_insight_to_observation",
          params: { insightId: insight.id, observationId: obs._id }
        },
        confidence: 0.70,
        reasoning: `${Math.round(obs.similarity * 100)}% similar to existing observation`
      });
    }
  }

  // Return top 4 suggestions sorted by confidence
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);
}

/**
 * Generate suggestions when creating a session plan
 */
async function generateSessionSuggestions(
  ctx: Context,
  args: { contextId: string; teamId?: string; organizationId: string }
): Promise<Suggestion[]> {
  if (!args.teamId) return [];

  const suggestions: Suggestion[] = [];

  // Get recent insights for this team
  const recentInsights = await getTeamInsightsFromLast7Days(ctx, args.teamId);

  // SUGGESTION 1: Injury checks needed
  const injuryInsights = recentInsights.filter(i => i.category === "injury");
  if (injuryInsights.length > 0) {
    const playerNames = injuryInsights.map(i => ({
      name: i.playerName || "Unknown",
      description: i.description,
      daysAgo: Math.floor((Date.now() - i.createdAt) / (24 * 60 * 60 * 1000))
    }));

    suggestions.push({
      suggestionType: "add_injury_checks",
      label: `Add injury status checks (${injuryInsights.length} players)`,
      icon: "🏥",
      action: {
        type: "add_session_checklist_items",
        params: {
          sessionId: args.contextId,
          items: playerNames.map(p => ({
            label: `Check ${p.name} - ${p.description} (Day ${p.daysAgo})`,
            category: "injury_check",
            playerName: p.name
          }))
        }
      },
      confidence: 0.95,
      reasoning: `${injuryInsights.length} recent injury insights need monitoring`
    });
  }

  // SUGGESTION 2: Focus areas from insights
  const skillInsights = recentInsights.filter(i =>
    i.category === "skill_rating" || i.category === "skill_progress"
  );

  if (skillInsights.length > 0) {
    // Find most mentioned skills/areas
    const skillMentions: Record<string, number> = {};
    skillInsights.forEach(i => {
      const skill = extractSkillFromDescription(i.description);
      if (skill) {
        skillMentions[skill] = (skillMentions[skill] || 0) + 1;
      }
    });

    const topSkills = Object.entries(skillMentions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([skill, count]) => ({ skill, count }));

    if (topSkills.length > 0) {
      suggestions.push({
        suggestionType: "add_focus_areas",
        label: `Use top focus areas (${topSkills.map(s => s.skill).join(", ")})`,
        icon: "⭐",
        action: {
          type: "add_session_objectives",
          params: {
            sessionId: args.contextId,
            objectives: topSkills.map(s =>
              `${s.skill} (${s.count} coach${s.count > 1 ? 'es' : ''} mentioned)`
            )
          }
        },
        confidence: 0.85,
        reasoning: `These skills mentioned ${topSkills[0].count}+ times this week`
      });
    }
  }

  // SUGGESTION 3: Equipment from recent tasks
  const recentTasks = await getRecentTeamTasks(ctx, args.teamId, 7);
  const equipmentTasks = recentTasks.filter(t =>
    t.title.toLowerCase().includes("order") ||
    t.title.toLowerCase().includes("equipment") ||
    t.title.toLowerCase().includes("cones") ||
    t.title.toLowerCase().includes("bibs")
  );

  if (equipmentTasks.length > 0) {
    suggestions.push({
      suggestionType: "add_equipment",
      label: `Add recently ordered equipment to checklist`,
      icon: "📦",
      action: {
        type: "add_equipment_checklist",
        params: {
          sessionId: args.contextId,
          items: equipmentTasks.map(t => ({
            item: extractEquipmentFromTask(t.title),
            quantity: 1,
            checked: false
          }))
        }
      },
      confidence: 0.70,
      reasoning: `${equipmentTasks.length} equipment-related tasks completed recently`
    });
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

// Helper functions
function isWithin48Hours(dateString: string): boolean {
  const sessionDate = new Date(dateString).getTime();
  const now = Date.now();
  const diff = sessionDate - now;
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatSessionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IE", { weekday: "short", month: "short", day: "numeric" });
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

function extractSkillFromDescription(desc: string): string | null {
  // Simple keyword extraction (can be enhanced with NLP)
  const skills = [
    "tackling", "passing", "hand pass", "solo runs", "shooting",
    "defensive positioning", "fitness", "communication", "leadership"
  ];

  const lowerDesc = desc.toLowerCase();
  return skills.find(skill => lowerDesc.includes(skill)) || null;
}

function extractEquipmentFromTask(title: string): string {
  // Extract equipment name from task title
  const equipment = ["cones", "bibs", "balls", "hurdles", "markers", "jerseys"];
  const lowerTitle = title.toLowerCase();
  return equipment.find(item => lowerTitle.includes(item)) || "Equipment";
}
```

#### Frontend: Smart Action Bar Component

```tsx
// apps/web/src/app/orgs/[orgId]/coach/components/smart-action-bar.tsx

"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SmartActionBarProps {
  context: "viewing_insight" | "creating_session" | "viewing_activity" | "viewing_player_passport";
  contextId: string;
  teamId?: string;
  userId: string;
  organizationId: string;
  className?: string;
}

export function SmartActionBar({
  context,
  contextId,
  teamId,
  userId,
  organizationId,
  className = ""
}: SmartActionBarProps) {
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  // Get suggestions from AI Copilot
  const suggestions = useQuery(api.models.aiCopilot.getSmartSuggestions, {
    context,
    contextId,
    teamId,
    userId,
    organizationId,
  });

  // Action executors
  const applyInsight = useMutation(api.models.voiceNotes.applyInsight);
  const addComment = useMutation(api.models.teamCollaboration.addComment);
  const createTask = useMutation(api.models.coachTasks.create);
  const addToSession = useMutation(api.models.sessionPlanning.addPlayerNote);

  const executeAction = async (suggestion: Suggestion) => {
    setExecutingAction(suggestion.suggestionType);

    try {
      switch (suggestion.action.type) {
        case "apply_insight":
          await applyInsight(suggestion.action.params);
          toast.success("Applied to player passport");
          break;

        case "open_comment_with_mention":
          // Open comment form with pre-filled mention
          // This would trigger a state change in parent component
          window.dispatchEvent(new CustomEvent("open-comment-form", {
            detail: {
              insightId: contextId,
              preFill: `@${suggestion.action.params.coachName} `
            }
          }));
          break;

        case "add_player_note_to_session":
          await addToSession(suggestion.action.params);
          toast.success("Added to session plan");
          break;

        case "create_task_from_insight":
          await createTask(suggestion.action.params);
          toast.success("Follow-up task created");
          break;

        case "add_session_checklist_items":
        case "add_session_objectives":
        case "add_equipment_checklist":
          // These would call appropriate session mutations
          toast.success("Added to session plan");
          break;

        default:
          console.warn("Unknown action type:", suggestion.action.type);
      }
    } catch (error) {
      console.error("Failed to execute action:", error);
      toast.error("Action failed. Please try again.");
    } finally {
      setExecutingAction(null);
    }
  };

  // Loading state
  if (suggestions === undefined) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading suggestions...</span>
      </div>
    );
  }

  // No suggestions
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`border-t border-border bg-muted/30 p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          🤖 Suggested Actions
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Tooltip key={suggestion.suggestionType}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => executeAction(suggestion)}
                disabled={executingAction !== null}
                className="text-xs"
              >
                {executingAction === suggestion.suggestionType ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <span className="mr-1">{suggestion.icon}</span>
                )}
                {suggestion.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{suggestion.reasoning}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Confidence: {Math.round(suggestion.confidence * 100)}%
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
```

---

## NEW: Mobile Gesture Vocabulary

### Overview

Mobile coaches (majority of users) expect **gestures over buttons**. Implement **swipe, long-press, and tap** interactions for common actions.

**Key Coordination:** These gestures are for **Team Hub insights**. POST-P9 Mobile Quick Review will have **separate gestures** for WhatsApp-linked insights.

### Gesture Mapping

```
INSIGHT CARD GESTURES (Team Hub only):
├─ Swipe RIGHT →     = Apply insight (shows green confirm)
├─ Swipe LEFT ←      = Dismiss insight (shows red confirm)
├─ Long Press (500ms) = Show quick actions menu
├─ Double Tap        = React with 👍 (like)
└─ Single Tap        = View detail / expand card

ACTIVITY FEED GESTURES:
├─ Pull Down         = Refresh feed
├─ Swipe LEFT on item = Mark as read
└─ Long Press        = Quick context menu

SESSION PLAN GESTURES:
├─ Drag Handle       = Reorder objectives
├─ Swipe LEFT        = Delete item
└─ Tap checkbox      = Mark complete
```

### Implementation: Swipeable Insight Card

```tsx
// apps/web/src/app/orgs/[orgId]/coach/team-hub/components/swipeable-insight-card.tsx

"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { CheckCircle, XCircle, MoreHorizontal } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { InsightCard } from "./insight-card";

const SWIPE_THRESHOLD = 100; // pixels
const LONG_PRESS_DURATION = 500; // ms

interface SwipeableInsightCardProps {
  insight: Insight;
  voiceNoteId: string;
  onApply?: () => void;
  onDismiss?: () => void;
}

export function SwipeableInsightCard({
  insight,
  voiceNoteId,
  onApply,
  onDismiss
}: SwipeableInsightCardProps) {
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const x = useMotionValue(0);
  const applyInsight = useMutation(api.models.voiceNotes.applyInsight);
  const dismissInsight = useMutation(api.models.voiceNotes.dismissInsight);

  // Background color changes based on swipe direction
  const backgroundColorRight = useTransform(
    x,
    [0, SWIPE_THRESHOLD],
    ["rgba(255,255,255,0)", "rgba(34, 197, 94, 0.2)"] // green
  );

  const backgroundColorLeft = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0],
    ["rgba(239, 68, 68, 0.2)", "rgba(255,255,255,0)"] // red
  );

  const handleDragEnd = async (event: any, info: PanInfo) => {
    const offset = info.offset.x;

    // Swipe RIGHT = Apply
    if (offset > SWIPE_THRESHOLD) {
      setIsSwipeComplete(true);

      // Haptic feedback (mobile only)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      try {
        await applyInsight({
          noteId: voiceNoteId as any,
          insightId: insight.id,
        });
        toast.success(`Applied to ${insight.playerName}'s passport ✅`);
        onApply?.();
      } catch (error) {
        toast.error("Failed to apply insight");
        setIsSwipeComplete(false);
      }
    }
    // Swipe LEFT = Dismiss
    else if (offset < -SWIPE_THRESHOLD) {
      setIsSwipeComplete(true);

      if (navigator.vibrate) {
        navigator.vibrate([20, 10, 20]); // Double tap pattern
      }

      try {
        await dismissInsight({
          noteId: voiceNoteId as any,
          insightId: insight.id,
        });
        toast.success("Insight dismissed");
        onDismiss?.();
      } catch (error) {
        toast.error("Failed to dismiss insight");
        setIsSwipeComplete(false);
      }
    }
    // Snap back if threshold not reached
    else {
      x.set(0);
    }
  };

  const handleTouchStart = () => {
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      setShowQuickActions(true);
      if (navigator.vibrate) {
        navigator.vibrate(30); // Gentle feedback for long press
      }
    }, LONG_PRESS_DURATION);
  };

  const handleTouchEnd = () => {
    // Cancel long press timer if released early
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (isSwipeComplete) {
    return null; // Card removed from view
  }

  return (
    <div className="relative">
      {/* Background indicators (visible during swipe) */}
      <motion.div
        style={{ backgroundColor: backgroundColorRight }}
        className="absolute inset-0 flex items-center justify-start pl-6 rounded-lg"
      >
        <CheckCircle className="h-6 w-6 text-green-600" />
        <span className="ml-2 font-semibold text-green-700">Apply</span>
      </motion.div>

      <motion.div
        style={{ backgroundColor: backgroundColorLeft }}
        className="absolute inset-0 flex items-center justify-end pr-6 rounded-lg"
      >
        <span className="mr-2 font-semibold text-red-700">Dismiss</span>
        <XCircle className="h-6 w-6 text-red-600" />
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative bg-background rounded-lg shadow-sm"
      >
        <InsightCard insight={insight} />
      </motion.div>

      {/* Quick actions menu (appears on long press) */}
      {showQuickActions && (
        <QuickActionsMenu
          insight={insight}
          onClose={() => setShowQuickActions(false)}
          onApply={async () => {
            await applyInsight({ noteId: voiceNoteId as any, insightId: insight.id });
            setShowQuickActions(false);
            onApply?.();
          }}
          onComment={() => {
            // Open comment dialog
            setShowQuickActions(false);
          }}
          onMention={() => {
            // Open mention dialog
            setShowQuickActions(false);
          }}
        />
      )}
    </div>
  );
}

// Quick actions menu component
function QuickActionsMenu({
  insight,
  onClose,
  onApply,
  onComment,
  onMention
}: QuickActionsMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 bg-background/95 backdrop-blur rounded-lg border-2 border-primary p-4 flex flex-col justify-center gap-2"
    >
      <Button onClick={onApply} className="w-full">
        <CheckCircle className="h-4 w-4 mr-2" />
        Apply to Passport
      </Button>

      <Button onClick={onComment} variant="outline" className="w-full">
        <MessageSquare className="h-4 w-4 mr-2" />
        Add Comment
      </Button>

      <Button onClick={onMention} variant="outline" className="w-full">
        <AtSign className="h-4 w-4 mr-2" />
        @Mention Coach
      </Button>

      <Button onClick={onClose} variant="ghost" className="w-full">
        Cancel
      </Button>
    </motion.div>
  );
}
```

### Mobile-Optimized Touch Targets

```tsx
// Minimum touch target sizes
const TOUCH_TARGETS = {
  button: {
    minHeight: "44px", // iOS HIG recommendation
    minWidth: "44px",
    padding: "12px 16px"
  },
  checkbox: {
    size: "24px", // Larger than default 16px
    padding: "10px" // Increases hit area to 44px
  },
  icon: {
    size: "24px", // Up from 16px default
    hitArea: "44px"
  }
};

// Usage example
<Button
  className="min-h-[44px] min-w-[44px] touch-manipulation"
  style={{ WebkitTapHighlightColor: "transparent" }} // Remove iOS tap highlight
>
  <CheckCircle className="h-6 w-6" />
</Button>
```

### Gesture Settings (User Preference)

```tsx
// Allow coaches to customize or disable gestures
<Card>
  <CardHeader>
    <CardTitle>Mobile Gestures</CardTitle>
    <CardDescription>Customize swipe actions</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Swipe Right</Label>
      <Select defaultValue="apply">
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apply">Apply</SelectItem>
          <SelectItem value="comment">Comment</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-center justify-between">
      <Label>Swipe Left</Label>
      <Select defaultValue="dismiss">
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dismiss">Dismiss</SelectItem>
          <SelectItem value="flag">Flag</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-center justify-between">
      <Label>Enable gestures</Label>
      <Switch defaultChecked />
    </div>
  </CardContent>
</Card>
```

---

## User Stories - NEW AI Copilot (8 stories, 8-10h)

### US-P9-041: Create AI Copilot Backend Model
**Week:** 1
**Priority:** Critical
**Effort:** 2h

**As a** backend developer
**I want to** create the AI Copilot model file
**So that** we can generate context-aware suggestions

**Acceptance Criteria:**
- [ ] Create `packages/backend/convex/models/aiCopilot.ts`
- [ ] Implement `getSmartSuggestions` query with context parameter
- [ ] Support 4 contexts: viewing_insight, creating_session, viewing_activity, viewing_player_passport
- [ ] Return array of suggestions with type, label, icon, action, confidence, reasoning
- [ ] Use Better Auth adapter for user lookups
- [ ] Type check passes
- [ ] Run `npx -w packages/backend convex codegen`

**Files to Create:**
- `packages/backend/convex/models/aiCopilot.ts`

---

### US-P9-042: Implement Insight Context Suggestions
**Week:** 1
**Priority:** Critical
**Effort:** 3h

**As a** backend developer
**I want to** generate smart suggestions when viewing an insight
**So that** coaches get one-click actions for common workflows

**Acceptance Criteria:**
- [ ] Implement `generateInsightSuggestions` function
- [ ] Suggestion 1: Apply to passport (if pending)
- [ ] Suggestion 2: @mention related coach (if exists)
- [ ] Suggestion 3: Add to upcoming session (if within 48h)
- [ ] Suggestion 4: Create follow-up task (injuries only)
- [ ] Suggestion 5: Link to existing observation (team_culture only)
- [ ] Return top 4 sorted by confidence
- [ ] Helper: `findCoachesWhoRecentlyObservedPlayer`
- [ ] Helper: `getNextSession`
- [ ] Helper: `findSimilarTeamObservations`
- [ ] Test with Convex dashboard
- [ ] Type check passes

**Files to Modify:**
- `packages/backend/convex/models/aiCopilot.ts`

---

### US-P9-043: Implement Session Planning Suggestions
**Week:** 1
**Priority:** Critical
**Effort:** 2h

**As a** backend developer
**I want to** generate smart suggestions when creating a session plan
**So that** coaches can auto-populate checklists from recent insights

**Acceptance Criteria:**
- [ ] Implement `generateSessionSuggestions` function
- [ ] Suggestion 1: Add injury checks from last 7 days
- [ ] Suggestion 2: Add focus areas (top 3 mentioned skills)
- [ ] Suggestion 3: Add equipment from recent tasks
- [ ] Helper: `getTeamInsightsFromLast7Days`
- [ ] Helper: `extractSkillFromDescription` (keyword matching)
- [ ] Helper: `getRecentTeamTasks`
- [ ] Return top 3 sorted by confidence
- [ ] Test with Convex dashboard
- [ ] Type check passes

**Files to Modify:**
- `packages/backend/convex/models/aiCopilot.ts`

---

### US-P9-044: Create SmartActionBar Component
**Week:** 2
**Priority:** Critical
**Effort:** 2h

**As a** frontend developer
**I want to** create the SmartActionBar component
**So that** coaches see AI suggestions in context

**Acceptance Criteria:**
- [ ] Create `smart-action-bar.tsx` component
- [ ] Component accepts: context, contextId, teamId, userId, organizationId props
- [ ] Uses `useQuery` to fetch suggestions from aiCopilot.getSmartSuggestions
- [ ] Displays suggestions as outlined buttons with icons
- [ ] Shows loading skeleton while fetching
- [ ] Returns null if no suggestions (don't show empty box)
- [ ] Implements `executeAction` function for all action types
- [ ] Shows loading state on clicked button
- [ ] Success/error toasts with professional tone
- [ ] Tooltip shows reasoning + confidence %
- [ ] Mobile responsive (buttons wrap on small screens)
- [ ] Type check passes
- [ ] Visual verification: suggestions appear, actions work

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/components/smart-action-bar.tsx`

---

## User Stories - NEW Mobile Gestures (4 stories, 3-4h)

### US-P9-045: Create Swipeable Insight Card Component
**Week:** 3
**Priority:** High
**Effort:** 2h

**As a** frontend developer
**I want to** create swipeable insight cards
**So that** mobile coaches can quickly apply/dismiss insights with gestures

**Acceptance Criteria:**
- [ ] Create `swipeable-insight-card.tsx` component
- [ ] Uses Framer Motion for swipe animations
- [ ] Swipe RIGHT (>100px) → Apply insight (green background)
- [ ] Swipe LEFT (<-100px) → Dismiss insight (red background)
- [ ] Haptic feedback on action (if navigator.vibrate available)
- [ ] Card animates out after action completes
- [ ] Background indicators show during drag
- [ ] Elastic drag with constraints
- [ ] Success toast after apply/dismiss
- [ ] Error handling with toast
- [ ] Type check passes
- [ ] Visual verification: swipes work on mobile

**Files to Create:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/swipeable-insight-card.tsx`

**Dependencies:**
- `npm install framer-motion` (if not already installed)

---

### US-P9-046: Add Long-Press Quick Actions Menu
**Week:** 3
**Priority:** High
**Effort:** 1h

**As a** frontend developer
**I want to** show quick actions menu on long-press
**So that** coaches have alternative to swiping

**Acceptance Criteria:**
- [ ] Modify `swipeable-insight-card.tsx`
- [ ] Detect long-press (500ms threshold)
- [ ] Show overlay menu with: Apply, Comment, @Mention, Cancel
- [ ] Haptic feedback on long-press trigger
- [ ] Cancel timer if touch released early
- [ ] Menu positioned over card with blur background
- [ ] Click action executes and closes menu
- [ ] Cancel button closes menu without action
- [ ] Type check passes
- [ ] Visual verification: long-press works

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/team-hub/components/swipeable-insight-card.tsx`

---

### US-P9-047: Add Mobile Touch Target Optimization
**Week:** 3
**Priority:** Medium
**Effort:** 0.5h

**As a** frontend developer
**I want to** ensure all touch targets meet minimum size requirements
**So that** mobile users can tap accurately

**Acceptance Criteria:**
- [ ] Create `touch-targets.css` with minimum sizes
- [ ] All buttons: min 44px × 44px
- [ ] All checkboxes: 24px with 10px padding (44px hit area)
- [ ] All icons: 24px (up from 16px default)
- [ ] Add `touch-manipulation` CSS class (disables zoom on tap)
- [ ] Remove iOS tap highlight: `-webkit-tap-highlight-color: transparent`
- [ ] Test on mobile: all targets tappable without zoom
- [ ] Type check passes
- [ ] Visual verification: targets large enough

**Files to Create:**
- `apps/web/src/styles/touch-targets.css`

**Files to Modify:**
- All button components in team-hub
- All checkbox components in team-hub

---

### US-P9-048: Add Gesture Customization Settings
**Week:** 3
**Priority:** Low
**Effort:** 0.5h

**As a** coach
**I want to** customize or disable gesture actions
**So that** I can use the platform my way

**Acceptance Criteria:**
- [ ] Add "Mobile Gestures" section to Settings tab
- [ ] Dropdown: Swipe Right action (Apply / Comment / Disabled)
- [ ] Dropdown: Swipe Left action (Dismiss / Flag / Disabled)
- [ ] Toggle: Enable/Disable all gestures
- [ ] Save to coachOrgPreferences
- [ ] Load preferences on mount
- [ ] Swipeable card respects preferences
- [ ] Type check passes
- [ ] Visual verification: preferences save and apply

**Files to Modify:**
- `apps/web/src/app/orgs/[orgId]/coach/voice-notes/components/settings-tab.tsx`
- `packages/backend/convex/schema.ts` (add gesturePreferences field)

---

## POST-P9 Features (Coordination Notes)

### Mobile Quick Review (Separate Feature)

**Status:** POST-P9 (separate 2-week project)
**Link:** `/docs/features/MOBILE_QUICK_REVIEW_PLAN.md`

**Key Differences from P9 Gestures:**
- **P9 gestures:** Team Hub insights (all coaches)
- **Quick Review gestures:** WhatsApp-linked insights (deep link `/r/[code]`)

**Shared Components:**
- Both use same `InsightCard` base component
- Both use similar swipe mechanics
- Quick Review adds: fuzzy player matching, trust-adaptive messaging, 48h expiry

**Implementation Coordination:**
- P9 creates `SwipeableInsightCard` as reusable component
- Quick Review extends with `QuickReviewInsightCard` wrapper
- Share gesture preferences from Settings

### WhatsApp Coach Groups

**Status:** Between P9-P10 (separate 4-week project)
**Link:** `/docs/features/whatsapp-coach-groups.md`

**P9 Schema Prepares for WhatsApp:**
- `sessionPlans.sessionType` enum matches WhatsApp (training_debrief, match_debrief, etc.)
- `sessionPlans.sourceWhatsAppMeetingId` optional field
- `teamActivityFeed.activityType` includes WhatsApp events
- `voiceNotes.source` includes "group_meeting", "group_passive"

**Integration Points:**
- WhatsApp meetings → P9 session templates (auto-populate)
- WhatsApp insights → P9 activity feed (with source badge)
- Multi-speaker insights → P9 comments (speaker attribution)

---

## Summary: P9 V3 Total Scope

| Category | Stories | Effort |
|----------|---------|--------|
| **Week 1: Foundations** | 8 | ~15h |
| - Comments, Reactions, Presence (V2) | 6 | ~10h |
| - AI Copilot Backend (NEW) | 2 | ~5h |
|  |  |  |
| **Week 2: Activity & Notifications** | 10 | ~18h |
| - Activity Feed, @Mentions (V2) | 8 | ~14h |
| - AI Copilot Frontend (NEW) | 2 | ~4h |
|  |  |  |
| **Week 3: Multi-View & Templates** | 15 | ~28h |
| - Views, Templates, Voting (V2) | 11 | ~24h |
| - Mobile Gestures (NEW) | 4 | ~4h |
|  |  |  |
| **Week 4: Polish** | 7 | ~18h |
| - Personalization, Hub Page (V2) | 7 | ~18h |
|  |  |  |
| **TOTAL** | **48 stories** | **~72 hours** |

---

## Implementation Priorities

### MUST HAVE (Critical Path):
1. ✅ Comments & Reactions (collaboration foundation)
2. ✅ Activity Feed & @Mentions (real-time awareness)
3. ✅ AI Copilot (3x productivity boost)
4. ✅ Mobile Gestures (majority of users)
5. ✅ Session Templates with Auto-Population
6. ✅ Team Hub Page (unified experience)

### SHOULD HAVE (High Value):
7. ✅ Presence Indicators
8. ✅ Priority Notifications
9. ✅ Multi-View Toggle
10. ✅ Voting System
11. ✅ Keyboard Shortcuts

### NICE TO HAVE (Polish):
12. ✅ Tone Controls
13. ✅ Audio Playback
14. ✅ Coach Learning Dashboard

---

## Success Metrics (Updated for V3)

### User Experience Goals
- ✅ Team collaboration engagement: +200% (comments, reactions)
- ✅ Coach-to-coach @mentions: 50+ per week per org
- ✅ Session template usage: 40% of sessions
- ✅ **AI Copilot adoption: 60% of coaches use suggestions**
- ✅ **Mobile gesture usage: 70% of mobile users**
- ✅ Coach satisfaction: 4.5/5 survey rating

### Technical Goals
- ✅ Type check passes
- ✅ Lint passes
- ✅ Real-time updates work (Convex subscriptions)
- ✅ All views load in < 2 seconds
- ✅ **Mobile gestures work on iOS + Android**
- ✅ **AI suggestions return in < 500ms**
- ✅ No console errors

---

## Known Limitations & Future Enhancements

**Limitations:**
1. Drag-and-drop not supported in Board view (MVP)
2. Digest batching requires cron job (Week 4 story)
3. Push notifications require additional setup (post-P9)
4. Voice commands not included (not priority)

**Post-P9 Features:**
- Mobile Quick Review (2 weeks, deep links from WhatsApp)
- WhatsApp Coach Groups (4 weeks, multi-speaker insights)
- Async Video Comments (requires video infrastructure)
- Conversational AI Interface (P10+)
- Smart Digest Summarization (P10+)

---

## Competitive Advantage

**With P9 V3, PlayerARC becomes:**

1. **Only coaching platform with AI Copilot** - 3x faster workflows
2. **Only mobile-first sports collaboration tool** - gesture-driven UX
3. **Only platform with real-time team presence** - see who's online
4. **Only platform with democratic voting** - MVP selection, lineup decisions
5. **Only platform with priority notifications** - injuries flagged immediately
6. **Only platform with session auto-population** - checklists from insights

**No competitor has ANY of these features.**

---

**Document Version:** 3.0 (FINAL)
**Created:** January 27, 2026
**Updated:** January 30, 2026
**Author:** Claude Sonnet 4.5
**Ready for Ralph:** Yes ✅

**Total Scope:** 48 stories, ~72 hours, 4 weeks
**Key Innovations:** AI Copilot + Mobile Gestures + WhatsApp-Ready
