"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { ParentSummaryCard } from "./parent-summary-card";

type EnrichedSummary = {
  _id: Id<"coachParentSummaries">;
  childName: string;
  sportName: string;
  publicSummary: {
    content: string;
    confidenceScore: number;
    generatedAt: number;
  };
  status: string;
  viewedAt?: number;
  acknowledgedAt?: number;
  createdAt: number;
};

type UnifiedInboxViewProps = {
  messages: EnrichedSummary[];
  onView: (summaryId: Id<"coachParentSummaries">) => void;
  onAcknowledge: (summaryId: Id<"coachParentSummaries">) => Promise<void>;
};

export function UnifiedInboxView({
  messages,
  onView,
  onAcknowledge,
}: UnifiedInboxViewProps) {
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div key={message._id}>
          {/* Child name and sport badge above the card */}
          <div className="mb-2 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {message.childName}
            </span>
            <Badge variant="outline">{message.sportName}</Badge>
          </div>

          {/* The actual summary card */}
          <ParentSummaryCard
            isUnread={!message.acknowledgedAt}
            onAcknowledge={onAcknowledge}
            onView={onView}
            summary={message}
          />
        </div>
      ))}
    </div>
  );
}
