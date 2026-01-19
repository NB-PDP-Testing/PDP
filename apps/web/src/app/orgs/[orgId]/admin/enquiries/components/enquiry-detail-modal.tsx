"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Clock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type EnquiryDetailModalProps = {
  enquiry: {
    _id: Id<"passportEnquiries">;
    playerName: string;
    sourceOrgName: string;
    sourceUserName: string;
    sourceUserEmail: string;
    subject: string;
    message: string;
    contactPreference: "email" | "phone";
    status: "open" | "processing" | "closed";
    closedAt?: number;
    closedByName?: string;
    resolution?: string;
    createdAt: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EnquiryDetailModal({
  enquiry,
  open,
  onOpenChange,
}: EnquiryDetailModalProps) {
  const [status, setStatus] = useState<"open" | "processing" | "closed">(
    enquiry.status
  );
  const [resolution, setResolution] = useState(enquiry.resolution || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateStatus = useMutation(
    api.models.passportEnquiries.updateEnquiryStatus
  );

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleStatusUpdate = async () => {
    if (status === "closed" && !resolution.trim()) {
      toast.error("Resolution comment is required when closing an enquiry");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateStatus({
        enquiryId: enquiry._id,
        status,
        resolution: status === "closed" ? resolution.trim() : undefined,
      });

      toast.success(
        status === "closed"
          ? "Enquiry closed successfully"
          : `Enquiry marked as ${status}`
      );

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update enquiry:", error);
      toast.error("Failed to update enquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges =
    status !== enquiry.status ||
    (status === "closed" && resolution !== enquiry.resolution);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Enquiry Details</DialogTitle>
          <DialogDescription>
            Review and manage this passport enquiry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Player and Subject */}
          <div>
            <Label className="text-sm">Subject</Label>
            <p className="mt-1 font-medium">{enquiry.subject}</p>
          </div>

          <div>
            <Label className="text-sm">Player</Label>
            <p className="mt-1">{enquiry.playerName}</p>
          </div>

          <Separator />

          {/* From Coach */}
          <div>
            <Label className="mb-2 flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              From Coach
            </Label>
            <div className="space-y-1 rounded-lg bg-gray-50 p-3">
              <p className="font-medium">{enquiry.sourceUserName}</p>
              <p className="text-gray-600 text-sm">{enquiry.sourceOrgName}</p>
              <div className="flex items-center gap-1 text-blue-600 text-sm">
                <Mail className="h-3 w-3" />
                <a
                  className="hover:underline"
                  href={`mailto:${enquiry.sourceUserEmail}`}
                >
                  {enquiry.sourceUserEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <Label className="text-sm">Message</Label>
            <div className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3">
              {enquiry.message}
            </div>
          </div>

          {/* Contact Preference */}
          <div>
            <Label className="text-sm">Preferred Contact Method</Label>
            <div className="mt-1 flex items-center gap-2">
              {enquiry.contactPreference === "email" ? (
                <>
                  <Mail className="h-4 w-4 text-gray-600" />
                  <span>Email</span>
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 text-gray-600" />
                  <span>Phone</span>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-3 w-3" />
              <span>Received: {formatDate(enquiry.createdAt)}</span>
            </div>
            {enquiry.status === "closed" && enquiry.closedAt && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-3 w-3" />
                <span>
                  Closed: {formatDate(enquiry.closedAt)}
                  {enquiry.closedByName && ` by ${enquiry.closedByName}`}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Status Management */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              disabled={enquiry.status === "closed"}
              onValueChange={(value) =>
                setStatus(value as "open" | "processing" | "closed")
              }
              value={status}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-600" variant="default">
                      Open
                    </Badge>
                    <span>New enquiry</span>
                  </div>
                </SelectItem>
                <SelectItem value="processing">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-600" variant="default">
                      Processing
                    </Badge>
                    <span>Working on it</span>
                  </div>
                </SelectItem>
                <SelectItem value="closed">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Closed</Badge>
                    <span>Resolved</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resolution (shown when closing or already closed) */}
          {(status === "closed" || enquiry.status === "closed") && (
            <div>
              <Label htmlFor="resolution">
                Resolution {status === "closed" && "(Required)"}
              </Label>
              <Textarea
                className="mt-1"
                disabled={enquiry.status === "closed"}
                id="resolution"
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe what action was taken (e.g., 'Called coach and discussed training schedule coordination')"
                rows={4}
                value={resolution}
              />
              <p className="mt-1 text-muted-foreground text-xs">
                Document what action was taken to resolve this enquiry
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Close
          </Button>
          {enquiry.status !== "closed" && (
            <Button
              disabled={!hasChanges || isSubmitting}
              onClick={handleStatusUpdate}
            >
              {isSubmitting
                ? "Updating..."
                : status === "closed"
                  ? "Close Enquiry"
                  : "Update Status"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
