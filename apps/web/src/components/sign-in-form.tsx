import { useForm } from "@tanstack/react-form";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { PDPLogo } from "./pdp-logo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const GOOGLE_DOMAINS = ["gmail.com", "googlemail.com"];
const MICROSOFT_DOMAINS = [
  "outlook.com",
  "hotmail.com",
  "live.com",
  "outlook.ie",
];

function SignInFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const lastMethod = authClient.getLastUsedLoginMethod();
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkSending, setMagicLinkSending] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            const destination = (redirect || "/orgs/current") as Route;
            router.push(destination);
            toast.success("Welcome back! Let's get to work.");
          },
          onError: (error: {
            error: { message?: string; statusText?: string };
          }) => {
            toast.error(
              error.error.message ||
                error.error.statusText ||
                "Unable to sign in. Please check your credentials."
            );
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Please enter a valid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  const storeInvitationId = (redirectUrl: string | null) => {
    if (redirectUrl?.includes("/orgs/accept-invitation/")) {
      const invitationId = redirectUrl.split("/orgs/accept-invitation/")[1];
      if (invitationId) {
        sessionStorage.setItem("pendingInvitationId", invitationId);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      const callbackURL = redirect || "/orgs/current";
      storeInvitationId(redirect);

      await authClient.signIn.social(
        { provider: "google", callbackURL },
        {
          onError: (error: {
            error: { message?: string; statusText?: string };
          }) => {
            toast.error(
              error.error.message ||
                error.error.statusText ||
                "Unable to sign in with Google. Please try again."
            );
          },
        }
      );
    } catch (_error) {
      toast.error("Failed to initiate Google sign-in. Please try again.");
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      const callbackURL = redirect || "/orgs/current";
      storeInvitationId(redirect);

      await authClient.signIn.social(
        { provider: "microsoft", callbackURL },
        {
          onError: (error: {
            error: { message?: string; statusText?: string };
          }) => {
            toast.error(
              error.error.message ||
                error.error.statusText ||
                "Unable to sign in with Microsoft. Please try again."
            );
          },
        }
      );
    } catch (_error) {
      toast.error("Failed to initiate Microsoft sign-in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <a href="https://playerarc.io">
              <PDPLogo size="lg" />
            </a>
          </div>
          <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
            Welcome to PlayerARC
          </h1>
          <p className="mt-2 font-medium text-base sm:text-lg">
            Player Development System
          </p>
          <p
            className="mt-2 text-sm italic"
            style={{ color: "var(--pdp-green)" }}
          >
            "As many as possible, for as long as possible..."
          </p>
        </div>

        {/* Card Container */}
        <div className="space-y-5 rounded-lg border bg-card p-6 shadow-lg sm:p-8">
          {/* Sign In Header */}
          <div className="text-center">
            <h2 className="font-bold text-2xl">Sign In</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Access your PlayerARC account
            </p>
          </div>

          {/* Sign Up Link - Above Form */}
          <div
            className="rounded-lg border-2 p-4 text-center shadow-sm"
            style={{
              borderColor: "rgba(var(--pdp-green-rgb), 0.3)",
              background:
                "linear-gradient(to right, rgba(var(--pdp-green-rgb), 0.1), rgba(var(--pdp-green-rgb), 0.05))",
            }}
          >
            <p className="text-sm">
              <span className="text-muted-foreground">
                Don't have an account?{" "}
              </span>
              <a
                className="font-bold hover:underline"
                href={
                  redirect
                    ? `/signup?redirect=${encodeURIComponent(redirect)}`
                    : "/signup"
                }
                style={{ color: "var(--pdp-green)" }}
              >
                Sign up
              </a>
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <div className="relative">
              {lastMethod === "google" && (
                <span className="-top-2 -right-2 absolute z-10 inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
                  Last used
                </span>
              )}
              <Button
                className="w-full"
                onClick={signInWithGoogle}
                size="lg"
                variant={lastMethod === "google" ? "default" : "outline"}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <title>Google</title>
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
                Continue with Google
              </Button>
            </div>
            <div className="relative">
              {lastMethod === "microsoft" && (
                <span className="-top-2 -right-2 absolute z-10 inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
                  Last used
                </span>
              )}
              <Button
                className="w-full"
                onClick={signInWithMicrosoft}
                size="lg"
                variant={lastMethod === "microsoft" ? "default" : "outline"}
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="#00A4EF"
                  viewBox="0 0 24 24"
                >
                  <title>Microsoft</title>
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                </svg>
                Continue with Microsoft
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
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
              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email Address</Label>
                    <Input
                      autoComplete="email"
                      autoFocus
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

            {/* Email domain detection nudge */}
            <form.Subscribe selector={(state) => state.values.email}>
              {(email) => {
                const domain = email?.split("@")[1]?.toLowerCase();
                const isGoogle = GOOGLE_DOMAINS.includes(domain);
                const isMicrosoft = MICROSOFT_DOMAINS.includes(domain);
                if (!(isGoogle || isMicrosoft)) {
                  return null;
                }
                const providerName = isGoogle ? "Google" : "Microsoft";
                const handler = isGoogle
                  ? signInWithGoogle
                  : signInWithMicrosoft;
                return (
                  <div
                    className="rounded-lg border p-3 text-sm"
                    style={{
                      borderColor: "rgba(var(--pdp-green-rgb), 0.3)",
                      background: "rgba(var(--pdp-green-rgb), 0.05)",
                    }}
                  >
                    <p className="text-muted-foreground">
                      Looks like you have a {providerName} account — you can
                      sign in faster
                    </p>
                    <Button
                      className="mt-2 w-full"
                      onClick={handler}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Continue with {providerName}
                    </Button>
                  </div>
                );
              }}
            </form.Subscribe>

            <div>
              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.name}>Password</Label>
                      <a
                        className="text-sm hover:underline"
                        href="/forgot-password"
                        style={{ color: "var(--pdp-green)" }}
                      >
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      autoComplete="current-password"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      type="password"
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
                  {state.isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          {/* Magic Link Section */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">
                or sign in without a password
              </span>
            </div>
          </div>

          {magicLinkSent ? (
            <div
              className="rounded-lg border-2 p-4 text-center"
              style={{
                borderColor: "rgba(var(--pdp-green-rgb), 0.3)",
                background: "rgba(var(--pdp-green-rgb), 0.05)",
              }}
            >
              <p className="font-medium text-sm">
                Check your email for a sign-in link.
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                The link expires in 10 minutes.
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                placeholder="Email for magic link"
                type="email"
                value={magicLinkEmail}
              />
              <Button
                disabled={!magicLinkEmail.includes("@") || magicLinkSending}
                onClick={async () => {
                  setMagicLinkSending(true);
                  try {
                    await authClient.signIn.magicLink({
                      email: magicLinkEmail,
                      callbackURL: redirect || "/orgs/current",
                    });
                    setMagicLinkSent(true);
                  } catch {
                    toast.error("Failed to send magic link. Please try again.");
                  } finally {
                    setMagicLinkSending(false);
                  }
                }}
                size="default"
                type="button"
                variant="outline"
              >
                {magicLinkSending ? "Sending..." : "Send link"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignInForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <SignInFormContent />
    </Suspense>
  );
}
