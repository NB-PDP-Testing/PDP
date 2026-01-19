"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface EnquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  targetOrgId: string;
  targetOrgName: string;
}

const SUBJECT_OPTIONS = [
  "Request training schedule information",
  "Coordinate dual club commitments",
  "Discuss player development goals",
  "Request match schedule coordination",
  "Other enquiry",
] as const;

export function EnquiryModal({
  open,
  onOpenChange,
  playerIdentityId,
  playerName,
  targetOrgId,
  targetOrgName,
}: EnquiryModalProps) {
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState("");
  const [contactPreference, setContactPreference] = useState<"email" | "phone">(
    "email"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createEnquiry = useMutation(
    api.models.passportEnquiries.createPassportEnquiry
  );

  const handleSubmit = async () => {
    if (!subject) {
      toast.error("Please select a subject for your enquiry");
      return;
    }

    if (!message.trim()) {
      toast.error("Please provide a message for your enquiry");
      return;
    }

    setIsSubmitting(true);
    try {
      await createEnquiry({
        playerIdentityId,
        targetOrgId,
        subject,
        message: message.trim(),
        contactPreference,
      });

      toast.success(
        `Enquiry sent to ${targetOrgName}. They will contact you via ${contactPreference}.`
      );
      onOpenChange(false);

      // Reset form
      setSubject("");
      setMessage("");
      setContactPreference("email");
    } catch (error) {
      console.error("Failed to send enquiry:", error);
      toast.error("Failed to send enquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form on cancel
    setSubject("");
    setMessage("");
    setContactPreference("email");
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact {targetOrgName}</DialogTitle>
          <DialogDescription>
            Send an enquiry about {playerName} to {targetOrgName}. Their admin
            team will review your message and contact you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select onValueChange={setSubject} value={subject}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select a subject..." />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              className="resize-none"
              id="message"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Please provide details about your enquiry..."
              rows={6}
              value={message}
            />
            <p className="mt-1 text-muted-foreground text-xs">
              This message will be sent to the admin team at {targetOrgName}
            </p>
          </div>

          <div>
            <Label>How should they contact you?</Label>
            <RadioGroup
              className="mt-2"
              onValueChange={(value) =>
                setContactPreference(value as "email" | "phone")
              }
              value={contactPreference}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="contact-email" value="email" />
                <Label className="font-normal" htmlFor="contact-email">
                  Email me
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="contact-phone" value="phone" />
                <Label className="font-normal" htmlFor="contact-phone">
                  Call me
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={handleCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Sending..." : "Send Enquiry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
