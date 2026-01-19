"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type SharingContactSettingsProps = {
  organizationId: string;
};

export function SharingContactSettings({
  organizationId,
}: SharingContactSettingsProps) {
  const [sharingContactMode, setSharingContactMode] = useState<
    "direct" | "enquiry" | "none" | ""
  >("");
  const [sharingContactName, setSharingContactName] = useState("");
  const [sharingContactEmail, setSharingContactEmail] = useState("");
  const [sharingContactPhone, setSharingContactPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Get organization data
  const organization = useQuery(api.models.organizations.getOrganization, {
    organizationId,
  });

  const updateOrganizationSharingContact = useMutation(
    api.models.organizations.updateOrganizationSharingContact
  );

  // Populate form when organization loads
  // Default to "enquiry" mode when no mode is set (null/undefined)
  useEffect(() => {
    if (organization) {
      setSharingContactMode(
        (organization.sharingContactMode as "direct" | "enquiry") || "enquiry"
      );
      setSharingContactName(organization.sharingContactName || "");
      setSharingContactEmail(organization.sharingContactEmail || "");
      setSharingContactPhone(organization.sharingContactPhone || "");
    }
  }, [organization]);

  const handleSaveSharingContact = async () => {
    // Validation
    if (
      sharingContactMode === "direct" &&
      !(sharingContactEmail || sharingContactPhone)
    ) {
      toast.error(
        "Please provide at least an email or phone number for direct contact"
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateOrganizationSharingContact({
        organizationId,
        sharingContactMode: sharingContactMode || null,
        sharingContactName: sharingContactName.trim() || null,
        sharingContactEmail: sharingContactEmail.trim() || null,
        sharingContactPhone: sharingContactPhone.trim() || null,
      });

      toast.success("Sharing contact settings updated successfully");
    } catch (error) {
      console.error("Error updating sharing contact settings:", error);
      toast.error("Failed to update sharing contact settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!organization) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sharing Contact Settings</CardTitle>
        <CardDescription>
          Configure how coaches from other organizations can contact you about
          shared players
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact Mode Selection */}
        <div className="space-y-3">
          <Label>Contact Mode</Label>
          <RadioGroup
            onValueChange={(value) =>
              setSharingContactMode(value as "direct" | "enquiry" | "none")
            }
            value={sharingContactMode}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="mode-enquiry" value="enquiry" />
              <Label className="font-normal" htmlFor="mode-enquiry">
                Enquiry system (default, managed by admins)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="mode-direct" value="direct" />
              <Label className="font-normal" htmlFor="mode-direct">
                Direct contact (share coach contact info)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="mode-none" value="none" />
              <Label className="font-normal" htmlFor="mode-none">
                No public contact
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Direct Contact Details (shown when direct mode is selected) */}
        {sharingContactMode === "direct" && (
          <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
            <p className="font-medium text-sm">Direct Contact Information</p>
            <p className="text-muted-foreground text-xs">
              This information will be displayed to coaches who view shared
              passports
            </p>

            <div className="space-y-2">
              <Label htmlFor="sharingContactName">Contact Person Name</Label>
              <Input
                id="sharingContactName"
                onChange={(e) => setSharingContactName(e.target.value)}
                placeholder="e.g., Head Coach Name"
                value={sharingContactName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sharingContactEmail">Email</Label>
              <Input
                id="sharingContactEmail"
                onChange={(e) => setSharingContactEmail(e.target.value)}
                placeholder="contact@organization.com"
                type="email"
                value={sharingContactEmail}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sharingContactPhone">Phone</Label>
              <Input
                id="sharingContactPhone"
                onChange={(e) => setSharingContactPhone(e.target.value)}
                placeholder="+353 123 456 789"
                type="tel"
                value={sharingContactPhone}
              />
            </div>
          </div>
        )}

        {/* Enquiry System Info (shown when enquiry mode is selected) */}
        {sharingContactMode === "enquiry" && (
          <div className="space-y-2 rounded-lg border bg-blue-50 p-4">
            <p className="font-medium text-sm">Enquiry System</p>
            <p className="text-muted-foreground text-xs">
              Coaches from other organizations will be able to submit enquiries
              about shared players. Enquiries will appear in your admin enquiry
              queue for review and response.
            </p>
          </div>
        )}

        {/* Save Button */}
        <Button disabled={isSaving} onClick={handleSaveSharingContact}>
          {isSaving ? "Saving..." : "Save Contact Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
