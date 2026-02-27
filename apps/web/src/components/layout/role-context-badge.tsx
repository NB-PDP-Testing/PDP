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

/**
 * Returns role-specific colors for the badge.
 * Uses Tailwind static class strings so Tailwind can detect them at build time.
 */
function getRoleColors(role: FunctionalRole): {
  bg: string;
  text: string;
  border: string;
} {
  switch (role) {
    case "coach":
      return {
        bg: "bg-green-100",
        text: "text-green-700",
        border: "border-green-300",
      };
    case "parent":
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-300",
      };
    case "admin":
      return {
        bg: "bg-purple-100",
        text: "text-purple-700",
        border: "border-purple-300",
      };
    case "player":
      return {
        bg: "bg-orange-100",
        text: "text-orange-700",
        border: "border-orange-300",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-300",
      };
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
  const { bg, text, border } = getRoleColors(activeRole);

  return (
    <>
      {/* Desktop: full "Acting as: [Role]" badge */}
      <div
        className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium text-xs sm:flex ${bg} ${text} ${border}`}
        title={`Acting as: ${roleLabel}`}
      >
        <span className="text-[10px] opacity-70">Acting as:</span>
        <span className="font-semibold">{roleLabel}</span>
      </div>

      {/* Mobile: coloured circle with role initial */}
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full border font-bold text-xs sm:hidden ${bg} ${text} ${border}`}
        title={`Acting as: ${roleLabel}`}
      >
        {initial}
      </div>
    </>
  );
}
