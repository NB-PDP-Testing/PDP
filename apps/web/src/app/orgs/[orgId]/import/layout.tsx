"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { FileUp, Menu, Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandMenu } from "@/components/interactions/command-menu";
import {
  AdminMobileNav,
  AdminSidebar,
} from "@/components/layout/admin-sidebar";
import { BottomNav, BottomNavSpacer } from "@/components/layout/bottom-nav";
import Loader from "@/components/loader";
import { ResizableSidebar } from "@/components/polish/resizable-sidebar";
import { Button } from "@/components/ui/button";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { authClient } from "@/lib/auth-client";

export default function ImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Check if the user has admin/owner permission (same as admin layout)
  useEffect(() => {
    const checkAccess = async () => {
      try {
        await authClient.organization.setActive({ organizationId: orgId });
        const { data: member } =
          await authClient.organization.getActiveMember();

        if (!member) {
          setHasAccess(false);
          return;
        }

        const functionalRoles = (member as any).functionalRoles || [];
        const hasAdminFunctionalRole = functionalRoles.includes("admin");
        const hasBetterAuthAdminRole =
          member.role === "admin" || member.role === "owner";

        setHasAccess(hasAdminFunctionalRole || hasBetterAuthAdminRole);
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

  // Get UX feature flags
  const { adminNavStyle, useBottomNav, useResizableSidebar } =
    useUXFeatureFlags();
  const useNewNav = adminNavStyle === "sidebar";

  // Show loading while checking access
  if (hasAccess === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Will redirect via useEffect
  if (hasAccess === false) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-2xl">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access the import wizard.
          </p>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        {/* Bottom navigation for mobile */}
        {useBottomNav && (
          <BottomNav
            items={[
              {
                id: "admin",
                icon: Settings,
                label: "Admin",
                href: `/orgs/${orgId}/admin`,
              },
              {
                id: "import",
                icon: FileUp,
                label: "Import",
                href: `/orgs/${orgId}/import`,
              },
            ]}
          />
        )}

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
                  href={`/orgs/${orgId}/import` as Route}
                >
                  <FileUp
                    className="h-5 w-5"
                    style={{ color: theme.primary }}
                  />
                  <span className="font-semibold">Import Wizard</span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                {/* Command menu search trigger */}
                <CommandMenu orgId={orgId} />
              </div>
            </div>
          </header>

          {/* Main layout with sidebar */}
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
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                  {children}
                </main>
              </div>

              <BottomNavSpacer className="lg:hidden" />
            </>
          ) : (
            /* No sidebar mode - just render children */
            <>
              <main className="flex-1 overflow-y-auto overflow-x-hidden">
                {children}
              </main>
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
              Please sign in to access the import wizard.
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
