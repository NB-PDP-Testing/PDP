"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FormFieldSkeletonProps {
  /** Show label */
  showLabel?: boolean;
  /** Field type affects height */
  type?: "input" | "textarea" | "select" | "checkbox" | "radio" | "switch";
  /** Container class name */
  className?: string;
}

/**
 * Single form field skeleton
 */
export function FormFieldSkeleton({
  showLabel = true,
  type = "input",
  className,
}: FormFieldSkeletonProps) {
  const fieldHeights = {
    input: "h-10",
    textarea: "h-24",
    select: "h-10",
    checkbox: "h-5 w-5",
    radio: "h-5 w-5",
    switch: "h-6 w-11",
  };

  if (type === "checkbox" || type === "radio" || type === "switch") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Skeleton className={cn("rounded", fieldHeights[type])} />
        {showLabel && <Skeleton className="h-4 w-24 rounded" />}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && <Skeleton className="h-4 w-24 rounded" />}
      <Skeleton className={cn("w-full rounded", fieldHeights[type])} />
    </div>
  );
}

interface FormSkeletonProps {
  /** Number of fields */
  fields?: number;
  /** Field configuration */
  fieldTypes?: ("input" | "textarea" | "select")[];
  /** Show section title */
  showTitle?: boolean;
  /** Show submit button */
  showSubmit?: boolean;
  /** Layout variant */
  layout?: "stacked" | "two-column" | "inline";
  /** Container class name */
  className?: string;
}

/**
 * FormSkeleton - Loading placeholder for forms
 *
 * Features:
 * - Configurable field count and types
 * - Multiple layouts (stacked, two-column, inline)
 * - Optional title and submit button
 */
export function FormSkeleton({
  fields = 4,
  fieldTypes,
  showTitle = true,
  showSubmit = true,
  layout = "stacked",
  className,
}: FormSkeletonProps) {
  // Generate field types if not provided
  const types =
    fieldTypes ||
    Array(fields)
      .fill("input")
      .map((_, i) => (i === fields - 1 ? "textarea" : "input"));

  const containerClass = {
    stacked: "space-y-4",
    "two-column": "grid grid-cols-1 md:grid-cols-2 gap-4",
    inline: "flex flex-wrap gap-4",
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Title */}
      {showTitle && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
      )}

      {/* Fields */}
      <div className={containerClass[layout]}>
        {types.slice(0, fields).map((type, i) => (
          <FormFieldSkeleton
            className={layout === "inline" ? "min-w-[200px] flex-1" : undefined}
            key={i}
            type={type as "input" | "textarea" | "select"}
          />
        ))}
      </div>

      {/* Submit button */}
      {showSubmit && (
        <div className="flex justify-end gap-3 pt-4">
          <Skeleton className="h-10 w-20 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      )}
    </div>
  );
}

/**
 * Form section with title and fields
 */
export function FormSectionSkeleton({
  title = true,
  fields = 3,
  className,
}: {
  title?: boolean;
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && <Skeleton className="h-5 w-32 rounded" />}
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <FormFieldSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Multi-section form skeleton
 */
export function MultiSectionFormSkeleton({
  sections = 2,
  fieldsPerSection = 3,
  showSubmit = true,
  className,
}: {
  sections?: number;
  fieldsPerSection?: number;
  showSubmit?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-8", className)}>
      {Array.from({ length: sections }).map((_, i) => (
        <FormSectionSkeleton fields={fieldsPerSection} key={i} />
      ))}
      {showSubmit && (
        <div className="flex justify-end gap-3 border-t pt-4">
          <Skeleton className="h-10 w-20 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      )}
    </div>
  );
}
