"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ParentActionsPersistentBannerProps = {
  pendingCount: number;
  onReviewNow: () => void;
  onRemindLater: () => void;
  onDismiss: () => void;
};

export function ParentActionsPersistentBanner({
  pendingCount,
  onReviewNow,
  onRemindLater,
  onDismiss,
}: ParentActionsPersistentBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  const handleRemindLater = () => {
    setIsVisible(false);
    onRemindLater();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Alert className="relative border-yellow-200 bg-yellow-50 text-yellow-900">
      <Info className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="flex-1">
          You have {pendingCount} pending children assignment
          {pendingCount !== 1 ? "s" : ""}.
        </span>
        <div className="flex items-center gap-2">
          <Button
            className="bg-yellow-600 hover:bg-yellow-700"
            onClick={onReviewNow}
            size="sm"
            variant="default"
          >
            Review Now
          </Button>
          <Button onClick={handleRemindLater} size="sm" variant="outline">
            Remind Me Later
          </Button>
          <Button
            className="h-8 w-8 p-0"
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
