"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const completeOAuth = useMutation(
    api.actions.federationAuth.completeOAuthFlow
  );

  // Get stored state and connector ID from session storage
  const expectedState =
    typeof window !== "undefined"
      ? sessionStorage.getItem("oauth_state")
      : null;
  const connectorId =
    typeof window !== "undefined"
      ? sessionStorage.getItem("oauth_connector_id")
      : null;

  // Fetch connector to get OAuth configuration
  const connector = useQuery(
    api.models.federationConnectors.getConnector,
    connectorId
      ? { connectorId: connectorId as Id<"federationConnectors"> }
      : "skip"
  );

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Validate we have the required data
        if (!code) {
          throw new Error("Authorization code missing from callback");
        }

        if (!state) {
          throw new Error("State parameter missing from callback");
        }

        if (!expectedState) {
          throw new Error("Expected state not found in session storage");
        }

        if (!connectorId) {
          throw new Error("Connector ID not found in session storage");
        }

        // Validate state matches (CSRF protection)
        if (state !== expectedState) {
          throw new Error("Invalid state parameter - possible CSRF attack");
        }

        // Wait for connector data to load
        if (connector === undefined) {
          return; // Still loading
        }

        if (connector === null) {
          throw new Error("Connector not found");
        }

        // Get OAuth configuration from connector
        // Note: In a real implementation, these would come from the connector's encrypted credentials
        // For now, we'll use placeholder values that should be configured in the connector
        const tokenEndpoint =
          connector.endpoints.memberDetail || "https://oauth.example.com/token";
        const clientId = "placeholder_client_id"; // Should come from connector config
        const clientSecret = "placeholder_client_secret"; // Should come from connector config

        const callbackUrl = `${window.location.origin}/platform/connectors/oauth-callback`;

        // Complete OAuth flow
        await completeOAuth({
          connectorId: connectorId as Id<"federationConnectors">,
          code,
          state,
          expectedState,
          tokenEndpoint,
          redirectUri: callbackUrl,
          clientId,
          clientSecret,
        });

        // Clean up session storage
        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("oauth_connector_id");

        setStatus("success");

        // Notify parent window
        if (window.opener) {
          window.opener.postMessage(
            { type: "oauth_success" },
            window.location.origin
          );
          // Close popup after short delay
          setTimeout(() => {
            window.close();
          }, 1000);
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        const message =
          error instanceof Error ? error.message : "Unknown error occurred";
        setErrorMessage(message);
        setStatus("error");

        // Notify parent window of error
        if (window.opener) {
          window.opener.postMessage(
            { type: "oauth_error", error: message },
            window.location.origin
          );
          // Don't auto-close on error, let user see the message
        }
      }
    };

    processOAuthCallback();
  }, [code, state, expectedState, connectorId, connector, completeOAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#1E3A5F] to-white p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {status === "processing" && (
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <h2 className="mb-2 font-semibold text-xl">
              Completing authorization...
            </h2>
            <p className="text-muted-foreground text-sm">
              Please wait while we exchange your authorization code for an
              access token.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                aria-label="Success"
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Success icon</title>
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <h2 className="mb-2 font-semibold text-xl">Success!</h2>
            <p className="text-muted-foreground text-sm">
              Authorization complete. This window will close automatically.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                aria-label="Error"
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Error icon</title>
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <h2 className="mb-2 font-semibold text-xl">Authorization Failed</h2>
            <p className="mb-4 text-muted-foreground text-sm">{errorMessage}</p>
            <p className="text-muted-foreground text-xs">
              You can close this window and try again from the connector
              settings page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
