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
import Loader from "@/components/loader";
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
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<Loader />}>
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
  }, [router, user, redirect, checkedFirstUser, autoAssignFirstUser]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
