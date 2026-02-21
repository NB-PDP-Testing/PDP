"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// Rating type (0-5 scale, where 0 = not assessed)
export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

// Rating configuration with colors and labels
const RATING_CONFIG: Record<
  number,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  0: {
    label: "Not Assessed",
    color: "text-gray-400",
    bgColor: "bg-gray-300",
    borderColor: "border-gray-300",
  },
  1: {
    label: "Developing",
    color: "text-red-600",
    bgColor: "bg-red-500",
    borderColor: "border-red-500",
  },
  2: {
    label: "Emerging",
    color: "text-orange-600",
    bgColor: "bg-orange-500",
    borderColor: "border-orange-500",
  },
  3: {
    label: "Competent",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500",
    borderColor: "border-yellow-500",
  },
  4: {
    label: "Proficient",
    color: "text-lime-600",
    bgColor: "bg-lime-500",
    borderColor: "border-lime-500",
  },
  5: {
    label: "Excellent",
    color: "text-green-600",
    bgColor: "bg-green-500",
    borderColor: "border-green-500",
  },
};

// Helper functions
export function getColorForRating(rating: number): string {
  if (rating === 0) {
    return "#9ca3af"; // gray-400
  }
  if (rating <= 1) {
    return "#dc2626"; // red-600
  }
  if (rating <= 2) {
    return "#ea580c"; // orange-600
  }
  if (rating <= 3) {
    return "#ca8a04"; // yellow-600
  }
  if (rating <= 4) {
    return "#65a30d"; // lime-600
  }
  return "#16a34a"; // green-600
}

export function getRatingLabel(rating: number): string {
  return RATING_CONFIG[rating]?.label ?? "Not Rated";
}

export function getRatingConfig(rating: number) {
  return RATING_CONFIG[rating] ?? RATING_CONFIG[3];
}

type RatingSliderProps = {
  /** Label for the skill being rated */
  label: string;
  /** Current rating value (1-5) */
  value: Rating;
  /** Callback when rating changes */
  onChange: (value: Rating) => void;
  /** Optional description of the skill */
  description?: string;
  /** Previous rating value for comparison */
  previousValue?: number;
  /** Whether the rating has been saved */
  isSaved?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Compact mode - smaller text and spacing */
  compact?: boolean;
  /** Show labels below slider */
  showLabels?: boolean;
  /** Benchmark expected rating to display as a marker on the slider */
  benchmarkValue?: number;
  /** Custom class name */
  className?: string;
};

export function RatingSlider({
  label,
  value,
  onChange,
  description,
  previousValue,
  isSaved = false,
  disabled = false,
  compact = false,
  showLabels = true,
  benchmarkValue,
  className,
}: RatingSliderProps) {
  const config = useMemo(() => getRatingConfig(value), [value]);
  const color = useMemo(() => getColorForRating(value), [value]);

  // Calculate percentage for progress bar (0 = 0%, 1-5 mapped across 0-100%)
  const percentage = value === 0 ? 0 : ((value - 1) / 4) * 100;

  // Determine if there's an improvement or decline from previous
  const change = previousValue ? value - previousValue : null;

  return (
    <div className={cn("mb-4", className)}>
      {/* Header with label and rating */}
      <div
        className={cn(
          "mb-2 flex items-center justify-between",
          compact && "mb-1"
        )}
      >
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "font-medium text-gray-700",
              compact ? "text-sm" : "text-base"
            )}
          >
            {label}
          </span>
          {description && (
            <p className="truncate text-gray-500 text-xs">{description}</p>
          )}
        </div>
        <div className="ml-3 flex items-center gap-2">
          {/* Previous value indicator */}
          {previousValue && previousValue !== value && (
            <span className="text-gray-400 text-xs">Was: {previousValue}</span>
          )}
          {/* Change indicator */}
          {change !== null && change !== 0 && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-medium text-xs",
                change > 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {change > 0 ? "+" : ""}
              {change}
            </span>
          )}
          {/* Current value and label */}
          <div className="flex items-center gap-2">
            <span
              className={cn("font-bold text-lg", config.color)}
              style={{ color }}
            >
              {value}
            </span>
            <span className="text-gray-500 text-xs">- {config.label}</span>
          </div>
          {/* Saved indicator */}
          {isSaved && <span className="text-green-600 text-xs">✓</span>}
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          className={cn(
            "h-3 w-full cursor-pointer appearance-none rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={disabled}
          max="5"
          min="0"
          onChange={(e) =>
            onChange(Number.parseInt(e.target.value, 10) as Rating)
          }
          step="1"
          style={{
            background: `linear-gradient(to right, 
              #dc2626 0%, 
              #ea580c 25%, 
              #ca8a04 50%, 
              #65a30d 75%, 
              #16a34a 100%)`,
          }}
          type="range"
          value={value}
        />

        {/* Benchmark marker */}
        {benchmarkValue !== undefined && (
          <div
            className="pointer-events-none absolute top-0 h-3 w-0.5 bg-blue-600"
            style={{ left: `${(benchmarkValue / 5) * 100}%` }}
            title={`Benchmark: ${benchmarkValue}`}
          />
        )}

        {/* Progress indicator overlay */}
        <div
          className="pointer-events-none absolute top-0 left-0 h-3 rounded-lg"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(to right, 
              #dc2626 0%, 
              ${color} 100%)`,
            opacity: 0.3,
          }}
        />

        {/* Rating labels */}
        {showLabels && (
          <div className="mt-1 flex justify-between text-gray-500 text-xs">
            <span>0</span>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        )}
      </div>

      {/* Rating level labels */}
      {showLabels && !compact && (
        <div className="mt-0.5 flex justify-between text-gray-400 text-xs">
          <span>Developing</span>
          <span className="hidden sm:inline">Emerging</span>
          <span className="hidden sm:inline">Competent</span>
          <span className="hidden sm:inline">Proficient</span>
          <span>Excellent</span>
        </div>
      )}
    </div>
  );
}

// Alternative visual rating display (dots/stars)
type RatingDotsProps = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export function RatingDots({
  value,
  max = 5,
  size = "md",
  showLabel = false,
  className,
}: RatingDotsProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
        <div
          className={cn(
            "rounded-full transition-colors",
            sizeClasses[size],
            rating <= value ? getRatingConfig(rating).bgColor : "bg-gray-200"
          )}
          key={rating}
        />
      ))}
      {showLabel && value > 0 && (
        <span className="ml-2 text-gray-500 text-xs">
          {getRatingLabel(value)}
        </span>
      )}
    </div>
  );
}

// Progress bar style rating display
type RatingBarProps = {
  value: number;
  max?: number;
  showPercentage?: boolean;
  showLabel?: boolean;
  height?: "sm" | "md" | "lg";
  className?: string;
};

export function RatingBar({
  value,
  max = 5,
  showPercentage = false,
  showLabel = false,
  height = "md",
  className,
}: RatingBarProps) {
  const percentage = (value / max) * 100;
  const color = getColorForRating(value);

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn("w-full rounded-full bg-gray-200", heightClasses[height])}
      >
        <div
          className={cn(
            "rounded-full transition-all duration-300",
            heightClasses[height]
          )}
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {(showPercentage || showLabel) && (
        <div className="mt-1 flex justify-between text-gray-500 text-xs">
          {showLabel && <span>{getRatingLabel(value)}</span>}
          {showPercentage && (
            <span>
              {value}/{max}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default RatingSlider;
