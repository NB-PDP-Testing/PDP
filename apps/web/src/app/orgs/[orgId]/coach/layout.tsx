"use client";

import { useOrgTheme } from "@/hooks/use-org-theme";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Apply organization theme colors
  useOrgTheme();

  return <div className="container mx-auto px-4 py-6">{children}</div>;
}
