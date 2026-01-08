"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { PHProvider } from "@/providers/posthog-provider";
import { PendingInvitationsModal } from "./pending-invitations-modal";
import { ServiceWorkerProvider } from "./pwa/service-worker-provider";
import { ThemeProvider } from "./theme-provider";
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
        <ServiceWorkerProvider>
          <ConvexBetterAuthProvider authClient={authClient} client={convex}>
            {children}
            <PendingInvitationsModal />
          </ConvexBetterAuthProvider>
        </ServiceWorkerProvider>
        <Toaster richColors />
      </ThemeProvider>
    </PHProvider>
  );
}
