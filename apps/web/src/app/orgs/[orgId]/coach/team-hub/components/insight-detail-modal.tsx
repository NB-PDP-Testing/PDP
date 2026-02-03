"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Mic, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Insight = {
  _id: string;
  type: "voice-note" | "ai-generated" | "manual";
  title: string;
  summary: string;
  fullText?: string;
  voiceNoteId?: string;
  topic: "technical" | "tactical" | "fitness" | "behavioral" | "other";
  priority: "high" | "medium" | "low";
  createdAt: number;
  playerNames: string[];
  creatorName: string;
  voiceNote?: {
    title: string;
  };
};

type InsightDetailModalProps = {
  insight: Insight;
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  organizationId: string;
};

export function InsightDetailModal({
  insight,
  isOpen,
  onClose,
  teamId: _teamId,
  organizationId,
}: InsightDetailModalProps) {
  const router = useRouter();

  const relativeTime = formatDistanceToNow(insight.createdAt, {
    addSuffix: true,
  });

  // Get type icon
  const typeConfig = {
    "voice-note": { icon: Mic, label: "Voice Note", color: "text-blue-600" },
    "ai-generated": {
      icon: Sparkles,
      label: "AI Generated",
      color: "text-purple-600",
    },
    manual: { icon: FileText, label: "Manual", color: "text-gray-600" },
  };

  const config = typeConfig[insight.type];
  const TypeIcon = config.icon;

  const handleViewVoiceNote = () => {
    if (insight.voiceNoteId) {
      router.push(
        `/orgs/${organizationId}/coach/voice-notes?highlight=${insight.voiceNoteId}`
      );
      onClose();
    }
  };

  const handleCreateTask = () => {
    // TODO: Open create task modal pre-filled with insight details
    // For now, just navigate to tasks tab
    router.push(`/orgs/${organizationId}/coach/team-hub?tab=tasks` as any);
    onClose();
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`rounded-full p-2 ${config.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle>{insight.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {config.label} • {insight.creatorName} • {relativeTime}
              </DialogDescription>
            </div>
            <Button onClick={onClose} size="icon" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {insight.topic.charAt(0).toUpperCase() + insight.topic.slice(1)}
            </Badge>
            {insight.priority === "high" && (
              <Badge variant="destructive">High Priority</Badge>
            )}
            {insight.voiceNote && (
              <Badge variant="secondary">
                <Mic className="mr-1 h-3 w-3" />
                {insight.voiceNote.title}
              </Badge>
            )}
            {insight.playerNames.map((name) => (
              <Badge key={name} variant="outline">
                {name}
              </Badge>
            ))}
          </div>

          {/* Summary */}
          <div>
            <h4 className="mb-2 font-semibold text-sm">Summary</h4>
            <p className="text-muted-foreground text-sm">{insight.summary}</p>
          </div>

          {/* Full Text */}
          {insight.fullText && (
            <div>
              <h4 className="mb-2 font-semibold text-sm">Full Analysis</h4>
              <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                {insight.fullText}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {insight.voiceNoteId && (
            <Button onClick={handleViewVoiceNote} variant="outline">
              <Mic className="mr-2 h-4 w-4" />
              View Source Voice Note
            </Button>
          )}
          <Button onClick={handleCreateTask}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task from Insight
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
