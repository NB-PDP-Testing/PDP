"use client";
import { Authenticated, Unauthenticated } from "convex/react";
import { Building2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { OrgSelector } from "./org-selector";
import UserMenu from "./user-menu";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  colors?: string[];
}

export default function Header() {
  const params = useParams();
  const orgId = params?.orgId as string | undefined;
  const [org, setOrg] = useState<Organization | null>(null);

  useEffect(() => {
    if (!orgId) {
      setOrg(null);
      return;
    }

    const loadOrg = async () => {
      try {
        const { data } = await authClient.organization.getFullOrganization({
          organizationId: orgId,
        });
        if (data) {
          setOrg(data as Organization);
        }
      } catch (error) {
        console.error("Error loading organization:", error);
      }
    };
    loadOrg();
  }, [orgId]);

  // Get primary club color (default to green if not set)
  const primaryColor = org?.colors?.[0] || "#16a34a";
  const headerBackgroundStyle = orgId
    ? {
        backgroundColor: primaryColor,
      }
    : {};

  // separating this so it doesn't affect other controls (like the org toggle)
  const headerTextStyle = orgId ? "text-white" : "";

  return (
    <div>
      <div
        className="flex flex-row items-center justify-between px-2 py-1"
        style={headerBackgroundStyle}
      >
        {/* Left side - Org logo and nav */}
        <div className={cn("flex items-center gap-4", headerTextStyle)}>
          {org && (
            <Link
              className="flex items-center gap-2 font-semibold"
              href={`/orgs/${orgId}` as Route}
            >
              {org.logo ? (
                <img
                  alt={org.name}
                  className="h-8 w-8 rounded object-contain"
                  src={org.logo}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <span className="hidden sm:inline">{org.name}</span>
            </Link>
          )}
          <nav className="flex gap-4 text-lg">
            <Link href="/">Home</Link>
            <Authenticated>
              <Link href="/orgs">Organizations</Link>
            </Authenticated>
            <Unauthenticated>
              <Link href={"/login" as Route}>Login</Link>
            </Unauthenticated>
          </nav>
        </div>

        {/* Right side - User controls */}
        <div className="flex items-center gap-2">
          <Authenticated>
            <OrgSelector />
            <UserMenu />
          </Authenticated>
          <ModeToggle />
        </div>
      </div>
      <hr />
    </div>
  );
}
