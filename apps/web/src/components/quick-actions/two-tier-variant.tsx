"use client";

import { useState, useEffect } from "react";
import {
  Edit,
  Target,
  Mic,
  Heart,
  FileText,
  AlertCircle,
  Stethoscope,
  MoreHorizontal,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAnalytics } from "@/lib/analytics";
import { UXAnalyticsEvents } from "@/hooks/use-ux-feature-flags";

interface TwoTierQuickActionsProps {
  onAssessPlayers: () => void;
  onGenerateSessionPlan: () => void;
  onViewAnalytics: () => void;
  onVoiceNotes: () => void;
  onInjuries: () => void;
  onGoals: () => void;
  onMedical: () => void;
  onMatchDay: () => void;
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
}

/**
 * Two-Tier Quick Actions Variant
 *
 * Progressive disclosure design:
 * - 3 large primary action tiles (most used)
 * - "More Actions" button opens bottom sheet with remaining 5 actions
 * - ~140px height for primary actions
 * - Prioritizes most common coach workflows
 */
export function TwoTierQuickActions({
  onAssessPlayers,
  onGenerateSessionPlan,
  onViewAnalytics,
  onVoiceNotes,
  onInjuries,
  onGoals,
  onMedical,
  onMatchDay,
}: TwoTierQuickActionsProps) {
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const { track } = useAnalytics();

  // Track variant viewed on mount
  useEffect(() => {
    track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
      variant: "two-tier",
    });
  }, [track]);

  // Primary actions (top 3 most important)
  const primaryActions: QuickAction[] = [
    {
      icon: Edit,
      label: "Assess Players",
      onClick: onAssessPlayers,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      icon: Target,
      label: "Session Plan",
      onClick: onGenerateSessionPlan,
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      icon: Mic,
      label: "Voice Notes",
      onClick: onVoiceNotes,
      color: "bg-green-600 hover:bg-green-700",
    },
  ];

  // Secondary actions (shown in "More Actions" sheet)
  const secondaryActions: QuickAction[] = [
    {
      icon: FileText,
      label: "Analytics",
      onClick: onViewAnalytics,
      color: "bg-cyan-600 hover:bg-cyan-700",
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

  const handleActionClick = (action: QuickAction, isPrimary: boolean) => {
    track(UXAnalyticsEvents.QUICK_ACTIONS_ACTION_CLICKED, {
      variant: "two-tier",
      action: action.label,
      tier: isPrimary ? "primary" : "secondary",
    });
    action.onClick();
    if (!isPrimary) {
      setIsMoreActionsOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="flex-shrink-0 text-yellow-600" size={20} />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {/* Primary Actions - 3 large tiles */}
          <div className="grid grid-cols-3 gap-3">
            {primaryActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <Button
                  className={`flex h-[100px] w-full flex-col items-center justify-center gap-2 rounded-xl px-2 py-4 text-white transition-all ${action.color} hover:scale-105 active:scale-95`}
                  key={idx}
                  onClick={() => handleActionClick(action, true)}
                  title={action.label}
                  type="button"
                >
                  <Icon className="h-8 w-8 flex-shrink-0" strokeWidth={2} />
                  <span className="line-clamp-2 text-center text-xs font-semibold leading-tight">
                    {action.label}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* More Actions Button */}
          <Button
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white py-4 text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100"
            onClick={() => setIsMoreActionsOpen(true)}
            type="button"
            variant="ghost"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="font-semibold text-sm">More Actions</span>
          </Button>
        </CardContent>
      </Card>

      {/* More Actions Sheet (mobile bottom sheet, desktop modal) */}
      <Sheet onOpenChange={setIsMoreActionsOpen} open={isMoreActionsOpen}>
        <SheetContent
          className="max-h-[80vh] overflow-y-auto"
          side="bottom"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Zap className="text-yellow-600" size={20} />
              More Actions
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {secondaryActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-gray-100 active:bg-gray-200"
                  key={idx}
                  onClick={() => handleActionClick(action, false)}
                  type="button"
                >
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${action.color}`}
                  >
                    <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-gray-900 text-base">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
