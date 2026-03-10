"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Heart,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { InjuryDetailModal } from "@/components/injuries/injury-detail-modal";
import { PageSkeleton } from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
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
  const currentUser = useCurrentUser();

  const { children: identityChildren, isLoading } = useGuardianChildrenInOrg(
    orgId,
    session?.user?.email
  );

  // State for detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingInjury, setViewingInjury] = useState<{
    _id: Id<"playerInjuries">;
    playerIdentityId: Id<"playerIdentities">;
    injuryType: string;
    bodyPart: string;
    side?: "left" | "right" | "both";
    dateOccurred: string;
    severity: string;
    status: string;
    description: string;
    treatment?: string;
    expectedReturn?: string;
    actualReturn?: string;
    estimatedRecoveryDays?: number;
    recoveryPlanNotes?: string;
    milestones?: Array<{
      id: string;
      description: string;
      targetDate?: string;
      completedDate?: string;
      completedBy?: string;
      notes?: string;
      order: number;
    }>;
    medicalClearanceRequired?: boolean;
    medicalClearanceReceived?: boolean;
    medicalClearanceDate?: string;
    player?: { firstName: string; lastName: string };
  } | null>(null);

  // Child filter state
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Collapsible section state
  const [activeCollapsed, setActiveCollapsed] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  // Get player IDs for querying injuries
  const playerIds = useMemo(
    () => identityChildren.map((c) => c.player._id),
    [identityChildren]
  );

  // Fetch teams and memberships for child cards
  const orgTeams = useQuery(api.models.teams.getTeamsByOrganization, {
    organizationId: orgId,
  });
  const teamMemberships = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    { organizationId: orgId, status: "active" }
  );

  // teamId → name
  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of orgTeams ?? []) {
      map.set(t._id, t.name);
    }
    return map;
  }, [orgTeams]);

  // playerIdentityId → team names
  const teamNamesByPlayer = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of teamMemberships ?? []) {
      const name = teamNameById.get(m.teamId);
      if (!name) {
        continue;
      }
      map.set(m.playerIdentityId, [
        ...(map.get(m.playerIdentityId) ?? []),
        name,
      ]);
    }
    return map;
  }, [teamMemberships, teamNameById]);

  // Age helper
  const calcAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

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

  // Separate active/recovering from healed/cleared (aggregate, for stat cards)
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

  // Per-child injury stats for child filter cards
  const childInjuryStats = useMemo(() => {
    const map = new Map<
      string,
      { active: number; recovering: number; history: number }
    >();
    for (const child of identityChildren) {
      const childInjuries =
        allInjuries?.filter((i) => i.playerIdentityId === child.player._id) ??
        [];
      map.set(child.player._id, {
        active: childInjuries.filter((i) => i.status === "active").length,
        recovering: childInjuries.filter((i) => i.status === "recovering")
          .length,
        history: childInjuries.filter(
          (i) => i.status === "healed" || i.status === "cleared"
        ).length,
      });
    }
    return map;
  }, [identityChildren, allInjuries]);

  // Stats shown in top cards — scoped to selected child or aggregate
  const displayStats = useMemo(() => {
    if (selectedChildId) {
      const stats = childInjuryStats.get(selectedChildId) ?? {
        active: 0,
        recovering: 0,
        history: 0,
      };
      const allClear = stats.active === 0 && stats.recovering === 0;
      return {
        active: stats.active,
        recovering: stats.recovering,
        healed: stats.history,
        allClear: allClear ? 1 : 0,
      };
    }
    return {
      active: activeInjuries.filter((i) => i.status === "active").length,
      recovering: activeInjuries.filter((i) => i.status === "recovering")
        .length,
      healed: inactiveInjuries.length,
      allClear: identityChildren.filter((c) =>
        (allInjuries ?? []).every((i) => i.playerIdentityId !== c.player._id)
      ).length,
    };
  }, [
    selectedChildId,
    childInjuryStats,
    activeInjuries,
    inactiveInjuries,
    identityChildren,
    allInjuries,
  ]);

  // Filtered injuries based on selected child — empty until a child is selected
  const { filteredActive, filteredInactive } = useMemo(() => {
    if (!selectedChildId) {
      return { filteredActive: [], filteredInactive: [] };
    }
    return {
      filteredActive: activeInjuries.filter(
        (i) => i.playerIdentityId === selectedChildId
      ),
      filteredInactive: inactiveInjuries.filter(
        (i) => i.playerIdentityId === selectedChildId
      ),
    };
  }, [selectedChildId, activeInjuries, inactiveInjuries]);

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  const childCount = identityChildren.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white shadow-md md:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <Activity className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl">Injury Tracking</h1>
            <p className="text-amber-100 text-sm">
              Monitor injuries and recovery status for your children
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card className="border-red-200 bg-red-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <AlertTriangle className="text-red-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {displayStats.active}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Active
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-red-100">
              <div
                className="h-1 rounded-full bg-red-500"
                style={{
                  width:
                    childCount > 0
                      ? `${(displayStats.active / childCount) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Clock className="text-amber-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {displayStats.recovering}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Recovering
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-amber-100">
              <div
                className="h-1 rounded-full bg-amber-500"
                style={{
                  width:
                    childCount > 0
                      ? `${(displayStats.recovering / childCount) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Heart className="text-purple-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {displayStats.healed}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Healed
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-100">
              <div
                className="h-1 rounded-full bg-purple-500"
                style={{
                  width:
                    childCount > 0
                      ? `${(displayStats.healed / childCount) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 pt-0 transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <CheckCircle className="text-green-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {displayStats.allClear}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              All Clear
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-100">
              <div
                className="h-1 rounded-full bg-green-500"
                style={{
                  width:
                    childCount > 0
                      ? `${(displayStats.allClear / childCount) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Child Filter Cards */}
      {childCount > 0 && allInjuries !== undefined && (
        <div
          className={`grid gap-3 ${
            childCount === 1
              ? "max-w-xs grid-cols-1"
              : childCount === 2
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
          }`}
        >
          {identityChildren.map((child) => {
            const stats = childInjuryStats.get(child.player._id) ?? {
              active: 0,
              recovering: 0,
              history: 0,
            };
            const isSelected = selectedChildId === child.player._id;
            const allClear = stats.active === 0 && stats.recovering === 0;

            return (
              <button
                className={`cursor-pointer rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}
                key={child.player._id}
                onClick={() =>
                  setSelectedChildId(isSelected ? null : child.player._id)
                }
                style={{
                  backgroundColor: "rgba(var(--org-primary-rgb), 0.06)",
                  borderColor: isSelected
                    ? undefined
                    : "rgba(var(--org-primary-rgb), 0.25)",
                }}
                type="button"
              >
                {/* Name */}
                <p
                  className="truncate font-semibold text-gray-900 text-sm"
                  title={`${child.player.firstName} ${child.player.lastName}`}
                >
                  {child.player.firstName} {child.player.lastName}
                </p>

                {/* DOB + age */}
                {child.player.dateOfBirth && (
                  <p className="text-gray-500 text-xs">
                    {new Date(child.player.dateOfBirth).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}{" "}
                    · Age {calcAge(child.player.dateOfBirth)}
                  </p>
                )}

                {/* Team badges */}
                {(teamNamesByPlayer.get(child.player._id) ?? []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(teamNamesByPlayer.get(child.player._id) ?? []).map(
                      (name) => (
                        <span
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 text-xs"
                          key={name}
                        >
                          {name}
                        </span>
                      )
                    )}
                  </div>
                )}

                {/* Stat icons */}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span
                    className={`flex items-center gap-1 text-xs ${stats.active > 0 ? "text-red-600" : "text-gray-400"}`}
                    title="Active injuries"
                  >
                    <AlertTriangle size={13} />
                    <span className="font-medium">{stats.active}</span>
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs ${stats.recovering > 0 ? "text-amber-600" : "text-gray-400"}`}
                    title="Recovering"
                  >
                    <Clock size={13} />
                    <span className="font-medium">{stats.recovering}</span>
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs ${allClear ? "text-green-600" : "text-gray-400"}`}
                    title="All clear"
                  >
                    <CheckCircle size={13} />
                    <span className="font-medium">{allClear ? "✓" : "–"}</span>
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs ${stats.history > 0 ? "text-purple-600" : "text-gray-400"}`}
                    title="Healed injuries"
                  >
                    <Heart size={13} />
                    <span className="font-medium">{stats.history}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Select a child prompt */}
      {!selectedChildId && childCount > 0 && allInjuries !== undefined && (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-500 text-sm">
              Select a child above to view their injuries
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active Injuries Section */}
      {filteredActive.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Active Injuries ({filteredActive.length})
                </CardTitle>
                <CardDescription>
                  Current injuries requiring attention
                </CardDescription>
              </div>
              <button
                aria-label={activeCollapsed ? "Expand" : "Collapse"}
                className="rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
                onClick={() => setActiveCollapsed((c) => !c)}
                type="button"
              >
                {activeCollapsed ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronUp size={18} />
                )}
              </button>
            </div>
          </CardHeader>
          {!activeCollapsed && (
            <CardContent>
              <div className="space-y-3">
                {filteredActive.map((injury) => {
                  const player = playerMap.get(injury.playerIdentityId);
                  const StatusIcon = STATUS_CONFIG[injury.status].icon;

                  return (
                    <button
                      className="flex w-full cursor-pointer items-start justify-between rounded-lg border border-red-200 bg-white p-4 text-left transition-colors hover:bg-red-50"
                      key={injury._id}
                      onClick={() => {
                        setViewingInjury({
                          ...injury,
                          player: player || undefined,
                        });
                        setShowDetailModal(true);
                      }}
                      type="button"
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
                    </button>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* No Active Injuries message */}
      {selectedChildId &&
        identityChildren.length > 0 &&
        filteredActive.length === 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800">All Clear!</p>
                <p className="text-green-700 text-sm">
                  {selectedChildId
                    ? `${playerMap.get(selectedChildId)?.firstName} has no active or recovering injuries.`
                    : "None of your children have any active or recovering injuries."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Injury History Section */}
      {filteredInactive.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Injury History ({filteredInactive.length})
                </CardTitle>
                <CardDescription>
                  Past injuries that have healed or been cleared
                </CardDescription>
              </div>
              <button
                aria-label={historyCollapsed ? "Expand" : "Collapse"}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={() => setHistoryCollapsed((c) => !c)}
                type="button"
              >
                {historyCollapsed ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronUp size={18} />
                )}
              </button>
            </div>
          </CardHeader>
          {!historyCollapsed && (
            <CardContent>
              <div className="space-y-3">
                {filteredInactive.map((injury) => {
                  const player = playerMap.get(injury.playerIdentityId);
                  const StatusIcon = STATUS_CONFIG[injury.status].icon;

                  return (
                    <button
                      className="flex w-full cursor-pointer items-start justify-between rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                      key={injury._id}
                      onClick={() => {
                        setViewingInjury({
                          ...injury,
                          player: player || undefined,
                        });
                        setShowDetailModal(true);
                      }}
                      type="button"
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
                    </button>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Injury Detail Modal */}
      {session?.user?.id && currentUser && (
        <InjuryDetailModal
          canEdit={false}
          injury={viewingInjury}
          onClose={() => {
            setShowDetailModal(false);
            setViewingInjury(null);
          }}
          open={showDetailModal}
          userId={session.user.id}
          userName={
            `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
            "Parent"
          }
          userRole="guardian"
        />
      )}
    </div>
  );
}

export default function InjuriesPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <InjuriesPageContent />
    </Suspense>
  );
}
