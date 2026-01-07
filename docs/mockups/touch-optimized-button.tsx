/**
 * MOCKUP: Touch-Optimized Button Variants
 *
 * Industry Standard: 44x44pt minimum touch targets (Apple HIG)
 * Research shows buttons < 44px are missed by 25%+ of users
 *
 * This shows proposed modifications to the existing button.tsx
 */

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * UPDATED BUTTON VARIANTS
 *
 * Key changes:
 * 1. Added 'touch' size that meets 44px minimum
 * 2. Added 'touch-lg' for primary actions (48px)
 * 3. Added responsive sizing option
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Original sizes (kept for desktop)
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",

        // NEW: Touch-optimized sizes (44px+ for mobile compliance)
        touch: "h-11 px-5 py-2.5 has-[>svg]:px-4", // 44px - minimum touch target
        "touch-lg": "h-12 px-6 py-3 has-[>svg]:px-5", // 48px - comfortable touch
        "touch-xl": "h-14 px-8 py-4 text-base has-[>svg]:px-6", // 56px - primary CTA

        // NEW: Touch-optimized icon buttons
        "icon-touch": "size-11", // 44px - minimum touch target
        "icon-touch-lg": "size-12", // 48px - comfortable touch

        // NEW: Responsive sizes (default on mobile, smaller on desktop)
        responsive: "h-11 px-5 md:h-9 md:px-4", // 44px mobile, 36px desktop
        "responsive-sm": "h-10 px-4 md:h-8 md:px-3", // 40px mobile, 32px desktop
        "icon-responsive": "size-11 md:size-9", // 44px mobile, 36px desktop
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };

/**
 * USAGE EXAMPLES:
 *
 * // Standard button (use for desktop-primary contexts)
 * <Button>Click me</Button>
 *
 * // Touch-optimized (use for mobile-first or always-touch contexts)
 * <Button size="touch">Save Player</Button>
 *
 * // Large touch CTA (use for primary actions in mobile flows)
 * <Button size="touch-xl">Complete Assessment</Button>
 *
 * // Responsive (automatically adapts to screen size)
 * <Button size="responsive">Add Player</Button>
 *
 * // Icon button with proper touch target
 * <Button size="icon-touch" variant="ghost">
 *   <Plus className="h-5 w-5" />
 * </Button>
 *
 * // Responsive icon button
 * <Button size="icon-responsive" variant="outline">
 *   <Search className="h-5 w-5" />
 * </Button>
 */

/**
 * MIGRATION GUIDE:
 *
 * For mobile-first pages, replace:
 *   size="default" → size="responsive"
 *   size="sm" → size="responsive-sm"
 *   size="icon" → size="icon-responsive"
 *
 * For always-mobile contexts (bottom nav, mobile sheets):
 *   size="default" → size="touch"
 *   size="icon" → size="icon-touch"
 *
 * For primary CTAs on mobile:
 *   <Button size="touch-lg">Primary Action</Button>
 *   <Button size="touch-xl">Complete Flow</Button>
 */
