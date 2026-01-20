"use client";

import { Award, Heart, Home, Menu, TrendingUp, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BottomNav,
  type BottomNavItem,
  BottomNavSpacer,
} from "@/components/layout/bottom-nav";
import {
  ParentMobileNav,
  ParentSidebar,
} from "@/components/layout/parent-sidebar";
import { TabNotificationProvider } from "@/components/providers/tab-notification-provider";
import { Button } from "@/components/ui/button";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

export default function ParentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params.orgId as string;

  // Apply organization theme colors
  const { theme } = useOrgTheme();

  // Get UX feature flags
  const { adminNavStyle, useBottomNav } = useUXFeatureFlags();
  const useNewNav = adminNavStyle === "sidebar";

  // Parent bottom nav items
  const parentBottomNavItems: BottomNavItem[] = [
    {
      id: "overview",
      icon: Home,
      label: "Overview",
      href: `/orgs/${orgId}/parents`,
    },
    {
      id: "children",
      icon: Users,
      label: "Children",
      href: `/orgs/${orgId}/parents/children`,
    },
    {
      id: "progress",
      icon: TrendingUp,
      label: "Progress",
      href: `/orgs/${orgId}/parents/progress`,
    },
    {
      id: "achievements",
      icon: Award,
      label: "Achievements",
      href: `/orgs/${orgId}/parents/achievements`,
    },
  ];

  return (
    <TabNotificationProvider orgId={orgId}>
      {/* Bottom navigation for mobile */}
      {useBottomNav && <BottomNav items={parentBottomNavItems} />}

      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              {useNewNav && (
                <ParentMobileNav
                  orgId={orgId}
                  primaryColor={theme.primary}
                  trigger={
                    <Button className="lg:hidden" size="icon" variant="ghost">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  }
                />
              )}

              {/* Logo/Title */}
              <Link
                className="flex items-center gap-2"
                href={`/orgs/${orgId}/parents` as Route}
              >
                <Heart className="h-5 w-5" style={{ color: theme.primary }} />
                <span className="font-semibold">Parent Portal</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {/* Reserved for future actions */}
            </div>
          </div>
        </header>

        {/* Main layout with sidebar */}
        {useNewNav ? (
          <>
            <div className="flex flex-1">
              {/* Desktop Sidebar */}
              <ParentSidebar orgId={orgId} primaryColor={theme.primary} />

              {/* Main Content */}
              <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
                {children}
              </main>
            </div>

            {useBottomNav && <BottomNavSpacer className="lg:hidden" />}
          </>
        ) : (
          /* Legacy layout - simple container */
          <>
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
              {children}
            </main>
            {useBottomNav && <BottomNavSpacer />}
          </>
        )}
      </div>
    </TabNotificationProvider>
  );
}
