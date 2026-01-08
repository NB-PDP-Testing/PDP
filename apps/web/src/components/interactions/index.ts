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

export {
  type ActionGroup,
  type ActionItem,
  ActionSheet,
  type ActionSheetProps,
  useActionSheet,
} from "./action-sheet";
// Phase 4 Components
export {
  type CommandItemDef,
  CommandMenu,
  type CommandMenuProps,
  useGlobalShortcuts,
} from "./command-menu";

// Phase 10 Components
export {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  type ContextMenuGroupDef,
  ContextMenuItem,
  type ContextMenuItemDef,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ResponsiveContextMenu,
  type ResponsiveContextMenuProps,
} from "./context-menu";
export {
  ControlledInlineEdit,
  type ControlledInlineEditProps,
  InlineEdit,
  type InlineEditProps,
  useInlineEdit,
} from "./inline-edit";
export {
  ConfirmationDialog,
  type ConfirmationDialogProps,
  ResponsiveDialog,
  ResponsiveDialogClose,
  type ResponsiveDialogProps,
} from "./responsive-dialog";
