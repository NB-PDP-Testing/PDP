"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type SwipeableInsightCardProps = {
  children: React.ReactNode;
  onApply: () => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
  disabled?: boolean; // Disable swipe for non-mobile or non-pending insights
};

const SWIPE_THRESHOLD = 100;

export function SwipeableInsightCard({
  children,
  onApply,
  onDismiss,
  disabled = false,
}: SwipeableInsightCardProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  // Disable swipe on desktop or when disabled prop is true
  if (!isMobile || disabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
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
  );
}
