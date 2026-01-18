"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Calendar,
  ChevronDown,
  ClipboardList,
  HeartPulse,
  Home,
  Menu,
  Mic,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

/**
 * Generate coach navigation structure for an organization
 */
export function getCoachNavGroups(orgId: string): NavGroup[] {
  return [
    {
      label: "Players",
      icon: Users,
      items: [
        {
          href: `/orgs/${orgId}/coach`,
          label: "Overview",
          icon: Home,
        },
        {
          href: `/orgs/${orgId}/coach/players`,
          label: "My Players",
          icon: Users,
        },
        {
          href: `/orgs/${orgId}/coach/assess`,
          label: "Assessments",
          icon: ClipboardList,
        },
        {
          href: `/orgs/${orgId}/coach/shared-passports`,
          label: "Shared Passports",
          icon: Share2,
        },
      ],
    },
    {
      label: "Development",
      icon: TrendingUp,
      items: [
        {
          href: `/orgs/${orgId}/coach/goals`,
          label: "Goals",
          icon: TrendingUp,
        },
        {
          href: `/orgs/${orgId}/coach/voice-notes`,
          label: "Voice Notes",
          icon: Mic,
        },
        {
          href: `/orgs/${orgId}/coach/session-plans`,
          label: "Session Plans",
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Health & Attendance",
      icon: HeartPulse,
      items: [
        {
          href: `/orgs/${orgId}/coach/injuries`,
          label: "Injuries",
          icon: Activity,
        },
        {
          href: `/orgs/${orgId}/coach/medical`,
          label: "Medical Info",
          icon: HeartPulse,
        },
        {
          href: `/orgs/${orgId}/coach/match-day`,
          label: "Match Day",
          icon: Calendar,
        },
      ],
    },
  ];
}

type CoachSidebarProps = {
  orgId: string;
  /** Primary color for active states */
  primaryColor?: string;
};

/**
 * Grouped sidebar navigation for coach panel (desktop)
 */
export function CoachSidebar({ orgId, primaryColor }: CoachSidebarProps) {
  const pathname = usePathname();
  const navGroups = getCoachNavGroups(orgId);

  // Track which groups are expanded - auto-expand group containing current page
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
          return [group.label];
        }
      }
    }
    return ["Players"]; // Default to first group
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const coachBase = `/orgs/${orgId}/coach`;
    if (href === coachBase) {
      return pathname === coachBase;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-muted/30">
      <div className="flex h-full flex-col overflow-y-auto py-4">
        {/* Grouped navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {navGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.label);
            const hasActiveItem = group.items.some((item) =>
              isActive(item.href)
            );
            const GroupIcon = group.icon;

            return (
              <div key={group.label}>
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 font-medium text-sm transition-colors hover:bg-accent",
                    hasActiveItem && "text-primary"
                  )}
                  onClick={() => toggleGroup(group.label)}
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
                  <div className="mt-1 ml-4 space-y-1 border-l pl-3">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link href={item.href as Route} key={item.href}>
                          <Button
                            className="w-full justify-start gap-2"
                            size="sm"
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
                            variant={active ? "secondary" : "ghost"}
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

type CoachMobileNavProps = {
  orgId: string;
  primaryColor?: string;
  trigger?: React.ReactNode;
};

/**
 * Mobile navigation drawer for coach panel
 */
export function CoachMobileNav({
  orgId,
  primaryColor,
  trigger,
}: CoachMobileNavProps) {
  const pathname = usePathname();
  const navGroups = getCoachNavGroups(orgId);
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
          return [group.label];
        }
      }
    }
    return ["Players"];
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const coachBase = `/orgs/${orgId}/coach`;
    if (href === coachBase) {
      return pathname === coachBase;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        {trigger || (
          <Button className="lg:hidden" size="icon" variant="ghost">
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-80 p-0" side="left">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList
              className="h-5 w-5"
              style={{ color: primaryColor }}
            />
            Coach Dashboard
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu for coach dashboard sections
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col overflow-y-auto py-4">
          {/* Grouped navigation */}
          <nav className="flex-1 space-y-1 px-3">
            {navGroups.map((group) => {
              const isExpanded = expandedGroups.includes(group.label);
              const hasActiveItem = group.items.some((item) =>
                isActive(item.href)
              );
              const GroupIcon = group.icon;

              return (
                <div key={group.label}>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-3 font-medium text-sm transition-colors hover:bg-accent",
                      hasActiveItem && "text-primary"
                    )}
                    onClick={() => toggleGroup(group.label)}
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
                    <div className="mt-1 ml-5 space-y-1 border-l pl-4">
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
                              className="h-11 w-full justify-start gap-2"
                              style={
                                active && primaryColor
                                  ? {
                                      backgroundColor: `${primaryColor}15`,
                                      color: primaryColor,
                                    }
                                  : undefined
                              }
                              variant={active ? "secondary" : "ghost"}
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
