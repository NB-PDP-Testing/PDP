"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Settings, Shield, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type GuardianSettingsProps = {
  guardianIdentity: {
    _id: Id<"guardianIdentities">;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    verificationStatus?: string;
  } | null;
};

export function GuardianSettings({ guardianIdentity }: GuardianSettingsProps) {
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [processingLinkId, setProcessingLinkId] = useState<string | null>(null);

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
    if (!guardianIdentity) {
      return;
    }

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

  if (!guardianIdentity) {
    return null;
  }

  return (
    <>
      <Button
        className="gap-2"
        onClick={() => setShowSettingsDialog(true)}
        variant="outline"
      >
        <Settings className="h-4 w-4" />
        Guardian Settings
      </Button>

      <Dialog onOpenChange={setShowSettingsDialog} open={showSettingsDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Guardian Settings
            </DialogTitle>
            <DialogDescription>
              Manage your privacy and consent settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Guardian Profile Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {guardianIdentity.firstName} {guardianIdentity.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">
                      {guardianIdentity.email}
                    </span>
                  </div>
                  {guardianIdentity.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">
                        {guardianIdentity.phone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Verification:</span>
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
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Children & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent>
                {guardianPlayerLinks === undefined ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : guardianPlayerLinks.length === 0 ? (
                  <div className="py-6 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground text-sm">
                      No children linked yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {guardianPlayerLinks.map((link) => {
                      const linkId = `${guardianIdentity._id}-${link.player._id}`;
                      const isProcessing = processingLinkId === linkId;

                      return (
                        <div
                          className="rounded-lg border p-4"
                          key={link.player._id}
                        >
                          <div className="space-y-4">
                            {/* Child Info */}
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">
                                  {link.player.firstName} {link.player.lastName}
                                </h4>
                                <p className="text-muted-foreground text-sm">
                                  DOB: {link.player.dateOfBirth}
                                </p>
                                <div className="mt-2 flex gap-2">
                                  <Badge variant="outline">
                                    {link.link.relationship}
                                  </Badge>
                                  {link.link.isPrimary && (
                                    <Badge variant="default">
                                      Primary Contact
                                    </Badge>
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
                                    Allow other clubs to see your relationship
                                  </p>
                                </div>
                                <Switch
                                  checked={link.link.consentedToSharing}
                                  disabled={isProcessing}
                                  id={linkId}
                                  onCheckedChange={(checked) =>
                                    handleConsentChange(
                                      link.player._id,
                                      checked
                                    )
                                  }
                                />
                              </div>

                              {link.link.consentedToSharing && (
                                <div className="rounded-md bg-blue-50 p-3 text-blue-900 text-xs">
                                  <p className="font-medium">
                                    ✓ Sharing enabled
                                  </p>
                                  <p className="mt-1">
                                    Other organizations where{" "}
                                    {link.player.firstName} enrolls can identify
                                    you as their guardian.
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
                                  {link.link.hasParentalResponsibility
                                    ? "Yes"
                                    : "No"}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Can Collect from Training:
                                </span>
                                <Badge variant="outline">
                                  {link.link.canCollectFromTraining
                                    ? "Yes"
                                    : "No"}
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
            <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Shield className="h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="space-y-1">
                <h4 className="font-semibold text-blue-800 text-sm">
                  About Cross-Organization Sharing
                </h4>
                <p className="text-blue-700 text-sm">
                  When enabled, other sports clubs your child joins can see your
                  guardian relationship, making registration easier. Your
                  personal information is only shared with clubs where your
                  child is actively enrolled.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
