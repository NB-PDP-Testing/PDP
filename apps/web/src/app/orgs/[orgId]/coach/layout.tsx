"use client";

import {
  AlertCircle,
  CheckSquare,
  Edit,
  FileText,
  Heart,
  Home,
  Menu,
  Mic,
  Stethoscope,
  Target,
  Users,
  Zap,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BottomNav,
  type BottomNavItem,
  BottomNavSpacer,
} from "@/components/layout/bottom-nav";
import {
  CoachMobileNav,
  CoachSidebar,
} from "@/components/layout/coach-sidebar";
import Loader from "@/components/loader";
import { HeaderQuickActionsMenu } from "@/components/quick-actions/header-quick-actions-menu";
import { Button } from "@/components/ui/button";
import {
  QuickActionsProvider,
  useQuickActionsContext,
} from "@/contexts/quick-actions-context";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { authClient } from "@/lib/auth-client";

function CoachLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Apply organization theme colors
  const { theme } = useOrgTheme();

  // Check if the user has coach functional role
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Set the active organization first
        await authClient.organization.setActive({ organizationId: orgId });

        // Get the user's membership in this organization
        const { data: member } =
          await authClient.organization.getActiveMember();

        if (!member) {
          setHasAccess(false);
          return;
        }

        // Check if user has coach functional role
        const functionalRoles = (member as any).functionalRoles || [];
        const hasCoachRole = functionalRoles.includes("coach");

        // Also allow if user has admin or owner Better Auth role
        const isOrgAdmin = member.role === "admin" || member.role === "owner";

        setHasAccess(hasCoachRole || isOrgAdmin);
      } catch (error) {
        console.error("Error checking coach access:", error);
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [orgId]);

  // Redirect if no access
  useEffect(() => {
    if (hasAccess === false) {
      router.replace("/orgs");
    }
  }, [hasAccess, router]);

  // Get UX feature flags
  const { adminNavStyle, useBottomNav, quickActionsVariant } =
    useUXFeatureFlags();
  const useNewNav = adminNavStyle === "sidebar";

  // Get quick actions context for header button
  const { actions, isMenuOpen, setIsMenuOpen, setActions } =
    useQuickActionsContext();

  // Track if we've already set default actions (prevents feedback loop)
  const defaultActionsSet = useRef(false);

  // Define default quick actions for all coach pages
  // This runs ONCE on mount and only sets defaults if no page-specific actions exist
  // FABQuickActions from individual pages will override these defaults
  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally omitting actions.length to prevent feedback loop
  useEffect(() => {
    // Only set defaults if:
    // 1. We haven't already set them (prevents re-triggering)
    // 2. No actions are currently registered (allows page overrides)
    if (!defaultActionsSet.current && actions.length === 0) {
      const defaultActions = [
        {
          id: "assess",
          icon: Edit,
          label: "Assess Players",
          title: "Rate player skills & performance",
          onClick: () => router.push(`/orgs/${orgId}/coach/assess` as Route),
          color: "bg-blue-600 hover:bg-blue-700",
        },
        {
          id: "session-plan",
          icon: Target,
          label: "Generate Session Plan",
          title: "AI-powered training session",
          onClick: () => router.push(`/orgs/${orgId}/coach` as Route),
          color: "bg-purple-600 hover:bg-purple-700",
        },
        {
          id: "analytics",
          icon: FileText,
          label: "View Analytics",
          title: "Team performance insights",
          onClick: () => router.push(`/orgs/${orgId}/coach` as Route),
          color: "bg-cyan-600 hover:bg-cyan-700",
        },
        {
          id: "voice-notes",
          icon: Mic,
          label: "Record Voice Note",
          title: "Quick audio observations",
          onClick: () =>
            router.push(`/orgs/${orgId}/coach/voice-notes` as Route),
          color: "bg-green-600 hover:bg-green-700",
        },
        {
          id: "injuries",
          icon: AlertCircle,
          label: "Report Injury",
          title: "Track player injuries",
          onClick: () => router.push(`/orgs/${orgId}/coach/injuries` as Route),
          color: "bg-red-600 hover:bg-red-700",
        },
        {
          id: "goals",
          icon: Heart,
          label: "Manage Goals",
          title: "Development objectives",
          onClick: () => router.push(`/orgs/${orgId}/coach/goals` as Route),
          color: "bg-pink-600 hover:bg-pink-700",
        },
        {
          id: "medical",
          icon: Stethoscope,
          label: "View Medical Info",
          title: "Health & emergency details",
          onClick: () => router.push(`/orgs/${orgId}/coach/medical` as Route),
          color: "bg-amber-600 hover:bg-amber-700",
        },
        {
          id: "match-day",
          icon: Target,
          label: "View Match Day",
          title: "Emergency contacts & info",
          onClick: () => router.push(`/orgs/${orgId}/coach/match-day` as Route),
          color: "bg-orange-600 hover:bg-orange-700",
        },
      ];

      setActions(defaultActions);
      defaultActionsSet.current = true;
    }

    // Reset flag when orgId changes (navigation to different org)
    return () => {
      if (orgId) {
        defaultActionsSet.current = false;
      }
    };
    // Removed actions.length from dependencies to prevent feedback loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, router, setActions]);

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

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Will redirect via useEffect, but show nothing while redirecting
  if (hasAccess === false) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-2xl">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access the coach panel.
          </p>
          <Loader />
        </div>
      </div>
    );
  }

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
                <Users className="h-5 w-5" style={{ color: theme.primary }} />
                <span className="font-semibold">Coach Dashboard</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Actions Button - only show for FAB variant */}
              {quickActionsVariant === "fab" && actions.length > 0 && (
                <Button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  size="sm"
                  style={{
                    backgroundColor: `rgb(${theme.primaryRgb})`,
                    color: "white",
                  }}
                  title="Quick Actions"
                >
                  <Zap className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Quick Actions</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Quick Actions Menu - rendered for FAB variant */}
        {quickActionsVariant === "fab" && <HeaderQuickActionsMenu />}

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

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QuickActionsProvider>
      <CoachLayoutInner>{children}</CoachLayoutInner>
    </QuickActionsProvider>
  );
}
