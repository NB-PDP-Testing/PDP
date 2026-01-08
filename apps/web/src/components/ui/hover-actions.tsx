"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type buttonVariants } from "./button";
import type { VariantProps } from "class-variance-authority";

/**
 * HoverActions - Reveal action buttons on hover (desktop)
 * 
 * Provides hover-reveal action buttons for table rows and cards.
 * On mobile, these are always visible or use alternative patterns (swipe, tap).
 * 
 * Usage:
 * ```tsx
 * <HoverActionsContainer>
 *   <div>Row content</div>
 *   <HoverActions>
 *     <HoverActionButton onClick={handleEdit}>
 *       <Edit className="size-4" />
 *     </HoverActionButton>
 *     <HoverActionButton onClick={handleDelete} variant="destructive">
 *       <Trash className="size-4" />
 *     </HoverActionButton>
 *   </HoverActions>
 * </HoverActionsContainer>
 * ```
 */

interface HoverActionsContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Always show actions (useful for mobile) */
  alwaysShow?: boolean;
}

export function HoverActionsContainer({
  children,
  className,
  alwaysShow = false,
  ...props
}: HoverActionsContainerProps) {
  return (
    <div
      className={cn(
        "group relative",
        // Hover effect for desktop
        "transition-colors hover:bg-muted/50",
        className
      )}
      data-always-show={alwaysShow}
      {...props}
    >
      {children}
    </div>
  );
}

interface HoverActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Position of actions */
  position?: "right" | "left" | "overlay";
  /** Alignment within position */
  align?: "start" | "center" | "end";
}

export function HoverActions({
  children,
  className,
  position = "right",
  align = "center",
  ...props
}: HoverActionsProps) {
  return (
    <div
      className={cn(
        // Base styles - hidden by default, shown on hover
        "flex items-center gap-1",
        // Visibility: hidden until hover, always visible on mobile or if parent has data-always-show
        "opacity-0 transition-opacity group-hover:opacity-100",
        "group-data-[always-show=true]:opacity-100",
        // Mobile: always show
        "md:group-data-[always-show=false]:opacity-0 md:group-hover:opacity-100",
        // Position
        position === "right" && "absolute right-2 top-1/2 -translate-y-1/2",
        position === "left" && "absolute left-2 top-1/2 -translate-y-1/2",
        position === "overlay" && "absolute inset-0 flex justify-center bg-background/80 backdrop-blur-sm",
        // Alignment
        align === "start" && "items-start",
        align === "center" && "items-center",
        align === "end" && "items-end",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface HoverActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Tooltip text */
  tooltip?: string;
  /** Icon only mode (no text) */
  iconOnly?: boolean;
}

export function HoverActionButton({
  children,
  className,
  variant = "ghost",
  size = "icon-sm",
  tooltip,
  iconOnly = true,
  ...props
}: HoverActionButtonProps) {
  const button = (
    <Button
      variant={variant}
      size={iconOnly ? "icon-sm" : "sm"}
      className={cn(
        // Subtle appearance until focused
        "h-8 w-8 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );

  if (tooltip) {
    return (
      <div className="relative" title={tooltip}>
        {button}
      </div>
    );
  }

  return button;
}

/**
 * TableRowWithActions - Table row wrapper with hover actions
 */
interface TableRowWithActionsProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Show actions in a dedicated column vs overlay */
  actionsInColumn?: boolean;
  /** Always show actions */
  alwaysShowActions?: boolean;
}

export function TableRowWithActions({
  children,
  actions,
  className,
  actionsInColumn = true,
  alwaysShowActions = false,
  ...props
}: TableRowWithActionsProps) {
  return (
    <tr
      className={cn(
        "group relative border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      data-always-show={alwaysShowActions}
      {...props}
    >
      {children}
      {actions && actionsInColumn && (
        <td className="w-[100px] p-2 text-right">
          <div
            className={cn(
              "flex items-center justify-end gap-1",
              !alwaysShowActions && "opacity-0 transition-opacity group-hover:opacity-100"
            )}
          >
            {actions}
          </div>
        </td>
      )}
      {actions && !actionsInColumn && (
        <div
          className={cn(
            "absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md bg-background/80 px-1 py-0.5 shadow-sm backdrop-blur-sm",
            !alwaysShowActions && "opacity-0 transition-opacity group-hover:opacity-100"
          )}
        >
          {actions}
        </div>
      )}
    </tr>
  );
}

/**
 * CardWithActions - Card wrapper with hover actions
 */
interface CardWithActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** Position of actions on the card */
  actionsPosition?: "top-right" | "bottom-right" | "overlay";
  /** Always show actions */
  alwaysShowActions?: boolean;
}

export function CardWithActions({
  children,
  actions,
  className,
  actionsPosition = "top-right",
  alwaysShowActions = false,
  ...props
}: CardWithActionsProps) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md",
        className
      )}
      data-always-show={alwaysShowActions}
      {...props}
    >
      {children}
      {actions && (
        <div
          className={cn(
            "flex items-center gap-1",
            !alwaysShowActions && "opacity-0 transition-opacity group-hover:opacity-100",
            actionsPosition === "top-right" && "absolute right-2 top-2",
            actionsPosition === "bottom-right" && "absolute bottom-2 right-2",
            actionsPosition === "overlay" &&
              "absolute inset-0 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm"
          )}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
