import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionCardProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Label text (keep short, 1-2 words) */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Optional tooltip for full context */
  title?: string;
  /** Optional background color (default: primary) */
  variant?: "primary" | "success" | "warning" | "danger" | "info" | "purple" | "pink" | "orange";
  /** Optional disabled state */
  disabled?: boolean;
}

/**
 * Compact action card for grid layouts
 *
 * Optimized for 3×3 grids on mobile dashboards.
 * Uses vertical layout (icon above text) for space efficiency.
 *
 * Touch target: 48px minimum (accessibility compliant)
 * Recommended grid: 3 columns with 12px gaps
 *
 * @example
 * ```tsx
 * <div className="grid grid-cols-3 gap-3">
 *   <ActionCard icon={Edit} label="Assess" onClick={handleAssess} />
 *   <ActionCard icon={Mic} label="Voice Notes" onClick={handleVoice} />
 * </div>
 * ```
 */
export function ActionCard({
  icon: Icon,
  label,
  onClick,
  title,
  variant = "primary",
  disabled = false,
}: ActionCardProps) {
  // Map variants to Tailwind classes
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
    success: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
    warning: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800",
    danger: "bg-red-600 hover:bg-red-700 active:bg-red-800",
    info: "bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800",
    purple: "bg-purple-600 hover:bg-purple-700 active:bg-purple-800",
    pink: "bg-pink-600 hover:bg-pink-700 active:bg-pink-800",
    orange: "bg-orange-600 hover:bg-orange-700 active:bg-orange-800",
  };

  return (
    <Button
      className={`flex h-auto min-h-[110px] w-full flex-col items-center justify-center gap-2 rounded-xl px-2 py-4 text-white transition-all ${
        variantStyles[variant]
      } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
      disabled={disabled}
      onClick={onClick}
      title={title || label}
      type="button"
    >
      <Icon className="h-8 w-8 shrink-0" strokeWidth={2} />
      <span className="line-clamp-2 text-center text-xs font-semibold leading-tight">
        {label}
      </span>
    </Button>
  );
}
