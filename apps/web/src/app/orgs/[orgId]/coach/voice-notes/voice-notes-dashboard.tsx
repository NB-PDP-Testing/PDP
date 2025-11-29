"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import type { Id as BetterAuthId } from "@pdp/backend/convex/betterAuth/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Mic,
  MicOff,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type NoteType = "training" | "match" | "general";

export function VoiceNotesDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as BetterAuthId<"organization">;

  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("training");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Convex queries and mutations
  const voiceNotes = useQuery(api.models.voiceNotes.getAllVoiceNotes, {
    orgId,
  });
  const createTypedNote = useMutation(api.models.voiceNotes.createTypedNote);
  const createRecordedNote = useMutation(
    api.models.voiceNotes.createRecordedNote
  );
  const generateUploadUrl = useAction(api.models.voiceNotes.generateUploadUrl);
  const updateInsightStatus = useMutation(
    api.models.voiceNotes.updateInsightStatus
  );

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 5000);
  };

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
      showSuccessMessage("🎤 Recording started...");
    } catch (error) {
      console.error("Failed to start recording:", error);
      showErrorMessage(
        "⚠️ Could not access microphone. Please check permissions."
      );
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
        noteType,
        audioStorageId: storageId,
      });

      showSuccessMessage(
        "✓ Recording saved! AI is transcribing and analyzing..."
      );
    } catch (error) {
      console.error("Failed to upload audio:", error);
      showErrorMessage("⚠️ Failed to save recording. Please try again.");
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
        noteType,
        noteText: noteText.trim(),
      });

      setNoteText("");
      showSuccessMessage("✓ Note saved! AI is analyzing for insights...");
    } catch (error) {
      console.error("Failed to save note:", error);
      showErrorMessage("⚠️ Failed to save note. Please try again.");
    }
  };

  const handleApplyInsight = async (
    noteId: Id<"voiceNotes">,
    insightId: string
  ) => {
    try {
      await updateInsightStatus({
        noteId,
        insightId,
        status: "applied",
      });
      showSuccessMessage("✓ Insight applied!");
    } catch (error) {
      console.error("Failed to apply insight:", error);
      showErrorMessage("⚠️ Failed to apply insight.");
    }
  };

  const handleDismissInsight = async (
    noteId: Id<"voiceNotes">,
    insightId: string
  ) => {
    try {
      await updateInsightStatus({
        noteId,
        insightId,
        status: "dismissed",
      });
    } catch (error) {
      console.error("Failed to dismiss insight:", error);
      showErrorMessage("⚠️ Failed to dismiss insight.");
    }
  };

  // Get pending insights from all notes
  const pendingInsights =
    voiceNotes?.flatMap((note) =>
      note.insights
        .filter((i) => i.status === "pending")
        .map((i) => ({ ...i, noteId: note._id, noteDate: note.date }))
    ) ?? [];

  // Count stats
  const notesWithInsights =
    voiceNotes?.filter((n) => n.insights.length > 0).length ?? 0;
  const processingCount =
    voiceNotes?.filter(
      (n) =>
        n.transcriptionStatus === "processing" ||
        n.insightsStatus === "processing"
    ).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push(`/orgs/${orgId}/coach`)}
            variant="ghost"
          >
            <ArrowLeft size={20} />
          </Button>
          <Mic className="text-green-600" size={32} />
          <div>
            <h1 className="font-bold text-3xl text-foreground">
              Coach Voice Notes
            </h1>
            <p className="text-gray-600 text-sm">
              Record and analyze training observations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="font-bold text-2xl text-blue-600">
              {voiceNotes?.length ?? 0}
            </div>
            <div className="text-gray-600 text-sm">Total Notes</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-green-600">
              {notesWithInsights}
            </div>
            <div className="text-gray-600 text-sm">With Insights</div>
          </div>
          {processingCount > 0 && (
            <div className="text-center">
              <div className="flex items-center gap-1 font-bold text-2xl text-orange-600">
                <Loader2 className="animate-spin" size={20} />
                {processingCount}
              </div>
              <div className="text-gray-600 text-sm">Processing</div>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border-2 border-green-500 bg-green-100 px-6 py-4 text-green-800">
          <span className="font-semibold">{successMessage}</span>
          <button
            className="font-bold text-green-600 text-xl hover:text-green-800"
            onClick={() => setSuccessMessage(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start justify-between rounded-lg border-2 border-red-500 bg-red-100 px-6 py-4 text-red-800">
          <div className="flex-1 font-semibold">{errorMessage}</div>
          <button
            className="ml-4 flex-shrink-0 font-bold text-red-600 text-xl hover:text-red-800"
            onClick={() => setErrorMessage(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* Record/Type Note */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>New Voice Note</CardTitle>
            <div className="flex gap-2">
              {(["training", "match", "general"] as const).map((type) => (
                <Button
                  key={type}
                  onClick={() => setNoteType(type)}
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
              className={`relative rounded-full p-6 shadow-lg transition-all ${
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
                <Loader2 className="animate-spin" size={32} />
              ) : isRecording ? (
                <MicOff size={32} />
              ) : (
                <Mic size={32} />
              )}
              {isRecording && (
                <div className="absolute inset-0 animate-ping rounded-full border-4 border-red-400" />
              )}
            </button>
          </div>

          {/* Recording status */}
          {isRecording && (
            <div className="text-center">
              <div className="inline-flex items-center gap-3 rounded-full bg-red-100 px-4 py-2 text-red-700">
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                <span className="font-semibold">
                  Recording... click to stop
                </span>
              </div>
            </div>
          )}

          {isUploading && (
            <div className="text-center">
              <div className="inline-flex items-center gap-3 rounded-full bg-blue-100 px-4 py-2 text-blue-700">
                <Loader2 className="animate-spin" size={16} />
                <span className="font-semibold">Uploading recording...</span>
              </div>
            </div>
          )}

          <div className="text-center text-gray-500 text-sm">
            or type your note below
          </div>

          <Textarea
            className="h-48"
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type your coaching notes here... Mention player names and the AI will extract insights automatically.

Example: 'Emma Murphy had a great session today. Her left foot passing is really improving. Liam seemed a bit tired in the last 15 minutes. Jack O'Brien took a knock to the ankle around the halfway point but finished the session.'"
            value={noteText}
          />

          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">
              AI will extract player insights, injuries, skill progress, and
              more
            </p>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!noteText.trim()}
              onClick={handleSaveTypedNote}
            >
              Save & Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Insights */}
      {pendingInsights.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  AI Detected Insights ({pendingInsights.length})
                </CardTitle>
                <CardDescription>
                  Review and apply insights to player profiles
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInsights.map((insight) => (
              <div
                className="flex items-start justify-between rounded-lg border-2 border-blue-200 bg-blue-50 p-4"
                key={insight.id}
              >
                <div className="flex flex-1 items-start gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {insight.title}
                      </span>
                      {insight.playerName && (
                        <Badge variant="secondary">{insight.playerName}</Badge>
                      )}
                      {insight.category && (
                        <Badge variant="outline">{insight.category}</Badge>
                      )}
                    </div>
                    <p className="mb-2 text-gray-700 text-sm">
                      {insight.description}
                    </p>
                    {insight.recommendedUpdate && (
                      <p className="text-gray-500 text-xs italic">
                        💡 {insight.recommendedUpdate}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      handleApplyInsight(insight.noteId, insight.id)
                    }
                    size="sm"
                    title="Apply insight"
                    variant="default"
                  >
                    <CheckCircle size={16} />
                  </Button>
                  <Button
                    onClick={() =>
                      handleDismissInsight(insight.noteId, insight.id)
                    }
                    size="sm"
                    title="Dismiss insight"
                    variant="outline"
                  >
                    <XCircle size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Voice Note History */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Note History</CardTitle>
          <CardDescription>
            {voiceNotes?.length ?? 0} note
            {(voiceNotes?.length ?? 0) !== 1 ? "s" : ""} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {voiceNotes ? (
            voiceNotes.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Mic className="mx-auto mb-4 text-gray-400" size={48} />
                <p>No voice notes yet. Create your first note above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {voiceNotes.map((note) => (
                  <div
                    className="rounded-lg border-2 border-gray-200 p-4"
                    key={note._id}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge>{note.type}</Badge>
                        {note.audioStorageId && (
                          <Badge variant="outline">🎤 Recorded</Badge>
                        )}
                        <span className="text-gray-500 text-sm">
                          {new Date(note.date).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Processing status */}
                        {(note.transcriptionStatus === "processing" ||
                          note.insightsStatus === "processing") && (
                          <Badge
                            className="flex items-center gap-1"
                            variant="secondary"
                          >
                            <Loader2 className="animate-spin" size={12} />
                            Processing
                          </Badge>
                        )}
                        {/* Error status */}
                        {(note.transcriptionStatus === "failed" ||
                          note.insightsStatus === "failed") && (
                          <Badge
                            className="flex items-center gap-1"
                            variant="destructive"
                          >
                            <AlertTriangle size={12} />
                            Error
                          </Badge>
                        )}
                        {/* Insights count */}
                        {note.insights.length > 0 ? (
                          <Badge variant="default">
                            <CheckCircle className="mr-1" size={14} />
                            {note.insights.length} insight
                            {note.insights.length > 1 ? "s" : ""}
                          </Badge>
                        ) : note.insightsStatus === "completed" ? (
                          <Badge variant="secondary">No insights</Badge>
                        ) : null}
                      </div>
                    </div>

                    {/* Summary */}
                    {note.summary && (
                      <p className="mb-2 text-gray-600 text-sm italic">
                        {note.summary}
                      </p>
                    )}

                    {/* Transcription */}
                    {note.transcription ? (
                      <p className="whitespace-pre-wrap text-gray-700">
                        {note.transcription}
                      </p>
                    ) : note.transcriptionStatus === "pending" ||
                      note.transcriptionStatus === "processing" ? (
                      <p className="text-gray-400 italic">
                        Transcribing audio...
                      </p>
                    ) : note.transcriptionError ? (
                      <p className="text-red-500 text-sm">
                        ⚠️ Transcription failed: {note.transcriptionError}
                      </p>
                    ) : null}

                    {/* Insights preview */}
                    {note.insights.length > 0 && (
                      <div className="mt-3 border-gray-200 border-t pt-3">
                        <div className="flex flex-wrap gap-2">
                          {note.insights.map((insight) => (
                            <Badge
                              key={insight.id}
                              variant={
                                insight.status === "applied"
                                  ? "default"
                                  : insight.status === "dismissed"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {insight.status === "applied" && "✓ "}
                              {insight.status === "dismissed" && "✗ "}
                              {insight.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Loader2
                className="mx-auto mb-4 animate-spin text-gray-400"
                size={48}
              />
              <p>Loading notes...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
