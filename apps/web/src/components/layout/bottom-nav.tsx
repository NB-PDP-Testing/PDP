"use client";

import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type BottomNavItem = {
  /** Unique identifier */
  id: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Label shown when active (active-only labels for cleaner look) */
  label: string;
  /** Navigation href */
  href: string;
  /** Whether this is a primary action button (elevated, centered) */
  isAction?: boolean;
  /** Optional badge count */
  badge?: number;
};

type BottomNavProps = {
  /** Navigation items (max 5 recommended) */
  items: BottomNavItem[];
  /** Custom class name */
  className?: string;
  /** Callback when action button is clicked (for items with isAction=true) */
  onActionClick?: (item: BottomNavItem) => void;
};

/**
 * Mobile bottom navigation component
 *
 * Industry standard: 72% of users prefer bottom navigation over hamburger menus
 * Touch targets: 44px+ minimum for accessibility
 * Labels: Shown on active item only for cleaner look
 *
 * @see https://blog.appmysite.com/bottom-navigation-bar-in-mobile-apps-heres-all-you-need-to-know/
 */
export function BottomNav({ items, className, onActionClick }: BottomNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Wait for client-side mount to use portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine which item is active based on pathname
  const getIsActive = (item: BottomNavItem) => {
    if (item.href === "/") {
      return pathname === "/";
    }

    // For overview/dashboard buttons (id="overview"), only match exact pathname
    if (item.id === "overview") {
      return pathname === item.href;
    }

    // For all other routes, check exact match or child routes
    if (pathname === item.href) {
      return true;
    }
    return pathname.startsWith(`${item.href}/`);
  };

  const navContent = (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden",
        className
      )}
    >
      <div className="safe-area-pb flex h-16 items-center justify-around px-2">
        {items.map((item) => {
          const isActive = getIsActive(item);
          const Icon = item.icon;

          // Action button (elevated, centered - like FAB)
          if (item.isAction) {
            return (
              <button
                aria-label={item.label}
                className="-mt-4 relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
                key={item.id}
                onClick={() => onActionClick?.(item)}
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          }

          // Regular nav item
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-14 w-14 flex-col items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              href={item.href as Route}
              key={item.id}
            >
              <div className="relative">
                <Icon className="h-6 w-6" />
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <span className="-right-2 -top-1 absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-medium text-[10px] text-destructive-foreground">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              {/* Active-only label for cleaner look */}
              {isActive && (
                <span className="mt-0.5 font-medium text-[10px]">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  // Use portal to render at body level, ensuring fixed positioning works
  if (!mounted) {
    return null;
  }

  return createPortal(navContent, document.body);
}

/**
 * Spacer component to prevent content from being hidden behind bottom nav
 * Add this at the end of your page content on mobile
 */
export function BottomNavSpacer({ className }: { className?: string }) {
  return <div className={cn("h-16 md:hidden", className)} />;
}
