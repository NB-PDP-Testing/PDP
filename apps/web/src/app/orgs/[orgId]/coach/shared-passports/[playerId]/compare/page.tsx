"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useParams, useSearchParams } from "next/navigation";
import { ComparisonView } from "./comparison-view";

/**
 * Coach Passport Comparison Page
 *
 * Route: /orgs/[orgId]/coach/shared-passports/[playerId]/compare?consentId=[consentId]
 *
 * This page allows coaches to compare their local assessments with shared passport
 * data from other organizations. Requires a valid consentId query parameter.
 */
export default function ComparisonPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const orgId = params.orgId as string;
  const playerId = params.playerId as Id<"playerIdentities">;
  const consentId = searchParams.get(
    "consentId"
  ) as Id<"passportShareConsents"> | null;

  if (!consentId) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="py-16 text-center">
          <h1 className="font-bold text-2xl">Missing Consent Information</h1>
          <p className="mt-2 text-muted-foreground">
            This comparison view requires a valid consent ID to access shared
            passport data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ComparisonView
      consentId={consentId}
      organizationId={orgId}
      playerIdentityId={playerId}
    />
  );
}
