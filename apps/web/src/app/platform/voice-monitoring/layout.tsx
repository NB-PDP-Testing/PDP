"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "/platform/voice-monitoring" },
  { label: "Artifacts", href: "/platform/voice-monitoring/artifacts" },
  { label: "Metrics", href: "/platform/voice-monitoring/metrics" },
  { label: "Events", href: "/platform/voice-monitoring/events" },
  { label: "Pipeline", href: "/platform/voice-monitoring/pipeline" },
  { label: "Alerts", href: "/platform/voice-monitoring/alerts" },
  { label: "Settings", href: "/platform/voice-monitoring/settings" },
] as const;

export default function VoiceMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();

  // Defense-in-depth: redirect if not platform staff
  // (Parent /platform/layout.tsx already checks, but verify here too)
  useEffect(() => {
    if (user !== undefined && user !== null && !user.isPlatformStaff) {
      router.push("/platform");
    }
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/platform/voice-monitoring") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b bg-background px-4 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/platform">Platform</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Voice Monitoring</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Tab Navigation */}
      <nav className="overflow-x-auto border-b bg-background">
        <div className="flex min-w-max gap-1 px-4">
          {TABS.map((tab) => (
            <Link
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-2.5 font-medium text-sm transition-colors",
                isActive(tab.href)
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
              )}
              href={tab.href as any}
              key={tab.href}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}
