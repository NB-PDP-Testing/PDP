"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Loader2,
  Share2,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BenchmarkComparison } from "@/components/benchmark-comparison";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";

// Import the same sections used in the coach view
import { BasicInformationSection } from "../players/[playerId]/components/basic-info-section";
import { EmergencyContactsSection } from "../players/[playerId]/components/emergency-contacts-section";
import { GoalsSection } from "../players/[playerId]/components/goals-section";
import { NotesSection } from "../players/[playerId]/components/notes-section";
import { PositionsFitnessSection } from "../players/[playerId]/components/positions-fitness-section";
import { SkillsSection } from "../players/[playerId]/components/skills-section";

export default function PlayerDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  // Get membership details for role checking
  const allMemberships = useQuery(
    api.models.members.getMembersForAllOrganizations
  );
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
              You don&apos;t have the Player role in this organization. Contact an
              admin to request access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Loading state for player data
  if (playerData === undefined || playerIdentity === undefined) {
    return (
      <div className="container mx-auto space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Player identity not found
  if (!playerIdentity) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              Your player profile hasn&apos;t been linked yet. Please contact an
              administrator to set up your player passport.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleShare = async () => {
    setIsPdfGenerating(true);
    try {
      // TODO: Implement PDF generation
      alert("PDF generation coming soon!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header */}
      <div
        className="rounded-lg p-6 text-white shadow-lg"
        style={{
          background: "linear-gradient(to right, var(--org-primary), var(--org-primary))",
          filter: "brightness(0.95)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-2xl md:text-3xl">My Player Passport</h1>
              <p className="text-white/80">
                Welcome back, {session?.user?.name || playerIdentity.firstName}!
              </p>
              {activeOrganization && (
                <p className="text-white/60 text-sm">{activeOrganization.name}</p>
              )}
            </div>
          </div>
          <Button
            className="bg-white/20 text-white hover:bg-white/30"
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
      </div>

      {/* If we have full passport data, show the full view */}
      {playerData ? (
        <div className="space-y-4">
          {/* Basic Information - same as coach view */}
          <BasicInformationSection player={playerData as any} />

          {/* Emergency Contacts - adult players can manage their own (immediately after basic info) */}
          {playerIdentity.playerType === "adult" && (
            <EmergencyContactsSection
              playerIdentityId={playerIdentity._id}
              isEditable={true}
              playerType="adult"
            />
          )}

          {/* Benchmark Comparison - same as coach view */}
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

          {/* Goals Section - same as coach view */}
          <GoalsSection player={playerData as any} />

          {/* Development Notes - same as coach view (read-only for players) */}
          <NotesSection
            isCoach={false}
            player={playerData as any}
          />

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
                    <p className="font-medium">{enrollment.ageGroup || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Status</p>
                    <Badge variant={enrollment.status === "active" ? "default" : "secondary"}>
                      {enrollment.status}
                    </Badge>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-amber-800 text-sm">
                Your full player passport is being set up. Once your coach adds assessments and goals, 
                you&apos;ll see your complete development profile here including skills, benchmarks, and development notes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contacts Section - always show for adult players */}
      {playerIdentity.playerType === "adult" && !playerData && (
        <EmergencyContactsSection
          playerIdentityId={playerIdentity._id}
          isEditable={true}
          playerType="adult"
        />
      )}
    </div>
  );
}
