"use client";

import {
  Calendar,
  CheckSquare,
  HelpCircle,
  Home,
  MessageSquare,
  Mic,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

type KeyboardShortcutsHelpProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ShortcutSection = {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
};

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  const [isMac, setIsMac] = useState(false);

  // Detect platform on mount
  useEffect(() => {
    const platform = navigator.platform.toLowerCase();
    setIsMac(platform.includes("mac"));
  }, []);

  const modKey = isMac ? "⌘" : "Ctrl";

  const sections: ShortcutSection[] = [
    {
      title: "Navigation",
      shortcuts: [
        {
          keys: [modKey, "K"],
          description: "Open command palette",
          icon: Search,
        },
        {
          keys: ["?"],
          description: "Show this help dialog",
          icon: HelpCircle,
        },
        {
          keys: ["Esc"],
          description: "Close modals and dialogs",
          icon: X,
        },
      ],
    },
    {
      title: "Actions",
      shortcuts: [
        {
          keys: ["K"],
          description: "Create new voice note",
          icon: Mic,
        },
        {
          keys: ["C"],
          description: "Focus comment input",
          icon: MessageSquare,
        },
      ],
    },
    {
      title: "Views",
      shortcuts: [
        {
          keys: ["N"],
          description: "Next item in list",
        },
        {
          keys: ["P"],
          description: "Previous item in list",
        },
      ],
    },
    {
      title: "Quick Access",
      shortcuts: [
        {
          keys: ["G", "H"],
          description: "Go to home/overview",
          icon: Home,
        },
        {
          keys: ["G", "P"],
          description: "Go to players",
          icon: Users,
        },
        {
          keys: ["G", "T"],
          description: "Go to tasks",
          icon: CheckSquare,
        },
        {
          keys: ["G", "C"],
          description: "Go to calendar",
          icon: Calendar,
        },
      ],
    },
  ];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate faster and be more
            productive.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 font-semibold text-sm">{section.title}</h3>
              <div className="space-y-2">
                {section.shortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <div
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                      key={shortcut.keys.join("+")}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        {Icon && (
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{shortcut.description}</span>
                      </div>
                      <KbdGroup>
                        {shortcut.keys.map((key, index) => (
                          <span className="flex items-center gap-1" key={key}>
                            {index > 0 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                            <Kbd>{key}</Kbd>
                          </span>
                        ))}
                      </KbdGroup>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
