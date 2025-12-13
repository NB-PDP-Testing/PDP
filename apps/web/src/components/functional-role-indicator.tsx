"use client";

import { ChevronDown, Shield, UserCircle, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type FunctionalRole = "coach" | "parent" | "admin";

interface FunctionalRoleIndicatorProps {
  functionalRoles?: FunctionalRole[];
  className?: string;
}

function getRoleIcon(role: FunctionalRole) {
  switch (role) {
    case "coach":
      return <Users className="h-4 w-4 text-green-600" />;
    case "parent":
      return <UserCircle className="h-4 w-4 text-blue-600" />;
    case "admin":
      return <Shield className="h-4 w-4 text-purple-600" />;
    default:
      return null;
  }
}

function getRoleLabel(role: FunctionalRole): string {
  switch (role) {
    case "coach":
      return "Coach";
    case "parent":
      return "Parent";
    case "admin":
      return "Admin";
    default:
      return role;
  }
}

function getRoleColor(role: FunctionalRole): string {
  switch (role) {
    case "coach":
      return "bg-green-100 text-green-700 border-green-200";
    case "parent":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "admin":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function FunctionalRoleIndicator({
  functionalRoles = [],
  className,
}: FunctionalRoleIndicatorProps) {
  const [open, setOpen] = useState(false);

  if (!functionalRoles || functionalRoles.length === 0) {
    return null;
  }

  // If user only has one role, show static badge
  if (functionalRoles.length === 1) {
    const role = functionalRoles[0];
    return (
      <Badge
        className={cn(
          "flex items-center gap-1.5 border px-2.5 py-1 font-medium text-xs",
          getRoleColor(role),
          className
        )}
        variant="outline"
      >
        {getRoleIcon(role)}
        <span>{getRoleLabel(role)}</span>
      </Badge>
    );
  }

  // If user has multiple roles, show dropdown
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 font-medium text-xs transition-colors hover:bg-gray-50",
            className
          )}
          type="button"
        >
          {getRoleIcon(functionalRoles[0])}
          <span>{getRoleLabel(functionalRoles[0])}</span>
          <span className="text-gray-500">+{functionalRoles.length - 1}</span>
          <ChevronDown className="h-3 w-3 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-0">
        <div className="p-2">
          <p className="mb-2 font-medium text-gray-500 text-xs uppercase">
            Your Roles
          </p>
          <div className="space-y-1">
            {functionalRoles.map((role) => (
              <div
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1.5 text-sm",
                  role === functionalRoles[0] && "bg-gray-50"
                )}
                key={role}
              >
                {getRoleIcon(role)}
                <span className="flex-1">{getRoleLabel(role)}</span>
                {role === functionalRoles[0] && (
                  <span className="text-gray-500 text-xs">Primary</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Hook to get current user's functional roles from active member
 */
export function useFunctionalRoles() {
  const { data: member } = authClient.useActiveMember();
  const functionalRoles =
    (member?.functionalRoles as FunctionalRole[] | undefined) || [];
  return functionalRoles;
}
