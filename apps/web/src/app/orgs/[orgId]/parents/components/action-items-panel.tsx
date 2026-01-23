"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ActionItemsPanelProps = {
  unreadCount: number;
  onReviewClick: () => void;
};

export function ActionItemsPanel({
  unreadCount,
  onReviewClick,
}: ActionItemsPanelProps) {
  if (unreadCount === 0) {
    return null;
  }

  return (
    <Alert className="mb-6 border-blue-500 bg-blue-50">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle>
        You have {unreadCount} new coach update{unreadCount > 1 ? "s" : ""}
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 flex items-center justify-between">
          <span>Your coaches have shared new feedback and updates.</span>
          <Button onClick={onReviewClick} size="sm">
            Review Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
