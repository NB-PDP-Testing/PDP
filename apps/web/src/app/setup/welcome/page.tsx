"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { PDPLogo } from "@/components/pdp-logo";
import { Button } from "@/components/ui/button";

export default function SetupWelcomePage() {
  const router = useRouter();
  const currentUser = useQuery(api.models.users.getCurrentUser);

  // Redirect if not authenticated
  if (currentUser === null) {
    router.push("/login" as Route);
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

  const handleGetStarted = () => {
    router.push("/setup/organization" as Route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <PDPLogo size="lg" />
          </div>
          <h1 className="font-bold text-4xl tracking-tight">
            Welcome to PDP Platform Setup
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            You're the first user! Let's set up your platform together.
          </p>
        </div>

        {/* Setup Steps Card */}
        <div className="space-y-6 rounded-lg border bg-card p-8 shadow-lg">
          <div>
            <h2 className="font-semibold text-2xl">What's Next?</h2>
            <p className="mt-2 text-muted-foreground">
              We'll guide you through a quick 3-step setup process to get your
              platform ready:
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-white"
                style={{ backgroundColor: "var(--pdp-navy)" }}
              >
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  Create Your First Organization
                </h3>
                <p className="text-muted-foreground text-sm">
                  Set up your sports club or organization with basic details
                  like name, sport type, and branding colors.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-white"
                style={{ backgroundColor: "var(--pdp-navy)" }}
              >
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  Configure Platform Settings
                </h3>
                <p className="text-muted-foreground text-sm">
                  Review and adjust platform-wide settings, user permissions,
                  and feature access.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-white"
                style={{ backgroundColor: "var(--pdp-navy)" }}
              >
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg">Start Using PDP</h3>
                <p className="text-muted-foreground text-sm">
                  Begin enrolling players, creating teams, and leveraging all
                  the powerful features PDP has to offer.
                </p>
              </div>
            </div>
          </div>

          {/* Platform Staff Badge */}
          <div
            className="rounded-lg border-2 p-4"
            style={{
              borderColor: "var(--pdp-green)",
              backgroundColor: "rgba(var(--pdp-green-rgb), 0.1)",
            }}
          >
            <div className="flex items-center gap-3">
              <svg
                className="h-6 w-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                style={{ color: "var(--pdp-green)" }}
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <div>
                <p className="font-semibold">You're a Platform Administrator</p>
                <p className="text-muted-foreground text-sm">
                  You have full access to create organizations, manage users,
                  and configure platform settings.
                </p>
              </div>
            </div>
          </div>

          {/* Get Started Button */}
          <div className="flex justify-center pt-4">
            <Button
              className="px-8 text-white"
              onClick={handleGetStarted}
              size="lg"
              style={{
                backgroundColor: "var(--pdp-navy)",
              }}
            >
              Get Started →
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            This setup will only take a few minutes. You can always modify these
            settings later.
          </p>
        </div>
      </div>
    </div>
  );
}
