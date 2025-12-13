"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { ArrowLeft, Edit, Loader2, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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

  // Get player passport data
  const playerData = useQuery(api.models.players.getPlayerPassport, {
    playerId: playerId as Id<"players">,
    organizationId: orgId,
  });

  // Get current user session
  const { data: session } = authClient.useSession();

  // Determine user role in organization (TODO: Implement proper role checking)
  const isCoach = true; // For now, assume all logged-in users can edit

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

        {isCoach && (
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
        <BasicInformationSection player={playerData} />
        <GoalsSection player={playerData} />
        <SkillsSection player={playerData} />
        <PositionsFitnessSection player={playerData} />
        <NotesSection isCoach={isCoach} player={playerData} />
      </div>
    </div>
  );
}
