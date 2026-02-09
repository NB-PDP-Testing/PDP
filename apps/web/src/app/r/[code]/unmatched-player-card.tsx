"use client";

/**
 * UnmatchedPlayerCard - Fuzzy player matching UI for unmatched insights.
 *
 * US-VN-010 (Phase 2)
 *
 * Shows fuzzy-matched suggestions from findSimilarPlayersForReview,
 * inline radio selection, "Someone else..." text input for manual search,
 * and assigns player on confirm.
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  HelpCircle,
  Loader2,
  Pencil,
  Search,
  User,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type UnmatchedPlayerCardProps = {
  code: string;
  voiceNoteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  description: string;
  noteDate: string;
  playerName?: string;
  category?: string;
  loading: boolean;
  onDismiss: (
    voiceNoteId: Id<"voiceNotes">,
    insightId: string
  ) => Promise<void>;
  onEdit: (
    voiceNoteId: Id<"voiceNotes">,
    insightId: string,
    updates: { title?: string; description?: string; category?: string }
  ) => Promise<void>;
};

type SuggestionItem = {
  playerId: Id<"playerIdentities">;
  firstName: string;
  lastName: string;
  fullName: string;
  similarity: number;
  ageGroup: string;
  sport: string | null;
};

export function UnmatchedPlayerCard({
  code,
  voiceNoteId,
  insightId,
  title,
  description,
  noteDate,
  playerName,
  category,
  loading,
  onDismiss,
  onEdit,
}: UnmatchedPlayerCardProps) {
  const [selectedPlayerId, setSelectedPlayerId] =
    useState<Id<"playerIdentities"> | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState(playerName ?? "");
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState(false);

  const assignPlayer = useMutation(
    api.models.whatsappReviewLinks.assignPlayerFromReview
  );

  const suggestionsResult = useQuery(
    api.models.whatsappReviewLinks.findSimilarPlayersForReview,
    activeSearch.trim().length >= 2
      ? { code, searchName: activeSearch.trim() }
      : "skip"
  );

  const suggestions = suggestionsResult?.suggestions ?? [];

  const handleAssign = useCallback(async () => {
    if (!selectedPlayerId) {
      return;
    }
    setAssigning(true);
    try {
      await assignPlayer({
        code,
        voiceNoteId,
        insightId,
        playerIdentityId: selectedPlayerId,
      });
    } finally {
      setAssigning(false);
    }
  }, [assignPlayer, code, voiceNoteId, insightId, selectedPlayerId]);

  const handleManualSearch = useCallback(() => {
    if (manualSearch.trim().length >= 2) {
      setActiveSearch(manualSearch.trim());
      setShowManualInput(false);
      setSelectedPlayerId(null);
    }
  }, [manualSearch]);

  const formattedDate = formatNoteDate(noteDate);

  if (editing) {
    return (
      <EditInsightCard
        description={description}
        onCancel={() => setEditing(false)}
        onSave={async (updates) => {
          await onEdit(voiceNoteId, insightId, updates);
          setEditing(false);
        }}
        playerName={playerName}
        title={title}
      />
    );
  }

  return (
    <Card className="border-amber-200 shadow-sm">
      <CardContent className="p-3">
        <InsightHeader
          category={category}
          description={description}
          formattedDate={formattedDate}
          onEditClick={() => setEditing(true)}
          playerName={playerName}
          title={title}
        />

        <SuggestionsList
          activeSearch={activeSearch}
          manualSearch={manualSearch}
          onManualSearch={handleManualSearch}
          onManualSearchChange={setManualSearch}
          onSelectPlayer={(id) => {
            setSelectedPlayerId(id);
            setShowManualInput(false);
          }}
          onShowManualInput={() => {
            setShowManualInput(true);
            setSelectedPlayerId(null);
          }}
          selectedPlayerId={selectedPlayerId}
          showManualInput={showManualInput}
          suggestions={suggestions}
          suggestionsLoading={suggestionsResult === undefined}
        />

        <div className="mt-3 flex gap-2">
          <Button
            className="min-h-[44px] flex-1"
            disabled={!selectedPlayerId || assigning || loading}
            onClick={handleAssign}
            size="sm"
          >
            {assigning ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1 h-3.5 w-3.5" />
            )}
            Assign
          </Button>
          <Button
            className="min-h-[44px] flex-1"
            disabled={loading}
            onClick={() => onDismiss(voiceNoteId, insightId)}
            size="sm"
            variant="outline"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Sub-components (extracted for complexity reduction)
// ============================================================

function InsightHeader({
  playerName,
  title,
  description,
  category,
  formattedDate,
  onEditClick,
}: {
  playerName?: string;
  title: string;
  description: string;
  category?: string;
  formattedDate: string;
  onEditClick: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        {playerName && (
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="truncate font-medium text-amber-700 text-sm">
              {playerName}
              <span className="ml-1 font-normal text-muted-foreground text-xs">
                (not matched)
              </span>
            </p>
          </div>
        )}
        <p className="text-foreground text-sm">{title}</p>
        {description && (
          <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {category && (
          <Badge className="text-xs" variant="outline">
            {category}
          </Badge>
        )}
        <span className="whitespace-nowrap text-muted-foreground text-xs">
          {formattedDate}
        </span>
        <button
          className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onEditClick}
          title="Edit insight"
          type="button"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SuggestionsList({
  suggestions,
  suggestionsLoading,
  activeSearch,
  selectedPlayerId,
  showManualInput,
  manualSearch,
  onSelectPlayer,
  onShowManualInput,
  onManualSearch,
  onManualSearchChange,
}: {
  suggestions: SuggestionItem[];
  suggestionsLoading: boolean;
  activeSearch: string;
  selectedPlayerId: Id<"playerIdentities"> | null;
  showManualInput: boolean;
  manualSearch: string;
  onSelectPlayer: (id: Id<"playerIdentities">) => void;
  onShowManualInput: () => void;
  onManualSearch: () => void;
  onManualSearchChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Who is this?
      </p>

      {suggestionsLoading && activeSearch.trim().length >= 2 && (
        <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching...
        </div>
      )}

      {suggestions.map((suggestion) => (
        <SuggestionRadio
          key={suggestion.playerId}
          onClick={() => onSelectPlayer(suggestion.playerId)}
          selected={selectedPlayerId === suggestion.playerId}
          suggestion={suggestion}
        />
      ))}

      <button
        className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
          showManualInput
            ? "border-amber-500 bg-amber-50"
            : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
        }`}
        onClick={onShowManualInput}
        type="button"
      >
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            showManualInput
              ? "border-amber-500 bg-amber-500"
              : "border-gray-300"
          }`}
        >
          {showManualInput && <Check className="h-3 w-3 text-white" />}
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">Someone else...</span>
        </div>
      </button>

      {showManualInput && (
        <div className="flex gap-2 pt-1">
          <Input
            className="min-h-[44px] flex-1 text-sm"
            onChange={(e) => onManualSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onManualSearch();
              }
            }}
            placeholder="Type player name..."
            value={manualSearch}
          />
          <Button
            className="min-h-[44px]"
            disabled={manualSearch.trim().length < 2}
            onClick={onManualSearch}
            size="sm"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function SuggestionRadio({
  suggestion,
  selected,
  onClick,
}: {
  suggestion: SuggestionItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
        selected
          ? "border-amber-500 bg-amber-50"
          : "border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
      }`}
      onClick={onClick}
      type="button"
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-amber-500 bg-amber-500" : "border-gray-300"
        }`}
      >
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{suggestion.fullName}</p>
        <p className="text-muted-foreground text-xs">
          {suggestion.ageGroup}
          {suggestion.sport ? ` · ${suggestion.sport}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-muted-foreground text-xs">
        {Math.round(suggestion.similarity * 100)}%
      </span>
    </button>
  );
}

function EditInsightCard({
  title,
  description,
  playerName,
  onSave,
  onCancel,
}: {
  title: string;
  description: string;
  playerName?: string;
  onSave: (updates: { title?: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: editTitle !== title ? editTitle : undefined,
        description:
          editDescription !== description ? editDescription : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-amber-200 shadow-sm">
      <CardContent className="space-y-2 p-3">
        {playerName && (
          <p className="truncate font-medium text-sm">{playerName}</p>
        )}
        <Input
          className="text-sm"
          onChange={(e) => setEditTitle(e.target.value)}
          value={editTitle}
        />
        <Textarea
          className="min-h-[60px] text-sm"
          onChange={(e) => setEditDescription(e.target.value)}
          rows={2}
          value={editDescription}
        />
        <div className="flex gap-2">
          <Button
            className="min-h-[44px] flex-1"
            disabled={saving}
            onClick={handleSave}
            size="sm"
          >
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1 h-3.5 w-3.5" />
            )}
            Save
          </Button>
          <Button
            className="min-h-[44px] flex-1"
            disabled={saving}
            onClick={onCancel}
            size="sm"
            variant="outline"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Helper
// ============================================================

function formatNoteDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const time = date.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (diffDays === 0) {
      return `Today ${time}`;
    }
    if (diffDays === 1) {
      return `Yesterday ${time}`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago ${time}`;
    }
    return `${date.toLocaleDateString("en-IE", {
      day: "numeric",
      month: "short",
    })} ${time}`;
  } catch {
    return dateStr;
  }
}
