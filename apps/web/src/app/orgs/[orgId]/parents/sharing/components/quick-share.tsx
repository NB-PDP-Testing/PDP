"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Feature flag - enable this when quick share is ready for production
const ENABLE_QUICK_SHARE = false;

type QuickShareProps = {
  playerIdentityId: Id<"playerIdentities">;
  childName: string;
  onSuccess?: () => void;
};

/**
 * QuickShare Component - US-030
 *
 * Allows returning parents to quickly re-enable sharing with the same
 * settings they used previously. Shows only if parent has shared before.
 *
 * Behind ENABLE_QUICK_SHARE feature flag.
 */
export function QuickShare({
  playerIdentityId,
  childName,
  onSuccess,
}: QuickShareProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get last consent settings for this player
  const lastConsent = useQuery(
    api.models.passportSharing.getLastConsentSettings,
    {
      playerIdentityId,
    }
  );

  // Mutation to create consent
  const createConsent = useMutation(
    api.models.passportSharing.createPassportShareConsent
  );

  // Feature flag check - return null if not enabled
  if (!ENABLE_QUICK_SHARE) {
    return null;
  }

  // Don't show if no previous consent exists
  if (lastConsent === undefined) {
    return null; // Loading
  }

  if (lastConsent === null) {
    return null; // No previous consent
  }

  const handleQuickShare = async () => {
    try {
      setIsSubmitting(true);

      // Create new consent with same settings as last time
      await createConsent({
        playerIdentityId,
        receivingOrgId: lastConsent.receivingOrgId,
        sharedElements: lastConsent.sharedElements,
        sourceOrgMode: lastConsent.sourceOrgMode,
        sourceOrgIds: lastConsent.sourceOrgIds,
        expiresAt: lastConsent.expiresAt,
        ipAddress: "unknown", // TODO: Get actual IP address
      });

      onSuccess?.();
    } catch (error) {
      console.error("Failed to create quick share:", error);
      // TODO: Show toast notification
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-base text-blue-800">
            Quick Share Available
          </CardTitle>
        </div>
        <CardDescription className="text-blue-700">
          Share {childName}'s passport with the same settings you used before
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="rounded-lg bg-white p-3 text-sm">
            <p className="font-medium text-gray-900">Previous settings:</p>
            <ul className="mt-2 space-y-1 text-gray-600 text-xs">
              <li>
                •{" "}
                {
                  Object.values(lastConsent.sharedElements).filter(Boolean)
                    .length
                }{" "}
                elements shared
              </li>
              <li>
                •{" "}
                {lastConsent.sourceOrgMode === "all_enrolled"
                  ? "All enrolled organizations"
                  : `${lastConsent.sourceOrgIds?.length || 0} specific organization(s)`}
              </li>
              <li>
                • Expires:{" "}
                {new Date(lastConsent.expiresAt).toLocaleDateString()}
              </li>
            </ul>
          </div>

          <Button
            className="w-full"
            disabled={isSubmitting}
            onClick={handleQuickShare}
            size="sm"
            type="button"
          >
            <Zap className="mr-2 h-4 w-4" />
            {isSubmitting ? "Enabling..." : "Enable with Same Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
