"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GdprPolicyViewer } from "./gdpr-policy-viewer";
import { HelpFooter } from "./help-footer";

type GdprVersion = {
  _id: string;
  version: number;
  summary: string;
  fullText: string;
  effectiveDate: number;
};

type GdprConsentStepProps = {
  gdprVersion: GdprVersion;
  onAccept: () => void;
};

/**
 * GdprConsentStep - Modal component for GDPR consent
 *
 * Displays the GDPR policy and requires user acceptance before proceeding.
 * This modal cannot be dismissed without accepting (no X button, no escape).
 */
export function GdprConsentStep({
  gdprVersion,
  onAccept,
}: GdprConsentStepProps) {
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const acceptGdpr = useMutation(api.models.gdpr.acceptGdpr);

  const handleAccept = async () => {
    if (!acceptedPolicy) {
      toast.error("Please accept the Privacy Policy to continue");
      return;
    }

    setIsSubmitting(true);

    try {
      await acceptGdpr({
        version: gdprVersion.version,
        consentedToMarketing: acceptedMarketing,
      });

      toast.success("Privacy policy accepted");
      onAccept();
    } catch (error) {
      console.error("Failed to accept GDPR:", error);
      toast.error("Failed to accept privacy policy. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open>
      <AlertDialogContent
        className="max-w-lg max-sm:h-screen max-sm:w-screen max-sm:max-w-none max-sm:rounded-none sm:max-w-xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-6 text-primary" />
            <AlertDialogTitle>
              Data Protection & Privacy Consent
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Please review and accept our privacy policy to continue using the
            platform.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <GdprPolicyViewer
            fullText={gdprVersion.fullText}
            summary={gdprVersion.summary}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          {/* Required consent */}
          <div className="flex items-start gap-3">
            <Checkbox
              checked={acceptedPolicy}
              id="accept-policy"
              onCheckedChange={(checked) => setAcceptedPolicy(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                className="font-medium text-sm leading-relaxed"
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
                className="font-medium text-sm leading-relaxed"
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

        <AlertDialogFooter>
          <Button
            aria-busy={isSubmitting}
            className="w-full sm:w-auto"
            disabled={!acceptedPolicy || isSubmitting}
            onClick={handleAccept}
            size="lg"
          >
            {isSubmitting ? "Accepting..." : "Accept & Continue"}
          </Button>
        </AlertDialogFooter>

        <HelpFooter />
      </AlertDialogContent>
    </AlertDialog>
  );
}
