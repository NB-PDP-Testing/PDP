"use client";

/**
 * OnboardingOrchestrator - Centralized onboarding flow controller
 *
 * This component wraps the application and presents onboarding steps
 * one at a time in a coordinated flow. It queries for pending tasks
 * and renders the appropriate step component.
 *
 * Phase 1: Basic skeleton with placeholder renderer
 * Phase 2+: Will add actual step components (GDPR, child linking, etc.)
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Task type from the backend
type OnboardingTask = {
  type: "accept_invitation" | "guardian_claim" | "child_linking" | "welcome";
  priority: number;
  data: unknown;
};

type OnboardingOrchestratorProps = {
  children: React.ReactNode;
};

/**
 * Placeholder step renderer for Phase 1
 * In later phases, this will dispatch to actual step components
 */
function OnboardingStepRenderer({
  task,
  onComplete,
}: {
  task: OnboardingTask;
  onComplete: () => void;
}) {
  // Get a human-readable title for the task type
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
  const tasks = useQuery(api.models.onboarding.getOnboardingTasks);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Get the current task (if any)
  const currentTask = tasks?.[currentStepIndex];

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
        />
      )}
    </>
  );
}
