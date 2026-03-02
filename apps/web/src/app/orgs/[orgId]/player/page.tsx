"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Phone,
  Target,
  User,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useChildAccess } from "@/hooks/use-child-access";
import { authClient } from "@/lib/auth-client";
import { useMembershipContext } from "@/providers/membership-provider";
import { WeeklySchedule } from "../parents/components/weekly-schedule";
import { AIPracticeAssistantPlayer } from "./components/ai-practice-assistant-player";
import { PlayerFeedbackSnippet } from "./components/player-feedback-snippet";
import { PlayerPassportCard } from "./components/player-passport-card";

export default function PlayerDashboardPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  // Child access — determines if this is a youth account and which content toggles are on
  const { isChildAccount, accessLevel, toggles } = useChildAccess(orgId);

  const { memberships: allMemberships } = useMembershipContext();
  const membership = allMemberships?.find((m) => m.organizationId === orgId);

  const transitionToAdultMutation = useMutation(
    api.models.adultPlayers.transitionToAdult
  );
  const [isGraduating, setIsGraduating] = useState(false);

  // First-run welcome banner for new player role adopters (US-P6-003)
  const [showNewPlayerWelcome, setShowNewPlayerWelcome] = useState(false);
  useEffect(() => {
    const dismissed = localStorage.getItem("playerPortalWelcomeDismissed");
    if (!dismissed) {
      setShowNewPlayerWelcome(true);
    }
  }, []);
  const handleDismissNewPlayerWelcome = () => {
    localStorage.setItem("playerPortalWelcomeDismissed", "true");
    setShowNewPlayerWelcome(false);
  };

  // Look up by userId — the authoritative link between a user account and their player record.
  // Falls back to email for legacy records that may not have userId set yet.
  const userId = session?.user?.id;
  const playerByUserId = useQuery(
    api.models.playerIdentities.findPlayerByUserId,
    userId ? { userId } : "skip"
  );
  const userEmail = session?.user?.email;
  const playerByEmail = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    playerByUserId === null && userEmail
      ? { email: userEmail.toLowerCase() }
      : "skip"
  );
  const playerIdentity = playerByUserId ?? playerByEmail;

  // Passport data (used for passport card summary)
  const playerData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          organizationId: orgId,
        }
      : "skip"
  );

  // Today section queries
  const today = new Date().toISOString().split("T")[0];
  const todayHealthCheck = useQuery(
    api.models.playerHealthChecks.getTodayHealthCheck,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id, checkDate: today }
      : "skip"
  );
  const todayPriorityData = useQuery(
    api.models.adultPlayers.getTodayPriorityData,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id, organizationId: orgId }
      : "skip"
  );

  // Team memberships for welcome banner
  const playerTeams = useQuery(
    api.models.teamPlayerIdentities.getTeamsForPlayerWithCoreFlag,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id,
          organizationId: orgId,
          status: "active",
        }
      : "skip"
  );

  // Active goals for goals snippet
  const activeGoals = useQuery(
    api.models.passportGoals.getGoalsForPlayer,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          status: "in_progress",
        }
      : "skip"
  );

  // Derived values
  const teamNamesDisplay =
    playerTeams && playerTeams.length > 0
      ? playerTeams.map((t) => t.teamName).join(", ")
      : null;

  const wellnessDone =
    todayHealthCheck !== null && todayHealthCheck !== undefined;

  const wellnessScore: number | undefined = (() => {
    if (!todayHealthCheck) {
      return;
    }
    const dims = [
      "sleepQuality",
      "energyLevel",
      "mood",
      "physicalFeeling",
      "motivation",
      "foodIntake",
      "waterIntake",
      "muscleRecovery",
    ] as const;
    const values = dims
      .map((d) => todayHealthCheck[d])
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) {
      return;
    }
    return values.reduce((a, b) => a + b, 0) / values.length;
  })();

  const hasActiveInjuries = (todayPriorityData?.activeInjuryCount ?? 0) > 0;
  const allClear = wellnessDone && !hasActiveInjuries;

  // Cast passportData for derived values used in welcome banner + passport card props
  const passportSummary = playerData as any;

  const isLoading = sessionLoading || allMemberships === undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton className="h-32" key={i} />
          ))}
        </div>
      </div>
    );
  }

  const functionalRoles = membership?.functionalRoles || [];
  const hasPlayerRole = functionalRoles.includes("player");

  if (!hasPlayerRole) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have the Player role in this organization. Contact
              an admin to request access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (playerIdentity === undefined) {
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
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-600" />
              Player Profile Not Linked
            </CardTitle>
            <CardDescription className="mt-2 space-y-3">
              <p>
                You have the Player role, but your account hasn&apos;t been
                linked to a player profile yet.
              </p>
              <p>
                This happens because your login email (
                <span className="font-medium">{session?.user?.email}</span>)
                doesn&apos;t match any player record in the system.
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium text-amber-800 text-sm">
                What to do next:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-amber-700 text-sm">
                <li>
                  Contact your club administrator to link your account to your
                  player profile
                </li>
                <li>
                  Make sure your player record exists in the system with the
                  correct email address
                </li>
                <li>
                  If you&apos;re a new player, ask your coach or admin to create
                  your player profile first
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Youth player account handling
  if (playerIdentity.playerType !== "adult") {
    const dobMs = new Date(playerIdentity.dateOfBirth).getTime();
    const age = Math.floor(
      (Date.now() - dobMs) / (365.25 * 24 * 60 * 60 * 1000)
    );
    const isAdultAge = age >= 18;

    const handleGraduate = async () => {
      setIsGraduating(true);
      try {
        await transitionToAdultMutation({
          playerIdentityId: playerIdentity._id,
        });
        // Page will re-render automatically once playerType updates to "adult"
      } catch (err) {
        console.error("Failed to upgrade account:", err);
        setIsGraduating(false);
      }
    };

    // If the youth player has been granted access by their parent, let them through to the dashboard
    // (access-revoked case is handled by the layout redirect)
    if (
      !isChildAccount ||
      (accessLevel !== "view_only" && accessLevel !== "view_interact")
    ) {
      return (
        <div className="container mx-auto p-4 md:p-8">
          <Card className={isAdultAge ? "border-blue-200" : "border-amber-200"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-5 w-5 ${isAdultAge ? "text-blue-600" : "text-amber-600"}`}
                />
                {isAdultAge
                  ? "Your account is registered as a youth player"
                  : "Youth Player Account"}
              </CardTitle>
              <CardDescription className="mt-2">
                {isAdultAge ? (
                  <>
                    Welcome back, {playerIdentity.firstName}! You&apos;re in our
                    system as{" "}
                    <span className="font-medium">
                      {playerIdentity.firstName} {playerIdentity.lastName}
                    </span>{" "}
                    (born {playerIdentity.dateOfBirth}, age {age}). Your history
                    is here — you just need to upgrade your account to access
                    the adult player portal.
                  </>
                ) : (
                  <>
                    Your player account (
                    <span className="font-medium">
                      {playerIdentity.firstName} {playerIdentity.lastName}
                    </span>
                    , born {playerIdentity.dateOfBirth}) is registered as a
                    youth account. Contact your club administrator to update
                    your account.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            {isAdultAge && (
              <CardContent>
                <Button
                  className="gap-2"
                  disabled={isGraduating}
                  onClick={handleGraduate}
                >
                  {isGraduating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      Upgrade to Adult Account
                    </>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      );
    }
    // Youth player with parent-granted access falls through to the regular dashboard below
  }

  // Player data for AI assistant + weekly schedule
  const playerDataForComponents = [
    {
      player: {
        _id: playerIdentity._id as Id<"playerIdentities">,
        firstName: playerIdentity.firstName,
        lastName: playerIdentity.lastName,
      },
      enrollment: {
        ageGroup: (passportSummary as any)?.ageGroup,
        sport: (passportSummary as any)?.sportCode,
      },
    },
  ];

  // First emergency contact for ICE card
  const firstContact = (passportSummary as any)?.emergencyContacts?.[0];

  return (
    <div className="container mx-auto max-w-5xl space-y-5 px-4 py-8">
      {/* First-run welcome banner for new player role adopters (US-P6-003) */}
      {showNewPlayerWelcome && (
        <div className="flex items-start justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div>
            <p className="font-semibold text-blue-800 text-sm">
              Welcome to your Player portal
            </p>
            <p className="mt-0.5 text-blue-700 text-xs">
              Explore your profile, wellness check-ins, and more.
            </p>
          </div>
          <Button
            className="ml-3 shrink-0 text-blue-700 hover:text-blue-900"
            onClick={handleDismissNewPlayerWelcome}
            size="sm"
            variant="ghost"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* 1. Welcome Banner */}
      <div
        className="rounded-lg p-5 text-white shadow"
        style={{
          background:
            "linear-gradient(135deg, var(--org-primary, #3b82f6), var(--org-secondary, #6366f1))",
        }}
      >
        <h1 className="font-bold text-xl md:text-2xl">
          Welcome back, {playerIdentity.firstName}!
        </h1>
        <p className="mt-1 text-sm opacity-80">
          {activeOrganization?.name}
          {teamNamesDisplay ? ` · ${teamNamesDisplay}` : ""}
          {(passportSummary as any)?.ageGroup
            ? ` · ${(passportSummary as any).ageGroup}`
            : ""}
        </p>
      </div>

      {/* 2. Weekly Schedule */}
      <WeeklySchedule playerData={playerDataForComponents} />

      {/* 3. Wellness + Injury + ICE cards in a responsive grid */}
      {/* For child accounts, only show wellness if includeWellnessAccess toggle is on */}
      <div
        className={`grid gap-4 ${firstContact && !isChildAccount ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        {/* Wellness card — gated for child accounts */}
        {/* Wellness card — hidden entirely for child accounts when toggle is off */}
        {(!isChildAccount || toggles?.includeWellnessAccess) &&
          (wellnessDone ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm">
                      ✓ Wellness checked in today
                    </p>
                    {wellnessScore !== undefined && (
                      <p className="mt-0.5 font-medium text-green-700 text-xs">
                        Score: {wellnessScore.toFixed(1)} / 5
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="space-y-2">
                    <p className="font-semibold text-amber-800 text-sm">
                      Complete your daily wellness check
                    </p>
                    <p className="text-amber-700 text-xs">
                      Takes under a minute
                    </p>
                    <Button
                      asChild
                      className="border-amber-300 text-amber-800 hover:bg-amber-100"
                      size="sm"
                      variant="outline"
                    >
                      <Link
                        href={`/orgs/${orgId}/player/health-check` as Route}
                      >
                        Start Check-In
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {/* Injury card — never shown for child accounts (medical data) */}
        {!isChildAccount && hasActiveInjuries && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="space-y-2">
                  <p className="font-semibold text-amber-800 text-sm">
                    ⚠{" "}
                    {todayPriorityData?.activeInjuryCount === 1
                      ? "1 active injury"
                      : `${todayPriorityData?.activeInjuryCount} active injuries`}
                  </p>
                  {todayPriorityData?.activeInjuryBodyPart && (
                    <p className="text-amber-700 text-xs capitalize">
                      {todayPriorityData.activeInjuryBodyPart}
                    </p>
                  )}
                  <Button
                    asChild
                    className="border-amber-300 text-amber-800 hover:bg-amber-100"
                    size="sm"
                    variant="outline"
                  >
                    <Link href={`/orgs/${orgId}/player/injuries` as Route}>
                      View Injuries
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ICE card — never shown for child accounts (medical/emergency data) */}
        {firstContact && !isChildAccount && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-800 text-sm">
                    ICE: {firstContact.name}
                  </p>
                  {firstContact.phone && (
                    <p className="text-red-700 text-xs">{firstContact.phone}</p>
                  )}
                  <Button
                    asChild
                    className="border-red-300 text-red-800 hover:bg-red-100"
                    size="sm"
                    variant="ghost"
                  >
                    <Link href={`/orgs/${orgId}/player/profile` as Route}>
                      Edit in My Profile
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 5. All Clear Banner */}
      {allClear && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <p className="font-medium text-green-800 text-sm">
              All clear today 🎉 — nothing needs your attention right now.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 6. Latest Coach Feedback — gated by includeCoachFeedback toggle for child accounts */}
      {(!isChildAccount || toggles?.includeCoachFeedback) && (
        <PlayerFeedbackSnippet
          orgId={orgId}
          playerIdentityId={playerIdentity._id as Id<"playerIdentities">}
        />
      )}

      {/* 7. Active Goals snippet — gated by includeDevelopmentGoals toggle for child accounts */}
      {(!isChildAccount || toggles?.includeDevelopmentGoals) &&
        activeGoals &&
        activeGoals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-purple-500" />
                Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeGoals.slice(0, 2).map((goal) => (
                <div className="space-y-1.5" key={goal._id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{goal.title}</p>
                    <Badge className="shrink-0" variant="secondary">
                      {goal.progress}%
                    </Badge>
                  </div>
                  <Progress className="h-1.5" value={goal.progress} />
                </div>
              ))}
              {activeGoals.length > 2 && (
                <p className="text-muted-foreground text-xs">
                  +{activeGoals.length - 2} more goal
                  {activeGoals.length - 2 > 1 ? "s" : ""}
                </p>
              )}
              <Button asChild className="w-full" size="sm" variant="ghost">
                <Link href={`/orgs/${orgId}/player/progress` as Route}>
                  View My Progress
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

      {/* 8. AI Practice Assistant — not shown for child accounts (no profiling/AI for youth) */}
      {!isChildAccount && playerData !== undefined && (
        <AIPracticeAssistantPlayer
          orgId={orgId}
          playerData={playerDataForComponents}
        />
      )}

      {/* 9. My Passport Card — constrained width to match child-card size on parent page */}
      <div className="sm:max-w-sm">
        <PlayerPassportCard
          ageGroup={(passportSummary as any)?.ageGroup}
          matchAttendance={(passportSummary as any)?.matchAttendance}
          orgId={orgId}
          playerIdentityId={playerIdentity._id as Id<"playerIdentities">}
          trainingAttendance={(passportSummary as any)?.trainingAttendance}
        />
      </div>
    </div>
  );
}
