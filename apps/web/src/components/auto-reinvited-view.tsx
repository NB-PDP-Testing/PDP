"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AutoReInvitedViewProps = {
  organizationName: string;
};

/**
 * AutoReInvitedView component (Phase 1B)
 *
 * Displayed when a user's expired invitation is automatically re-invited.
 * Shows a confirmation that a new invitation has been sent.
 */
export function AutoReInvitedView({
  organizationName,
}: AutoReInvitedViewProps) {
  const router = useRouter();

  const handleDone = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl">New Invitation Sent!</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            Your invitation to join <strong>{organizationName}</strong> has
            expired, but a new invitation has been automatically sent to your
            email.
          </p>
          <p className="text-gray-500 text-sm">
            Please check your email for the new invitation link.
          </p>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button onClick={handleDone}>Done</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
