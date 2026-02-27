"use client";

import { useForm } from "@tanstack/react-form";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { CenteredSkeleton } from "@/components/loading";
import { PDPLogo } from "@/components/pdp-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const [resetComplete, setResetComplete] = useState(false);

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (!token) {
        toast.error("Invalid reset link. Please request a new one.");
        return;
      }
      if (value.password !== value.confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }

      const result = await authClient.resetPassword({
        newPassword: value.password,
        token,
      });

      if (result.error) {
        toast.error(
          result.error.message ||
            "Failed to reset password. The link may have expired."
        );
        return;
      }

      setResetComplete(true);
      toast.success("Password reset successfully!");
    },
    validators: {
      onSubmit: z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(8, "Please confirm your password"),
      }),
    },
  });

  // Error state — invalid or expired token
  if (error || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <a href="https://playerarc.io">
                <PDPLogo size="lg" />
              </a>
            </div>
            <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
              PlayerARC
            </h1>
          </div>
          <div className="space-y-5 rounded-lg border bg-card p-6 shadow-lg sm:p-8">
            <div className="text-center">
              <h2 className="font-bold text-2xl">Link Expired</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                This password reset link is invalid or has expired.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full text-white"
                onClick={() => router.push("/forgot-password" as Route)}
                size="lg"
                style={{ backgroundColor: "var(--pdp-navy)" }}
              >
                Request New Reset Link
              </Button>
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
      </div>
    );
  }

  // Success state
  if (resetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <a href="https://playerarc.io">
                <PDPLogo size="lg" />
              </a>
            </div>
            <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
              PlayerARC
            </h1>
          </div>
          <div className="space-y-5 rounded-lg border bg-card p-6 shadow-lg sm:p-8">
            <div className="text-center">
              <h2 className="font-bold text-2xl">Password Reset</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Your password has been updated successfully.
              </p>
            </div>
            <Button
              className="w-full text-white"
              onClick={() => router.push("/login" as Route)}
              size="lg"
              style={{ backgroundColor: "var(--pdp-navy)" }}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
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

        <div className="space-y-5 rounded-lg border bg-card p-6 shadow-lg sm:p-8">
          <div className="text-center">
            <h2 className="font-bold text-2xl">Set New Password</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Choose a new password for your account
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>New Password</Label>
                  <Input
                    autoComplete="new-password"
                    autoFocus
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="At least 8 characters"
                    type="password"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((validationError) => (
                    <p
                      className="text-destructive text-sm"
                      key={validationError?.message}
                    >
                      {validationError?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Confirm Password</Label>
                  <Input
                    autoComplete="new-password"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Confirm your password"
                    type="password"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.map((validationError) => (
                    <p
                      className="text-destructive text-sm"
                      key={validationError?.message}
                    >
                      {validationError?.message}
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
                  {state.isSubmitting ? "Resetting..." : "Reset Password"}
                </Button>
              )}
            </form.Subscribe>
          </form>

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<CenteredSkeleton />}>
      <Authenticated>
        <AuthenticatedRedirect />
      </Authenticated>
      <Unauthenticated>
        <ResetPasswordContent />
      </Unauthenticated>
      <AuthLoading>
        <CenteredSkeleton />
      </AuthLoading>
    </Suspense>
  );
}
