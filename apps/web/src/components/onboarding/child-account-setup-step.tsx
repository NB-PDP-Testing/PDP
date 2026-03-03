"use client";

/**
 * ChildAccountSetupStep - Onboarding welcome step for newly-setup child accounts.
 *
 * Shown after a youth player sets up their account via /child-account-setup.
 * Explains what they can see and what their coach/parent controls.
 * On completion: marks playerWelcomedAt so this step is never shown again.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { BookOpen, ShieldCheck, Star, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ChildAccountSetupTaskData = {
  playerFirstName: string;
  organizationId: string;
};

type ChildAccountSetupStepProps = {
  data: ChildAccountSetupTaskData;
  onComplete: () => void;
};

export function ChildAccountSetupStep({
  data,
  onComplete,
}: ChildAccountSetupStepProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const markPlayerWelcomed = useMutation(
    api.models.playerGraduations.markPlayerWelcomed
  );

  async function handleGoToDashboard() {
    setIsLoading(true);
    try {
      await markPlayerWelcomed({});
      onComplete();
      router.push(`/orgs/${data.organizationId}/player`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <Star className="h-6 w-6 text-indigo-600" />
          </div>
          <DialogTitle className="text-xl">
            Welcome to your player account, {data.playerFirstName}!
          </DialogTitle>
          <DialogDescription>
            Your parent has given you access to see your sports development
            data. Here&apos;s what you can do.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* What they can see */}
          <div>
            <p className="mb-2 font-medium text-sm">You can view:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span>Your sport passport ratings and assessments</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span>Development goals and coach feedback</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span>Wellness check-ins</span>
              </li>
            </ul>
          </div>

          {/* What coach controls */}
          <div className="rounded-lg bg-muted p-3">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              What your coach controls
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              Your coach sets your goals, assessments, and writes feedback. Some
              notes are shared only with your parent — this is normal and helps
              your coach support your development.
            </p>
          </div>

          <Button
            className="w-full"
            disabled={isLoading}
            onClick={handleGoToDashboard}
          >
            {isLoading ? "Loading..." : "Go to My Dashboard"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
