import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface OrgThemedButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "outline";
  size?: "sm" | "md" | "lg";
}

const OrgThemedButton = forwardRef<HTMLButtonElement, OrgThemedButtonProps>(
  (
    { className, variant = "primary", size = "md", children, ...props },
    ref
  ) => {
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

    const getStyle = () => {
      if (variant === "outline") {
        return {
          borderColor: "var(--org-primary)",
          color: "var(--org-primary)",
          "--tw-ring-color": "var(--org-primary)",
        } as React.CSSProperties;
      }

      const colorVar =
        variant === "secondary"
          ? "--org-secondary"
          : variant === "tertiary"
            ? "--org-tertiary"
            : "--org-primary";

      return {
        backgroundColor: `var(${colorVar})`,
        "--tw-ring-color": `var(${colorVar})`,
      } as React.CSSProperties;
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
);

OrgThemedButton.displayName = "OrgThemedButton";

export { OrgThemedButton };
