"use client";

/**
 * Claim Account Page - Allows players to claim their account via token
 *
 * URL: /claim-account/[token]
 *
 * This page validates the claim token and displays either:
 * - The claim wizard if the token is valid
 * - An error message if the token is invalid, expired, or used
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, Clock, UserCheck } from "lucide-react";
import Link from "next/link";
import { ClaimWizard } from "@/components/graduation/claim-wizard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ClaimAccountPageProps = {
  params: Promise<{ token: string }>;
};

export default function ClaimAccountPage({ params }: ClaimAccountPageProps) {
  // Unwrap the params Promise (Next.js 15 async params)
  const { token } = require("react").use(params);

  const claimStatus = useQuery(
    api.models.playerGraduations.getPlayerClaimStatus,
    {
      token,
    }
  );

  // Loading state
  if (claimStatus === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">
            Validating your invitation...
          </p>
        </div>
      </div>
    );
  }

  // Invalid token - render error state based on reason
  if (!claimStatus.valid) {
    // Determine error state content
    const renderErrorContent = () => {
      if (claimStatus.used) {
        return (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Already Claimed</CardTitle>
            <CardDescription>
              This invitation has already been used to claim an account.
            </CardDescription>
          </>
        );
      }
      if (claimStatus.expired) {
        return (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation link has expired. Please contact your guardian to
              request a new invitation.
            </CardDescription>
          </>
        );
      }
      return (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>
            This invitation link is not valid. Please check the link or contact
            your guardian for assistance.
          </CardDescription>
        </>
      );
    };

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {renderErrorContent()}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {claimStatus.used && (
                <Button asChild className="w-full">
                  <Link href="/login">Sign In to Your Account</Link>
                </Button>
              )}
              <Button asChild className="w-full" variant="outline">
                <Link href="/">Go to Home Page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid token - show claim wizard
  // At this point, if valid is true, playerIdentityId must be defined
  if (!claimStatus.playerIdentityId) {
    return null; // Shouldn't happen, but TypeScript needs this check
  }

  return (
    <div className="min-h-screen bg-background">
      <ClaimWizard
        organizationName={
          claimStatus.organizationName || "Unknown Organization"
        }
        playerIdentityId={claimStatus.playerIdentityId}
        playerName={claimStatus.playerName || "Player"}
        token={token}
      />
    </div>
  );
}
