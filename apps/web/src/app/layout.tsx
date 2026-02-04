import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "../index.css";
import "../styles/phone-input.css";
import { SkipLink } from "@/components/accessibility";
import { FlowInterceptor } from "@/components/flow-interceptor";
// import { ParentActionsInterceptor } from "@/components/parent-actions-interceptor"; // DISABLED: Using Guardian Identity Claim Dialog instead
import { KeyboardShortcutsOverlay } from "@/components/polish/keyboard-shortcuts-overlay";
import { OfflineIndicator } from "@/components/polish/offline-indicator";
import { PWAInstallPrompt } from "@/components/polish/pwa-install-prompt";
import Providers from "@/components/providers";
import { PWAUpdatePrompt } from "@/components/pwa";
import { PostHogAuthTracker } from "@/providers/posthog-auth-tracker";
import { PostHogPageView } from "@/providers/posthog-pageview";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlayerArc - PlayerDevelopment Platform",
  description:
    "PlayerARC - A comprehensive digital ecosystem where parents and coaches collaborate to support and manage a child's sporting development.",
  icons: {
    icon: "/logos/icon.png",
    apple: "/logos/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlayerARC",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} overflow-x-hidden antialiased`}
      >
        <SkipLink targetId="main-content" />
        <Providers>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <PostHogAuthTracker />
          {/* <ParentActionsInterceptor /> DISABLED: Using Guardian Identity Claim Dialog instead */}
          <FlowInterceptor>
            <KeyboardShortcutsOverlay />
            <OfflineIndicator position="top" />
            <PWAInstallPrompt />
            <PWAUpdatePrompt />
            <div className="flex min-h-svh flex-col" id="main-content">
              {children}
            </div>
          </FlowInterceptor>
        </Providers>
      </body>
    </html>
  );
}
