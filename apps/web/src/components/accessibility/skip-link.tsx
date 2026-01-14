"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for SkipLink
 */
export type SkipLinkProps = {
  /** Target element ID to skip to */
  targetId: string;
  /** Link text */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
};

/**
 * SkipLink - Accessibility skip link for keyboard users
 *
 * Features:
 * - Hidden by default, visible on focus
 * - Allows keyboard users to skip navigation
 * - WCAG 2.1 Level A requirement
 */
export function SkipLink({
  targetId,
  children = "Skip to main content",
  className,
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      className={cn(
        // Position offscreen by default
        "absolute top-0 left-0 z-[9999]",
        // Skip link styling
        "bg-background px-4 py-2 font-medium text-sm",
        "rounded-md border border-border shadow-lg",
        "text-foreground focus:outline-none",
        // Focus ring
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Visible on focus, hidden otherwise
        "-translate-y-full focus:left-4 focus:translate-y-4",
        "transition-transform duration-200",
        className
      )}
      href={`#${targetId}`}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

/**
 * SkipLinks - Multiple skip links for complex layouts
 */
export type SkipLinksItem = {
  targetId: string;
  label: string;
};

export type SkipLinksProps = {
  links: SkipLinksItem[];
  className?: string;
};

export function SkipLinks({ links, className }: SkipLinksProps) {
  return (
    <div className={cn("sr-only focus-within:not-sr-only", className)}>
      {links.map((link) => (
        <SkipLink key={link.targetId} targetId={link.targetId}>
          {link.label}
        </SkipLink>
      ))}
    </div>
  );
}
