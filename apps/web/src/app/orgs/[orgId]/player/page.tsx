"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Share2,
  User,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BenchmarkComparison } from "@/components/benchmark-comparison";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useMembershipContext } from "@/providers/membership-provider";

// Import the same sections used in the coach view
import { BasicInformationSection } from "../players/[playerId]/components/basic-info-section";
import { EmergencyContactsSection } from "../players/[playerId]/components/emergency-contacts-section";
import { GoalsSection } from "../players/[playerId]/components/goals-section";
import { NotesSection } from "../players/[playerId]/components/notes-section";
import { PositionsFitnessSection } from "../players/[playerId]/components/positions-fitness-section";
import { SkillsSection } from "../players/[playerId]/components/skills-section";

export default function PlayerDashboardPage() {
  const params = useParams();
  const _router = useRouter();
  const orgId = params.orgId as string;

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  // Get membership details for role checking (from shared context)
  const { memberships: allMemberships } = useMembershipContext();
  const membership = allMemberships?.find((m) => m.organizationId === orgId);

  // Find the player identity linked to this user's email
  const userEmail = session?.user?.email;
  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  // Get the full player passport data (same as coach view)
  const playerData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          organizationId: orgId,
        }
      : "skip"
  );

  // Get org enrollment for this player
  const enrollment = useQuery(
    api.models.orgPlayerEnrollments.getEnrollment,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id, organizationId: orgId }
      : "skip"
  );

  // Today section queries
  const todayHealthCheck = useQuery(
    api.models.adultPlayers.getTodayHealthCheck,
    playerIdentity?._id ? { playerIdentityId: playerIdentity._id } : "skip"
  );
  const todayPriorityData = useQuery(
    api.models.adultPlayers.getTodayPriorityData,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id, organizationId: orgId }
      : "skip"
  );

  // Today section derived values
  const wellnessDone =
    todayHealthCheck !== null && todayHealthCheck !== undefined;
  const hasActiveInjuries = (todayPriorityData?.activeInjuryCount ?? 0) > 0;
  const hasUnreadFeedback = false; // stub until Phase 5
  const allClear = wellnessDone && !hasActiveInjuries && !hasUnreadFeedback;

  // Format today's date as "Tuesday, 25 Feb"
  const todayFormatted = (() => {
    const d = new Date();
    const dayName = d.toLocaleDateString("en-GB", { weekday: "long" });
    const day = d.getDate();
    const month = d.toLocaleDateString("en-GB", { month: "short" });
    return `${dayName}, ${day} ${month}`;
  })();

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

  // Check if user has player role
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

  // Loading state for player identity lookup
  if (playerIdentity === undefined) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Player identity not found - show helpful error
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

  // Loading state for player passport data
  if (playerData === undefined) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    setIsPdfGenerating(true);
    try {
      // TODO: Implement PDF generation
      toast.info("PDF generation coming soon!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* TODAY SECTION */}
      <section className="space-y-4">
        <h2 className="font-semibold text-xl">Today</h2>

        {/* Priority action cards */}
        {allClear ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">
                  All clear today 🎉
                </p>
                <p className="text-green-700 text-sm">
                  Nothing needs your attention right now.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {/* Wellness card — always shown */}
            {wellnessDone ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800 text-sm">
                        ✓ Wellness checked in today
                      </p>
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
            )}

            {/* Injury card — only shown if active injuries */}
            {hasActiveInjuries && (
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
          </div>
        )}

        {/* Mobile: anchor link to full profile */}
        <div className="md:hidden">
          <a
            className="text-muted-foreground text-sm hover:text-foreground"
            href="#full-profile"
          >
            See full profile ↓
          </a>
        </div>

        {/* Quick stats strip */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium">
            {playerIdentity.firstName} {playerIdentity.lastName}
          </span>
          {enrollment?.ageGroup && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {enrollment.ageGroup}
              </span>
            </>
          )}
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{todayFormatted}</span>
        </div>
      </section>

      {/* MY PROFILE SECTION DIVIDER */}
      <div className="flex items-center gap-4 pt-2" id="full-profile">
        <Separator className="flex-1" />
        <span className="shrink-0 font-medium text-muted-foreground text-sm uppercase tracking-wide">
          My Profile
        </span>
        <Separator className="flex-1" />
      </div>

      {/* Header */}
      <OrgThemedGradient
        className="rounded-lg p-6 shadow-lg"
        style={{ filter: "brightness(0.95)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-bold text-2xl md:text-3xl">
                My Player Passport
              </h1>
              <p className="opacity-80">
                Welcome back, {session?.user?.name || playerIdentity.firstName}!
              </p>
              {activeOrganization && (
                <p className="text-sm opacity-60">{activeOrganization.name}</p>
              )}
            </div>
          </div>
          <Button
            className="border-current/20 bg-current/20 hover:bg-current/30"
            disabled={isPdfGenerating}
            onClick={handleShare}
            variant="outline"
          >
            {isPdfGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Share PDF
              </>
            )}
          </Button>
        </div>
      </OrgThemedGradient>

      {/* If we have full passport data, show the full view */}
      {playerData ? (
        <div className="space-y-4">
          {/* Basic Information - same as coach view */}
          <BasicInformationSection player={playerData as any} />

          {/* Emergency Contacts - adult players can manage their own (immediately after basic info) */}
          {playerIdentity.playerType === "adult" && (
            <EmergencyContactsSection
              isEditable={true}
              playerIdentityId={playerIdentity._id}
              playerType="adult"
            />
          )}

          {/* Benchmark Comparison - same as coach view */}
          {"playerIdentityId" in playerData &&
            playerData.playerIdentityId &&
            playerData.sportCode && (
              <BenchmarkComparison
                ageGroup={(playerData as any).ageGroup}
                dateOfBirth={(playerData as any).dateOfBirth}
                playerId={playerData.playerIdentityId}
                showAllSkills={true}
                sportCode={playerData.sportCode}
              />
            )}

          {/* Goals Section - same as coach view */}
          <GoalsSection player={playerData as any} />

          {/* Development Notes - same as coach view (read-only for players) */}
          <NotesSection isCoach={false} player={playerData as any} />

          {/* Skills Section - same as coach view */}
          <SkillsSection player={playerData as any} />

          {/* Positions and Fitness - same as coach view */}
          <PositionsFitnessSection player={playerData as any} />
        </div>
      ) : (
        // Fallback to basic info if no passport data yet
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-sm">Name</p>
                <p className="font-medium">
                  {playerIdentity.firstName} {playerIdentity.lastName}
                </p>
              </div>
              {playerIdentity.dateOfBirth && (
                <div>
                  <p className="text-muted-foreground text-sm">Date of Birth</p>
                  <p className="font-medium">
                    {new Date(playerIdentity.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              )}
              {enrollment && (
                <>
                  <div>
                    <p className="text-muted-foreground text-sm">Age Group</p>
                    <p className="font-medium">
                      {enrollment.ageGroup || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Status</p>
                    <Badge
                      variant={
                        enrollment.status === "active" ? "default" : "secondary"
                      }
                    >
                      {enrollment.status}
                    </Badge>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-amber-800 text-sm">
                Your full player passport is being set up. Once your coach adds
                assessments and goals, you&apos;ll see your complete development
                profile here including skills, benchmarks, and development
                notes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contacts Section - always show for adult players */}
      {playerIdentity.playerType === "adult" && !playerData && (
        <EmergencyContactsSection
          isEditable={true}
          playerIdentityId={playerIdentity._id}
          playerType="adult"
        />
      )}
    </div>
  );
}
