"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Clock, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type SharedPassportsProps = {
  userId: string;
  organizationId: string;
};

export function SharedPassports({
  userId,
  organizationId,
}: SharedPassportsProps) {
  const router = useRouter();

  const sharedPassports = useQuery(
    api.models.passportSharing.getSharedPassportsForCoach,
    { userId, organizationId }
  );

  // Get all organizations from Better Auth to resolve names
  const { data: organizations } = authClient.useListOrganizations();

  // Create a map of orgId to orgName
  const orgNameMap = useMemo(() => {
    if (!organizations) {
      return new Map<string, string>();
    }
    return new Map(organizations.map((org) => [org.id, org.name]));
  }, [organizations]);

  // Loading state
  if (sharedPassports === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Shared Passports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-green-600 border-b-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (sharedPassports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Shared Passports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Share2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-600 text-sm">
              No shared passports yet. When parents share their child's passport
              with your organization, they'll appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format shared elements for display
  const formatSharedElements = (elements: any) => {
    const elementLabels: Record<string, string> = {
      basicProfile: "Profile",
      skillRatings: "Skills",
      skillHistory: "History",
      developmentGoals: "Goals",
      coachNotes: "Notes",
      benchmarkData: "Benchmarks",
      attendanceRecords: "Attendance",
      injuryHistory: "Injuries",
      medicalSummary: "Medical",
      contactInfo: "Contacts",
    };

    return Object.entries(elements)
      .filter(([_, value]) => value === true)
      .map(([key]) => elementLabels[key] || key);
  };

  // Format last updated timestamp
  const formatLastUpdated = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMonths = Math.floor(
      (now - timestamp) / (1000 * 60 * 60 * 24 * 30)
    );

    return {
      display: date.toLocaleDateString(),
      color:
        diffMonths < 1
          ? "text-green-600"
          : diffMonths < 6
            ? "text-yellow-600"
            : "text-amber-600",
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Shared Passports
          <Badge className="ml-2" variant="secondary">
            {sharedPassports.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sharedPassports.map((passport) => {
            const sharedElementsList = formatSharedElements(
              passport.sharedElements
            );
            const lastUpdated = formatLastUpdated(passport.lastUpdated);

            return (
              <div
                className="rounded-lg border p-4 transition-colors hover:bg-gray-50"
                key={passport.consentId}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {passport.playerName}
                    </h3>
                    <div className="mt-1 space-y-1">
                      <p className="text-gray-600 text-sm">
                        <span className="font-medium">Source org(s):</span>{" "}
                        {passport.sourceOrgIds.length > 0
                          ? passport.sourceOrgIds
                              .map((id) => orgNameMap.get(id) || id)
                              .join(", ")
                          : passport.sourceOrgMode === "all_enrolled"
                            ? "All enrolled organizations"
                            : "Unknown"}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <span className="font-medium text-gray-600 text-sm">
                          Elements:
                        </span>
                        {sharedElementsList.map((element) => (
                          <Badge
                            className="text-xs"
                            key={element}
                            variant="outline"
                          >
                            {element}
                          </Badge>
                        ))}
                      </div>
                      <p
                        className={`flex items-center gap-1 text-sm ${lastUpdated.color}`}
                      >
                        <Clock className="h-3 w-3" />
                        Last updated: {lastUpdated.display}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <Button
                      onClick={() =>
                        router.push(
                          `/orgs/${organizationId}/players/${passport.playerIdentityId}/shared`
                        )
                      }
                      size="sm"
                    >
                      View Passport
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
