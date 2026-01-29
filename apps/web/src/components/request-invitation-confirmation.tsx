"use client";

import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RequestInvitationConfirmationProps = {
  organizationName: string;
};

/**
 * RequestInvitationConfirmation component (Phase 1B)
 *
 * Displayed after a user successfully requests a new invitation.
 * Shows a confirmation message and a button to navigate away.
 */
export function RequestInvitationConfirmation({
  organizationName,
}: RequestInvitationConfirmationProps) {
  const router = useRouter();

  const handleDone = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl">Request Submitted</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            Your request for a new invitation to{" "}
            <strong>{organizationName}</strong> has been sent to the
            organization administrators.
          </p>
          <p className="text-gray-500 text-sm">
            You&apos;ll receive an email when your request is processed.
          </p>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button onClick={handleDone}>Done</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
