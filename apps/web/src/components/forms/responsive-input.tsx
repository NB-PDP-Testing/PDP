"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Props for ResponsiveInput
 */
export interface ResponsiveInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label?: string;
  /** Error message */
  error?: string;
  /** Success message (for inline validation) */
  success?: string;
  /** Help text shown below input */
  helpText?: string;
  /** Whether field is required */
  required?: boolean;
  /** Left addon (icon or text) */
  leftAddon?: React.ReactNode;
  /** Right addon (icon or text) */
  rightAddon?: React.ReactNode;
}

/**
 * ResponsiveInput - Input with mobile-optimized sizing
 * 
 * Mobile: 48px height, larger text, larger touch targets
 * Desktop: 40px height, standard text
 */
export const ResponsiveInput = React.forwardRef<
  HTMLInputElement,
  ResponsiveInputProps
>(
  (
    {
      className,
      label,
      error,
      success,
      helpText,
      required,
      leftAddon,
      rightAddon,
      type,
      id,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const inputId = id || `input-${React.useId()}`;

    // Determine input mode for mobile keyboards
    const inputMode = React.useMemo(() => {
      if (type === "email") return "email";
      if (type === "tel") return "tel";
      if (type === "url") return "url";
      if (type === "number") return "numeric";
      return undefined;
    }, [type]);

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={inputId}
            className={cn(
              // Larger label on mobile
              isMobile ? "text-base" : "text-sm"
            )}
          >
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </Label>
        )}

        <div className="relative">
          {leftAddon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
              {leftAddon}
            </div>
          )}

          <Input
            ref={ref}
            id={inputId}
            type={type}
            inputMode={inputMode}
            className={cn(
              // Responsive heights: 48px mobile, 40px desktop
              isMobile ? "h-12 text-base" : "h-10 text-sm",
              // Padding for addons
              leftAddon && "pl-10",
              rightAddon && "pr-10",
              // Error/success states
              error && "border-destructive focus-visible:ring-destructive",
              success && "border-green-500 focus-visible:ring-green-500",
              className
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helpText
                  ? `${inputId}-help`
                  : undefined
            }
            {...props}
          />

          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
              {rightAddon}
            </div>
          )}

          {/* Validation icons */}
          {!rightAddon && (error || success) && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {error && <AlertCircle className="h-5 w-5 text-destructive" />}
              {success && !error && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-destructive flex items-center gap-1"
          >
            {error}
          </p>
        )}

        {/* Success message */}
        {success && !error && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            {success}
          </p>
        )}

        {/* Help text */}
        {helpText && !error && !success && (
          <p
            id={`${inputId}-help`}
            className="text-sm text-muted-foreground"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);
ResponsiveInput.displayName = "ResponsiveInput";

/**
 * Props for ResponsiveTextarea
 */
export interface ResponsiveTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label */
  label?: string;
  /** Error message */
  error?: string;
  /** Help text shown below input */
  helpText?: string;
  /** Whether field is required */
  required?: boolean;
  /** Auto-grow height based on content */
  autoGrow?: boolean;
}

/**
 * ResponsiveTextarea - Textarea with mobile-optimized sizing
 */
export const ResponsiveTextarea = React.forwardRef<
  HTMLTextAreaElement,
  ResponsiveTextareaProps
>(
  (
    {
      className,
      label,
      error,
      helpText,
      required,
      autoGrow,
      id,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const inputId = id || `textarea-${React.useId()}`;
    const [height, setHeight] = React.useState<number | undefined>(undefined);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    // Auto-grow functionality
    const handleInput = React.useCallback(() => {
      if (autoGrow && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        setHeight(textareaRef.current.scrollHeight);
      }
    }, [autoGrow]);

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={inputId}
            className={cn(isMobile ? "text-base" : "text-sm")}
          >
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </Label>
        )}

        <Textarea
          ref={textareaRef}
          id={inputId}
          onInput={handleInput}
          style={autoGrow && height ? { height } : undefined}
          className={cn(
            // Larger on mobile
            isMobile ? "min-h-[120px] text-base p-4" : "min-h-[80px] text-sm p-3",
            // Error state
            error && "border-destructive focus-visible:ring-destructive",
            // Auto-grow styles
            autoGrow && "resize-none overflow-hidden",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helpText
                ? `${inputId}-help`
                : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {helpText && !error && (
          <p
            id={`${inputId}-help`}
            className="text-sm text-muted-foreground"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);
ResponsiveTextarea.displayName = "ResponsiveTextarea";

/**
 * Props for ResponsiveSelect wrapper
 */
export interface ResponsiveSelectProps {
  /** Field label */
  label?: string;
  /** Error message */
  error?: string;
  /** Help text */
  helpText?: string;
  /** Whether field is required */
  required?: boolean;
  /** Children (SelectTrigger, SelectContent, etc.) */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * ResponsiveSelect - Wrapper for Select component with label/error
 */
export function ResponsiveSelect({
  label,
  error,
  helpText,
  required,
  children,
  className,
}: ResponsiveSelectProps) {
  const isMobile = useIsMobile();
  const selectId = `select-${React.useId()}`;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label
          htmlFor={selectId}
          className={cn(isMobile ? "text-base" : "text-sm")}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      {/* Apply responsive height to SelectTrigger via CSS class */}
      <div
        className={cn(
          "[&_button]:transition-all",
          isMobile
            ? "[&_button]:h-12 [&_button]:text-base"
            : "[&_button]:h-10 [&_button]:text-sm"
        )}
      >
        {children}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {helpText && !error && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}