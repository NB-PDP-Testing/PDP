"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { Download, Loader2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ShareModalProps = {
  summaryId: Id<"coachParentSummaries">;
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Modal for previewing and sharing parent summary images
 * Shows generated image with download and native share options
 */
export function ShareModal({ summaryId, isOpen, onClose }: ShareModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action to generate shareable image
  const generateImage = useAction(
    api.actions.coachParentSummaries.generateShareableImage
  );

  // Mutation to track share events
  const trackShare = useMutation(
    api.models.coachParentSummaries.trackShareEvent
  );

  // Check if native share is available
  const hasNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Generate image when modal opens
  useEffect(() => {
    if (isOpen && !imageUrl && !isLoading) {
      setIsLoading(true);
      setError(null);

      generateImage({ summaryId })
        .then((url) => {
          setImageUrl(url);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to generate image:", err);
          setError("Failed to generate image. Please try again.");
          setIsLoading(false);
        });
    }
  }, [isOpen, summaryId, imageUrl, isLoading, generateImage]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImageUrl(null);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // Download image
  const handleDownload = async () => {
    if (!imageUrl) {
      toast.error("Image not ready");
      return;
    }

    try {
      // Fetch image as blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `playerarc-feedback-${new Date().toISOString().split("T")[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Track download
      await trackShare({
        summaryId,
        shareDestination: "download",
      });

      toast.success("Image downloaded!");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download image");
    }
  };

  // Native share
  const handleNativeShare = async () => {
    if (!(imageUrl && hasNativeShare)) {
      return;
    }

    try {
      // Fetch image as blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create File for sharing
      const file = new File([blob], "feedback.png", { type: "image/png" });

      // Share using Web Share API
      await navigator.share({
        files: [file],
      });

      // Track share
      await trackShare({
        summaryId,
        shareDestination: "native_share",
      });

      toast.success("Shared successfully!");
    } catch (err) {
      // User cancelled share or error occurred
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Share failed:", err);
        toast.error("Failed to share image");
      }
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground text-sm">
                Generating preview...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-center">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Image preview */}
          {imageUrl && !isLoading && (
            <>
              <div className="overflow-hidden rounded-lg border">
                <img
                  alt="Share preview"
                  className="h-auto w-full"
                  src={imageUrl}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {/* Download button - Downloads as image */}
                <Button
                  className="flex-1"
                  onClick={handleDownload}
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Image
                </Button>

                {/* Native share button */}
                {hasNativeShare && (
                  <Button
                    className="flex-1"
                    onClick={handleNativeShare}
                    variant="default"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
