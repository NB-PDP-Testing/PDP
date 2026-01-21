"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";

type NoteType = "training" | "match" | "general";

type NewNoteTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function NewNoteTab({ orgId, onSuccess, onError }: NewNoteTabProps) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("training");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Get current user for coachId
  const user = useCurrentUser();

  // Convex mutations
  const createTypedNote = useMutation(api.models.voiceNotes.createTypedNote);
  const createRecordedNote = useMutation(
    api.models.voiceNotes.createRecordedNote
  );
  const generateUploadUrl = useAction(api.models.voiceNotes.generateUploadUrl);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        for (const track of stream.getTracks()) {
          track.stop();
        }

        // Create blob and upload
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        await uploadAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      onSuccess("Recording started...");
    } catch (error) {
      console.error("Failed to start recording:", error);
      onError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadAudio = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload the audio
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": audioBlob.type },
        body: audioBlob,
      });

      if (!response.ok) {
        throw new Error("Failed to upload audio");
      }

      const { storageId } = await response.json();

      // Create the voice note
      await createRecordedNote({
        orgId,
        coachId: user?.userId ?? undefined,
        noteType,
        audioStorageId: storageId,
      });

      onSuccess("Recording saved! AI is transcribing and analyzing...");
    } catch (error) {
      console.error("Failed to upload audio:", error);
      onError("Failed to save recording. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveTypedNote = async () => {
    if (!noteText.trim()) {
      return;
    }

    try {
      await createTypedNote({
        orgId,
        coachId: user?.userId ?? undefined,
        noteType,
        noteText: noteText.trim(),
      });

      setNoteText("");
      onSuccess("Note saved! AI is analyzing for insights...");
    } catch (error) {
      console.error("Failed to save note:", error);
      onError("Failed to save note. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg sm:text-xl">New Voice Note</CardTitle>
          <div className="flex gap-1.5 sm:gap-2">
            {(["training", "match", "general"] as const).map((type) => (
              <Button
                className="flex-1 px-2 text-xs sm:flex-none sm:px-4 sm:text-sm"
                key={type}
                onClick={() => setNoteType(type)}
                size="sm"
                variant={noteType === type ? "default" : "outline"}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Recording Button */}
        <div className="flex justify-center">
          <button
            className={`relative rounded-full p-4 shadow-lg transition-all sm:p-6 ${
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : isUploading
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-green-600 hover:bg-green-700"
            } text-white`}
            disabled={isUploading}
            onClick={isRecording ? stopRecording : startRecording}
            title={
              isRecording
                ? "Click to stop recording"
                : "Click to start voice recording"
            }
            type="button"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin sm:h-8 sm:w-8" />
            ) : isRecording ? (
              <MicOff className="h-6 w-6 sm:h-8 sm:w-8" />
            ) : (
              <Mic className="h-6 w-6 sm:h-8 sm:w-8" />
            )}
            {isRecording && (
              <div className="absolute inset-0 animate-ping rounded-full border-4 border-red-400" />
            )}
          </button>
        </div>

        {/* Recording status */}
        {isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-red-700 text-sm sm:gap-3 sm:px-4 sm:py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              <span className="font-semibold">Recording... tap to stop</span>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-blue-700 text-sm sm:gap-3 sm:px-4 sm:py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-semibold">Uploading...</span>
            </div>
          </div>
        )}

        <div className="text-center text-gray-500 text-xs sm:text-sm">
          or type your note below
        </div>

        <Textarea
          className="h-32 text-sm sm:h-48 sm:text-base"
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Type your coaching notes here... Mention player names and the AI will extract insights automatically."
          value={noteText}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-gray-600 text-xs sm:text-left sm:text-sm">
            AI will extract player insights, injuries, and skill progress
          </p>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
            disabled={!noteText.trim()}
            onClick={handleSaveTypedNote}
          >
            Save & Analyze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
