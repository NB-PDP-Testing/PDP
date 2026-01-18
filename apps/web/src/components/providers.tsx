"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { PHProvider } from "@/providers/posthog-provider";
import { AnnouncerProvider } from "./accessibility/live-region";
import { PendingInvitationsModal } from "./pending-invitations-modal";
import { DensityProvider } from "./polish/density-toggle";
import { ServiceWorkerProvider } from "./pwa/service-worker-provider";
import { ThemeProvider } from "./theme-provider";
import { ThemeTransitionManager } from "./theme-transition-manager";
import { Toaster } from "./ui/sonner";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <DensityProvider defaultDensity="comfortable" persist>
          <AnnouncerProvider>
            <ServiceWorkerProvider>
              <ConvexBetterAuthProvider authClient={authClient} client={convex}>
                <ThemeTransitionManager />
                {children}
                <PendingInvitationsModal />
              </ConvexBetterAuthProvider>
            </ServiceWorkerProvider>
          </AnnouncerProvider>
        </DensityProvider>
        <Toaster duration={3000} richColors />
      </ThemeProvider>
    </PHProvider>
  );
}
