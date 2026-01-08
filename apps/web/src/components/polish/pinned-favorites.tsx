"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Star, X, Plus, GripVertical } from "lucide-react";
import Link, { type LinkProps } from "next/link";

export interface FavoriteItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  color?: string;
}

interface PinnedFavoritesProps {
  /** Maximum number of favorites */
  maxItems?: number;
  /** Storage key for persistence */
  storageKey?: string;
  /** Orientation of the favorites list */
  orientation?: "horizontal" | "vertical";
  /** Show add button */
  showAddButton?: boolean;
  /** Current page URL (to highlight active) */
  currentPath?: string;
  /** Callback when favorites change */
  onFavoritesChange?: (favorites: FavoriteItem[]) => void;
  /** Container class name */
  className?: string;
}

/**
 * PinnedFavorites - Quick access to user's pinned pages/items
 * 
 * Features:
 * - Drag to reorder favorites
 * - Click star on any page to add
 * - Persists to localStorage
 * - Shows in sidebar or header
 */
export function PinnedFavorites({
  maxItems = 8,
  storageKey = "pinned-favorites",
  orientation = "vertical",
  showAddButton = true,
  currentPath,
  onFavoritesChange,
  className,
}: PinnedFavoritesProps) {
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  // Load favorites on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse favorites:", e);
      }
    }
  }, [storageKey]);

  // Persist favorites changes
  const updateFavorites = (newFavorites: FavoriteItem[]) => {
    setFavorites(newFavorites);
    localStorage.setItem(storageKey, JSON.stringify(newFavorites));
    onFavoritesChange?.(newFavorites);
  };

  // Remove a favorite
  const removeFavorite = (id: string) => {
    updateFavorites(favorites.filter((f) => f.id !== id));
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFavorites = [...favorites];
    const [removed] = newFavorites.splice(draggedIndex, 1);
    newFavorites.splice(index, 0, removed);
    setFavorites(newFavorites);
    setDraggedIndex(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
    localStorage.setItem(storageKey, JSON.stringify(favorites));
    onFavoritesChange?.(favorites);
  };

  if (favorites.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex gap-1",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
          className
        )}
      >
        {favorites.map((favorite, index) => (
          <div
            key={favorite.id}
            draggable={isEditing}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "group relative",
              draggedIndex === index && "opacity-50"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={favorite.href as LinkProps<string>["href"]}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                    "hover:bg-accent transition-colors",
                    currentPath === favorite.href && "bg-accent",
                    orientation === "horizontal" && "px-2"
                  )}
                >
                  {isEditing && (
                    <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                  )}
                  {favorite.icon ? (
                    <span
                      className="flex-shrink-0"
                      style={{ color: favorite.color }}
                    >
                      {favorite.icon}
                    </span>
                  ) : (
                    <Star
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: favorite.color || "currentColor" }}
                    />
                  )}
                  {orientation === "vertical" && (
                    <span className="truncate">{favorite.label}</span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side={orientation === "vertical" ? "right" : "bottom"}>
                {favorite.label}
              </TooltipContent>
            </Tooltip>

            {/* Remove button (visible on hover or in edit mode) */}
            {(isEditing || true) && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute -right-1 -top-1 h-4 w-4 rounded-full bg-background border shadow-sm",
                  "opacity-0 group-hover:opacity-100 transition-opacity"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  removeFavorite(favorite.id);
                }}
              >
                <X className="h-2 w-2" />
              </Button>
            )}
          </div>
        ))}

        {/* Add button / Edit toggle */}
        {showAddButton && favorites.length < maxItems && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start gap-2",
                  orientation === "horizontal" && "px-2"
                )}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <Star className="h-4 w-4" />
                    {orientation === "vertical" && <span>Done</span>}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {orientation === "vertical" && <span>Add favorite</span>}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={orientation === "vertical" ? "right" : "bottom"}>
              {isEditing ? "Done editing" : "Add favorite"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Button to add/remove current page from favorites
 */
interface FavoriteToggleButtonProps {
  item: FavoriteItem;
  storageKey?: string;
  className?: string;
}

export function FavoriteToggleButton({
  item,
  storageKey = "pinned-favorites",
  className,
}: FavoriteToggleButtonProps) {
  const [isFavorite, setIsFavorite] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const favorites: FavoriteItem[] = JSON.parse(stored);
      setIsFavorite(favorites.some((f) => f.id === item.id));
    }
  }, [storageKey, item.id]);

  const toggleFavorite = () => {
    const stored = localStorage.getItem(storageKey);
    let favorites: FavoriteItem[] = stored ? JSON.parse(stored) : [];

    if (isFavorite) {
      favorites = favorites.filter((f) => f.id !== item.id);
    } else {
      favorites.push(item);
    }

    localStorage.setItem(storageKey, JSON.stringify(favorites));
    setIsFavorite(!isFavorite);

    // Dispatch event for other components to listen
    window.dispatchEvent(new CustomEvent("favorites-changed", { detail: favorites }));
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", className)}
            onClick={toggleFavorite}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isFavorite ? "Remove from favorites" : "Add to favorites"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook to manage favorites programmatically
 */
export function useFavorites(storageKey = "pinned-favorites") {
  const [favorites, setFavorites] = React.useState<FavoriteItem[]>([]);

  React.useEffect(() => {
    const loadFavorites = () => {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    };

    loadFavorites();

    // Listen for changes from other components
    const handleChange = (e: CustomEvent<FavoriteItem[]>) => {
      setFavorites(e.detail);
    };

    window.addEventListener("favorites-changed", handleChange as EventListener);
    return () => {
      window.removeEventListener("favorites-changed", handleChange as EventListener);
    };
  }, [storageKey]);

  const addFavorite = (item: FavoriteItem) => {
    const newFavorites = [...favorites, item];
    localStorage.setItem(storageKey, JSON.stringify(newFavorites));
    setFavorites(newFavorites);
    window.dispatchEvent(new CustomEvent("favorites-changed", { detail: newFavorites }));
  };

  const removeFavorite = (id: string) => {
    const newFavorites = favorites.filter((f) => f.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(newFavorites));
    setFavorites(newFavorites);
    window.dispatchEvent(new CustomEvent("favorites-changed", { detail: newFavorites }));
  };

  const isFavorite = (id: string) => favorites.some((f) => f.id === id);

  return { favorites, addFavorite, removeFavorite, isFavorite };
}