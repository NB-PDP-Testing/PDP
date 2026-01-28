"use client";

/**
 * OnboardingErrorBoundary - Error boundary for onboarding components
 *
 * Catches React errors in onboarding step components and displays
 * a user-friendly error message with retry option.
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

type OnboardingErrorBoundaryProps = {
  children: ReactNode;
  onRetry?: () => void;
};

type OnboardingErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Error boundary component for onboarding steps
 *
 * Wraps onboarding step components to catch rendering errors
 * and provide a user-friendly fallback UI.
 */
export class OnboardingErrorBoundary extends Component<
  OnboardingErrorBoundaryProps,
  OnboardingErrorBoundaryState
> {
  constructor(props: OnboardingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): OnboardingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging/monitoring
    console.error("Onboarding error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // TODO: Send to error tracking service (e.g., Sentry, PostHog)
    // Example: posthog.captureException(error, { componentStack: errorInfo.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          aria-labelledby="error-title"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="alert"
        >
          <Card className="mx-4 max-w-md">
            <CardHeader className="pb-2">
              <div className="mb-2 flex items-center gap-2 text-destructive">
                <AlertCircle aria-hidden="true" className="size-6" />
                <h2 className="font-semibold text-lg" id="error-title">
                  Something went wrong
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We encountered an issue during setup. Please try again.
              </p>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-muted-foreground text-xs">
                    Error details (dev only)
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                    {this.state.error.message}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                onClick={this.handleReset}
                variant="default"
              >
                <RefreshCw aria-hidden="true" className="mr-2 size-4" />
                Try Again
              </Button>
              <Button asChild className="w-full sm:w-auto" variant="outline">
                <a href="mailto:support@playerarc.com">Contact Support</a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
