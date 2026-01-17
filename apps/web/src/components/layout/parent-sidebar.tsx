"use client";

import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  ChevronDown,
  Heart,
  Home,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  TrendingUp,
  User,
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
 * Generate parent navigation structure for an organization
 */
export function getParentNavGroups(orgId: string): NavGroup[] {
  return [
    {
      label: "Children",
      icon: Users,
      items: [
        {
          href: `/orgs/${orgId}/parents`,
          label: "Overview",
          icon: Home,
        },
        {
          href: `/orgs/${orgId}/parents/children`,
          label: "My Children",
          icon: Users,
        },
        {
          href: `/orgs/${orgId}/parents/progress`,
          label: "Progress",
          icon: TrendingUp,
        },
        {
          href: `/orgs/${orgId}/parents/sharing`,
          label: "Passport Sharing",
          icon: Shield,
        },
      ],
    },
    {
      label: "Updates",
      icon: Bell,
      items: [
        {
          href: `/orgs/${orgId}/parents/achievements`,
          label: "Achievements",
          icon: Award,
        },
        {
          href: `/orgs/${orgId}/parents/messages`,
          label: "Messages",
          icon: MessageSquare,
        },
        {
          href: `/orgs/${orgId}/parents/announcements`,
          label: "Announcements",
          icon: Bell,
        },
      ],
    },
    {
      label: "Account",
      icon: Settings,
      items: [
        {
          href: `/orgs/${orgId}/parents/profile`,
          label: "Profile",
          icon: User,
        },
        {
          href: `/orgs/${orgId}/parents/settings`,
          label: "Settings",
          icon: Settings,
        },
      ],
    },
  ];
}

type ParentSidebarProps = {
  orgId: string;
  /** Primary color for active states */
  primaryColor?: string;
};

/**
 * Grouped sidebar navigation for parent portal (desktop)
 */
export function ParentSidebar({ orgId, primaryColor }: ParentSidebarProps) {
  const pathname = usePathname();
  const navGroups = getParentNavGroups(orgId);

  // Track which groups are expanded - auto-expand group containing current page
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
          return [group.label];
        }
      }
    }
    return ["Children"]; // Default to first group
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const parentBase = `/orgs/${orgId}/parents`;
    if (href === parentBase) {
      return pathname === parentBase;
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
                  type="button"
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

type ParentMobileNavProps = {
  orgId: string;
  primaryColor?: string;
  trigger?: React.ReactNode;
};

/**
 * Mobile navigation drawer for parent portal
 */
export function ParentMobileNav({
  orgId,
  primaryColor,
  trigger,
}: ParentMobileNavProps) {
  const pathname = usePathname();
  const navGroups = getParentNavGroups(orgId);
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
          return [group.label];
        }
      }
    }
    return ["Children"];
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const parentBase = `/orgs/${orgId}/parents`;
    if (href === parentBase) {
      return pathname === parentBase;
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
            <Heart className="h-5 w-5" style={{ color: primaryColor }} />
            Parent Portal
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu for parent portal sections
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
                    type="button"
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
