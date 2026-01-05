"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, CheckCircle, Trophy, UserPlus, Users } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { PDPLogo } from "@/components/pdp-logo";
import { Button } from "@/components/ui/button";

export default function SetupCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");
  const orgName = searchParams.get("orgName");
  const currentUser = useQuery(api.models.users.getCurrentUser);

  // Redirect if not authenticated
  if (currentUser === null) {
    router.push("/login");
    return null;
  }

  // Redirect if not platform staff (shouldn't happen, but safety check)
  if (currentUser && !currentUser.isPlatformStaff) {
    router.push("/orgs/current" as Route);
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
      router.push(`/orgs/${orgId}/admin` as Route);
    } else {
      router.push("/orgs" as Route);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
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
          <h1 className="font-bold text-4xl tracking-tight">Setup Complete!</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Your platform is ready. Let's get started!
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
        <div className="space-y-6 rounded-lg border bg-card p-8 shadow-lg">
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
