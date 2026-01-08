"use client";

import {
  BarChart3,
  ClipboardList,
  Home,
  Keyboard,
  Moon,
  Search,
  Settings,
  Sun,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Command item definition
 */
export interface CommandItemDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  group?: string;
  keywords?: string[];
}

/**
 * Props for CommandMenu
 */
export interface CommandMenuProps {
  /** Additional command items */
  items?: CommandItemDef[];
  /** Callback when menu opens */
  onOpen?: () => void;
  /** Callback when menu closes */
  onClose?: () => void;
  /** Organization ID for navigation */
  orgId?: string;
  /** Whether to show default navigation items */
  showDefaultItems?: boolean;
}

/**
 * CommandMenu - Global search and command palette (Cmd+K)
 *
 * Mobile: Full-screen search experience
 * Desktop: Floating command palette with keyboard shortcuts
 */
export function CommandMenu({
  items = [],
  onOpen,
  onClose,
  orgId,
  showDefaultItems = true,
}: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Callbacks for open/close
  useEffect(() => {
    if (open) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [open, onOpen, onClose]);

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false);
    callback();
  }, []);

  // Default navigation items
  const defaultItems: CommandItemDef[] = showDefaultItems
    ? [
        {
          id: "home",
          label: "Go to Home",
          icon: <Home className="mr-2 h-4 w-4" />,
          shortcut: "⌘H",
          onSelect: () => router.push("/"),
          group: "Navigation",
          keywords: ["home", "dashboard", "main"],
        },
        ...(orgId
          ? [
              {
                id: "players",
                label: "View Players",
                icon: <Users className="mr-2 h-4 w-4" />,
                shortcut: "⌘P",
                onSelect: () => router.push(`/orgs/${orgId}/admin/players`),
                group: "Navigation",
                keywords: ["players", "roster", "team"],
              },
              {
                id: "add-player",
                label: "Add New Player",
                icon: <UserPlus className="mr-2 h-4 w-4" />,
                shortcut: "⌘N",
                onSelect: () =>
                  router.push(`/orgs/${orgId}/admin/player-import`),
                group: "Actions",
                keywords: ["add", "new", "player", "import"],
              },
              {
                id: "assessments",
                label: "View Assessments",
                icon: <ClipboardList className="mr-2 h-4 w-4" />,
                onSelect: () => router.push(`/orgs/${orgId}/coach`),
                group: "Navigation",
                keywords: ["assessments", "reviews", "evaluations"],
              },
              {
                id: "analytics",
                label: "View Analytics",
                icon: <BarChart3 className="mr-2 h-4 w-4" />,
                onSelect: () =>
                  router.push(
                    `/orgs/${orgId}/admin/dashboard-analytics` as any
                  ),
                group: "Navigation",
                keywords: ["analytics", "stats", "dashboard", "reports"],
              },
              {
                id: "settings",
                label: "Organization Settings",
                icon: <Settings className="mr-2 h-4 w-4" />,
                shortcut: "⌘,",
                onSelect: () => router.push(`/orgs/${orgId}/admin/settings`),
                group: "Settings",
                keywords: ["settings", "preferences", "config"],
              },
            ]
          : []),
        {
          id: "toggle-theme",
          label:
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
          icon:
            theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            ),
          onSelect: () => setTheme(theme === "dark" ? "light" : "dark"),
          group: "Settings",
          keywords: ["theme", "dark", "light", "mode"],
        },
        {
          id: "shortcuts",
          label: "Keyboard Shortcuts",
          icon: <Keyboard className="mr-2 h-4 w-4" />,
          shortcut: "?",
          onSelect: () => {
            // Could open a shortcuts modal
            console.log("Show keyboard shortcuts");
          },
          group: "Help",
          keywords: ["keyboard", "shortcuts", "help", "keys"],
        },
      ]
    : [];

  // Combine default and custom items
  const allItems = [...defaultItems, ...items];

  // Group items
  const groupedItems = allItems.reduce<Record<string, CommandItemDef[]>>(
    (acc, item) => {
      const group = item.group || "Other";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    },
    {}
  );

  return (
    <>
      {/* Search trigger button - shown in header */}
      <button
        className={cn(
          "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          isMobile ? "h-10" : "h-9"
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        {!isMobile && (
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </button>

      {/* Command dialog */}
      <CommandDialog onOpenChange={setOpen} open={open}>
        <CommandInput
          className={cn(isMobile && "h-12 text-base")}
          placeholder="Type a command or search..."
        />
        <CommandList className={cn(isMobile && "max-h-[60vh]")}>
          <CommandEmpty>No results found.</CommandEmpty>

          {Object.entries(groupedItems).map(([group, groupItems], index) => (
            <React.Fragment key={group}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {groupItems.map((item) => (
                  <CommandItem
                    className={cn(isMobile && "py-3")}
                    key={item.id}
                    onSelect={() => handleSelect(item.onSelect)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {!isMobile && item.shortcut && (
                      <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] opacity-100 sm:flex">
                        {item.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

/**
 * Hook to register global keyboard shortcuts
 */
export function useGlobalShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for meta/ctrl key combinations
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        const combo = `cmd+${key}`;

        if (shortcuts[combo]) {
          e.preventDefault();
          shortcuts[combo]();
        }
      }

      // Check for simple key shortcuts (like "?")
      if (!(e.metaKey || e.ctrlKey || e.altKey) && shortcuts[e.key]) {
        // Don't trigger if user is typing in an input
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          shortcuts[e.key]();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
