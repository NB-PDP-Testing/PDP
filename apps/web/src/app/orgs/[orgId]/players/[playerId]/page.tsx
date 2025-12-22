"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, Edit, Loader2, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BenchmarkComparison } from "@/components/benchmark-comparison";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { BasicInformationSection } from "./components/basic-info-section";
import { GoalsSection } from "./components/goals-section";
import { NotesSection } from "./components/notes-section";
import { PositionsFitnessSection } from "./components/positions-fitness-section";
import { SkillsSection } from "./components/skills-section";

export default function PlayerPassportPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const playerId = params.playerId as string;

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

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

        <Button
          disabled={isPdfGenerating}
          onClick={handleShare}
          variant="secondary"
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

      {/* Player Passport Sections */}
      <div className="space-y-4">
        {/* Cast to any since components define their own interfaces for the properties they need */}
        <BasicInformationSection player={playerData as any} />

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
    </div>
  );
}
