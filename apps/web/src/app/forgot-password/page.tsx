"use client";

import { useForm } from "@tanstack/react-form";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import z from "zod";
import { CenteredSkeleton } from "@/components/loading";
import { PDPLogo } from "@/components/pdp-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function ForgotPasswordContent() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.requestPasswordReset({
          email: value.email,
          redirectTo: "/reset-password",
        });
      } catch {
        // Silently ignore — always show success to prevent account enumeration
      }
      setSubmitted(true);
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Please enter a valid email address"),
      }),
    },
  });

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
            PlayerARC
          </h1>
          <p className="mt-2 font-medium text-base sm:text-lg">
            Player Development System
          </p>
        </div>

        {/* Card */}
        <div className="space-y-5 rounded-lg border bg-card p-6 shadow-lg sm:p-8">
          <div className="text-center">
            <h2 className="font-bold text-2xl">Reset Password</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div
                className="rounded-lg border-2 p-4 text-center"
                style={{
                  borderColor: "rgba(var(--pdp-green-rgb), 0.3)",
                  background: "rgba(var(--pdp-green-rgb), 0.05)",
                }}
              >
                <p className="font-medium text-sm">
                  If an account with that email exists, you&apos;ll receive a
                  password reset link shortly.
                </p>
              </div>
              <p className="text-center text-muted-foreground text-sm">
                If you signed up with Google or Microsoft, try{" "}
                <a
                  className="font-medium hover:underline"
                  href="/login"
                  style={{ color: "var(--pdp-green)" }}
                >
                  signing in with your social account
                </a>{" "}
                instead.
              </p>
              <p className="text-center text-muted-foreground text-xs">
                Didn&apos;t receive an email? Check your spam folder or{" "}
                <button
                  className="font-medium hover:underline"
                  onClick={() => setSubmitted(false)}
                  style={{ color: "var(--pdp-green)" }}
                  type="button"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
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

              <form.Subscribe>
                {(state) => (
                  <Button
                    className="w-full text-white"
                    disabled={!state.canSubmit || state.isSubmitting}
                    size="lg"
                    style={{ backgroundColor: "var(--pdp-navy)" }}
                    type="submit"
                  >
                    {state.isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          )}

          <div className="text-center">
            <a
              className="text-sm hover:underline"
              href="/login"
              style={{ color: "var(--pdp-green)" }}
            >
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedRedirect() {
  const router = useRouter();
  router.push("/orgs/current" as Route);
  return <CenteredSkeleton />;
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<CenteredSkeleton />}>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <Unauthenticated>
        <ForgotPasswordContent />
      </Unauthenticated>
      <AuthLoading>
        <CenteredSkeleton />
      </AuthLoading>
    </Suspense>
  );
}
