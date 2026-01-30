"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { ArrowRight, CheckCircle, Trophy, UserPlus, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { PDPLogo } from "@/components/pdp-logo";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { useCurrentUser } from "@/hooks/use-current-user";

function SetupCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");
  const orgName = searchParams.get("orgName");
  const invited = searchParams.get("invited");
  const currentUser = useCurrentUser();
  const completeSetup = useMutation(api.models.setup.completeSetup);
  const hasCompletedRef = useRef(false);

  // Mark setup as complete when page mounts
  useEffect(() => {
    if (currentUser && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      completeSetup().catch((error) => {
        console.error("Failed to mark setup as complete:", error);
      });
    }
  }, [currentUser, completeSetup]);

  // Redirect if not authenticated
  if (currentUser === null) {
    router.push("/login");
    return null;
  }

  // Redirect if not platform staff (shouldn't happen, but safety check)
  if (currentUser && !currentUser.isPlatformStaff) {
    router.push("/orgs/current");
    return null;
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleContinue = () => {
    if (orgId) {
      router.push(`/orgs/${orgId}/admin`);
    } else {
      router.push("/orgs");
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12"
      data-testid="setup-complete"
    >
      {/* Celebration wrapper with confetti animation */}
      <div data-testid="celebration">
        <Confetti />
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <PDPLogo size="lg" />
          </div>
          <div className="mb-4 flex justify-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--pdp-green)" }}
            >
              <CheckCircle className="h-12 w-12 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="font-bold text-4xl tracking-tight">
            Congratulations!
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Setup complete - your platform is ready. Let's get started!
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2">
          <div
            className="h-2 w-20 rounded-full"
            style={{ backgroundColor: "var(--pdp-green)" }}
          />
          <div
            className="h-2 w-20 rounded-full"
            style={{ backgroundColor: "var(--pdp-green)" }}
          />
          <div
            className="h-2 w-20 rounded-full"
            style={{ backgroundColor: "var(--pdp-green)" }}
          />
        </div>

        {/* Completed Setup Card */}
        <div
          className="space-y-6 rounded-lg border bg-card p-8 shadow-lg"
          data-testid="completion-summary"
        >
          <div>
            <h2 className="font-semibold text-2xl">What You've Accomplished</h2>
            <p className="mt-2 text-muted-foreground">
              You're all set up! Here's what's been configured:
            </p>
          </div>

          {/* Checkmarks */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle
                className="h-5 w-5 flex-shrink-0"
                style={{ color: "var(--pdp-green)" }}
              />
              <span>Platform administrator account created</span>
            </div>
            {orgName && (
              <div className="flex items-center gap-3">
                <CheckCircle
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: "var(--pdp-green)" }}
                />
                <span>
                  First organization created:{" "}
                  <span className="font-semibold">{orgName}</span>
                </span>
              </div>
            )}
            {invited && Number(invited) > 0 && (
              <div className="flex items-center gap-3">
                <CheckCircle
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: "var(--pdp-green)" }}
                />
                <span>
                  {invited} team member{Number(invited) > 1 ? "s" : ""} invited
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <CheckCircle
                className="h-5 w-5 flex-shrink-0"
                style={{ color: "var(--pdp-green)" }}
              />
              <span>Full platform access enabled</span>
            </div>
          </div>

          {/* Next Steps */}
          <div
            className="rounded-lg border-2 p-6"
            style={{
              borderColor: "var(--pdp-navy)",
              backgroundColor: "rgba(var(--pdp-navy-rgb), 0.05)",
            }}
          >
            <h3
              className="mb-4 font-semibold text-lg"
              style={{ color: "var(--pdp-navy)" }}
            >
              What's Next?
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--pdp-navy)" }}
                >
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold">Create Teams</h4>
                  <p className="text-muted-foreground text-sm">
                    Set up age groups and teams for your organization
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--pdp-navy)" }}
                >
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold">Enroll Players</h4>
                  <p className="text-muted-foreground text-sm">
                    Add players to your teams and create their digital passports
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--pdp-navy)" }}
                >
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold">Invite Coaches & Staff</h4>
                  <p className="text-muted-foreground text-sm">
                    Bring your coaching team on board and assign roles
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-center pt-4">
            <Button
              className="px-12 text-white"
              onClick={handleContinue}
              size="lg"
              style={{
                backgroundColor: "var(--pdp-navy)",
              }}
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Need help? Check out our documentation or contact support anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function SetupCompletePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SetupCompleteContent />
    </Suspense>
  );
}
