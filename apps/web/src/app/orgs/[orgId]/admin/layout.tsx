"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import {
  BarChart3,
  Clipboard,
  GraduationCap,
  Home,
  Key,
  LineChart,
  Megaphone,
  Settings,
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
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { authClient } from "@/lib/auth-client";
import type { OrgMemberRole } from "@/lib/types";

export default function OrgAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
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

  const navItems = [
    {
      href: `/orgs/${orgId}/admin`,
      label: "Overview",
      icon: Home,
    },
    {
      href: `/orgs/${orgId}/admin/players` as Route,
      label: "Players",
      icon: Clipboard,
    },
    {
      href: `/orgs/${orgId}/admin/teams`,
      label: "Teams",
      icon: Shield,
    },
    {
      href: `/orgs/${orgId}/admin/overrides` as Route,
      label: "Overrides",
      icon: ShieldAlert,
    },
    {
      href: `/orgs/${orgId}/admin/coaches` as Route,
      label: "Coaches",
      icon: GraduationCap,
    },
    {
      href: `/orgs/${orgId}/admin/guardians` as Route,
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
    {
      href: `/orgs/${orgId}/admin/player-import` as Route,
      label: "Import Players",
      icon: Upload,
    },
    {
      href: `/orgs/${orgId}/admin/gaa-import` as Route,
      label: "GAA Players",
      icon: Upload,
    },
    {
      href: `/orgs/${orgId}/admin/benchmarks` as Route,
      label: "Benchmarks",
      icon: BarChart3,
    },
    {
      href: `/orgs/${orgId}/admin/analytics` as Route,
      label: "Analytics",
      icon: LineChart,
    },
    {
      href: `/orgs/${orgId}/admin/announcements` as Route,
      label: "Announcements",
      icon: Megaphone,
    },
    {
      href: `/orgs/${orgId}/admin/player-access` as Route,
      label: "Player Access",
      icon: Key,
    },
    {
      href: `/orgs/${orgId}/admin/settings` as Route,
      label: "Settings",
      icon: Settings,
    },
    {
      href: `/orgs/${orgId}/admin/dev-tools` as Route,
      label: "Dev Tools",
      icon: Wrench,
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
            You don't have permission to access the admin panel.
          </p>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        <div className="flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-6">
                <Link
                  className="flex items-center gap-2"
                  href={`/orgs/${orgId}/admin`}
                >
                  <Settings
                    className="h-6 w-6"
                    style={{ color: theme.primary }}
                  />
                  <span className="hidden font-semibold text-lg sm:inline">
                    Admin Panel
                  </span>
                </Link>
                <nav className="hidden items-center gap-1 md:flex">
                  {navItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== `/orgs/${orgId}/admin` &&
                        pathname.startsWith(item.href));
                    return (
                      <Link href={item.href as Route} key={item.href}>
                        <Button
                          className="gap-2"
                          size="sm"
                          style={
                            isActive
                              ? {
                                  backgroundColor:
                                    "rgb(var(--org-primary-rgb) / 0.1)",
                                  color: theme.primary,
                                  borderColor: theme.primary,
                                  borderWidth: "1px",
                                }
                              : undefined
                          }
                          variant={isActive ? "secondary" : "ghost"}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/orgs">
                  <Button size="sm" variant="outline">
                    Back to App
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Mobile Navigation */}
          <nav className="overflow-x-auto border-b bg-background px-4 py-2 md:hidden">
            <div className="flex gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== `/orgs/${orgId}/admin` &&
                    pathname.startsWith(item.href));
                return (
                  <Link href={item.href as Route} key={item.href}>
                    <Button
                      className="gap-2 whitespace-nowrap"
                      size="sm"
                      variant={isActive ? "secondary" : "ghost"}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6">{children}</main>
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
