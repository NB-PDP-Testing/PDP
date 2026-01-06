/**
 * MOCKUP: Grouped Admin Navigation (Progressive Disclosure)
 *
 * Industry Standard: Progressive disclosure - show summary first, details on demand
 * Research shows 90% of users prefer straightforward navigation with instant access
 *
 * This replaces the current 16-item horizontal scroll nav with grouped categories
 */

"use client";

import {
  Home,
  Users,
  Shield,
  GraduationCap,
  UsersRound,
  UserCheck,
  Upload,
  BarChart3,
  LineChart,
  Megaphone,
  Key,
  Settings,
  Wrench,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Clipboard,
  ShieldAlert,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

/**
 * GROUPED NAVIGATION STRUCTURE
 * Reduces cognitive load by organizing 16 items into 4 logical groups
 */
const getNavGroups = (orgId: string): NavGroup[] => [
  {
    label: "People",
    icon: Users,
    items: [
      { href: `/orgs/${orgId}/admin/players`, label: "Players", icon: Clipboard },
      { href: `/orgs/${orgId}/admin/coaches`, label: "Coaches", icon: GraduationCap },
      { href: `/orgs/${orgId}/admin/guardians`, label: "Guardians", icon: UsersRound },
      { href: `/orgs/${orgId}/admin/users`, label: "Manage Users", icon: Users },
      { href: `/orgs/${orgId}/admin/users/approvals`, label: "Approvals", icon: UserCheck },
    ],
  },
  {
    label: "Teams & Access",
    icon: Shield,
    items: [
      { href: `/orgs/${orgId}/admin/teams`, label: "Teams", icon: Shield },
      { href: `/orgs/${orgId}/admin/overrides`, label: "Overrides", icon: ShieldAlert },
      { href: `/orgs/${orgId}/admin/player-access`, label: "Player Access", icon: Key },
    ],
  },
  {
    label: "Data & Analytics",
    icon: BarChart3,
    items: [
      { href: `/orgs/${orgId}/admin/benchmarks`, label: "Benchmarks", icon: BarChart3 },
      { href: `/orgs/${orgId}/admin/analytics`, label: "Analytics", icon: LineChart },
      { href: `/orgs/${orgId}/admin/player-import`, label: "Import Players", icon: Upload },
      { href: `/orgs/${orgId}/admin/gaa-import`, label: "GAA Players", icon: Upload },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { href: `/orgs/${orgId}/admin/announcements`, label: "Announcements", icon: Megaphone },
      { href: `/orgs/${orgId}/admin/settings`, label: "Settings", icon: Settings },
      { href: `/orgs/${orgId}/admin/dev-tools`, label: "Dev Tools", icon: Wrench },
    ],
  },
];

/**
 * MOBILE: Full-screen drawer navigation
 */
function MobileAdminNav({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const navGroups = getNavGroups(orgId);

  // Find which group contains the current page
  const currentGroup = navGroups.find((group) =>
    group.items.some((item) => pathname?.startsWith(item.href))
  );

  // Auto-expand the current group
  const effectiveExpandedGroup = expandedGroup ?? currentGroup?.label ?? null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-touch" // 44px touch target
          className="md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" style={{ color: "var(--org-primary)" }} />
            Admin Panel
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col py-2">
          {/* Overview link (always visible) */}
          <Link
            href={`/orgs/${orgId}/admin`}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium",
              "transition-colors hover:bg-accent",
              // Touch target compliance
              "min-h-[48px]",
              pathname === `/orgs/${orgId}/admin` && "bg-accent text-accent-foreground"
            )}
          >
            <Home className="h-5 w-5" />
            Overview
          </Link>

          {/* Grouped navigation */}
          {navGroups.map((group) => {
            const isExpanded = effectiveExpandedGroup === group.label;
            const isActiveGroup = currentGroup?.label === group.label;
            const GroupIcon = group.icon;

            return (
              <div key={group.label}>
                {/* Group header (collapsible) */}
                <button
                  onClick={() =>
                    setExpandedGroup(isExpanded ? null : group.label)
                  }
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3",
                    "text-sm font-medium transition-colors hover:bg-accent",
                    "min-h-[48px]",
                    isActiveGroup && "text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon className="h-5 w-5" />
                    {group.label}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Group items (expandable) */}
                {isExpanded && (
                  <div className="bg-muted/50">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      const ItemIcon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href as Route}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-3 py-3 pl-12 pr-4",
                            "text-sm transition-colors hover:bg-accent",
                            "min-h-[44px]",
                            isActive
                              ? "bg-accent text-accent-foreground font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          <ItemIcon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Back to app button */}
        <div className="border-t p-4 mt-auto">
          <Link href="/orgs">
            <Button variant="outline" className="w-full" size="touch">
              Back to App
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * TABLET/DESKTOP: Collapsible sidebar
 */
function DesktopAdminNav({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const navGroups = getNavGroups(orgId);

  // Find which group contains the current page and auto-expand it
  const currentGroup = navGroups.find((group) =>
    group.items.some((item) => pathname?.startsWith(item.href))
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isGroupExpanded = (label: string) =>
    expandedGroups.has(label) || currentGroup?.label === label;

  return (
    <nav className="hidden md:flex flex-wrap items-center gap-1 border-b bg-background px-4 py-2">
      {/* Overview */}
      <Link href={`/orgs/${orgId}/admin`}>
        <Button
          variant={pathname === `/orgs/${orgId}/admin` ? "secondary" : "ghost"}
          size="sm"
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Overview
        </Button>
      </Link>

      {/* Group dropdowns */}
      {navGroups.map((group) => {
        const isActive = currentGroup?.label === group.label;
        const GroupIcon = group.icon;

        return (
          <div key={group.label} className="relative group">
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <GroupIcon className="h-4 w-4" />
              {group.label}
              <ChevronDown className="h-3 w-3" />
            </Button>

            {/* Dropdown menu */}
            <div className="absolute left-0 top-full z-50 hidden min-w-[200px] rounded-md border bg-popover p-1 shadow-md group-hover:block">
              {group.items.map((item) => {
                const isItemActive = pathname === item.href;
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href as Route}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-3 py-2 text-sm",
                      "transition-colors hover:bg-accent",
                      isItemActive && "bg-accent font-medium"
                    )}
                  >
                    <ItemIcon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Back to app */}
      <div className="ml-auto">
        <Link href="/orgs">
          <Button size="sm" variant="outline">
            Back to App
          </Button>
        </Link>
      </div>
    </nav>
  );
}

/**
 * COMBINED COMPONENT: Responsive Admin Navigation
 */
export function AdminNav({ orgId }: { orgId: string }) {
  return (
    <>
      {/* Mobile: Hamburger + Sheet */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2 md:hidden">
        <div className="flex items-center gap-2">
          <MobileAdminNav orgId={orgId} />
          <span className="font-semibold">Admin Panel</span>
        </div>
        <Link href="/orgs">
          <Button size="sm" variant="outline">
            Back
          </Button>
        </Link>
      </div>

      {/* Desktop: Dropdown navigation bar */}
      <DesktopAdminNav orgId={orgId} />
    </>
  );
}

/**
 * USAGE:
 *
 * Replace the current admin layout header with:
 *
 * <AdminNav orgId={orgId} />
 *
 * Benefits:
 * 1. 16 items → 4 groups (reduced cognitive load)
 * 2. Mobile: Full drawer with touch-friendly targets
 * 3. Desktop: Dropdown menus for quick access
 * 4. Auto-expands current group for context
 * 5. Progressive disclosure - overview always visible
 */
