import type { Meta, StoryObj } from "@storybook/react";
import { Home, Users, Plus, BarChart3, User } from "lucide-react";
import { useState } from "react";

/**
 * # Bottom Navigation Component
 *
 * Industry Standard: Bottom navigation increases engagement by 65% vs hamburger menus
 *
 * **Research findings:**
 * - 72% of users prefer bottom navigation (Google Research)
 * - Redbooth saw 65% increase in DAU after switching from hamburger
 * - Task completion rates improve by 60% with bottom nav
 */

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  id: string;
  isAction?: boolean;
}

const defaultItems: NavItem[] = [
  { icon: Home, label: "Home", id: "home" },
  { icon: Users, label: "Players", id: "players" },
  { icon: Plus, label: "Add", id: "add", isAction: true },
  { icon: BarChart3, label: "Stats", id: "stats" },
  { icon: User, label: "Profile", id: "profile" },
];

function BottomNav({
  items = defaultItems,
  activeId = "home",
  onItemClick,
  onActionClick,
}: {
  items?: NavItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
  onActionClick?: () => void;
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg">
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={onActionClick}
                className="flex flex-col items-center justify-center relative -mt-6"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mt-1 text-xs font-medium text-muted-foreground">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={`flex h-14 w-16 flex-col items-center justify-center transition-colors ${
                activeId === item.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className={`mt-1 text-xs ${activeId === item.id ? "font-medium" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Phone frame wrapper for realistic preview
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[375px] h-[667px] rounded-[2.5rem] border-[14px] border-gray-800 bg-gray-800 shadow-xl">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-xl z-10" />
      <div className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-background">
        {children}
      </div>
    </div>
  );
}

const meta: Meta<typeof BottomNav> = {
  title: "UX Mockups/Bottom Navigation",
  component: BottomNav,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
## Why Bottom Navigation?

Research from Nielsen Norman Group and Google shows:

- **72%** of users prefer easily accessible bottom navigation
- **65%** increase in daily active users (Redbooth case study)
- **60%** improvement in task completion rates

## Key Features

1. **Elevated FAB** - Primary action button lifted above nav for prominence
2. **44px+ touch targets** - Meets Apple HIG accessibility standards
3. **Visual active state** - Clear indication of current section
4. **Thumb-zone optimized** - Easy to reach with one hand
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <PhoneFrame>
        <div className="h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Content Area
          </div>
          <Story />
        </div>
      </PhoneFrame>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

export const Default: Story = {
  args: {
    activeId: "home",
  },
};

export const PlayersActive: Story = {
  args: {
    activeId: "players",
  },
};

export const Interactive: Story = {
  render: () => {
    const [active, setActive] = useState("home");
    return (
      <BottomNav
        activeId={active}
        onItemClick={setActive}
        onActionClick={() => alert("Add action clicked!")}
      />
    );
  },
};

export const CoachVariant: Story = {
  args: {
    items: [
      { icon: Home, label: "Home", id: "home" },
      { icon: Users, label: "Squad", id: "squad" },
      { icon: Plus, label: "Assess", id: "assess", isAction: true },
      { icon: BarChart3, label: "Stats", id: "stats" },
      { icon: User, label: "Me", id: "profile" },
    ],
    activeId: "home",
  },
};

export const ParentVariant: Story = {
  args: {
    items: [
      { icon: Home, label: "Home", id: "home" },
      { icon: BarChart3, label: "Progress", id: "progress" },
      { icon: Plus, label: "Message", id: "message", isAction: true },
      { icon: Users, label: "Team", id: "team" },
      { icon: User, label: "Profile", id: "profile" },
    ],
    activeId: "home",
  },
};
