"use client";

import { type ReactNode, type TouchEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SwipeAction = {
  /** Action label */
  label: string;
  /** Action icon */
  icon?: ReactNode;
  /** Background color class */
  bgColor?: string;
  /** Text color class */
  textColor?: string;
  /** Action handler */
  onClick: () => void;
};

type SwipeableCardProps = {
  /** Card content */
  children: ReactNode;
  /** Left swipe actions (revealed when swiping left) */
  leftActions?: SwipeAction[];
  /** Right swipe actions (revealed when swiping right) */
  rightActions?: SwipeAction[];
  /** Threshold to trigger action (0-1) */
  threshold?: number;
  /** Class name for card container */
  className?: string;
  /** Whether swipe is disabled */
  disabled?: boolean;
};

/**
 * SwipeableCard - Mobile card with swipe-to-reveal actions
 *
 * Phase 2 UX improvement: Enables native-feeling swipe gestures
 * on mobile for quick actions like edit/delete.
 */
export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 0.3,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  // Calculate max swipe distance based on actions
  const maxLeftSwipe = leftActions.length * 80; // 80px per action
  const maxRightSwipe = rightActions.length * 80;

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) {
      return;
    }
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || !isDragging) {
      return;
    }
    const diff = e.touches[0].clientX - startXRef.current;
    let newTranslate = currentXRef.current + diff;

    // Limit swipe distance
    if (newTranslate > maxRightSwipe) {
      newTranslate = maxRightSwipe + (newTranslate - maxRightSwipe) * 0.2;
    }
    if (newTranslate < -maxLeftSwipe) {
      newTranslate = -maxLeftSwipe + (newTranslate + maxLeftSwipe) * 0.2;
    }

    setTranslateX(newTranslate);
  };

  const handleTouchEnd = () => {
    if (disabled) {
      return;
    }
    setIsDragging(false);

    // Bug fix #235: Calculate swipe ratio based on max swipe distance, not card width
    // This ensures the threshold works correctly regardless of how many actions there are.
    // Previously, with 1 left action (80px) on a 375px card, you'd need to swipe 112px
    // (30% of 375) which is MORE than the action width, making it nearly impossible.
    // Now, you only need to swipe 30% of the action width (24px for an 80px action).

    // Snap to action or reset
    if (translateX < 0 && leftActions.length > 0) {
      // Swiped left - show left actions
      const swipeRatio = Math.abs(translateX) / maxLeftSwipe;
      if (swipeRatio > threshold) {
        setTranslateX(-maxLeftSwipe);
      } else {
        setTranslateX(0);
      }
    } else if (translateX > 0 && rightActions.length > 0) {
      // Swiped right - show right actions
      const swipeRatio = translateX / maxRightSwipe;
      if (swipeRatio > threshold) {
        setTranslateX(maxRightSwipe);
      } else {
        setTranslateX(0);
      }
    } else {
      setTranslateX(0);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    setTranslateX(0);
    action.onClick();
  };

  // Reset on click outside
  const handleCardClick = () => {
    if (translateX !== 0) {
      setTranslateX(0);
    }
  };

  // Handle keyboard interaction for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && translateX !== 0) {
      setTranslateX(0);
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Right actions (revealed on swipe right) */}
      {rightActions.length > 0 && (
        <div className="absolute top-0 bottom-0 left-0 flex">
          {rightActions.map((action) => (
            <button
              className={cn(
                "flex h-full w-20 flex-col items-center justify-center gap-1 font-medium text-xs transition-colors",
                action.bgColor || "bg-primary",
                action.textColor || "text-primary-foreground"
              )}
              key={action.label}
              onClick={() => handleActionClick(action)}
              type="button"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Left actions (revealed on swipe left) */}
      {leftActions.length > 0 && (
        <div className="absolute top-0 right-0 bottom-0 flex">
          {leftActions.map((action) => (
            <button
              className={cn(
                "flex h-full w-20 flex-col items-center justify-center gap-1 font-medium text-xs transition-colors",
                action.bgColor || "bg-destructive",
                action.textColor || "text-destructive-foreground"
              )}
              key={action.label}
              onClick={() => handleActionClick(action)}
              type="button"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main card content - swipeable container */}
      {/* biome-ignore lint/a11y/useSemanticElements: This is a swipeable card container that holds other interactive elements, not a simple button */}
      <div
        className={cn(
          "relative rounded-lg border bg-card transition-transform",
          isDragging ? "transition-none" : "duration-200 ease-out"
        )}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        ref={cardRef}
        role="button"
        style={{ transform: `translateX(${translateX}px)` }}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
