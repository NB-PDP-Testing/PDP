"use client";

import { useMutation, useQuery } from "convex/react";
import { Settings, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "../../../../../../../packages/backend/convex/_generated/api";
import type { Id } from "../../../../../../../packages/backend/convex/_generated/dataModel";

export default function GuardianSettingsPage() {
  const [processingLinkId, setProcessingLinkId] = useState<string | null>(null);

  // Get current user's guardian identity
  const guardianIdentity = useQuery(
    api.models.guardianIdentities.getGuardianForCurrentUser
  );

  // Get all guardian-player links
  const guardianPlayerLinks = useQuery(
    api.models.guardianPlayerLinks.getPlayersForGuardian,
    guardianIdentity ? { guardianIdentityId: guardianIdentity._id } : "skip"
  );

  const updateConsent = useMutation(
    api.models.guardianPlayerLinks.updateLinkConsent
  );

  const handleConsentChange = async (
    playerIdentityId: Id<"playerIdentities">,
    newConsent: boolean
  ) => {
    if (!guardianIdentity) return;

    const linkId = `${guardianIdentity._id}-${playerIdentityId}`;
    setProcessingLinkId(linkId);

    try {
      await updateConsent({
        guardianIdentityId: guardianIdentity._id,
        playerIdentityId,
        consentedToSharing: newConsent,
      });

      toast.success(
        newConsent
          ? "Cross-organization sharing enabled"
          : "Cross-organization sharing disabled"
      );
    } catch (error) {
      console.error("Failed to update consent:", error);
      toast.error("Unable to update consent setting. Please try again.");
    } finally {
      setProcessingLinkId(null);
    }
  };

  if (guardianIdentity === undefined || guardianPlayerLinks === undefined) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!guardianIdentity) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">
                No Guardian Profile Found
              </h3>
              <p className="text-muted-foreground text-sm">
                You don't have a guardian profile yet. Contact your
                organization's admin if you believe this is an error.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Settings className="h-8 w-8" />
          <h1 className="font-bold text-3xl">Guardian Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your privacy and consent settings for each child
        </p>
      </div>

      {/* Guardian Info */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Name:</span>
              <span className="font-medium">
                {guardianIdentity.firstName} {guardianIdentity.lastName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Email:</span>
              <span className="font-medium">{guardianIdentity.email}</span>
            </div>
            {guardianIdentity.phone && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Phone:</span>
                <span className="font-medium">{guardianIdentity.phone}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Verification:
              </span>
              <Badge variant="secondary">
                {guardianIdentity.verificationStatus === "email_verified"
                  ? "Email Verified"
                  : guardianIdentity.verificationStatus === "id_verified"
                    ? "ID Verified"
                    : "Unverified"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Children & Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Children & Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {guardianPlayerLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 font-semibold text-lg">No Children Linked</h3>
              <p className="text-muted-foreground text-sm">
                You don't have any children linked to your guardian profile yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {guardianPlayerLinks.map((link) => {
                const linkId = `${guardianIdentity._id}-${link.player._id}`;
                const isProcessing = processingLinkId === linkId;

                return (
                  <div className="rounded-lg border p-4" key={link.player._id}>
                    <div className="space-y-4">
                      {/* Child Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">
                            {link.player.firstName} {link.player.lastName}
                          </h4>
                          <p className="text-muted-foreground text-sm">
                            Date of Birth: {link.player.dateOfBirth}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Badge variant="outline">
                              {link.link.relationship}
                            </Badge>
                            {link.link.isPrimary && (
                              <Badge variant="default">Primary Contact</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Privacy Settings */}
                      <div className="space-y-3 rounded-lg bg-muted/30 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-sm" htmlFor={linkId}>
                              Cross-Organization Sharing
                            </Label>
                            <p className="text-muted-foreground text-xs">
                              Allow other clubs to see your relationship with
                              this child
                            </p>
                          </div>
                          <Switch
                            checked={link.link.consentedToSharing}
                            disabled={isProcessing}
                            id={linkId}
                            onCheckedChange={(checked) =>
                              handleConsentChange(link.player._id, checked)
                            }
                          />
                        </div>

                        {link.link.consentedToSharing && (
                          <div className="rounded-md bg-blue-50 p-3 text-blue-900 text-xs">
                            <p className="font-medium">
                              ✓ Sharing enabled for this child
                            </p>
                            <p className="mt-1">
                              Other organizations where {link.player.firstName}{" "}
                              may enroll will be able to identify you as their
                              guardian, making the enrollment process easier.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Additional Permissions */}
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Parental Responsibility:
                          </span>
                          <Badge variant="outline">
                            {link.link.hasParentalResponsibility ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Can Collect from Training:
                          </span>
                          <Badge variant="outline">
                            {link.link.canCollectFromTraining ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">
                About Cross-Organization Sharing
              </h4>
              <p className="text-muted-foreground text-sm">
                When enabled, other sports clubs your child joins can see your
                guardian relationship, making registration easier. Your personal
                information (email, phone) is only shared with clubs where your
                child is actively enrolled. You can disable this at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (for future additional settings) */}
      <div className="flex justify-end">
        <Button variant="outline">View Profile Settings</Button>
      </div>
    </div>
  );
}
