"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
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

  // Mutation to sync functional roles from invitation metadata
  const syncFunctionalRolesFromInvitation = useMutation(
    api.models.members.syncFunctionalRolesFromInvitation
  );

  // Timeout protection: if page is stuck loading for >15 seconds, show error
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status === "loading" || status === "checking") {
        console.error(
          "[AcceptInvitation] ❌ TIMEOUT: Page stuck in",
          status,
          "state for >15 seconds"
        );
        console.error(
          "[AcceptInvitation] Session state:",
          session === undefined
            ? "undefined"
            : session === null
              ? "null"
              : "loaded"
        );
        console.error(
          "[AcceptInvitation] Invitation state:",
          invitation === undefined
            ? "undefined"
            : invitation === null
              ? "null"
              : "loaded"
        );
        setStatus("error");
        setErrorMessage(
          "The invitation is taking too long to load. Please check your internet connection and try refreshing the page. If the problem persists, contact support."
        );
      }
    }, 15_000); // 15 seconds

    return () => clearTimeout(timeout);
  }, [status, session, invitation]);

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
        console.log("[AcceptInvitation] Raw session from hook:", session);
        console.log("[AcceptInvitation] Session type:", typeof session);
        console.log(
          "[AcceptInvitation] Session keys:",
          session ? Object.keys(session) : "null/undefined"
        );

        // Wait for session to load (it might be undefined initially)
        if (session === undefined) {
          console.log("[AcceptInvitation] ⏳ Session still loading...");
          setStatus("checking");
          return;
        }

        // Check if session is null or has error
        if (!session || (typeof session === "object" && "error" in session)) {
          console.log(
            "[AcceptInvitation] ❌ No valid session, redirecting to login"
          );
          // Redirect to login with return URL
          router.push(
            `/login?redirect=/orgs/accept-invitation/${invitationId}`
          );
          return;
        }

        // Extract user email from session
        // Better Auth useSession returns { user: { email, id, ... }, session: {...} }
        const userEmail = session?.user?.email;

        if (!userEmail) {
          console.log(
            "[AcceptInvitation] ❌ No user email in session, redirecting to login"
          );
          console.log(
            "[AcceptInvitation] Session structure:",
            JSON.stringify(session, null, 2)
          );
          router.push(
            `/login?redirect=/orgs/accept-invitation/${invitationId}`
          );
          return;
        }

        console.log("[AcceptInvitation] ✅ User is logged in:", userEmail);
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
            (org: { id: string }) => org.id === invitation.organizationId
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
  }, [invitationId, router, invitation, session, acceptInvitation]);

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
        const apiErrorMessage = result.error.message || "";
        const isEmailMismatch =
          apiErrorMessage.toLowerCase().includes("email") ||
          apiErrorMessage.toLowerCase().includes("match") ||
          apiErrorMessage.toLowerCase().includes("invitation") ||
          apiErrorMessage.toLowerCase().includes("not found");

        if (isEmailMismatch) {
          setErrorMessage(
            "This invitation was sent to a different email address. " +
              `You're currently signed in as ${userEmail}. ` +
              "Please sign out and sign in with the email address that received the invitation."
          );
        } else {
          setErrorMessage(apiErrorMessage || "Failed to accept invitation");
        }
      } else {
        setStatus("success");

        // Get the organization ID from the result
        const organizationId = result.data?.invitation?.organizationId;

        // Clear pending invitation from sessionStorage since we've accepted it
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("pendingInvitationId");
        }

        if (organizationId && session?.user?.id && session?.user?.email) {
          // Sync functional roles from invitation metadata
          // This handles:
          // - Suggested functional roles from invitation metadata (coach, parent, admin)
          // - Coach team assignments if specified
          // - Parent-player links if specified
          // Note: Auto-mapping Better Auth "admin"/"owner" → functional "admin" is done in beforeAddMember hook
          let syncSucceeded = false;
          try {
            console.log("[AcceptInvitation] Starting role sync with:", {
              invitationId,
              organizationId,
              userId: session.user.id,
              userEmail: session.user.email,
            });

            const syncResult = await syncFunctionalRolesFromInvitation({
              invitationId,
              organizationId,
              userId: session.user.id,
              userEmail: session.user.email,
            });

            console.log("[AcceptInvitation] ✅ Sync completed!");
            console.log("[AcceptInvitation] Full sync result:", syncResult);
            console.log(
              "[AcceptInvitation] Sync summary:",
              `success: ${syncResult.success}`,
              `roles: ${syncResult.functionalRolesAssigned.join(", ") || "none"}`,
              `teams: ${syncResult.coachTeamsAssigned}`,
              `players: ${syncResult.playersLinked}`
            );

            // Check if sync actually succeeded
            if (!syncResult.success) {
              console.error(
                "[AcceptInvitation] Sync failed:",
                syncResult.error || "Unknown error"
              );
              setErrorMessage(
                `Warning: Your invitation was accepted, but there was an issue assigning your roles. ${syncResult.error || "Please contact an administrator to assign your roles manually."}`
              );
              setStatus("error");
              return; // Don't redirect - show error
            }

            syncSucceeded = true;
          } catch (error) {
            console.error(
              "[AcceptInvitation] Error syncing functional roles:",
              error
            );
            setErrorMessage(
              `Warning: Your invitation was accepted, but there was an issue assigning your roles. ${error instanceof Error ? error.message : "Unknown error"}. Please contact an administrator to assign your roles manually.`
            );
            setStatus("error");
            return; // Don't redirect - show error
          }

          // Only proceed if sync succeeded
          if (syncSucceeded) {
            // Set the organization as active before redirecting
            // This ensures the user sees the correct organization context
            try {
              await authClient.organization.setActive({ organizationId });
              console.log("Organization set as active:", organizationId);
            } catch (error) {
              console.error("Error setting active organization:", error);
              // Continue with redirect even if setting active fails (not critical)
            }

            // Redirect immediately - sync is already complete
            // Note: Small delay kept for UX (shows success message briefly)
            setTimeout(() => {
              router.push(`/orgs/${organizationId}`);
            }, 1500);
          }
        } else {
          // Fallback: redirect to organizations list
          setTimeout(() => {
            router.push("/orgs");
          }, 1500);
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
