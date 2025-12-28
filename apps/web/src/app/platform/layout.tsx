"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useCurrentUser();

  // Redirect if not platform staff
  useEffect(() => {
    if (user !== undefined && !user?.isPlatformStaff) {
      toast.error("Only platform staff can access this area");
      router.push("/");
    }
  }, [user, router]);

  // Show loading while checking access
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

  return <>{children}</>;
}
