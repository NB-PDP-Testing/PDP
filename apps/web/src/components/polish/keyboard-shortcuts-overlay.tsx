"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Keyboard shortcut category
 */
export type ShortcutCategory = {
  name: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
};

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: ShortcutCategory[] = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "H"], description: "Go to Home" },
      { keys: ["⌘", "Shift", "O"], description: "Switch organization/role" },
      { keys: ["G", "P"], description: "Go to Players" },
      { keys: ["G", "T"], description: "Go to Teams" },
      { keys: ["G", "S"], description: "Go to Settings" },
    ],
  },
  {
    name: "Actions",
    shortcuts: [
      { keys: ["⌘", "N"], description: "New item (context-aware)" },
      { keys: ["⌘", "S"], description: "Save changes" },
      { keys: ["Esc"], description: "Cancel / Close" },
      { keys: ["⌘", "Z"], description: "Undo" },
      { keys: ["⌘", "Shift", "Z"], description: "Redo" },
    ],
  },
  {
    name: "Data & Selection",
    shortcuts: [
      { keys: ["↑", "↓"], description: "Navigate rows" },
      { keys: ["Enter"], description: "Select / Open" },
      { keys: ["Space"], description: "Toggle checkbox" },
      { keys: ["⌘", "A"], description: "Select all" },
      { keys: ["Shift", "Click"], description: "Select range" },
      { keys: ["⌘", "Click"], description: "Multi-select" },
    ],
  },
  {
    name: "View",
    shortcuts: [
      { keys: ["?"], description: "Show this help" },
      { keys: ["⌘", ","], description: "Open settings" },
      { keys: ["⌘", "\\"], description: "Toggle sidebar" },
      { keys: ["⌘", "D"], description: "Toggle density" },
    ],
  },
];

/**
 * Props for KeyboardShortcutsOverlay
 */
export type KeyboardShortcutsOverlayProps = {
  /** Custom shortcuts to display */
  shortcuts?: ShortcutCategory[];
  /** Whether to show by default */
  defaultOpen?: boolean;
  /** Callback when overlay opens */
  onOpen?: () => void;
  /** Callback when overlay closes */
  onClose?: () => void;
};

/**
 * KeyboardShortcutsOverlay - Shows all keyboard shortcuts
 *
 * Opens with `?` key press
 * Desktop only (hidden on mobile)
 */
export function KeyboardShortcutsOverlay({
  shortcuts = DEFAULT_SHORTCUTS,
  defaultOpen = false,
  onOpen,
  onClose,
}: KeyboardShortcutsOverlayProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  // Listen for ? key to open
  useEffect(() => {
    if (isMobile) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on ? key when not in input
      if (
        e.key === "?" &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile]);

  // Callbacks
  useEffect(() => {
    if (open) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [open, onOpen, onClose]);

  // Don't render on mobile
  if (isMobile) {
    return null;
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Keyboard Shortcuts
            <kbd className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">?</kbd>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          {shortcuts.map((category) => (
            <div key={category.name}>
              <h3 className="mb-3 font-semibold text-muted-foreground text-sm">
                {category.name}
              </h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    className="flex items-center justify-between py-1.5"
                    key={index}
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd
                            className={cn(
                              "rounded bg-muted px-2 py-0.5 font-mono text-xs",
                              key.length === 1 && "min-w-[24px] text-center"
                            )}
                          >
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">
                              +
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t pt-4 text-center text-muted-foreground text-xs">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5">Esc</kbd> to
          close
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manually control keyboard shortcuts overlay
 */
export function useKeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return { open, setOpen, show, hide, toggle };
}
