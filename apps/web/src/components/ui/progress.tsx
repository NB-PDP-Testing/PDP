import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

type ProgressVariant = "default" | "success" | "error"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  variant?: ProgressVariant
}

function Progress({
  className,
  value,
  variant = "default",
  ...props
}: ProgressProps) {
  const percentage = value || 0

  // Color transitions based on progress and variant
  const getBarColor = () => {
    if (variant === "success") return "hsl(142 76% 36%)" // green
    if (variant === "error") return "hsl(0 84% 60%)" // red
    if (percentage < 50) return "hsl(221 83% 53%)" // blue
    return "hsl(142 76% 36%)" // green for 50%+
  }

  // Background color
  const getBgColor = () => {
    if (variant === "success") return "bg-green-100"
    if (variant === "error") return "bg-red-100"
    if (percentage < 50) return "bg-blue-100"
    return "bg-green-100"
  }

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        getBgColor(),
        className
      )}
      {...props}
    >
      {/* Shimmer effect background */}
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Animated progress indicator */}
      <motion.div
        className="h-full rounded-full"
        style={{
          backgroundColor: getBarColor(),
        }}
        initial={{ width: 0 }}
        animate={{
          width: `${percentage}%`,
        }}
        transition={{
          duration: 0.5,
          ease: "easeInOut",
        }}
      />

      {/* Success pulse animation */}
      {variant === "success" && (
        <motion.div
          className="absolute inset-0 rounded-full bg-green-400/40"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.5,
          }}
        />
      )}

      {/* Error shake animation */}
      {variant === "error" && (
        <motion.div
          className="absolute inset-0"
          initial={{ x: 0 }}
          animate={{
            x: [-4, 4, -4, 4, 0],
          }}
          transition={{
            duration: 0.4,
            ease: "easeInOut",
          }}
        />
      )}
    </ProgressPrimitive.Root>
  )
}

export { Progress }
