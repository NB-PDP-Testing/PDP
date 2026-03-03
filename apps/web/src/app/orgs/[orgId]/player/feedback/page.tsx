"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Lock, MessageSquare, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useChildAccess } from "@/hooks/use-child-access";
import { authClient } from "@/lib/auth-client";

const sensitivityBadge: Record<string, { label: string; className: string }> = {
  normal: { label: "General", className: "bg-gray-100 text-gray-700" },
  injury: { label: "Injury", className: "bg-amber-100 text-amber-800" },
  behavior: { label: "Behaviour", className: "bg-blue-100 text-blue-800" },
};

type FeedbackItem = {
  _id: Id<"coachParentSummaries">;
  coachId: string;
  coachName?: string;
  sensitivityCategory: "normal" | "injury" | "behavior";
  status: "approved" | "auto_approved" | "delivered" | "viewed";
  publicSummaryText: string;
  createdAt: number;
  approvedAt?: number;
  acknowledgedAt?: number;
  childResponse?: string;
  childResponseAt?: number;
};

export default function PlayerFeedbackPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = authClient.useSession();
  const userEmail = session?.user?.email;

  const { isChildAccount, accessLevel, toggles } = useChildAccess(orgId);

  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  // Adult player feedback query (no restrictChildView filtering)
  const adultFeedbackItems = useQuery(
    api.models.coachParentSummaries.getCoachFeedbackForPlayer,
    !isChildAccount && playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id as Id<"playerIdentities"> }
      : "skip"
  );

  // Child player feedback query (filters restrictChildView: true)
  const childFeedbackItems = useQuery(
    api.models.coachParentSummaries.getCoachFeedbackForChildPlayer,
    isChildAccount && playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id as Id<"playerIdentities"> }
      : "skip"
  );

  const feedbackItems = isChildAccount
    ? childFeedbackItems
    : adultFeedbackItems;

  const acknowledge = useMutation(
    api.models.coachParentSummaries.acknowledgeCoachFeedbackAsPlayer
  );
  const setChildResponse = useMutation(
    api.models.coachParentSummaries.setChildFeedbackResponse
  );

  const handleAcknowledge = async (summaryId: Id<"coachParentSummaries">) => {
    try {
      await acknowledge({ summaryId });
      toast.success("Feedback acknowledged");
    } catch {
      toast.error("Failed to acknowledge feedback");
    }
  };

  const handleSubmitResponse = async (
    summaryId: Id<"coachParentSummaries">
  ) => {
    const text = responseText[summaryId]?.trim();
    if (!text) {
      toast.error("Please enter a response");
      return;
    }
    try {
      await setChildResponse({ summaryId, response: text });
      setResponseText((prev) => ({ ...prev, [summaryId]: "" }));
      toast.success("Response saved");
    } catch {
      toast.error("Failed to save response");
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

  // Child account: feedback access disabled by parent
  if (isChildAccount && !toggles?.includeCoachFeedback) {
    return (
      <div className="container mx-auto max-w-3xl p-4 md:p-6">
        <Card className="border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Coach Feedback Not Available</CardTitle>
            <CardDescription>
              Your parent hasn&apos;t enabled coach feedback for your account.
              Ask them to update your access settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const feedbackArray = feedbackItems as FeedbackItem[] | null | undefined;

  if (!feedbackArray || feedbackArray.length === 0) {
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

  const unacknowledged = feedbackArray.filter((f) => !f.acknowledgedAt);
  const acknowledged = feedbackArray.filter((f) => f.acknowledgedAt);

  // Whether this child can add responses (View+Interact only)
  const canRespond = isChildAccount && accessLevel === "view_interact";

  const renderFeedbackCard = (item: FeedbackItem, isNew: boolean) => {
    const badge = sensitivityBadge[item.sensitivityCategory];
    const currentResponse = responseText[item._id] ?? "";
    const existingResponse = item.childResponse;
    const existingResponseAt = item.childResponseAt;

    return (
      <Card
        className={
          isNew
            ? "border-l-4 border-l-[var(--org-primary,theme(colors.blue.500))]"
            : "opacity-80"
        }
        key={item._id}
      >
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {isNew && <Badge variant="secondary">New</Badge>}
              <span
                className={`rounded px-2 py-0.5 font-medium text-xs ${badge?.className ?? ""}`}
              >
                {badge?.label}
              </span>
              {!isNew && (
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Acknowledged
                </span>
              )}
              {item.coachName && (
                <span className="text-muted-foreground text-xs">
                  {isNew ? "From" : "·"} {item.coachName}
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
          <p className={isNew ? "text-sm" : "text-muted-foreground text-sm"}>
            {item.publicSummaryText}
          </p>

          {/* Existing child response */}
          {existingResponse && (
            <div className="rounded-md border border-teal-200 bg-teal-50 p-3">
              <p className="mb-1 font-medium text-teal-800 text-xs">
                Your response
              </p>
              <p className="text-sm">{existingResponse}</p>
              {existingResponseAt && (
                <p className="mt-1 text-muted-foreground text-xs">
                  {new Date(existingResponseAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          {/* Child response input (View+Interact only) */}
          {canRespond && !existingResponse && (
            <div className="space-y-2 border-t pt-3">
              <p className="font-medium text-xs">Add your response</p>
              <Textarea
                className="min-h-[80px] text-sm"
                onChange={(e) =>
                  setResponseText((prev) => ({
                    ...prev,
                    [item._id]: e.target.value,
                  }))
                }
                placeholder="Write a note back to your coach..."
                value={currentResponse}
              />
              <Button
                disabled={!currentResponse.trim()}
                onClick={() => handleSubmitResponse(item._id)}
                size="sm"
              >
                <Send className="mr-1 h-3 w-3" />
                Send Response
              </Button>
            </div>
          )}

          {isNew && (
            <Button
              onClick={() => handleAcknowledge(item._id)}
              size="sm"
              variant="outline"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Acknowledge
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

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
          {unacknowledged.map((item) => renderFeedbackCard(item, true))}
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
          {acknowledged.map((item) => renderFeedbackCard(item, false))}
        </div>
      )}
    </div>
  );
}
