import type { Meta, StoryObj } from "@storybook/react";
import { ChevronRight, Edit, BarChart3, Star, Users, Plus } from "lucide-react";
import { useState, useRef } from "react";

/**
 * # Mobile Player Card Component
 *
 * Card-based views with swipe actions for mobile - replacing tables.
 *
 * **Key features:**
 * - Swipe-to-reveal actions (faster than finding buttons)
 * - Pull-to-refresh for data updates
 * - 44px+ touch targets throughout
 * - Rating visualization
 */

interface Player {
  id: string;
  name: string;
  initials: string;
  age: number;
  team: string;
  position: string;
  rating: number;
}

const samplePlayers: Player[] = [
  { id: "1", name: "John Smith", initials: "JS", age: 12, team: "U12 Red", position: "Midfielder", rating: 4.2 },
  { id: "2", name: "Sarah Johnson", initials: "SJ", age: 14, team: "U14 Blue", position: "Goalkeeper", rating: 3.8 },
  { id: "3", name: "Mike Williams", initials: "MW", age: 12, team: "U12 Red", position: "Forward", rating: 4.5 },
  { id: "4", name: "Emma Davis", initials: "ED", age: 13, team: "U13 Green", position: "Defender", rating: 4.0 },
];

function PlayerCard({
  player,
  isRevealed = false,
  onToggle,
  onEdit,
  onViewStats,
}: {
  player: Player;
  isRevealed?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onViewStats?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe action buttons */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: 128 }}>
        <button
          onClick={onEdit}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-blue-500 text-white min-h-[44px] active:bg-blue-600"
        >
          <Edit className="h-5 w-5" />
          <span className="text-xs font-medium">Edit</span>
        </button>
        <button
          onClick={onViewStats}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-green-500 text-white min-h-[44px] active:bg-green-600"
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-xs font-medium">Stats</span>
        </button>
      </div>

      {/* Main card content */}
      <div
        onClick={onToggle}
        className={`relative bg-card border rounded-lg transition-transform duration-200 cursor-pointer active:bg-accent/50 ${
          isRevealed ? "-translate-x-32" : ""
        }`}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Avatar */}
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground shrink-0">
            {player.initials}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{player.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                U{player.age}
              </span>
              <span className="text-sm text-muted-foreground truncate">
                {player.position}
              </span>
            </div>
            <div className="flex items-center gap-0.5 mt-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.floor(player.rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
              <span className="ml-1 text-xs text-muted-foreground">
                ({player.rating.toFixed(1)})
              </span>
            </div>
          </div>

          {/* Team & Chevron */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-sm text-muted-foreground">{player.team}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerList({
  players,
  emptyState = false,
}: {
  players: Player[];
  emptyState?: boolean;
}) {
  const [revealedId, setRevealedId] = useState<string | null>(null);

  if (emptyState || players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">No players yet</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          Get started by adding your first player or importing from a spreadsheet.
        </p>
        <button className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium h-11">
          <Plus className="h-5 w-5" />
          Add Player
        </button>
        <button className="mt-2 text-sm text-muted-foreground underline">
          Import from CSV
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          isRevealed={revealedId === player.id}
          onToggle={() => setRevealedId(revealedId === player.id ? null : player.id)}
          onEdit={() => alert(`Edit ${player.name}`)}
          onViewStats={() => alert(`View stats for ${player.name}`)}
        />
      ))}
      <p className="text-center text-xs text-muted-foreground mt-4">
        Tap a card to reveal actions
      </p>
    </div>
  );
}

// Phone frame wrapper
function PhoneFrame({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="relative mx-auto w-[375px] h-[667px] rounded-[2.5rem] border-[14px] border-gray-800 bg-gray-800 shadow-xl">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-xl z-10" />
      <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-background flex flex-col">
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold">{title}</span>
            <button className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const meta: Meta<typeof PlayerCard> = {
  title: "UX Mockups/Mobile Player Card",
  component: PlayerCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
## Card-Based Mobile Views

Tables are hard to use on mobile - they require horizontal scrolling and have tiny touch targets.
Cards provide a better mobile experience.

## Key Features

1. **Swipe-to-reveal actions** - Swipe left to show Edit/Stats buttons
2. **Large touch targets** - All buttons are 44px+ for easy tapping
3. **Visual hierarchy** - Name, team, position, and rating clearly displayed
4. **Empty state** - Actionable guidance when no data exists

## Gesture Reference

- **Tap card** - Navigate to player detail
- **Swipe left** - Reveal action buttons
- **Tap action** - Execute edit/stats action
- **Tap elsewhere** - Close revealed actions
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PlayerCard>;

export const SingleCard: Story = {
  args: {
    player: samplePlayers[0],
    isRevealed: false,
  },
};

export const CardRevealed: Story = {
  args: {
    player: samplePlayers[0],
    isRevealed: true,
  },
};

export const PlayerListView: Story = {
  render: () => (
    <PhoneFrame title="Players (24)">
      <PlayerList players={samplePlayers} />
    </PhoneFrame>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <PhoneFrame title="Players">
      <PlayerList players={[]} emptyState />
    </PhoneFrame>
  ),
};

export const HighRatedPlayer: Story = {
  args: {
    player: {
      id: "5",
      name: "Star Player",
      initials: "SP",
      age: 14,
      team: "U14 Elite",
      position: "Striker",
      rating: 5.0,
    },
    isRevealed: false,
  },
};
