"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumber } from "libphonenumber-js";
import { Camera, Info, Loader2, MapPin, User, X } from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/interactions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

import { PhoneInput } from "@/components/ui/phone-input";
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

import { useCurrentUser } from "@/hooks/use-current-user";
import {
  ALL_COUNTRIES,
  getCountyOptions,
  IRISH_COUNTIES,
  TOP_COUNTRIES,
  US_STATES,
} from "@/lib/constants/address-data";

/**
 * Profile Settings Dialog
 *
 * Modal dialog for editing user profile information.
 * OAuth-aware: Fields managed by OAuth providers (Google/Microsoft) are read-only.
 *
 * Desktop: Centered modal (700px max-width)
 * Mobile: Bottom sheet with scrollable content
 */
export function ProfileSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const user = useCurrentUser();
  const updateProfileWithSync = useMutation(
    api.models.userProfiles.updateProfileWithSync
  );

  // Check if user has OAuth account
  const authMethod = useQuery(
    api.models.users.getUserAuthMethod,
    user?._id ? { userId: user._id } : "skip"
  );

  // Normalize phone to E.164 format (must start with +)
  const initialPhone = user?.phone
    ? user.phone.startsWith("+")
      ? user.phone
      : `+${user.phone}`
    : "";

  // Form state - Personal Information
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(initialPhone);

  // Form state - Address (Phase 0.7)
  const [address, setAddress] = useState(user?.address || "");
  const [address2, setAddress2] = useState(user?.address2 || "");
  const [town, setTown] = useState(user?.town || "");
  const [county, setCounty] = useState(user?.county || "");
  const [postcode, setPostcode] = useState(user?.postcode || "");
  const [country, setCountry] = useState(user?.country || "");

  // Track if "Other" was selected for county dropdown
  const [isCountyOther, setIsCountyOther] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});

  // Determine if fields are editable
  const isOAuthUser = authMethod?.hasOAuthAccount ?? false;
  const oauthProvider = authMethod?.oauthProvider;
  const canEditName = !isOAuthUser;

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.name) {
      return "U";
    }
    const nameParts = user.name.split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return nameParts[0][0].toUpperCase();
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    // Only validate name fields if user can edit them
    if (canEditName) {
      if (firstName.length < 2 || firstName.length > 50) {
        newErrors.firstName = "First name must be between 2 and 50 characters";
      }

      if (lastName.length < 2 || lastName.length > 50) {
        newErrors.lastName = "Last name must be between 2 and 50 characters";
      }
    }

    // Validate phone number format
    if (phone.length > 0) {
      try {
        const phoneNumber = parsePhoneNumber(phone);
        if (phoneNumber?.isValid()) {
          // Check if it's a mobile number (not landline)
          const type = phoneNumber.getType();
          if (type === "FIXED_LINE") {
            newErrors.phone =
              "Please enter a mobile number. Landlines cannot receive WhatsApp messages or SMS.";
          }
        } else {
          newErrors.phone = "Please enter a valid phone number";
        }
      } catch {
        newErrors.phone = "Please enter a valid phone number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Determine county field type based on country
  const countyOptions = getCountyOptions(country);
  const showCountyDropdown = countyOptions && !isCountyOther;

  // Handle postcode change - auto uppercase
  const handlePostcodeChange = (value: string) => {
    setPostcode(value.toUpperCase());
  };

  // Handle country change - reset county
  const handleCountryChange = (value: string) => {
    setCountry(value);
    setCounty("");
    setIsCountyOther(false);
  };

  // Handle county select change
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

  // Handle save
  const handleSave = async () => {
    if (!user?._id) {
      toast.error("User not found");
      return;
    }

    if (!validate()) {
      toast.error("Please fix validation errors");
      return;
    }

    setIsSaving(true);
    try {
      // Build update data - use updateProfileWithSync which syncs to guardianIdentities
      const updateData: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        address?: string;
        address2?: string;
        town?: string;
        county?: string;
        postcode?: string;
        country?: string;
      } = {
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        address2: address2.trim() || undefined,
        town: town.trim() || undefined,
        county: county.trim() || undefined,
        postcode: postcode.trim() || undefined,
        country: country || undefined,
      };

      // Only include name fields if user can edit them (not OAuth)
      if (canEditName) {
        updateData.firstName = firstName.trim();
        updateData.lastName = lastName.trim();
      }

      await updateProfileWithSync(updateData);

      toast.success("Profile updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Format member since date
  const formatMemberSince = () => {
    if (!user?.createdAt) {
      return "Unknown";
    }
    const date = new Date(user.createdAt);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <ResponsiveDialog
      contentClassName="sm:max-w-[650px]"
      description="Manage your personal information"
      onOpenChange={onOpenChange}
      open={open}
      title="Your Profile"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-1">
        {/* OAuth Info Alert */}
        {isOAuthUser && oauthProvider && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your profile is managed by{" "}
              <strong>
                {oauthProvider === "google" ? "Google" : "Microsoft"}
              </strong>
              . To update your name or photo, please edit your{" "}
              {oauthProvider === "google" ? "Google" : "Microsoft"} account
              settings. You can update your phone number below.
            </AlertDescription>
          </Alert>
        )}

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Your profile picture is displayed across the platform
                </CardDescription>
              </div>
              {isOAuthUser && oauthProvider && (
                <Badge variant="secondary">
                  Synced from{" "}
                  {oauthProvider === "google" ? "Google" : "Microsoft"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  alt={user.name || "User"}
                  src={user.image || undefined}
                />
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button disabled size="sm" variant="outline">
                    <Camera className="mr-2 h-4 w-4" />
                    Change Photo
                  </Button>
                  <Button disabled size="sm" variant="ghost">
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  {isOAuthUser
                    ? `Your photo is synced from your ${oauthProvider === "google" ? "Google" : "Microsoft"} account.`
                    : "Avatar upload coming soon. Contact support to update your photo."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your name and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* First Name */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                {isOAuthUser && oauthProvider && (
                  <Badge className="text-xs" variant="secondary">
                    Synced from{" "}
                    {oauthProvider === "google" ? "Google" : "Microsoft"}
                  </Badge>
                )}
              </div>
              <Input
                className={isOAuthUser ? "cursor-not-allowed bg-muted" : ""}
                disabled={isOAuthUser}
                id="firstName"
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setErrors({ ...errors, firstName: undefined });
                }}
                placeholder="Enter your first name"
                value={firstName}
              />
              {errors.firstName && (
                <p className="text-destructive text-sm">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                {isOAuthUser && oauthProvider && (
                  <Badge className="text-xs" variant="secondary">
                    Synced from{" "}
                    {oauthProvider === "google" ? "Google" : "Microsoft"}
                  </Badge>
                )}
              </div>
              <Input
                className={isOAuthUser ? "cursor-not-allowed bg-muted" : ""}
                disabled={isOAuthUser}
                id="lastName"
                onChange={(e) => {
                  setLastName(e.target.value);
                  setErrors({ ...errors, lastName: undefined });
                }}
                placeholder="Enter your last name"
                value={lastName}
              />
              {errors.lastName && (
                <p className="text-destructive text-sm">{errors.lastName}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Mobile Number <span className="text-destructive">*</span>
              </Label>
              <PhoneInput
                countries={["IE", "GB", "US"] as CountryCode[]}
                defaultCountry={"IE" as CountryCode}
                id="phone"
                onChange={(value) => {
                  setPhone(value || "");
                  setErrors({ ...errors, phone: undefined });
                }}
                placeholder="Enter mobile number"
                value={phone}
              />
              <p className="text-muted-foreground text-xs">
                Used for WhatsApp messages and SMS notifications. Must be a
                mobile number.
              </p>
              {errors.phone && (
                <p className="text-destructive text-sm">{errors.phone}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address Section (Phase 0.7) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Address</CardTitle>
                <CardDescription>
                  Your home address for club records
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Street Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
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
                id="address2"
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="Apartment, unit, building, etc."
                value={address2}
              />
            </div>

            {/* Town / City and Postcode row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="town">Town / City</Label>
                <Input
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
                <Select onValueChange={handleCountryChange} value={country}>
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
          </CardContent>
        </Card>

        {/* Account Information (Read-Only) */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              These fields are managed by the system and cannot be changed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email (Read-Only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input
                  className="cursor-not-allowed bg-muted"
                  disabled
                  id="email"
                  readOnly
                  value={user.email}
                />
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <span className="text-muted-foreground text-xs">🔒</span>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Email is your login username and cannot be changed here. Contact
                support if you need to update your email.
              </p>
            </div>

            {/* Member Since */}
            <div className="space-y-2">
              <Label>Member Since</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {formatMemberSince()}
              </div>
            </div>

            {/* Platform Staff Badge (if applicable) */}
            {user.isPlatformStaff && (
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-semibold">Platform Staff</span> - This
                  role is managed by administrators and grants access to
                  platform-wide settings.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer with action buttons */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button onClick={() => onOpenChange(false)} variant="outline">
          Cancel
        </Button>
        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
