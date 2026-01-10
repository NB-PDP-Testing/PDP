"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Action item definition
 */
export interface ActionItem {
  /** Unique key for the action */
  key: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: React.ReactNode;
  /** Handler when clicked */
  onSelect?: () => void;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Destructive styling (red) */
  destructive?: boolean;
  /** Description text (mobile only) */
  description?: string;
}

/**
 * Action group definition
 */
export interface ActionGroup {
  /** Group label (optional) */
  label?: string;
  /** Actions in this group */
  items: ActionItem[];
}

/**
 * Props for ActionSheet
 */
export interface ActionSheetProps {
  /** Trigger element */
  trigger: React.ReactNode;
  /** Sheet title */
  title?: string;
  /** Sheet description (mobile only) */
  description?: string;
  /** Action items - flat list */
  items?: ActionItem[];
  /** Grouped action items */
  groups?: ActionGroup[];
  /** Cancel button text (mobile only) */
  cancelText?: string;
  /** Whether to show cancel button on mobile */
  showCancel?: boolean;
  /** Callback when sheet opens/closes */
  onOpenChange?: (open: boolean) => void;
  /** Force desktop mode */
  forceDesktop?: boolean;
  /** Force mobile mode */
  forceMobile?: boolean;
  /** Dropdown menu side (desktop) */
  side?: "top" | "right" | "bottom" | "left";
  /** Dropdown menu alignment (desktop) */
  align?: "start" | "center" | "end";
  /** Additional class for the content */
  contentClassName?: string;
  /** Controlled open state */
  open?: boolean;
}

/**
 * ActionSheet - Responsive action menu
 *
 * Mobile: Full-screen bottom sheet with large touch targets
 * Desktop: Dropdown menu
 *
 * @example
 * ```tsx
 * <ActionSheet
 *   trigger={<Button variant="ghost" size="icon"><MoreVertical /></Button>}
 *   title="Actions"
 *   items={[
 *     { key: 'edit', label: 'Edit', icon: <Pencil /> },
 *     { key: 'delete', label: 'Delete', icon: <Trash />, destructive: true },
 *   ]}
 * />
 * ```
 */
export function ActionSheet({
  trigger,
  title,
  description,
  items,
  groups,
  cancelText = "Cancel",
  showCancel = true,
  onOpenChange,
  forceDesktop = false,
  forceMobile = false,
  side = "bottom",
  align = "end",
  contentClassName,
  open: controlledOpen,
}: ActionSheetProps) {
  const isMobileDevice = useIsMobile();
  const isMobile = forceMobile || (!forceDesktop && isMobileDevice);
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = controlledOpen ?? internalOpen;

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setInternalOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );

  const handleSelect = React.useCallback(
    (item: ActionItem) => {
      if (item.disabled) return;
      item.onSelect?.();
      handleOpenChange(false);
    },
    [handleOpenChange]
  );

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <Sheet onOpenChange={handleOpenChange} open={open}>
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
        <SheetContent
          className={cn(
            "max-h-[85vh] overflow-y-auto pb-safe",
            contentClassName
          )}
          side="bottom"
        >
          {title || description ? (
            <SheetHeader className="mb-4 text-left">
              {title && <SheetTitle>{title}</SheetTitle>}
              <SheetDescription className={description ? undefined : "sr-only"}>
                {description || "Action sheet options"}
              </SheetDescription>
            </SheetHeader>
          ) : (
            <SheetDescription className="sr-only">
              Action sheet options
            </SheetDescription>
          )}
          <div className="space-y-1">
            {groups
              ? groups.map((group, groupIndex) => (
                  <MobileActionGroup
                    group={group}
                    isLast={groupIndex === groups.length - 1}
                    key={group.label || groupIndex}
                    onSelect={handleSelect}
                  />
                ))
              : items?.map((item) => (
                  <MobileActionItem
                    item={item}
                    key={item.key}
                    onSelect={handleSelect}
                  />
                ))}
          </div>
          {showCancel && (
            <div className="mt-4 border-border border-t pt-4">
              <Button
                className="h-12 w-full"
                onClick={() => handleOpenChange(false)}
                variant="outline"
              >
                {cancelText}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Dropdown menu
  return (
    <DropdownMenu onOpenChange={handleOpenChange} open={open}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("w-56", contentClassName)}
        side={side}
      >
        {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
        {title && <DropdownMenuSeparator />}
        {groups
          ? groups.map((group, groupIndex) => (
              <DesktopActionGroup
                group={group}
                isLast={groupIndex === groups.length - 1}
                key={group.label || groupIndex}
                onSelect={handleSelect}
              />
            ))
          : items?.map((item) => (
              <DesktopActionItem
                item={item}
                key={item.key}
                onSelect={handleSelect}
              />
            ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Mobile action item
 */
function MobileActionItem({
  item,
  onSelect,
}: {
  item: ActionItem;
  onSelect: (item: ActionItem) => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-left",
        "transition-colors active:bg-accent",
        item.disabled && "pointer-events-none opacity-50",
        item.destructive && "text-destructive"
      )}
      disabled={item.disabled}
      onClick={() => onSelect(item)}
      type="button"
    >
      {item.icon && (
        <span
          className={cn(
            "flex-shrink-0 text-muted-foreground",
            item.destructive && "text-destructive"
          )}
        >
          {item.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium">{item.label}</div>
        {item.description && (
          <div className="truncate text-muted-foreground text-sm">
            {item.description}
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Mobile action group
 */
function MobileActionGroup({
  group,
  onSelect,
  isLast,
}: {
  group: ActionGroup;
  onSelect: (item: ActionItem) => void;
  isLast: boolean;
}) {
  return (
    <div className={cn(!isLast && "mb-2 border-border border-b pb-2")}>
      {group.label && (
        <div className="px-4 py-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          {group.label}
        </div>
      )}
      {group.items.map((item) => (
        <MobileActionItem item={item} key={item.key} onSelect={onSelect} />
      ))}
    </div>
  );
}

/**
 * Desktop action item
 */
function DesktopActionItem({
  item,
  onSelect,
}: {
  item: ActionItem;
  onSelect: (item: ActionItem) => void;
}) {
  return (
    <DropdownMenuItem
      className={cn(
        item.destructive && "text-destructive focus:text-destructive"
      )}
      disabled={item.disabled}
      onSelect={() => onSelect(item)}
    >
      {item.icon && <span className="mr-2">{item.icon}</span>}
      {item.label}
    </DropdownMenuItem>
  );
}

/**
 * Desktop action group
 */
function DesktopActionGroup({
  group,
  onSelect,
  isLast,
}: {
  group: ActionGroup;
  onSelect: (item: ActionItem) => void;
  isLast: boolean;
}) {
  return (
    <>
      {group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
      {group.items.map((item) => (
        <DesktopActionItem item={item} key={item.key} onSelect={onSelect} />
      ))}
      {!isLast && <DropdownMenuSeparator />}
    </>
  );
}

/**
 * Standalone hook to manage action sheet state
 */
export function useActionSheet() {
  const [open, setOpen] = React.useState(false);

  const show = React.useCallback(() => setOpen(true), []);
  const hide = React.useCallback(() => setOpen(false), []);
  const toggle = React.useCallback(() => setOpen((prev) => !prev), []);

  return {
    open,
    show,
    hide,
    toggle,
    setOpen,
  };
}
