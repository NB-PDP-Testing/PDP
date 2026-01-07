/**
 * Interaction Components
 * 
 * Phase 4 UX improvements: Platform-specific interactions
 * - Command menu (Cmd+K) for global search and navigation
 * - Responsive dialog (sheet on mobile, modal on desktop)
 * - Confirmation dialogs with appropriate sizing
 */

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