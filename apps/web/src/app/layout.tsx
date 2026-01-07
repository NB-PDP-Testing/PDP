import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "../index.css";
import { FlowInterceptor } from "@/components/flow-interceptor";
import Providers from "@/components/providers";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <Providers>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <PostHogAuthTracker />
          <FlowInterceptor>
            <div className="grid h-svh grid-rows-[auto_1fr]">{children}</div>
          </FlowInterceptor>
        </Providers>
      </body>
    </html>
  );
}
