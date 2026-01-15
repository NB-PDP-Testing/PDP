"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function SharedPassportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const playerId = params.playerId as string;
  const consentId = searchParams.get(
    "consentId"
  ) as Id<"passportShareConsents"> | null;

  // Note: Authentication is handled by getSharedPassportData query

  // Get shared passport data
  const sharedPassport = useQuery(
    api.models.passportSharing.getSharedPassportData,
    consentId && playerId
      ? {
          consentId: consentId as Id<"passportShareConsents">,
          playerIdentityId: playerId as Id<"playerIdentities">,
        }
      : "skip"
  );

  // Get organization names for display
  const { data: organizations } = authClient.useListOrganizations();

  const orgNameMap = useMemo(() => {
    if (!organizations) {
      return new Map<string, string>();
    }
    return new Map(organizations.map((org) => [org.id, org.name]));
  }, [organizations]);

  const receivingOrgName = orgNameMap.get(orgId) || "Your organization";

  if (!consentId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-bold text-2xl">Missing Consent Information</h1>
          <p className="mt-2 text-muted-foreground">
            This shared passport view requires a consent ID.
          </p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (sharedPassport === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sharedPassport === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-bold text-2xl">Shared Passport Not Available</h1>
          <p className="mt-2 text-muted-foreground">
            This shared passport doesn't exist, has expired, or you don't have
            access to view it.
          </p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const playerName = `${sharedPassport.playerIdentity.firstName} ${sharedPassport.playerIdentity.lastName}`;
  const sourceOrgNames = sharedPassport.sourceOrgs
    .map((org) => org.organizationName)
    .join(", ");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Header Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-2xl">{playerName}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge className="bg-blue-600" variant="secondary">
              Shared from {sourceOrgNames}
            </Badge>
            <Badge variant="outline">Read-Only</Badge>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          This passport data has been shared with {receivingOrgName} by the
          player's parent/guardian. You're viewing read-only information from{" "}
          {sourceOrgNames}. All access is logged for audit purposes.
        </AlertDescription>
      </Alert>

      {/* Shared Data Sections */}
      <div className="space-y-4">
        {/* Basic Profile */}
        {sharedPassport.sharedElements.basicProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Basic Profile</CardTitle>
                  <CardDescription>
                    Player enrollment and basic information
                  </CardDescription>
                </div>
                <Badge className="bg-blue-600" variant="secondary">
                  Shared from {sourceOrgNames}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-muted-foreground text-sm">
                    Date of Birth
                  </dt>
                  <dd className="mt-1">
                    {sharedPassport.playerIdentity.dateOfBirth || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground text-sm">
                    Gender
                  </dt>
                  <dd className="mt-1">
                    {sharedPassport.playerIdentity.gender || "Not set"}
                  </dd>
                </div>
              </dl>

              {/* Enrollments */}
              {sharedPassport.enrollments &&
                sharedPassport.enrollments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 font-semibold text-sm">
                      Organization Enrollments
                    </h4>
                    <div className="space-y-2">
                      {sharedPassport.enrollments.map((enrollment) => (
                        <div
                          className="flex items-center justify-between rounded-lg border p-3"
                          key={`${enrollment.organizationId}-${enrollment.sport}`}
                        >
                          <div>
                            <p className="font-medium">
                              {enrollment.organizationName}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {enrollment.sport} • {enrollment.ageGroup} •{" "}
                              {enrollment.status}
                            </p>
                          </div>
                          <Badge variant="outline">
                            Updated:{" "}
                            {new Date(
                              enrollment.lastUpdated
                            ).toLocaleDateString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Development Goals */}
        {sharedPassport.sharedElements.developmentGoals &&
          sharedPassport.goals &&
          sharedPassport.goals.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Development Goals</CardTitle>
                    <CardDescription>
                      Goals and targets set for the player
                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-600" variant="secondary">
                    Shared from {sourceOrgNames}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sharedPassport.goals.map((goal) => (
                    <div className="rounded-lg border p-4" key={goal.goalId}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{goal.title}</h4>
                          {goal.description && (
                            <p className="mt-1 text-muted-foreground text-sm">
                              {goal.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">{goal.status}</Badge>
                            <Badge variant="outline">
                              {goal.organizationName}
                            </Badge>
                          </div>
                        </div>
                        <div className="ml-4 text-right text-muted-foreground text-sm">
                          <p>
                            Created:{" "}
                            {new Date(goal.createdAt).toLocaleDateString()}
                          </p>
                          <p>
                            Updated:{" "}
                            {new Date(goal.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Placeholder sections for other elements */}
        {!(
          sharedPassport.sharedElements.basicProfile ||
          sharedPassport.sharedElements.developmentGoals
        ) && (
          <Card>
            <CardHeader>
              <CardTitle>Limited Data Shared</CardTitle>
              <CardDescription>
                The parent has not shared additional passport elements with your
                organization yet.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
