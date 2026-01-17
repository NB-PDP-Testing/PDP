"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";

type PendingRequestsProps = {
  playerIdentityId: Id<"playerIdentities">;
  childName: string;
  onApprove?: (requestId: Id<"passportShareRequests">) => void;
};

export function PendingRequests({
  playerIdentityId,
  childName,
  onApprove,
}: PendingRequestsProps) {
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] =
    useState<Id<"passportShareRequests"> | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Fetch pending requests
  const requests = useQuery(
    api.models.passportSharing.getPendingRequestsForPlayer,
    {
      playerIdentityId,
    }
  );

  // Respond to access request mutation
  const respondToRequest = useMutation(
    api.models.passportSharing.respondToAccessRequest
  );

  // Only show pending requests
  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];

  const handleApprove = async (requestId: Id<"passportShareRequests">) => {
    try {
      await respondToRequest({
        requestId,
        response: "approved",
      });
      toast.success("Request approved. You can now set up sharing.");
      onApprove?.(requestId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to approve request"
      );
    }
  };

  const handleDeclineClick = (requestId: Id<"passportShareRequests">) => {
    setSelectedRequestId(requestId);
    setDeclineReason("");
    setDeclineModalOpen(true);
  };

  const handleDeclineConfirm = async () => {
    if (!selectedRequestId) {
      return;
    }

    try {
      await respondToRequest({
        requestId: selectedRequestId,
        response: "declined",
      });
      toast.success("Request declined");
      setDeclineModalOpen(false);
      setSelectedRequestId(null);
      setDeclineReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to decline request"
      );
    }
  };

  const calculateExpiresIn = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return "Expired";
    }
    if (days === 0) {
      return "Expires today";
    }
    if (days === 1) {
      return "Expires in 1 day";
    }
    return `Expires in ${days} days`;
  };

  if (!requests) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests for {childName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests for {childName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Clock className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-sm">No pending requests</p>
            <p className="text-muted-foreground text-sm">
              You'll see coach access requests here when they arrive
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests for {childName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.map((request) => {
            const expiresIn = calculateExpiresIn(request.expiresAt);
            const isExpiringSoon =
              (request.expiresAt - Date.now()) / (1000 * 60 * 60 * 24) <= 3;

            return (
              <div
                className="space-y-3 rounded-lg border border-gray-200 p-4"
                key={request.requestId}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">
                      {request.requestedByName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {request.requestingOrgName}
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 font-medium text-xs ${
                      isExpiringSoon
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {expiresIn}
                  </div>
                </div>

                {request.reason && (
                  <div className="rounded bg-gray-50 p-2">
                    <p className="font-medium text-muted-foreground text-xs">
                      Reason:
                    </p>
                    <p className="text-sm">{request.reason}</p>
                  </div>
                )}

                <div className="text-muted-foreground text-xs">
                  Requested on{" "}
                  {new Date(request.requestedAt).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleApprove(request.requestId)}
                    size="sm"
                    type="button"
                    variant="default"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleDeclineClick(request.requestId)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Decline Confirmation Dialog */}
      <Dialog onOpenChange={setDeclineModalOpen} open={declineModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Access Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this request? The coach will be
              notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="declineReason">
              Reason (optional)
            </label>
            <Textarea
              id="declineReason"
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Let the coach know why you're declining..."
              rows={3}
              value={declineReason}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setDeclineModalOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeclineConfirm}
              type="button"
              variant="destructive"
            >
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
