import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { AnalyticsEvents, useAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../packages/backend/convex/_generated/api";
import { GuardianIdentityClaimDialog } from "./guardian-identity-claim-dialog";
import { PDPLogo } from "./pdp-logo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignUpForm({ redirect }: { redirect?: string | null }) {
  const router = useRouter();
  const { track } = useAnalytics();
  const [pendingClaim, setPendingClaim] = useState<{
    email: string;
    name: string;
    userId: string;
  } | null>(null);

  // First-user auto-assignment mutation
  const autoAssignFirstUser = useMutation(
    api.models.users.autoAssignFirstUserAsPlatformStaff
  );

  // Check for claimable identity when we have email + name
  const claimableIdentity = useQuery(
    api.models.guardianIdentities.checkForClaimableIdentity,
    pendingClaim
      ? { email: pendingClaim.email, name: pendingClaim.name }
      : "skip"
  );

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: async (_ctx) => {
            // Track signup event
            track(AnalyticsEvents.USER_SIGNED_UP, {
              method: "email",
              has_redirect: !!redirect,
            });

            // Get the newly created userId from the session
            const session = await authClient.getSession();
            const userId = session.data?.user?.id;

            if (userId) {
              // Check if this is the first user and auto-assign platform staff
              const result = await autoAssignFirstUser({ userId });

              // If this was the first user, redirect to setup wizard
              if (result.wasFirstUser) {
                toast.success(
                  "🎉 Welcome! Let's set up your platform together."
                );
                router.push("/setup/welcome" as Route);
                return;
              }

              // Not the first user - check for claimable guardian identity
              // Set pending claim to trigger the query
              setPendingClaim({
                email: value.email,
                name: value.name,
                userId,
              });

              // The claimableIdentity query will run, and if there's a match,
              // the dialog will show automatically via the useEffect below
            } else {
              // No userId, just redirect normally
              const destination = (redirect || "/orgs/current") as Route;
              router.push(destination);
              toast.success(
                "🎉 Welcome to PDP! Your account is ready. Let's build something great."
              );
            }
          },
          onError: (error: {
            error: { message?: string; statusText?: string };
          }) => {
            toast.error(
              error.error.message ||
                error.error.statusText ||
                "Unable to create your account. Please try again."
            );
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Please enter your full name"),
        email: z.string().email("Please enter a valid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  const signUpWithGoogle = async () => {
    const callbackURL = (redirect || "/orgs/current") as Route;

    // If redirecting to an invitation page, store the invitation ID in sessionStorage
    if (redirect?.includes("/orgs/accept-invitation/")) {
      const invitationId = redirect.split("/orgs/accept-invitation/")[1];
      if (invitationId) {
        sessionStorage.setItem("pendingInvitationId", invitationId);
        console.log("Stored pending invitation ID:", invitationId);
      }
    }

    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL,
      },
      {
        onError: (error: {
          error: { message?: string; statusText?: string };
        }) => {
          toast.error(
            error.error.message ||
              error.error.statusText ||
              "Unable to sign up with Google. Please try again."
          );
        },
      }
    );
  };

  const signUpWithMicrosoft = async () => {
    const callbackURL = (redirect || "/orgs/current") as Route;

    // If redirecting to an invitation page, store the invitation ID in sessionStorage
    if (redirect?.includes("/orgs/accept-invitation/")) {
      const invitationId = redirect.split("/orgs/accept-invitation/")[1];
      if (invitationId) {
        sessionStorage.setItem("pendingInvitationId", invitationId);
        console.log("Stored pending invitation ID:", invitationId);
      }
    }

    await authClient.signIn.social(
      {
        provider: "microsoft",
        callbackURL,
      },
      {
        onError: (error: {
          error: { message?: string; statusText?: string };
        }) => {
          toast.error(
            error.error.message ||
              error.error.statusText ||
              "Unable to sign up with Microsoft. Please try again."
          );
        },
      }
    );
  };

  const handleClaimComplete = () => {
    // After claiming, redirect to the appropriate page
    const destination = (redirect || "/orgs/current") as Route;
    router.push(destination);
    toast.success(
      "🎉 Welcome back! You now have access to your children's profiles."
    );
  };

  const handleClaimDialogClose = (open: boolean) => {
    if (!open && pendingClaim) {
      // User dismissed the dialog - proceed to normal redirect
      const destination = (redirect || "/orgs/current") as Route;
      router.push(destination);
      toast.success(
        "🎉 Welcome to PDP! Your account is ready. Let's build something great."
      );
      setPendingClaim(null);
    }
  };

  // Show claiming dialog if we have a match
  const showClaimDialog =
    pendingClaim && claimableIdentity && claimableIdentity.confidence >= 80;

  return (
    <>
      {/* Guardian Identity Claiming Dialog */}
      {showClaimDialog && pendingClaim && (
        <GuardianIdentityClaimDialog
          childrenList={claimableIdentity.children}
          guardianIdentityId={claimableIdentity.guardianIdentity._id}
          guardianName={`${claimableIdentity.guardianIdentity.firstName} ${claimableIdentity.guardianIdentity.lastName}`}
          onClaimComplete={handleClaimComplete}
          onDismiss={() => handleClaimDialogClose(false)}
          onOpenChange={handleClaimDialogClose}
          open={true}
          organizations={claimableIdentity.organizations}
          userId={pendingClaim.userId}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
        <div className="mx-auto w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <PDPLogo size="lg" />
            </div>
            <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
              Welcome to PDP
            </h1>
            <p className="mt-2 font-medium text-base sm:text-lg">
              Player Development Passport System
            </p>
            <p
              className="mt-2 text-sm italic"
              style={{ color: "var(--pdp-green)" }}
            >
              "As many as possible, for as long as possible..."
            </p>
          </div>

          {/* Mission Statement */}
          <div
            className="rounded-lg border-2 p-4 shadow-sm"
            style={{
              borderColor: "var(--pdp-navy)",
              background:
                "linear-gradient(to right, rgba(var(--pdp-navy-rgb), 0.1), rgba(var(--pdp-green-rgb), 0.05))",
            }}
          >
            <p className="text-foreground text-sm leading-relaxed">
              Player Development Passport (PDP) is a comprehensive digital
              ecosystem where parents and coaches collaborate to support and
              manage a child's sporting development. Each player has a personal
              "passport" that follows them throughout their time with a
              club/sport.
            </p>
          </div>

          {/* How to Join */}
          <div
            className="rounded-lg border p-5"
            style={{
              borderColor: "rgba(var(--pdp-navy-rgb), 0.2)",
              backgroundColor: "rgba(var(--pdp-navy-rgb), 0.05)",
            }}
          >
            <h2
              className="mb-3 font-semibold text-base sm:text-lg"
              style={{ color: "var(--pdp-navy)" }}
            >
              How to Join
            </h2>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-semibold text-sm text-white"
                  style={{ backgroundColor: "var(--pdp-navy)" }}
                >
                  1
                </span>
                <span className="text-muted-foreground text-sm">
                  Create an account using your email
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-semibold text-sm text-white"
                  style={{ backgroundColor: "var(--pdp-navy)" }}
                >
                  2
                </span>
                <span className="text-muted-foreground text-sm">
                  Select your role(s):{" "}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--pdp-green)" }}
                  >
                    Coach, Parent, Admin
                  </span>{" "}
                  - pick one, multiple, or all three
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-semibold text-sm text-white"
                  style={{ backgroundColor: "var(--pdp-navy)" }}
                >
                  3
                </span>
                <span className="text-muted-foreground text-sm">
                  Complete your profile details
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-semibold text-sm text-white"
                  style={{ backgroundColor: "var(--pdp-navy)" }}
                >
                  4
                </span>
                <span className="text-muted-foreground text-sm">
                  Wait for admin approval (usually 24-48 hours)
                </span>
              </li>
            </ol>
          </div>

          {/* Card Container */}
          <div className="space-y-5 rounded-lg border bg-card p-6 shadow-lg sm:p-8">
            {/* Create Account Header */}
            <div className="text-center">
              <h2 className="font-bold text-2xl">Sign Up</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Create your account and start your PDP journey
              </p>
            </div>

            {/* Sign In Link - Above Form */}
            <div
              className="rounded-lg border-2 p-4 text-center shadow-sm"
              style={{
                borderColor: "rgba(var(--pdp-navy-rgb), 0.3)",
                background:
                  "linear-gradient(to right, rgba(var(--pdp-navy-rgb), 0.1), rgba(var(--pdp-navy-rgb), 0.05))",
              }}
            >
              <p className="text-sm">
                <span className="text-muted-foreground">
                  Already have an account?{" "}
                </span>
                <a
                  className="font-bold hover:underline"
                  href="/login"
                  style={{ color: "var(--pdp-navy)" }}
                >
                  Sign in
                </a>
              </p>
            </div>
            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={signUpWithGoogle}
                size="lg"
                variant="outline"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <title>Google logo</title>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </Button>
              <Button
                className="w-full"
                onClick={signUpWithMicrosoft}
                size="lg"
                variant="outline"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="#00A4EF"
                  viewBox="0 0 24 24"
                >
                  <title>Microsoft logo</title>
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                </svg>
                Sign up with Microsoft
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or sign up with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <div>
                <form.Field name="name">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Full Name</Label>
                      <Input
                        autoComplete="name"
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="John Doe"
                        value={field.state.value}
                      />
                      {field.state.meta.errors.map((error) => (
                        <p
                          className="text-destructive text-sm"
                          key={error?.message}
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="email">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Email Address</Label>
                      <Input
                        autoComplete="email"
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="you@example.com"
                        type="email"
                        value={field.state.value}
                      />
                      {field.state.meta.errors.map((error) => (
                        <p
                          className="text-destructive text-sm"
                          key={error?.message}
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>

              <div>
                <form.Field name="password">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Password</Label>
                      <Input
                        autoComplete="new-password"
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="••••••••"
                        type="password"
                        value={field.state.value}
                      />
                      <p className="text-muted-foreground text-xs">
                        Use at least 8 characters for security
                      </p>
                      {field.state.meta.errors.map((error) => (
                        <p
                          className="text-destructive text-sm"
                          key={error?.message}
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Subscribe>
                {(state) => (
                  <Button
                    className="w-full text-white"
                    disabled={!state.canSubmit || state.isSubmitting}
                    size="lg"
                    style={{
                      backgroundColor: "var(--pdp-navy)",
                    }}
                    type="submit"
                  >
                    {state.isSubmitting
                      ? "Creating account..."
                      : "Create Account"}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
