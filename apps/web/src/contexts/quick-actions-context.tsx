"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
}

interface QuickActionsContextValue {
  actions: QuickAction[];
  setActions: (actions: QuickAction[]) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const QuickActionsContext = createContext<QuickActionsContextValue | null>(
  null
);

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <QuickActionsContext.Provider
      value={{ actions, setActions, isMenuOpen, setIsMenuOpen }}
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
