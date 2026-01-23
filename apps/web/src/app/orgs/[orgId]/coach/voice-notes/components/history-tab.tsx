"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Loader2,
  Mic,
  Quote,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";

// Format date as "Mon Jan 22, 10:30 PM"
function formatHistoryDate(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type HistoryTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

type NoteType = "training" | "match" | "general";
const NOTE_TYPES: NoteType[] = ["training", "match", "general"];

// Parse search query for smart filtering
function parseSearchQuery(query: string): {
  textQuery: string;
  typeFilter: NoteType | null;
} {
  const lower = query.toLowerCase().trim();

  // Check if query starts with or contains a type keyword
  for (const type of NOTE_TYPES) {
    // Match "training:", "training ", or just "training" at start
    if (
      lower === type ||
      lower.startsWith(`${type}:`) ||
      lower.startsWith(`${type} `)
    ) {
      const remaining = lower.replace(new RegExp(`^${type}:?\\s*`), "").trim();
      return { textQuery: remaining, typeFilter: type };
    }
  }

  return { textQuery: query.trim(), typeFilter: null };
}

export function HistoryTab({ orgId, onSuccess, onError }: HistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Convex queries and mutations
  const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
    orgId,
  });
  const deleteVoiceNote = useMutation(api.models.voiceNotes.deleteVoiceNote);

  const handleDeleteNote = async (noteId: Id<"voiceNotes">) => {
    try {
      await deleteVoiceNote({ noteId });
      onSuccess("Voice note deleted.");
    } catch (error) {
      console.error("Failed to delete note:", error);
      onError("Failed to delete note.");
    }
  };

  // Parse the search query for smart filtering
  const { textQuery, typeFilter } = parseSearchQuery(searchQuery);

  // Filter notes
  const filteredNotes = voiceNotes?.filter((note) => {
    // Type filter (from smart search)
    if (typeFilter && note.type !== typeFilter) {
      return false;
    }

    // Text search filter
    if (textQuery) {
      const query = textQuery.toLowerCase();
      const matchesTranscription = note.transcription
        ?.toLowerCase()
        .includes(query);
      const matchesSummary = note.summary?.toLowerCase().includes(query);
      const matchesInsight = note.insights.some(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query) ||
          i.playerName?.toLowerCase().includes(query)
      );
      return matchesTranscription || matchesSummary || matchesInsight;
    }

    return true;
  });

  const isLoading = voiceNotes === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl">
              Voice Note History
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {voiceNotes?.length ?? 0} note
              {(voiceNotes?.length ?? 0) !== 1 ? "s" : ""} recorded
            </CardDescription>
          </div>
        </div>

        {/* Smart search with type filter chips */}
        <div className="mt-3 space-y-2 sm:mt-4">
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
            <Input
              className="pr-9 pl-9 text-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search... (try: training, match, general)"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                className="-translate-y-1/2 absolute top-1/2 right-3 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {NOTE_TYPES.map((type) => (
              <button
                className={`rounded-full px-2.5 py-0.5 font-medium text-xs transition-colors ${
                  typeFilter === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                key={type}
                onClick={() => {
                  if (typeFilter === type) {
                    // Remove type filter
                    setSearchQuery(textQuery);
                  } else {
                    // Set type filter
                    setSearchQuery(textQuery ? `${type} ${textQuery}` : type);
                  }
                }}
                type="button"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
            {(typeFilter || textQuery) && (
              <button
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-500 text-xs hover:bg-gray-200"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredNotes && filteredNotes.length === 0 ? (
          <Empty>
            <EmptyContent>
              <EmptyMedia variant="icon">
                <Mic className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {voiceNotes?.length === 0
                  ? "No recordings yet"
                  : "No matching notes"}
              </EmptyTitle>
              <EmptyDescription>
                {voiceNotes?.length === 0
                  ? "Start recording your first voice note to capture coaching insights"
                  : "Try adjusting your search or filters"}
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredNotes?.map((note) => (
              <div
                className="rounded-lg border-2 border-gray-200 p-3 sm:p-4"
                key={note._id}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Badge className="text-xs">{note.type}</Badge>
                    {note.audioStorageId && (
                      <Badge className="text-xs" variant="outline">
                        Recorded
                      </Badge>
                    )}
                    {/* WhatsApp source indicator */}
                    {(note.source === "whatsapp_audio" ||
                      note.source === "whatsapp_text") && (
                      <Badge
                        className="flex items-center gap-1 bg-green-600 text-white text-xs hover:bg-green-600"
                        variant="default"
                      >
                        <svg
                          aria-label="WhatsApp"
                          className="h-3 w-3"
                          fill="currentColor"
                          role="img"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <title>WhatsApp</title>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp
                      </Badge>
                    )}
                    <span className="text-gray-500 text-xs sm:text-sm">
                      {formatHistoryDate(note.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Processing status */}
                    {(note.transcriptionStatus === "processing" ||
                      note.insightsStatus === "processing") && (
                      <Badge
                        className="flex items-center gap-1 text-xs"
                        variant="secondary"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="hidden sm:inline">Processing</span>
                      </Badge>
                    )}
                    {/* Error status */}
                    {(note.transcriptionStatus === "failed" ||
                      note.insightsStatus === "failed") && (
                      <Badge
                        className="flex items-center gap-1 text-xs"
                        variant="destructive"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        <span className="hidden sm:inline">Error</span>
                      </Badge>
                    )}
                    {/* Insights count */}
                    {note.insights.length > 0 ? (
                      <Badge className="text-xs" variant="default">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {note.insights.length}
                      </Badge>
                    ) : note.insightsStatus === "completed" ? (
                      <Badge className="text-xs" variant="secondary">
                        No insights
                      </Badge>
                    ) : null}

                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 sm:h-8 sm:w-8"
                          size="sm"
                          title="Delete note"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Voice Note?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this voice note and all
                            its insights. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleDeleteNote(note._id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* AI Summary & Insights - What the AI extracted */}
                {(note.summary || note.insights.length > 0) && (
                  <div className="mb-3 rounded-lg border-blue-200 border-l-4 bg-blue-50 p-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-blue-600 text-xs">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span className="font-medium uppercase tracking-wide">
                        AI Insights
                      </span>
                    </div>
                    {/* Summary */}
                    {note.summary && (
                      <p className="mb-2 text-blue-900 text-xs italic sm:text-sm">
                        {note.summary}
                      </p>
                    )}
                    {/* Insights badges */}
                    {note.insights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {note.insights.map((insight) => {
                          const variantMap = {
                            applied: "default",
                            dismissed: "secondary",
                          } as const;
                          const variant =
                            variantMap[
                              insight.status as keyof typeof variantMap
                            ] ?? "outline";
                          return (
                            <Badge
                              className="text-xs"
                              key={insight.id}
                              variant={variant}
                            >
                              {insight.status === "applied" && "✓ "}
                              {insight.status === "dismissed" && "✗ "}
                              {insight.title}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Transcription - What the coach actually said */}
                {note.transcription && (
                  <div className="rounded-lg border-gray-200 border-l-4 bg-gray-50 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-gray-500 text-xs">
                      <Quote className="h-3.5 w-3.5" />
                      <span className="font-medium uppercase tracking-wide">
                        Your words
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-gray-700 text-xs sm:text-sm">
                      {note.transcription}
                    </p>
                  </div>
                )}
                {!note.transcription &&
                  (note.transcriptionStatus === "pending" ||
                    note.transcriptionStatus === "processing") && (
                    <div className="rounded-lg border-gray-200 border-l-4 bg-gray-50 p-3">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="italic">Transcribing audio...</span>
                      </div>
                    </div>
                  )}
                {!note.transcription &&
                  note.transcriptionStatus !== "pending" &&
                  note.transcriptionStatus !== "processing" &&
                  note.transcriptionError && (
                    <p className="text-red-500 text-xs sm:text-sm">
                      Transcription failed: {note.transcriptionError}
                    </p>
                  )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
