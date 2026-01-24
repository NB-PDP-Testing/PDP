"use client";

import {
  AlertCircle,
  Edit,
  FileText,
  Heart,
  Mic,
  Stethoscope,
  Target,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionPlanContext } from "@/contexts/session-plan-context";
import { UXAnalyticsEvents } from "@/hooks/use-ux-feature-flags";
import { useAnalytics } from "@/lib/analytics";

type HorizontalScrollQuickActionsProps = {
  onAssessPlayers: () => void;
  onViewAnalytics: () => void;
  onVoiceNotes: () => void;
  onInjuries: () => void;
  onGoals: () => void;
  onMedical: () => void;
  onMatchDay: () => void;
};

type QuickAction = {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
};

/**
 * Horizontal Scroll Quick Actions Variant
 *
 * Icon-only horizontal scroll design:
 * - ~70px height (compact)
 * - Icon + label below (vertical layout)
 * - Horizontal scroll for 7-8 icons
 * - Touch-friendly with swipe
 * - Similar to iOS Control Center shortcuts
 *
 * Session Plan uses SessionPlanContext for consistent behavior (Issue #234)
 */
export function HorizontalScrollQuickActions({
  onAssessPlayers,
  onViewAnalytics,
  onVoiceNotes,
  onInjuries,
  onGoals,
  onMedical,
  onMatchDay,
}: HorizontalScrollQuickActionsProps) {
  const { track } = useAnalytics();
  const { openSessionPlanModal } = useSessionPlanContext();

  // Track variant viewed on mount
  useEffect(() => {
    track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
      variant: "horizontal",
    });
  }, [track]);

  const actions: QuickAction[] = [
    {
      icon: Edit,
      label: "Assess",
      onClick: onAssessPlayers,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      icon: Target,
      label: "Session Plan",
      onClick: openSessionPlanModal,
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      icon: FileText,
      label: "Analytics",
      onClick: onViewAnalytics,
      color: "bg-cyan-600 hover:bg-cyan-700",
    },
    {
      icon: Mic,
      label: "Voice",
      onClick: onVoiceNotes,
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      icon: AlertCircle,
      label: "Injuries",
      onClick: onInjuries,
      color: "bg-red-600 hover:bg-red-700",
    },
    {
      icon: Heart,
      label: "Goals",
      onClick: onGoals,
      color: "bg-pink-600 hover:bg-pink-700",
    },
    {
      icon: Stethoscope,
      label: "Medical",
      onClick: onMedical,
      color: "bg-amber-600 hover:bg-amber-700",
    },
    {
      icon: Target,
      label: "Match Day",
      onClick: onMatchDay,
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ];

  const handleActionClick = (action: QuickAction) => {
    track(UXAnalyticsEvents.QUICK_ACTIONS_ACTION_CLICKED, {
      variant: "horizontal",
      action: action.label,
    });
    action.onClick();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Zap className="flex-shrink-0 text-yellow-600" size={20} />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                className={`flex h-[80px] w-[72px] flex-shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-white transition-all ${action.color} hover:scale-105 active:scale-95`}
                key={action.label}
                onClick={() => handleActionClick(action)}
                title={action.label}
                type="button"
              >
                <Icon className="h-7 w-7 flex-shrink-0" strokeWidth={2} />
                <span className="w-full truncate text-center font-semibold text-[10px] leading-tight">
                  {action.label}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>

      {/* Custom CSS for hiding scrollbar while keeping scroll functionality */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Card>
  );
}
