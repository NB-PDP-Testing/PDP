"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Heart,
  Home,
  Menu,
  MessageSquare,
  Settings,
  Share2,
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

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Generate player portal navigation items for an organization
 */
export function getPlayerNavItems(orgId: string): NavItem[] {
  return [
    {
      href: `/orgs/${orgId}/player`,
      label: "Overview",
      icon: Home,
    },
    {
      href: `/orgs/${orgId}/player/profile`,
      label: "My Profile",
      icon: User,
    },
    {
      href: `/orgs/${orgId}/player/progress`,
      label: "My Progress",
      icon: TrendingUp,
    },
    {
      href: `/orgs/${orgId}/player/teams`,
      label: "My Teams",
      icon: Users,
    },
    {
      href: `/orgs/${orgId}/player/health-check`,
      label: "Daily Wellness",
      icon: Heart,
    },
    {
      href: `/orgs/${orgId}/player/injuries`,
      label: "My Injuries",
      icon: Activity,
    },
    {
      href: `/orgs/${orgId}/player/feedback`,
      label: "Coach Feedback",
      icon: MessageSquare,
    },
    {
      href: `/orgs/${orgId}/player/sharing`,
      label: "Passport Sharing",
      icon: Share2,
    },
    {
      href: `/orgs/${orgId}/player/settings`,
      label: "Settings",
      icon: Settings,
    },
  ];
}

type PlayerSidebarProps = {
  orgId: string;
  /** Primary color for active states */
  primaryColor?: string;
};

/**
 * Sidebar navigation for player portal (desktop)
 */
export function PlayerSidebar({ orgId, primaryColor }: PlayerSidebarProps) {
  const pathname = usePathname();
  const navItems = getPlayerNavItems(orgId);

  const isActive = (href: string) => {
    const playerBase = `/orgs/${orgId}/player`;
    if (href === playerBase) {
      return pathname === playerBase;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-muted/30">
      <div className="flex h-full flex-col overflow-y-auto py-4">
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
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
        </nav>
      </div>
    </aside>
  );
}

type PlayerMobileNavProps = {
  orgId: string;
  primaryColor?: string;
  trigger?: React.ReactNode;
};

/**
 * Mobile navigation drawer for player portal
 */
export function PlayerMobileNav({
  orgId,
  primaryColor,
  trigger,
}: PlayerMobileNavProps) {
  const pathname = usePathname();
  const navItems = getPlayerNavItems(orgId);
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    const playerBase = `/orgs/${orgId}/player`;
    if (href === playerBase) {
      return pathname === playerBase;
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
            <User className="h-5 w-5" style={{ color: primaryColor }} />
            Player Portal
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navigation menu for player portal sections
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col overflow-y-auto py-4">
          <nav aria-label="Player navigation" className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
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
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
