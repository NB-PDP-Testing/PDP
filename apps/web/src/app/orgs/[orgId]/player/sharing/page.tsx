"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle, Clock, Shield, XCircle } from "lucide-react";
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

export default function PlayerSharingPage() {
  const sharingData = useQuery(
    api.models.passportSharing.getMyPassportSharingData
  );

  const revokeConsent = useMutation(
    api.models.passportSharing.revokeMyPassportSharing
  );
  const respondToRequest = useMutation(
    api.models.passportSharing.respondToAccessRequestAsPlayer
  );

  if (sharingData === undefined) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activeConsents =
    sharingData.consents.filter(
      (c) => c.status === "active" && c.coachAcceptanceStatus === "accepted"
    ) ?? [];

  const pendingConsents =
    sharingData.consents.filter(
      (c) => c.status === "active" && c.coachAcceptanceStatus === "pending"
    ) ?? [];

  const handleRevoke = async (consentId: Id<"passportShareConsents">) => {
    try {
      await revokeConsent({ consentId });
      toast.success("Sharing revoked");
    } catch {
      toast.error("Failed to revoke sharing");
    }
  };

  const handleRespond = async (
    requestId: Id<"passportShareRequests">,
    response: "approved" | "declined"
  ) => {
    try {
      await respondToRequest({ requestId, response });
      toast.success(
        response === "approved" ? "Request approved" : "Request declined"
      );
    } catch {
      toast.error("Failed to respond to request");
    }
  };

  const hasAnything =
    activeConsents.length > 0 ||
    pendingConsents.length > 0 ||
    sharingData.pendingRequests.length > 0;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-bold text-2xl">Passport Sharing</h1>
        <p className="text-muted-foreground text-sm">
          Control who can view your sports passport data
        </p>
      </div>

      {/* Info card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="space-y-1">
            <p className="font-medium text-blue-900 text-sm">
              What is passport sharing?
            </p>
            <p className="text-blue-700 text-sm">
              Enable sharing to allow coaches from other clubs to view your
              development passport. You control access and can revoke it
              anytime.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending requests */}
      {sharingData.pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Requests
              <Badge className="ml-1" variant="secondary">
                {sharingData.pendingRequests.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Coaches requesting access to your passport
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sharingData.pendingRequests.map((req) => (
              <div
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={req.requestId}
              >
                <div>
                  <p className="font-medium text-sm">{req.requestingOrgName}</p>
                  <p className="text-muted-foreground text-xs">
                    Requested by {req.requestedByName}
                    {req.reason ? ` · ${req.reason}` : ""}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Expires{" "}
                    {new Date(req.expiresAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRespond(req.requestId, "approved")}
                    size="sm"
                    variant="default"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleRespond(req.requestId, "declined")}
                    size="sm"
                    variant="outline"
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active shares */}
      {activeConsents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Active Shares
            </CardTitle>
            <CardDescription>
              Organizations currently with access to your passport
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeConsents.map((consent) => (
              <div
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={consent.consentId}
              >
                <div>
                  <p className="font-medium text-sm">
                    {consent.receivingOrgName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Shared since{" "}
                    {new Date(consent.consentedAt).toLocaleDateString("en-GB")}
                    {" · "}
                    Expires{" "}
                    {new Date(consent.expiresAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <Button
                  onClick={() => handleRevoke(consent.consentId)}
                  size="sm"
                  variant="outline"
                >
                  Revoke Access
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending acceptance */}
      {pendingConsents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Awaiting Coach Acceptance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingConsents.map((consent) => (
              <div
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={consent.consentId}
              >
                <div>
                  <p className="font-medium text-sm">
                    {consent.receivingOrgName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Waiting for coach to accept
                  </p>
                </div>
                <Button
                  onClick={() => handleRevoke(consent.consentId)}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasAnything && (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No Sharing Requests Yet</CardTitle>
            <CardDescription>
              No sharing requests yet. Enable sharing to let other clubs view
              your passport.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
