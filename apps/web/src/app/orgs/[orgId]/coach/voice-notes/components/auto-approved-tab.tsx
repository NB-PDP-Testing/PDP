"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<
    "all" | "auto" | "manual"
  >("all");
  const [acknowledgmentFilter, setAcknowledgmentFilter] = useState<
    "all" | "acknowledged" | "not_acknowledged"
  >("all");

  // Query auto-approved summaries
  const autoApprovedSummaries = useQuery(
    api.models.coachParentSummaries.getAutoApprovedSummaries,
    { organizationId: orgId }
  );

  // Apply search and filters
  const filteredSummaries = useMemo(() => {
    if (!autoApprovedSummaries) {
      return [];
    }

    return autoApprovedSummaries.filter((summary) => {
      // Search filter (player name, summary content, or insight details)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          summary.playerName.toLowerCase().includes(query) ||
          summary.summaryContent.toLowerCase().includes(query) ||
          summary.privateInsight.title.toLowerCase().includes(query) ||
          summary.privateInsight.description.toLowerCase().includes(query) ||
          summary.privateInsight.category.toLowerCase().includes(query);
        if (!matchesSearch) {
          return false;
        }
      }

      // Approval method filter
      if (
        approvalFilter !== "all" &&
        summary.approvalMethod !== approvalFilter
      ) {
        return false;
      }

      // Acknowledgment filter
      if (acknowledgmentFilter !== "all") {
        const isAcknowledged = summary.acknowledgedAt !== undefined;
        if (acknowledgmentFilter === "acknowledged" && !isAcknowledged) {
          return false;
        }
        if (acknowledgmentFilter === "not_acknowledged" && isAcknowledged) {
          return false;
        }
      }

      return true;
    });
  }, [
    autoApprovedSummaries,
    searchQuery,
    approvalFilter,
    acknowledgmentFilter,
  ]);

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
    if (status === "delivered") {
      return (
        <Badge className="gap-1 bg-blue-600" variant="default">
          <Check className="h-3 w-3" />
          Delivered
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

  // Show empty state if no summaries exist at all
  if (autoApprovedSummaries.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <CheckCircle className="h-12 w-12 text-muted-foreground" />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>No Sent Summaries</EmptyTitle>
          <EmptyDescription>
            Summaries sent to parents (auto-approved and manually approved) will
            appear here.
            <br />
            Once you approve insights for parents, they will be listed here.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  // Check if filters produced no results
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    approvalFilter !== "all" ||
    acknowledgmentFilter !== "all";
  const showNoResults = filteredSummaries.length === 0 && hasActiveFilters;

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Sent to Parents (Last 30 Days)</CardTitle>
            <CardDescription>
              All summaries sent to parents (auto-approved and manually
              approved). Auto-approved summaries can be revoked within 1 hour if
              needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by player, insight, or content..."
                  type="search"
                  value={searchQuery}
                />
                {searchQuery && (
                  <Button
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setSearchQuery("")}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">
                    Filters:
                  </span>
                </div>

                <Select
                  onValueChange={(value) =>
                    setApprovalFilter(value as "all" | "auto" | "manual")
                  }
                  value={approvalFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Approval method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="auto">Auto-Approved</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  onValueChange={(value) =>
                    setAcknowledgmentFilter(
                      value as "all" | "acknowledged" | "not_acknowledged"
                    )
                  }
                  value={acknowledgmentFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Acknowledgment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Summaries</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="not_acknowledged">
                      Not Acknowledged
                    </SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setApprovalFilter("all");
                      setAcknowledgmentFilter("all");
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear Filters
                  </Button>
                )}

                <span className="ml-auto text-muted-foreground text-sm">
                  Showing {filteredSummaries.length} of{" "}
                  {autoApprovedSummaries.length} summaries
                </span>
              </div>
            </div>

            {/* No results message */}
            {showNoResults && (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No summaries match your search and filters.
                </p>
                <Button
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery("");
                    setApprovalFilter("all");
                    setAcknowledgmentFilter("all");
                  }}
                  size="sm"
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Summary cards */}
            <div className="space-y-4">
              {filteredSummaries.map((summary) => (
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

                        {/* Private Insight (coach-only) */}
                        <div className="space-y-1 rounded-md bg-muted/50 p-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              className="text-xs"
                              variant={
                                summary.privateInsight.sentiment === "positive"
                                  ? "default"
                                  : summary.privateInsight.sentiment ===
                                      "concern"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {summary.privateInsight.category}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {summary.privateInsight.sentiment === "positive"
                                ? "Positive"
                                : summary.privateInsight.sentiment === "concern"
                                  ? "Needs Attention"
                                  : "Neutral"}
                            </span>
                          </div>
                          <p className="font-medium text-sm">
                            {summary.privateInsight.title}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {summary.privateInsight.description}
                          </p>
                        </div>

                        {/* Public summary (what parents see) */}
                        <div className="pt-1">
                          <p className="text-muted-foreground text-xs italic">
                            Sent to parents:
                          </p>
                          <p className="line-clamp-2 text-sm">
                            {summary.summaryContent}
                          </p>
                        </div>

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
                          <Badge
                            className="text-xs"
                            variant={
                              summary.approvalMethod === "auto"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {summary.approvalMethod === "auto"
                              ? "Auto-Approved"
                              : "Manual"}
                          </Badge>
                        </div>

                        {/* Viewed indicator */}
                        {summary.viewedAt && summary.viewedByName && (
                          <div className="flex items-center gap-2 text-blue-700 text-xs">
                            <Eye className="h-3 w-3" />
                            <span>
                              Viewed by {summary.viewedByName}{" "}
                              {formatRelativeTime(summary.viewedAt)}
                            </span>
                          </div>
                        )}

                        {/* Acknowledgment indicator */}
                        {summary.acknowledgedAt &&
                          summary.acknowledgedByName && (
                            <div className="flex items-center gap-2 text-green-700 text-xs">
                              <Check className="h-3 w-3" />
                              <span>
                                Acknowledged by {summary.acknowledgedByName}{" "}
                                {formatRelativeTime(summary.acknowledgedAt)}
                              </span>
                            </div>
                          )}
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
