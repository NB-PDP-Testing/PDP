"use client";

import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  PartyPopper,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

type ReviewQueueProps = {
  injuries: PlayerItem[];
  unmatched: (BaseItem & { playerName?: string })[];
  needsReview: PlayerItem[];
  todos: TodoItem[];
  teamNotes: TeamNoteItem[];
  autoApplied: (BaseItem & { playerName?: string })[];
  totalCount: number;
  reviewedCount: number;
};

export function ReviewQueue({
  injuries,
  unmatched,
  needsReview,
  todos,
  teamNotes,
  autoApplied,
  totalCount,
  reviewedCount,
}: ReviewQueueProps) {
  const allDone =
    totalCount > 0 &&
    reviewedCount >= totalCount &&
    injuries.length === 0 &&
    unmatched.length === 0 &&
    needsReview.length === 0 &&
    todos.length === 0 &&
    teamNotes.length === 0;

  if (allDone) {
    return <AllCaughtUpView reviewedCount={reviewedCount} />;
  }

  return (
    <div className="space-y-4 pb-8">
      {injuries.length > 0 && (
        <ReviewSection
          borderColor="border-l-red-500"
          count={injuries.length}
          icon={<Shield className="h-4 w-4 text-red-600" />}
          title="Injuries"
        >
          {injuries.map((item) => (
            <InsightCard
              category={item.category}
              description={item.description}
              key={`${item.voiceNoteId}-${item.insightId}`}
              noteDate={item.noteDate}
              playerName={item.playerName}
              title={item.title}
              variant="injury"
            />
          ))}
        </ReviewSection>
      )}

      {unmatched.length > 0 && (
        <ReviewSection
          borderColor="border-l-amber-500"
          count={unmatched.length}
          icon={<HelpCircle className="h-4 w-4 text-amber-600" />}
          title="Unmatched Players"
        >
          {unmatched.map((item) => (
            <InsightCard
              category={item.category}
              description={item.description}
              key={`${item.voiceNoteId}-${item.insightId}`}
              noteDate={item.noteDate}
              playerName={item.playerName}
              title={item.title}
              variant="unmatched"
            />
          ))}
        </ReviewSection>
      )}

      {needsReview.length > 0 && (
        <ReviewSection
          borderColor="border-l-yellow-500"
          count={needsReview.length}
          icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />}
          title="Needs Review"
        >
          {needsReview.map((item) => (
            <InsightCard
              category={item.category}
              description={item.description}
              key={`${item.voiceNoteId}-${item.insightId}`}
              noteDate={item.noteDate}
              playerName={item.playerName}
              title={item.title}
              variant="review"
            />
          ))}
        </ReviewSection>
      )}

      {todos.length > 0 && (
        <ReviewSection
          borderColor="border-l-blue-500"
          count={todos.length}
          icon={<ClipboardList className="h-4 w-4 text-blue-600" />}
          title="Actions / Todos"
        >
          {todos.map((item) => (
            <InsightCard
              assigneeName={item.assigneeName}
              description={item.description}
              key={`${item.voiceNoteId}-${item.insightId}`}
              noteDate={item.noteDate}
              title={item.title}
              variant="todo"
            />
          ))}
        </ReviewSection>
      )}

      {teamNotes.length > 0 && (
        <ReviewSection
          borderColor="border-l-green-500"
          count={teamNotes.length}
          icon={<Users className="h-4 w-4 text-green-600" />}
          title="Team Notes"
        >
          {teamNotes.map((item) => (
            <InsightCard
              description={item.description}
              key={`${item.voiceNoteId}-${item.insightId}`}
              noteDate={item.noteDate}
              teamName={item.teamName}
              title={item.title}
              variant="team"
            />
          ))}
        </ReviewSection>
      )}

      {autoApplied.length > 0 && <AutoAppliedSection items={autoApplied} />}
    </div>
  );
}

// ============================================================
// Section wrapper with colored left border
// ============================================================

function ReviewSection({
  title,
  icon,
  count,
  borderColor,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  borderColor: string;
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
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ============================================================
// Insight card (read-only shell — actions added in US-VN-009)
// ============================================================

type InsightCardProps = {
  title: string;
  description: string;
  noteDate: string;
  playerName?: string;
  assigneeName?: string;
  teamName?: string;
  category?: string;
  variant: "injury" | "unmatched" | "review" | "todo" | "team";
};

function InsightCard({
  title,
  description,
  noteDate,
  playerName,
  assigneeName,
  teamName,
  category,
  variant,
}: InsightCardProps) {
  const formattedDate = formatNoteDate(noteDate);

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

          {/* Category badge + date */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            {category && variant !== "todo" && variant !== "team" && (
              <Badge className="text-xs" variant={getBadgeVariant(variant)}>
                {category}
              </Badge>
            )}
            <span className="whitespace-nowrap text-muted-foreground text-xs">
              {formattedDate}
            </span>
          </div>
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

    if (diffDays === 0) {
      return "Today";
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString("en-IE", {
      day: "numeric",
      month: "short",
    });
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
