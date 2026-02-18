import {
  CheckCircle,
  Edit,
  FileText,
  Inbox,
  Mic,
  RotateCw,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Event type icons mapping
const EVENT_ICONS = {
  artifact_received: Inbox,
  artifact_completed: CheckCircle,
  artifact_failed: XCircle,
  transcription_started: Mic,
  transcription_completed: Mic,
  transcription_failed: XCircle,
  claims_extraction_started: FileText,
  claims_extracted: FileText,
  claims_extraction_failed: XCircle,
  entity_resolution_started: Users,
  entity_resolution_completed: Users,
  entity_needs_disambiguation: Users,
  draft_generation_started: Edit,
  drafts_generated: Edit,
  draft_confirmed: CheckCircle,
  draft_rejected: XCircle,
  retry_initiated: RotateCw,
  circuit_breaker_opened: Zap,
  circuit_breaker_closed: Zap,
} as const;

// Pipeline event type
type PipelineEvent = {
  _id: string;
  eventId: string;
  eventType: string;
  artifactId?: string;
  voiceNoteId?: string;
  organizationId?: string;
  pipelineStage?: string;
  timestamp: number;
  timeWindow: string;
  metadata?: {
    claimCount?: number;
    entityCount?: number;
    aiCost?: number;
    retryAttempt?: number;
    sourceChannel?: string;
    draftCount?: number;
  };
};

type ActivityFeedProps = {
  events: PipelineEvent[] | undefined;
};

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

function eventMessage(event: PipelineEvent): string {
  const id = event.artifactId?.slice(0, 8) ?? "unknown";
  switch (event.eventType) {
    case "artifact_received":
      return `Artifact ${id} received`;
    case "artifact_completed":
      return `Artifact ${id} completed successfully`;
    case "artifact_failed":
      return `Artifact ${id} failed`;
    case "transcription_completed":
      return `Transcription complete for ${id}`;
    case "claims_extracted":
      return `Claims extracted from ${id}`;
    case "entity_resolution_completed":
      return `Entities resolved for ${id}`;
    case "drafts_generated":
      return `Drafts generated for ${id}`;
    case "retry_initiated":
      return `Retry initiated for ${id}`;
    case "circuit_breaker_opened":
      return "Circuit breaker opened - pipeline paused";
    case "circuit_breaker_closed":
      return "Circuit breaker closed - pipeline resumed";
    default:
      return `${event.eventType.replace(/_/g, " ")} - ${id}`;
  }
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] md:h-[500px]">
      <div className="space-y-4">
        {events.map((event) => {
          const IconComponent =
            EVENT_ICONS[event.eventType as keyof typeof EVENT_ICONS] || Inbox;
          return (
            <div
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              data-event-item
              key={event._id}
            >
              <div className="mt-0.5 rounded-full bg-muted p-2">
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-sm">{eventMessage(event)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {relativeTime(event.timestamp)}
                  </span>
                  {event.metadata?.claimCount && (
                    <Badge className="text-xs" variant="secondary">
                      {event.metadata.claimCount} claims
                    </Badge>
                  )}
                  {event.metadata?.entityCount && (
                    <Badge className="text-xs" variant="secondary">
                      {event.metadata.entityCount} entities
                    </Badge>
                  )}
                  {event.metadata?.draftCount && (
                    <Badge className="text-xs" variant="secondary">
                      {event.metadata.draftCount} drafts
                    </Badge>
                  )}
                  {event.metadata?.aiCost && (
                    <Badge className="text-xs" variant="outline">
                      ${event.metadata.aiCost.toFixed(4)}
                    </Badge>
                  )}
                  {event.metadata?.retryAttempt && (
                    <Badge className="text-xs" variant="destructive">
                      Retry #{event.metadata.retryAttempt}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
