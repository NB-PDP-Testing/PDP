"use client";

import * as React from "react";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";

/**
 * Props for ResponsiveForm
 */
export interface ResponsiveFormProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  /** Form submit handler */
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Cancel handler (shows cancel button if provided) */
  onCancel?: () => void;
  /** Cancel button text */
  cancelText?: string;
  /** Whether to show sticky submit on mobile */
  stickySubmit?: boolean;
  /** Whether to autofocus first input */
  autoFocus?: boolean;
  /** Enable keyboard shortcuts (Cmd+S to save, Esc to cancel) */
  enableShortcuts?: boolean;
  /** Class name for the form content area */
  contentClassName?: string;
  /** Class name for the footer/button area */
  footerClassName?: string;
  /** Whether form is dirty (has unsaved changes) */
  isDirty?: boolean;
  /** Custom footer content (replaces default buttons) */
  customFooter?: React.ReactNode;
}

/**
 * ResponsiveForm - Form wrapper with mobile and desktop optimizations
 * 
 * Mobile Features:
 * - Sticky submit button at bottom
 * - Larger spacing for thumb zones
 * - Full-width buttons
 * 
 * Desktop Features:
 * - Keyboard shortcuts (Cmd+S, Esc)
 * - Inline buttons
 * - Autofocus support
 */
export function ResponsiveForm({
  children,
  onSubmit,
  isLoading = false,
  submitText = "Save",
  onCancel,
  cancelText = "Cancel",
  stickySubmit = true,
  autoFocus = true,
  enableShortcuts = true,
  className,
  contentClassName,
  footerClassName,
  isDirty,
  customFooter,
  ...props
}: ResponsiveFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isMobile = useIsMobile();

  // Autofocus first input
  useEffect(() => {
    if (autoFocus && formRef.current) {
      const firstInput = formRef.current.querySelector(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
      ) as HTMLElement;
      if (firstInput) {
        // Delay to ensure form is rendered
        requestAnimationFrame(() => {
          firstInput.focus();
        });
      }
    }
  }, [autoFocus]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableShortcuts || isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to submit
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!isLoading && formRef.current) {
          formRef.current.requestSubmit();
        }
      }
      // Escape to cancel
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enableShortcuts, isMobile, isLoading, onCancel]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await onSubmit(e);
    },
    [onSubmit]
  );

  const footer = customFooter ?? (
    <div
      className={cn(
        "flex gap-3",
        isMobile ? "flex-col-reverse" : "flex-row justify-end",
        footerClassName
      )}
    >
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className={cn(isMobile && "w-full")}
        >
          {cancelText}
        </Button>
      )}
      <Button
        type="submit"
        disabled={isLoading}
        className={cn(isMobile && "w-full")}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          submitText
        )}
      </Button>
    </div>
  );

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn(
        "relative",
        // Add padding bottom on mobile for sticky footer
        isMobile && stickySubmit && "pb-24",
        className
      )}
      {...props}
    >
      {/* Form content with responsive spacing */}
      <div
        className={cn(
          // More spacing on mobile for thumb zones
          isMobile ? "space-y-6" : "space-y-4",
          contentClassName
        )}
      >
        {children}
      </div>

      {/* Footer / Submit buttons */}
      {isMobile && stickySubmit ? (
        // Sticky footer on mobile
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-4 safe-area-pb">
          {footer}
        </div>
      ) : (
        // Regular footer on desktop
        <div className={cn("mt-6", footerClassName)}>{footer}</div>
      )}

      {/* Keyboard shortcut hints (desktop only) */}
      {enableShortcuts && !isMobile && (
        <div className="mt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘S
            </kbd>
            <span>to save</span>
          </span>
          {onCancel && (
            <span className="ml-3 inline-flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>
              <span>to cancel</span>
            </span>
          )}
        </div>
      )}
    </form>
  );
}

/**
 * ResponsiveFormSection - Section within a form with optional title
 */
export interface ResponsiveFormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Children */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Whether to show as a card on desktop */
  cardOnDesktop?: boolean;
}

export function ResponsiveFormSection({
  title,
  description,
  children,
  className,
  cardOnDesktop = false,
}: ResponsiveFormSectionProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        !isMobile && cardOnDesktop && "rounded-lg border bg-card p-6",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="font-semibold text-lg">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className={cn(isMobile ? "space-y-5" : "space-y-4")}>{children}</div>
    </div>
  );
}

/**
 * ResponsiveFormRow - Row for side-by-side fields on desktop
 */
export interface ResponsiveFormRowProps {
  /** Children (form fields) */
  children: React.ReactNode;
  /** Number of columns on desktop */
  columns?: 2 | 3 | 4;
  /** Additional class name */
  className?: string;
}

export function ResponsiveFormRow({
  children,
  columns = 2,
  className,
}: ResponsiveFormRowProps) {
  const isMobile = useIsMobile();

  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  };

  return (
    <div
      className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-1" : gridCols[columns],
        className
      )}
    >
      {children}
    </div>
  );
}