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
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/lib/analytics";
import { UXAnalyticsEvents } from "@/hooks/use-ux-feature-flags";

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

interface QuickAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
}

/**
 * FAB (Floating Action Button) Quick Actions Variant
 *
 * Material 3 inspired design:
 * - Green circular FAB (56×56px) fixed to bottom-right
 * - Opens expandable action menu on click
 * - All 8 quick actions available in menu
 * - Mobile-first with smooth animations
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
  const [isOpen, setIsOpen] = useState(false);
  const { track } = useAnalytics();

  // Track variant viewed on mount
  useEffect(() => {
    track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
      variant: "fab",
    });
  }, [track]);

  const actions: QuickAction[] = [
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
      icon: FileText,
      label: "Analytics",
      onClick: onViewAnalytics,
      color: "bg-cyan-600 hover:bg-cyan-700",
    },
    {
      icon: Mic,
      label: "Voice Notes",
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

  const handleFABClick = () => {
    setIsOpen(!isOpen);
    track(UXAnalyticsEvents.QUICK_ACTIONS_FAB_OPENED, {
      opened: !isOpen,
    });
  };

  const handleActionClick = (action: QuickAction) => {
    track(UXAnalyticsEvents.QUICK_ACTIONS_ACTION_CLICKED, {
      variant: "fab",
      action: action.label,
    });
    action.onClick();
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
        />
      )}

      {/* Action Menu - appears above FAB when open */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-56 space-y-2 rounded-lg bg-white p-3 shadow-2xl md:right-6">
          <div className="mb-2 flex items-center justify-between border-b pb-2">
            <span className="font-semibold text-gray-900 text-sm">
              Quick Actions
            </span>
            <Button
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {actions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-100"
                key={idx}
                onClick={() => handleActionClick(action)}
                type="button"
              >
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${action.color}`}
                >
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </div>
                <span className="font-medium text-gray-900 text-sm">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB Button - fixed bottom-right */}
      <Button
        className={`fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-emerald-600 p-0 shadow-lg transition-all hover:scale-110 hover:bg-emerald-700 active:scale-95 md:bottom-6 md:right-6 ${
          isOpen ? "rotate-45" : ""
        }`}
        onClick={handleFABClick}
        title="Quick Actions"
        type="button"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" strokeWidth={2.5} />
        ) : (
          <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
        )}
      </Button>
    </>
  );
}
