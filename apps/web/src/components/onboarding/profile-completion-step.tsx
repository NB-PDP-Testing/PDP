"use client";

/**
 * ProfileCompletionStep - Onboarding step for collecting profile data
 *
 * Collects phone, postcode, alternate email, and full address.
 * For invited users, this enables multi-signal guardian matching.
 * For self-registered users, this collects profile info for later admin use.
 *
 * Part of Phase 0: Onboarding Sync
 * Updated in Phase 0.6: Address Collection Enhancement
 * Updated in Phase 0.8: Neutral messaging for all users
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnalyticsEvents, useAnalytics } from "@/lib/analytics";
import {
  ALL_COUNTRIES,
  getCountyOptions,
  IRISH_COUNTIES,
  TOP_COUNTRIES,
  US_STATES,
} from "@/lib/constants/address-data";
import { HelpFooter } from "./help-footer";

export type ProfileCompletionData = {
  currentPhone?: string;
  currentPostcode?: string;
  currentAltEmail?: string;
  currentAddress?: string;
  currentAddress2?: string;
  currentTown?: string;
  currentCounty?: string;
  currentCountry?: string;
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
  const [address, setAddress] = useState(data.currentAddress || "");
  const [address2, setAddress2] = useState(data.currentAddress2 || "");
  const [town, setTown] = useState(data.currentTown || "");
  const [county, setCounty] = useState(data.currentCounty || "");
  const [country, setCountry] = useState(data.currentCountry || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Track if "Other" was selected for county dropdown
  const [isCountyOther, setIsCountyOther] = useState(false);

  const updateProfile = useMutation(api.models.userProfiles.updateProfile);
  const skipProfileCompletion = useMutation(
    api.models.userProfiles.skipProfileCompletion
  );
  const { track } = useAnalytics();

  const remainingSkips = 3 - data.skipCount;

  // Determine county field type based on country
  const countyOptions = getCountyOptions(country);
  const showCountyDropdown = countyOptions && !isCountyOther;

  const handleSubmit = async () => {
    // Validate required fields: phone and postcode
    if (!phone.trim()) {
      toast.error("Please provide a phone number");
      return;
    }

    if (!postcode.trim()) {
      toast.error("Please provide a postcode / eircode");
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
        address: address.trim() || undefined,
        address2: address2.trim() || undefined,
        town: town.trim() || undefined,
        county: county.trim() || undefined,
        country: country || undefined,
      });

      track(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
        step_id: "profile_completion",
        has_phone: !!phone.trim(),
        has_postcode: !!postcode.trim(),
        has_alt_email: !!altEmail.trim(),
        has_address: !!address.trim(),
        has_town: !!town.trim(),
        has_county: !!county.trim(),
        has_country: !!country,
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

  const handleCountryChange = (value: string) => {
    setCountry(value);
    // Reset county when country changes
    setCounty("");
    setIsCountyOther(false);
  };

  const handleCountySelectChange = (value: string) => {
    if (value === "__other__") {
      setIsCountyOther(true);
      setCounty("");
    } else {
      setCounty(value);
    }
  };

  // Filter out top countries from the full list to avoid duplicates
  const otherCountries = ALL_COUNTRIES.filter(
    (c) => !TOP_COUNTRIES.some((tc) => tc.code === c.code)
  );

  return (
    <AlertDialog open>
      <AlertDialogContent
        className="max-w-lg max-sm:h-screen max-sm:w-screen max-sm:max-w-none max-sm:rounded-none sm:max-w-xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <User aria-hidden="true" className="size-6 text-primary" />
            <AlertDialogTitle>Additional Information</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Please provide additional information to complete your profile.
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
              This information helps your club manage your membership and keep
              your details up to date.
            </p>
          </div>
        </div>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto py-4 sm:max-h-none">
          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              disabled={isSubmitting || isSkipping}
              id="phone"
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+353 87 123 4567"
              type="tel"
              value={phone}
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
          </div>

          {/* Street Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              disabled={isSubmitting || isSkipping}
              id="address"
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
              value={address}
            />
          </div>

          {/* Address Line 2 */}
          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2</Label>
            <Input
              disabled={isSubmitting || isSkipping}
              id="address2"
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="Apt, unit, building, etc."
              value={address2}
            />
          </div>

          {/* Town / City and Postcode row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="town">Town / City</Label>
              <Input
                disabled={isSubmitting || isSkipping}
                id="town"
                onChange={(e) => setTown(e.target.value)}
                placeholder="Dublin"
                value={town}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">
                Postcode / Eircode <span className="text-destructive">*</span>
              </Label>
              <Input
                disabled={isSubmitting || isSkipping}
                id="postcode"
                onChange={(e) => handlePostcodeChange(e.target.value)}
                placeholder="D02 XY45"
                value={postcode}
              />
            </div>
          </div>

          {/* County and Country row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* County Field - Dynamic based on country */}
            <div className="space-y-2">
              <Label htmlFor="county">
                {country === "US" ? "State" : "County"}
              </Label>
              {showCountyDropdown ? (
                <Select
                  disabled={isSubmitting || isSkipping}
                  onValueChange={handleCountySelectChange}
                  value={county}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        country === "US" ? "Select state" : "Select county"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {country === "IE" && (
                        <>
                          <SelectLabel>Irish Counties</SelectLabel>
                          {IRISH_COUNTIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {country === "US" && (
                        <>
                          <SelectLabel>US States</SelectLabel>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </>
                      )}
                      <SelectSeparator />
                      <SelectItem value="__other__">
                        Other (enter manually)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  disabled={isSubmitting || isSkipping}
                  id="county"
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder={
                    country === "US" ? "Enter state" : "Enter county/region"
                  }
                  value={county}
                />
              )}
              {isCountyOther && countyOptions && (
                <button
                  className="text-primary text-xs hover:underline"
                  onClick={() => {
                    setIsCountyOther(false);
                    setCounty("");
                  }}
                  type="button"
                >
                  Back to dropdown
                </button>
              )}
            </div>

            {/* Country Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                disabled={isSubmitting || isSkipping}
                onValueChange={handleCountryChange}
                value={country}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {/* Top countries */}
                  <SelectGroup>
                    <SelectLabel>Common</SelectLabel>
                    {TOP_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                  {/* All other countries */}
                  <SelectGroup>
                    <SelectLabel>All Countries</SelectLabel>
                    {otherCountries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
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
