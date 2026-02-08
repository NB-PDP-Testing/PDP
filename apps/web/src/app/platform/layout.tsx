"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import Header from "@/components/header";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

function PlatformLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useCurrentUser();

  // Inside <Authenticated>, auth is confirmed.
  // user goes: undefined (Convex loading) → object (loaded)
  // No null ambiguity — null here means genuinely no user record.
  useEffect(() => {
    if (user !== undefined && user !== null && !user.isPlatformStaff) {
      toast.error("Only platform staff can access this area");
      router.push("/");
    }
  }, [user, router]);

  // Convex user data still loading (auth is already confirmed)
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Don't render if not platform staff
  if (!user?.isPlatformStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="font-bold text-2xl">Access Denied</h1>
          <p className="text-muted-foreground">
            Only platform staff can access this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Authenticated>
        <PlatformLayoutInner>{children}</PlatformLayoutInner>
      </Authenticated>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="font-bold text-2xl">Access Denied</h1>
            <p className="text-muted-foreground">
              Please sign in to access the platform area.
            </p>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}
