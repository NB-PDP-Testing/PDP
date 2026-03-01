import { toast } from "sonner";
import { useCurrentUser } from "./use-current-user";

/**
 * Hook for feature gating behind email verification.
 *
 * Returns `isVerified` boolean and `requireVerification()` function.
 * Call `requireVerification()` at the point of action (button click handlers).
 * It shows a toast if unverified and returns false, otherwise returns true.
 *
 * Usage:
 *   const { isVerified, requireVerification } = useRequireVerified();
 *   const handleInvite = () => {
 *     if (!requireVerification()) return;
 *     // ... proceed with invite
 *   };
 */
export function useRequireVerified() {
  const user = useCurrentUser();
  const isVerified = user?.emailVerified ?? false;

  const requireVerification = (): boolean => {
    if (isVerified) {
      return true;
    }
    toast.error("Please verify your email first", {
      description:
        "Check your inbox for a verification link, or use the banner at the top of the page to resend.",
    });
    return false;
  };

  return { isVerified, requireVerification };
}
