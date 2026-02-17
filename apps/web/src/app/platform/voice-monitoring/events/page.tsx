"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

// ── Types ─────────────────────────────────────────────────────

type EventType =
  | "artifact_received"
  | "artifact_completed"
  | "artifact_failed"
  | "transcription_completed"
  | "transcription_failed"
  | "claims_extracted"
  | "claims_extraction_failed"
  | "entity_resolution_completed"
  | "entity_resolution_failed"
  | "drafts_generated"
  | "retry_initiated"
  | "all";

type PipelineStage =
  | "ingestion"
  | "transcription"
  | "claims_extraction"
  | "entity_resolution"
  | "draft_generation"
  | "confirmation"
  | "all";

// ── Event Row ─────────────────────────────────────────────────

function EventRow({ event }: { event: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const eventType = event.eventType as string;
  const timestamp = event.timestamp as number;
  const pipelineStage = event.pipelineStage as string | undefined;
  const artifactId = event.artifactId as string | undefined;
  const organizationId = event.organizationId as string | undefined;

  const isError =
    eventType.includes("failed") || eventType.includes("exceeded");
  const isSuccess =
    eventType.includes("completed") ||
    eventType.includes("generated") ||
    eventType.includes("confirmed");

  const badgeClass = isError
    ? "bg-red-100 text-red-700"
    : isSuccess
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-700";

  return (
    <>
      <tr
        className="cursor-pointer border-b transition-colors hover:bg-muted/30"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-2.5 text-muted-foreground text-xs">
          {new Date(timestamp).toLocaleString()}
        </td>
        <td className="px-4 py-2.5">
          <Badge className={badgeClass} variant="outline">
            {eventType.replace(/_/g, " ")}
          </Badge>
        </td>
        <td className="px-4 py-2.5 text-xs">{pipelineStage ?? "—"}</td>
        <td className="px-4 py-2.5 font-mono text-xs">
          {artifactId ? `${String(artifactId).slice(0, 12)}...` : "—"}
        </td>
        <td className="px-4 py-2.5 font-mono text-xs">
          {organizationId ? `${organizationId.slice(0, 10)}...` : "—"}
        </td>
        <td className="px-4 py-2.5 text-xs">
          {event.durationMs ? `${String(event.durationMs)}ms` : "—"}
        </td>
        <td className="px-4 py-2.5 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/10">
          <td className="px-4 py-3" colSpan={7}>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
            {event.errorMessage ? (
              <p className="mt-1 text-red-600 text-xs">
                Error: {String(event.errorMessage)}
              </p>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function EventsPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;
  const router = useRouter();

  const [eventTypeFilter, setEventTypeFilter] = useState<EventType>("all");
  const [stageFilter, setStageFilter] = useState<PipelineStage>("all");
  const pageSize = 50;

  useEffect(() => {
    if (user && !isPlatformStaff) {
      router.push("/orgs/current");
    }
  }, [user, isPlatformStaff, router]);

  // Use useQuery with manual pagination (getRecentEvents uses manual pagination)
  const eventsResult = useQuery(
    api.models.voicePipelineEvents.getRecentEvents,
    isPlatformStaff
      ? {
          paginationOpts: { numItems: pageSize, cursor: null },
          filters: {
            eventType:
              eventTypeFilter !== "all"
                ? (eventTypeFilter as Exclude<EventType, "all">)
                : undefined,
            pipelineStage:
              stageFilter !== "all"
                ? (stageFilter as Exclude<PipelineStage, "all">)
                : undefined,
          },
        }
      : "skip"
  );

  const isLoading = eventsResult === undefined;
  const events = (eventsResult?.page ?? []) as Record<string, unknown>[];

  return (
    <div className="container mx-auto space-y-4 px-4 py-6">
      {/* Header */}
      <div>
        <h2 className="font-semibold text-lg">Event Log</h2>
        <p className="text-muted-foreground text-sm">
          Pipeline event stream — newest first
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          onValueChange={(v) => {
            setEventTypeFilter(v as EventType);
          }}
          value={eventTypeFilter}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="artifact_received">Artifact Received</SelectItem>
            <SelectItem value="artifact_completed">
              Artifact Completed
            </SelectItem>
            <SelectItem value="artifact_failed">Artifact Failed</SelectItem>
            <SelectItem value="transcription_completed">
              Transcription Done
            </SelectItem>
            <SelectItem value="transcription_failed">
              Transcription Failed
            </SelectItem>
            <SelectItem value="claims_extracted">Claims Extracted</SelectItem>
            <SelectItem value="claims_extraction_failed">
              Claims Failed
            </SelectItem>
            <SelectItem value="entity_resolution_completed">
              Entity Resolved
            </SelectItem>
            <SelectItem value="entity_resolution_failed">
              Entity Failed
            </SelectItem>
            <SelectItem value="drafts_generated">Drafts Generated</SelectItem>
            <SelectItem value="retry_initiated">Retry Initiated</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(v) => {
            setStageFilter(v as PipelineStage);
          }}
          value={stageFilter}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="ingestion">Ingestion</SelectItem>
            <SelectItem value="transcription">Transcription</SelectItem>
            <SelectItem value="claims_extraction">Claims</SelectItem>
            <SelectItem value="entity_resolution">Entity Resolution</SelectItem>
            <SelectItem value="draft_generation">Draft Generation</SelectItem>
            <SelectItem value="confirmation">Confirmation</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-muted-foreground text-sm">
          {events.length} events
        </span>
      </div>

      {/* Event table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Timestamp</th>
              <th className="px-4 py-3 text-left font-medium">Event</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Artifact</th>
              <th className="px-4 py-3 text-left font-medium">Org</th>
              <th className="px-4 py-3 text-left font-medium">Duration</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                    <td className="px-4 py-2.5" key={j}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td
                  className="py-12 text-center text-muted-foreground"
                  colSpan={7}
                >
                  No events found
                </td>
              </tr>
            ) : (
              events.map((event, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: events may not have unique _id in this context
                <EventRow event={event} key={`${event._id ?? i}`} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Showing latest 50 events - refine filters to narrow results */}
      {!eventsResult?.isDone && events.length > 0 && (
        <p className="text-center text-muted-foreground text-xs">
          Showing latest {pageSize} events. Use filters to narrow results.
        </p>
      )}
    </div>
  );
}
