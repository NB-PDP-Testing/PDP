"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EnquiryModal } from "./enquiry-modal";

type ContactOrganizationButtonProps = {
  organizationId: string;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
};

export function ContactOrganizationButton({
  organizationId,
  playerIdentityId,
  playerName,
  variant = "outline",
  size = "sm",
}: ContactOrganizationButtonProps) {
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Get organization contact settings
  const organization = useQuery(api.models.organizations.getOrganization, {
    organizationId,
  });

  if (!organization) {
    return null;
  }

  const {
    sharingContactMode,
    sharingContactName,
    sharingContactEmail,
    sharingContactPhone,
  } = organization;

  // Don't show button if no contact mode is set
  if (!sharingContactMode) {
    return null;
  }

  const handleClick = () => {
    if (sharingContactMode === "direct") {
      setShowContactInfo(true);
    } else if (sharingContactMode === "enquiry") {
      setShowEnquiryModal(true);
    }
  };

  return (
    <>
      <Button onClick={handleClick} size={size} variant={variant}>
        <MessageSquare className="mr-1 h-3 w-3" />
        Contact
      </Button>

      {/* Direct Contact Info Dialog */}
      <Dialog onOpenChange={setShowContactInfo} open={showContactInfo}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Contact {organization.name}</DialogTitle>
            <DialogDescription>
              Use the contact information below to reach out about {playerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {sharingContactName && (
              <div>
                <p className="font-medium text-sm">Contact Person</p>
                <p className="text-muted-foreground">{sharingContactName}</p>
              </div>
            )}

            {sharingContactEmail && (
              <div>
                <p className="mb-1 font-medium text-sm">Email</p>
                <a
                  className="flex items-center text-blue-600 hover:underline"
                  href={`mailto:${sharingContactEmail}`}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {sharingContactEmail}
                </a>
              </div>
            )}

            {sharingContactPhone && (
              <div>
                <p className="mb-1 font-medium text-sm">Phone</p>
                <a
                  className="flex items-center text-blue-600 hover:underline"
                  href={`tel:${sharingContactPhone}`}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  {sharingContactPhone}
                </a>
              </div>
            )}

            {!(sharingContactEmail || sharingContactPhone) && (
              <p className="text-muted-foreground text-sm">
                No contact information is currently available.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enquiry Modal */}
      {sharingContactMode === "enquiry" && (
        <EnquiryModal
          onOpenChange={setShowEnquiryModal}
          open={showEnquiryModal}
          playerIdentityId={playerIdentityId}
          playerName={playerName}
          targetOrgId={organizationId}
          targetOrgName={organization.name}
        />
      )}
    </>
  );
}
