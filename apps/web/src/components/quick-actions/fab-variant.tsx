"use client";

import {
  AlertCircle,
  Edit,
  FileText,
  Heart,
  Mic,
  Stethoscope,
  Target,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useQuickActionsContext } from "@/contexts/quick-actions-context";
import { UXAnalyticsEvents } from "@/hooks/use-ux-feature-flags";
import { useAnalytics } from "@/lib/analytics";

type FABQuickActionsProps = {
  onAssessPlayers?: () => void;
  onGenerateSessionPlan?: () => void;
  onViewAnalytics?: () => void;
  onVoiceNotes?: () => void;
  onInjuries?: () => void;
  onGoals?: () => void;
  onMedical?: () => void;
  onMatchDay?: () => void;
};

/**
 * Header Quick Actions Variant (formerly FAB)
 *
 * Registers quick actions with context to be displayed in the header bar.
 * The button appears next to "Back to App" in the coach layout header.
 * Action menu drops down from the header when clicked.
 *
 * This component doesn't render anything - it just provides actions to the context.
 *
 * ## Implementation Notes:
 *
 * This component uses refs to prevent infinite render loops while keeping callbacks current:
 *
 * 1. **callbacksRef** - Stores the latest callback functions
 * 2. **Update Effect** - Keeps ref current without triggering re-registration
 * 3. **Registration Effect** - Runs ONCE on mount to register actions
 *
 * This pattern prevents:
 * - Infinite loops from callback dependencies
 * - Stale closures from empty dependency arrays
 * - PostHog rate limiting from repeated tracking
 *
 * See: docs/archive/bug-fixes/FIX_COMPARISON_OPTIONS_JAN_2026.md
 */
export function FABQuickActions({
  onAssessPlayers,
  onGenerateSessionPlan,
  onViewAnalytics,
  onVoiceNotes,
  onInjuries,
  onGoals,
  onMedical,
  onMatchDay,
}: FABQuickActionsProps) {
  const { track } = useAnalytics();
  const { setActions } = useQuickActionsContext();

  // Store latest callback references in a ref
  // This allows us to access current callbacks without triggering effects
  const callbacksRef = useRef({
    onAssessPlayers,
    onGenerateSessionPlan,
    onViewAnalytics,
    onVoiceNotes,
    onInjuries,
    onGoals,
    onMedical,
    onMatchDay,
  });

  // Update ref when callbacks change (no dependency array - runs on every render)
  // This is intentional and efficient: updating a ref doesn't trigger re-renders
  // and ensures onClick handlers always call the latest callback
  useEffect(() => {
    callbacksRef.current = {
      onAssessPlayers,
      onGenerateSessionPlan,
      onViewAnalytics,
      onVoiceNotes,
      onInjuries,
      onGoals,
      onMedical,
      onMatchDay,
    };
  });

  // Register actions ONCE on mount using ref for up-to-date callbacks
  // Empty dependency array is correct: we want registration to happen only once
  // The onClick handlers access callbacks via ref, so they always call the latest version
  useEffect(() => {
    const quickActions = [
      {
        id: "assess",
        icon: Edit,
        label: "Assess Players",
        title: "Rate player skills & performance",
        onClick: () => callbacksRef.current.onAssessPlayers?.(),
        color: "bg-blue-600 hover:bg-blue-700",
      },
      {
        id: "session-plan",
        icon: Target,
        label: "Generate Session Plan",
        title: "AI-powered training session",
        onClick: () => callbacksRef.current.onGenerateSessionPlan?.(),
        color: "bg-purple-600 hover:bg-purple-700",
      },
      {
        id: "analytics",
        icon: FileText,
        label: "View Analytics",
        title: "Team performance insights",
        onClick: () => callbacksRef.current.onViewAnalytics?.(),
        color: "bg-cyan-600 hover:bg-cyan-700",
      },
      {
        id: "voice-notes",
        icon: Mic,
        label: "Record Voice Note",
        title: "Quick audio observations",
        onClick: () => callbacksRef.current.onVoiceNotes?.(),
        color: "bg-green-600 hover:bg-green-700",
      },
      {
        id: "injuries",
        icon: AlertCircle,
        label: "Report Injury",
        title: "Track player injuries",
        onClick: () => callbacksRef.current.onInjuries?.(),
        color: "bg-red-600 hover:bg-red-700",
      },
      {
        id: "goals",
        icon: Heart,
        label: "Manage Goals",
        title: "Development objectives",
        onClick: () => callbacksRef.current.onGoals?.(),
        color: "bg-pink-600 hover:bg-pink-700",
      },
      {
        id: "medical",
        icon: Stethoscope,
        label: "View Medical Info",
        title: "Health & emergency details",
        onClick: () => callbacksRef.current.onMedical?.(),
        color: "bg-amber-600 hover:bg-amber-700",
      },
      {
        id: "match-day",
        icon: Target,
        label: "View Match Day",
        title: "Emergency contacts & info",
        onClick: () => callbacksRef.current.onMatchDay?.(),
        color: "bg-orange-600 hover:bg-orange-700",
      },
    ];

    setActions(quickActions);

    // Track analytics ONCE on mount (not on every render)
    track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
      variant: "header-fab",
    });

    // Don't clear actions on unmount - this prevents feedback loop with layout
    // The layout will handle setting default actions when needed
  }, [setActions, track]); // setActions and track are stable - won't cause re-runs

  // Component doesn't render anything - actions are displayed in header
  // The header layout shows the Quick Actions button and menu
  return null;
}
