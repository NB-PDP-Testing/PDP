"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for FocusRing
 */
export type FocusRingProps = {
  /** Content to wrap with focus ring */
  children: React.ReactNode;
  /** Whether the focus ring is currently visible */
  isFocused?: boolean;
  /** Ring color variant */
  variant?: "default" | "primary" | "destructive";
  /** Ring offset from the element */
  offset?: "none" | "sm" | "md";
  /** Custom class name */
  className?: string;
};

/**
 * FocusRing - Visible focus indicator wrapper
 *
 * Wraps content with a visible focus ring for keyboard navigation.
 * Use when the default :focus-visible styles are not sufficient.
 */
export function FocusRing({
  children,
  isFocused,
  variant = "default",
  offset = "sm",
  className,
}: FocusRingProps) {
  const ringClasses = cn(
    "rounded-md",
    isFocused && [
      "ring-2",
      offset === "none" && "ring-offset-0",
      offset === "sm" && "ring-offset-2",
      offset === "md" && "ring-offset-4",
      variant === "default" && "ring-ring",
      variant === "primary" && "ring-primary",
      variant === "destructive" && "ring-destructive",
    ],
    className
  );

  return <div className={ringClasses}>{children}</div>;
}

/**
 * Props for FocusableItem
 */
export interface FocusableItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether this item is focusable */
  focusable?: boolean;
  /** Callback when item receives focus */
  onFocusCapture?: () => void;
  /** Whether to prevent scroll on focus */
  preventScroll?: boolean;
}

/**
 * FocusableItem - Make any content focusable
 *
 * Adds tabIndex and focus handling to non-interactive elements
 */
export const FocusableItem = React.forwardRef<
  HTMLDivElement,
  FocusableItemProps
>(
  (
    {
      children,
      focusable = true,
      onFocusCapture,
      preventScroll,
      className,
      ...props
    },
    ref
  ) => (
    <div
      className={cn(
        "outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      onFocus={(e) => {
        onFocusCapture?.();
        if (preventScroll) {
          e.currentTarget.scrollIntoView({ block: "nearest" });
        }
      }}
      ref={ref}
      tabIndex={focusable ? 0 : -1}
      {...props}
    >
      {children}
    </div>
  )
);
FocusableItem.displayName = "FocusableItem";

/**
 * Hook to manage focus within a container
 */
export function useFocusWithin() {
  const [isFocusWithin, setIsFocusWithin] = React.useState(false);

  const handleFocus = () => setIsFocusWithin(true);
  const handleBlur = (e: React.FocusEvent) => {
    // Only blur if focus moved outside the container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsFocusWithin(false);
    }
  };

  return {
    isFocusWithin,
    focusWithinProps: {
      onFocus: handleFocus,
      onBlur: handleBlur,
    },
  };
}

/**
 * Hook to detect if user is using keyboard navigation
 */
export function useKeyboardNavigation() {
  const [isKeyboardUser, setIsKeyboardUser] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return isKeyboardUser;
}

/**
 * Focus trap utilities
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
    "[contenteditable]",
  ];

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors.join(","))
  ).filter((el) => {
    // Filter out hidden elements
    return el.offsetParent !== null;
  });
}

/**
 * Hook to trap focus within a container
 */
export function useFocusTrap(enabled = true) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!(enabled && containerRef.current)) {
      return;
    }

    const container = containerRef.current;
    const focusableElements = getFocusableElements(container);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements.at(-1);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") {
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    };

    // Focus first element on mount
    firstFocusable?.focus();

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled]);

  return containerRef;
}
