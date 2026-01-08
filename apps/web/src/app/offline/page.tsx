"use client";

import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Offline page - shown when user is offline and page is not cached
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-12 text-center">
      {/* Icon */}
      <div className="mb-6 rounded-full bg-yellow-100 p-6 dark:bg-yellow-900/20">
        <WifiOff className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
      </div>

      {/* Heading */}
      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        You&apos;re offline
      </h1>

      {/* Description */}
      <p className="mb-8 max-w-md text-muted-foreground">
        It looks like you&apos;ve lost your internet connection. Some features
        may not be available until you&apos;re back online.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>

      {/* Tips */}
      <div className="mt-12 max-w-md rounded-lg border bg-muted/50 p-4 text-left">
        <h2 className="mb-2 font-semibold">While you&apos;re offline, you can:</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            View previously loaded pages from cache
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Review your notes and saved data
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            Check your connection and try again
          </li>
        </ul>
      </div>

      {/* Status indicator */}
      <div className="mt-8 text-xs text-muted-foreground">
        Waiting for connection...
        <span className="ml-2 inline-flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
        </span>
      </div>
    </div>
  );
}
