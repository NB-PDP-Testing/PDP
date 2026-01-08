"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLongPress } from "@/hooks/use-long-press";
import {
  ContextMenu as ContextMenuPrimitive,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Context menu action item definition
 */
export interface ContextMenuItemDef {
  /** Unique key for the item */
  key: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: React.ReactNode;
  /** Keyboard shortcut (desktop only) */
  shortcut?: string;
  /** Handler when clicked */
  onSelect?: () => void;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Destructive styling (red) */
  destructive?: boolean;
  /** Submenu items */
  subItems?: ContextMenuItemDef[];
}

/**
 * Context menu group definition
 */
export interface ContextMenuGroupDef {
  /** Group label (optional) */
  label?: string;
  /** Items in this group */
  items: ContextMenuItemDef[];
}

/**
 * Props for ResponsiveContextMenu
 */
export interface ResponsiveContextMenuProps {
  /** Trigger element - must be a single element */
  children: React.ReactElement;
  /** Menu title (shown in mobile sheet header) */
  title?: string;
  /** Menu items - either flat array or grouped */
  items?: ContextMenuItemDef[];
  /** Grouped menu items */
  groups?: ContextMenuGroupDef[];
  /** Custom menu content (overrides items/groups) */
  menuContent?: React.ReactNode;
  /** Whether context menu is disabled */
  disabled?: boolean;
  /** Force desktop mode */
  forceDesktop?: boolean;
  /** Force mobile mode */
  forceMobile?: boolean;
  /** Callback when menu opens */
  onOpenChange?: (open: boolean) => void;
  /** Additional class for the content container */
  contentClassName?: string;
}

/**
 * ResponsiveContextMenu - Adaptive context menu
 *
 * Mobile: Long-press triggers a bottom sheet with actions
 * Desktop: Right-click triggers a dropdown menu
 *
 * @example
 * ```tsx
 * <ResponsiveContextMenu
 *   title="Player Options"
 *   items={[
 *     { key: 'view', label: 'View Profile', icon: <Eye />, onSelect: () => {} },
 *     { key: 'edit', label: 'Edit', icon: <Pencil />, onSelect: () => {} },
 *     { key: 'delete', label: 'Delete', icon: <Trash />, destructive: true, onSelect: () => {} },
 *   ]}
 * >
 *   <PlayerCard player={player} />
 * </ResponsiveContextMenu>
 * ```
 */
export function ResponsiveContextMenu({
  children,
  title,
  items,
  groups,
  menuContent,
  disabled = false,
  forceDesktop = false,
  forceMobile = false,
  onOpenChange,
  contentClassName,
}: ResponsiveContextMenuProps) {
  const isMobileDevice = useIsMobile();
  const isMobile = forceMobile || (!forceDesktop && isMobileDevice);
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange]
  );

  // Long press handler for mobile
  const longPressHandlers = useLongPress(
    () => {
      if (!disabled) {
        handleOpenChange(true);
      }
    },
    {
      threshold: 500,
      disabled: disabled || !isMobile,
    }
  );

  // Mobile: Bottom sheet with long-press trigger
  if (isMobile) {
    const childProps = children.props as Record<string, unknown>;
    const childStyle = childProps.style as React.CSSProperties | undefined;
    
    return (
      <>
        {React.cloneElement(children, {
          ...longPressHandlers,
          style: {
            ...childStyle,
            WebkitUserSelect: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          } as React.CSSProperties,
        } as React.HTMLAttributes<HTMLElement>)}
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className={cn("pb-8", contentClassName)}>
            {title && (
              <SheetHeader className="mb-4">
                <SheetTitle>{title}</SheetTitle>
              </SheetHeader>
            )}
            <div className="space-y-1">
              {menuContent ||
                (groups
                  ? groups.map((group, groupIndex) => (
                      <MobileMenuGroup
                        key={group.label || groupIndex}
                        group={group}
                        onClose={() => handleOpenChange(false)}
                        isLast={groupIndex === groups.length - 1}
                      />
                    ))
                  : items?.map((item) => (
                      <MobileMenuItem
                        key={item.key}
                        item={item}
                        onClose={() => handleOpenChange(false)}
                      />
                    )))}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Native context menu with right-click trigger
  return (
    <ContextMenuPrimitive onOpenChange={handleOpenChange}>
      <ContextMenuTrigger disabled={disabled} asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className={cn("w-56", contentClassName)}>
        {menuContent ||
          (groups
            ? groups.map((group, groupIndex) => (
                <DesktopMenuGroup
                  key={group.label || groupIndex}
                  group={group}
                  isLast={groupIndex === groups.length - 1}
                />
              ))
            : items?.map((item) => <DesktopMenuItem key={item.key} item={item} />))}
      </ContextMenuContent>
    </ContextMenuPrimitive>
  );
}

/**
 * Mobile menu item component
 */
function MobileMenuItem({
  item,
  onClose,
  inSubmenu = false,
}: {
  item: ContextMenuItemDef;
  onClose: () => void;
  inSubmenu?: boolean;
}) {
  const [showSubmenu, setShowSubmenu] = React.useState(false);

  if (item.subItems && item.subItems.length > 0) {
    return (
      <div>
        <button
          type="button"
          disabled={item.disabled}
          onClick={() => setShowSubmenu(!showSubmenu)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left",
            "transition-colors active:bg-accent",
            item.disabled && "opacity-50 pointer-events-none",
            inSubmenu && "pl-8"
          )}
        >
          {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
          <span className="flex-1 font-medium">{item.label}</span>
          <svg
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showSubmenu && "rotate-90"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
        {showSubmenu && (
          <div className="ml-4 border-l-2 border-border">
            {item.subItems.map((subItem) => (
              <MobileMenuItem
                key={subItem.key}
                item={subItem}
                onClose={onClose}
                inSubmenu
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={() => {
        item.onSelect?.();
        onClose();
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left",
        "transition-colors active:bg-accent",
        item.disabled && "opacity-50 pointer-events-none",
        item.destructive && "text-destructive",
        inSubmenu && "pl-8"
      )}
    >
      {item.icon && (
        <span className={cn("text-muted-foreground", item.destructive && "text-destructive")}>
          {item.icon}
        </span>
      )}
      <span className="flex-1 font-medium">{item.label}</span>
    </button>
  );
}

/**
 * Mobile menu group component
 */
function MobileMenuGroup({
  group,
  onClose,
  isLast,
}: {
  group: ContextMenuGroupDef;
  onClose: () => void;
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
        <MobileMenuItem key={item.key} item={item} onClose={onClose} />
      ))}
    </div>
  );
}

/**
 * Desktop menu item component
 */
function DesktopMenuItem({ item }: { item: ContextMenuItemDef }) {
  if (item.subItems && item.subItems.length > 0) {
    return (
      <ContextMenuSub>
        <ContextMenuSubTrigger disabled={item.disabled}>
          {item.icon && <span className="mr-2">{item.icon}</span>}
          {item.label}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-48">
          {item.subItems.map((subItem) => (
            <DesktopMenuItem key={subItem.key} item={subItem} />
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
    );
  }

  return (
    <ContextMenuItem
      disabled={item.disabled}
      variant={item.destructive ? "destructive" : "default"}
      onSelect={item.onSelect}
    >
      {item.icon && <span className="mr-2">{item.icon}</span>}
      {item.label}
      {item.shortcut && <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>}
    </ContextMenuItem>
  );
}

/**
 * Desktop menu group component
 */
function DesktopMenuGroup({
  group,
  isLast,
}: {
  group: ContextMenuGroupDef;
  isLast: boolean;
}) {
  return (
    <>
      {group.label && <ContextMenuLabel>{group.label}</ContextMenuLabel>}
      {group.items.map((item) => (
        <DesktopMenuItem key={item.key} item={item} />
      ))}
      {!isLast && <ContextMenuSeparator />}
    </>
  );
}

// Re-export primitives for custom implementations
export {
  ContextMenuPrimitive as ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
};