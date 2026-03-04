"use client";

import { CheckCircle, XCircle } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CenteredSkeleton } from "@/components/loading";
import { PDPLogo } from "@/components/pdp-logo";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendEmail, setResendEmail] = useState("");

  // Auto-redirect on success after 2 seconds
  useEffect(() => {
    if (!error) {
      const timer = setTimeout(() => {
        router.push("/orgs/current" as Route);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [error, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) {
      return;
    }
    if (!resendEmail) {
      toast.error("Please enter your email address");
      return;
    }
    try {
      await authClient.sendVerificationEmail({
        email: resendEmail,
        callbackURL: "/verify-email",
      });
      setResendCooldown(60);
      toast.success("Verification email sent! Check your inbox.");
    } catch {
      toast.error("Failed to send verification email. Please try again.");
    }
  }, [resendEmail, resendCooldown]);

  // Error state — expired or invalid token
  if (error) {
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="font-bold text-2xl">Link Expired</h2>
              <p className="mt-2 text-muted-foreground text-sm">
                This verification link is invalid or has expired.
              </p>
            </div>
            <div className="space-y-3">
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Enter your email address"
                type="email"
                value={resendEmail}
              />
              <Button
                className="w-full text-white"
                disabled={resendCooldown > 0 || !resendEmail}
                onClick={handleResend}
                size="lg"
                style={{ backgroundColor: "var(--pdp-navy)" }}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend Verification Email"}
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

  // Success state — email verified
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="font-bold text-2xl">Email Verified!</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              Your email has been verified successfully. Redirecting...
            </p>
          </div>
          <Button
            className="w-full text-white"
            onClick={() => router.push("/orgs/current" as Route)}
            size="lg"
            style={{ backgroundColor: "var(--pdp-navy)" }}
          >
            Continue to App
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<CenteredSkeleton />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
