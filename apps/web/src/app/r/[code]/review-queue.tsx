"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  HelpCircle,
  Loader2,
  PartyPopper,
  Pencil,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BatchActionBar } from "./batch-action-bar";
import { EditAssignmentDialog } from "./edit-assignment-dialog";
import { UnmatchedPlayerCard } from "./unmatched-player-card";

// Shared insight item types (matches getCoachPendingItems return)
type BaseItem = {
  insightId: string;
  voiceNoteId: Id<"voiceNotes">;
  title: string;
  description: string;
  category?: string;
  status: string;
  noteDate: string;
};

type PlayerItem = BaseItem & {
  playerName?: string;
  playerIdentityId?: Id<"playerIdentities">;
};

type TodoItem = BaseItem & {
  assigneeName?: string;
};

type TeamNoteItem = BaseItem & {
  teamName?: string;
};

type ReviewedItem = BaseItem & {
  playerName?: string;
  teamName?: string;
};

type ReviewQueueProps = {
  code: string;
  injuries: PlayerItem[];
  unmatched: (BaseItem & { playerName?: string })[];
  needsReview: PlayerItem[];
  todos: TodoItem[];
  teamNotes: TeamNoteItem[];
  autoApplied: (BaseItem & { playerName?: string })[];
  recentlyReviewed: ReviewedItem[];
  totalCount: number;
  reviewedCount: number;
};

export function ReviewQueue({
  code,
  injuries,
  unmatched,
  needsReview,
  todos,
  teamNotes,
  autoApplied,
  recentlyReviewed,
  totalCount,
  reviewedCount,
}: ReviewQueueProps) {
  const applyInsight = useMutation(
    api.models.whatsappReviewLinks.applyInsightFromReview
  );
  const dismissInsight = useMutation(
    api.models.whatsappReviewLinks.dismissInsightFromReview
  );
  const editInsight = useMutation(
    api.models.whatsappReviewLinks.editInsightFromReview
  );
  const batchApply = useMutation(
    api.models.whatsappReviewLinks.batchApplyInsightsFromReview
  );
  const addTodo = useMutation(api.models.whatsappReviewLinks.addTodoFromReview);
  const saveTeamNote = useMutation(
    api.models.whatsappReviewLinks.saveTeamNoteFromReview
  );
  const batchAddTodos = useMutation(
    api.models.whatsappReviewLinks.batchAddTodosFromReview
  );
  const batchSaveTeamNotes = useMutation(
    api.models.whatsappReviewLinks.batchSaveTeamNotesFromReview
  );

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [batchLoadingSection, setBatchLoadingSection] = useState<string | null>(
    null
  );

  const handleApply = useCallback(
    async (voiceNoteId: Id<"voiceNotes">, insightId: string) => {
      const key = `${voiceNoteId}-${insightId}`;
      setLoadingIds((prev) => new Set(prev).add(key));
      try {
        await applyInsight({ code, voiceNoteId, insightId });
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [applyInsight, code]
  );

  const handleDismiss = useCallback(
    async (voiceNoteId: Id<"voiceNotes">, insightId: string) => {
      const key = `${voiceNoteId}-${insightId}`;
      setLoadingIds((prev) => new Set(prev).add(key));
      try {
        await dismissInsight({ code, voiceNoteId, insightId });
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [dismissInsight, code]
  );

  const handleEdit = useCallback(
    async (
      voiceNoteId: Id<"voiceNotes">,
      insightId: string,
      updates: { title?: string; description?: string; category?: string }
    ) => {
      await editInsight({ code, voiceNoteId, insightId, ...updates });
    },
    [editInsight, code]
  );

  const handleAddTodo = useCallback(
    async (voiceNoteId: Id<"voiceNotes">, insightId: string) => {
      const key = `${voiceNoteId}-${insightId}`;
      setLoadingIds((prev) => new Set(prev).add(key));
      try {
        await addTodo({ code, voiceNoteId, insightId });
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [addTodo, code]
  );

  const handleSaveTeamNote = useCallback(
    async (voiceNoteId: Id<"voiceNotes">, insightId: string) => {
      const key = `${voiceNoteId}-${insightId}`;
      setLoadingIds((prev) => new Set(prev).add(key));
      try {
        await saveTeamNote({ code, voiceNoteId, insightId });
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [saveTeamNote, code]
  );

  const handleBatchApply = useCallback(
    async (sectionKey: string, items: BaseItem[]) => {
      setBatchLoadingSection(sectionKey);
      try {
        await batchApply({
          code,
          items: items.map((i) => ({
            voiceNoteId: i.voiceNoteId,
            insightId: i.insightId,
          })),
        });
      } finally {
        setBatchLoadingSection(null);
      }
    },
    [batchApply, code]
  );

  const handleBatchAddTodos = useCallback(
    async (items: BaseItem[]) => {
      setBatchLoadingSection("todos");
      try {
        await batchAddTodos({
          code,
          items: items.map((i) => ({
            voiceNoteId: i.voiceNoteId,
            insightId: i.insightId,
          })),
        });
      } finally {
        setBatchLoadingSection(null);
      }
    },
    [batchAddTodos, code]
  );

  const handleBatchSaveTeamNotes = useCallback(
    async (items: BaseItem[]) => {
      setBatchLoadingSection("teamNotes");
      try {
        await batchSaveTeamNotes({
          code,
          items: items.map((i) => ({
            voiceNoteId: i.voiceNoteId,
            insightId: i.insightId,
          })),
        });
      } finally {
        setBatchLoadingSection(null);
      }
    },
    [batchSaveTeamNotes, code]
  );

  const allDone =
    totalCount > 0 &&
    reviewedCount >= totalCount &&
    injuries.length === 0 &&
    unmatched.length === 0 &&
    needsReview.length === 0 &&
    todos.length === 0 &&
    teamNotes.length === 0;

  if (allDone) {
    return (
      <div className="space-y-4">
        <AllCaughtUpView reviewedCount={reviewedCount} />
        {recentlyReviewed.length > 0 && (
          <RecentlyReviewedSection code={code} items={recentlyReviewed} />
        )}
        {autoApplied.length > 0 && <AutoAppliedSection items={autoApplied} />}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <SnoozeBar code={code} />

      {injuries.length > 0 && (
        <ReviewSection
          batchAction={
            <div className="flex flex-col gap-2 sm:flex-row">
              <BatchApplyButton
                count={injuries.length}
                loading={batchLoadingSection === "injuries"}
                onApply={() => handleBatchApply("injuries", injuries)}
              />
              <BatchActionBar
                code={code}
                items={injuries.map((i) => ({
                  voiceNoteId: i.voiceNoteId,
                  insightId: i.insightId,
                }))}
                variant="dismiss"
              />
            </div>
          }
          borderColor="border-l-red-500"
          count={injuries.length}
          icon={<Shield className="h-4 w-4 text-red-600" />}
          title="Injuries"
        >
          {injuries.map((item) => (
            <SwipeableReviewCard
              key={`${item.voiceNoteId}-${item.insightId}`}
              onSwipeLeft={() =>
                handleDismiss(item.voiceNoteId, item.insightId)
              }
              onSwipeRight={() => handleApply(item.voiceNoteId, item.insightId)}
            >
              <InsightCard
                category={item.category}
                code={code}
                description={item.description}
                insightId={item.insightId}
                loading={loadingIds.has(
                  `${item.voiceNoteId}-${item.insightId}`
                )}
                noteDate={item.noteDate}
                onApply={handleApply}
                onDismiss={handleDismiss}
                onEdit={handleEdit}
                playerName={item.playerName}
                title={item.title}
                variant="injury"
                voiceNoteId={item.voiceNoteId}
              />
            </SwipeableReviewCard>
          ))}
        </ReviewSection>
      )}

      {injuries.length === 0 && (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Shield className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>All clear! 🎉</EmptyTitle>
            <EmptyDescription>
              No injuries to review right now.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}

      {unmatched.length > 0 && (
        <ReviewSection
          borderColor="border-l-amber-500"
          count={unmatched.length}
          icon={<HelpCircle className="h-4 w-4 text-amber-600" />}
          title="Unmatched Players"
        >
          {unmatched.map((item) => (
            <SwipeableReviewCard
              key={`${item.voiceNoteId}-${item.insightId}`}
              onSwipeLeft={() =>
                handleDismiss(item.voiceNoteId, item.insightId)
              }
              onSwipeRight={() =>
                handleDismiss(item.voiceNoteId, item.insightId)
              }
            >
              <UnmatchedPlayerCard
                category={item.category}
                code={code}
                description={item.description}
                insightId={item.insightId}
                loading={loadingIds.has(
                  `${item.voiceNoteId}-${item.insightId}`
                )}
                noteDate={item.noteDate}
                onDismiss={handleDismiss}
                onEdit={handleEdit}
                playerName={item.playerName}
                title={item.title}
                voiceNoteId={item.voiceNoteId}
              />
            </SwipeableReviewCard>
          ))}
        </ReviewSection>
      )}

      {unmatched.length === 0 && (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <CheckCircle2 className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>All players matched! 🎉</EmptyTitle>
            <EmptyDescription>
              All insights have been successfully matched to players.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}

      {needsReview.length > 0 && (
        <ReviewSection
          batchAction={
            <div className="flex flex-col gap-2 sm:flex-row">
              <BatchApplyButton
                count={needsReview.length}
                loading={batchLoadingSection === "needsReview"}
                onApply={() => handleBatchApply("needsReview", needsReview)}
              />
              <BatchActionBar
                code={code}
                items={needsReview.map((i) => ({
                  voiceNoteId: i.voiceNoteId,
                  insightId: i.insightId,
                }))}
                variant="dismiss"
              />
            </div>
          }
          borderColor="border-l-yellow-500"
          count={needsReview.length}
          icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />}
          title="Needs Review"
        >
          {needsReview.map((item) => (
            <SwipeableReviewCard
              key={`${item.voiceNoteId}-${item.insightId}`}
              onSwipeLeft={() =>
                handleDismiss(item.voiceNoteId, item.insightId)
              }
              onSwipeRight={() => handleApply(item.voiceNoteId, item.insightId)}
            >
              <InsightCard
                category={item.category}
                code={code}
                description={item.description}
                insightId={item.insightId}
                loading={loadingIds.has(
                  `${item.voiceNoteId}-${item.insightId}`
                )}
                noteDate={item.noteDate}
                onApply={handleApply}
                onDismiss={handleDismiss}
                onEdit={handleEdit}
                playerName={item.playerName}
                title={item.title}
                variant="review"
                voiceNoteId={item.voiceNoteId}
              />
            </SwipeableReviewCard>
          ))}
        </ReviewSection>
      )}

      {needsReview.length === 0 && (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <CheckCircle2 className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>All caught up! ✅</EmptyTitle>
            <EmptyDescription>
              No items pending review at this time.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}

      {todos.length > 0 && (
        <ReviewSection
          batchAction={
            <div className="flex flex-col gap-2 sm:flex-row">
              <BatchApplyButton
                count={todos.length}
                label="Add All to Tasks"
                loading={batchLoadingSection === "todos"}
                onApply={() => handleBatchAddTodos(todos)}
              />
              <BatchActionBar
                code={code}
                items={todos.map((i) => ({
                  voiceNoteId: i.voiceNoteId,
                  insightId: i.insightId,
                }))}
                variant="dismiss"
              />
            </div>
          }
          borderColor="border-l-blue-500"
          count={todos.length}
          icon={<ClipboardList className="h-4 w-4 text-blue-600" />}
          title="Actions / Todos"
        >
          {todos.map((item) => (
            <SwipeableReviewCard
              key={`${item.voiceNoteId}-${item.insightId}`}
              onSwipeLeft={() =>
                handleDismiss(item.voiceNoteId, item.insightId)
              }
              onSwipeRight={() =>
                handleAddTodo(item.voiceNoteId, item.insightId)
              }
            >
              <InsightCard
                assigneeName={item.assigneeName}
                code={code}
                description={item.description}
                insightId={item.insightId}
                loading={loadingIds.has(
                  `${item.voiceNoteId}-${item.insightId}`
                )}
                noteDate={item.noteDate}
                onApply={handleAddTodo}
                onDismiss={handleDismiss}
                onEdit={handleEdit}
                title={item.title}
                variant="todo"
                voiceNoteId={item.voiceNoteId}
              />
            </SwipeableReviewCard>
          ))}
        </ReviewSection>
      )}

      {todos.length === 0 && (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <ClipboardList className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No action items 🎯</EmptyTitle>
            <EmptyDescription>
              No todos or action items to review.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}

      {teamNotes.length > 0 && (
        <ReviewSection
          batchAction={
            <div className="flex flex-col gap-2 sm:flex-row">
              <BatchApplyButton
                count={teamNotes.length}
                label="Save All Team Notes"
                loading={batchLoadingSection === "teamNotes"}
                onApply={() => handleBatchSaveTeamNotes(teamNotes)}
              />
              <BatchActionBar
                code={code}
                items={teamNotes.map((i) => ({
                  voiceNoteId: i.voiceNoteId,
                  insightId: i.insightId,
                }))}
                variant="dismiss"
              />
            </div>
          }
          borderColor="border-l-green-500"
          count={teamNotes.length}
          icon={<Users className="h-4 w-4 text-green-600" />}
          title="Team Notes"
        >
          {teamNotes.map((item) => (
            <SwipeableReviewCard
              key={`${item.voiceNoteId}-${item.insightId}`}
              onSwipeLeft={() =>
                handleDismiss(item.voiceNoteId, item.insightId)
              }
              onSwipeRight={() =>
                handleSaveTeamNote(item.voiceNoteId, item.insightId)
              }
            >
              <InsightCard
                code={code}
                description={item.description}
                insightId={item.insightId}
                loading={loadingIds.has(
                  `${item.voiceNoteId}-${item.insightId}`
                )}
                noteDate={item.noteDate}
                onApply={handleSaveTeamNote}
                onDismiss={handleDismiss}
                onEdit={handleEdit}
                teamName={item.teamName}
                title={item.title}
                variant="team"
                voiceNoteId={item.voiceNoteId}
              />
            </SwipeableReviewCard>
          ))}
        </ReviewSection>
      )}

      {teamNotes.length === 0 && (
        <Empty>
          <EmptyContent>
            <EmptyMedia variant="icon">
              <Users className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No team notes ✨</EmptyTitle>
            <EmptyDescription>
              No team notes to review at this time.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      )}

      {autoApplied.length > 0 && <AutoAppliedSection items={autoApplied} />}

      {recentlyReviewed.length > 0 && (
        <RecentlyReviewedSection code={code} items={recentlyReviewed} />
      )}
    </div>
  );
}

// ============================================================
// Batch Apply Button
// ============================================================

function BatchApplyButton({
  count,
  label,
  loading,
  onApply,
}: {
  count: number;
  label?: string;
  loading: boolean;
  onApply: () => void;
}) {
  return (
    <Button
      className="min-h-[44px] flex-1"
      disabled={loading}
      onClick={onApply}
      size="sm"
      variant="outline"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Check className="mr-2 h-4 w-4" />
      )}
      {label ?? "Apply All"} ({count})
    </Button>
  );
}

// ============================================================
// Section wrapper with colored left border + optional batch action
// ============================================================

function ReviewSection({
  title,
  icon,
  count,
  borderColor,
  batchAction,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  borderColor: string;
  batchAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`border-l-4 ${borderColor} pl-3`}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="font-medium text-sm">{title}</h2>
        <Badge className="ml-auto" variant="secondary">
          {count}
        </Badge>
      </div>
      {batchAction && <div className="mb-2">{batchAction}</div>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ============================================================
// Insight card with inline edit + apply/dismiss actions
// ============================================================

type InsightCardProps = {
  code: string;
  voiceNoteId: Id<"voiceNotes">;
  insightId: string;
  title: string;
  description: string;
  noteDate: string;
  playerName?: string;
  assigneeName?: string;
  teamName?: string;
  category?: string;
  variant: "injury" | "unmatched" | "review" | "todo" | "team";
  loading: boolean;
  onApply: (voiceNoteId: Id<"voiceNotes">, insightId: string) => Promise<void>;
  onDismiss: (
    voiceNoteId: Id<"voiceNotes">,
    insightId: string
  ) => Promise<void>;
  onEdit: (
    voiceNoteId: Id<"voiceNotes">,
    insightId: string,
    updates: { title?: string; description?: string; category?: string }
  ) => Promise<void>;
  onReassignSuccess?: () => void;
};

function InsightCard({
  code,
  voiceNoteId,
  insightId,
  title,
  description,
  noteDate,
  playerName,
  assigneeName,
  teamName,
  category,
  variant,
  loading,
  onApply,
  onDismiss,
  onEdit,
  onReassignSuccess,
}: InsightCardProps) {
  const formattedDate = formatNoteDate(noteDate);
  const [editing, setEditing] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description);
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await onEdit(voiceNoteId, insightId, {
        title: editTitle !== title ? editTitle : undefined,
        description:
          editDescription !== description ? editDescription : undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(title);
    setEditDescription(description);
    setEditing(false);
  };

  if (editing) {
    return (
      <Card className="shadow-sm">
        <CardContent className="space-y-2 p-3">
          {/* Entity name (read-only) */}
          {playerName && (
            <p className="truncate font-medium text-sm">{playerName}</p>
          )}
          {teamName && (
            <p className="truncate font-medium text-sm">{teamName}</p>
          )}
          {assigneeName && (
            <p className="truncate font-medium text-sm">{assigneeName}</p>
          )}

          {/* Editable title */}
          <Input
            className="text-sm"
            onChange={(e) => setEditTitle(e.target.value)}
            value={editTitle}
          />

          {/* Editable description */}
          <Textarea
            className="min-h-[60px] text-sm"
            onChange={(e) => setEditDescription(e.target.value)}
            rows={2}
            value={editDescription}
          />

          {/* Save/Cancel */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="min-h-[44px] flex-1"
              disabled={saving}
              onClick={handleSaveEdit}
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
              onClick={handleCancelEdit}
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

  return (
    <Card className="shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Player/team/assignee name */}
            {playerName && (
              <p className="truncate font-medium text-sm">{playerName}</p>
            )}
            {teamName && (
              <p className="truncate font-medium text-sm">{teamName}</p>
            )}
            {assigneeName && (
              <p className="truncate font-medium text-sm">{assigneeName}</p>
            )}

            {/* Title */}
            <p className="text-foreground text-sm">{title}</p>

            {/* Description (truncated) */}
            {description && (
              <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                {description}
              </p>
            )}
          </div>

          {/* Category badge + date + edit buttons */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            {category && variant !== "todo" && variant !== "team" && (
              <Badge className="text-xs" variant={getBadgeVariant(variant)}>
                {category}
              </Badge>
            )}
            <span className="whitespace-nowrap text-muted-foreground text-xs">
              {formattedDate}
            </span>
            <div className="flex gap-1">
              <button
                className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setEditing(true)}
                title="Edit text"
                type="button"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setReassignDialogOpen(true)}
                title="Reassign entity"
                type="button"
              >
                <Users className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <EditAssignmentDialog
          code={code}
          currentEntityType={
            playerName
              ? "player"
              : teamName
                ? "team"
                : assigneeName
                  ? "todo"
                  : "uncategorized"
          }
          insightId={insightId}
          onOpenChange={setReassignDialogOpen}
          onSuccess={() => {
            onReassignSuccess?.();
          }}
          open={reassignDialogOpen}
          voiceNoteId={voiceNoteId}
        />

        {/* Action buttons */}
        <div className="mt-2 flex gap-2">
          <Button
            className="min-h-[44px] flex-1"
            disabled={loading}
            onClick={() => onApply(voiceNoteId, insightId)}
            size="sm"
          >
            {loading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1 h-3.5 w-3.5" />
            )}
            Apply
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
// Auto-applied section (collapsed by default)
// ============================================================

function AutoAppliedSection({
  items,
}: {
  items: (BaseItem & { playerName?: string })[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-l-4 border-l-gray-300 pl-3">
      <button
        className="flex min-h-[44px] w-full items-center gap-2 text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <CheckCircle2 className="h-4 w-4 text-gray-400" />
        <span className="font-medium text-muted-foreground text-sm">
          Auto-Applied
        </span>
        <Badge className="ml-auto" variant="secondary">
          {items.length}
        </Badge>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <Card
              className="border-gray-200 shadow-sm"
              key={`${item.voiceNoteId}-${item.insightId}`}
            >
              <CardContent className="p-3">
                {item.playerName && (
                  <p className="truncate font-medium text-muted-foreground text-sm">
                    {item.playerName}
                  </p>
                )}
                <p className="text-muted-foreground text-sm">{item.title}</p>
                <p className="mt-0.5 text-muted-foreground/70 text-xs">
                  {formatNoteDate(item.noteDate)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Recently reviewed section (manually applied + dismissed by coach)
// ============================================================

function RecentlyReviewedSection({
  code,
  items,
}: {
  code: string;
  items: ReviewedItem[];
}) {
  const [expanded, setExpanded] = useState(false);
  const appliedCount = items.filter((i) => i.status === "applied").length;
  const dismissedCount = items.filter((i) => i.status === "dismissed").length;

  return (
    <div className="border-l-4 border-l-blue-300 pl-3">
      <button
        className="flex min-h-[44px] w-full items-center gap-2 text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <Clock className="h-4 w-4 text-blue-400" />
        <span className="font-medium text-muted-foreground text-sm">
          Recently Reviewed
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {appliedCount > 0 && (
            <Badge
              className="bg-green-100 text-green-700 text-xs"
              variant="secondary"
            >
              {appliedCount} applied
            </Badge>
          )}
          {dismissedCount > 0 && (
            <Badge
              className="bg-gray-100 text-gray-500 text-xs"
              variant="secondary"
            >
              {dismissedCount} skipped
            </Badge>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <>
          <div className="mt-2 mb-2">
            <BatchActionBar
              code={code}
              items={items.map((i) => ({
                voiceNoteId: i.voiceNoteId,
                insightId: i.insightId,
              }))}
              variant="clear-reviewed"
            />
          </div>
          <div className="mt-2 space-y-2">
            {items.map((item) => (
              <Card
                className="border-gray-200 shadow-sm"
                key={`${item.voiceNoteId}-${item.insightId}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {item.playerName && (
                        <p className="truncate font-medium text-muted-foreground text-sm">
                          {item.playerName}
                        </p>
                      )}
                      {item.teamName && (
                        <p className="truncate font-medium text-muted-foreground text-sm">
                          {item.teamName}
                        </p>
                      )}
                      <p className="text-muted-foreground text-sm">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-muted-foreground/70 text-xs">
                        {formatNoteDate(item.noteDate)}
                      </p>
                    </div>
                    <Badge
                      className={`shrink-0 text-xs ${
                        item.status === "applied"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                      variant="secondary"
                    >
                      {item.status === "applied" ? "Applied" : "Skipped"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// "All caught up" completion state
// ============================================================

function AllCaughtUpView({ reviewedCount }: { reviewedCount: number }) {
  return (
    <div className="flex min-h-[40svh] flex-col items-center justify-center text-center">
      <PartyPopper className="mb-4 h-12 w-12 text-green-500" />
      <h2 className="font-semibold text-lg">All caught up!</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        {reviewedCount} item{reviewedCount !== 1 ? "s" : ""} reviewed. Nice
        work!
      </p>
    </div>
  );
}

// ============================================================
// Helpers
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

function getBadgeVariant(
  variant: "injury" | "unmatched" | "review" | "todo" | "team"
): "default" | "secondary" | "destructive" | "outline" {
  switch (variant) {
    case "injury":
      return "destructive";
    case "unmatched":
      return "outline";
    default:
      return "secondary";
  }
}

// ============================================================
// Swipeable wrapper for review cards (US-VN-012b)
// Mobile-only: swipe right = apply, swipe left = dismiss
// ============================================================

const SWIPE_THRESHOLD = 100;

function SwipeableReviewCard({
  children,
  onSwipeRight,
  onSwipeLeft,
}: {
  children: React.ReactNode;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);

  useEffect(() => {
    const check = () =>
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const greenOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.8]);
  const redOpacity = useTransform(x, [0, -SWIPE_THRESHOLD], [0, 0.8]);
  const greenIconX = useTransform(x, [0, SWIPE_THRESHOLD], [-20, 0]);
  const redIconX = useTransform(x, [0, -SWIPE_THRESHOLD], [20, 0]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Green overlay (apply) */}
      <motion.div
        className={`pointer-events-none absolute inset-0 flex items-center justify-start rounded-lg bg-green-500 px-4 ${
          isDragging ? "opacity-100" : "opacity-0"
        }`}
        style={{ opacity: greenOpacity }}
      >
        <motion.div style={{ x: greenIconX }}>
          <Check className="h-8 w-8 text-white" />
        </motion.div>
      </motion.div>

      {/* Red overlay (dismiss) */}
      <motion.div
        className={`pointer-events-none absolute inset-0 flex items-center justify-end rounded-lg bg-red-500 px-4 ${
          isDragging ? "opacity-100" : "opacity-0"
        }`}
        style={{ opacity: redOpacity }}
      >
        <motion.div style={{ x: redIconX }}>
          <X className="h-8 w-8 text-white" />
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_event, info) => {
          setIsDragging(false);
          if (info.offset.x > SWIPE_THRESHOLD) {
            if ("vibrate" in navigator) {
              navigator.vibrate(50);
            }
            onSwipeRight();
          } else if (info.offset.x < -SWIPE_THRESHOLD) {
            if ("vibrate" in navigator) {
              navigator.vibrate(50);
            }
            onSwipeLeft();
          }
        }}
        onDragStart={() => setIsDragging(true)}
        style={{ x }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ============================================================
// Snooze Bar — defer review with timed reminder (US-VN-012c)
// ============================================================

function SnoozeBar({ code }: { code: string }) {
  const snoozeInfo = useQuery(api.models.whatsappReviewLinks.getSnoozeInfo, {
    code,
  });
  const snoozeMutation = useMutation(
    api.models.whatsappReviewLinks.snoozeReviewLink
  );
  const [snoozingLabel, setSnoozingLabel] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!snoozeInfo || snoozeInfo.snoozeCount >= snoozeInfo.maxSnoozes) {
    return null;
  }

  // If a reminder is already set, show a "reminder pending" badge
  if (snoozeInfo.snoozeRemindAt) {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-center text-blue-800 text-sm">
        Reminder set for{" "}
        {new Date(snoozeInfo.snoozeRemindAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-2 text-center text-green-800 text-sm">
        Reminder set! You'll get a WhatsApp message.
      </div>
    );
  }

  const handleSnooze = async (label: string, delayMs: number) => {
    setSnoozingLabel(label);
    try {
      const result = await snoozeMutation({ code, delayMs });
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } finally {
      setSnoozingLabel(null);
    }
  };

  // Calculate "Tomorrow 9am" delay
  const getTomorrow9amDelay = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground text-xs">Remind me later</span>
        {snoozeInfo.snoozeCount > 0 && (
          <span className="text-muted-foreground/60 text-xs">
            ({snoozeInfo.snoozeCount}/{snoozeInfo.maxSnoozes} used)
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {[
          { label: "1h", ms: 60 * 60 * 1000 },
          { label: "2h", ms: 2 * 60 * 60 * 1000 },
          { label: "Tomorrow 9am", ms: getTomorrow9amDelay() },
        ].map(({ label, ms }) => (
          <Button
            className="min-h-[36px] flex-1 text-xs"
            disabled={snoozingLabel !== null}
            key={label}
            onClick={() => handleSnooze(label, ms)}
            size="sm"
            variant="outline"
          >
            {snoozingLabel === label ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
