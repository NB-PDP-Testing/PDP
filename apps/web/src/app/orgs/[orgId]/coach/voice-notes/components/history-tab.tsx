"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle,
  Filter,
  Loader2,
  Mic,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HistoryTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

type NoteTypeFilter = "all" | "training" | "match" | "general";

export function HistoryTab({ orgId, onSuccess, onError }: HistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NoteTypeFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

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

  // Filter notes
  const filteredNotes = voiceNotes?.filter((note) => {
    // Type filter
    if (typeFilter !== "all" && note.type !== typeFilter) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
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
          <Button
            className="sm:hidden"
            onClick={() => setShowFilters(!showFilters)}
            size="sm"
            variant="outline"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {(searchQuery || typeFilter !== "all") && (
              <Badge className="ml-2" variant="secondary">
                Active
              </Badge>
            )}
          </Button>
        </div>

        {/* Filters - always visible on desktop, toggleable on mobile */}
        <div
          className={`mt-3 flex flex-col gap-2 sm:mt-4 sm:flex sm:flex-row sm:gap-3 ${showFilters ? "flex" : "hidden sm:flex"}`}
        >
          <div className="relative flex-1">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9 text-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, players, insights..."
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
          <Select
            onValueChange={(v) => setTypeFilter(v as NoteTypeFilter)}
            value={typeFilter}
          >
            <SelectTrigger className="w-full text-sm sm:w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="match">Match</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
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
                    <span className="text-gray-500 text-xs sm:text-sm">
                      {new Date(note.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
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

                {/* Summary */}
                {note.summary && (
                  <p className="mb-2 text-gray-600 text-xs italic sm:text-sm">
                    {note.summary}
                  </p>
                )}

                {/* Transcription */}
                {note.transcription && (
                  <p className="line-clamp-3 whitespace-pre-wrap text-gray-700 text-xs sm:line-clamp-none sm:text-sm">
                    {note.transcription}
                  </p>
                )}
                {!note.transcription &&
                  (note.transcriptionStatus === "pending" ||
                    note.transcriptionStatus === "processing") && (
                    <p className="text-gray-400 text-xs italic sm:text-sm">
                      Transcribing audio...
                    </p>
                  )}
                {!note.transcription &&
                  note.transcriptionStatus !== "pending" &&
                  note.transcriptionStatus !== "processing" &&
                  note.transcriptionError && (
                    <p className="text-red-500 text-xs sm:text-sm">
                      Transcription failed: {note.transcriptionError}
                    </p>
                  )}

                {/* Insights preview */}
                {note.insights.length > 0 && (
                  <div className="mt-2 border-gray-200 border-t pt-2 sm:mt-3 sm:pt-3">
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
