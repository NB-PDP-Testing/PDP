"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, Edit, ExternalLink, Loader2, Share2 } from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BenchmarkComparison } from "@/components/benchmark-comparison";
import { SkillRadarChart } from "@/components/skill-radar-chart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import type { PassportPDFData } from "@/lib/pdf-generator";
import { BasicInformationSection } from "./components/basic-info-section";
import { CrossSportOverview } from "./components/cross-sport-overview";
import { EmergencyContactsSection } from "./components/emergency-contacts-section";
import { GoalsSection } from "./components/goals-section";
import { NotesSection } from "./components/notes-section";
import { PositionsFitnessSection } from "./components/positions-fitness-section";
import { RequestAccessModal } from "./components/request-access-modal";
import { ShareModal } from "./components/share-modal";
import { SkillsSection } from "./components/skills-section";

export default function PlayerPassportPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const playerId = params.playerId as string;

  const [showShareModal, setShowShareModal] = useState(false);
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);

  // Use new identity system (legacy fallback removed)
  const playerData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    {
      playerIdentityId: playerId as Id<"playerIdentities">,
      organizationId: orgId,
    }
  );

  // Get current user session
  const { data: session } = authClient.useSession();

  // Get user's role details in this organization
  const roleDetails = useQuery(
    api.models.members.getMemberRoleDetails,
    session?.user?.email
      ? { organizationId: orgId, userEmail: session.user.email }
      : "skip"
  );

  // Check if this user is a player viewing their own profile
  // If so, redirect to /player/ for proper role context
  const userEmail = session?.user?.email;
  const ownPlayerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  // Track if we've already attempted redirect to prevent infinite loops
  const hasAttemptedRedirect = useRef(false);

  // Redirect player to /player/ if viewing own profile
  useEffect(() => {
    // Only attempt redirect once
    if (hasAttemptedRedirect.current) {
      return;
    }

    if (!roleDetails || ownPlayerIdentity === undefined) {
      return;
    }

    // Check if user has player role AND is viewing their own profile
    const hasPlayerRole = roleDetails.functionalRoles?.includes("player");
    const isOwnProfile = ownPlayerIdentity?._id === playerId;

    if (hasPlayerRole && isOwnProfile) {
      hasAttemptedRedirect.current = true;
      // Redirect to player self-access route
      router.replace(`/orgs/${orgId}/player` as Route);
    }
    // We check roleDetails and ownPlayerIdentity once they're loaded
    // The ref prevents re-runs even if these objects get new references
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roleDetails,
    ownPlayerIdentity,
    orgId,
    playerId, // Redirect to player self-access route
    router.replace,
  ]);

  // Check share status for this player (for coach access request feature)
  const shareStatus = useQuery(
    api.models.passportSharing.checkPlayerShareStatus,
    {
      playerIdentityId: playerId as Id<"playerIdentities">,
      organizationId: orgId,
    }
  );

  // Get ALL sport passports for cross-sport analysis
  const allPassports = useQuery(
    api.models.sportPassports.getPassportsForPlayer,
    { playerIdentityId: playerId as Id<"playerIdentities"> }
  );

  // Check if player has multiple sports
  const showCrossSportTab = (allPassports?.length ?? 0) > 1;

  // Determine user permissions based on functional roles
  const permissions = useMemo(() => {
    if (!roleDetails) {
      return { canEdit: false, canViewNotes: false, isParent: false };
    }

    const { betterAuthRole, functionalRoles } = roleDetails;

    // Check functional roles for capabilities
    const isAdmin =
      functionalRoles.includes("admin") ||
      betterAuthRole === "owner" ||
      betterAuthRole === "admin";
    const isCoach = functionalRoles.includes("coach");
    const isParent = functionalRoles.includes("parent");

    // Coaches and admins can edit player data
    const canEdit = isAdmin || isCoach;

    // All roles can view notes, but only coaches/admins can edit
    const canViewNotes = isAdmin || isCoach || isParent;

    return { canEdit, canViewNotes, isParent, isAdmin, isCoach };
  }, [roleDetails]);

  // Transform player data for PDF generation
  // Memoized to prevent infinite loops when passed to ShareModal
  // Must be before early returns to comply with React hooks rules
  const pdfData: PassportPDFData | null = useMemo(
    () =>
      playerData
        ? {
            playerName: playerData.name || "Unknown Player",
            dateOfBirth: (playerData as any).dateOfBirth,
            ageGroup: (playerData as any).ageGroup,
            sport: playerData.sportCode,
            organization: (playerData as any).organizationName,
            skills: playerData.skills as Record<string, number> | undefined,
            goals: (playerData as any).goals?.map((g: any) => ({
              title: g.title || g.description,
              status: g.status,
              targetDate: g.targetDate,
            })),
            notes: (playerData as any).notes?.map((n: any) => ({
              content: n.content || n.note,
              coachName: n.coachName || n.authorName,
              date:
                n.date ||
                new Date(n.createdAt || n._creationTime).toLocaleDateString(),
            })),
            overallScore: (playerData as any).overallScore,
            trainingAttendance: (playerData as any).trainingAttendance,
            matchAttendance: (playerData as any).matchAttendance,
          }
        : null,
    [playerData]
  );

  if (playerData === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (playerData === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-bold text-2xl">Player Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            This player doesn't exist or you don't have access to view them.
          </p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    router.push(`/orgs/${orgId}/players/${playerId}/edit`);
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Header Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {permissions.canEdit && (
          <Button onClick={handleEdit} variant="default">
            <Edit className="mr-2 h-4 w-4" />
            Edit Player
          </Button>
        )}

        <Button onClick={() => setShowShareModal(true)} variant="secondary">
          <Share2 className="mr-2 h-4 w-4" />
          Share / Export
        </Button>

        {/* Coach: Request Access or View Shared Passport */}
        {permissions.isCoach && shareStatus && (
          <>
            {shareStatus.hasActiveShare && shareStatus.consentId && (
              <Button
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                onClick={() =>
                  router.push(
                    `/orgs/${orgId}/players/${playerId}/shared?consentId=${shareStatus.consentId}`
                  )
                }
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Shared Passport
              </Button>
            )}

            {shareStatus.canRequestAccess && (
              <Button
                onClick={() => setShowRequestAccessModal(true)}
                variant="outline"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Request Access
              </Button>
            )}

            {!shareStatus.hasActiveShare && shareStatus.hasPendingRequest && (
              <Button disabled variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Request Pending
              </Button>
            )}
          </>
        )}
      </div>

      {/* Player Passport Sections */}
      {showCrossSportTab ? (
        <Tabs className="w-full" defaultValue="primary">
          <TabsList>
            <TabsTrigger value="primary">
              {playerData.sportCode || "Primary Sport"}
            </TabsTrigger>
            <TabsTrigger value="cross-sport">Cross-Sport Analysis</TabsTrigger>
          </TabsList>

          <TabsContent className="space-y-4" value="primary">
            {/* Cast to any since components define their own interfaces for the properties they need */}
            <BasicInformationSection player={playerData as any} />

            {/* Emergency Contacts - for adult players, shown right after basic info */}
            {"playerType" in playerData &&
              playerData.playerType === "adult" && (
                <EmergencyContactsSection
                  isEditable={false}
                  playerIdentityId={playerId as Id<"playerIdentities">} // Coaches can view but not edit adult player's contacts
                  playerType="adult"
                />
              )}

            {/* Skills Radar Chart - visual overview of player skills */}
            {playerData.sportCode && (
              <SkillRadarChart
                dateOfBirth={(playerData as any).dateOfBirth}
                playerId={playerId as Id<"playerIdentities">}
                sportCode={playerData.sportCode}
              />
            )}

            {/* Benchmark Comparison - only for new identity system with sport passport */}
            {"playerIdentityId" in playerData &&
              playerData.playerIdentityId &&
              playerData.sportCode && (
                <BenchmarkComparison
                  dateOfBirth={(playerData as any).dateOfBirth ?? ""}
                  playerId={playerData.playerIdentityId}
                  showAllSkills={true}
                  sportCode={playerData.sportCode}
                />
              )}

            <GoalsSection player={playerData as any} />
            <NotesSection
              isCoach={permissions.canEdit}
              player={playerData as any}
            />
            <SkillsSection player={playerData as any} />
            <PositionsFitnessSection player={playerData as any} />
          </TabsContent>

          <TabsContent className="space-y-4" value="cross-sport">
            <CrossSportOverview
              playerIdentityId={playerId as Id<"playerIdentities">}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {/* Single-sport player - existing layout */}
          <BasicInformationSection player={playerData as any} />

          {/* Emergency Contacts - for adult players, shown right after basic info */}
          {"playerType" in playerData && playerData.playerType === "adult" && (
            <EmergencyContactsSection
              isEditable={false}
              playerIdentityId={playerId as Id<"playerIdentities">}
              playerType="adult"
            />
          )}

          {/* Skills Radar Chart - visual overview of player skills */}
          {playerData.sportCode && (
            <SkillRadarChart
              dateOfBirth={(playerData as any).dateOfBirth}
              playerId={playerId as Id<"playerIdentities">}
              sportCode={playerData.sportCode}
            />
          )}

          {/* Benchmark Comparison - only for new identity system with sport passport */}
          {"playerIdentityId" in playerData &&
            playerData.playerIdentityId &&
            playerData.sportCode && (
              <BenchmarkComparison
                dateOfBirth={(playerData as any).dateOfBirth ?? ""}
                playerId={playerData.playerIdentityId}
                showAllSkills={true}
                sportCode={playerData.sportCode}
              />
            )}

          <GoalsSection player={playerData as any} />
          <NotesSection
            isCoach={permissions.canEdit}
            player={playerData as any}
          />
          <SkillsSection player={playerData as any} />
          <PositionsFitnessSection player={playerData as any} />
        </div>
      )}

      {/* Share Modal */}
      {pdfData && (
        <ShareModal
          onOpenChange={setShowShareModal}
          open={showShareModal}
          playerData={pdfData}
          playerName={playerData.name || "Player"}
        />
      )}

      {/* Request Access Modal */}
      <RequestAccessModal
        onOpenChange={setShowRequestAccessModal}
        onRequestSent={() => {
          // Refresh share status after request is sent
          // The query will automatically update via Convex reactivity
        }}
        open={showRequestAccessModal}
        organizationId={orgId}
        playerIdentityId={playerId as Id<"playerIdentities">}
        playerName={playerData.name || "Player"}
      />
    </div>
  );
}
