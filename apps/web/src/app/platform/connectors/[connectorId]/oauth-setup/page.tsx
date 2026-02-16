"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OAuthSetupPage() {
  const params = useParams();
  const router = useRouter();
  const connectorId = params.connectorId as Id<"federationConnectors">;

  const [step, setStep] = useState<
    "initial" | "authorizing" | "success" | "error"
  >("initial");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Fetch connector data
  const connector = useQuery(api.models.federationConnectors.getConnector, {
    connectorId,
  });

  const startOAuth = useMutation(api.actions.federationAuth.startOAuthFlow);

  const handleStartAuthorization = async () => {
    if (!connector) {
      return;
    }

    try {
      setStep("authorizing");

      // Get the callback URL (must match what's registered in the federation app)
      const callbackUrl = `${window.location.origin}/platform/connectors/oauth-callback`;

      // Start OAuth flow
      const result = await startOAuth({
        connectorId,
        redirectUri: callbackUrl,
        scope: undefined, // Could be customizable in the future
      });

      // Store state in session storage so callback page can validate it
      sessionStorage.setItem("oauth_state", result.state);
      sessionStorage.setItem("oauth_connector_id", connectorId);

      // Open authorization URL in new window
      const authWindow = window.open(
        result.authorizationUrl,
        "oauth_authorization",
        "width=600,height=700,scrollbars=yes"
      );

      if (!authWindow) {
        throw new Error(
          "Failed to open authorization window. Please allow pop-ups for this site."
        );
      }

      // Listen for message from callback page
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === "oauth_success") {
          window.removeEventListener("message", handleMessage);
          setStep("success");
          toast.success("OAuth setup complete!");

          // Redirect to edit page after a short delay
          setTimeout(() => {
            router.push(`/platform/connectors/${connectorId}/edit`);
          }, 2000);
        } else if (event.data.type === "oauth_error") {
          window.removeEventListener("message", handleMessage);
          setStep("error");
          setErrorMessage(event.data.error || "Unknown error occurred");
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("Failed to start OAuth flow:", error);
      setStep("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start OAuth flow"
      );
    }
  };

  const handleRetry = () => {
    setStep("initial");
    setErrorMessage("");
  };

  if (connector === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connector === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Connector not found</p>
          <Button asChild className="mt-4">
            <Link href="/platform/connectors">Back to Connectors</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (connector.authType !== "oauth2") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            This connector is not configured for OAuth 2.0
          </p>
          <Button asChild className="mt-4">
            <Link href={`/platform/connectors/${connectorId}/edit`}>
              Back to Connector
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Link href={`/platform/connectors/${connectorId}/edit`}>
              <Button className="text-white/80" size="sm" variant="ghost">
                <ChevronDown className="mr-1 h-4 w-4 rotate-90" />
                Back to Connector
              </Button>
            </Link>
          </div>
          <h1 className="mb-4 font-bold text-4xl text-white tracking-tight">
            OAuth 2.0 Setup
          </h1>
          <p className="text-lg text-white/80">
            Authorize {connector.name} to access your federation data
          </p>
        </div>

        {/* Step 1: Initial */}
        {step === "initial" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connector Information</CardTitle>
                <CardDescription>
                  Review the connector details before authorizing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-medium text-sm">Connector Name:</span>
                  <p className="text-muted-foreground">{connector.name}</p>
                </div>
                <div>
                  <span className="font-medium text-sm">Federation Code:</span>
                  <p className="text-muted-foreground">
                    {connector.federationCode}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-sm">
                    Membership List URL:
                  </span>
                  <p className="text-muted-foreground">
                    {connector.endpoints.membershipList}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authorization Flow</CardTitle>
                <CardDescription>
                  What happens when you click "Start Authorization"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Open Authorization Page</p>
                    <p className="text-muted-foreground text-sm">
                      A new window will open to the federation's authorization
                      page
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Authorize Access</p>
                    <p className="text-muted-foreground text-sm">
                      Log in and grant permission to access your federation data
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Complete Setup</p>
                    <p className="text-muted-foreground text-sm">
                      Access token will be securely stored and encrypted
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Make sure pop-ups are allowed for this site. The authorization
                window must open successfully.
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              onClick={handleStartAuthorization}
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Start Authorization
            </Button>
          </div>
        )}

        {/* Step 2: Authorizing */}
        {step === "authorizing" && (
          <Card>
            <CardHeader>
              <CardTitle>Waiting for Authorization</CardTitle>
              <CardDescription>
                Complete the authorization in the popup window
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                <p className="text-center text-muted-foreground">
                  Waiting for you to authorize access in the popup window...
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Don't see the popup?</AlertTitle>
                <AlertDescription>
                  Check if your browser blocked the popup window. You may need
                  to allow pop-ups for this site and try again.
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                onClick={handleRetry}
                variant="outline"
              >
                Cancel and Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <Card>
            <CardHeader>
              <CardTitle>Authorization Complete!</CardTitle>
              <CardDescription>OAuth 2.0 setup was successful</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="mb-4 h-12 w-12 text-green-600" />
                <p className="text-center font-medium">
                  OAuth setup complete! Access token obtained and stored.
                </p>
                <p className="mt-2 text-center text-muted-foreground text-sm">
                  Redirecting to connector settings...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Error */}
        {step === "error" && (
          <Card>
            <CardHeader>
              <CardTitle>Authorization Failed</CardTitle>
              <CardDescription>
                An error occurred during the OAuth flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleRetry}>
                  Retry Authorization
                </Button>
                <Button asChild className="flex-1" variant="outline">
                  <Link href={`/platform/connectors/${connectorId}/edit`}>
                    Back to Connector
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
