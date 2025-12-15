"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { Clock, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Join request type matching the Convex schema
export interface JoinRequest {
  _id: Id<"orgJoinRequests">;
  organizationId: string;
  organizationName: string;
  requestedRole: string;
  requestedFunctionalRoles?: string[];
  status: "pending" | "approved" | "rejected";
  message?: string;
  requestedAt: number;
  reviewedAt?: number;
  rejectionReason?: string;
}

interface JoinRequestCardProps {
  request: JoinRequest;
  onCancel?: (requestId: Id<"orgJoinRequests">) => void;
}

/**
 * Card displaying a single pending join request
 */
export function PendingRequestCard({
  request,
  onCancel,
}: JoinRequestCardProps) {
  const functionalRoles = request.requestedFunctionalRoles ?? [];

  return (
    <Card className="border-yellow-200 bg-yellow-50/30">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">
                {request.organizationName}
              </CardTitle>
              <CardDescription className="mt-1 flex flex-wrap gap-1">
                {functionalRoles.length > 0 ? (
                  functionalRoles.map((role) => (
                    <Badge
                      className="border-yellow-300 bg-yellow-100 text-yellow-700 capitalize"
                      key={role}
                      variant="outline"
                    >
                      {role}
                    </Badge>
                  ))
                ) : (
                  <Badge
                    className="border-yellow-300 bg-yellow-100 text-yellow-700 capitalize"
                    variant="outline"
                  >
                    {request.requestedRole}
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
          {onCancel && (
            <Button
              onClick={() => onCancel(request._id)}
              size="icon"
              title="Cancel request"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-xs">
          Requested {new Date(request.requestedAt).toLocaleDateString()}
        </div>
        {request.message && (
          <p className="mt-2 text-muted-foreground text-sm">
            {request.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Card displaying a single rejected join request
 */
export function RejectedRequestCard({ request }: JoinRequestCardProps) {
  const functionalRoles = request.requestedFunctionalRoles ?? [];

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">
              {request.organizationName}
            </CardTitle>
            <CardDescription className="mt-1 flex flex-wrap gap-1">
              {functionalRoles.length > 0 ? (
                functionalRoles.map((role) => (
                  <Badge
                    className="border-red-300 bg-red-100 text-red-700 capitalize"
                    key={role}
                    variant="outline"
                  >
                    {role}
                  </Badge>
                ))
              ) : (
                <Badge
                  className="border-red-300 bg-red-100 text-red-700 capitalize"
                  variant="outline"
                >
                  {request.requestedRole}
                </Badge>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-xs">
          Rejected{" "}
          {request.reviewedAt
            ? new Date(request.reviewedAt).toLocaleDateString()
            : "recently"}
        </div>
        {request.rejectionReason && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 p-2">
            <p className="font-medium text-red-800 text-xs">Reason:</p>
            <p className="text-red-700 text-sm">{request.rejectionReason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface JoinRequestSectionProps {
  pendingRequests: JoinRequest[];
  rejectedRequests: JoinRequest[];
  onCancelRequest?: (requestId: Id<"orgJoinRequests">) => void;
}

/**
 * Full section displaying both pending and rejected join requests
 */
export function JoinRequestSection({
  pendingRequests,
  rejectedRequests,
  onCancelRequest,
}: JoinRequestSectionProps) {
  const hasPending = pendingRequests.length > 0;
  const hasRejected = rejectedRequests.length > 0;

  if (!(hasPending || hasRejected)) {
    return null;
  }

  return (
    <>
      {/* Pending Membership Requests */}
      {hasPending && (
        <div className="mt-8">
          <h2 className="mb-4 font-semibold text-[#1E3A5F] text-xl">
            Pending Membership Requests
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map((request) => (
              <PendingRequestCard
                key={request._id}
                onCancel={onCancelRequest}
                request={request}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rejected Membership Requests */}
      {hasRejected && (
        <div className="mt-8">
          <h2 className="mb-4 font-semibold text-[#1E3A5F] text-xl">
            Rejected Requests
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rejectedRequests.map((request) => (
              <RejectedRequestCard key={request._id} request={request} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
