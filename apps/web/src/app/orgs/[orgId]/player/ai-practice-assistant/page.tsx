"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { OrgThemedGradient } from "@/components/org-themed-gradient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { AIPracticeAssistantPlayer } from "../components/ai-practice-assistant-player";

export default function PlayerAIPracticeAssistantPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session, isPending: sessionLoading } = authClient.useSession();

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

  const playerData = useQuery(
    api.models.sportPassports.getFullPlayerPassportView,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          organizationId: orgId,
        }
      : "skip"
  );

  if (
    sessionLoading ||
    playerIdentity === undefined ||
    playerData === undefined
  ) {
    return (
      <div className="container mx-auto max-w-5xl space-y-5 px-4 py-8">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const playerDataForComponents = playerIdentity
    ? [
        {
          player: {
            _id: playerIdentity._id as Id<"playerIdentities">,
            firstName: playerIdentity.firstName,
            lastName: playerIdentity.lastName,
          },
          enrollment: {
            ageGroup: (playerData as any)?.ageGroup,
            sport: (playerData as any)?.sportCode,
          },
        },
      ]
    : [];

  return (
    <div className="container mx-auto max-w-5xl space-y-5 px-4 py-8">
      <OrgThemedGradient
        className="rounded-lg p-6 shadow-md"
        gradientTo="secondary"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-7 w-7 flex-shrink-0" />
          <div>
            <h1 className="font-bold text-2xl md:text-3xl">
              AI Practice Assistant
            </h1>
            <p className="mt-1 text-sm opacity-90">
              Generate your personalised weekly training plan based on your
              skill ratings and areas for improvement.
            </p>
          </div>
        </div>
      </OrgThemedGradient>

      <Card>
        <CardContent className="p-0">
          {playerDataForComponents.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">
                No player profile linked
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Contact your administrator to link your player profile.
              </p>
            </div>
          ) : (
            <AIPracticeAssistantPlayer
              orgId={orgId}
              playerData={playerDataForComponents}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
