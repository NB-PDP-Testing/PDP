"use client";

/**
 * OnboardingOrchestrator - Centralized onboarding flow controller
 *
 * This component wraps the application and presents onboarding steps
 * one at a time in a coordinated flow. It queries for pending tasks
 * and renders the appropriate step component.
 *
 * Phase 1: Skeleton with guardian_claim step implemented
 * Phase 2+: Will add more step components (GDPR, welcome, etc.)
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { BulkGuardianClaimDialog } from "@/components/bulk-guardian-claim-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";

// Task type from the backend
type OnboardingTask = {
  type: "accept_invitation" | "guardian_claim" | "child_linking" | "welcome";
  priority: number;
  data: unknown;
};

// Type for guardian_claim task data (matches what getOnboardingTasks returns)
type GuardianClaimTaskData = {
  identities: Array<{
    guardianIdentity: {
      _id: Id<"guardianIdentities">;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      verificationStatus: string;
    };
    children: Array<{
      playerIdentityId: Id<"playerIdentities">;
      firstName: string;
      lastName: string;
      relationship: string;
    }>;
    organizations: Array<{
      organizationId: string;
      organizationName?: string;
    }>;
  }>;
};

type OnboardingOrchestratorProps = {
  children: React.ReactNode;
};

/**
 * Step renderer that dispatches to the appropriate component based on task type
 */
function OnboardingStepRenderer({
  task,
  userId,
  onComplete,
}: {
  task: OnboardingTask;
  userId: string | undefined;
  onComplete: () => void;
}) {
  // Handle guardian_claim task with BulkGuardianClaimDialog
  if (task.type === "guardian_claim" && userId) {
    const data = task.data as GuardianClaimTaskData;

    // Transform data to match BulkGuardianClaimDialog's expected format
    // The dialog expects a confidence field and dateOfBirth for children
    const claimableIdentities = data.identities.map((identity) => ({
      guardianIdentity: identity.guardianIdentity,
      children: identity.children.map((child) => ({
        ...child,
        dateOfBirth: "", // Not available from our query, but dialog handles it
      })),
      organizations: identity.organizations,
      confidence: 1.0, // High confidence since we matched by email
    }));

    return (
      <BulkGuardianClaimDialog
        claimableIdentities={claimableIdentities}
        onClaimComplete={onComplete}
        onOpenChange={(open) => {
          if (!open) {
            onComplete();
          }
        }}
        open
        userId={userId}
      />
    );
  }

  // Placeholder for other task types
  const getTaskTitle = (type: string) => {
    switch (type) {
      case "accept_invitation":
        return "Pending Invitation";
      case "guardian_claim":
        return "Claim Your Guardian Profile";
      case "child_linking":
        return "Confirm Your Children";
      case "welcome":
        return "Welcome!";
      default:
        return "Onboarding Step";
    }
  };

  const getTaskDescription = (type: string) => {
    switch (type) {
      case "accept_invitation":
        return "You have pending organization invitations to review.";
      case "guardian_claim":
        return "We found a guardian profile that matches your email. Claim it to see your children.";
      case "child_linking":
        return "Please confirm the children linked to your account.";
      case "welcome":
        return "Welcome to the platform! Let us show you around.";
      default:
        return "Please complete this step to continue.";
    }
  };

  return (
    <Dialog onOpenChange={() => onComplete()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTaskTitle(task.type)}</DialogTitle>
          <DialogDescription>{getTaskDescription(task.type)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Debug info for Phase 1 */}
          <div className="rounded-lg bg-muted p-4">
            <p className="font-mono text-muted-foreground text-sm">
              Task Type: {task.type}
            </p>
            <p className="font-mono text-muted-foreground text-sm">
              Priority: {task.priority}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground text-xs">
                View task data
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto text-xs">
                {JSON.stringify(task.data, null, 2)}
              </pre>
            </details>
          </div>

          <p className="text-muted-foreground text-sm">
            This is a placeholder. In Phase 2+, the actual step component will
            be rendered here.
          </p>

          <div className="flex justify-end gap-2">
            <Button onClick={onComplete} variant="outline">
              Skip for Now
            </Button>
            <Button onClick={onComplete}>Continue</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main orchestrator component
 *
 * Wraps the app and shows onboarding modals when there are pending tasks.
 * Children are always rendered - modals appear on top.
 */
export function OnboardingOrchestrator({
  children,
}: OnboardingOrchestratorProps) {
  const { data: session } = authClient.useSession();
  const tasks = useQuery(api.models.onboarding.getOnboardingTasks);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Get the current task (if any)
  const currentTask = tasks?.[currentStepIndex];
  const userId = session?.user?.id;

  // Handle step completion - move to next step or finish
  const handleStepComplete = () => {
    if (tasks && currentStepIndex < tasks.length - 1) {
      // Move to next task
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // All tasks complete, dismiss the orchestrator
      setDismissed(true);
    }
  };

  // Don't show anything if:
  // - Tasks are still loading (undefined)
  // - No tasks to show
  // - User has dismissed the orchestrator
  const shouldShowModal =
    tasks !== undefined &&
    tasks.length > 0 &&
    currentTask !== undefined &&
    !dismissed;

  return (
    <>
      {/* Always render the app content */}
      {children}

      {/* Show onboarding modal on top when there are tasks */}
      {shouldShowModal && (
        <OnboardingStepRenderer
          onComplete={handleStepComplete}
          task={currentTask}
          userId={userId}
        />
      )}
    </>
  );
}
