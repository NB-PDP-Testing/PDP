"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { GdprPolicyViewer } from "@/components/onboarding/gdpr-policy-viewer";
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

/**
 * Setup Step 1: GDPR Consent
 * First user must accept the privacy policy before proceeding
 */
export default function SetupGdprPage() {
  const router = useRouter();
  const gdprVersion = useQuery(api.models.gdpr.getCurrentGdprVersion);
  const updateSetupStep = useMutation(api.models.setup.updateSetupStep);
  const acceptGdpr = useMutation(api.models.gdpr.acceptGdpr);

  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!acceptedPolicy) {
      toast.error("Please accept the Privacy Policy to continue");
      return;
    }

    if (!gdprVersion) {
      toast.error("Privacy policy not loaded");
      return;
    }

    setIsSubmitting(true);

    try {
      // Accept GDPR consent
      await acceptGdpr({
        version: gdprVersion.version,
        consentedToMarketing: acceptedMarketing,
      });

      // Update setup step
      await updateSetupStep({ step: "welcome" });

      toast.success("Privacy policy accepted");
      router.push("/setup/welcome");
    } catch (error) {
      console.error("Failed to accept GDPR:", error);
      toast.error("Failed to accept privacy policy. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (gdprVersion === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // No GDPR version configured - skip to next step
  if (gdprVersion === null) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Privacy Policy Not Configured</CardTitle>
            <CardDescription>
              No privacy policy has been set up yet. You can configure this
              later.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={async () => {
                await updateSetupStep({ step: "welcome" });
                router.push("/setup/welcome");
              }}
            >
              Continue to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Setup Your Platform</CardTitle>
          <CardDescription>
            Step 1 of 5: Review and accept our Privacy Policy
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Policy viewer */}
          <GdprPolicyViewer
            fullText={gdprVersion.fullText}
            summary={gdprVersion.summary}
          />

          {/* Consent checkboxes */}
          <div className="space-y-4 border-t pt-6">
            {/* Required consent */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={acceptedPolicy}
                id="accept-policy"
                onCheckedChange={(checked) =>
                  setAcceptedPolicy(checked === true)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  className="cursor-pointer font-medium text-sm leading-relaxed"
                  htmlFor="accept-policy"
                >
                  I have read and agree to the Privacy Policy{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <p className="text-muted-foreground text-xs">
                  Required to use the platform
                </p>
              </div>
            </div>

            {/* Optional marketing consent */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={acceptedMarketing}
                id="accept-marketing"
                onCheckedChange={(checked) =>
                  setAcceptedMarketing(checked === true)
                }
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  className="cursor-pointer font-medium text-sm leading-relaxed"
                  htmlFor="accept-marketing"
                >
                  I agree to receive platform updates via email
                </Label>
                <p className="text-muted-foreground text-xs">
                  Optional - we'll only send relevant updates
                </p>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end pt-4">
            <Button
              disabled={!acceptedPolicy || isSubmitting}
              onClick={handleAccept}
              size="lg"
            >
              {isSubmitting ? "Accepting..." : "Accept & Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
