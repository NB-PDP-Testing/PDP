"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
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

const sensitivityBadge: Record<string, { label: string; className: string }> = {
  normal: { label: "General", className: "bg-gray-100 text-gray-700" },
  injury: { label: "Injury", className: "bg-amber-100 text-amber-800" },
  behavior: { label: "Behaviour", className: "bg-blue-100 text-blue-800" },
};

export default function PlayerFeedbackPage() {
  const { data: session } = authClient.useSession();
  const userEmail = session?.user?.email;

  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  const feedbackItems = useQuery(
    api.models.coachParentSummaries.getCoachFeedbackForPlayer,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id as Id<"playerIdentities"> }
      : "skip"
  );

  const acknowledge = useMutation(
    api.models.coachParentSummaries.acknowledgeCoachFeedbackAsPlayer
  );

  const handleAcknowledge = async (summaryId: Id<"coachParentSummaries">) => {
    try {
      await acknowledge({ summaryId });
      toast.success("Feedback acknowledged");
    } catch {
      toast.error("Failed to acknowledge feedback");
    }
  };

  if (playerIdentity === undefined || feedbackItems === undefined) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!feedbackItems || feedbackItems.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="font-bold text-2xl">Coach Feedback</h1>
          <p className="text-muted-foreground text-sm">
            Feedback and AI summaries shared by your coaches
          </p>
        </div>
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Feedback Yet</CardTitle>
            <CardDescription>
              Your coaches haven&apos;t shared any feedback with you yet.
              Feedback shared by your coach will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const unacknowledged = feedbackItems.filter((f) => !f.acknowledgedAt);
  const acknowledged = feedbackItems.filter((f) => f.acknowledgedAt);

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl">Coach Feedback</h1>
          <p className="text-muted-foreground text-sm">
            Feedback and AI summaries shared by your coaches
          </p>
        </div>
        {unacknowledged.length > 0 && (
          <Badge variant="default">{unacknowledged.length} new</Badge>
        )}
      </div>

      {/* Unacknowledged */}
      {unacknowledged.length > 0 && (
        <div className="space-y-3">
          {unacknowledged.map((item) => {
            const badge = sensitivityBadge[item.sensitivityCategory];
            return (
              <Card
                className="border-l-4 border-l-[var(--org-primary,theme(colors.blue.500))]"
                key={item._id}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">New</Badge>
                      <span
                        className={`rounded px-2 py-0.5 font-medium text-xs ${badge?.className ?? ""}`}
                      >
                        {badge?.label}
                      </span>
                      {item.coachName && (
                        <span className="text-muted-foreground text-xs">
                          From {item.coachName}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(item.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{item.publicSummaryText}</p>
                  <Button
                    onClick={() => handleAcknowledge(item._id)}
                    size="sm"
                    variant="outline"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Acknowledge
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Acknowledged */}
      {acknowledged.length > 0 && (
        <div className="space-y-3">
          {unacknowledged.length > 0 && (
            <h2 className="font-medium text-muted-foreground text-sm">
              Previously acknowledged
            </h2>
          )}
          {acknowledged.map((item) => {
            const badge = sensitivityBadge[item.sensitivityCategory];
            return (
              <Card className="opacity-80" key={item._id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 font-medium text-xs ${badge?.className ?? ""}`}
                      >
                        {badge?.label}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        Acknowledged
                      </span>
                      {item.coachName && (
                        <span className="text-muted-foreground text-xs">
                          · From {item.coachName}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(item.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {item.publicSummaryText}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
