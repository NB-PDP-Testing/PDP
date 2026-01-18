"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AlertCircle, Clock, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import { BrowsePlayersTab } from "./components/browse-players-tab";
import { ShareAcceptanceModal } from "./components/share-acceptance-modal";

type SharedPassportsProps = {
  orgId: string;
};

type PendingShare = {
  consentId: Id<"passportShareConsents">;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  sourceOrgIds: string[];
  sourceOrgMode: "all_enrolled" | "specific_orgs";
  sharedElements: {
    basicProfile: boolean;
    skillRatings: boolean;
    skillHistory: boolean;
    developmentGoals: boolean;
    coachNotes: boolean;
    benchmarkData: boolean;
    attendanceRecords: boolean;
    injuryHistory: boolean;
    medicalSummary: boolean;
    contactInfo: boolean;
  };
  consentedAt: number;
  expiresAt: number;
};

export function SharedPassportsView({ orgId }: SharedPassportsProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: session } = authClient.useSession();
  const [selectedShare, setSelectedShare] = useState<PendingShare | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get userId from Convex user or session
  const userId = currentUser?._id || session?.user?.id;
  const organizationId = orgId;

  // Get accepted shares
  const sharedPassports = useQuery(
    api.models.passportSharing.getSharedPassportsForCoach,
    userId ? { userId, organizationId } : "skip"
  );

  // Get pending shares (US-037)
  const pendingShares = useQuery(
    api.models.passportSharing.getPendingSharesForCoach,
    userId ? { userId, organizationId } : "skip"
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
  if (sharedPassports === undefined || pendingShares === undefined) {
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

  // Format source organizations
  const formatSourceOrgs = (sourceOrgIds: string[], sourceOrgMode: string) => {
    if (sourceOrgMode === "all_enrolled") {
      return "All enrolled organizations";
    }
    return sourceOrgIds.length > 0
      ? sourceOrgIds.map((id) => orgNameMap.get(id) || id).join(", ")
      : "Unknown";
  };

  const handleAcceptClick = (share: PendingShare) => {
    setSelectedShare(share);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    // Modal will close automatically, data will refresh via Convex query
    setSelectedShare(null);
  };

  // Empty state - no accepted or pending shares
  if (sharedPassports.length === 0 && pendingShares.length === 0) {
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

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl">Shared Passports</h1>
          <p className="text-muted-foreground">
            Manage player passport sharing and request access to players at
            other organizations
          </p>
        </div>

        <Tabs className="w-full" defaultValue="active">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">
              Active
              {sharedPassports.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {sharedPassports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {pendingShares.length > 0 && (
                <Badge className="ml-2 bg-amber-600">
                  {pendingShares.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
          </TabsList>

          {/* Active shares tab */}
          <TabsContent className="mt-4" value="active">
            {sharedPassports.length === 0 ? (
              <div className="py-8 text-center">
                <Share2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 text-sm">
                  No active shares yet. Accept pending shares to view passport
                  data.
                </p>
              </div>
            ) : (
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
                              <span className="font-medium">
                                Source org(s):
                              </span>{" "}
                              {formatSourceOrgs(
                                passport.sourceOrgIds,
                                passport.sourceOrgMode
                              )}
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
                                `/orgs/${organizationId}/players/${passport.playerIdentityId}/shared?consentId=${passport.consentId}`
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
            )}
          </TabsContent>

          {/* Pending shares tab (US-037) */}
          <TabsContent className="mt-4" value="pending">
            {pendingShares.length === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 text-sm">
                  No pending shares. You'll be notified when parents share
                  passports with your organization.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingShares.map((share) => {
                  const sharedElementsList = formatSharedElements(
                    share.sharedElements
                  );

                  return (
                    <div
                      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                      key={share.consentId}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {share.playerName}
                            </h3>
                            <Badge className="bg-amber-600" variant="default">
                              Pending
                            </Badge>
                          </div>
                          <div className="mt-1 space-y-1">
                            <p className="text-gray-600 text-sm">
                              <span className="font-medium">
                                Source org(s):
                              </span>{" "}
                              {formatSourceOrgs(
                                share.sourceOrgIds,
                                share.sourceOrgMode
                              )}
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
                            <p className="text-gray-600 text-sm">
                              Shared on:{" "}
                              {new Date(share.consentedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          <Button
                            onClick={() => handleAcceptClick(share)}
                            size="sm"
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Browse players tab */}
          <TabsContent className="mt-4" value="browse">
            <BrowsePlayersTab organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </div>
      <ShareAcceptanceModal
        onOpenChange={setIsModalOpen}
        onSuccess={handleModalSuccess}
        open={isModalOpen}
        share={selectedShare}
      />
    </>
  );
}
