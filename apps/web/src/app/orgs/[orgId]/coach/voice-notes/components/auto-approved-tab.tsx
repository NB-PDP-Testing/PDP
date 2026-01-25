"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle, Clock, Eye, XCircle } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type AutoApprovedTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function AutoApprovedTab({
  orgId,
  onSuccess,
  onError,
}: AutoApprovedTabProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  // Query auto-approved summaries
  const autoApprovedSummaries = useQuery(
    api.models.coachParentSummaries.getAutoApprovedSummaries,
    { organizationId: orgId }
  );

  // Revoke mutation
  const revokeSummary = useMutation(
    api.models.coachParentSummaries.revokeSummary
  );

  const handleRevoke = async (summaryId: string) => {
    setRevokingId(summaryId);
    try {
      const result = await revokeSummary({
        summaryId: summaryId as Id<"coachParentSummaries">,
        reason: "Coach override",
      });

      if (result.success) {
        onSuccess("Summary revoked successfully");
      } else {
        onError(result.error ?? "Failed to revoke summary");
      }
    } catch (error) {
      console.error("Failed to revoke summary:", error);
      onError("Failed to revoke summary. Please try again.");
    } finally {
      setRevokingId(null);
      setConfirmRevokeId(null);
    }
  };

  const getStatusBadge = (
    status: string,
    revokedAt?: number,
    viewedAt?: number
  ) => {
    if (revokedAt) {
      return (
        <Badge className="gap-1" variant="destructive">
          <XCircle className="h-3 w-3" />
          Revoked
        </Badge>
      );
    }
    if (viewedAt) {
      return (
        <Badge className="gap-1 bg-green-600" variant="default">
          <Eye className="h-3 w-3" />
          Viewed
        </Badge>
      );
    }
    if (status === "auto_approved") {
      return (
        <Badge className="gap-1" variant="secondary">
          <Clock className="h-3 w-3" />
          Pending Delivery
        </Badge>
      );
    }
    return null;
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    if (hours < 24) {
      return `${hours}h ago`;
    }
    return `${days}d ago`;
  };

  if (autoApprovedSummaries === undefined) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (autoApprovedSummaries.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <CheckCircle className="h-12 w-12 text-muted-foreground" />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>No Auto-Sent Summaries</EmptyTitle>
          <EmptyDescription>
            Summaries that are automatically approved will appear here.
            <br />
            Currently at trust level 0 or 1 - all summaries require manual
            review.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Auto-Sent Summaries (Last 7 Days)</CardTitle>
            <CardDescription>
              These summaries were automatically approved based on your trust
              level. You can revoke within 1 hour if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {autoApprovedSummaries.map((summary) => (
                <Card className="border" key={summary._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {summary.playerName}
                          </h4>
                          {getStatusBadge(
                            summary.status,
                            summary.revokedAt,
                            summary.viewedAt
                          )}
                        </div>

                        <p className="line-clamp-2 text-muted-foreground text-sm">
                          {summary.summaryContent}
                        </p>

                        <div className="flex items-center gap-4 text-muted-foreground text-xs">
                          <span>
                            Confidence:{" "}
                            {Math.round(summary.confidenceScore * 100)}%
                          </span>
                          {summary.approvedAt && (
                            <span>
                              Sent: {formatRelativeTime(summary.approvedAt)}
                            </span>
                          )}
                          {summary.autoApprovalDecision && (
                            <span
                              className="text-xs"
                              title={summary.autoApprovalDecision.reason}
                            >
                              {summary.autoApprovalDecision.tier === "auto_send"
                                ? "Auto-sent"
                                : summary.autoApprovalDecision.tier}
                            </span>
                          )}
                        </div>
                      </div>

                      {summary.isRevocable && (
                        <Button
                          disabled={revokingId === summary._id}
                          onClick={() => setConfirmRevokeId(summary._id)}
                          size="sm"
                          variant="outline"
                        >
                          {revokingId === summary._id ? (
                            <>
                              <Clock className="mr-2 h-4 w-4 animate-spin" />
                              Revoking...
                            </>
                          ) : (
                            <>
                              <AlertCircle className="mr-2 h-4 w-4" />
                              Revoke
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setConfirmRevokeId(null)}
        open={confirmRevokeId !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Auto-Approved Summary?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent the summary from being delivered to the parent.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRevokeId && handleRevoke(confirmRevokeId)}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
