"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ChevronDown,
  Clipboard,
  ClipboardList,
  GraduationCap,
  Home,
  Inbox,
  Key,
  LineChart,
  Megaphone,
  Menu,
  MessageSquare,
  Mic,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  Upload,
  UserCheck,
  Users,
  UsersRound,
  Wrench,
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

type NavGroupOptions = {
  /** Whether to show the Enquiries link (shown when enquiry mode is enabled or default) */
  showEnquiries?: boolean;
};

/**
 * Generate admin navigation structure for an organization
 * Groups items into logical categories for better UX
 */
export function getAdminNavGroups(
  orgId: string,
  options: NavGroupOptions = {}
): NavGroup[] {
  const { showEnquiries = true } = options;
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
      label: "Content & Training",
      icon: Clipboard,
      items: [
        {
          href: `/orgs/${orgId}/admin/session-plans`,
          label: "Session Plans",
          icon: ClipboardList,
        },
        {
          href: `/orgs/${orgId}/admin/voice-notes`,
          label: "Voice Notes",
          icon: Mic,
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
          href: `/orgs/${orgId}/admin/sharing`,
          label: "Passport Sharing",
          icon: Share2,
        },
        // Enquiries link - only shown when enquiry mode is enabled (or default)
        ...(showEnquiries
          ? [
              {
                href: `/orgs/${orgId}/admin/enquiries`,
                label: "Enquiries",
                icon: Inbox,
              },
            ]
          : []),
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
          href: `/orgs/${orgId}/admin/messaging`,
          label: "Messaging",
          icon: MessageSquare,
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

type AdminSidebarProps = {
  orgId: string;
  /** Primary color for active states */
  primaryColor?: string;
  /** When true, removes fixed width (for use inside ResizableSidebar) */
  isResizable?: boolean;
};

/**
 * Grouped sidebar navigation for admin panel (desktop)
 * Collapsible groups reduce cognitive load from 16 items to 4 groups
 */
export function AdminSidebar({
  orgId,
  primaryColor,
  isResizable = false,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // Fetch org data to determine if enquiries should be shown
  const organization = useQuery(api.models.organizations.getOrganization, {
    organizationId: orgId,
  });

  // Show enquiries when mode is "enquiry" or not set (null/undefined = default to enquiry)
  const showEnquiries =
    !organization?.sharingContactMode ||
    organization.sharingContactMode === "enquiry";

  const navGroups = getAdminNavGroups(orgId, { showEnquiries });

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
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const adminBase = `/orgs/${orgId}/admin`;
    if (href === adminBase) {
      return pathname === adminBase;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:bg-muted/30",
        // Only apply fixed width and border when NOT in resizable mode
        !isResizable && "lg:w-64 lg:border-r"
      )}
    >
      <div className="flex h-full flex-col overflow-y-auto py-4">
        {/* Overview link */}
        <div className="mb-2 px-3">
          <Link href={`/orgs/${orgId}/admin` as Route}>
            <Button
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
              variant={
                pathname === `/orgs/${orgId}/admin` ? "secondary" : "ghost"
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

type AdminMobileNavProps = {
  orgId: string;
  primaryColor?: string;
  trigger?: React.ReactNode;
};

/**
 * Mobile navigation drawer for admin panel
 * Full-height sheet with grouped navigation
 */
export function AdminMobileNav({
  orgId,
  primaryColor,
  trigger,
}: AdminMobileNavProps) {
  const pathname = usePathname();

  // Fetch org data to determine if enquiries should be shown
  const organization = useQuery(api.models.organizations.getOrganization, {
    organizationId: orgId,
  });

  // Show enquiries when mode is "enquiry" or not set (null/undefined = default to enquiry)
  const showEnquiries =
    !organization?.sharingContactMode ||
    organization.sharingContactMode === "enquiry";

  const navGroups = getAdminNavGroups(orgId, { showEnquiries });
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
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const adminBase = `/orgs/${orgId}/admin`;
    if (href === adminBase) {
      return pathname === adminBase;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            aria-label="Open navigation menu"
            className="lg:hidden"
            data-testid="hamburger-menu"
            size="icon"
            variant="ghost"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-80 p-0" data-testid="mobile-menu" side="left">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" style={{ color: primaryColor }} />
            Admin Panel
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu for admin panel sections
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col overflow-y-auto py-4">
          {/* Overview link */}
          <div className="mb-2 px-3">
            <Link
              href={`/orgs/${orgId}/admin` as Route}
              onClick={() => setOpen(false)}
            >
              <Button
                className="w-full justify-start gap-2"
                style={
                  pathname === `/orgs/${orgId}/admin` && primaryColor
                    ? {
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                      }
                    : undefined
                }
                variant={
                  pathname === `/orgs/${orgId}/admin` ? "secondary" : "ghost"
                }
              >
                <Home className="h-4 w-4" />
                Overview
              </Button>
            </Link>
          </div>

          {/* Grouped navigation */}
          <nav aria-label="Admin navigation" className="flex-1 space-y-1 px-3">
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
