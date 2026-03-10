"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Star,
  Target,
  Users,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { GoalsSection } from "../../players/[playerId]/components/goals-section";
import { NotesSection } from "../../players/[playerId]/components/notes-section";
import { PositionsFitnessSection } from "../../players/[playerId]/components/positions-fitness-section";
import { SkillsSection } from "../../players/[playerId]/components/skills-section";

const SPORT_EMOJIS: Record<string, string> = {
  gaa: "🏐",
  gaa_football: "🏐",
  soccer: "⚽",
  football: "🏈",
  basketball: "🏀",
  rugby: "🏉",
  hurling: "🏑",
  camogie: "🏑",
  hockey: "🏒",
  tennis: "🎾",
  athletics: "🏃",
};

function formatSportName(code: string) {
  return code.replace(/[-_]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

type TeamInfo = {
  teamId: string;
  name: string;
  ageGroup?: string;
  gender?: string;
  sport?: string;
  sportCode?: string;
  playerCount: number;
};

type TeamSelectorProps = {
  teams: TeamInfo[];
  selectedTeamId: string | null;
  onSelect: (teamId: string) => void;
};

function TeamSelector({ teams, selectedTeamId, onSelect }: TeamSelectorProps) {
  const [expanded, setExpanded] = useState(true);

  if (teams.length === 0) {
    return null;
  }

  const effectiveSelected = selectedTeamId ?? teams[0]?.teamId;

  return (
    <div>
      <button
        className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-gray-50"
        onClick={() => setExpanded((prev) => !prev)}
        type="button"
      >
        <span className="font-semibold text-gray-700 text-sm">
          {effectiveSelected
            ? `${teams.find((t) => t.teamId === effectiveSelected)?.name ?? "Select Team"} · selected`
            : "Select a team"}
        </span>
        {expanded ? (
          <ChevronUp className="text-gray-500" size={18} />
        ) : (
          <ChevronDown className="text-gray-500" size={18} />
        )}
      </button>

      {expanded && (
        <div
          className={`grid gap-3 md:gap-4 ${
            teams.length === 1
              ? "max-w-xs grid-cols-1"
              : "grid-cols-2 md:grid-cols-3"
          }`}
        >
          {teams.map((team) => {
            const isSelected = effectiveSelected === team.teamId;
            const sportEmoji = team.sportCode
              ? (SPORT_EMOJIS[team.sportCode] ?? "🏅")
              : "🏅";
            const meta = [team.ageGroup, team.gender]
              .filter(Boolean)
              .join(" · ");

            return (
              <button
                className="cursor-pointer rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md"
                key={team.teamId}
                onClick={() => onSelect(team.teamId)}
                style={{
                  backgroundColor: isSelected
                    ? "rgba(var(--org-primary-rgb), 0.12)"
                    : "rgba(var(--org-primary-rgb), 0.04)",
                  borderColor: isSelected
                    ? "rgba(var(--org-primary-rgb), 0.6)"
                    : "rgba(var(--org-primary-rgb), 0.2)",
                  outline: isSelected
                    ? "2px solid rgba(var(--org-primary-rgb), 0.5)"
                    : undefined,
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-gray-900 text-sm leading-tight">
                    {sportEmoji} {team.name}
                  </p>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-gray-800 text-sm leading-tight">
                      {team.playerCount}
                    </p>
                    <p className="text-gray-500 text-xs">players</p>
                  </div>
                </div>
                {meta && <p className="mt-1 text-gray-500 text-xs">{meta}</p>}
                {team.sport && (
                  <p className="text-gray-400 text-xs">
                    {formatSportName(team.sport)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
};

function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <button
            aria-label={collapsed ? "Expand section" : "Collapse section"}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            onClick={() => setCollapsed((c) => !c)}
            type="button"
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </CardHeader>
      {!collapsed && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export default function PlayerTeamsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  const userEmail = session?.user?.email;

  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  const teamMemberships = useQuery(
    api.models.teamPlayerIdentities.getTeamsForPlayer,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id as Id<"playerIdentities"> }
      : "skip"
  );

  const orgTeams = useQuery(
    api.models.teams.getTeamsByOrganization,
    orgId ? { organizationId: orgId } : "skip"
  );

  // All org team members to compute player counts per team
  const allOrgMembers = useQuery(
    api.models.teamPlayerIdentities.getTeamMembersForOrg,
    orgId ? { organizationId: orgId, status: "active" } : "skip"
  );

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Build team info list from player's memberships
  const myTeams = useMemo<TeamInfo[]>(() => {
    if (!(teamMemberships && orgTeams)) {
      return [];
    }

    const activeMyMemberships = teamMemberships.filter(
      (m) => m.status === "active"
    );

    const playerCountByTeam = new Map<string, number>();
    if (allOrgMembers) {
      for (const m of allOrgMembers) {
        const count = playerCountByTeam.get(m.teamId) ?? 0;
        playerCountByTeam.set(m.teamId, count + 1);
      }
    }

    return activeMyMemberships.flatMap((membership) => {
      const teamDetail = orgTeams.find((t) => t._id === membership.teamId);
      if (!teamDetail) {
        return [];
      }
      const info: TeamInfo = {
        teamId: membership.teamId,
        name: teamDetail.name,
        ageGroup: teamDetail.ageGroup,
        gender: teamDetail.gender ?? undefined,
        sport: teamDetail.sport ?? undefined,
        sportCode: teamDetail.sport
          ? teamDetail.sport.toLowerCase().replace(/\s+/g, "_")
          : undefined,
        playerCount: playerCountByTeam.get(membership.teamId) ?? 0,
      };
      return [info];
    });
  }, [teamMemberships, orgTeams, allOrgMembers]);

  const effectiveTeamId = selectedTeamId ?? myTeams[0]?.teamId ?? null;
  const selectedTeam = myTeams.find((t) => t.teamId === effectiveTeamId);

  // Get passport data for the selected team's sport
  const passportData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    playerIdentity?._id && effectiveTeamId && selectedTeam?.sportCode
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          organizationId: orgId,
          sportCode: selectedTeam.sportCode,
        }
      : playerIdentity?._id && effectiveTeamId && !selectedTeam?.sportCode
        ? {
            playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
            organizationId: orgId,
          }
        : "skip"
  );

  // Stat summary
  const totalGoals = useMemo(() => {
    if (!passportData) {
      return 0;
    }
    return (passportData as any).goals?.length ?? 0;
  }, [passportData]);

  const completedGoals = useMemo(() => {
    if (!passportData) {
      return 0;
    }
    return (
      (passportData as any).goals?.filter(
        (g: any) => g.status === "completed" || g.status === "achieved"
      ).length ?? 0
    );
  }, [passportData]);

  const overallRating = useMemo(() => {
    if (!passportData) {
      return null;
    }
    return (passportData as any).overallScore ?? null;
  }, [passportData]);

  // Loading state
  if (playerIdentity === undefined || teamMemberships === undefined) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!playerIdentity) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Profile Not Linked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Your account hasn&apos;t been linked to a player profile yet.
              Contact your club administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (myTeams.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <OrgThemedGradient className="rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-bold text-2xl md:text-3xl">My Teams</h1>
              <p className="opacity-80">
                {playerIdentity.firstName} {playerIdentity.lastName}
              </p>
              {activeOrganization && (
                <p className="text-sm opacity-60">{activeOrganization.name}</p>
              )}
            </div>
          </div>
        </OrgThemedGradient>

        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Teams Yet</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground text-sm">
              You haven&apos;t been assigned to any teams yet. Contact your club
              administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header */}
      <OrgThemedGradient className="rounded-lg p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-bold text-2xl md:text-3xl">My Teams</h1>
            <p className="opacity-80">
              {playerIdentity.firstName} {playerIdentity.lastName}
            </p>
            {activeOrganization && (
              <p className="text-sm opacity-60">{activeOrganization.name}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {myTeams.map((t) => (
                <span
                  className="rounded-full bg-white/20 px-2 py-0.5 font-medium text-xs"
                  key={t.teamId}
                >
                  {t.sportCode ? (SPORT_EMOJIS[t.sportCode] ?? "🏅") : "🏅"}{" "}
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </OrgThemedGradient>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {/* Teams */}
        <Card className="border-blue-200 bg-blue-50 pt-0">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-blue-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {myTeams.length}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              My Teams
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-blue-500/20">
              <div
                className="h-1 rounded-full bg-blue-500"
                style={{ width: "100%" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Players across my teams */}
        <Card className="border-green-200 bg-green-50 pt-0">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Users className="text-green-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {myTeams.reduce((sum, t) => sum + t.playerCount, 0)}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Total Players
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-green-500/20">
              <div
                className="h-1 rounded-full bg-green-500"
                style={{ width: "100%" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="border-purple-200 bg-purple-50 pt-0">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Target className="text-purple-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {totalGoals}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              {selectedTeam ? `${selectedTeam.name} Goals` : "Team Goals"}
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-500/20">
              <div
                className="h-1 rounded-full bg-purple-500"
                style={{
                  width:
                    totalGoals > 0
                      ? `${Math.round((completedGoals / totalGoals) * 100)}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Overall rating */}
        <Card className="border-orange-200 bg-orange-50 pt-0">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <Star className="text-orange-500" size={20} />
              <div className="font-bold text-gray-800 text-xl md:text-2xl">
                {overallRating !== null ? overallRating.toFixed(1) : "–"}
              </div>
            </div>
            <div className="font-medium text-gray-600 text-xs md:text-sm">
              Overall Rating
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-orange-500/20">
              <div
                className="h-1 rounded-full bg-orange-500"
                style={{
                  width:
                    overallRating !== null
                      ? `${Math.min(100, (overallRating / 10) * 100)}%`
                      : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team selector */}
      <TeamSelector
        onSelect={(id) => setSelectedTeamId(id)}
        selectedTeamId={effectiveTeamId}
        teams={myTeams}
      />

      {/* Selected team content */}
      {selectedTeam && (
        <div className="space-y-4">
          {/* Team summary card */}
          <Card
            className="border"
            style={{
              backgroundColor: "rgba(var(--org-primary-rgb), 0.03)",
              borderColor: "rgba(var(--org-primary-rgb), 0.2)",
            }}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {selectedTeam.sportCode
                    ? (SPORT_EMOJIS[selectedTeam.sportCode] ?? "🏅")
                    : "🏅"}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedTeam.name}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {[selectedTeam.ageGroup, selectedTeam.gender]
                      .filter(Boolean)
                      .join(" · ")}
                    {selectedTeam.sport
                      ? ` · ${formatSportName(selectedTeam.sport)}`
                      : ""}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-bold text-gray-800 text-lg">
                    {selectedTeam.playerCount}
                  </p>
                  <p className="text-gray-500 text-xs">players</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Passport content for this team */}
          {passportData === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : passportData === null ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  No passport data found for this team&apos;s sport.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <CollapsibleSection title="Goals">
                <GoalsSection player={passportData as any} />
              </CollapsibleSection>

              <CollapsibleSection title="Coach Notes">
                <NotesSection isCoach={false} player={passportData as any} />
              </CollapsibleSection>

              <CollapsibleSection title="Skills">
                <SkillsSection player={passportData as any} />
              </CollapsibleSection>

              <CollapsibleSection title="Positions & Fitness">
                <PositionsFitnessSection player={passportData as any} />
              </CollapsibleSection>
            </>
          )}
        </div>
      )}
    </div>
  );
}
