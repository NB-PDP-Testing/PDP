"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import Header from "@/components/header";
import Loader from "@/components/loader";
import { useCurrentUser } from "@/hooks/use-current-user";

// todo generateMetadata

export default function OrgLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = useCurrentUser();

  useEffect(() => {
    if (user === null) {
      redirect("/login");
    }
  }, [user]);

  if (user) {
    return (
      <>
        <Header />
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
