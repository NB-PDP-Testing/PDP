import { useEffect } from "react";
import { type QuickAction, useQuickActionsContext } from "@/contexts/quick-actions-context";

/**
 * Hook for pages to register custom Quick Actions
 *
 * Usage:
 * ```tsx
 * usePageQuickActions([
 *   {
 *     id: "custom-action",
 *     icon: MyIcon,
 *     label: "Custom Action",
 *     onClick: handleAction,
 *     color: "bg-blue-600 hover:bg-blue-700",
 *   },
 * ]);
 * ```
 *
 * When the component unmounts, actions are cleared and layout defaults are restored.
 */
export function usePageQuickActions(actions: QuickAction[]) {
  const { setActions, clearActions } = useQuickActionsContext();

  useEffect(() => {
    if (actions.length > 0) {
      setActions(actions);
    }

    // Cleanup on unmount - restore default actions
    return () => clearActions();
  }, [actions, setActions, clearActions]);
}
