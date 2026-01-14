"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

export type QuickAction = {
  id: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
  /** Optional title/description for tooltip or additional context */
  title?: string;
};

type QuickActionsContextValue = {
  actions: QuickAction[];
  setActions: (actions: QuickAction[]) => void;
  clearActions: () => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
};

const QuickActionsContext = createContext<QuickActionsContextValue | null>(
  null
);

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const clearActions = () => setActions([]);

  return (
    <QuickActionsContext.Provider
      value={{ actions, setActions, clearActions, isMenuOpen, setIsMenuOpen }}
    >
      {children}
    </QuickActionsContext.Provider>
  );
}

export function useQuickActionsContext() {
  const context = useContext(QuickActionsContext);
  if (!context) {
    throw new Error(
      "useQuickActionsContext must be used within QuickActionsProvider"
    );
  }
  return context;
}
