"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { useState } from "react";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import UserMenu from "@/components/user-menu";

export default function DashboardPage() {
  const [showSignIn, setShowSignIn] = useState(false);
  const privateData = useQuery(api.privateData.get);
  const setOnboardingComplete = useMutation(
    api.privateData.setOnboardingComplete
  );

  const handleOnboardingChange = async (checked: boolean) => {
    await setOnboardingComplete({ onboardingComplete: checked });
  };

  return (
    <>
      <Authenticated>
        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-2xl">Dashboard</h1>
            <UserMenu />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-muted-foreground">
              Private data: {privateData?.message}
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={privateData?.onboardingComplete ?? false}
                id="onboarding"
                onCheckedChange={handleOnboardingChange}
              />
              <Label className="cursor-pointer" htmlFor="onboarding">
                Onboarding complete
              </Label>
            </div>
          </div>
        </div>
      </Authenticated>
      <Unauthenticated>
        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
        )}
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div>Loading...</div>
        </div>
      </AuthLoading>
    </>
  );
}
