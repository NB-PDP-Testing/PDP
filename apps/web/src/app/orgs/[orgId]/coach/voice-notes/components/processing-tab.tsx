"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Mic, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { authClient } from "@/lib/auth-client";

const { useSession } = authClient;

type ProcessingTabProps = {
  orgId: BetterAuthId<"organization">;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(
  transcriptionStatus?: string,
  insightsStatus?: string
): { label: string; description: string } {
  if (
    transcriptionStatus === "pending" ||
    transcriptionStatus === "processing"
  ) {
    return {
      label: transcriptionStatus === "pending" ? "Queued" : "Transcribing",
      description: "Waiting for audio to be transcribed",
    };
  }
  if (insightsStatus === "pending") {
    return {
      label: "Analyzing",
      description: "Transcription complete — extracting insights",
    };
  }
  if (insightsStatus === "processing") {
    return {
      label: "Extracting insights",
      description: "AI is identifying coaching observations",
    };
  }
  return { label: "Processing", description: "In progress" };
}

export function ProcessingTab({ orgId }: ProcessingTabProps) {
  const { data: session } = useSession();
  const coachId = session?.user?.userId || session?.user?.id;
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const voiceNotes = useQuery(
    api.models.voiceNotes.getVoiceNotesByCoach,
    coachId ? { orgId, coachId } : "skip"
  );
  const deleteVoiceNote = useMutation(api.models.voiceNotes.deleteVoiceNote);

  const processingNotes = voiceNotes?.filter(
    (n) =>
      n.transcriptionStatus === "pending" ||
      n.transcriptionStatus === "processing" ||
      (n.transcriptionStatus === "completed" &&
        (n.insightsStatus === "pending" || n.insightsStatus === "processing"))
  );

  const handleDelete = async (noteId: Id<"voiceNotes">) => {
    setDeletingIds((prev) => new Set(prev).add(noteId));
    try {
      await deleteVoiceNote({ noteId });
      toast.success("Voice note deleted.");
    } catch {
      toast.error("Failed to delete note.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  };

  if (voiceNotes === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (processingNotes?.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <Mic className="h-6 w-6" />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>No notes processing</EmptyTitle>
          <EmptyDescription>
            Voice notes waiting for transcription or analysis will appear here.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        {processingNotes?.length} note
        {(processingNotes?.length ?? 0) !== 1 ? "s" : ""} waiting to complete.
        Notes stuck here for a long time can be deleted.
      </p>

      {processingNotes?.map((note) => {
        const { label, description } = getStatusLabel(
          note.transcriptionStatus,
          note.insightsStatus
        );
        const isDeleting = deletingIds.has(note._id);

        return (
          <Card key={note._id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Badge className="text-xs">{note.type}</Badge>
                    {(note.source === "whatsapp_audio" ||
                      note.source === "whatsapp_text") && (
                      <Badge
                        className="bg-green-600 text-white text-xs hover:bg-green-600"
                        variant="default"
                      >
                        WhatsApp
                      </Badge>
                    )}
                    {note.source === "voicemail" && (
                      <Badge
                        className="flex items-center gap-1 bg-blue-600 text-white text-xs hover:bg-blue-600"
                        variant="default"
                      >
                        <Phone className="h-3 w-3" />
                        Phone
                      </Badge>
                    )}
                    <Badge
                      className="flex items-center gap-1 text-xs"
                      variant="secondary"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {label}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{description}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {formatDate(note.date)}
                  </p>
                  {note.transcription && (
                    <p className="mt-2 line-clamp-2 text-gray-700 text-xs italic">
                      "{note.transcription}"
                    </p>
                  )}
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="h-8 w-8 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={isDeleting}
                      size="sm"
                      title="Delete note"
                      variant="ghost"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Voice Note?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this voice note. This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleDelete(note._id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
