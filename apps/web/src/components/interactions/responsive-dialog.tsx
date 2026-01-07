"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * Props for ResponsiveDialog
 */
export interface ResponsiveDialogProps {
  /** Whether dialog is open */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Trigger element */
  trigger?: React.ReactNode;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Footer content (buttons, etc) */
  footer?: React.ReactNode;
  /** Additional class name for content */
  className?: string;
  /** Content class name */
  contentClassName?: string;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Force desktop mode (modal) */
  forceDesktop?: boolean;
  /** Force mobile mode (sheet) */
  forceMobile?: boolean;
}

/**
 * ResponsiveDialog - Sheet on mobile, modal on desktop
 * 
 * Mobile: Bottom sheet with drag handle
 * Desktop: Centered modal dialog
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
  showCloseButton = true,
  forceDesktop = false,
  forceMobile = false,
}: ResponsiveDialogProps) {
  const isMobileDevice = useIsMobile();
  const isMobile = forceMobile || (!forceDesktop && isMobileDevice);

  // Mobile: Use Drawer (bottom sheet)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className={cn("max-h-[90vh]", contentClassName)}>
          {(title || description) && (
            <DrawerHeader className="text-left">
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && (
                <DrawerDescription>{description}</DrawerDescription>
              )}
            </DrawerHeader>
          )}
          <div className={cn("overflow-auto px-4 pb-4", className)}>
            {children}
          </div>
          {footer && (
            <DrawerFooter className="pt-2">
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Dialog (modal)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn("sm:max-w-[425px]", contentClassName)}
        showCloseButton={showCloseButton}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        <div className={className}>{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * ResponsiveDialogClose - Close button that works with both Dialog and Drawer
 */
export function ResponsiveDialogClose({
  children,
  className,
  asChild = true,
}: {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerClose asChild={asChild} className={className}>
        {children}
      </DrawerClose>
    );
  }

  return (
    <DialogClose asChild={asChild} className={className}>
      {children}
    </DialogClose>
  );
}

/**
 * ConfirmationDialog - Pre-built confirmation dialog
 * 
 * Mobile: Bottom sheet with large touch targets
 * Desktop: Modal with keyboard support
 */
export interface ConfirmationDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;
  /** Whether confirmation is in progress */
  isLoading?: boolean;
  /** Whether this is a destructive action */
  destructive?: boolean;
  /** Icon to show (optional) */
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isLoading = false,
  destructive = false,
  icon,
}: ConfirmationDialogProps) {
  const isMobile = useIsMobile();
  const [isPending, setIsPending] = React.useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  const loading = isLoading || isPending;

  const footer = (
    <div className={cn(
      "flex gap-3",
      isMobile ? "flex-col-reverse" : "flex-row justify-end"
    )}>
      <ResponsiveDialogClose>
        <button
          disabled={loading}
          className={cn(
            "inline-flex items-center justify-center rounded-md border px-4 font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "disabled:opacity-50 disabled:pointer-events-none",
            isMobile ? "h-12 w-full" : "h-10"
          )}
        >
          {cancelText}
        </button>
      </ResponsiveDialogClose>
      <button
        onClick={handleConfirm}
        disabled={loading}
        className={cn(
          "inline-flex items-center justify-center rounded-md px-4 font-medium transition-colors",
          "disabled:opacity-50 disabled:pointer-events-none",
          destructive
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
          isMobile ? "h-12 w-full" : "h-10"
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          confirmText
        )}
      </button>
    </div>
  );

  const titleContent = icon ? (
    <span className="flex items-center gap-2">
      {icon}
      {title}
    </span>
  ) : null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={icon ? undefined : title}
      description={description}
      footer={footer}
    >
      {/* Show title with icon inline if icon provided */}
      {titleContent && (
        <div className="mb-2 font-semibold text-lg flex items-center gap-2">
          {icon}
          {title}
        </div>
      )}
    </ResponsiveDialog>
  );
}