"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Heart, Info, Loader2, User } from "lucide-react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";

// Score label and colour for a numeric wellness score (1–5)
function ScoreBadge({ score }: { score: number }) {
  if (score >= 4) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        {score.toFixed(1)} Good
      </Badge>
    );
  }
  if (score >= 3) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        {score.toFixed(1)} Fair
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
      {score.toFixed(1)} Low
    </Badge>
  );
}

// Per-child wellness card. Each child's wellness data is fetched individually.
function ChildWellnessCard({
  playerIdentityId,
  firstName,
  lastName,
  ageGroup,
}: {
  playerIdentityId: string;
  firstName: string;
  lastName: string;
  ageGroup?: string;
}) {
  const wellnessData = useQuery(
    api.models.playerHealthChecks.getChildWellnessForParent,
    {
      playerIdentityId: playerIdentityId as unknown as Id<"playerIdentities">,
    }
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          {firstName} {lastName}
          {ageGroup && (
            <span className="font-normal text-muted-foreground text-sm">
              ({ageGroup})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {wellnessData === undefined ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : wellnessData.accessGranted ? (
          <div className="space-y-2">
            {wellnessData.history.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                No wellness check-ins yet.
              </p>
            ) : (
              wellnessData.history.slice(0, 7).map((entry) => (
                <div
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                  key={entry.checkDate}
                >
                  <span className="text-muted-foreground text-sm">
                    {entry.checkDate}
                  </span>
                  <ScoreBadge score={entry.aggregateScore} />
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 text-sm">
                Wellness access not enabled
              </p>
              <p className="mt-1 text-amber-700 text-xs">
                Wellness access for this child has not been granted yet. Contact
                your organisation&apos;s administrator to enable it.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ParentWellnessPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = authClient.useSession();

  const { children: identityChildren, isLoading } = useGuardianChildrenInOrg(
    orgId,
    session?.user?.email
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8" />
          <div>
            <h1 className="font-bold text-2xl">Child Wellness</h1>
            <p className="mt-1 text-green-100">
              View daily wellness check-in scores for your children
            </p>
          </div>
        </div>
      </div>

      {/* Per-child wellness cards */}
      {identityChildren.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="text-gray-500">No children linked to your account</p>
            <p className="mt-2 text-gray-400 text-sm">
              Contact your organization&apos;s administrator to link your
              children&apos;s profiles
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {identityChildren.map((child) => (
            <ChildWellnessCard
              ageGroup={child.enrollment?.ageGroup}
              firstName={child.player.firstName}
              key={child.player._id}
              lastName={child.player.lastName}
              playerIdentityId={child.player._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
