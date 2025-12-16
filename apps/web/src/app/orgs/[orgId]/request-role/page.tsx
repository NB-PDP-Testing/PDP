"use client";

import { ArrowLeft, Mail, Shield, UserCircle, Users } from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type FunctionalRole = "coach" | "parent" | "admin";

const ROLE_INFO: Record<
  FunctionalRole,
  {
    icon: React.ReactNode;
    label: string;
    description: string;
    color: string;
  }
> = {
  coach: {
    icon: <Users className="h-6 w-6 text-green-600" />,
    label: "Coach",
    description:
      "Access to player passports, training plans, and development tracking for your assigned teams.",
    color: "border-green-200 bg-green-50",
  },
  parent: {
    icon: <UserCircle className="h-6 w-6 text-blue-600" />,
    label: "Parent",
    description:
      "View your children's player passports, progress reports, and communication from coaches.",
    color: "border-blue-200 bg-blue-50",
  },
  admin: {
    icon: <Shield className="h-6 w-6 text-purple-600" />,
    label: "Admin",
    description:
      "Full access to organization settings, user management, and all player data.",
    color: "border-purple-200 bg-purple-50",
  },
};

export default function RequestRolePage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: member } = authClient.useActiveMember();

  // Get current functional roles
  const currentRoles = useMemo(
    () => ((member as any)?.functionalRoles as FunctionalRole[]) || [],
    [member]
  );

  // Roles the user can request (ones they don't have)
  const availableRoles = useMemo(() => {
    const allRoles: FunctionalRole[] = ["coach", "parent", "admin"];
    return allRoles.filter((role) => !currentRoles.includes(role));
  }, [currentRoles]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Back button */}
      <Button className="mb-6" onClick={() => router.back()} variant="outline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Request Additional Role</CardTitle>
          <CardDescription>
            Request additional capabilities in{" "}
            {activeOrganization?.name || "this organization"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Roles */}
          {currentRoles.length > 0 && (
            <div>
              <h3 className="mb-3 font-medium text-muted-foreground text-sm">
                Your Current Roles
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentRoles.map((role) => (
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${ROLE_INFO[role].color}`}
                    key={role}
                  >
                    {ROLE_INFO[role].icon}
                    <span className="font-medium">{ROLE_INFO[role].label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Roles to Request */}
          {availableRoles.length > 0 ? (
            <div>
              <h3 className="mb-3 font-medium text-muted-foreground text-sm">
                Available Roles
              </h3>
              <div className="space-y-3">
                {availableRoles.map((role) => (
                  <div
                    className="flex items-start gap-4 rounded-lg border p-4"
                    key={role}
                  >
                    <div className="mt-1">{ROLE_INFO[role].icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium">{ROLE_INFO[role].label}</h4>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {ROLE_INFO[role].description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-green-700">
                You already have all available roles in this organization.
              </p>
            </div>
          )}

          {/* How to Request */}
          {availableRoles.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <h4 className="font-medium text-amber-800">
                    How to Request a Role
                  </h4>
                  <p className="mt-1 text-amber-700 text-sm">
                    To request an additional role, please contact your
                    organization's administrator. They can assign you the
                    appropriate role based on your responsibilities.
                  </p>
                  <Button
                    className="mt-3"
                    onClick={() =>
                      router.push(`/orgs/${orgId}/admin/users` as Route)
                    }
                    size="sm"
                    variant="outline"
                  >
                    View Organization Members
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
