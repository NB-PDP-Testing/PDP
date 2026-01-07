"use client";

import {
  BarChart3,
  ChevronDown,
  Clipboard,
  GraduationCap,
  Home,
  Key,
  LineChart,
  Megaphone,
  Settings,
  Shield,
  ShieldAlert,
  Upload,
  UserCheck,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

/**
 * Generate admin navigation structure for an organization
 * Groups 16 items into logical categories for better UX
 */
export function getAdminNavGroups(orgId: string): NavGroup[] {
  return [
    {
      label: "People",
      icon: Users,
      items: [
        {
          href: `/orgs/${orgId}/admin/players`,
          label: "Players",
          icon: Clipboard,
        },
        {
          href: `/orgs/${orgId}/admin/coaches`,
          label: "Coaches",
          icon: GraduationCap,
        },
        {
          href: `/orgs/${orgId}/admin/guardians`,
          label: "Guardians",
          icon: UsersRound,
        },
        {
          href: `/orgs/${orgId}/admin/users`,
          label: "Manage Users",
          icon: Users,
        },
        {
          href: `/orgs/${orgId}/admin/users/approvals`,
          label: "Approvals",
          icon: UserCheck,
        },
      ],
    },
    {
      label: "Teams & Access",
      icon: Shield,
      items: [
        {
          href: `/orgs/${orgId}/admin/teams`,
          label: "Teams",
          icon: Shield,
        },
        {
          href: `/orgs/${orgId}/admin/overrides`,
          label: "Overrides",
          icon: ShieldAlert,
        },
        {
          href: `/orgs/${orgId}/admin/player-access`,
          label: "Player Access",
          icon: Key,
        },
      ],
    },
    {
      label: "Data & Import",
      icon: BarChart3,
      items: [
        {
          href: `/orgs/${orgId}/admin/analytics`,
          label: "Analytics",
          icon: LineChart,
        },
        {
          href: `/orgs/${orgId}/admin/benchmarks`,
          label: "Benchmarks",
          icon: BarChart3,
        },
        {
          href: `/orgs/${orgId}/admin/player-import`,
          label: "Import Players",
          icon: Upload,
        },
        {
          href: `/orgs/${orgId}/admin/gaa-import`,
          label: "GAA Players",
          icon: Upload,
        },
      ],
    },
    {
      label: "Settings",
      icon: Settings,
      items: [
        {
          href: `/orgs/${orgId}/admin/settings`,
          label: "Settings",
          icon: Settings,
        },
        {
          href: `/orgs/${orgId}/admin/announcements`,
          label: "Announcements",
          icon: Megaphone,
        },
        {
          href: `/orgs/${orgId}/admin/dev-tools`,
          label: "Dev Tools",
          icon: Wrench,
        },
      ],
    },
  ];
}

interface AdminSidebarProps {
  orgId: string;
  /** Primary color for active states */
  primaryColor?: string;
}

/**
 * Grouped sidebar navigation for admin panel (desktop)
 * Collapsible groups reduce cognitive load from 16 items to 4 groups
 */
export function AdminSidebar({ orgId, primaryColor }: AdminSidebarProps) {
  const pathname = usePathname();
  const navGroups = getAdminNavGroups(orgId);
  
  // Track which groups are expanded - auto-expand group containing current page
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    // Find which group contains the current page
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(item.href)) {
          return [group.label];
        }
      }
    }
    return ["People"]; // Default to first group
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const adminBase = `/orgs/${orgId}/admin`;
    if (href === adminBase) return pathname === adminBase;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-muted/30">
      <div className="flex h-full flex-col overflow-y-auto py-4">
        {/* Overview link */}
        <div className="px-3 mb-2">
          <Link href={`/orgs/${orgId}/admin` as Route}>
            <Button
              variant={pathname === `/orgs/${orgId}/admin` ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              style={
                pathname === `/orgs/${orgId}/admin` && primaryColor
                  ? {
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
                      borderColor: primaryColor,
                      borderWidth: "1px",
                    }
                  : undefined
              }
            >
              <Home className="h-4 w-4" />
              Overview
            </Button>
          </Link>
        </div>

        {/* Grouped navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {navGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.label);
            const hasActiveItem = group.items.some((item) => isActive(item.href));
            const GroupIcon = group.icon;

            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    hasActiveItem && "text-primary"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-4 w-4" />
                    {group.label}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link href={item.href as Route} key={item.href}>
                          <Button
                            variant={active ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start gap-2"
                            style={
                              active && primaryColor
                                ? {
                                    backgroundColor: `${primaryColor}15`,
                                    color: primaryColor,
                                    borderColor: primaryColor,
                                    borderWidth: "1px",
                                  }
                                : undefined
                            }
                          >
                            <ItemIcon className="h-4 w-4" />
                            {item.label}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

interface AdminMobileNavProps {
  orgId: string;
  primaryColor?: string;
  trigger?: React.ReactNode;
}

/**
 * Mobile navigation drawer for admin panel
 * Full-height sheet with grouped navigation
 */
export function AdminMobileNav({ orgId, primaryColor, trigger }: AdminMobileNavProps) {
  const pathname = usePathname();
  const navGroups = getAdminNavGroups(orgId);
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(item.href)) {
          return [group.label];
        }
      }
    }
    return ["People"];
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const adminBase = `/orgs/${orgId}/admin`;
    if (href === adminBase) return pathname === adminBase;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" style={{ color: primaryColor }} />
            Admin Panel
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col overflow-y-auto py-4">
          {/* Overview link */}
          <div className="px-3 mb-2">
            <Link
              href={`/orgs/${orgId}/admin` as Route}
              onClick={() => setOpen(false)}
            >
              <Button
                variant={pathname === `/orgs/${orgId}/admin` ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                style={
                  pathname === `/orgs/${orgId}/admin` && primaryColor
                    ? {
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                      }
                    : undefined
                }
              >
                <Home className="h-4 w-4" />
                Overview
              </Button>
            </Link>
          </div>

          {/* Grouped navigation */}
          <nav className="flex-1 space-y-1 px-3">
            {navGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.label);
              const hasActiveItem = group.items.some((item) => isActive(item.href));
              const GroupIcon = group.icon;

              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent",
                      hasActiveItem && "text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <GroupIcon className="h-5 w-5" />
                      {group.label}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {isExpanded && (
                    <div className="ml-5 mt-1 space-y-1 border-l pl-4">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <Link
                            href={item.href as Route}
                            key={item.href}
                            onClick={() => setOpen(false)}
                          >
                            <Button
                              variant={active ? "secondary" : "ghost"}
                              className="w-full justify-start gap-2 h-11"
                              style={
                                active && primaryColor
                                  ? {
                                      backgroundColor: `${primaryColor}15`,
                                      color: primaryColor,
                                    }
                                  : undefined
                              }
                            >
                              <ItemIcon className="h-4 w-4" />
                              {item.label}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
