"use client";

/**
 * ProfileCompletionStep - Onboarding step for collecting profile data
 *
 * Collects phone, postcode, and alternate email to enable multi-signal
 * guardian matching. This allows parents who signed up with different
 * emails to be matched with their children.
 *
 * Part of Phase 0: Onboarding Sync
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Info, Loader2, User } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsEvents, useAnalytics } from "@/lib/analytics";
import { HelpFooter } from "./help-footer";

export type ProfileCompletionData = {
  currentPhone?: string;
  currentPostcode?: string;
  currentAltEmail?: string;
  skipCount: number;
  canSkip: boolean;
  reason: string;
};

type ProfileCompletionStepProps = {
  data: ProfileCompletionData;
  onComplete: () => void;
  onSkip: () => void;
};

/**
 * ProfileCompletionStep - Modal for collecting profile data for guardian matching
 */
export function ProfileCompletionStep({
  data,
  onComplete,
  onSkip,
}: ProfileCompletionStepProps) {
  const [phone, setPhone] = useState(data.currentPhone || "");
  const [postcode, setPostcode] = useState(data.currentPostcode || "");
  const [altEmail, setAltEmail] = useState(data.currentAltEmail || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const updateProfile = useMutation(api.models.userProfiles.updateProfile);
  const skipProfileCompletion = useMutation(
    api.models.userProfiles.skipProfileCompletion
  );
  const { track } = useAnalytics();

  const remainingSkips = 3 - data.skipCount;

  const handleSubmit = async () => {
    // Validate at least one field is provided
    if (!(phone.trim() || postcode.trim() || altEmail.trim())) {
      toast.error("Please provide at least one piece of information");
      return;
    }

    // Basic email validation if alt email provided
    if (altEmail.trim() && !altEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        phone: phone.trim() || undefined,
        postcode: postcode.trim() || undefined,
        altEmail: altEmail.trim() || undefined,
      });

      track(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
        step_id: "profile_completion",
        has_phone: !!phone.trim(),
        has_postcode: !!postcode.trim(),
        has_alt_email: !!altEmail.trim(),
      });

      toast.success("Profile updated successfully");
      onComplete();
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      const result = await skipProfileCompletion();

      track(AnalyticsEvents.ONBOARDING_STEP_SKIPPED, {
        step_id: "profile_completion",
        skip_count: result.skipCount,
        can_skip_again: result.canSkipAgain,
      });

      if (result.canSkipAgain) {
        toast.info(
          `Skipped for now. You can complete this ${3 - result.skipCount} more time${3 - result.skipCount !== 1 ? "s" : ""}.`
        );
      } else {
        toast.info(
          "This is your last skip. You'll need to complete this step next time."
        );
      }

      onSkip();
    } catch (error) {
      console.error("Failed to skip profile completion:", error);
      toast.error("Failed to skip. Please try again.");
    } finally {
      setIsSkipping(false);
    }
  };

  const handlePostcodeChange = (value: string) => {
    // Auto-uppercase postcode as user types
    setPostcode(value.toUpperCase());
  };

  return (
    <AlertDialog open>
      <AlertDialogContent
        className="max-w-lg max-sm:h-screen max-sm:w-screen max-sm:max-w-none max-sm:rounded-none sm:max-w-xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <User aria-hidden="true" className="size-6 text-primary" />
            <AlertDialogTitle>Help Us Find Your Children</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                To help connect you with your children's club records, please
                provide some additional details.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Info box explaining why we ask */}
        <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <Info
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-blue-600"
          />
          <div className="text-blue-800 text-sm">
            <p className="font-medium">Why do we ask for this?</p>
            <p className="mt-1 text-blue-700">
              Clubs often have different contact details on file than the email
              you signed up with. Providing your phone number or postcode helps
              us match you to your children's records.
            </p>
          </div>
        </div>

        <div className="space-y-4 py-4">
          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              disabled={isSubmitting || isSkipping}
              id="phone"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+353 87 123 4567"
              type="tel"
              value={phone}
            />
            <p className="text-muted-foreground text-xs">
              Irish and UK mobile numbers are supported
            </p>
          </div>

          {/* Postcode Input */}
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode / Eircode</Label>
            <Input
              disabled={isSubmitting || isSkipping}
              id="postcode"
              onChange={(e) => handlePostcodeChange(e.target.value)}
              placeholder="BT61 7QR or D02 AF30"
              value={postcode}
            />
          </div>

          {/* Alternate Email Input */}
          <div className="space-y-2">
            <Label htmlFor="altEmail">Alternate Email (Optional)</Label>
            <Input
              disabled={isSubmitting || isSkipping}
              id="altEmail"
              onChange={(e) => setAltEmail(e.target.value)}
              placeholder="another.email@example.com"
              type="email"
              value={altEmail}
            />
            <p className="text-muted-foreground text-xs">
              If the club might have a different email for you
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          {data.canSkip && (
            <Button
              aria-busy={isSkipping}
              className="w-full sm:w-auto"
              disabled={isSubmitting || isSkipping}
              onClick={handleSkip}
              size="lg"
              variant="outline"
            >
              {isSkipping ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="mr-2 size-4 animate-spin"
                  />
                  Skipping...
                </>
              ) : (
                `Skip for Now (${remainingSkips} left)`
              )}
            </Button>
          )}
          <Button
            aria-busy={isSubmitting}
            className="w-full sm:w-auto"
            disabled={isSubmitting || isSkipping}
            onClick={handleSubmit}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  aria-hidden="true"
                  className="mr-2 size-4 animate-spin"
                />
                Saving...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>
        </AlertDialogFooter>

        <HelpFooter />
      </AlertDialogContent>
    </AlertDialog>
  );
}
