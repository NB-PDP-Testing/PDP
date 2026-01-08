"use client";

import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Props for InlineEdit component
 */
export interface InlineEditProps {
  /** Current value */
  value: string;
  /** Callback when value is saved */
  onSave: (value: string) => void | Promise<void>;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Label for the field (used in mobile modal) */
  label?: string;
  /** Input type */
  type?: "text" | "textarea" | "email" | "number" | "url" | "tel";
  /** Whether to allow empty values */
  allowEmpty?: boolean;
  /** Validation function */
  validate?: (value: string) => string | null;
  /** Display component when not editing */
  children?: React.ReactNode;
  /** Additional class name for the container */
  className?: string;
  /** Additional class name for the input */
  inputClassName?: string;
  /** Save button text */
  saveText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Edit button aria-label */
  editLabel?: string;
  /** Force desktop mode */
  forceDesktop?: boolean;
  /** Force mobile mode */
  forceMobile?: boolean;
  /** Show edit icon on hover (desktop) */
  showEditIcon?: boolean;
  /** Minimum height for textarea */
  minRows?: number;
  /** Maximum height for textarea */
  maxRows?: number;
}

/**
 * InlineEdit - Responsive inline editing component
 *
 * Mobile: Tap to open modal editor
 * Desktop: Double-click to edit in-place
 *
 * @example
 * ```tsx
 * <InlineEdit
 *   value={player.name}
 *   label="Player Name"
 *   onSave={(name) => updatePlayer({ name })}
 * />
 * ```
 */
export function InlineEdit({
  value,
  onSave,
  onCancel,
  disabled = false,
  placeholder = "Enter value...",
  label,
  type = "text",
  allowEmpty = false,
  validate,
  children,
  className,
  inputClassName,
  saveText = "Save",
  cancelText = "Cancel",
  editLabel = "Edit",
  forceDesktop = false,
  forceMobile = false,
  showEditIcon = true,
  minRows = 2,
  maxRows = 6,
}: InlineEditProps) {
  const isMobileDevice = useIsMobile();
  const isMobile = forceMobile || (!forceDesktop && isMobileDevice);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync editValue when value prop changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const startEditing = React.useCallback(() => {
    if (disabled) return;
    setEditValue(value);
    setError(null);
    setIsEditing(true);
  }, [disabled, value]);

  const cancelEditing = React.useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    onCancel?.();
  }, [value, onCancel]);

  const handleSave = React.useCallback(async () => {
    const trimmedValue = editValue.trim();

    // Validate empty
    if (!(allowEmpty || trimmedValue)) {
      setError("This field cannot be empty");
      return;
    }

    // Custom validation
    if (validate) {
      const validationError = validate(trimmedValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // No changes
    if (trimmedValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, allowEmpty, validate, onSave]);

  // Handle keyboard shortcuts
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelEditing();
      } else if (e.key === "Enter" && !e.shiftKey && type !== "textarea") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [cancelEditing, handleSave, type]
  );

  // Focus input when opening
  React.useEffect(() => {
    if (isEditing && inputRef.current && !isMobile) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, isMobile]);

  // Display content
  const displayContent = children || (
    <span className={cn(!value && "text-muted-foreground")}>
      {value || placeholder}
    </span>
  );

  // Mobile: Modal/Drawer editor
  if (isMobile) {
    return (
      <>
        <button
          className={cn(
            "-mx-2 -my-1.5 w-full rounded-md px-2 py-1.5 text-left",
            "transition-colors active:bg-accent",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          disabled={disabled}
          onClick={startEditing}
          type="button"
        >
          {displayContent}
        </button>
        <Drawer
          onOpenChange={(open) => !open && cancelEditing()}
          open={isEditing}
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{label || "Edit"}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              {type === "textarea" ? (
                <Textarea
                  className={cn(
                    "resize-none",
                    error && "border-destructive",
                    inputClassName
                  )}
                  disabled={isSaving}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  rows={minRows}
                  value={editValue}
                />
              ) : (
                <Input
                  className={cn(
                    "h-12",
                    error && "border-destructive",
                    inputClassName
                  )}
                  disabled={isSaving}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type={type}
                  value={editValue}
                />
              )}
              {error && (
                <p className="mt-2 text-destructive text-sm">{error}</p>
              )}
            </div>
            <DrawerFooter className="flex-row gap-3">
              <Button
                className="h-12 flex-1"
                disabled={isSaving}
                onClick={cancelEditing}
                variant="outline"
              >
                {cancelText}
              </Button>
              <Button
                className="h-12 flex-1"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? "Saving..." : saveText}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Inline editing
  if (isEditing) {
    return (
      <div className={cn("group relative", className)}>
        {type === "textarea" ? (
          <Textarea
            className={cn(
              "resize-none pr-20",
              error && "border-destructive",
              inputClassName
            )}
            disabled={isSaving}
            onBlur={() => {
              // Delay to allow button clicks
              setTimeout(() => {
                if (document.activeElement?.closest(".inline-edit-actions")) {
                  return;
                }
                cancelEditing();
              }, 150);
            }}
            onChange={(e) => {
              setEditValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={minRows}
            value={editValue}
          />
        ) : (
          <Input
            className={cn(
              "pr-20",
              error && "border-destructive",
              inputClassName
            )}
            disabled={isSaving}
            onBlur={() => {
              setTimeout(() => {
                if (document.activeElement?.closest(".inline-edit-actions")) {
                  return;
                }
                cancelEditing();
              }, 150);
            }}
            onChange={(e) => {
              setEditValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={editValue}
          />
        )}
        <div className="inline-edit-actions -translate-y-1/2 absolute top-1/2 right-1 flex gap-1">
          <Button
            className="h-7 w-7"
            disabled={isSaving}
            onClick={cancelEditing}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">{cancelText}</span>
          </Button>
          <Button
            className="h-7 w-7"
            disabled={isSaving}
            onClick={handleSave}
            size="icon"
            type="button"
            variant="ghost"
          >
            <CheckIcon className="h-4 w-4" />
            <span className="sr-only">{saveText}</span>
          </Button>
        </div>
        {error && (
          <p className="absolute top-full left-0 mt-1 text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Desktop: Display mode
  return (
    <div
      className={cn(
        "group -mx-2 -my-1 relative cursor-pointer rounded-md px-2 py-1",
        "transition-colors hover:bg-accent/50",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
        className
      )}
      onDoubleClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEditing();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {displayContent}
      {showEditIcon && !disabled && (
        <button
          aria-label={editLabel}
          className={cn(
            "-translate-y-1/2 absolute top-1/2 right-1",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "rounded p-1 hover:bg-accent"
          )}
          onClick={startEditing}
          type="button"
        >
          <PencilIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

/**
 * Controlled InlineEdit - for use with forms
 */
export interface ControlledInlineEditProps
  extends Omit<InlineEditProps, "value" | "onSave"> {
  /** Field name */
  name: string;
  /** Form value */
  value: string;
  /** onChange handler */
  onChange: (value: string) => void;
  /** onBlur handler */
  onBlur?: () => void;
}

export function ControlledInlineEdit({
  name,
  value,
  onChange,
  onBlur,
  ...props
}: ControlledInlineEditProps) {
  return (
    <InlineEdit
      {...props}
      onCancel={onBlur}
      onSave={(newValue) => {
        onChange(newValue);
        onBlur?.();
      }}
      value={value}
    />
  );
}

/**
 * Hook for managing inline edit state externally
 */
export function useInlineEdit(initialValue: string) {
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const startEditing = React.useCallback(() => setIsEditing(true), []);
  const cancelEditing = React.useCallback(() => setIsEditing(false), []);

  const save = React.useCallback(
    async (newValue: string, saveFn: (value: string) => Promise<void>) => {
      setIsSaving(true);
      try {
        await saveFn(newValue);
        setValue(newValue);
        setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return {
    value,
    setValue,
    isEditing,
    isSaving,
    startEditing,
    cancelEditing,
    save,
  };
}
