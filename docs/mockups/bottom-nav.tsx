/**
 * MOCKUP: Bottom Navigation Component
 *
 * Industry Standard: Bottom navigation increases engagement by 65% vs hamburger menus
 * Source: Nielsen Norman Group, Google Research
 *
 * This is a MOCKUP file showing the proposed implementation pattern.
 * Not production code - for review and discussion.
 */

"use client";

import { Home, Users, Plus, BarChart3, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isAction?: boolean;
}

interface BottomNavProps {
  items?: NavItem[];
  orgId?: string;
  onActionClick?: () => void;
}

/**
 * COACH BOTTOM NAV CONFIGURATION
 */
const coachNavItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/orgs/[orgId]/coach" },
  { icon: Users, label: "Players", href: "/orgs/[orgId]/coach/players" },
  { icon: Plus, label: "Assess", href: "#", isAction: true }, // Opens modal
  { icon: BarChart3, label: "Stats", href: "/orgs/[orgId]/coach/stats" },
  { icon: User, label: "Profile", href: "/profile" },
];

/**
 * PARENT BOTTOM NAV CONFIGURATION
 */
const parentNavItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/orgs/[orgId]/parents" },
  { icon: BarChart3, label: "Progress", href: "/orgs/[orgId]/parents/progress" },
  { icon: Plus, label: "Message", href: "#", isAction: true },
  { icon: Users, label: "Team", href: "/orgs/[orgId]/parents/team" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function BottomNav({ items = coachNavItems, orgId, onActionClick }: BottomNavProps) {
  const pathname = usePathname();

  const resolveHref = (href: string) => {
    if (orgId) {
      return href.replace("[orgId]", orgId);
    }
    return href;
  };

  return (
    <nav
      className={cn(
        // Fixed to bottom, full width
        "fixed bottom-0 left-0 right-0 z-50",
        // Background with blur effect (glassmorphism)
        "bg-background/95 backdrop-blur-lg",
        // Border and shadow
        "border-t border-border shadow-lg",
        // Safe area padding for notched phones
        "pb-safe"
      )}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => {
          const href = resolveHref(item.href);
          const isActive = pathname === href || pathname?.startsWith(href + "/");
          const Icon = item.icon;

          // Special handling for center action button
          if (item.isAction) {
            return (
              <button
                key={item.label}
                onClick={onActionClick}
                className={cn(
                  // Elevated FAB style
                  "flex flex-col items-center justify-center",
                  "relative -mt-6", // Lift above nav bar
                )}
              >
                <div
                  className={cn(
                    // Large touch target (56px = h-14)
                    "flex h-14 w-14 items-center justify-center",
                    "rounded-full bg-primary text-primary-foreground",
                    "shadow-lg shadow-primary/25",
                    // Hover/active states
                    "transition-transform active:scale-95"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mt-1 text-xs font-medium text-muted-foreground">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                // Touch target: 44px minimum (h-11 w-16)
                "flex h-14 w-16 flex-col items-center justify-center",
                // Transition for smooth state changes
                "transition-colors",
                // Active state
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  isActive && "text-primary"
                )}
              />
              <span
                className={cn(
                  "mt-1 text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * USAGE EXAMPLE:
 *
 * // In coach layout:
 * <BottomNav
 *   items={coachNavItems}
 *   orgId={orgId}
 *   onActionClick={() => setAssessmentModalOpen(true)}
 * />
 *
 * // In parent layout:
 * <BottomNav
 *   items={parentNavItems}
 *   orgId={orgId}
 *   onActionClick={() => setMessageModalOpen(true)}
 * />
 */

/**
 * CSS ADDITIONS NEEDED in index.css:
 *
 * // Safe area support for notched phones (iPhone X+)
 * .pb-safe {
 *   padding-bottom: env(safe-area-inset-bottom, 0);
 * }
 *
 * // Ensure content doesn't go behind bottom nav
 * main {
 *   padding-bottom: 5rem; // Height of bottom nav
 * }
 */
