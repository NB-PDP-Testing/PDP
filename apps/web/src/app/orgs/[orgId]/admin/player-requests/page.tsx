"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Trash2,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDOB(dob: string | undefined): string {
  if (!dob) {
    return "—";
  }
  return new Date(dob).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PlayerRequestsPage() {
  const params = useParams();
  const organizationId = params.orgId as string;

  const requests = useQuery(
    api.models.childDataErasureRequests.getErasureRequestsForOrg,
    { organizationId }
  );

  const processErasure = useMutation(
    api.models.childDataErasureRequests.processErasureRequest
  );
  const declineErasure = useMutation(
    api.models.childDataErasureRequests.declineErasureRequest
  );

  const [processDialogId, setProcessDialogId] =
    useState<Id<"childDataErasureRequests"> | null>(null);
  const [declineDialogId, setDeclineDialogId] =
    useState<Id<"childDataErasureRequests"> | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingRequests = requests?.filter((r) => r.status === "pending") ?? [];
  const historicalRequests =
    requests?.filter((r) => r.status !== "pending") ?? [];

  const handleProcess = async () => {
    if (!processDialogId) {
      return;
    }
    setIsProcessing(true);
    try {
      await processErasure({ requestId: processDialogId });
      toast.success("Player data has been permanently erased.");
      setProcessDialogId(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to process erasure request."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!(declineDialogId && declineReason.trim())) {
      return;
    }
    setIsProcessing(true);
    try {
      await declineErasure({
        requestId: declineDialogId,
        reason: declineReason.trim(),
      });
      toast.success("Erasure request declined. The player has been notified.");
      setDeclineDialogId(null);
      setDeclineReason("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to decline erasure request."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (requests === undefined) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl">Player Requests</h1>
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-bold text-3xl">Player Requests</h1>
        <p className="text-muted-foreground">
          Review and action data erasure requests submitted by child players
          (GDPR Recital 65).
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{pendingRequests.length}</div>
            <p className="text-muted-foreground text-xs">
              Awaiting admin action
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {requests.filter((r) => r.status === "completed").length}
            </div>
            <p className="text-muted-foreground text-xs">
              Data permanently erased
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Declined</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {requests.filter((r) => r.status === "declined").length}
            </div>
            <p className="text-muted-foreground text-xs">
              Declined with reason
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Pending Erasure Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">
                No Pending Requests
              </h3>
              <p className="text-muted-foreground text-sm">
                All data erasure requests have been actioned.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
                  key={req._id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {req.playerFirstName ?? "Unknown"}{" "}
                          {req.playerLastName ?? "Player"}
                        </span>
                        <Badge variant="destructive">Pending</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          DOB: {formatDOB(req.playerDateOfBirth)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Requested: {formatDate(req.requestedAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        This request will permanently delete all sports data for
                        this player, including health checks, assessments,
                        goals, and their player profile. This action cannot be
                        undone.
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        onClick={() => setDeclineDialogId(req._id)}
                        size="sm"
                        variant="outline"
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Decline
                      </Button>
                      <Button
                        onClick={() => setProcessDialogId(req._id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Process Erasure
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Requests */}
      {historicalRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historicalRequests.map((req) => (
                <div
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  key={req._id}
                >
                  <div className="space-y-0.5">
                    <span className="font-medium text-sm">
                      {req.playerFirstName ?? "Unknown"}{" "}
                      {req.playerLastName ?? "Player"}
                    </span>
                    <div className="text-muted-foreground text-xs">
                      Requested {formatDate(req.requestedAt)}
                      {req.status === "declined" && req.declinedReason && (
                        <span> · Reason: {req.declinedReason}</span>
                      )}
                      {req.status === "completed" && req.processedAt && (
                        <span> · Processed {formatDate(req.processedAt)}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      req.status === "completed" ? "secondary" : "outline"
                    }
                  >
                    {req.status === "completed" ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" /> Completed
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" /> Declined
                      </>
                    )}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GDPR Info Card */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">
                GDPR Recital 65 — Right to Erasure
              </h4>
              <p className="text-muted-foreground text-sm">
                Under GDPR Recital 65, child players have an independent right
                to request deletion of their personal data without requiring
                parental approval. Once processed, all sports data (health
                checks, skill assessments, passport goals, coach notes, and the
                player profile) will be permanently deleted. A minimal
                enrollment stub is retained for team roster continuity but
                contains no personal data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Process Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setProcessDialogId(null)}
        open={processDialogId !== null}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirm Data Erasure
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all personal and sports data for this
              player. This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">
              Data that will be permanently deleted:
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
              <li>Daily health checks</li>
              <li>Wellness settings</li>
              <li>Skill assessments</li>
              <li>Passport goals</li>
              <li>Coach &amp; parent summaries</li>
              <li>Parent authorizations</li>
              <li>Player profile</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              disabled={isProcessing}
              onClick={() => setProcessDialogId(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isProcessing}
              onClick={handleProcess}
              variant="destructive"
            >
              {isProcessing ? "Processing..." : "Permanently Delete All Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDeclineDialogId(null);
            setDeclineReason("");
          }
        }}
        open={declineDialogId !== null}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Erasure Request</DialogTitle>
            <DialogDescription>
              Provide a reason for declining this request. The player will be
              notified via in-app notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decline-reason">Reason for declining</Label>
            <Textarea
              id="decline-reason"
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Data is required to fulfill contractual obligations under the club membership agreement..."
              rows={4}
              value={declineReason}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={isProcessing}
              onClick={() => {
                setDeclineDialogId(null);
                setDeclineReason("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isProcessing || !declineReason.trim()}
              onClick={handleDecline}
            >
              {isProcessing ? "Declining..." : "Decline Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
