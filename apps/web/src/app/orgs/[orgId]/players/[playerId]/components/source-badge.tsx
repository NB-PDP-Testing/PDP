"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { Mic } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SourceBadgeProps = {
  source?: "manual" | "voice_note";
  voiceNoteId?: Id<"voiceNotes">;
  date?: number | string;
  orgId: string;
  className?: string;
};

/**
 * Source Badge Component - Phase 8 Week 3 (US-P8-013, US-P8-014)
 *
 * Shows "From voice note (date)" badge with mic icon for records created from voice notes.
 * Badge is clickable and navigates to the voice note with deep linking.
 * Only displays if source === 'voice_note' AND voiceNoteId exists.
 */
export function SourceBadge({
  source,
  voiceNoteId,
  date,
  orgId,
  className,
}: SourceBadgeProps) {
  // Only show badge if from voice note and we have the note ID
  if (source !== "voice_note" || !voiceNoteId) {
    return null;
  }

  const dateStr = date
    ? format(typeof date === "number" ? date : new Date(date), "MMM d, yyyy")
    : "Unknown date";

  return (
    <Link
      className="inline-block"
      href={`/orgs/${orgId}/coach/voice-notes?noteId=${voiceNoteId}`}
    >
      <Badge
        className={cn(
          "cursor-pointer gap-1 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
          className
        )}
        variant="outline"
      >
        <Mic className="h-3 w-3" />
        <span className="text-xs">From voice note ({dateStr})</span>
      </Badge>
    </Link>
  );
}
