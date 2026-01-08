"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  /** Action label */
  label: string;
  /** Action icon */
  icon?: React.ReactNode;
  /** Background color class */
  bgColor?: string;
  /** Text color class */
  textColor?: string;
  /** Action handler */
  onClick: () => void;
}

interface SwipeableCardProps {
  /** Card content */
  children: React.ReactNode;
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
}

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
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const startXRef = React.useRef(0);
  const currentXRef = React.useRef(0);

  // Calculate max swipe distance based on actions
  const maxLeftSwipe = leftActions.length * 80; // 80px per action
  const maxRightSwipe = rightActions.length * 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDragging) return;
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
    if (disabled) return;
    setIsDragging(false);

    const cardWidth = cardRef.current?.offsetWidth || 300;
    const swipeRatio = Math.abs(translateX) / cardWidth;

    // Snap to action or reset
    if (translateX < 0 && leftActions.length > 0) {
      // Swiped left - show left actions
      if (swipeRatio > threshold) {
        setTranslateX(-maxLeftSwipe);
      } else {
        setTranslateX(0);
      }
    } else if (translateX > 0 && rightActions.length > 0) {
      // Swiped right - show right actions
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

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Right actions (revealed on swipe right) */}
      {rightActions.length > 0 && (
        <div className="absolute top-0 bottom-0 left-0 flex">
          {rightActions.map((action, idx) => (
            <button
              className={cn(
                "flex h-full w-20 flex-col items-center justify-center gap-1 font-medium text-xs transition-colors",
                action.bgColor || "bg-primary",
                action.textColor || "text-primary-foreground"
              )}
              key={idx}
              onClick={() => handleActionClick(action)}
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
          {leftActions.map((action, idx) => (
            <button
              className={cn(
                "flex h-full w-20 flex-col items-center justify-center gap-1 font-medium text-xs transition-colors",
                action.bgColor || "bg-destructive",
                action.textColor || "text-destructive-foreground"
              )}
              key={idx}
              onClick={() => handleActionClick(action)}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main card content */}
      <div
        className={cn(
          "relative rounded-lg border bg-card transition-transform",
          isDragging ? "transition-none" : "duration-200 ease-out"
        )}
        onClick={handleCardClick}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        ref={cardRef}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
