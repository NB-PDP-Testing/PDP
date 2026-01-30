"use client";

/**
 * ClaimWizard - Multi-step wizard for players to claim their account
 *
 * Steps:
 * 1. Welcome - Introduction with player name and organization
 * 2. Account - Sign in or create account
 * 3. GDPR - Accept privacy policy
 * 4. Confirm - Review and finalize claim
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  ChevronRight,
  GraduationCap,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type ClaimWizardProps = {
  token: string;
  playerName: string;
  organizationName: string;
  playerIdentityId: Id<"playerIdentities">;
};

type WizardStep = "welcome" | "account" | "gdpr" | "confirm";

const STEPS: {
  id: WizardStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "welcome", label: "Welcome", icon: GraduationCap },
  { id: "account", label: "Account", icon: LogIn },
  { id: "gdpr", label: "Privacy", icon: ShieldCheck },
  { id: "confirm", label: "Confirm", icon: Check },
];

export function ClaimWizard({
  token,
  playerName,
  organizationName,
  // playerIdentityId will be used when redirecting to the player dashboard in US-010
  // biome-ignore lint/correctness/noUnusedFunctionParameters: Will be used in US-010
  playerIdentityId,
}: ClaimWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session } = authClient.useSession();

  // Get GDPR version for consent
  const gdprVersion = useQuery(api.models.gdpr.getCurrentGdprVersion);
  const acceptGdpr = useMutation(api.models.gdpr.acceptGdpr);
  const claimAccount = useMutation(
    api.models.playerGraduations.claimPlayerAccount
  );

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleNextStep = async () => {
    switch (currentStep) {
      case "welcome":
        setCurrentStep("account");
        break;
      case "account":
        // User must be signed in to proceed
        if (!session?.user) {
          toast.error("Please sign in or create an account to continue");
          return;
        }
        setCurrentStep("gdpr");
        break;
      case "gdpr":
        if (!gdprAccepted) {
          toast.error("Please accept the privacy policy to continue");
          return;
        }
        // Accept GDPR
        if (gdprVersion) {
          try {
            await acceptGdpr({
              version: gdprVersion.version,
              consentedToMarketing: false,
            });
          } catch (error) {
            console.error("Failed to accept GDPR:", error);
            toast.error("Failed to accept privacy policy. Please try again.");
            return;
          }
        }
        setCurrentStep("confirm");
        break;
      case "confirm":
        await handleClaimAccount();
        break;
      default:
        // All steps are handled, this is just for TypeScript exhaustiveness
        break;
    }
  };

  const handleClaimAccount = async () => {
    if (!session?.user?.id) {
      toast.error("Please sign in to claim your account");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await claimAccount({
        token,
        userId: session.user.id,
      });

      if (result.success) {
        toast.success(
          "Account claimed successfully! Welcome to your dashboard."
        );
        // For now, redirect to home page - the player dashboard will be implemented in US-010
        router.push("/");
      } else {
        toast.error(
          result.error || "Failed to claim account. Please try again."
        );
      }
    } catch (error) {
      console.error("Failed to claim account:", error);
      toast.error("Failed to claim account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "welcome":
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-2xl">Hi, {playerName}!</h2>
              <p className="mt-2 text-muted-foreground">
                You&apos;ve been invited to claim your own account at{" "}
                <strong>{organizationName}</strong>.
              </p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-left">
              <h3 className="font-medium">What you&apos;ll get:</h3>
              <ul className="mt-2 space-y-1 text-muted-foreground text-sm">
                <li>Access to your complete development history</li>
                <li>View coach feedback and assessments</li>
                <li>Track your development goals</li>
                <li>Manage your own profile</li>
              </ul>
            </div>
          </div>
        );

      case "account":
        return (
          <div className="space-y-6">
            {session?.user ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Signed in as</h3>
                  <p className="text-muted-foreground">{session.user.email}</p>
                </div>
                <p className="text-muted-foreground text-sm">
                  This account will be linked to your player profile.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Sign in with an existing account or create a new one to claim
                  your player profile.
                </p>
                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/login?redirect=/claim-account/${token}`}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href={`/signup?redirect=/claim-account/${token}`}>
                      <User className="mr-2 h-4 w-4" />
                      Create Account
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case "gdpr":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">Privacy Policy</h3>
              <p className="mt-1 text-muted-foreground text-sm">
                Please review and accept our privacy policy to continue.
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border p-4 text-sm">
              <p>
                By claiming your account, you agree to our Privacy Policy and
                Terms of Service. We collect and process your personal data to
                provide our player development services.
              </p>
              <p className="mt-2">
                Your data will be used to track your development progress, store
                coach feedback, and provide you with insights into your athletic
                development.
              </p>
              <p className="mt-2">
                You have the right to access, correct, and delete your personal
                data at any time.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={gdprAccepted}
                id="gdpr-accept"
                onCheckedChange={(checked) => setGdprAccepted(checked === true)}
              />
              <Label className="text-sm" htmlFor="gdpr-accept">
                I accept the Privacy Policy and Terms of Service
              </Label>
            </div>
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium">Ready to Claim Your Account</h3>
            </div>
            <div className="rounded-lg border p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Player Name</span>
                  <span className="font-medium">{playerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organization</span>
                  <span className="font-medium">{organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Email</span>
                  <span className="font-medium">{session?.user?.email}</span>
                </div>
              </div>
            </div>
            <p className="text-center text-muted-foreground text-sm">
              Click &quot;Claim Account&quot; to link your player profile to
              this account.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;

            // Determine step indicator classes
            const getStepClasses = () => {
              if (isCompleted) {
                return "bg-primary text-primary-foreground";
              }
              if (isActive) {
                return "bg-primary/20 text-primary";
              }
              return "bg-muted text-muted-foreground";
            };

            return (
              <div className="flex items-center" key={step.id}>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${getStepClasses()}`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between px-2">
          {STEPS.map((step) => (
            <span
              className={`text-xs ${
                step.id === currentStep
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
              key={step.id}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStepIndex].label}</CardTitle>
          <CardDescription>
            Step {currentStepIndex + 1} of {STEPS.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}

          <div className="mt-6">
            <Button
              className="w-full"
              disabled={
                isSubmitting ||
                (currentStep === "account" && !session?.user) ||
                (currentStep === "gdpr" && !gdprAccepted)
              }
              onClick={handleNextStep}
            >
              {(() => {
                if (isSubmitting) {
                  return "Processing...";
                }
                if (currentStep === "confirm") {
                  return "Claim Account";
                }
                return "Continue";
              })()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
