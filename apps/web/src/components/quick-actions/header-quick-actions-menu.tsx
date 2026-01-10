"use client";

import { X, Zap } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuickActionsContext } from "@/contexts/quick-actions-context";
import { UXAnalyticsEvents } from "@/hooks/use-ux-feature-flags";
import { useAnalytics } from "@/lib/analytics";

/**
 * Header Quick Actions Menu
 *
 * Triggered by a button in the header bar (next to "Back to App")
 * Shows action menu with all 8 quick actions
 */
export function HeaderQuickActionsMenu() {
  const { actions, isMenuOpen, setIsMenuOpen } = useQuickActionsContext();
  const { track } = useAnalytics();

  // Track variant viewed on mount
  useEffect(() => {
    if (actions.length > 0) {
      track(UXAnalyticsEvents.QUICK_ACTIONS_VARIANT_VIEWED, {
        variant: "header-fab",
      });
    }
  }, [track, actions.length]);

  const handleActionClick = (action: {
    label: string;
    onClick: () => void;
  }) => {
    track(UXAnalyticsEvents.QUICK_ACTIONS_ACTION_CLICKED, {
      variant: "header-fab",
      action: action.label,
    });
    action.onClick();
    setIsMenuOpen(false);
  };

  if (actions.length === 0) return null;

  return (
    <>
      {/* Backdrop when menu is open */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={() => setIsMenuOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsMenuOpen(false);
          }}
        />
      )}

      {/* Action Menu - appears below header button when open */}
      {isMenuOpen && (
        <div className="fixed top-16 right-4 z-50 w-64 space-y-2 rounded-lg bg-white p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between border-b pb-2">
            <span className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
              <Zap className="h-4 w-4 text-yellow-600" />
              Quick Actions
            </span>
            <Button
              className="h-6 w-6"
              onClick={() => setIsMenuOpen(false)}
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
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">
                    {action.label}
                  </div>
                  {action.title && (
                    <div className="text-gray-600 text-xs leading-tight">
                      {action.title}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
