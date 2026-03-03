"use client";

/**
 * ClaimWizard - Multi-step wizard for players to claim their account
 *
 * Steps:
 * 1. Welcome - Introduction with player name and organization
 * 2. Account - Sign in or create account
 * 3. Verify - SMS or email PIN verification
 * 4. GDPR - Accept privacy policy
 * 5. Confirm - Review and finalize claim
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  ChevronRight,
  GraduationCap,
  KeyRound,
  LogIn,
  RefreshCw,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type ClaimWizardProps = {
  token: string;
  playerName: string;
  organizationName: string;
  organizationId?: string;
  playerIdentityId: Id<"playerIdentities">;
};

type WizardStep = "welcome" | "account" | "verify" | "gdpr" | "confirm";

const STEPS: {
  id: WizardStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "welcome", label: "Welcome", icon: GraduationCap },
  { id: "account", label: "Account", icon: LogIn },
  { id: "verify", label: "Verify", icon: KeyRound },
  { id: "gdpr", label: "Privacy", icon: ShieldCheck },
  { id: "confirm", label: "Confirm", icon: Check },
];

export function ClaimWizard({
  token,
  playerName,
  organizationName,
  organizationId,
  playerIdentityId,
}: ClaimWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PIN verification state
  const [pinChannel, setPinChannel] = useState<"sms" | "email">("email");
  const [maskedDestination, setMaskedDestination] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSendingPin, setIsSendingPin] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinLocked, setPinLocked] = useState(false);
  const [pinExpired, setPinExpired] = useState(false);

  const { data: session } = authClient.useSession();

  // Get GDPR version for consent
  const gdprVersion = useQuery(api.models.gdpr.getCurrentGdprVersion);
  const acceptGdpr = useMutation(api.models.gdpr.acceptGdpr);
  const claimAccount = useMutation(
    api.models.playerGraduations.claimPlayerAccount
  );
  const sendVerificationPin = useMutation(
    api.models.playerGraduations.sendClaimVerificationPin
  );
  const verifyPinMutation = useMutation(
    api.models.playerGraduations.verifyClaimPin
  );

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleSendPin = async () => {
    if (!session?.user?.email) {
      return;
    }
    setIsSendingPin(true);
    setPinError("");
    setPinExpired(false);
    setPinLocked(false);
    try {
      const result = await sendVerificationPin({
        playerIdentityId,
        claimEmail: session.user.email,
      });
      if (result.success) {
        setPinChannel(result.channel);
        setMaskedDestination(result.maskedDestination);
      } else {
        toast.error(result.error ?? "Failed to send verification code.");
      }
    } catch (err) {
      console.error("Failed to send verification PIN:", err);
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setIsSendingPin(false);
    }
  };

  const handleVerifyPin = async () => {
    if (!pinCode.trim()) {
      return;
    }
    setIsVerifyingPin(true);
    setPinError("");
    try {
      const result = await verifyPinMutation({
        playerIdentityId,
        pin: pinCode.trim(),
      });
      if (result.valid) {
        setCurrentStep("gdpr");
      } else if (result.locked) {
        setPinLocked(true);
        setPinError(result.error ?? "Too many incorrect attempts.");
      } else if (result.expired) {
        setPinExpired(true);
        setPinError(result.error ?? "Code expired. Please request a new one.");
      } else {
        setPinError(result.error ?? "Incorrect code.");
      }
    } catch (err) {
      console.error("Failed to verify PIN:", err);
      setPinError("Failed to verify code. Please try again.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleNextStep = async () => {
    switch (currentStep) {
      case "welcome":
        setCurrentStep("account");
        break;
      case "account":
        if (!session?.user) {
          toast.error("Please sign in or create an account to continue");
          return;
        }
        await handleSendPin();
        setCurrentStep("verify");
        break;
      case "verify":
        await handleVerifyPin();
        break;
      case "gdpr":
        if (!gdprAccepted) {
          toast.error("Please accept the privacy policy to continue");
          return;
        }
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
        if (organizationId) {
          router.push(`/orgs/${organizationId}`);
        } else {
          router.push("/");
        }
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

      case "verify":
        return (
          <div className="space-y-6">
            {pinLocked ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <KeyRound className="h-6 w-6 text-red-600" />
                </div>
                <p className="font-medium text-red-800">Too Many Attempts</p>
                <p className="text-muted-foreground text-sm">
                  Please ask your guardian to resend the invite to get a new
                  link.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {maskedDestination ? (
                  <>
                    <p className="text-center text-muted-foreground text-sm">
                      A verification code has been sent to{" "}
                      <span className="font-medium">{maskedDestination}</span>{" "}
                      via {pinChannel === "sms" ? "SMS" : "email"}. Enter the
                      6-digit code to confirm your identity.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="pin-input">Verification Code</Label>
                      <Input
                        autoComplete="one-time-code"
                        className="text-center font-mono text-2xl tracking-widest"
                        disabled={pinExpired}
                        id="pin-input"
                        inputMode="numeric"
                        maxLength={6}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setPinCode(val);
                          setPinError("");
                        }}
                        pattern="[0-9]*"
                        placeholder="000000"
                        value={pinCode}
                      />
                      {pinError && (
                        <p className="text-destructive text-sm">{pinError}</p>
                      )}
                    </div>
                    {pinExpired && (
                      <Button
                        className="w-full"
                        disabled={isSendingPin}
                        onClick={async () => {
                          setPinCode("");
                          setPinExpired(false);
                          await handleSendPin();
                        }}
                        variant="outline"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {isSendingPin ? "Sending..." : "Resend Code"}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">
                      Sending verification code...
                    </p>
                  </div>
                )}
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

  const getNextButtonLabel = () => {
    if (isSubmitting) {
      return "Processing...";
    }
    if (currentStep === "confirm") {
      return "Claim Account";
    }
    if (currentStep === "verify") {
      return isVerifyingPin ? "Verifying..." : "Verify Code";
    }
    if (currentStep === "account") {
      return "Continue & Send Code";
    }
    return "Continue";
  };

  const isNextDisabled = () => {
    if (isSubmitting || isVerifyingPin || isSendingPin) {
      return true;
    }
    if (currentStep === "account" && !session?.user) {
      return true;
    }
    if (currentStep === "gdpr" && !gdprAccepted) {
      return true;
    }
    if (
      currentStep === "verify" &&
      (pinLocked || !pinCode || pinCode.length < 6)
    ) {
      return true;
    }
    return false;
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
                  <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between px-1">
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
          <CardTitle>{STEPS[currentStepIndex]?.label ?? ""}</CardTitle>
          <CardDescription>
            Step {currentStepIndex + 1} of {STEPS.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}

          {!pinLocked && (
            <div className="mt-6">
              <Button
                className="w-full"
                disabled={isNextDisabled()}
                onClick={handleNextStep}
              >
                {getNextButtonLabel()}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
