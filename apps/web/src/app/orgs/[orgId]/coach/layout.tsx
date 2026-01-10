"use client";

import { CheckSquare, Home, Menu, Mic, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BottomNav,
  type BottomNavItem,
  BottomNavSpacer,
} from "@/components/layout/bottom-nav";
import {
  CoachMobileNav,
  CoachSidebar,
} from "@/components/layout/coach-sidebar";
import { Button } from "@/components/ui/button";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

export default function CoachLayout({
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

  // Debug: Log feature flag values
  console.log("[Coach Layout] Feature flags:", {
    adminNavStyle,
    useBottomNav,
    useNewNav,
  });

  // Coach bottom nav items
  const coachBottomNavItems: BottomNavItem[] = [
    {
      id: "overview",
      icon: Home,
      label: "Overview",
      href: `/orgs/${orgId}/coach`,
    },
    {
      id: "players",
      icon: Users,
      label: "Players",
      href: `/orgs/${orgId}/coach/players`,
    },
    {
      id: "voice",
      icon: Mic,
      label: "Voice",
      href: `/orgs/${orgId}/coach/voice-notes`,
    },
    {
      id: "todos",
      icon: CheckSquare,
      label: "Tasks",
      href: `/orgs/${orgId}/coach/todos`,
    },
  ];

  return (
    <>
      {/* Bottom navigation for mobile */}
      {useBottomNav && <BottomNav items={coachBottomNavItems} />}

      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              {useNewNav && (
                <CoachMobileNav
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
                href={`/orgs/${orgId}/coach` as Route}
              >
                <Users
                  className="h-5 w-5"
                  style={{ color: theme.primary }}
                />
                <span className="font-semibold">Coach Dashboard</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/orgs/${orgId}` as Route}>
                <Button size="sm" variant="outline">
                  Back to App
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main layout with sidebar */}
        {useNewNav ? (
          <>
            <div className="flex flex-1">
              {/* Desktop Sidebar */}
              <CoachSidebar orgId={orgId} primaryColor={theme.primary} />

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
    </>
  );
}
