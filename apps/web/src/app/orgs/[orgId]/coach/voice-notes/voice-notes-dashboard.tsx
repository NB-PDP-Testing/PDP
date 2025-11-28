"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Heart,
  Mic,
  MicOff,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

// Types for voice notes and insights
type InsightType =
  | "goal_progress"
  | "skill_update"
  | "injury"
  | "attendance"
  | "behavior"
  | "performance"
  | "team_insight";
type InsightStatus = "pending" | "applied" | "dismissed";

interface VoiceInsight {
  id: string;
  type: InsightType;
  playerIds: string[];
  description: string;
  confidence: number;
  suggestedAction: string;
  source?: "pattern" | "ai";
  metadata: Record<string, unknown>;
  status: InsightStatus;
  appliedDate?: string;
}

interface VoiceNote {
  id: string;
  date: string;
  type: "training" | "match" | "general";
  transcription: string;
  insights: VoiceInsight[];
  processed: boolean;
}

export function VoiceNotesDashboard() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<"training" | "match" | "general">(
    "training"
  );
  const [isRecording, setIsRecording] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Web Speech API
  const [interimText, setInterimText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const finalTranscriptRef = useRef<string>("");

  // Mock data - TODO: Replace with Convex queries
  const voiceNotes: VoiceNote[] = [];

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      // biome-ignore lint/suspicious/noExplicitAny: Web Speech API
      (window as any).SpeechRecognition ||
      // biome-ignore lint/suspicious/noExplicitAny: Web Speech API
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-GB";

      // biome-ignore lint/suspicious/noExplicitAny: Web Speech API event
      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += `${transcript} `;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
          setNoteText(finalTranscriptRef.current);
        }

        setInterimText(interimTranscript);
      };

      // biome-ignore lint/suspicious/noExplicitAny: Web Speech API event
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          showWarningMessage("⚠️ No speech detected. Please try again.");
        } else if (event.error === "not-allowed") {
          showWarningMessage(
            "⚠️ Microphone access denied. Please allow microphone access in your browser settings."
          );
        } else {
          showWarningMessage(`⚠️ Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
        setInterimText("");
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
    }

    return () => {
      // biome-ignore lint/suspicious/noExplicitAny: Web Speech API
      if (recognitionRef.current) {
        // biome-ignore lint/suspicious/noExplicitAny: Web Speech API
        (recognitionRef.current as any).stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!speechSupported) {
      showWarningMessage(
        "⚠️ Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (isRecording) {
      // biome-ignore lint/suspicious/noExplicitAny: Web Speech API
      (recognitionRef.current as any)?.stop();
      setIsRecording(false);
      setInterimText("");
      showSuccessMessage("✓ Recording stopped");
    } else {
      try {
        finalTranscriptRef.current = noteText;
        // biome-ignore lint/suspicious/noExplicitAny: Web Speech API
        (recognitionRef.current as any)?.start();
        setIsRecording(true);
        showSuccessMessage("🎤 Recording started - speak your notes...");
      } catch (error) {
        console.error("Failed to start recording:", error);
        showWarningMessage("⚠️ Failed to start recording. Please try again.");
      }
    }
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setWarningMessage(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showWarningMessage = (message: string) => {
    setWarningMessage(message);
    setSuccessMessage(null);
    setTimeout(() => setWarningMessage(null), 5000);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;

    setIsAiProcessing(true);
    showSuccessMessage("💾 Saving note...");

    try {
      // TODO: Call Convex mutation to save note and extract insights
      // const result = await saveVoiceNote({ noteText, noteType, orgId });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setNoteText("");
      finalTranscriptRef.current = "";
      showSuccessMessage(
        "✓ Note saved and sent for AI analysis! Check back in a moment."
      );
    } catch (error) {
      console.error("Failed to save note:", error);
      showWarningMessage("⚠️ Failed to save note. Please try again.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case "injury":
        return <AlertTriangle className="text-red-500" size={20} />;
      case "goal_progress":
        return <Target className="text-purple-500" size={20} />;
      case "skill_update":
        return <TrendingUp className="text-blue-500" size={20} />;
      case "performance":
        return <CheckCircle className="text-green-500" size={20} />;
      case "behavior":
        return <Heart className="text-pink-500" size={20} />;
      case "team_insight":
        return <Users className="text-indigo-500" size={20} />;
      default:
        return <AlertTriangle className="text-gray-500" size={20} />;
    }
  };

  const getInsightColor = (type: InsightType) => {
    switch (type) {
      case "injury":
        return "border-red-200 bg-red-50";
      case "goal_progress":
        return "border-purple-200 bg-purple-50";
      case "skill_update":
        return "border-blue-200 bg-blue-50";
      case "performance":
        return "border-green-200 bg-green-50";
      case "behavior":
        return "border-pink-200 bg-pink-50";
      case "team_insight":
        return "border-indigo-200 bg-indigo-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const pendingInsights = voiceNotes.flatMap((note) =>
    note.insights
      .filter((i) => i.status === "pending")
      .map((i) => ({ ...i, noteId: note.id }))
  );

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
            <h1 className="font-bold text-3xl text-gray-800">
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
              {voiceNotes.length}
            </div>
            <div className="text-gray-600 text-sm">Total Notes</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-green-600">
              {voiceNotes.filter((n) => n.insights.length > 0).length}
            </div>
            <div className="text-gray-600 text-sm">With Insights</div>
          </div>
        </div>
      </div>

      {/* Success/Warning Messages */}
      {successMessage && (
        <div className="flex animate-fade-in items-center justify-between rounded-lg border-2 border-green-500 bg-green-100 px-6 py-4 text-green-800">
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

      {warningMessage && (
        <div className="flex animate-fade-in items-start justify-between rounded-lg border-2 border-yellow-500 bg-yellow-100 px-6 py-4 text-yellow-800">
          <div className="flex-1 font-semibold">{warningMessage}</div>
          <button
            className="ml-4 flex-shrink-0 font-bold text-xl text-yellow-600 hover:text-yellow-800"
            onClick={() => setWarningMessage(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* AI Processing Indicator */}
      {isAiProcessing && (
        <div className="flex animate-pulse items-center gap-3 rounded-lg border-2 border-blue-500 bg-blue-100 px-6 py-4 text-blue-800">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-b-blue-600" />
          <span className="font-semibold">
            🤖 AI analyzing note for insights...
          </span>
        </div>
      )}

      {/* Record/Type Note */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>New Voice Note</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setNoteType("training")}
                variant={noteType === "training" ? "default" : "outline"}
              >
                Training
              </Button>
              <Button
                onClick={() => setNoteType("match")}
                variant={noteType === "match" ? "default" : "outline"}
              >
                Match
              </Button>
              <Button
                onClick={() => setNoteType("general")}
                variant={noteType === "general" ? "default" : "outline"}
              >
                General
              </Button>
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
                  : "bg-green-600 hover:bg-green-700"
              } text-white`}
              onClick={toggleRecording}
              title={
                isRecording
                  ? "Click to stop recording"
                  : "Click to start voice recording"
              }
              type="button"
            >
              {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
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
                  Recording... speak your notes
                </span>
              </div>
            </div>
          )}

          <Textarea
            className={`h-48 ${isRecording ? "border-red-300 bg-red-50" : ""}`}
            onChange={(e) => {
              if (!isRecording) {
                setNoteText(e.target.value);
              }
            }}
            placeholder="Type or speak your coaching notes here... Mention player names and the AI will extract insights automatically.

Example: 'Emma Murphy had a great session today. Her left foot passing is really improving. Liam seemed a bit tired in the last 15 minutes. Jack O'Brien took a knock to the ankle around the halfway point but finished the session.'"
            readOnly={isRecording}
            value={
              noteText +
              (interimText ? (noteText ? " " : "") + interimText : "")
            }
          />

          {/* Live transcription indicator */}
          {isRecording && interimText && (
            <div className="text-gray-500 text-sm italic">
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Transcribing: "{interimText}"
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">
              AI will automatically detect: injuries, goal progress, skill
              updates, attendance, and performance notes
            </p>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!noteText.trim()}
              onClick={handleSaveNote}
            >
              Save & Process Note
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
                className={`flex items-start justify-between rounded-lg border-2 p-4 ${getInsightColor(insight.type)}`}
                key={insight.id}
              >
                <div className="flex flex-1 items-start gap-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-800">
                        {insight.description}
                      </span>
                      <Badge variant="secondary">
                        {Math.round(insight.confidence * 100)}% confident
                      </Badge>
                      {insight.source && (
                        <Badge
                          variant={
                            insight.source === "ai" ? "default" : "secondary"
                          }
                        >
                          {insight.source === "ai" ? "🤖 AI" : "⚡ Pattern"}
                        </Badge>
                      )}
                    </div>
                    <p className="mb-2 text-gray-600 text-sm">
                      {insight.suggestedAction}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default">
                    <CheckCircle size={16} />
                  </Button>
                  <Button size="sm" variant="outline">
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
            {voiceNotes.length} note{voiceNotes.length !== 1 ? "s" : ""}{" "}
            recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {voiceNotes.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Mic className="mx-auto mb-4 text-gray-400" size={48} />
              <p>No voice notes yet. Create your first note above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {voiceNotes.map((note) => (
                <div
                  className="rounded-lg border-2 border-gray-200 p-4"
                  key={note.id}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>{note.type}</Badge>
                      <span className="text-gray-500 text-sm">
                        {new Date(note.date).toLocaleString()}
                      </span>
                    </div>
                    {note.insights.length > 0 ? (
                      <Badge variant="default">
                        <CheckCircle className="mr-1" size={14} />
                        {note.insights.length} insight
                        {note.insights.length > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertTriangle className="mr-1" size={14} />
                        No insights
                      </Badge>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-gray-700">
                    {note.transcription}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
