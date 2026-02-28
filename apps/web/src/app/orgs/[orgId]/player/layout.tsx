"use client";

import { Heart, Home, Loader2, Menu, MessageSquare, User } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  BottomNav,
  type BottomNavItem,
  BottomNavSpacer,
} from "@/components/layout/bottom-nav";
import {
  PlayerMobileNav,
  PlayerSidebar,
} from "@/components/layout/player-sidebar";
import { RoleContextBadge } from "@/components/layout/role-context-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChildAccess } from "@/hooks/use-child-access";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();

  // Apply organization theme colors
  const { theme } = useOrgTheme();

  // Get UX feature flags
  const { adminNavStyle, useBottomNav } = useUXFeatureFlags();
  const useNewNav = adminNavStyle === "sidebar";

  // Child access authorization check
  const {
    isChildAccount,
    accessLevel,
    isLoading: childAccessLoading,
  } = useChildAccess(orgId);

  // Redirect youth accounts with revoked access
  useEffect(() => {
    if (!childAccessLoading && isChildAccount && accessLevel === "none") {
      router.replace(`/orgs/${orgId}/player/access-revoked` as Route);
    }
  }, [childAccessLoading, isChildAccount, accessLevel, orgId, router]);

  // Show loading while checking child access
  if (childAccessLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Player bottom nav items (4 primary items for mobile)
  const playerBottomNavItems: BottomNavItem[] = [
    {
      id: "overview",
      icon: Home,
      label: "Overview",
      href: `/orgs/${orgId}/player`,
    },
    {
      id: "profile",
      icon: User,
      label: "Profile",
      href: `/orgs/${orgId}/player/profile`,
    },
    {
      id: "health-check",
      icon: Heart,
      label: "Wellness",
      href: `/orgs/${orgId}/player/health-check`,
    },
    {
      id: "feedback",
      icon: MessageSquare,
      label: "Feedback",
      href: `/orgs/${orgId}/player/feedback`,
    },
  ];

  return (
    <>
      {/* Bottom navigation for mobile */}
      {useBottomNav && <BottomNav items={playerBottomNavItems} />}

      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {/* Mobile menu trigger */}
              {useNewNav && (
                <PlayerMobileNav
                  isChildAccount={isChildAccount}
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
                href={`/orgs/${orgId}/player` as Route}
              >
                <User className="h-5 w-5" style={{ color: theme.primary }} />
                <span className="font-semibold">Player Portal</span>
              </Link>
              {isChildAccount && (
                <Badge
                  className="hidden bg-purple-100 text-purple-700 text-xs sm:inline-flex"
                  variant="secondary"
                >
                  Youth Account
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <RoleContextBadge orgId={orgId} />
            </div>
          </div>
        </header>

        {/* Main layout with sidebar */}
        {useNewNav ? (
          <>
            <div className="flex flex-1">
              {/* Desktop Sidebar */}
              <PlayerSidebar
                isChildAccount={isChildAccount}
                orgId={orgId}
                primaryColor={theme.primary}
              />

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
