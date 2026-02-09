"use client";

/**
 * OnboardingOrchestrator - Centralized onboarding flow controller
 *
 * This component wraps the application and presents onboarding steps
 * one at a time in a coordinated flow. It queries for pending tasks
 * and renders the appropriate step component.
 *
 * Phase 1: Skeleton with guardian_claim step implemented
 * Phase 2: Added GDPR consent as first step (priority 0)
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  GuardianPrompt,
  type PendingGraduation,
} from "@/components/graduation/guardian-prompt";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnalyticsEvents, useAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { type ChildLink, ChildLinkingStep } from "./child-linking-step";
import { OnboardingErrorBoundary } from "./error-boundary";
import { GdprConsentStep } from "./gdpr-consent-step";
import {
  type ProfileCompletionData,
  ProfileCompletionStep,
} from "./profile-completion-step";
import { UnifiedGuardianClaimStep } from "./unified-guardian-claim-step";
import { UnifiedInvitationStep } from "./unified-invitation-step";

// Task type from the backend
type OnboardingTask = {
  type:
    | "gdpr_consent"
    | "accept_invitation"
    | "profile_completion"
    | "guardian_claim"
    | "child_linking"
    | "player_graduation"
    | "welcome";
  priority: number;
  data: unknown;
};

// Type for player_graduation task data (Phase 7)
type PlayerGraduationTaskData = {
  pendingGraduations: PendingGraduation[];
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

// Type for child_linking task data (Phase 3 + Phase 6 skip count)
type ChildLinkingTaskData = {
  guardianIdentityId: Id<"guardianIdentities">;
  pendingChildren: Array<{
    linkId: Id<"guardianPlayerLinks">;
    playerIdentityId: Id<"playerIdentities">;
    firstName: string;
    lastName: string;
    relationship: string;
    organizationId?: string;
    organizationName: string;
  }>;
  skipCount?: number; // Phase 6: How many times user has skipped (max 3)
};

// Type for profile_completion task data (Phase 0: Onboarding Sync, Phase 0.6: Address Collection)
type ProfileCompletionTaskData = {
  currentPhone?: string;
  currentPostcode?: string;
  currentAltEmail?: string;
  currentAddress?: string;
  currentAddress2?: string;
  currentTown?: string;
  currentCounty?: string;
  currentCountry?: string;
  skipCount: number;
  canSkip: boolean;
  reason: string;
};

// Type for accept_invitation task data
type AcceptInvitationTaskData = {
  invitations: Array<{
    invitationId: string;
    organizationId: string;
    organizationName: string;
    role: string;
    functionalRoles: string[];
    expiresAt: number;
    playerLinks?: Array<{
      id: string;
      name: string;
      ageGroup?: string;
    }>;
    teams?: Array<{
      id: string;
      name: string;
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
  userEmail,
  onComplete,
  onSkip,
}: {
  task: OnboardingTask;
  userId: string | undefined;
  userEmail: string | undefined;
  onComplete: () => void;
  onSkip: () => void;
}) {
  // Get current GDPR version for GDPR consent task
  const gdprVersion = useQuery(api.models.gdpr.getCurrentGdprVersion);

  // Handle gdpr_consent task - always shown first (priority 0)
  if (task.type === "gdpr_consent") {
    // Wait for GDPR version to load
    if (!gdprVersion) {
      return null; // Loading state
    }

    return <GdprConsentStep gdprVersion={gdprVersion} onAccept={onComplete} />;
  }

  // Handle profile_completion task (Phase 0: Onboarding Sync, Phase 0.6: Address Collection)
  // This step collects phone, postcode, alternate email, and full address for multi-signal matching
  if (task.type === "profile_completion") {
    const data = task.data as ProfileCompletionTaskData;
    const profileData: ProfileCompletionData = {
      currentPhone: data.currentPhone,
      currentPostcode: data.currentPostcode,
      currentAltEmail: data.currentAltEmail,
      currentAddress: data.currentAddress,
      currentAddress2: data.currentAddress2,
      currentTown: data.currentTown,
      currentCounty: data.currentCounty,
      currentCountry: data.currentCountry,
      skipCount: data.skipCount,
      canSkip: data.canSkip,
      reason: data.reason,
    };

    return (
      <ProfileCompletionStep
        data={profileData}
        onComplete={onComplete}
        onSkip={onSkip}
      />
    );
  }

  // Handle accept_invitation task with UnifiedInvitationStep
  // This combines invitation acceptance + child confirmation in ONE step
  // Works for all roles: parent (with children), coach (with teams), admin (no children/teams)
  if (task.type === "accept_invitation" && userId && userEmail) {
    const data = task.data as AcceptInvitationTaskData;
    return (
      <UnifiedInvitationStep
        invitations={data.invitations}
        onComplete={onComplete}
        userEmail={userEmail}
        userId={userId}
      />
    );
  }

  // Handle guardian_claim task with UnifiedGuardianClaimStep
  // This component shows "Welcome, you have pending actions" and lets the user
  // accept/decline individual children with "Yes, this is mine" / "No, not mine"
  if (task.type === "guardian_claim" && userId) {
    const data = task.data as GuardianClaimTaskData;

    // Transform data to match UnifiedGuardianClaimStep's expected format
    const claimableIdentities = data.identities.map((identity) => ({
      guardianIdentity: {
        _id: identity.guardianIdentity._id as string,
        firstName: identity.guardianIdentity.firstName,
        lastName: identity.guardianIdentity.lastName,
        email: identity.guardianIdentity.email,
        phone: identity.guardianIdentity.phone,
        verificationStatus: identity.guardianIdentity.verificationStatus,
      },
      children: identity.children.map((child) => ({
        playerIdentityId: child.playerIdentityId as string,
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: "", // Not available from our query
        relationship: child.relationship,
      })),
      organizations: identity.organizations,
    }));

    return (
      <UnifiedGuardianClaimStep
        claimableIdentities={claimableIdentities}
        onComplete={onComplete}
        userId={userId}
      />
    );
  }

  // Handle child_linking task with ChildLinkingStep (Phase 3)
  if (task.type === "child_linking") {
    const data = task.data as ChildLinkingTaskData;

    // Check if user has already accepted GDPR (for privacy extension message)
    const hasExistingGdprConsent = true; // If we got here, GDPR was already accepted

    // Transform data to match ChildLinkingStep's expected format
    const pendingLinks: ChildLink[] = data.pendingChildren.map((child) => ({
      linkId: child.linkId as string,
      playerIdentityId: child.playerIdentityId as string,
      playerName: `${child.firstName} ${child.lastName}`,
      relationship: child.relationship,
      organizationName: child.organizationName,
      organizationId: child.organizationId || "",
      guardianIdentityId: data.guardianIdentityId as string,
    }));

    return (
      <ChildLinkingStep
        hasExistingGdprConsent={hasExistingGdprConsent}
        onComplete={onComplete}
        pendingLinks={pendingLinks}
        skipCount={data.skipCount ?? 0}
      />
    );
  }

  // Handle player_graduation task with GuardianPrompt (Phase 7)
  if (task.type === "player_graduation") {
    const data = task.data as PlayerGraduationTaskData;

    return (
      <GuardianPrompt
        onComplete={onComplete}
        pendingGraduations={data.pendingGraduations}
      />
    );
  }

  // Placeholder for other task types
  const getTaskTitle = (type: string) => {
    switch (type) {
      case "gdpr_consent":
        return "Privacy Policy";
      case "accept_invitation":
        return "Pending Invitation";
      case "profile_completion":
        return "Additional Information";
      case "guardian_claim":
        return "Claim Your Guardian Profile";
      case "child_linking":
        return "Confirm Your Children";
      case "player_graduation":
        return "Player Turned 18";
      case "welcome":
        return "Welcome!";
      default:
        return "Onboarding Step";
    }
  };

  const getTaskDescription = (type: string) => {
    switch (type) {
      case "gdpr_consent":
        return "Please review and accept our privacy policy to continue.";
      case "accept_invitation":
        return "You have pending organization invitations to review.";
      case "profile_completion":
        return "Please provide additional information to complete your profile.";
      case "guardian_claim":
        return "We found a guardian profile that matches your email. Claim it to see your children.";
      case "child_linking":
        return "Please confirm the children linked to your account.";
      case "player_graduation":
        return "One of your children has turned 18 and can claim their own account.";
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
  const rawTasks = useQuery(api.models.onboarding.getOnboardingTasks);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sessionSkipped, setSessionSkipped] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set();
    }
    const stored = sessionStorage.getItem("onboarding_skipped");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const { track } = useAnalytics();

  // Filter out tasks the user has already skipped this session
  const tasks = rawTasks?.filter((t) => !sessionSkipped.has(t.type));

  // Track when onboarding starts and steps are shown
  const stepStartTimeRef = useRef<number>(Date.now());
  const onboardingTrackedRef = useRef(false);

  // Get the current task (if any)
  const currentTask = tasks?.[currentStepIndex];
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  // Reset step index when tasks change (e.g., after completing a step, the query re-fetches)
  // This handles the race condition where:
  // 1. User completes step → currentStepIndex increments
  // 2. Query re-fetches → returns shorter array (completed task removed)
  // 3. currentStepIndex now points past the array bounds
  useEffect(() => {
    if (tasks && currentStepIndex >= tasks.length) {
      setCurrentStepIndex(0);
    }
  }, [tasks, currentStepIndex]);

  // Track onboarding started (once when tasks first load)
  useEffect(() => {
    if (tasks && tasks.length > 0 && !onboardingTrackedRef.current) {
      onboardingTrackedRef.current = true;
      track(AnalyticsEvents.ONBOARDING_STARTED, {
        total_steps: tasks.length,
        first_step: tasks[0]?.type ?? "unknown",
      });
    }
  }, [tasks, track]);

  // Track onboarding completed when tasks array becomes empty
  // (after previously having tasks)
  const prevTasksLengthRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (tasks !== undefined) {
      // If we previously had tasks and now have none, onboarding is complete
      if (
        prevTasksLengthRef.current !== undefined &&
        prevTasksLengthRef.current > 0 &&
        tasks.length === 0
      ) {
        track(AnalyticsEvents.ONBOARDING_COMPLETED, {
          total_steps: prevTasksLengthRef.current,
          steps_completed: prevTasksLengthRef.current,
        });
      }
      prevTasksLengthRef.current = tasks.length;
    }
  }, [tasks, track]);

  // Track when a new step is shown
  useEffect(() => {
    if (currentTask) {
      stepStartTimeRef.current = Date.now();
      track(AnalyticsEvents.ONBOARDING_STEP_SHOWN, {
        step_id: currentTask.type,
        step_number: currentStepIndex + 1,
        total_steps: tasks?.length ?? 0,
      });
    }
  }, [currentTask, currentStepIndex, tasks?.length, track]);

  // Handle step completion - move to next step or let query re-fetch
  // IMPORTANT: Don't dismiss immediately! The Convex query will re-fetch
  // and may return new tasks (e.g., guardian_claim after profile_completion).
  // We only dismiss when the query returns an empty array.
  const handleStepComplete = () => {
    const durationSeconds = Math.round(
      (Date.now() - stepStartTimeRef.current) / 1000
    );

    if (currentTask) {
      track(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
        step_id: currentTask.type,
        step_number: currentStepIndex + 1,
        duration_seconds: durationSeconds,
      });
    }

    // Always reset to step 0 - the query will re-fetch and return
    // either new tasks or an empty array. The useEffect will handle
    // updating the step index if needed.
    setCurrentStepIndex(0);
  };

  // Handle step skip - dismiss for this browser session via sessionStorage
  const handleStepSkipped = () => {
    if (currentTask) {
      const updated = new Set(sessionSkipped);
      updated.add(currentTask.type);
      setSessionSkipped(updated);
      sessionStorage.setItem(
        "onboarding_skipped",
        JSON.stringify([...updated])
      );

      track(AnalyticsEvents.ONBOARDING_STEP_SKIPPED, {
        step_id: currentTask.type,
        step_number: currentStepIndex + 1,
      });
    }
    setCurrentStepIndex(0);
  };

  // Don't show anything if:
  // - Tasks are still loading (undefined)
  // - No tasks to show (query returns empty array when all complete)
  const shouldShowModal =
    tasks !== undefined && tasks.length > 0 && currentTask !== undefined;

  // Determine onboarding status for data attributes
  const isOnboardingComplete = tasks !== undefined && tasks.length === 0;

  return (
    <div
      data-onboarding-complete={isOnboardingComplete}
      data-onboarding-in-progress={shouldShowModal}
      data-testid={
        isOnboardingComplete ? "onboarding-complete" : "onboarding-status"
      }
    >
      {/* Always render the app content */}
      {children}

      {/* Show onboarding modal on top when there are tasks */}
      {shouldShowModal && (
        <OnboardingErrorBoundary onRetry={() => setCurrentStepIndex(0)}>
          <div data-testid="onboarding-wizard">
            <OnboardingStepRenderer
              onComplete={handleStepComplete}
              onSkip={handleStepSkipped}
              task={currentTask}
              userEmail={userEmail}
              userId={userId}
            />
          </div>
        </OnboardingErrorBoundary>
      )}
    </div>
  );
}
