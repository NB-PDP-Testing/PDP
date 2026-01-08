"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for VisuallyHidden
 */
export interface VisuallyHiddenProps {
  /** Content to hide visually but keep accessible to screen readers */
  children: React.ReactNode;
  /** HTML element to render as */
  as?: React.ElementType;
  /** Custom class name */
  className?: string;
}

/**
 * VisuallyHidden - Hide content visually but keep it accessible
 * 
 * This component hides content from visual users while keeping it
 * accessible to screen readers. Useful for:
 * - Icon-only buttons that need text labels
 * - Additional context for screen reader users
 * - Form field descriptions
 */
export function VisuallyHidden({
  children,
  as: Component = "span",
  className,
  ...props
}: VisuallyHiddenProps & React.HTMLAttributes<HTMLElement>) {
  return (
    <Component
      className={cn(
        "absolute h-px w-px p-0 -m-px overflow-hidden",
        "whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Alias for consistency with Radix UI naming
 */
export const ScreenReaderOnly = VisuallyHidden;