"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Calendar, LayoutDashboard, List, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { TabsSkeleton } from "@/components/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";

type ViewType = "list" | "board" | "calendar" | "players";

type InsightsViewContainerProps = {
  orgId: BetterAuthId<"organization">;
  children: React.ReactNode; // The list view content
};

export function InsightsViewContainer({
  orgId,
  children,
}: InsightsViewContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const coachUserId = session?.user?.id;

  // Get coach preferences
  const preferences = useQuery(
    api.models.trustGatePermissions.getCoachOrgPreferences,
    coachUserId ? { coachId: coachUserId, organizationId: orgId } : "skip"
  );

  // Update preference mutation
  const updatePreference = useMutation(
    api.models.trustGatePermissions.updateCoachOrgPreference
  );

  // Determine current view: URL overrides saved preference
  const urlView = searchParams.get("view") as ViewType | null;
  const savedView = preferences?.teamInsightsViewPreference ?? "list";
  const currentView = urlView ?? savedView;

  // Update preference when view changes
  const handleViewChange = async (newView: string) => {
    const view = newView as ViewType;

    // Update URL (use replace to avoid cluttering history)
    const params = new URLSearchParams(searchParams);
    params.set("view", view);
    router.replace(`?${params.toString()}`);

    // Save preference to backend
    try {
      await updatePreference({
        organizationId: orgId,
        teamInsightsViewPreference: view,
      });
    } catch (error) {
      console.error("Failed to save view preference:", error);
      // Don't toast error - this is not critical
    }
  };

  // If preferences are loading and no URL param, show skeleton
  if (preferences === undefined && !urlView) {
    return <TabsSkeleton />;
  }

  return (
    <Tabs onValueChange={handleViewChange} value={currentView}>
      <TabsList className="w-full md:w-auto">
        <TabsTrigger className="flex items-center gap-2" value="list">
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="board">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Board</span>
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="calendar">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Calendar</span>
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="players">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Players</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent className="mt-6" value="list">
        {children}
      </TabsContent>

      <TabsContent className="mt-6" value="board">
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed">
          <div className="text-center">
            <LayoutDashboard className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground text-sm">
              Board view coming soon (US-P9-020)
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent className="mt-6" value="calendar">
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed">
          <div className="text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground text-sm">
              Calendar view coming soon (US-P9-021)
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent className="mt-6" value="players">
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-muted-foreground/25 border-dashed">
          <div className="text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground text-sm">
              Players view coming soon (US-P9-022)
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
