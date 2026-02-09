"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { authClient } from "@/lib/auth-client";

type NoteType = "training" | "match" | "general";

type NewNoteTabProps = {
  orgId: BetterAuthId<"organization">;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const WAVEFORM_THRESHOLDS = [0.15, 0.3, 0.5, 0.7, 0.85];
const WAVEFORM_HEIGHTS = ["40%", "55%", "70%", "85%", "100%"];

export function NewNoteTab({ orgId, onSuccess, onError }: NewNoteTabProps) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("training");
  const [uploadFailed, setUploadFailed] = useState(false);

  const {
    isRecording,
    isStarting,
    isUploading,
    setIsUploading,
    liveTranscript,
    interimText,
    speechSupported,
    elapsedSeconds,
    audioLevel,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useVoiceRecording();

  const { data: session } = authClient.useSession();

  const createTypedNote = useMutation(api.models.voiceNotes.createTypedNote);
  const createRecordedNote = useMutation(
    api.models.voiceNotes.createRecordedNote
  );
  const generateUploadUrl = useAction(api.models.voiceNotes.generateUploadUrl);

  const uploadAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsUploading(true);
      setUploadFailed(false);
      try {
        const uploadUrl = await generateUploadUrl();

        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": audioBlob.type },
          body: audioBlob,
        });

        if (!response.ok) {
          throw new Error("Failed to upload audio");
        }

        const { storageId } = await response.json();

        if (!session?.user?.id) {
          throw new Error("User not authenticated");
        }

        await createRecordedNote({
          orgId,
          coachId: session.user.id,
          noteType,
          audioStorageId: storageId,
        });

        resetTranscript();
        onSuccess("Recording saved! AI is transcribing and analyzing...");
      } catch {
        setUploadFailed(true);
        onError(
          "Failed to save recording. You can copy the preview text above and save as a typed note."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [
      generateUploadUrl,
      session?.user?.id,
      createRecordedNote,
      orgId,
      noteType,
      resetTranscript,
      onSuccess,
      onError,
      setIsUploading,
    ]
  );

  const handleStartRecording = async () => {
    setUploadFailed(false);
    try {
      await startRecording(uploadAudio);
      onSuccess("Recording started...");
    } catch {
      onError("Could not access microphone. Please check permissions.");
    }
  };

  const handleSaveTypedNote = async () => {
    if (!noteText.trim()) {
      return;
    }

    if (!session?.user?.id) {
      onError("User not authenticated");
      return;
    }

    try {
      await createTypedNote({
        orgId,
        coachId: session.user.id,
        noteType,
        noteText: noteText.trim(),
      });

      setNoteText("");
      onSuccess("Note saved! AI is analyzing for insights...");
    } catch {
      onError("Failed to save note. Please try again.");
    }
  };

  const showLivePreview = isRecording || liveTranscript || uploadFailed;

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
                : isUploading || isStarting
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-green-600 hover:bg-green-700"
            } text-white`}
            disabled={isUploading || isStarting}
            onClick={isRecording ? stopRecording : handleStartRecording}
            title={
              isRecording
                ? "Click to stop recording"
                : "Click to start voice recording"
            }
            type="button"
          >
            {isUploading || isStarting ? (
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

        {/* Recording status with timer + waveform */}
        {isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-red-700 text-sm sm:gap-3 sm:px-4 sm:py-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              <span className="font-mono font-semibold tabular-nums">
                {formatTime(elapsedSeconds)}
              </span>
              <div className="flex h-4 items-end gap-0.5">
                {WAVEFORM_THRESHOLDS.map((threshold, i) => (
                  <div
                    className={`w-1 rounded-full transition-all duration-75 ${
                      audioLevel > threshold ? "bg-red-500" : "bg-red-200"
                    }`}
                    key={threshold}
                    style={{ height: WAVEFORM_HEIGHTS[i] }}
                  />
                ))}
              </div>
              <span className="text-sm">tap to stop</span>
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

        {/* Live transcript preview during/after recording, or typed note textarea */}
        {showLivePreview ? (
          <div>
            <div className="h-32 overflow-y-auto rounded-md border bg-gray-50 p-3 text-sm sm:h-48 sm:text-base">
              {speechSupported ? (
                <>
                  <span>{liveTranscript}</span>
                  <span className="text-gray-400 italic">{interimText}</span>
                  {!(liveTranscript || interimText) && isRecording && (
                    <span className="text-gray-400">
                      Listening... start speaking
                    </span>
                  )}
                </>
              ) : isRecording ? (
                <span className="text-gray-400">Recording audio...</span>
              ) : null}
            </div>
            {isRecording && speechSupported && (
              <p className="mt-1 text-center text-gray-400 text-xs">
                Live preview — final transcription by AI after recording
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="text-center text-gray-500 text-xs sm:text-sm">
              or type your note below
            </div>
            <Textarea
              className="h-32 text-sm sm:h-48 sm:text-base"
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type your coaching notes here... Mention player names and the AI will extract insights automatically."
              value={noteText}
            />
          </>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-gray-600 text-xs sm:text-left sm:text-sm">
            AI will extract player insights, injuries, and skill progress
          </p>
          {!showLivePreview && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
              disabled={!noteText.trim()}
              onClick={handleSaveTypedNote}
            >
              Save & Analyze
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
