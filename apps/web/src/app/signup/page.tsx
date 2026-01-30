"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
} from "convex/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { CenteredSkeleton } from "@/components/loading";
import SignUpForm from "@/components/sign-up-form";
import { useCurrentUser } from "@/hooks/use-current-user";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  return (
    <>
      <Authenticated>
        <RedirectToOrgs redirect={redirect} router={router} />
      </Authenticated>
      <Unauthenticated>
        <SignUpForm redirect={redirect} />
      </Unauthenticated>
      <AuthLoading>
        <CenteredSkeleton />
      </AuthLoading>
    </>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<CenteredSkeleton />}>
      <SignUpContent />
    </Suspense>
  );
}

function RedirectToOrgs({
  router,
  redirect,
}: {
  router: ReturnType<typeof useRouter>;
  redirect: string | null;
}) {
  const user = useCurrentUser();
  const [checkedFirstUser, setCheckedFirstUser] = useState(false);
  const autoAssignFirstUser = useMutation(
    api.models.users.autoAssignFirstUserAsPlatformStaff
  );
  const processPendingInvitation = useMutation(
    api.models.platformStaffInvitations.processPendingInvitation
  );

  useEffect(() => {
    const handleRedirect = async () => {
      if (!user?._id || checkedFirstUser) {
        return;
      }

      // Check if this is the first user (OAuth signup flow)
      try {
        const result = await autoAssignFirstUser({ userId: user._id });
        setCheckedFirstUser(true);

        if (result.wasFirstUser) {
          toast.success("🎉 Welcome! Let's set up your platform together.");
          router.push("/setup/welcome" as Route);
          return;
        }
      } catch (error) {
        console.error("Error checking first user:", error);
      }

      // Check if user has a pending platform staff invitation
      if (user.email) {
        try {
          const inviteResult = await processPendingInvitation({
            email: user.email,
            userId: user._id,
          });

          if (inviteResult.grantedStaffAccess) {
            toast.success(
              "🎉 Welcome to the platform staff team! You now have platform admin access."
            );
            router.push("/platform" as Route);
            return;
          }
        } catch (error) {
          console.error("Error processing platform staff invitation:", error);
        }
      }

      // Not the first user - proceed with normal redirect logic
      if (redirect) {
        router.push(redirect as Route);
      } else if (user?.isPlatformStaff) {
        router.push("/orgs" as Route);
      } else {
        router.push("/orgs/current" as Route);
      }
    };

    if (user) {
      handleRedirect();
    }
  }, [
    router,
    user,
    redirect,
    checkedFirstUser,
    autoAssignFirstUser,
    processPendingInvitation,
  ]);

  return <CenteredSkeleton />;
}
