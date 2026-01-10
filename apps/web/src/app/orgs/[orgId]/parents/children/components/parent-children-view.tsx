"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
import { ChildCard } from "../../components/child-card";

interface ParentChildrenViewProps {
  orgId: string;
}

export function ParentChildrenView({ orgId }: ParentChildrenViewProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  // Get user's role details in this organization
  const roleDetails = useQuery(
    api.models.members.getMemberRoleDetails,
    session?.user?.email
      ? { organizationId: orgId, userEmail: session.user.email }
      : "skip"
  );

  // Get children from guardian identity system
  const {
    guardianIdentity,
    children: identityChildren,
    isLoading: identityLoading,
    hasIdentity,
  } = useGuardianChildrenInOrg(orgId, session?.user?.email);

  // Check if user has parent functional role or is admin/owner
  const hasParentRole = useMemo(() => {
    if (!roleDetails) return false;
    return (
      roleDetails.functionalRoles.includes("parent") ||
      roleDetails.functionalRoles.includes("admin") ||
      roleDetails.betterAuthRole === "owner" ||
      roleDetails.betterAuthRole === "admin"
    );
  }, [roleDetails]);

  const playerCount = identityChildren.length;

  // Show loading state while checking roles
  if (roleDetails === undefined || identityLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Show access denied if user doesn't have parent role and no linked players
  if (!hasParentRole && playerCount === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
              <CardTitle className="text-amber-800">
                Parent Access Required
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700">
              You don't have the parent role assigned to your account, and no
              children are linked to your email address. Contact your
              organization's administrator to:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-amber-700">
              <li>Assign you the "Parent" role</li>
              <li>Link your children's player profiles to your email</li>
            </ul>
            <Button
              className="mt-4"
              onClick={() => router.push(`/orgs/${orgId}`)}
              variant="outline"
            >
              Go to Organization Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl text-gray-900">My Children</h1>
        <p className="text-gray-600 text-sm">
          View and manage {playerCount}{" "}
          {playerCount === 1 ? "child's" : "children's"} profiles and progress
        </p>
      </div>

      {/* Children Grid */}
      {identityChildren.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No children linked to your account</p>
            <p className="mt-2 text-gray-400 text-sm">
              Contact your organization's administrator to link your children's
              profiles
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {identityChildren.map((child) => (
            <ChildCard child={child} key={child.player._id} orgId={orgId} />
          ))}
        </div>
      )}
    </div>
  );
}
