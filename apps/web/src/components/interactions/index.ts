/**
 * Interaction Components
 *
 * Phase 4-10 UX improvements: Platform-specific interactions
 *
 * Phase 4:
 * - Command menu (Cmd+K) for global search and navigation
 * - Responsive dialog (sheet on mobile, modal on desktop)
 * - Confirmation dialogs with appropriate sizing
 *
 * Phase 10:
 * - Responsive context menu (long-press on mobile, right-click on desktop)
 * - Action sheet (bottom sheet on mobile, dropdown on desktop)
 * - Inline edit (modal on mobile, in-place on desktop)
 */

// Phase 4 Components
export {
  CommandMenu,
  useGlobalShortcuts,
  type CommandMenuProps,
  type CommandItemDef,
} from "./command-menu";

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ConfirmationDialog,
  type ResponsiveDialogProps,
  type ConfirmationDialogProps,
} from "./responsive-dialog";

// Phase 10 Components
export {
  ResponsiveContextMenu,
  ContextMenuRoot,
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
  type ResponsiveContextMenuProps,
  type ContextMenuItemDef,
  type ContextMenuGroupDef,
} from "./context-menu";

export {
  ActionSheet,
  useActionSheet,
  type ActionSheetProps,
  type ActionItem,
  type ActionGroup,
} from "./action-sheet";

export {
  InlineEdit,
  ControlledInlineEdit,
  useInlineEdit,
  type InlineEditProps,
  type ControlledInlineEditProps,
} from "./inline-edit";