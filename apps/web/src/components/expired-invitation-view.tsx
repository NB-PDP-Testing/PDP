"use client";

import { AlertTriangle, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ExpiredInvitationViewProps = {
  organizationName: string;
  role: string;
  originalInviteDate?: Date;
  expiredDate: Date;
  adminContactEmail?: string;
  canRequestNew: boolean;
  requestCount: number;
  onRequestNew: () => void;
  isRequesting?: boolean;
};

/**
 * ExpiredInvitationView component (Phase 1B)
 *
 * Displayed when a user clicks an expired invitation link.
 * Shows clear messaging about the expired invitation and options to request a new one.
 *
 * Features:
 * - Organization name and role context
 * - Request counter (max 3 requests)
 * - Admin contact email fallback
 * - Loading state for request submission
 */
export function ExpiredInvitationView({
  organizationName,
  role,
  originalInviteDate,
  expiredDate,
  adminContactEmail,
  canRequestNew,
  requestCount,
  onRequestNew,
  isRequesting = false,
}: ExpiredInvitationViewProps) {
  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Invitation Expired</CardTitle>
          <CardDescription>
            Your invitation to join <strong>{organizationName}</strong> has
            expired.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Role:</span>
              <span className="font-medium capitalize">{role}</span>
            </div>
            {originalInviteDate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Original invitation:</span>
                <span className="font-medium">
                  {formatDate(originalInviteDate)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Expired:</span>
              <span className="font-medium text-amber-600">
                {formatDate(expiredDate)}
              </span>
            </div>
          </div>

          {canRequestNew && requestCount < 3 ? (
            <div className="space-y-3">
              <Button
                className="w-full"
                disabled={isRequesting}
                onClick={onRequestNew}
              >
                {isRequesting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  "Request New Invitation"
                )}
              </Button>
              <p className="text-center text-gray-500 text-xs">
                Request {requestCount}/3
              </p>
            </div>
          ) : requestCount >= 3 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-center text-amber-800 text-sm">
                Maximum requests reached. Please contact the organization
                directly.
              </p>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex-col gap-2 border-t pt-6">
          {adminContactEmail ? (
            <>
              <p className="text-center text-gray-500 text-sm">
                Or contact the organization directly:
              </p>
              <a
                className="inline-flex items-center gap-2 font-medium text-blue-600 text-sm hover:underline"
                href={`mailto:${adminContactEmail}?subject=Invitation Request for ${organizationName}`}
              >
                <Mail className="h-4 w-4" />
                {adminContactEmail}
              </a>
            </>
          ) : (
            <p className="text-center text-muted-foreground text-sm">
              Need help?{" "}
              <a
                className="underline hover:text-foreground"
                href="mailto:support@playerarc.com"
              >
                Contact Support
              </a>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
