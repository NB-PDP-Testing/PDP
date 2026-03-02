"use client";

/**
 * Child Account Setup Page
 *
 * URL: /child-account-setup?token=xxx
 *
 * Public page for child players to set up their account after a parent
 * has granted them access via the parent portal.
 *
 * Flow:
 * 1. Validate the token (must be tokenType='child_account_setup', not expired, not used)
 * 2. Show player name and club
 * 3. Sign up with email + password (email pre-filled from token)
 * 4. After auth: call claimChildAccount to link player identity to user
 * 5. Redirect to /orgs/[orgId] — onboarding orchestrator shows welcome step
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Check,
  Clock,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function ChildAccountSetupContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [step, setStep] = useState<"welcome" | "signup" | "done">("welcome");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setupStatus = useQuery(
    api.models.parentChildAuthorizations.getChildAccountSetupStatus,
    token ? { token } : "skip"
  );

  const claimChildAccount = useMutation(
    api.models.parentChildAuthorizations.claimChildAccount
  );

  // Loading state
  if (setupStatus === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">
            Validating your invitation...
          </p>
        </div>
      </div>
    );
  }

  // No token in URL
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Missing Invitation Link</CardTitle>
            <CardDescription>
              This page requires a valid invitation link. Please check the email
              from your parent and click the &quot;Set Up My Account&quot;
              button.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/">Go to Home Page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token states
  if (!setupStatus.valid) {
    const renderError = () => {
      if (setupStatus.used) {
        return (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Account Already Set Up</CardTitle>
            <CardDescription>
              This invitation has already been used to create an account. You
              can sign in with your email and password.
            </CardDescription>
          </>
        );
      }
      if (setupStatus.expired) {
        return (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation link has expired. Please ask your parent to
              re-send the invite from their parent dashboard.
            </CardDescription>
          </>
        );
      }
      return (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>
            This invitation link is not valid. Please check the link or ask your
            parent for a new invite.
          </CardDescription>
        </>
      );
    };

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">{renderError()}</CardHeader>
          <CardContent>
            <div className="space-y-3">
              {setupStatus.used && (
                <Button asChild className="w-full">
                  <Link href="/login">Sign In to Your Account</Link>
                </Button>
              )}
              <Button asChild className="w-full" variant="outline">
                <Link href="/">Go to Home Page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state after account creation
  if (step === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Account Created!</CardTitle>
            <CardDescription>
              Taking you to your player dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Welcome step
  if (step === "welcome") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
            </div>
            <CardTitle>Welcome, {setupStatus.playerName}!</CardTitle>
            <CardDescription>
              Your parent has invited you to access your player development data
              at <strong>{setupStatus.organizationName}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">You&apos;ll be able to view:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• Sport passport ratings and assessments</li>
                <li>• Development goals and coach feedback</li>
                <li>• Wellness check-ins</li>
              </ul>
            </div>
            <Button className="w-full" onClick={() => setStep("signup")}>
              Set Up My Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sign up step
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-step signup flow with error handling
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!(setupStatus?.email && setupStatus?.playerIdentityId)) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the account with Better Auth
      const signUpResult = await authClient.signUp.email({
        email: setupStatus.email,
        password,
        name: name || setupStatus.playerName || "Player",
      });

      if (signUpResult.error) {
        toast.error(signUpResult.error.message ?? "Failed to create account");
        return;
      }

      // Get the new user's ID from the session
      const session = await authClient.getSession();
      const userId = session.data?.user?.id;
      if (!userId) {
        toast.error("Failed to get user session. Please try again.");
        return;
      }

      // Link the player identity to the new user account
      const claimResult = await claimChildAccount({ token, userId });
      if (!claimResult.success) {
        toast.error(claimResult.error ?? "Failed to link your player profile");
        return;
      }

      setStep("done");

      // Redirect to org portal — onboarding orchestrator shows welcome step
      if (claimResult.organizationId) {
        router.push(`/orgs/${claimResult.organizationId}/player`);
      } else {
        router.push("/");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>
            Setting up your PlayerARC account at{" "}
            <strong>{setupStatus.organizationName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                disabled
                id="email"
                type="email"
                value={setupStatus.email ?? ""}
              />
              <p className="text-muted-foreground text-xs">
                This is the email your parent used to invite you.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder={setupStatus.playerName ?? ""}
                required
                type="text"
                value={name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create a Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating Account..." : "Create My Account"}
            </Button>

            <p className="text-center text-muted-foreground text-xs">
              Already have an account?{" "}
              <Link className="text-primary underline" href="/login">
                Sign in instead
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ChildAccountSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <ChildAccountSetupContent />
    </Suspense>
  );
}
