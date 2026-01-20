"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import { CrossSportNotice } from "./components/cross-sport-notice";
import { InsightsDashboard } from "./components/insights-dashboard";
import { OverlayView } from "./components/overlay-view";
import { SplitView } from "./components/split-view";
import { ViewModeSelector } from "./components/view-mode-selector";

export type ViewMode = "insights" | "split" | "overlay";

type ComparisonViewProps = {
  playerIdentityId: Id<"playerIdentities">;
  consentId: Id<"passportShareConsents">;
  organizationId: string;
};

export function ComparisonView({
  playerIdentityId,
  consentId,
  organizationId,
}: ComparisonViewProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: session } = authClient.useSession();
  const userId = currentUser?._id || session?.user?.id;

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("insights");

  // Fetch comparison data
  const comparisonData = useQuery(
    api.models.passportComparison.getComparisonData,
    {
      playerIdentityId,
      consentId,
      organizationId,
    }
  );

  // Fetch user preferences
  const preferences = useQuery(
    api.models.passportComparison.getComparisonPreferences,
    userId ? { userId } : "skip"
  );

  // Save preferences mutation
  const savePreferences = useMutation(
    api.models.passportComparison.saveComparisonPreferences
  );

  // Set default view mode from preferences
  useEffect(() => {
    if (preferences?.defaultViewMode) {
      setViewMode(preferences.defaultViewMode);
    }
  }, [preferences]);

  // Handle view mode change with persistence
  const handleViewModeChange = async (newMode: ViewMode) => {
    setViewMode(newMode);

    // Save preference if user is logged in
    if (userId) {
      try {
        await savePreferences({
          userId,
          defaultViewMode: newMode,
          highlightDivergence: preferences?.highlightDivergence ?? true,
          divergenceThreshold: preferences?.divergenceThreshold ?? 1.0,
        });
      } catch (error) {
        console.error("Failed to save preference:", error);
      }
    }
  };

  // Loading state
  if (comparisonData === undefined) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error/not found state
  if (comparisonData === null) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="py-16 text-center">
          <h1 className="font-bold text-2xl">Comparison Not Available</h1>
          <p className="mt-2 text-muted-foreground">
            The comparison data is not available. The shared passport consent
            may have expired, been revoked, or you don't have permission to view
            it.
          </p>
          <Button className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const playerName = `${comparisonData.player.firstName} ${comparisonData.player.lastName}`;
  const sourceOrgNames = comparisonData.shared.sourceOrgs
    .map((org: { id: string; name: string; sport?: string }) => org.name)
    .join(", ");

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 space-y-4">
        {/* Top row: Back button and player info */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button
              className="shrink-0"
              onClick={() => router.back()}
              size="sm"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="font-bold text-xl sm:text-2xl">{playerName}</h1>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="outline">
                  {comparisonData.local.organizationName}
                </Badge>
                <Badge className="bg-blue-600" variant="secondary">
                  vs {sourceOrgNames}
                </Badge>
              </div>
            </div>
          </div>

          {/* View mode selector - desktop */}
          <div className="hidden sm:block">
            <ViewModeSelector
              onViewModeChange={handleViewModeChange}
              viewMode={viewMode}
            />
          </div>
        </div>

        {/* View mode selector - mobile */}
        <div className="sm:hidden">
          <ViewModeSelector
            onViewModeChange={handleViewModeChange}
            viewMode={viewMode}
          />
        </div>
      </div>

      {/* Cross-sport notice */}
      {!comparisonData.insights.sportsMatch &&
        comparisonData.local.sport &&
        comparisonData.shared.sport && (
          <CrossSportNotice
            localSport={comparisonData.local.sport}
            sharedSport={comparisonData.shared.sport}
          />
        )}

      {/* Main content based on view mode */}
      <div className="mt-6">
        {viewMode === "insights" && (
          <InsightsDashboard comparisonData={comparisonData} />
        )}

        {viewMode === "split" && (
          <SplitView comparisonData={comparisonData} playerName={playerName} />
        )}

        {viewMode === "overlay" && (
          <OverlayView
            comparisonData={comparisonData}
            localOrgName={comparisonData.local.organizationName}
            sharedOrgNames={sourceOrgNames}
          />
        )}
      </div>
    </div>
  );
}
