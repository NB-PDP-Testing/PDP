"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Camera, Info, Loader2, User, X } from "lucide-react";
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
import { useCurrentUser } from "@/hooks/use-current-user";

// Phone validation regex (top-level for performance)
const PHONE_REGEX = /^[\d\s\-+()]+$/;

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
  const updateProfile = useMutation(api.models.userPreferences.updateProfile);

  // Check if user has OAuth account
  const authMethod = useQuery(
    api.models.userPreferences.getUserAuthMethod,
    user?._id ? { userId: user._id } : "skip"
  ) as
    | {
        hasOAuthAccount: boolean;
        oauthProvider?: "google" | "microsoft";
      }
    | null
    | undefined;

  // Form state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
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

    if (phone.length > 0 && (!PHONE_REGEX.test(phone) || phone.length < 10)) {
      newErrors.phone =
        "Phone must be at least 10 characters and contain only digits and formatting characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      // Only send fields that can be edited
      const updateData: {
        userId: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      } = {
        userId: user._id,
        phone,
      };

      // Only include name fields if user can edit them (not OAuth)
      if (canEditName) {
        updateData.firstName = firstName;
        updateData.lastName = lastName;
      }

      await updateProfile(updateData);

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
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors({ ...errors, phone: undefined });
                }}
                placeholder="+353 123 456 7890"
                type="tel"
                value={phone}
              />
              {errors.phone && (
                <p className="text-destructive text-sm">{errors.phone}</p>
              )}
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
