"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Lock, User } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmergencyContactsSection } from "../../players/[playerId]/components/emergency-contacts-section";

const profileSchema = z.object({
  email: z.string().email("Invalid email address").or(z.literal("")),
  phone: z.string().max(30, "Phone too long"),
  address: z.string().max(200, "Address too long"),
  town: z.string().max(100, "Town too long"),
  postcode: z.string().max(20, "Postcode too long"),
  country: z.string().max(100, "Country too long"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-muted-foreground">{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock className="h-3 w-3 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Contact your admin to change</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input disabled value={value ?? ""} />
    </div>
  );
}

export default function PlayerProfilePage() {
  const profile = useQuery(api.models.adultPlayers.getMyPlayerProfile);
  const updateProfile = useMutation(api.models.adultPlayers.updateMyProfile);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: "",
      phone: "",
      address: "",
      town: "",
      postcode: "",
      country: "",
    },
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile?.player) {
      reset({
        email: profile.player.email ?? "",
        phone: profile.player.phone ?? "",
        address: profile.player.address ?? "",
        town: profile.player.town ?? "",
        postcode: profile.player.postcode ?? "",
        country: profile.player.country ?? "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile({
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        town: data.town || undefined,
        postcode: data.postcode || undefined,
        country: data.country || undefined,
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error("Failed to update profile", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
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

      {/* Personal Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Details
          </CardTitle>
          <CardDescription>
            Update your contact information. Fields with a lock icon can only be
            changed by an admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Read-only identity fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="First Name" value={player.firstName} />
              <ReadOnlyField label="Last Name" value={player.lastName} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField
                label="Date of Birth"
                value={
                  player.dateOfBirth
                    ? new Date(player.dateOfBirth).toLocaleDateString("en-GB")
                    : undefined
                }
              />
              <ReadOnlyField
                label="Gender"
                value={
                  player.gender
                    ? player.gender.charAt(0).toUpperCase() +
                      player.gender.slice(1)
                    : undefined
                }
              />
            </div>

            <Separator />

            {/* Editable contact fields */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="your@email.com"
                type="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="087 123 4567"
                type="tel"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-destructive text-xs">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-destructive text-xs">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="town">Town / City</Label>
                <Input id="town" placeholder="Dublin" {...register("town")} />
                {errors.town && (
                  <p className="text-destructive text-xs">
                    {errors.town.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="postcode">Postcode / Eircode</Label>
                <Input
                  id="postcode"
                  placeholder="D01 AB12"
                  {...register("postcode")}
                />
                {errors.postcode && (
                  <p className="text-destructive text-xs">
                    {errors.postcode.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Ireland"
                {...register("country")}
              />
              {errors.country && (
                <p className="text-destructive text-xs">
                  {errors.country.message}
                </p>
              )}
            </div>

            <Button
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <EmergencyContactsSection
        isEditable={true}
        playerIdentityId={player._id}
        playerType="adult"
      />
    </div>
  );
}
