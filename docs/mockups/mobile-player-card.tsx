/**
 * MOCKUP: Mobile Player Card Component
 *
 * Industry Standard: Card-based views on mobile instead of tables
 * Includes swipe actions for quick operations
 *
 * This is a MOCKUP file showing the proposed implementation pattern.
 * Not production code - for review and discussion.
 */

"use client";

import { BarChart3, ChevronRight, Edit, Star } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  avatarUrl?: string;
  age: number;
  team: string;
  position: string;
  rating: number;
};

type MobilePlayerCardProps = {
  player: Player;
  orgId: string;
  onEdit?: (player: Player) => void;
  onViewStats?: (player: Player) => void;
};

/**
 * Individual Player Card with Swipe Actions
 */
export function MobilePlayerCard({
  player,
  orgId,
  onEdit,
  onViewStats,
}: MobilePlayerCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const REVEAL_THRESHOLD = 80; // px to swipe before revealing actions
  const ACTION_WIDTH = 160; // width of action buttons area

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = startX.current - currentX;

    // Only allow left swipe (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, ACTION_WIDTH));
    } else if (isRevealed) {
      // Allow swipe right to close
      setSwipeOffset(Math.max(ACTION_WIDTH + diff, 0));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > REVEAL_THRESHOLD) {
      // Snap to revealed state
      setSwipeOffset(ACTION_WIDTH);
      setIsRevealed(true);
    } else {
      // Snap back to closed
      setSwipeOffset(0);
      setIsRevealed(false);
    }
  };

  const closeActions = () => {
    setSwipeOffset(0);
    setIsRevealed(false);
  };

  // Generate star rating display
  const renderRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <div className="flex items-center gap-0.5">
        {[...new Array(5)].map((_, i) => (
          <Star
            className={cn(
              "h-3 w-3",
              i < fullStars
                ? "fill-yellow-400 text-yellow-400"
                : i === fullStars && hasHalfStar
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "fill-muted text-muted"
            )}
            key={i}
          />
        ))}
        <span className="ml-1 text-muted-foreground text-xs">
          ({rating.toFixed(1)})
        </span>
      </div>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Action buttons revealed on swipe */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-stretch",
          "bg-muted"
        )}
        style={{ width: ACTION_WIDTH }}
      >
        <button
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1",
            "bg-blue-500 text-white",
            // Touch target compliance
            "min-h-[44px] min-w-[44px]",
            "active:bg-blue-600"
          )}
          onClick={() => {
            onEdit?.(player);
            closeActions();
          }}
        >
          <Edit className="h-5 w-5" />
          <span className="font-medium text-xs">Edit</span>
        </button>
        <button
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1",
            "bg-green-500 text-white",
            "min-h-[44px] min-w-[44px]",
            "active:bg-green-600"
          )}
          onClick={() => {
            onViewStats?.(player);
            closeActions();
          }}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="font-medium text-xs">Stats</span>
        </button>
      </div>

      {/* Main card content */}
      <div
        className={cn(
          "relative rounded-lg border bg-card",
          "transition-transform duration-200 ease-out",
          "active:bg-accent/50"
        )}
        onClick={() => {
          if (isRevealed) {
            closeActions();
          }
        }}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        ref={cardRef}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
        }}
      >
        <Link
          className="flex items-center gap-4 p-4"
          href={`/orgs/${orgId}/players/${player.id}`}
        >
          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage alt={player.name} src={player.avatarUrl} />
            <AvatarFallback>
              {player.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Player Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold text-base">
                {player.name}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge className="text-xs" variant="secondary">
                U{player.age}
              </Badge>
              <span className="truncate text-muted-foreground text-sm">
                {player.position}
              </span>
            </div>
            <div className="mt-1.5">{renderRating(player.rating)}</div>
          </div>

          {/* Team & Chevron */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-muted-foreground text-sm">{player.team}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>

        {/* Swipe hint indicator */}
        {!isRevealed && (
          <div className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2">
            <div className="flex items-center gap-1 text-muted-foreground/30">
              <span className="text-xs">←</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Player List with Search and Pull-to-Refresh
 */
type MobilePlayerListProps = {
  players: Player[];
  orgId: string;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
};

export function MobilePlayerList({
  players,
  orgId,
  isLoading,
  onRefresh,
}: MobilePlayerListProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const REFRESH_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (listRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (listRef.current?.scrollTop === 0 && !isRefreshing) {
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0) {
        // Apply resistance
        setPullDistance(Math.min(diff * 0.5, REFRESH_THRESHOLD * 1.5));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > REFRESH_THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Pull-to-refresh indicator */}
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden transition-all",
          pullDistance > 0 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{ height: isRefreshing ? 48 : pullDistance }}
      >
        <div
          className={cn(
            "h-6 w-6 rounded-full border-2 border-primary border-t-transparent",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing
              ? undefined
              : `rotate(${(pullDistance / REFRESH_THRESHOLD) * 360}deg)`,
          }}
        />
        {pullDistance > REFRESH_THRESHOLD && !isRefreshing && (
          <span className="ml-2 text-muted-foreground text-sm">
            Release to refresh
          </span>
        )}
      </div>

      {/* Player List */}
      <div
        className="flex-1 space-y-2 overflow-y-auto px-4 pb-20"
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        ref={listRef}
      >
        {isLoading ? (
          // Skeleton loading state
          [...new Array(5)].map((_, i) => (
            <div
              className="flex animate-pulse items-center gap-4 rounded-lg border bg-card p-4"
              key={i}
            >
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
              <div className="h-4 w-16 rounded bg-muted" />
            </div>
          ))
        ) : players.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No players yet</h3>
            <p className="mt-1 max-w-xs text-muted-foreground text-sm">
              Get started by adding your first player or importing from a
              spreadsheet.
            </p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">
              <Plus className="h-5 w-5" />
              Add Player
            </button>
          </div>
        ) : (
          // Player cards
          players.map((player) => (
            <MobilePlayerCard
              key={player.id}
              onEdit={(p) => console.log("Edit", p)}
              onViewStats={(p) => console.log("Stats", p)}
              orgId={orgId}
              player={player}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Need to import these at top
import { Plus, Users } from "lucide-react";

/**
 * USAGE EXAMPLE:
 *
 * <MobilePlayerList
 *   players={playersData}
 *   orgId={orgId}
 *   isLoading={isLoading}
 *   onRefresh={async () => {
 *     await refetchPlayers();
 *   }}
 * />
 */
