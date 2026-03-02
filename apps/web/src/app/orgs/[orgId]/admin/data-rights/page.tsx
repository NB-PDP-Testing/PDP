"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { DATA_CATEGORY_CONFIG } from "@pdp/backend/convex/lib/erasureCategoryMap";
import { useAction, useMutation, useQuery } from "convex/react";
import { AlertTriangle, Clock, Loader2, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

// ============================================================
// TYPES
// ============================================================

type ErasureRequest = {
  _id: Id<"erasureRequests">;
  _creationTime: number;
  playerId: Id<"orgPlayerEnrollments">;
  playerIdentityId: Id<"playerIdentities">;
  organizationId: string;
  requestedByUserId: string;
  submittedAt: number;
  deadline: number;
  status: "pending" | "in_review" | "completed" | "rejected";
  playerGrounds?: string;
  categoryDecisions?: Array<{
    category: string;
    decision: "approved" | "rejected";
    grounds?: string;
    erasedAt?: number;
  }>;
  adminUserId?: string;
  processedAt?: number;
  adminResponseNote?: string;
};

type CategoryDecisionDraft = {
  category: string;
  decision: "approved" | "rejected";
  grounds: string;
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDaysRemaining(deadline: number) {
  return Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline: number }) {
  const days = getDaysRemaining(deadline);
  if (days < 0) {
    return (
      <span className="font-medium text-red-700 text-xs">
        OVERDUE ({Math.abs(days)}d)
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="font-medium text-red-600 text-xs">
        {formatDate(deadline)} ({days}d)
      </span>
    );
  }
  if (days <= 14) {
    return (
      <span className="font-medium text-amber-600 text-xs">
        {formatDate(deadline)} ({days}d)
      </span>
    );
  }
  return (
    <span className="text-green-700 text-xs">
      {formatDate(deadline)} ({days}d)
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Pending
      </Badge>
    );
  }
  if (status === "in_review") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        In Review
      </Badge>
    );
  }
  if (status === "completed") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Completed
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Rejected
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

// ============================================================
// PLAYER NAME LOOKUP (single — used in ReviewDialog only)
// ============================================================

function usePlayerName(playerIdentityId: Id<"playerIdentities">) {
  const identity = useQuery(api.models.playerIdentities.getPlayerById, {
    playerIdentityId,
  });
  if (!identity) {
    return "Loading...";
  }
  return `${identity.firstName} ${identity.lastName}`;
}

/**
 * Build a name map from a batch query result.
 * Returns Record<id, "First Last"> for use in request row lists.
 */
function buildPlayerNameMap(
  batch:
    | Array<{
        _id: Id<"playerIdentities">;
        firstName: string;
        lastName: string;
      }>
    | undefined
): Record<string, string> {
  if (!batch) {
    return {};
  }
  const map: Record<string, string> = {};
  for (const p of batch) {
    map[p._id] = `${p.firstName} ${p.lastName}`;
  }
  return map;
}

// ============================================================
// REVIEW DIALOG
// ============================================================

const CATEGORIES = Object.entries(DATA_CATEGORY_CONFIG).map(
  ([key, config]) => ({ key, config })
);

function ReviewDialog({
  request,
  orgId,
  onClose,
}: {
  request: ErasureRequest;
  orgId: string;
  onClose: () => void;
}) {
  const { data: session } = authClient.useSession();
  const updateStatus = useMutation(
    api.models.erasureRequests.updateErasureRequestStatus
  );
  const executeErasure = useAction(
    api.actions.retentionEnforcement.executeApprovedErasureCategories
  );

  const playerName = usePlayerName(request.playerIdentityId);

  const [decisions, setDecisions] = useState<
    Record<string, CategoryDecisionDraft>
  >(() => {
    const initial: Record<string, CategoryDecisionDraft> = {};
    for (const { key, config } of CATEGORIES) {
      initial[key] = {
        category: key,
        decision: config.canErase ? "approved" : "rejected",
        grounds: config.canErase ? "" : (config.retentionGrounds ?? ""),
      };
    }
    return initial;
  });
  const [adminNote, setAdminNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);

  const allDecisionsMade = CATEGORIES.every(({ key, config }) => {
    const d = decisions[key];
    if (!d) {
      return false;
    }
    if (!config.canErase) {
      return true; // locked categories are always decided
    }
    if (d.decision === "rejected" && !d.grounds.trim()) {
      return false; // must provide grounds for retaining erasable data
    }
    return true;
  });

  const canProcess = allDecisionsMade && adminNote.trim().length > 0;

  const handleProcess = async () => {
    if (!session?.user?.id) {
      toast.error("Not authenticated");
      return;
    }
    setIsProcessing(true);
    try {
      const categoryDecisions = CATEGORIES.map(({ key }) => ({
        category: key,
        decision: decisions[key]?.decision ?? "rejected",
        grounds: decisions[key]?.grounds ?? "",
      }));

      await updateStatus({
        requestId: request._id,
        organizationId: orgId,
        status: "in_review",
        adminUserId: session.user.id,
        categoryDecisions,
        adminResponseNote: adminNote,
      });

      const approvedCategories = categoryDecisions
        .filter((d) => d.decision === "approved")
        .map((d) => d.category);

      if (approvedCategories.length > 0) {
        await executeErasure({
          requestId: request._id,
          approvedCategories,
          organizationId: orgId,
          playerIdentityId: request.playerIdentityId,
          playerId: request.playerId,
        });
      } else {
        // No categories to erase — mark completed directly
        await updateStatus({
          requestId: request._id,
          organizationId: orgId,
          status: "completed",
          adminUserId: session.user.id,
          categoryDecisions,
          adminResponseNote: adminNote,
        });
      }

      toast.success("Erasure request processed successfully.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process");
    } finally {
      setIsProcessing(false);
      setShowConfirm(false);
    }
  };

  const handleReject = async () => {
    if (!(session?.user?.id && adminNote.trim())) {
      return;
    }
    setIsProcessing(true);
    try {
      await updateStatus({
        requestId: request._id,
        organizationId: orgId,
        status: "rejected",
        adminUserId: session.user.id,
        adminResponseNote: adminNote,
      });
      toast.success("Request rejected.");
      onClose();
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <AlertDialog onOpenChange={setShowConfirm} open={showConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Erasure Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will execute the approved erasures for {playerName}. This
              cannot be undone. Proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction disabled={isProcessing} onClick={handleProcess}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm & Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog onOpenChange={() => onClose()} open>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Erasure Request — {playerName}</DialogTitle>
            <DialogDescription>
              Submitted {formatDate(request.submittedAt)} · Response due{" "}
              {formatDate(request.deadline)}
            </DialogDescription>
          </DialogHeader>

          {request.playerGrounds && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="mb-1 font-medium text-muted-foreground text-xs">
                Player&apos;s reason
              </p>
              <p>{request.playerGrounds}</p>
            </div>
          )}

          {/* Per-category decision table */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Per-category decisions</h3>
            <div className="space-y-2">
              {CATEGORIES.map(({ key, config }) => {
                const d = decisions[key];
                if (!d) {
                  return null;
                }
                const isLocked = !config.canErase;
                return (
                  <div className="space-y-2 rounded-lg border p-3" key={key}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{config.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {config.description}
                        </p>
                      </div>
                      <Select
                        disabled={isLocked}
                        onValueChange={(val) => {
                          setDecisions((prev) => ({
                            ...prev,
                            [key]: {
                              category: key,
                              decision: val as "approved" | "rejected",
                              grounds: isLocked
                                ? (config.retentionGrounds ?? "")
                                : (prev[key]?.grounds ?? ""),
                            },
                          }));
                        }}
                        value={d.decision}
                      >
                        <SelectTrigger className="w-44 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {config.canErase && (
                            <SelectItem value="approved">
                              Approve erasure
                            </SelectItem>
                          )}
                          <SelectItem value="rejected">
                            Retain with grounds
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(d.decision === "rejected" || isLocked) && (
                      <div className="space-y-1">
                        <Label className="text-xs" htmlFor={`grounds-${key}`}>
                          Grounds for retention{" "}
                          {!isLocked && <span className="text-red-500">*</span>}
                        </Label>
                        <Textarea
                          disabled={isLocked}
                          id={`grounds-${key}`}
                          onChange={(e) => {
                            setDecisions((prev) => ({
                              ...prev,
                              [key]: {
                                category: key,
                                decision: prev[key]?.decision ?? "rejected",
                                grounds: e.target.value,
                              },
                            }));
                          }}
                          placeholder={
                            isLocked
                              ? config.retentionGrounds
                              : "Explain why data is being retained..."
                          }
                          rows={2}
                          value={d.grounds}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin response note */}
          <div className="space-y-2">
            <Label htmlFor="admin-note">
              Message to player <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="admin-note"
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Explain the outcome to the player. This will be shown to them in their settings."
              rows={3}
              value={adminNote}
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              disabled={isProcessing || !adminNote.trim()}
              onClick={() => {
                setRejectMode(true);
                handleReject();
              }}
              type="button"
              variant="outline"
            >
              {isProcessing && rejectMode ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject entire request
            </Button>
            <Button
              disabled={!canProcess || isProcessing}
              onClick={() => setShowConfirm(true)}
              type="button"
            >
              {isProcessing && !rejectMode ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Process request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function DataRightsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const requests = useQuery(
    api.models.erasureRequests.listErasureRequestsForOrg,
    {
      organizationId: orgId,
    }
  );

  // Batch-fetch all player names at once to avoid N+1 subscriptions per row
  const allPlayerIds = requests
    ? [...new Set(requests.map((r) => r.playerIdentityId))]
    : [];
  const playerNamesBatch = useQuery(
    api.models.playerIdentities.getPlayerNamesByIds,
    allPlayerIds.length > 0 ? { ids: allPlayerIds } : "skip"
  );
  const playerNames = buildPlayerNameMap(playerNamesBatch ?? undefined);

  const [reviewRequest, setReviewRequest] = useState<ErasureRequest | null>(
    null
  );

  if (requests === undefined) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const overdueCount = requests.filter(
    (r) =>
      getDaysRemaining(r.deadline) < 0 &&
      (r.status === "pending" || r.status === "in_review")
  ).length;

  const activeRequests = requests.filter(
    (r) => r.status === "pending" || r.status === "in_review"
  );
  const completedRequests = requests.filter(
    (r) => r.status === "completed" || r.status === "rejected"
  );

  return (
    <div className="space-y-6">
      {reviewRequest && (
        <ReviewDialog
          onClose={() => setReviewRequest(null)}
          orgId={orgId}
          request={reviewRequest}
        />
      )}

      <div>
        <h1 className="font-bold text-2xl">Data Rights Requests</h1>
        <p className="text-muted-foreground text-sm">
          GDPR Article 17 — Right to erasure requests from adult players.
        </p>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="font-medium text-red-800 text-sm">
            {overdueCount} request{overdueCount === 1 ? "" : "s"}{" "}
            {overdueCount === 1 ? "is" : "are"} overdue — GDPR Article 12(3)
            requires response within 30 days. Overdue responses are a regulatory
            violation.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Requests
          </CardTitle>
          <CardDescription>
            Ordered by deadline — most urgent first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                No active data rights requests.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {activeRequests
                .sort((a, b) => a.deadline - b.deadline)
                .map((req) => (
                  <RequestRow
                    key={req._id}
                    onReview={() => setReviewRequest(req as ErasureRequest)}
                    playerName={
                      playerNames[req.playerIdentityId] ?? "Loading..."
                    }
                    request={req as ErasureRequest}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {completedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {completedRequests
                .sort((a, b) => b.submittedAt - a.submittedAt)
                .map((req) => (
                  <RequestRow
                    key={req._id}
                    onReview={() => setReviewRequest(req as ErasureRequest)}
                    playerName={
                      playerNames[req.playerIdentityId] ?? "Loading..."
                    }
                    request={req as ErasureRequest}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RequestRow({
  request,
  onReview,
  playerName,
}: {
  request: ErasureRequest;
  onReview: () => void;
  playerName: string;
}) {
  const canReview =
    request.status === "pending" || request.status === "in_review";

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium text-sm">{playerName}</p>
        <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
          <span>Submitted {formatDate(request.submittedAt)}</span>
          <span>·</span>
          <span>
            Due: <DeadlineBadge deadline={request.deadline} />
          </span>
        </div>
      </div>
      <StatusBadge status={request.status} />
      <Button
        onClick={onReview}
        size="sm"
        variant={canReview ? "default" : "outline"}
      >
        {canReview ? "Review" : "View"}
      </Button>
    </div>
  );
}
