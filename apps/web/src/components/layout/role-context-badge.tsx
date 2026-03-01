"use client";

import { useMembershipContext } from "@/providers/membership-provider";

type FunctionalRole = "coach" | "parent" | "admin" | "player";

function getRoleLabel(role: FunctionalRole): string {
  switch (role) {
    case "coach":
      return "Coach";
    case "parent":
      return "Parent";
    case "admin":
      return "Admin";
    case "player":
      return "Player";
    default:
      return "Member";
  }
}

type RoleContextBadgeProps = {
  orgId: string;
};

/**
 * Persistent role context badge shown in the page header.
 *
 * Visible only when the user holds MORE than one functional role in the org.
 * Single-role users see no badge — no change to their experience.
 *
 * Uses org theme CSS custom properties (--org-primary, --org-primary-contrast)
 * for colours so the badge matches the org brand.
 *
 * Desktop: "Acting as: [Role Name]"
 * Mobile (≤ sm): abbreviated role initial in a coloured circle
 */
export function RoleContextBadge({ orgId }: RoleContextBadgeProps) {
  const { getMembershipForOrg } = useMembershipContext();
  const membership = getMembershipForOrg(orgId);

  // Only show for users with 2+ roles
  if (!membership || membership.functionalRoles.length <= 1) {
    return null;
  }

  const activeRole = membership.activeFunctionalRole;
  if (!activeRole) {
    return null;
  }

  const roleLabel = getRoleLabel(activeRole);
  const initial = roleLabel[0];

  const badgeStyle: React.CSSProperties = {
    backgroundColor: "var(--org-primary)",
    color: "var(--org-primary-contrast, white)",
    borderColor: "var(--org-primary)",
  };

  return (
    <>
      {/* Desktop: full "Acting as: [Role]" badge */}
      <div
        className="hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium text-xs sm:flex"
        style={badgeStyle}
        title={`Acting as: ${roleLabel}`}
      >
        <span className="text-[10px] opacity-70">Acting as:</span>
        <span className="font-semibold">{roleLabel}</span>
      </div>

      {/* Mobile: coloured circle with role initial */}
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full border font-bold text-xs sm:hidden"
        style={badgeStyle}
        title={`Acting as: ${roleLabel}`}
      >
        {initial}
      </div>
    </>
  );
}
