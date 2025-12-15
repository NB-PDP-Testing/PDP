import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

export interface OrgThemedButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "outline";
  size?: "sm" | "md" | "lg";
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Organization-themed button component
 * Automatically uses the org's CSS custom properties for colors
 * Following React 19 best practices - ref as prop instead of forwardRef
 */
export function OrgThemedButton({
  className,
  variant = "primary",
  size = "md",
  children,
  ref,
  ...props
}: OrgThemedButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const sizeStyles = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-8 text-lg",
  };

  const variantStyles = {
    primary:
      "text-white shadow-sm hover:opacity-90 focus:ring-[var(--org-primary)]",
    secondary:
      "text-white shadow-sm hover:opacity-90 focus:ring-[var(--org-secondary)]",
    tertiary:
      "text-white shadow-sm hover:opacity-90 focus:ring-[var(--org-tertiary)]",
    outline: "border-2 bg-transparent hover:bg-opacity-10",
  };

  const getStyle = (): React.CSSProperties => {
    if (variant === "outline") {
      return {
        borderColor: "var(--org-primary)",
        color: "var(--org-primary)",
      };
    }

    // Map non-outline variants to their CSS variable names
    const colorVarMap: Record<"primary" | "secondary" | "tertiary", string> = {
      primary: "--org-primary",
      secondary: "--org-secondary",
      tertiary: "--org-tertiary",
    };

    return {
      backgroundColor: `var(${colorVarMap[variant as "primary" | "secondary" | "tertiary"]})`,
    };
  };

  return (
    <button
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      ref={ref}
      style={getStyle()}
      {...props}
    >
      {children}
    </button>
  );
}
