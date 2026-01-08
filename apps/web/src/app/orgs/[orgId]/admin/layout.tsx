"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { ClipboardList, Home, Menu, Settings, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandMenu } from "@/components/interactions/command-menu";
import {
  AdminMobileNav,
  AdminSidebar,
} from "@/components/layout/admin-sidebar";
import {
  BottomNav,
  type BottomNavItem,
  BottomNavSpacer,
} from "@/components/layout/bottom-nav";
import Loader from "@/components/loader";
import { ModeToggle } from "@/components/mode-toggle";
import { ResizableSidebar } from "@/components/polish/resizable-sidebar";
import { Button } from "@/components/ui/button";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { authClient } from "@/lib/auth-client";
import type { OrgMemberRole } from "@/lib/types";

export default function OrgAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Check if the user has org:admin permission
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Set the active organization first
        await authClient.organization.setActive({ organizationId: orgId });

        // Get the user's role in this organization
        const { data: member } =
          await authClient.organization.getActiveMember();

        if (!member?.role) {
          setHasAccess(false);
          return;
        }

        // Check if the user's role has org:admin permission
        const canAccess = authClient.organization.checkRolePermission({
          permissions: { organization: ["update"] },
          role: member.role as OrgMemberRole,
        });

        setHasAccess(canAccess);
      } catch (error) {
        console.error("Error checking access:", error);
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

  // Apply organization theme
  const { theme } = useOrgTheme();

  // Get UX feature flags for conditional rendering
  const { adminNavStyle, useBottomNav, useResizableSidebar } =
    useUXFeatureFlags();
  const useNewNav = adminNavStyle === "sidebar";

  // Debug: Log feature flag values
  console.log("[Admin Layout] Feature flags:", {
    adminNavStyle,
    useBottomNav,
    useNewNav,
  });

  // Admin bottom nav items (only shown when useBottomNav flag is enabled)
  const adminBottomNavItems: BottomNavItem[] = [
    {
      id: "overview",
      icon: Home,
      label: "Overview",
      href: `/orgs/${orgId}/admin`,
    },
    {
      id: "players",
      icon: Users,
      label: "Players",
      href: `/orgs/${orgId}/admin/players`,
    },
    {
      id: "teams",
      icon: ClipboardList,
      label: "Teams",
      href: `/orgs/${orgId}/admin/teams`,
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      href: `/orgs/${orgId}/admin/settings`,
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
            You don&apos;t have permission to access the admin panel.
          </p>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        {/* Bottom navigation for mobile - OUTSIDE main flex container for proper fixed positioning */}
        {useBottomNav && <BottomNav items={adminBottomNavItems} />}

        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                {/* Mobile menu trigger */}
                <AdminMobileNav
                  orgId={orgId}
                  primaryColor={theme.primary}
                  trigger={
                    <Button className="lg:hidden" size="icon" variant="ghost">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  }
                />

                {/* Logo/Title */}
                <Link
                  className="flex items-center gap-2"
                  href={`/orgs/${orgId}/admin` as Route}
                >
                  <Settings
                    className="h-5 w-5"
                    style={{ color: theme.primary }}
                  />
                  <span className="font-semibold">Admin Panel</span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                {/* Command menu search trigger */}
                <CommandMenu orgId={orgId} />

                {/* Theme toggle */}
                <ModeToggle />

                <Link href={`/orgs/${orgId}` as Route}>
                  <Button size="sm" variant="outline">
                    Back to App
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Main layout with sidebar - conditionally shown based on feature flag */}
          {useNewNav ? (
            <>
              <div className="flex flex-1">
                {/* Desktop Sidebar - with optional resize */}
                {useResizableSidebar ? (
                  <ResizableSidebar
                    className="hidden lg:block"
                    defaultWidth={260}
                    maxWidth={400}
                    minWidth={200}
                    storageKey={`admin-sidebar-${orgId}`}
                  >
                    <AdminSidebar
                      isResizable
                      orgId={orgId}
                      primaryColor={theme.primary}
                    />
                  </ResizableSidebar>
                ) : (
                  <AdminSidebar orgId={orgId} primaryColor={theme.primary} />
                )}

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 [&>*]:h-auto">
                  {children}
                </main>
              </div>

              <BottomNavSpacer className="lg:hidden" />
            </>
          ) : (
            /* Current/Legacy navigation - horizontal scrolling tabs */
            <>
              <LegacyNavigation orgId={orgId} theme={theme}>
                {children}
              </LegacyNavigation>
              {useBottomNav && <BottomNavSpacer />}
            </>
          )}
        </div>
      </Authenticated>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="font-bold text-2xl">Access Denied</h1>
            <p className="text-muted-foreground">
              Please sign in to access the admin panel.
            </p>
            <Link href={"/login"}>
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}

/**
 * Legacy navigation component - horizontal scrolling tabs
 * Shown when ux_admin_nav_sidebar feature flag is disabled
 */
function LegacyNavigation({
  orgId,
  theme,
  children,
}: {
  orgId: string;
  theme: { primary: string };
  children: React.ReactNode;
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePathname } = require("next/navigation");
  const pathname = usePathname();

  const navItems = [
    { href: `/orgs/${orgId}/admin`, label: "Overview" },
    { href: `/orgs/${orgId}/admin/players`, label: "Players" },
    { href: `/orgs/${orgId}/admin/teams`, label: "Teams" },
    { href: `/orgs/${orgId}/admin/overrides`, label: "Overrides" },
    { href: `/orgs/${orgId}/admin/coaches`, label: "Coaches" },
    { href: `/orgs/${orgId}/admin/guardians`, label: "Guardians" },
    { href: `/orgs/${orgId}/admin/users`, label: "Users" },
    { href: `/orgs/${orgId}/admin/users/approvals`, label: "Approvals" },
    { href: `/orgs/${orgId}/admin/player-import`, label: "Import" },
    { href: `/orgs/${orgId}/admin/gaa-import`, label: "GAA" },
    { href: `/orgs/${orgId}/admin/benchmarks`, label: "Benchmarks" },
    { href: `/orgs/${orgId}/admin/analytics`, label: "Analytics" },
    { href: `/orgs/${orgId}/admin/announcements`, label: "Announcements" },
    { href: `/orgs/${orgId}/admin/player-access`, label: "Player Access" },
    { href: `/orgs/${orgId}/admin/settings`, label: "Settings" },
    { href: `/orgs/${orgId}/admin/dev-tools`, label: "Dev Tools" },
  ];

  const isActive = (href: string) => {
    if (href === `/orgs/${orgId}/admin`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Horizontal scrolling navigation */}
      <nav className="overflow-x-auto border-b bg-background px-4 py-2">
        <div className="flex gap-1">
          {navItems.map((item) => (
            <Link href={item.href as any} key={item.href}>
              <Button
                className="whitespace-nowrap"
                size="sm"
                style={
                  isActive(item.href)
                    ? {
                        backgroundColor: `${theme.primary}15`,
                        color: theme.primary,
                      }
                    : undefined
                }
                variant={isActive(item.href) ? "secondary" : "ghost"}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
        {children}
      </main>
    </>
  );
}
