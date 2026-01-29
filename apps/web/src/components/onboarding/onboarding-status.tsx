"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * OnboardingStatus - Displays the user's onboarding completion status
 *
 * Shows a compact indicator of whether the user has completed onboarding.
 * Used on dashboards to provide visibility into onboarding state.
 *
 * Test IDs:
 * - data-testid="onboarding-status" - wrapper element
 * - data-testid="onboarding-complete" - shown when onboarding is complete
 */
export function OnboardingStatus() {
  const currentUser = useQuery(api.models.users.getCurrentUser);

  // Don't render while loading
  if (currentUser === undefined) {
    return null;
  }

  // Don't render if no user
  if (currentUser === null) {
    return null;
  }

  const isComplete = currentUser.onboardingComplete === true;

  return (
    <div data-testid="onboarding-status">
      {isComplete ? (
        <Card
          className="border-green-200 bg-green-50/50"
          data-testid="onboarding-complete"
        >
          <CardContent className="flex items-center gap-3 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900 text-sm">
                Onboarding Complete
              </p>
              <p className="text-green-700 text-xs">
                Welcome aboard! You're all set up.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 py-3">
            <Circle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900 text-sm">
                Setup in Progress
              </p>
              <p className="text-amber-700 text-xs">
                Complete your onboarding to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
