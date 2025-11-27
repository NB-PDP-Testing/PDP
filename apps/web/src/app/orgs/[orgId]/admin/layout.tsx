"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Home, Settings, Shield, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import Loader from "@/components/loader";
import { OrgSelector } from "@/components/org-selector";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";

export default function OrgAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;

  const navItems = [
    {
      href: `/orgs/${orgId}/admin`,
      label: "Overview",
      icon: Home,
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
      href: `/orgs/${orgId}/admin/teams`,
      label: "Teams",
      icon: Shield,
    },
  ];

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
                  <Settings className="h-6 w-6 text-primary" />
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
                      <Link href={item.href} key={item.href}>
                        <Button
                          className="gap-2"
                          size="sm"
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
                <OrgSelector />
                <Link href="/dashboard">
                  <Button size="sm" variant="outline">
                    Back to App
                  </Button>
                </Link>
                <UserMenu />
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
                  <Link href={item.href} key={item.href}>
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
            <Link href="/dashboard">
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
