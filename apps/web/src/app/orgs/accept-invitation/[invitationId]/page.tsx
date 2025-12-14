"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    "loading" | "success" | "error" | "idle"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!invitationId) {
      setStatus("error");
      setErrorMessage("Invalid invitation link");
      return;
    }

    const acceptInvitation = async () => {
      try {
        // Check if user is logged in
        const session = await authClient.getSession();
        if (!session) {
          // Redirect to login with return URL
          router.push(
            `/login?redirect=/orgs/accept-invitation/${invitationId}`
          );
          return;
        }

        // Accept the invitation
        console.log("Attempting to accept invitation:", invitationId);
        const result = await authClient.organization.acceptInvitation({
          invitationId,
        });

        console.log("Invitation acceptance result:", result);

        if (result.error) {
          console.error("Invitation acceptance error:", result.error);
          setStatus("error");
          setErrorMessage(
            result.error.message || "Failed to accept invitation"
          );
        } else {
          setStatus("success");
          // Redirect to the organization after a short delay
          setTimeout(() => {
            if (result.data?.invitation?.organizationId) {
              router.push(`/orgs/${result.data.invitation.organizationId}`);
            } else {
              router.push("/orgs");
            }
          }, 2000);
        }
      } catch (error: any) {
        setStatus("error");
        setErrorMessage(
          error.message || "An error occurred while accepting the invitation"
        );
      }
    };

    acceptInvitation();
  }, [invitationId, router]);

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

        {status === "error" && (
          <CardContent className="space-y-4">
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
              variant="default"
            >
              Sign In
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
