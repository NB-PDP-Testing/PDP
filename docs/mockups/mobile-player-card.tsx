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

import { ChevronRight, Edit, BarChart3, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  age: number;
  team: string;
  position: string;
  rating: number;
}

interface MobilePlayerCardProps {
  player: Player;
  orgId: string;
  onEdit?: (player: Player) => void;
  onViewStats?: (player: Player) => void;
}

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
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-3 w-3",
              i < fullStars
                ? "fill-yellow-400 text-yellow-400"
                : i === fullStars && hasHalfStar
                  ? "fill-yellow-400/50 text-yellow-400"
                  : "fill-muted text-muted"
            )}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">
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
          onClick={() => {
            onEdit?.(player);
            closeActions();
          }}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1",
            "bg-blue-500 text-white",
            // Touch target compliance
            "min-h-[44px] min-w-[44px]",
            "active:bg-blue-600"
          )}
        >
          <Edit className="h-5 w-5" />
          <span className="text-xs font-medium">Edit</span>
        </button>
        <button
          onClick={() => {
            onViewStats?.(player);
            closeActions();
          }}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1",
            "bg-green-500 text-white",
            "min-h-[44px] min-w-[44px]",
            "active:bg-green-600"
          )}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-xs font-medium">Stats</span>
        </button>
      </div>

      {/* Main card content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isRevealed) {
            closeActions();
          }
        }}
        className={cn(
          "relative bg-card border rounded-lg",
          "transition-transform duration-200 ease-out",
          "active:bg-accent/50"
        )}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
        }}
      >
        <Link
          href={`/orgs/${orgId}/players/${player.id}`}
          className="flex items-center gap-4 p-4"
        >
          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={player.avatarUrl} alt={player.name} />
            <AvatarFallback>
              {player.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">
                {player.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                U{player.age}
              </Badge>
              <span className="text-sm text-muted-foreground truncate">
                {player.position}
              </span>
            </div>
            <div className="mt-1.5">
              {renderRating(player.rating)}
            </div>
          </div>

          {/* Team & Chevron */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm text-muted-foreground">
              {player.team}
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>

        {/* Swipe hint indicator */}
        {!isRevealed && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
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
interface MobilePlayerListProps {
  players: Player[];
  orgId: string;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

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
    <div className="flex flex-col h-full">
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
            "w-6 h-6 border-2 border-primary border-t-transparent rounded-full",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: !isRefreshing
              ? `rotate(${(pullDistance / REFRESH_THRESHOLD) * 360}deg)`
              : undefined,
          }}
        />
        {pullDistance > REFRESH_THRESHOLD && !isRefreshing && (
          <span className="ml-2 text-sm text-muted-foreground">
            Release to refresh
          </span>
        )}
      </div>

      {/* Player List */}
      <div
        ref={listRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto space-y-2 px-4 pb-20"
      >
        {isLoading ? (
          // Skeleton loading state
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 bg-card border rounded-lg animate-pulse"
            >
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))
        ) : players.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No players yet</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs">
              Get started by adding your first player or importing from a
              spreadsheet.
            </p>
            <button className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium">
              <Plus className="h-5 w-5" />
              Add Player
            </button>
          </div>
        ) : (
          // Player cards
          players.map((player) => (
            <MobilePlayerCard
              key={player.id}
              player={player}
              orgId={orgId}
              onEdit={(p) => console.log("Edit", p)}
              onViewStats={(p) => console.log("Stats", p)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Need to import these at top
import { Users, Plus } from "lucide-react";

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
