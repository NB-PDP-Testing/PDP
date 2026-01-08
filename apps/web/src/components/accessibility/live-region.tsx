"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for LiveRegion
 */
export interface LiveRegionProps {
  /** Content to announce */
  children?: React.ReactNode;
  /** ARIA live politeness level */
  "aria-live"?: "polite" | "assertive" | "off";
  /** Whether updates are atomic */
  "aria-atomic"?: boolean;
  /** What changes are relevant */
  "aria-relevant"?: "additions" | "removals" | "text" | "all";
  /** Custom class name */
  className?: string;
  /** Role for the region */
  role?: "status" | "alert" | "log" | "marquee" | "timer";
}

/**
 * LiveRegion - ARIA live region for dynamic announcements
 *
 * Use this to announce changes to screen readers:
 * - Form validation errors
 * - Loading states
 * - Success/error messages
 * - Dynamic content updates
 */
export function LiveRegion({
  children,
  "aria-live": ariaLive = "polite",
  "aria-atomic": ariaAtomic = true,
  "aria-relevant": ariaRelevant = "additions",
  role = "status",
  className,
}: LiveRegionProps) {
  return (
    <div
      aria-atomic={ariaAtomic}
      aria-live={ariaLive}
      aria-relevant={ariaRelevant}
      className={cn(
        "-m-px absolute h-px w-px overflow-hidden p-0",
        "whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        className
      )}
      role={role}
    >
      {children}
    </div>
  );
}

/**
 * Announcer context for programmatic announcements
 */
interface AnnouncerContextValue {
  announce: (message: string, options?: AnnounceOptions) => void;
  announcePolite: (message: string) => void;
  announceAssertive: (message: string) => void;
}

interface AnnounceOptions {
  politeness?: "polite" | "assertive";
  clearAfter?: number;
}

const AnnouncerContext = React.createContext<AnnouncerContextValue | null>(
  null
);

/**
 * Hook to access the announcer
 */
export function useAnnouncer() {
  const context = React.useContext(AnnouncerContext);
  if (!context) {
    throw new Error("useAnnouncer must be used within an AnnouncerProvider");
  }
  return context;
}

/**
 * Props for AnnouncerProvider
 */
export interface AnnouncerProviderProps {
  children: React.ReactNode;
}

/**
 * AnnouncerProvider - Provides programmatic screen reader announcements
 *
 * Usage:
 * ```tsx
 * const { announce } = useAnnouncer();
 *
 * // Polite announcement (default)
 * announce("Your changes have been saved");
 *
 * // Assertive announcement (interrupts)
 * announce("Error: Please fix the form", { politeness: "assertive" });
 * ```
 */
export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = React.useState("");
  const [assertiveMessage, setAssertiveMessage] = React.useState("");

  const announce = React.useCallback(
    (message: string, options: AnnounceOptions = {}) => {
      const { politeness = "polite", clearAfter = 1000 } = options;

      if (politeness === "assertive") {
        setAssertiveMessage(message);
        if (clearAfter > 0) {
          setTimeout(() => setAssertiveMessage(""), clearAfter);
        }
      } else {
        setPoliteMessage(message);
        if (clearAfter > 0) {
          setTimeout(() => setPoliteMessage(""), clearAfter);
        }
      }
    },
    []
  );

  const announcePolite = React.useCallback(
    (message: string) => {
      announce(message, { politeness: "polite" });
    },
    [announce]
  );

  const announceAssertive = React.useCallback(
    (message: string) => {
      announce(message, { politeness: "assertive" });
    },
    [announce]
  );

  const value = React.useMemo(
    () => ({ announce, announcePolite, announceAssertive }),
    [announce, announcePolite, announceAssertive]
  );

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <LiveRegion aria-live="polite" role="status">
        {politeMessage}
      </LiveRegion>
      <LiveRegion aria-live="assertive" role="alert">
        {assertiveMessage}
      </LiveRegion>
    </AnnouncerContext.Provider>
  );
}
