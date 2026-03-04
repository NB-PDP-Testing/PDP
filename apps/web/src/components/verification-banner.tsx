"use client";

import { AlertTriangle, Loader2, Mail } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Persistent amber banner shown when user's email is not verified.
 * Non-dismissible — auto-disappears when emailVerified flips to true
 * (via reactive Convex subscription in CurrentUserProvider).
 */
export function EmailVerificationBanner({ email }: { email: string }) {
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isSending) {
      return;
    }
    setIsSending(true);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Verification email sent! Check your inbox.");
    } catch {
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [email, cooldown, isSending]);

  return (
    <div className="sticky top-0 z-50 border-amber-300 border-b bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">
            <span className="font-medium">Please verify your email.</span>{" "}
            <span className="text-amber-700 dark:text-amber-300">
              We sent a link to {email}
            </span>
          </p>
        </div>
        <Button
          className="h-8 gap-1.5 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800"
          disabled={cooldown > 0 || isSending}
          onClick={handleResend}
          size="sm"
          variant="outline"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          {cooldown > 0 && `Resend in ${cooldown}s`}
          {cooldown === 0 && (isSending ? "Sending..." : "Resend email")}
        </Button>
      </div>
    </div>
  );
}
