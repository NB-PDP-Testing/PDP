"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumber } from "libphonenumber-js";
import { Loader2, Lock, MapPin, RefreshCw, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  ALL_COUNTRIES,
  getCountyOptions,
  IRISH_COUNTIES,
  TOP_COUNTRIES,
  US_STATES,
} from "@/lib/constants/address-data";
import { EmergencyContactsSection } from "../../players/[playerId]/components/emergency-contacts-section";

export default function PlayerProfilePage() {
  const profile = useQuery(api.models.adultPlayers.getMyPlayerProfile);
  const updateProfile = useMutation(api.models.adultPlayers.updateMyProfile);
  const syncNameFromAuth = useMutation(
    api.models.adultPlayers.syncNameFromAuth
  );

  const currentUser = useCurrentUser();
  const authMethod = useQuery(
    api.models.users.getUserAuthMethod,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const isOAuthUser = authMethod?.hasOAuthAccount ?? false;
  const oauthProvider = authMethod?.oauthProvider;
  const canEditName = !isOAuthUser;

  // Form state — Personal Information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Form state — Address
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [town, setTown] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [isCountyOther, setIsCountyOther] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});

  // Populate form when profile loads
  useEffect(() => {
    if (profile?.player) {
      const p = profile.player;
      const rawPhone = p.phone ?? "";
      let normalizedPhone = "";
      if (rawPhone) {
        normalizedPhone = (
          rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`
        ).replace(/\s+/g, "");
      }
      setFirstName(p.firstName ?? "");
      setLastName(p.lastName ?? "");
      setPhone(normalizedPhone);
      setAddress(p.address ?? "");
      setAddress2(p.address2 ?? "");
      setTown(p.town ?? "");
      setCounty(p.county ?? "");
      setPostcode(p.postcode ?? "");
      setCountry(p.country ?? "");
      setIsCountyOther(false);
    }
  }, [profile]);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (canEditName) {
      if (firstName.length < 2 || firstName.length > 50) {
        newErrors.firstName = "First name must be between 2 and 50 characters";
      }
      if (lastName.length < 2 || lastName.length > 50) {
        newErrors.lastName = "Last name must be between 2 and 50 characters";
      }
    }

    if (phone.length > 0) {
      try {
        const phoneNumber = parsePhoneNumber(phone);
        if (phoneNumber?.isValid()) {
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

  const countyOptions = getCountyOptions(country);
  const showCountyDropdown = countyOptions && !isCountyOther;

  const handleCountryChange = (value: string) => {
    setCountry(value);
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

  const otherCountries = ALL_COUNTRIES.filter(
    (c) => !TOP_COUNTRIES.some((tc) => tc.code === c.code)
  );

  const handleSyncName = async () => {
    setIsSyncing(true);
    try {
      await syncNameFromAuth({});
      toast.success("Name synced from your account");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to sync name"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Please fix validation errors");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        firstName: canEditName ? firstName.trim() || undefined : undefined,
        lastName: canEditName ? lastName.trim() || undefined : undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        address2: address2.trim() || undefined,
        town: town.trim() || undefined,
        county: county.trim() || undefined,
        postcode: postcode.trim() || undefined,
        country: country || undefined,
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (profile === undefined) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-2xl p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Not Found
            </CardTitle>
            <CardDescription>
              No player profile is linked to your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { player } = profile;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="font-bold text-2xl">My Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your contact details and emergency contacts.
        </p>
      </div>

      {/* OAuth info */}
      {isOAuthUser && oauthProvider && (
        <Alert>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Your name is managed by{" "}
              <strong>
                {oauthProvider === "google" ? "Google" : "Microsoft"}
              </strong>
              . If your name below is out of date, use the sync button to pull
              the latest name from your account.
            </span>
            <Button
              className="shrink-0 gap-1.5"
              disabled={isSyncing}
              onClick={handleSyncName}
              size="sm"
              variant="outline"
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync from {oauthProvider === "google" ? "Google" : "Microsoft"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Details
          </CardTitle>
          <CardDescription>
            Your contact information for club records.
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
              className={canEditName ? "" : "cursor-not-allowed bg-muted"}
              disabled={!canEditName}
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
              className={canEditName ? "" : "cursor-not-allowed bg-muted"}
              disabled={!canEditName}
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
              Used for WhatsApp messages and SMS notifications. Must be a mobile
              number.
            </p>
            {errors.phone && (
              <p className="text-destructive text-sm">{errors.phone}</p>
            )}
          </div>

          <Separator />

          {/* Read-only identity fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Date of Birth</Label>
              <div className="flex items-center gap-2">
                <Input
                  className="cursor-not-allowed bg-muted"
                  disabled
                  value={
                    player.dateOfBirth
                      ? new Date(player.dateOfBirth).toLocaleDateString("en-GB")
                      : ""
                  }
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Contact your admin to change
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Gender</Label>
              <div className="flex items-center gap-2">
                <Input
                  className="cursor-not-allowed bg-muted"
                  disabled
                  value={
                    player.gender
                      ? player.gender.charAt(0).toUpperCase() +
                        player.gender.slice(1)
                      : ""
                  }
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Contact your admin to change
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Email (read-only — login credential) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email Address</Label>
            <Input
              className="cursor-not-allowed bg-muted"
              disabled
              value={player.email ?? ""}
            />
            <p className="text-muted-foreground text-xs">
              Email is your login username and cannot be changed here.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Address</CardTitle>
              <CardDescription>
                Your home address for club records.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
              value={address}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2</Label>
            <Input
              id="address2"
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="Apartment, unit, building, etc."
              value={address2}
            />
          </div>

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
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="D02 XY45"
                value={postcode}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* County / State */}
            <div className="space-y-2">
              <Label htmlFor="county">
                {country === "US" ? "State" : "County"}
              </Label>
              {showCountyDropdown ? (
                <Select onValueChange={handleCountySelectChange} value={county}>
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

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select onValueChange={handleCountryChange} value={country}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Common</SelectLabel>
                    {TOP_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
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

      {/* Save */}
      <Button
        className="w-full sm:w-auto"
        disabled={isSaving}
        onClick={handleSave}
      >
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>

      {/* Emergency Contacts */}
      <EmergencyContactsSection
        isEditable={true}
        playerIdentityId={player._id}
        playerType="adult"
      />
    </div>
  );
}
