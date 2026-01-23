"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Heart,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";

type Severity = "minor" | "moderate" | "severe" | "long_term";
type InjuryStatus = "active" | "recovering" | "cleared" | "healed";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bgColor: string }
> = {
  minor: { label: "Minor", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  moderate: {
    label: "Moderate",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  severe: { label: "Severe", color: "text-red-700", bgColor: "bg-red-100" },
  long_term: {
    label: "Long Term",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
};

const STATUS_CONFIG: Record<
  InjuryStatus,
  { label: string; color: string; bgColor: string; icon: typeof AlertTriangle }
> = {
  active: {
    label: "Active",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: AlertTriangle,
  },
  recovering: {
    label: "Recovering",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: Clock,
  },
  cleared: {
    label: "Cleared",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: CheckCircle,
  },
  healed: {
    label: "Healed",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: CheckCircle,
  },
};

function InjuriesPageContent() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = authClient.useSession();

  const { children: identityChildren, isLoading } = useGuardianChildrenInOrg(
    orgId,
    session?.user?.email
  );

  // Get player IDs for querying injuries
  const playerIds = useMemo(
    () => identityChildren.map((c) => c.player._id),
    [identityChildren]
  );

  // Query all injuries for all children (including healed)
  const allInjuries = useQuery(
    api.models.playerInjuries.getInjuriesForMultiplePlayers,
    playerIds.length > 0
      ? { playerIdentityIds: playerIds, includeHealed: true }
      : "skip"
  );

  // Create a map of player ID to player info
  const playerMap = useMemo(() => {
    const map = new Map<
      string,
      { firstName: string; lastName: string; ageGroup?: string }
    >();
    for (const child of identityChildren) {
      map.set(child.player._id, {
        firstName: child.player.firstName,
        lastName: child.player.lastName,
        ageGroup: child.enrollment?.ageGroup,
      });
    }
    return map;
  }, [identityChildren]);

  // Separate active/recovering from healed/cleared
  const { activeInjuries, inactiveInjuries } = useMemo(() => {
    if (!allInjuries) {
      return { activeInjuries: [], inactiveInjuries: [] };
    }

    const active = allInjuries.filter(
      (i) => i.status === "active" || i.status === "recovering"
    );
    const inactive = allInjuries.filter(
      (i) => i.status === "healed" || i.status === "cleared"
    );

    return { activeInjuries: active, inactiveInjuries: inactive };
  }, [allInjuries]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8" />
          <div>
            <h1 className="font-bold text-2xl">Injury Tracking</h1>
            <p className="mt-1 text-amber-100">
              Monitor injuries and recovery status for your children
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={activeInjuries.length > 0 ? "border-red-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Active Injuries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`font-bold text-2xl ${activeInjuries.filter((i) => i.status === "active").length > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {activeInjuries.filter((i) => i.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            activeInjuries.filter((i) => i.status === "recovering").length > 0
              ? "border-amber-200"
              : ""
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              Recovering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`font-bold text-2xl ${activeInjuries.filter((i) => i.status === "recovering").length > 0 ? "text-amber-600" : "text-gray-600"}`}
            >
              {activeInjuries.filter((i) => i.status === "recovering").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              All Clear
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">
              {
                identityChildren.filter((c) => {
                  const childActiveInjuries = activeInjuries.filter(
                    (i) => i.playerIdentityId === c.player._id
                  );
                  return childActiveInjuries.length === 0;
                }).length
              }
            </div>
            <p className="text-muted-foreground text-xs">
              children injury-free
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Injuries Section */}
      {activeInjuries.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Active Injuries ({activeInjuries.length})
            </CardTitle>
            <CardDescription>
              Current injuries requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeInjuries.map((injury) => {
                const player = playerMap.get(injury.playerIdentityId);
                const StatusIcon = STATUS_CONFIG[injury.status].icon;

                return (
                  <div
                    className="flex items-start justify-between rounded-lg border border-red-200 bg-white p-4"
                    key={injury._id}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                        <Heart className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {player?.firstName} {player?.lastName}
                          </span>
                          {player?.ageGroup && (
                            <span className="text-muted-foreground text-xs">
                              ({player.ageGroup})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">
                            {injury.bodyPart}
                            {injury.side && ` (${injury.side})`} -{" "}
                            {injury.injuryType}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {injury.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {injury.dateOccurred}
                          </span>
                          {injury.expectedReturn && (
                            <span>
                              Expected return: {injury.expectedReturn}
                            </span>
                          )}
                          {injury.treatment && (
                            <span>Treatment: {injury.treatment}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Badge
                        className={`${SEVERITY_CONFIG[injury.severity].bgColor} ${SEVERITY_CONFIG[injury.severity].color}`}
                      >
                        {SEVERITY_CONFIG[injury.severity].label}
                      </Badge>
                      <Badge
                        className={`${STATUS_CONFIG[injury.status].bgColor} ${STATUS_CONFIG[injury.status].color}`}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {STATUS_CONFIG[injury.status].label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Injuries message */}
      {identityChildren.length > 0 && activeInjuries.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-green-800">All Clear!</p>
              <p className="text-green-700 text-sm">
                None of your children have any active or recovering injuries.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Injury History Section */}
      {inactiveInjuries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Injury History ({inactiveInjuries.length})
            </CardTitle>
            <CardDescription>
              Past injuries that have healed or been cleared
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveInjuries.map((injury) => {
                const player = playerMap.get(injury.playerIdentityId);
                const StatusIcon = STATUS_CONFIG[injury.status].icon;

                return (
                  <div
                    className="flex items-start justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    key={injury._id}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <Heart className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {player?.firstName} {player?.lastName}
                          </span>
                          {player?.ageGroup && (
                            <span className="text-muted-foreground text-xs">
                              ({player.ageGroup})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">
                            {injury.bodyPart}
                            {injury.side && ` (${injury.side})`} -{" "}
                            {injury.injuryType}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {injury.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {injury.dateOccurred}
                          </span>
                          {injury.actualReturn && (
                            <span>Returned: {injury.actualReturn}</span>
                          )}
                          {injury.daysOut && (
                            <span className="font-medium text-orange-600">
                              {injury.daysOut} days out
                            </span>
                          )}
                          {injury.treatment && (
                            <span>Treatment: {injury.treatment}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Badge
                        className={`${SEVERITY_CONFIG[injury.severity].bgColor} ${SEVERITY_CONFIG[injury.severity].color}`}
                      >
                        {SEVERITY_CONFIG[injury.severity].label}
                      </Badge>
                      <Badge
                        className={`${STATUS_CONFIG[injury.status].bgColor} ${STATUS_CONFIG[injury.status].color}`}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {STATUS_CONFIG[injury.status].label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function InjuriesPage() {
  return (
    <Suspense fallback={<Loader />}>
      <InjuriesPageContent />
    </Suspense>
  );
}
