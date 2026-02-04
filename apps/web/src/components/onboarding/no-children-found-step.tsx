"use client";

/**
 * NoChildrenFoundStep - Fallback component when no guardian matches found
 *
 * Displays helpful guidance when the user couldn't be matched to any
 * imported guardian records. Provides options to try different details,
 * contact the club, or continue without linking.
 *
 * Part of Phase 0: Onboarding Sync
 */

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
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

export type NoChildrenFoundData = {
  searchedEmail: string;
  searchedPhone?: string;
  searchedPostcode?: string;
  searchedAltEmail?: string;
};

type NoChildrenFoundStepProps = {
  data: NoChildrenFoundData;
  onComplete: () => void;
  onRetrySearch: (params: {
    phone?: string;
    altEmail?: string;
    postcode?: string;
  }) => void;
};

/**
 * NoChildrenFoundStep - Modal shown when no guardian matches are found
 */
export function NoChildrenFoundStep({
  data,
  onComplete,
  onRetrySearch,
}: NoChildrenFoundStepProps) {
  const [showRetryForm, setShowRetryForm] = useState(false);
  const [phone, setPhone] = useState(data.searchedPhone || "");
  const [altEmail, setAltEmail] = useState(data.searchedAltEmail || "");
  const [postcode, setPostcode] = useState(data.searchedPostcode || "");
  const [isRetrying, setIsRetrying] = useState(false);

  const updateProfile = useMutation(api.models.userProfiles.updateProfile);
  const { track } = useAnalytics();

  const handleRetrySearch = async () => {
    // Validate at least one new field is provided
    const hasNewPhone = phone.trim() && phone.trim() !== data.searchedPhone;
    const hasNewAltEmail =
      altEmail.trim() && altEmail.trim() !== data.searchedAltEmail;
    const hasNewPostcode =
      postcode.trim() && postcode.trim() !== data.searchedPostcode;

    if (!(hasNewPhone || hasNewAltEmail || hasNewPostcode)) {
      toast.error("Please provide different contact details to retry");
      return;
    }

    // Basic email validation if alt email provided
    if (altEmail.trim() && !altEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsRetrying(true);
    try {
      // Save the new profile data
      await updateProfile({
        phone: phone.trim() || undefined,
        altEmail: altEmail.trim() || undefined,
        postcode: postcode.trim().toUpperCase() || undefined,
      });

      track(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
        step_id: "no_children_found_retry",
        has_phone: !!phone.trim(),
        has_postcode: !!postcode.trim(),
        has_alt_email: !!altEmail.trim(),
      });

      // Trigger a new search with updated details
      onRetrySearch({
        phone: phone.trim() || undefined,
        altEmail: altEmail.trim() || undefined,
        postcode: postcode.trim().toUpperCase() || undefined,
      });
    } catch (error) {
      console.error("Failed to update profile for retry:", error);
      toast.error("Failed to save details. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleContinueWithoutLinking = () => {
    track(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
      step_id: "no_children_found",
      action: "continue_without_linking",
    });
    onComplete();
  };

  const handlePostcodeChange = (value: string) => {
    setPostcode(value.toUpperCase());
  };

  // Build list of what was searched
  const searchedSignals: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
  }> = [
    {
      key: "email",
      icon: <Mail className="size-4" />,
      label: data.searchedEmail,
    },
  ];

  if (data.searchedPhone) {
    searchedSignals.push({
      key: "phone",
      icon: <Phone className="size-4" />,
      label: data.searchedPhone,
    });
  }

  if (data.searchedPostcode) {
    searchedSignals.push({
      key: "postcode",
      icon: <MapPin className="size-4" />,
      label: data.searchedPostcode,
    });
  }

  if (data.searchedAltEmail) {
    searchedSignals.push({
      key: "altEmail",
      icon: <Mail className="size-4" />,
      label: `${data.searchedAltEmail} (alternate)`,
    });
  }

  return (
    <AlertDialog open>
      <AlertDialogContent
        className="max-w-lg max-sm:h-screen max-sm:w-screen max-sm:max-w-none max-sm:rounded-none sm:max-w-xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="size-6 text-amber-500" />
            <AlertDialogTitle>No Children Found</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                We couldn't find any children linked to your account. This might
                happen for a few reasons.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* What we searched */}
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="mb-2 font-medium text-sm">We searched using:</p>
          <div className="space-y-1">
            {searchedSignals.map((signal) => (
              <div
                className="flex items-center gap-2 text-muted-foreground text-sm"
                key={signal.key}
              >
                {signal.icon}
                <span>{signal.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Possible reasons */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <HelpCircle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <div className="text-sm">
              <p className="font-medium">Possible reasons:</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
                <li>Your club hasn't imported player data yet</li>
                <li>The club has different contact details on file for you</li>
                <li>You're new to the club and not yet in the system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Try Different Details - Collapsible */}
        <div className="border-t pt-4">
          <Button
            className="w-full justify-between"
            onClick={() => setShowRetryForm(!showRetryForm)}
            variant="outline"
          >
            <span>Try Different Details</span>
            {showRetryForm ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>

          {showRetryForm && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retry-phone">Phone Number</Label>
                <Input
                  disabled={isRetrying}
                  id="retry-phone"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+353 87 123 4567"
                  type="tel"
                  value={phone}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retry-altEmail">Alternate Email</Label>
                <Input
                  disabled={isRetrying}
                  id="retry-altEmail"
                  onChange={(e) => setAltEmail(e.target.value)}
                  placeholder="another.email@example.com"
                  type="email"
                  value={altEmail}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retry-postcode">Postcode / Eircode</Label>
                <Input
                  disabled={isRetrying}
                  id="retry-postcode"
                  onChange={(e) => handlePostcodeChange(e.target.value)}
                  placeholder="BT61 7QR or D02 AF30"
                  value={postcode}
                />
              </div>

              <Button
                className="w-full"
                disabled={isRetrying}
                onClick={handleRetrySearch}
              >
                {isRetrying ? (
                  <>
                    <Loader2
                      aria-hidden="true"
                      className="mr-2 size-4 animate-spin"
                    />
                    Searching...
                  </>
                ) : (
                  "Search Again"
                )}
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              // Placeholder - could open mailto or help page
              toast.info("Please contact your club administrator for help.");
            }}
            variant="outline"
          >
            Contact Club
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleContinueWithoutLinking}
          >
            Continue Without Linking
          </Button>
        </AlertDialogFooter>

        <HelpFooter />
      </AlertDialogContent>
    </AlertDialog>
  );
}
