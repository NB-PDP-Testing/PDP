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
import { useEffect } from "react";
import { useQuickActionsContext } from "@/contexts/quick-actions-context";
import { UXAnalyticsEvents } from "@/hooks/use-ux-feature-flags";
import { useAnalytics } from "@/lib/analytics";

interface FABQuickActionsProps {
  onAssessPlayers: () => void;
  onGenerateSessionPlan: () => void;
  onViewAnalytics: () => void;
  onVoiceNotes: () => void;
  onInjuries: () => void;
  onGoals: () => void;
  onMedical: () => void;
  onMatchDay: () => void;
}

/**
 * Header Quick Actions Variant (formerly FAB)
 *
 * Registers quick actions with context to be displayed in the header bar.
 * The button appears next to "Back to App" in the coach layout header.
 * Action menu drops down from the header when clicked.
 *
 * This component doesn't render anything - it just provides actions to the context.
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
  const { setActions, clearActions } = useQuickActionsContext();

  // Register actions with context on mount
  useEffect(() => {
    const quickActions = [
      {
        id: "assess",
        icon: Edit,
        label: "Assess Players",
        title: "Rate player skills & performance",
        onClick: onAssessPlayers,
        color: "bg-blue-600 hover:bg-blue-700",
      },
      {
        id: "session-plan",
        icon: Target,
        label: "Generate Session Plan",
        title: "AI-powered training session",
        onClick: onGenerateSessionPlan,
        color: "bg-purple-600 hover:bg-purple-700",
      },
      {
        id: "analytics",
        icon: FileText,
        label: "View Analytics",
        title: "Team performance insights",
        onClick: onViewAnalytics,
        color: "bg-cyan-600 hover:bg-cyan-700",
      },
      {
        id: "voice-notes",
        icon: Mic,
        label: "Record Voice Note",
        title: "Quick audio observations",
        onClick: onVoiceNotes,
        color: "bg-green-600 hover:bg-green-700",
      },
      {
        id: "injuries",
        icon: AlertCircle,
        label: "Report Injury",
        title: "Track player injuries",
        onClick: onInjuries,
        color: "bg-red-600 hover:bg-red-700",
      },
      {
        id: "goals",
        icon: Heart,
        label: "Manage Goals",
        title: "Development objectives",
        onClick: onGoals,
        color: "bg-pink-600 hover:bg-pink-700",
      },
      {
        id: "medical",
        icon: Stethoscope,
        label: "View Medical Info",
        title: "Health & emergency details",
        onClick: onMedical,
        color: "bg-amber-600 hover:bg-amber-700",
      },
      {
        id: "match-day",
        icon: Target,
        label: "View Match Day",
        title: "Emergency contacts & info",
        onClick: onMatchDay,
        color: "bg-orange-600 hover:bg-orange-700",
      },
    ];

    setActions(quickActions);
    track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
      variant: "header-fab",
    });

    // Cleanup on unmount - clear actions so layout defaults show
    return () => clearActions();
  }, [
    onAssessPlayers,
    onGenerateSessionPlan,
    onViewAnalytics,
    onVoiceNotes,
    onInjuries,
    onGoals,
    onMedical,
    onMatchDay,
    setActions,
    clearActions,
    track,
  ]);

  // Component doesn't render anything - actions are displayed in header
  // The header layout shows the Quick Actions button and menu
  return null;
}
