"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const invitationId = params.invitationId as string;
  const [status, setStatus] = useState<
    "loading" | "checking" | "mismatch" | "success" | "error" | "idle"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Use the session hook for better React integration
  const { data: session } = authClient.useSession();

  // Fetch invitation details
  const invitation = useQuery(
    api.models.members.getInvitationById,
    invitationId ? { invitationId } : "skip"
  );

  useEffect(() => {
    console.log("[AcceptInvitation] ===== PAGE MOUNTED =====");
    console.log("[AcceptInvitation] Invitation ID from params:", invitationId);
    console.log(
      "[AcceptInvitation] Current URL:",
      typeof window !== "undefined" ? window.location.href : "SSR"
    );

    if (!invitationId) {
      console.error("[AcceptInvitation] No invitation ID found in URL params");
      setStatus("error");
      setErrorMessage("Invalid invitation link");
      return;
    }

    // Store invitation ID in sessionStorage immediately when page loads
    // This ensures it's preserved through OAuth flow even if redirect doesn't work
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pendingInvitationId", invitationId);
      console.log(
        "[AcceptInvitation] ✅ Stored invitation ID in sessionStorage:",
        invitationId
      );
    }

    const checkAndAcceptInvitation = async () => {
      try {
        console.log("[AcceptInvitation] ===== STARTING INVITATION CHECK =====");
        console.log("[AcceptInvitation] Invitation ID from URL:", invitationId);
        console.log("[AcceptInvitation] Page loaded, checking session...");

        // Check if user is logged in
        const session = await authClient.getSession();
        console.log("[AcceptInvitation] Raw session object:", session);
        console.log("[AcceptInvitation] Session check result:", {
          hasSession: !!session,
          isObject: typeof session === "object",
          hasError:
            session && typeof session === "object" && "error" in session,
          hasData: session && typeof session === "object" && "data" in session,
          keys:
            session && typeof session === "object" ? Object.keys(session) : [],
        });

        // Better Auth getSession can return different structures
        // Check for error first
        if (session && typeof session === "object" && "error" in session) {
          console.log(
            "[AcceptInvitation] Session has error, redirecting to login"
          );
          router.push(
            `/login?redirect=/orgs/accept-invitation/${invitationId}`
          );
          return;
        }

        // Check if session has data property (Better Auth structure)
        let sessionData: { user?: { email: string } } | undefined;
        if (session && typeof session === "object" && "data" in session) {
          sessionData = (session as { data?: { user?: { email: string } } })
            .data;
        } else if (
          session &&
          typeof session === "object" &&
          "user" in session
        ) {
          // Some Better Auth versions return session directly with user
          sessionData = session as { user?: { email: string } };
        }

        if (!sessionData?.user) {
          console.log(
            "[AcceptInvitation] No user in session data, redirecting to login"
          );
          // Redirect to login with return URL
          router.push(
            `/login?redirect=/orgs/accept-invitation/${invitationId}`
          );
          return;
        }

        const userEmail = sessionData.user.email;
        setCurrentUserEmail(userEmail);

        // Wait for invitation details to load
        if (invitation === undefined) {
          console.log(
            "[AcceptInvitation] ⏳ Waiting for invitation details to load from Convex..."
          );
          setStatus("checking");
          return;
        }

        // Check if invitation exists
        if (invitation === null) {
          console.error(
            "[AcceptInvitation] ❌ Invitation not found in database:",
            invitationId
          );
          console.error("[AcceptInvitation] This could mean:");
          console.error("  - Invitation ID is invalid");
          console.error("  - Invitation was deleted");
          console.error("  - Database query failed");
          setStatus("error");
          setErrorMessage("Invitation not found or has expired");
          return;
        }

        console.log("[AcceptInvitation] Invitation loaded:", {
          id: invitation._id,
          email: invitation.email,
          status: invitation.status,
          organizationId: invitation.organizationId,
        });

        // Check if user is already a member of this organization
        // If so, just redirect to the organization (invitation might have been accepted in another tab/session)
        try {
          const userOrgs = await authClient.organization.list();
          const isAlreadyMember = userOrgs.data?.some(
            (org) => org.id === invitation.organizationId
          );

          if (isAlreadyMember) {
            console.log(
              "[AcceptInvitation] User is already a member, redirecting to org..."
            );
            // Clear sessionStorage
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("pendingInvitationId");
            }
            // Set as active and redirect
            await authClient.organization.setActive({
              organizationId: invitation.organizationId,
            });
            router.push(`/orgs/${invitation.organizationId}` as Route);
            return;
          }
        } catch (error) {
          console.error("[AcceptInvitation] Error checking membership:", error);
          // Continue to try accepting invitation
        }

        // Check if invitation is expired
        if (invitation.isExpired) {
          setStatus("error");
          setErrorMessage(
            "This invitation has expired. Please request a new invitation."
          );
          return;
        }

        // Check if invitation is already accepted/cancelled
        if (invitation.status !== "pending") {
          // If already accepted, check if user is a member and redirect to org
          if (invitation.status === "accepted") {
            console.log(
              "[AcceptInvitation] Invitation already accepted, checking membership..."
            );
            // Try to set the organization as active and redirect
            try {
              await authClient.organization.setActive({
                organizationId: invitation.organizationId,
              });
              // Clear sessionStorage
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("pendingInvitationId");
              }
              // Redirect to the organization
              router.push(`/orgs/${invitation.organizationId}` as Route);
              return;
            } catch (error) {
              console.error(
                "[AcceptInvitation] Error setting active org:",
                error
              );
              // Fall through to show error
            }
          }
          setStatus("error");
          setErrorMessage(
            `This invitation has already been ${invitation.status}.`
          );
          return;
        }

        // Pre-check: Compare emails (case-insensitive)
        const invitationEmail = invitation.email.toLowerCase();
        const loggedInEmail = userEmail.toLowerCase();

        console.log("[AcceptInvitation] Email comparison:", {
          invitationEmail,
          loggedInEmail,
          match: invitationEmail === loggedInEmail,
        });

        if (invitationEmail !== loggedInEmail) {
          console.warn("[AcceptInvitation] ⚠️ Email mismatch detected");
          // Emails don't match - show warning
          setStatus("mismatch");
          return;
        }

        console.log(
          "[AcceptInvitation] ✅ Emails match, proceeding with acceptance"
        );
        // Emails match - proceed with acceptance
        await acceptInvitation(userEmail);
      } catch (error: any) {
        setStatus("error");
        setErrorMessage(
          error.message || "An error occurred while processing the invitation"
        );
      }
    };

    checkAndAcceptInvitation();
  }, [invitationId, router, invitation, session]);

  const acceptInvitation = async (userEmail: string) => {
    try {
      setStatus("loading");
      console.log("Attempting to accept invitation:", invitationId);
      console.log("Current user email:", userEmail);
      console.log("Invitation email:", invitation?.email);

      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });

      console.log("Invitation acceptance result:", result);

      if (result.error) {
        console.error("Invitation acceptance error:", result.error);
        setStatus("error");

        // Check if error is likely due to email mismatch
        const errorMessage = result.error.message || "";
        const isEmailMismatch =
          errorMessage.toLowerCase().includes("email") ||
          errorMessage.toLowerCase().includes("match") ||
          errorMessage.toLowerCase().includes("invitation") ||
          errorMessage.toLowerCase().includes("not found");

        if (isEmailMismatch) {
          setErrorMessage(
            "This invitation was sent to a different email address. " +
              `You're currently signed in as ${userEmail}. ` +
              "Please sign out and sign in with the email address that received the invitation."
          );
        } else {
          setErrorMessage(errorMessage || "Failed to accept invitation");
        }
      } else {
        setStatus("success");

        // Get the organization ID from the result
        const organizationId = result.data?.invitation?.organizationId;

        // Clear pending invitation from sessionStorage since we've accepted it
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("pendingInvitationId");
        }

        if (organizationId) {
          // Set the organization as active before redirecting
          // This ensures the user sees the correct organization context
          try {
            await authClient.organization.setActive({ organizationId });
            console.log("Organization set as active:", organizationId);
          } catch (error) {
            console.error("Error setting active organization:", error);
            // Continue with redirect even if setting active fails
          }

          // Redirect to the organization dashboard after a short delay
          setTimeout(() => {
            router.push(`/orgs/${organizationId}`);
          }, 2000);
        } else {
          // Fallback: redirect to organizations list
          setTimeout(() => {
            router.push("/orgs");
          }, 2000);
        }
      }
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(
        error.message || "An error occurred while accepting the invitation"
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
              <CardTitle>Accepting Invitation...</CardTitle>
              <CardDescription>
                Please wait while we process your invitation
              </CardDescription>
            </>
          )}

          {status === "checking" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
              <CardTitle>Checking Invitation...</CardTitle>
              <CardDescription>Verifying invitation details</CardDescription>
            </>
          )}

          {status === "mismatch" && invitation && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-10 w-10 text-amber-600" />
              </div>
              <CardTitle className="text-amber-600">Email Mismatch</CardTitle>
              <CardDescription>
                This invitation was sent to a different email address.
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-green-600">
                Invitation Accepted!
              </CardTitle>
              <CardDescription>
                You've successfully joined the organization. Redirecting...
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Invitation Error</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === "mismatch" && invitation && (
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Email Address Mismatch</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">
                  This invitation was sent to:{" "}
                  <strong>{invitation.email}</strong>
                </p>
                <p>
                  You're currently signed in as:{" "}
                  <strong>{currentUserEmail}</strong>
                </p>
              </AlertDescription>
            </Alert>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-amber-900 text-sm">
                To accept this invitation, you need to sign in with the email
                address that received the invitation.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                await authClient.signOut();
                router.push(
                  `/login?redirect=/orgs/accept-invitation/${invitationId}`
                );
              }}
              variant="default"
            >
              Sign Out and Sign In with {invitation.email}
            </Button>
            <Button
              className="w-full"
              onClick={() => router.push("/orgs")}
              variant="outline"
            >
              Go to Organizations
            </Button>
          </CardContent>
        )}

        {status === "error" && (
          <CardContent className="space-y-4">
            {errorMessage.includes("different email address") && (
              <Button
                className="w-full"
                onClick={async () => {
                  await authClient.signOut();
                  router.push(
                    `/login?redirect=/orgs/accept-invitation/${invitationId}`
                  );
                }}
                variant="default"
              >
                Sign Out and Sign In with Correct Email
              </Button>
            )}
            <Button
              className="w-full"
              onClick={() => router.push("/orgs")}
              variant="outline"
            >
              Go to Organizations
            </Button>
            <Button
              className="w-full"
              onClick={() => router.push("/login")}
              variant="outline"
            >
              Sign In
            </Button>
          </CardContent>
        )}

        {status === "checking" && invitation && (
          <CardContent>
            <div className="space-y-3 text-center">
              <p className="text-muted-foreground text-sm">
                Invitation for: <strong>{invitation.email}</strong>
              </p>
              {invitation.organizationName && (
                <p className="text-muted-foreground text-sm">
                  Organization: <strong>{invitation.organizationName}</strong>
                </p>
              )}
              {invitation.role && (
                <p className="text-muted-foreground text-sm">
                  Role:{" "}
                  <strong className="capitalize">{invitation.role}</strong>
                </p>
              )}
            </div>
          </CardContent>
        )}

        {status === "loading" && invitation && (
          <CardContent>
            <div className="space-y-3 text-center">
              <p className="text-muted-foreground text-sm">
                Accepting invitation for: <strong>{invitation.email}</strong>
              </p>
              {invitation.organizationName && (
                <p className="text-muted-foreground text-sm">
                  Joining: <strong>{invitation.organizationName}</strong>
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
