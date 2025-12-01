"use client";
import type { Member } from "better-auth/plugins";
import { Building2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { authClient } from "@/lib/auth-client";
import type { OrgMemberRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { OrgSelector } from "./org-selector";
import UserMenu from "./user-menu";

function OrgNav({ member }: { member: Member }) {
  const role = member.role as OrgMemberRole;

  const effectiveOrgId = member?.organizationId;
  const hasCoachFull = authClient.organization.checkRolePermission({
    permissions: { coach: ["full"] },
    role,
  });
  const hasOrgAdmin = authClient.organization.checkRolePermission({
    permissions: { organization: ["update"] },
    role,
  });

  return (
    <nav className="flex gap-4 text-lg">
      <Link href="/">Home</Link>
      {hasCoachFull && (
        <Link href={`/orgs/${effectiveOrgId}/coach` as Route}>Coach</Link>
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
  const { data: org } = authClient.useActiveOrganization();
  const { data: member } = authClient.useActiveMember();
  const { theme } = useOrgTheme();

  // Check if we're on an auth page or landing page
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isLandingPage = pathname === "/";

  // Track current org in user profile
  useEffect(() => {
    if (user && orgId && member?.organizationId !== orgId) {
      authClient.organization.setActive({ organizationId: orgId });
    }
  }, [user, orgId, member?.organizationId]);

  // Get primary club color using the theme hook
  const headerBackgroundStyle = orgId
    ? {
        backgroundColor: theme.primary,
      }
    : {};
  const headerTextStyle = orgId ? "text-white" : "";

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
        className="flex flex-row items-center justify-start space-x-4 px-2 py-1"
        style={headerBackgroundStyle}
      >
        {/* Left side - Org logo and nav */}
        {org && (
          <>
            <div className={cn("flex items-center gap-4", headerTextStyle)}>
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
            </div>
            {member && <OrgNav member={member} />}
          </>
        )}

        <div className="flex-1">{/* spacer */}</div>

        {/* Right side - User controls */}
        <div className="flex items-center gap-2">
          <OrgSelector />
          <UserMenu />
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
