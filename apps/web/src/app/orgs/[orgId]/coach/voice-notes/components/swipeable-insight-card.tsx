"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { AtSign, Check, MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLongPress } from "@/hooks/use-long-press";
import { cn } from "@/lib/utils";

type SwipeableInsightCardProps = {
  children: React.ReactNode;
  onApply: () => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
  onComment?: () => void;
  onMentionCoach?: () => void;
  disabled?: boolean; // Disable swipe for non-mobile or non-pending insights
};

const SWIPE_THRESHOLD = 100;

export function SwipeableInsightCard({
  children,
  onApply,
  onDismiss,
  onComment,
  onMentionCoach,
  disabled = false,
}: SwipeableInsightCardProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const x = useMotionValue(0);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Calculate opacity based on drag distance
  const greenOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 0.8]);
  const redOpacity = useTransform(x, [0, -SWIPE_THRESHOLD], [0, 0.8]);

  // Calculate icon position based on drag distance
  const greenIconX = useTransform(x, [0, SWIPE_THRESHOLD], [-20, 0]);
  const redIconX = useTransform(x, [0, -SWIPE_THRESHOLD], [20, 0]);

  const handleDragEnd = async (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number } }
  ) => {
    setIsDragging(false);
    const swipeDistance = info.offset.x;

    // Swipe right → Apply
    if (swipeDistance > SWIPE_THRESHOLD) {
      // Haptic feedback if supported
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
      await onApply();
    }
    // Swipe left → Dismiss
    else if (swipeDistance < -SWIPE_THRESHOLD) {
      // Haptic feedback if supported
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
      await onDismiss();
    }
  };

  // Long-press handler
  const handleLongPress = () => {
    // Haptic feedback on menu open (mobile only)
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
    setMenuOpen(true);
  };

  const longPressHandlers = useLongPress(handleLongPress);

  // Handle menu actions
  const handleMenuAction = async (action: () => void | Promise<void>) => {
    setMenuOpen(false);
    await action();
  };

  // Disable swipe on desktop or when disabled prop is true
  if (!isMobile || disabled) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
      <DropdownMenuTrigger asChild>
        <div className="relative" {...longPressHandlers}>
          {/* Background overlays */}
          <motion.div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-start rounded-lg bg-green-500 px-4",
              isDragging ? "opacity-100" : "opacity-0"
            )}
            style={{ opacity: greenOpacity }}
          >
            <motion.div style={{ x: greenIconX }}>
              <Check className="h-8 w-8 text-white" />
            </motion.div>
          </motion.div>

          <motion.div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-end rounded-lg bg-red-500 px-4",
              isDragging ? "opacity-100" : "opacity-0"
            )}
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
            onDragEnd={handleDragEnd}
            onDragStart={() => {
              setIsDragging(true);
            }}
            style={{ x }}
          >
            {children}
          </motion.div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuItem
          onClick={() => {
            handleMenuAction(onApply);
          }}
        >
          <Check className="mr-2 h-4 w-4" />
          <span>Apply Insight</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            handleMenuAction(onDismiss);
          }}
        >
          <X className="mr-2 h-4 w-4" />
          <span>Dismiss Insight</span>
        </DropdownMenuItem>

        {onComment && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleMenuAction(onComment)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Add Comment</span>
            </DropdownMenuItem>
          </>
        )}

        {onMentionCoach && (
          <DropdownMenuItem onClick={() => handleMenuAction(onMentionCoach)}>
            <AtSign className="mr-2 h-4 w-4" />
            <span>@Mention Coach</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setMenuOpen(false);
          }}
        >
          <span>Cancel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
