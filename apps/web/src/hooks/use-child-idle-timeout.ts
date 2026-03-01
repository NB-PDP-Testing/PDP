"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2-minute warning before sign-out

/**
 * UK Children's Code compliance: automatically sign out child accounts
 * after 60 minutes of inactivity.
 *
 * Only activates when isChildAccount is true (playerType !== "adult").
 * Resets on any user interaction event.
 */
export function useChildIdleTimeout(isChildAccount: boolean) {
  const router = useRouter();
  const warningToastId = useRef<string | number | undefined>(undefined);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isChildAccount) {
      return;
    }

    function clearTimers() {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      if (signOutTimerRef.current) {
        clearTimeout(signOutTimerRef.current);
        signOutTimerRef.current = null;
      }
      if (warningToastId.current !== undefined) {
        toast.dismiss(warningToastId.current);
        warningToastId.current = undefined;
      }
    }

    function resetTimers() {
      clearTimers();

      warningTimerRef.current = setTimeout(() => {
        warningToastId.current = toast.warning(
          "You will be signed out in 2 minutes due to inactivity.",
          { duration: WARNING_BEFORE_MS }
        );
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

      signOutTimerRef.current = setTimeout(async () => {
        clearTimers();
        await authClient.signOut();
        router.replace("/login?reason=session_timeout");
      }, IDLE_TIMEOUT_MS);
    }

    const events = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
    ] as const;

    function handleActivity() {
      resetTimers();
    }

    for (const event of events) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    // Start timers immediately
    resetTimers();

    return () => {
      clearTimers();
      for (const event of events) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [isChildAccount, router]);
}
