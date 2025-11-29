"use client";
import { api } from "@pdp/backend/convex/_generated/api";
import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { Building2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { OrgSelector } from "./org-selector";
import UserMenu from "./user-menu";

export default function Header() {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params?.orgId as string | undefined;
  const user = useCurrentUser();
  const updateCurrentOrg = useMutation(api.models.users.updateCurrentOrg);
  const { theme, org } = useOrgTheme();

  // Check if we're on an auth page
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Track current org in user profile
  useEffect(() => {
    if (user && orgId && user.currentOrgId !== orgId) {
      updateCurrentOrg({ organizationId: orgId }).catch((error) => {
        console.error("Error updating current org:", error);
      });
    }
  }, [user, orgId, updateCurrentOrg]);

  // Get primary club color using the theme hook
  const headerBackgroundStyle = orgId
    ? {
        backgroundColor: theme.primary,
      }
    : {};

  // separating this so it doesn't affect other controls (like the org toggle)
  const headerTextStyle = orgId ? "text-white" : "";

  // Minimal header for auth pages (just theme toggle)
  if (isAuthPage) {
    return (
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex flex-row items-center justify-between px-2 py-1"
        style={headerBackgroundStyle}
      >
        {/* Left side - Org logo and nav */}
        <div className={cn("flex items-center gap-4", headerTextStyle)}>
          {org && (
            <Link
              className="flex items-center gap-2 font-semibold"
              href={`/orgs/${orgId}` as Route}
            >
              {org.logo ? (
                <img
                  alt={org.name}
                  className="h-8 w-8 rounded object-contain"
                  src={org.logo}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <span className="hidden sm:inline">{org.name}</span>
            </Link>
          )}
          <nav className="flex gap-4 text-lg">
            <Link href="/">Home</Link>
            <Authenticated>
              <Link href="/orgs">Organizations</Link>
            </Authenticated>
            <Unauthenticated>
              <Link href={"/login"}>Login</Link>
            </Unauthenticated>
          </nav>
        </div>

        {/* Right side - User controls */}
        <div className="flex items-center gap-2">
          <Authenticated>
            <OrgSelector />
            <UserMenu />
          </Authenticated>
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
