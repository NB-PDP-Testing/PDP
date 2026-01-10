"use client";

import { ErrorBoundaryFallback } from "@/components/error-boundary-fallback";

export default function PlayerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} />;
}
