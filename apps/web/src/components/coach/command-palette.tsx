"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  Calendar,
  CheckSquare,
  FileText,
  Home,
  Lightbulb,
  Mic,
  Target,
  Users,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ListSkeleton } from "@/components/loading/list-skeleton";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCurrentUser } from "@/hooks/use-current-user";

type CommandPaletteProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  organizationId: string;
};

export function CommandPalette({
  open,
  setOpen,
  organizationId,
}: CommandPaletteProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");

  // Query recent voice notes (for "Recent Players" section)
  const voiceNotes = useQuery(
    api.models.voiceNotes.getVoiceNotesByCoach,
    user?._id
      ? {
          orgId: organizationId,
          coachId: user._id,
        }
      : "skip"
  );

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  // Extract unique players from recent voice notes (last 10)
  const recentPlayers = voiceNotes
    ? voiceNotes
        .flatMap((note) => {
          return note.insights
            .filter((insight) => insight.playerIdentityId && insight.playerName)
            .map((insight) => {
              return {
                id: insight.playerIdentityId ?? "",
                name: insight.playerName ?? "",
                // Try to extract age group from note or insight
                ageGroup: "", // We don't have age group readily available
              };
            });
        })
        .reduce(
          (acc, player) => {
            // Deduplicate by player ID
            if (!acc.find((p) => p.id === player.id)) {
              acc.push(player);
            }
            return acc;
          },
          [] as Array<{ id: string; name: string; ageGroup: string }>
        )
        .slice(0, 10)
    : [];

  const handleSelect = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  // Quick Actions
  const quickActions = [
    {
      id: "new-voice-note",
      label: "New Voice Note",
      icon: Mic,
      onSelect: () => {
        router.push(`/orgs/${organizationId}/coach/voice-notes` as Route);
      },
    },
    {
      id: "view-team-hub",
      label: "View Team Hub",
      icon: Users,
      onSelect: () => {
        router.push(`/orgs/${organizationId}/coach/team-hub` as Route);
      },
    },
    {
      id: "session-plans",
      label: "Session Plans",
      icon: Target,
      onSelect: () => {
        router.push(`/orgs/${organizationId}/coach/session-plans` as Route);
      },
    },
    {
      id: "view-players",
      label: "View Players",
      icon: Users,
      onSelect: () => {
        router.push(`/orgs/${organizationId}/coach/players` as Route);
      },
    },
  ];

  // Navigation items
  const navigationItems = [
    {
      id: "overview",
      label: "Overview",
      icon: Home,
      href: `/orgs/${organizationId}/coach`,
    },
    {
      id: "voice-notes",
      label: "Voice Notes",
      icon: Mic,
      href: `/orgs/${organizationId}/coach/voice-notes`,
    },
    {
      id: "insights",
      label: "Insights",
      icon: Lightbulb,
      href: `/orgs/${organizationId}/coach/voice-notes?tab=insights`,
    },
    {
      id: "players",
      label: "Players",
      icon: Users,
      href: `/orgs/${organizationId}/coach/players`,
    },
    {
      id: "session-plans",
      label: "Session Plans",
      icon: Target,
      href: `/orgs/${organizationId}/coach/session-plans`,
    },
    {
      id: "team-hub",
      label: "Team Hub",
      icon: Users,
      href: `/orgs/${organizationId}/coach/team-hub`,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: CheckSquare,
      href: `/orgs/${organizationId}/coach/todos`,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: Calendar,
      href: `/orgs/${organizationId}/coach/calendar`,
    },
    {
      id: "reports",
      label: "Reports",
      icon: FileText,
      href: `/orgs/${organizationId}/coach/reports`,
    },
  ];

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandInput
        onValueChange={setSearchQuery}
        placeholder="Type a command or search..."
        value={searchQuery}
      />
      <CommandList>
        <CommandEmpty>
          No results found for &quot;{searchQuery}&quot;
        </CommandEmpty>

        {/* Quick Actions Section */}
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.id}
                onSelect={() => handleSelect(action.onSelect)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{action.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* Navigation Section */}
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                onSelect={() =>
                  handleSelect(() => {
                    router.push(item.href as Route);
                  })
                }
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* Recent Players Section */}
        {voiceNotes === undefined && (
          <CommandGroup heading="Recent Players">
            <div className="px-2 py-4">
              <ListSkeleton items={3} />
            </div>
          </CommandGroup>
        )}
        {voiceNotes !== undefined && recentPlayers.length > 0 && (
          <CommandGroup heading="Recent Players">
            {recentPlayers.map((player) => (
              <CommandItem
                key={player.id}
                onSelect={() =>
                  handleSelect(() => {
                    router.push(
                      `/orgs/${organizationId}/coach/players/${player.id}` as Route
                    );
                  })
                }
              >
                <Users className="mr-2 h-4 w-4" />
                <span>
                  {player.name}
                  {player.ageGroup ? ` - ${player.ageGroup}` : ""}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
