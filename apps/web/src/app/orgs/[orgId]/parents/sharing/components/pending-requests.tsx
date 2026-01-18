"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  User,
  XCircle,
} from "lucide-react";
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

/**
 * Format sport code to human-readable name
 * Handles both lowercase and uppercase sport codes
 */
function formatSportName(sportCode: string | undefined): string {
  if (!sportCode) {
    return "";
  }

  // Convert to lowercase for lookup
  const normalizedCode = sportCode.toLowerCase();

  const sportNames: Record<string, string> = {
    gaa_gaelic_football: "GAA Gaelic Football",
    gaa_hurling: "GAA Hurling",
    gaa_football: "GAA Gaelic Football",
    gaelic_football: "GAA Gaelic Football",
    hurling: "GAA Hurling",
    soccer: "Soccer",
    football: "Soccer",
    rugby: "Rugby",
    rugby_union: "Rugby Union",
    rugby_league: "Rugby League",
    basketball: "Basketball",
    hockey: "Hockey",
    field_hockey: "Field Hockey",
    ice_hockey: "Ice Hockey",
    tennis: "Tennis",
    cricket: "Cricket",
    athletics: "Athletics",
    track_and_field: "Athletics",
  };

  // Return formatted name or capitalize the raw code
  return (
    sportNames[normalizedCode] ||
    sportCode
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

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
            // Use backend-calculated isExpiringSoon flag
            const isExpiringSoon = request.isExpiringSoon;
            const sportName = formatSportName(request.requestingOrgSport);

            return (
              <div
                className="space-y-4 rounded-lg border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm transition-shadow hover:shadow-md"
                key={request.requestId}
              >
                {/* Header: Organization & Expiry Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Organization Logo */}
                    {request.requestingOrgLogo ? (
                      <img
                        alt={`${request.requestingOrgName} logo`}
                        className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
                        src={request.requestingOrgLogo}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-blue-100">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                    )}

                    {/* Organization Info */}
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">
                        {request.requestingOrgName}
                      </p>
                      {sportName && (
                        <p className="text-muted-foreground text-xs">
                          {sportName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expiry Badge */}
                  <div
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-xs ${
                      isExpiringSoon
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isExpiringSoon ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    {expiresIn}
                  </div>
                </div>

                {/* Coach Information */}
                <div className="space-y-2 rounded-lg bg-blue-50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      {request.requestedByName}
                    </span>
                    <span className="rounded bg-blue-200 px-2 py-0.5 font-medium text-blue-700 text-xs">
                      {request.requestedByRole}
                    </span>
                  </div>
                  {request.requestedByEmail && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{request.requestedByEmail}</span>
                    </div>
                  )}
                </div>

                {/* Request Reason */}
                {request.reason && (
                  <div className="space-y-1.5 rounded-lg border border-gray-200 bg-white p-3">
                    <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                      Reason for Request
                    </p>
                    <p className="text-gray-900 text-sm leading-relaxed">
                      {request.reason}
                    </p>
                  </div>
                )}

                {/* Request Date */}
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Requested on{" "}
                    {new Date(request.requestedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleApprove(request.requestId)}
                    size="sm"
                    type="button"
                    variant="default"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve & Enable Sharing
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
