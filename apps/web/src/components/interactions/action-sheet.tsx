"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
        <SheetContent
          side="bottom"
          className={cn(
            "pb-safe max-h-[85vh] overflow-y-auto",
            contentClassName
          )}
        >
          {(title || description) && (
            <SheetHeader className="mb-4 text-left">
              {title && <SheetTitle>{title}</SheetTitle>}
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
          )}
          <div className="space-y-1">
            {groups
              ? groups.map((group, groupIndex) => (
                  <MobileActionGroup
                    key={group.label || groupIndex}
                    group={group}
                    onSelect={handleSelect}
                    isLast={groupIndex === groups.length - 1}
                  />
                ))
              : items?.map((item) => (
                  <MobileActionItem
                    key={item.key}
                    item={item}
                    onSelect={handleSelect}
                  />
                ))}
          </div>
          {showCancel && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => handleOpenChange(false)}
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
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        className={cn("w-56", contentClassName)}
      >
        {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}
        {title && <DropdownMenuSeparator />}
        {groups
          ? groups.map((group, groupIndex) => (
              <DesktopActionGroup
                key={group.label || groupIndex}
                group={group}
                onSelect={handleSelect}
                isLast={groupIndex === groups.length - 1}
              />
            ))
          : items?.map((item) => (
              <DesktopActionItem
                key={item.key}
                item={item}
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
      type="button"
      disabled={item.disabled}
      onClick={() => onSelect(item)}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-left",
        "transition-colors active:bg-accent",
        item.disabled && "opacity-50 pointer-events-none",
        item.destructive && "text-destructive"
      )}
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
      <div className="flex-1 min-w-0">
        <div className="font-medium">{item.label}</div>
        {item.description && (
          <div className="text-sm text-muted-foreground truncate">
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
    <div className={cn(!isLast && "border-b border-border pb-2 mb-2")}>
      {group.label && (
        <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {group.label}
        </div>
      )}
      {group.items.map((item) => (
        <MobileActionItem key={item.key} item={item} onSelect={onSelect} />
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
      disabled={item.disabled}
      onSelect={() => onSelect(item)}
      className={cn(item.destructive && "text-destructive focus:text-destructive")}
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
        <DesktopActionItem key={item.key} item={item} onSelect={onSelect} />
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