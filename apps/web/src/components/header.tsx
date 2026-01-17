"use client";
import type { Member } from "better-auth/plugins";
import { Building2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { useUXFeatureFlags } from "@/hooks/use-ux-feature-flags";
import { authClient } from "@/lib/auth-client";
import type { OrgMemberRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { OrgRoleSwitcher } from "./org-role-switcher";
// import { EnhancedUserMenu } from "./profile/enhanced-user-menu"; // TODO: Enable when dependencies are in main
import UserMenu from "./user-menu";

function OrgNav({ member }: { member: Member }) {
  const role = member.role as OrgMemberRole;
  const effectiveOrgId = member?.organizationId;

  // Get functional roles from member record
  // Functional roles determine capabilities (coach, parent)
  // Better Auth roles determine hierarchy (owner, admin, member)
  const functionalRoles = (member as any).functionalRoles || [];
  const hasCoachRole = functionalRoles.includes("coach");
  const hasParentRole = functionalRoles.includes("parent");

  // Admin access: Check Better Auth role for organizational permissions
  const hasOrgAdmin = authClient.organization.checkRolePermission({
    permissions: { organization: ["update"] },
    role,
  });

  return (
    <nav className="hidden gap-4 text-lg sm:flex">
      {hasCoachRole && (
        <Link href={`/orgs/${effectiveOrgId}/coach` as Route}>Coach</Link>
      )}
      {hasParentRole && (
        <Link href={`/orgs/${effectiveOrgId}/parents` as Route}>Parent</Link>
      )}
      {hasOrgAdmin && (
        <Link href={`/orgs/${effectiveOrgId}/admin` as Route}>Admin</Link>
      )}
    </nav>
  );
}

export default function Header() {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params?.orgId as string | undefined;
  const user = useCurrentUser();
  const { data: org, isPending: _isOrgPending } =
    authClient.useActiveOrganization();
  const { data: member, isPending: isMemberPending } =
    authClient.useActiveMember();

  // Ensure member data matches current org to prevent showing wrong roles
  // when switching between organizations
  const isMemberDataStale =
    member && org && member.organizationId !== (org as any).id;
  const validMember = isMemberDataStale ? null : member;

  // Check if we're on an auth page or landing page
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isLandingPage = pathname === "/";

  // Platform-level routes: no org-specific context (org listing, platform management, join/create flows)
  const isPlatformLevelRoute =
    pathname === "/orgs" ||
    pathname === "/orgs/" ||
    pathname?.startsWith("/orgs/join") ||
    pathname === "/orgs/create" ||
    pathname?.startsWith("/platform");

  // Only fetch org theme when we're on a page where we need it
  // Skip on platform-level pages to avoid queries for orgs the user isn't a member of
  const { theme } = useOrgTheme({ skip: isPlatformLevelRoute });

  // Get UX feature flags
  const { useMinimalHeaderNav } = useUXFeatureFlags();
  // const useEnhancedUserMenu = false; // TODO: Enable when profile components dependencies are in main

  // Track current org in user profile
  // Skip this on platform-level pages - user isn't in a specific org context
  useEffect(() => {
    if (isPlatformLevelRoute) {
      return; // Don't try to set active org on platform-level pages
    }
    // Only try to set active org if:
    // 1. User is logged in
    // 2. We have an orgId in the URL
    // 3. User has a member record (they're a member of at least one org)
    // 4. The member's current org doesn't match the URL org
    if (user && orgId && member && member.organizationId !== orgId) {
      authClient.organization.setActive({ organizationId: orgId });
    }
  }, [user, orgId, member, isPlatformLevelRoute]);

  // Get header styling based on context:
  // - Platform-level pages: Use PDP brand navy color (#1E3A5F)
  // - Org-specific pages: Use org primary color
  const headerBackgroundStyle = isPlatformLevelRoute
    ? {
        backgroundColor: "#1E3A5F", // PDP brand navy
      }
    : {
        backgroundColor: theme.primary, // Org primary color
      };
  const headerTextStyle = "text-white"; // Always white text for contrast

  // Minimal header for auth pages (just theme toggle)
  if (isAuthPage) {
    return (
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>
    );
  }

  // No header for landing page - using FloatingHeader component instead
  if (isLandingPage) {
    return null;
  }

  return (
    <div>
      <div
        className="flex flex-row items-center justify-start space-x-2 px-2 py-1 sm:space-x-4"
        style={headerBackgroundStyle}
      >
        {/* Left side - Home link always visible + Org logo and nav */}
        {/* When useMinimalHeaderNav is enabled, hide these links - users should use the switcher */}
        {/* Exception: Always show on platform-level routes */}
        {(!useMinimalHeaderNav || isPlatformLevelRoute) && (
          <nav
            className={cn(
              // Show on mobile for platform-level routes (platform staff navigation)
              isPlatformLevelRoute
                ? "flex items-center gap-2 text-sm sm:gap-4 sm:text-lg"
                : "hidden items-center gap-4 text-lg sm:flex",
              headerTextStyle
            )}
          >
            <Link className="py-3" href="/">
              Home
            </Link>
            {user?.isPlatformStaff && (
              <Link className="py-3" href="/platform">
                Platform
              </Link>
            )}
          </nav>
        )}

        {/* Org-specific content - only show when NOT on platform-level routes */}
        {org && !isPlatformLevelRoute && (
          <>
            <Link href={`/orgs/${orgId}` as Route}>
              <div
                className="flex h-10 items-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-2 backdrop-blur-sm transition-colors hover:bg-white/20 sm:gap-3 sm:px-4"
                title={org.name}
              >
                {org.logo ? (
                  <img
                    alt={org.name}
                    className="h-6 w-6 flex-shrink-0 rounded object-contain sm:h-8 sm:w-8"
                    src={org.logo}
                  />
                ) : (
                  <Building2 className="h-6 w-6 flex-shrink-0 sm:h-8 sm:w-8" />
                )}
                {/* Hide org name on mobile to save space, show only logo */}
                <span className="hidden font-bold text-sm sm:inline sm:max-w-[300px] sm:truncate sm:text-lg">
                  {org.name}
                </span>
              </div>
            </Link>
            {/* Only render OrgNav when member data is loaded and matches current org */}
            {/* When useMinimalHeaderNav is enabled, hide these links - users should use the switcher */}
            {!(useMinimalHeaderNav || isMemberPending) && validMember && (
              <OrgNav member={validMember} />
            )}
          </>
        )}

        <div className="flex-1">{/* spacer */}</div>

        {/* Right side - User controls */}
        <div className="flex items-center gap-2">
          {/* Combined org + role switcher - replaces separate OrgSelector and FunctionalRoleIndicator */}
          {/* Only show on org-specific routes, not platform-level routes */}
          {!isPlatformLevelRoute && <OrgRoleSwitcher />}

          {/* User Menu and Mode Toggle */}
          {/* TODO: Enable EnhancedUserMenu when dependencies are in main */}
          <UserMenu />
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
