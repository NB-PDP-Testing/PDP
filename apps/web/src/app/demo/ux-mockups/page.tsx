"use client";

import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Edit,
  Home,
  Menu,
  Mic,
  Plus,
  Settings,
  Shield,
  Star,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MultiOptionVoting,
  PreferenceVoting,
} from "@/components/ux-testing/preference-voting";
import { cn } from "@/lib/utils";

/**
 * UX MOCKUPS PREVIEW PAGE
 * Interactive demonstration of proposed UX improvements
 */
export default function UXMockupsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-bold text-3xl">UX Mockups Preview</h1>
          <p className="mt-2 text-muted-foreground">
            Interactive demonstrations of proposed UX improvements based on
            industry standards
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl space-y-12 p-4">
        {/* Mockup 1: Bottom Navigation with Role-Specific Options */}
        <BottomNavigationMockupSection />

        {/* Mockup 2: Touch Targets */}
        <MockupSection
          description="Apple HIG mandates 44x44pt minimum. Buttons smaller than this are missed by 25%+ of users."
          source="Apple Human Interface Guidelines"
          title="2. Touch Target Sizes"
        >
          <TouchTargetDemo />
        </MockupSection>

        {/* Mockup 3: Mobile Player Cards */}
        <MockupSection
          description="Card-based views on mobile instead of tables. Swipe gestures are faster than finding and tapping buttons."
          source="LogRocket UX Design"
          title="3. Mobile Player Cards with Swipe Actions"
        >
          <div className="grid gap-8 md:grid-cols-2">
            <PhoneMockup title="Current (Table)">
              <CurrentTableView />
            </PhoneMockup>
            <PhoneMockup highlighted title="Proposed (Cards + Swipe)">
              <ProposedCardView />
            </PhoneMockup>
          </div>
        </MockupSection>

        {/* Mockup 4: Admin Navigation Options - Vote for your preference! */}
        <AdminNavigationMockupSection />

        {/* Mockup 5: Skeleton Loading */}
        <MockupSection
          description="Skeleton screens reduce perceived loading time by up to 10% and prevent layout shift."
          source="UX Research"
          title="5. Skeleton Loading States"
        >
          <div className="grid gap-8 md:grid-cols-2">
            <PhoneMockup title="Current (Spinner)">
              <CurrentLoadingState />
            </PhoneMockup>
            <PhoneMockup highlighted title="Proposed (Skeleton)">
              <ProposedSkeletonState />
            </PhoneMockup>
          </div>
        </MockupSection>

        {/* Mockup 6: Empty States */}
        <MockupSection
          description="Empty states should educate and encourage action, not just say 'No data'."
          source="UX Best Practices"
          title="6. Actionable Empty States"
        >
          <div className="grid gap-8 md:grid-cols-2">
            <PhoneMockup title="Current (Basic)">
              <CurrentEmptyState />
            </PhoneMockup>
            <PhoneMockup highlighted title="Proposed (Actionable)">
              <ProposedEmptyState />
            </PhoneMockup>
          </div>
        </MockupSection>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function MockupSection({
  title,
  description,
  source,
  children,
}: {
  title: string;
  description: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">{title}</h2>
        <p className="mt-1 text-muted-foreground">{description}</p>
        <p className="mt-1 text-muted-foreground text-xs">Source: {source}</p>
      </div>
      {children}
    </section>
  );
}

function PhoneMockup({
  title,
  children,
  highlighted = false,
}: {
  title: string;
  children: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">{title}</h3>
        {highlighted && (
          <Badge className="bg-green-500" variant="default">
            Recommended
          </Badge>
        )}
      </div>
      <div
        className={cn(
          "relative mx-auto w-[320px] rounded-[2.5rem] border-[14px] border-gray-800 bg-gray-800 shadow-xl",
          highlighted && "ring-2 ring-green-500 ring-offset-2"
        )}
      >
        {/* Notch */}
        <div className="-translate-x-1/2 absolute top-0 left-1/2 h-6 w-24 rounded-b-xl bg-gray-800" />
        {/* Screen */}
        <div className="relative h-[568px] w-full overflow-hidden rounded-[1.5rem] bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 1: NAVIGATION
// ============================================

function CurrentTopNav() {
  return (
    <div className="flex h-full flex-col">
      {/* Top nav */}
      <div className="flex items-center justify-between border-b bg-[#1E3A5F] px-3 py-2 text-sm text-white">
        <div className="flex items-center gap-3">
          <span>Home</span>
          <span>Coach</span>
          <span>Admin</span>
        </div>
        <Menu className="h-5 w-5" />
      </div>
      {/* Content */}
      <div className="flex-1 p-4">
        <div className="mt-20 text-center text-muted-foreground">
          Content Area
        </div>
        <div className="mt-4 text-center text-red-500 text-xs">
          Navigation at top - hard to reach with thumb
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 2: TOUCH TARGETS
// ============================================

function TouchTargetDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Button Size Comparison</CardTitle>
        <CardDescription>
          Tap each button to feel the difference
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Current sizes */}
          <div className="space-y-4">
            <h4 className="font-medium text-red-600">
              Current Sizes (Below Standard)
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button className="h-8" size="sm" variant="outline">
                  h-8 (32px)
                </Button>
                <span className="text-red-500 text-xs">Too small</span>
              </div>
              <div className="flex items-center gap-3">
                <Button className="h-9" size="default" variant="outline">
                  h-9 (36px)
                </Button>
                <span className="text-red-500 text-xs">Below 44px</span>
              </div>
              <div className="flex items-center gap-3">
                <Button className="h-10" size="lg" variant="outline">
                  h-10 (40px)
                </Button>
                <span className="text-xs text-yellow-600">
                  Close but not compliant
                </span>
              </div>
            </div>
          </div>

          {/* Proposed sizes */}
          <div className="space-y-4">
            <h4 className="font-medium text-green-600">
              Proposed Sizes (Compliant)
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button className="h-11 px-5" variant="default">
                  h-11 (44px)
                </Button>
                <span className="text-green-600 text-xs">Minimum standard</span>
              </div>
              <div className="flex items-center gap-3">
                <Button className="h-12 px-6" variant="default">
                  h-12 (48px)
                </Button>
                <span className="text-green-600 text-xs">Comfortable</span>
              </div>
              <div className="flex items-center gap-3">
                <Button className="h-14 px-8 text-base" variant="default">
                  h-14 (56px)
                </Button>
                <span className="text-green-600 text-xs">Primary CTA</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MOCKUP 3: PLAYER CARDS
// ============================================

function CurrentTableView() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 font-medium">Players</div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="px-2 py-1 text-left">Name</th>
              <th className="px-2 py-1">Age</th>
              <th className="px-2 py-1">Team</th>
              <th className="px-2 py-1">Pos</th>
              <th className="px-2 py-1">...</th>
            </tr>
          </thead>
          <tbody>
            {["John S.", "Sarah J.", "Mike W."].map((name, i) => (
              <tr className="border-b" key={i}>
                <td className="max-w-[80px] truncate px-2 py-2">{name}</td>
                <td className="px-2 py-2 text-center">12</td>
                <td className="max-w-[50px] truncate px-2 py-2">U12</td>
                <td className="max-w-[40px] truncate px-2 py-2">Mid</td>
                <td className="px-2 py-2 text-center">
                  <button className="px-1 text-[10px]">•••</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 px-4 text-center text-red-500 text-xs">
          Requires horizontal scroll, tiny tap targets
        </div>
      </div>
    </div>
  );
}

function ProposedCardView() {
  const [swipedCard, setSwipedCard] = useState<number | null>(null);

  const players = [
    {
      name: "John Smith",
      team: "U12 Red",
      position: "Midfielder",
      rating: 4.2,
    },
    {
      name: "Sarah Johnson",
      team: "U14 Blue",
      position: "Goalkeeper",
      rating: 3.8,
    },
    {
      name: "Mike Williams",
      team: "U12 Red",
      position: "Forward",
      rating: 4.5,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">Players (24)</span>
        <Button className="h-9 w-9" size="icon" variant="ghost">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {players.map((player, i) => (
          <div className="relative overflow-hidden rounded-lg" key={i}>
            {/* Swipe actions */}
            <div className="absolute inset-y-0 right-0 flex">
              <button className="flex w-16 flex-col items-center justify-center bg-blue-500 text-white">
                <Edit className="h-4 w-4" />
                <span className="text-[10px]">Edit</span>
              </button>
              <button className="flex w-16 flex-col items-center justify-center bg-green-500 text-white">
                <BarChart3 className="h-4 w-4" />
                <span className="text-[10px]">Stats</span>
              </button>
            </div>

            {/* Card */}
            <div
              className={cn(
                "relative rounded-lg border bg-card transition-transform",
                swipedCard === i && "-translate-x-32"
              )}
              onClick={() => setSwipedCard(swipedCard === i ? null : i)}
            >
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{player.name}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge
                      className="px-1.5 py-0 text-[10px]"
                      variant="secondary"
                    >
                      {player.team.split(" ")[0]}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {player.position}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        className={cn(
                          "h-3 w-3",
                          star <= Math.floor(player.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-muted text-muted"
                        )}
                        key={star}
                      />
                    ))}
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ({player.rating})
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
        <p className="mt-2 text-center text-green-600 text-xs">
          Tap cards to see swipe actions
        </p>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 4: ADMIN NAVIGATION
// ============================================

function CurrentAdminNav() {
  const items = [
    "Overview",
    "Players",
    "Teams",
    "Coaches",
    "Guardians",
    "Users",
    "Import",
    "...",
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 font-medium">Admin Panel</div>
      <div className="overflow-x-auto border-b">
        <div className="flex min-w-max gap-1 px-2 py-2">
          {items.map((item, i) => (
            <Button
              className="h-8 whitespace-nowrap text-xs"
              key={i}
              size="sm"
              variant={i === 0 ? "secondary" : "ghost"}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        <div className="text-center text-red-500 text-xs">
          16 items require horizontal scroll
          <br />
          Hard to find items
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 5: LOADING STATES
// ============================================

function CurrentLoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-muted-foreground text-sm">Loading...</p>
      <p className="mt-4 text-red-500 text-xs">
        No layout context
        <br />
        Content jumps when loaded
      </p>
    </div>
  );
}

function ProposedSkeletonState() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((i) => (
          <div
            className="flex items-center gap-3 rounded-lg border p-3"
            key={i}
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-5" />
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-green-600 text-xs">
        Maintains layout, reduces perceived wait
      </p>
    </div>
  );
}

// ============================================
// MOCKUP 6: EMPTY STATES
// ============================================

function CurrentEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <p className="text-muted-foreground">No players found</p>
      <p className="mt-4 text-red-500 text-xs">
        No guidance for user
        <br />
        Dead end
      </p>
    </div>
  );
}

function ProposedEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">No players yet</h3>
      <p className="mt-1 max-w-[200px] text-muted-foreground text-sm">
        Get started by adding your first player or importing from a spreadsheet.
      </p>
      <Button className="mt-4 h-11">
        <Plus className="mr-2 h-4 w-4" />
        Add Player
      </Button>
      <button className="mt-2 text-muted-foreground text-sm underline">
        Import from CSV
      </button>
    </div>
  );
}

// ============================================
// MOCKUP 1 (NEW): BOTTOM NAVIGATION SECTION
// Role-specific bottom nav with active-only labels
// ============================================

function BottomNavigationMockupSection() {
  const [selectedRole, setSelectedRole] = useState<
    "admin" | "coach" | "parent"
  >("admin");

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          1. Role-Specific Bottom Navigation
        </h2>
        <p className="mt-1 text-muted-foreground">
          72% of users prefer bottom navigation. Labels shown on active item
          only for a cleaner look.
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Source: Nielsen Norman Group
        </p>
      </div>

      {/* Role Selector */}
      <div className="flex flex-wrap gap-2">
        {(["admin", "coach", "parent"] as const).map((role) => (
          <Button
            key={role}
            onClick={() => setSelectedRole(role)}
            variant={selectedRole === role ? "default" : "outline"}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)} View
          </Button>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PhoneMockup title="Current (Top Nav)">
          <CurrentTopNav />
        </PhoneMockup>
        <PhoneMockup
          highlighted
          title={`Proposed (${selectedRole} bottom nav)`}
        >
          <RoleSpecificBottomNav role={selectedRole} />
        </PhoneMockup>
      </div>

      <PreferenceVoting
        mockupId="bottom-nav-vs-top"
        mockupName="Bottom Navigation vs Top Navigation"
        onVote={(pref) => console.log("Bottom nav vote:", pref)}
      />
    </section>
  );
}

type BottomNavItem = {
  icon: typeof Home;
  label: string;
  id: string;
  isAction?: boolean;
};

const roleNavConfigs: Record<"admin" | "coach" | "parent", BottomNavItem[]> = {
  admin: [
    { icon: Home, label: "Home", id: "home" },
    { icon: Users, label: "Players", id: "players" },
    { icon: Plus, label: "Add", id: "add", isAction: true },
    { icon: BarChart3, label: "Analytics", id: "analytics" },
    { icon: Settings, label: "Settings", id: "settings" },
  ],
  coach: [
    { icon: Home, label: "Home", id: "home" },
    { icon: Users, label: "Players", id: "players" },
    { icon: ClipboardList, label: "Assess", id: "assess", isAction: true },
    { icon: Mic, label: "Notes", id: "notes" },
    { icon: User, label: "Profile", id: "profile" },
  ],
  parent: [
    { icon: Home, label: "Home", id: "home" },
    { icon: Users, label: "Children", id: "children" },
    { icon: CalendarDays, label: "Schedule", id: "schedule" },
    { icon: BarChart3, label: "Progress", id: "progress" },
    { icon: User, label: "Profile", id: "profile" },
  ],
};

function RoleSpecificBottomNav({
  role,
}: {
  role: "admin" | "coach" | "parent";
}) {
  const [activeTab, setActiveTab] = useState("home");
  const navItems = roleNavConfigs[role];

  return (
    <div className="flex h-full flex-col">
      {/* Simplified top bar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold capitalize">{role} Dashboard</span>
        <Button className="h-9 w-9" size="icon" variant="ghost">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="mt-16 text-center text-muted-foreground">
          Content Area
        </div>
        <div className="mt-4 text-center text-green-600 text-xs">
          Primary actions within thumb reach!
          <br />
          Labels on active only = cleaner look
        </div>
      </div>

      {/* Bottom nav - Active Only Labels */}
      <div className="border-t bg-background/95 backdrop-blur">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => (
            <button
              className={cn(
                "flex flex-col items-center justify-center",
                item.isAction ? "-mt-4 relative" : "h-14 w-14"
              )}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
            >
              {item.isAction ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <item.icon className="h-5 w-5" />
                </div>
              ) : (
                <item.icon
                  className={cn(
                    "h-6 w-6",
                    activeTab === item.id
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
              )}
              {/* Active-only label */}
              {activeTab === item.id && !item.isAction && (
                <span className="mt-0.5 font-medium text-[10px] text-primary">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 4 (NEW): ADMIN NAVIGATION OPTIONS
// Test 3 approaches: Sidebar, Bottom Sheet, Tabs
// ============================================

function AdminNavigationMockupSection() {
  const [selectedOption, setSelectedOption] = useState<
    "sidebar" | "bottomsheet" | "tabs"
  >("sidebar");

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          4. Admin Navigation - Help Us Decide!
        </h2>
        <p className="mt-1 text-muted-foreground">
          The admin panel has 16 navigation items. We&apos;re testing 3
          approaches to improve mobile usability.
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Source: UXPin Dashboard Principles
        </p>
      </div>

      {/* Option Selector */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setSelectedOption("sidebar")}
          variant={selectedOption === "sidebar" ? "default" : "outline"}
        >
          A: Grouped Sidebar
        </Button>
        <Button
          onClick={() => setSelectedOption("bottomsheet")}
          variant={selectedOption === "bottomsheet" ? "default" : "outline"}
        >
          B: Bottom Sheet
        </Button>
        <Button
          onClick={() => setSelectedOption("tabs")}
          variant={selectedOption === "tabs" ? "default" : "outline"}
        >
          C: Tabbed Categories
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PhoneMockup title="Current (16 Horizontal Items)">
          <CurrentAdminNav />
        </PhoneMockup>
        <PhoneMockup
          highlighted
          title={`Proposed: ${
            selectedOption === "sidebar"
              ? "Grouped Sidebar"
              : selectedOption === "bottomsheet"
                ? "Bottom Sheet Menu"
                : "Tabbed Categories"
          }`}
        >
          {selectedOption === "sidebar" && <AdminNavSidebar />}
          {selectedOption === "bottomsheet" && <AdminNavBottomSheet />}
          {selectedOption === "tabs" && <AdminNavTabs />}
        </PhoneMockup>
      </div>

      <MultiOptionVoting
        comparisonId="admin-nav-style"
        comparisonName="Admin Navigation Style"
        onVote={(optionId) => console.log("Admin nav vote:", optionId)}
        options={[
          {
            id: "sidebar",
            label: "A: Grouped Sidebar",
            description:
              "Collapsible groups in a slide-out drawer. Most apps use this.",
          },
          {
            id: "bottomsheet",
            label: "B: Bottom Sheet Menu",
            description:
              "Hamburger opens full-height bottom sheet. Popular on iOS.",
          },
          {
            id: "tabs",
            label: "C: Tabbed Categories",
            description:
              "4 top tabs with sub-items below. Similar to settings apps.",
          },
        ]}
      />
    </section>
  );
}

// Option A: Grouped Sidebar
function AdminNavSidebar() {
  const [expanded, setExpanded] = useState<string | null>("People");

  const groups = [
    {
      label: "People",
      icon: Users,
      items: ["Players", "Coaches", "Guardians", "Users", "Approvals"],
    },
    {
      label: "Teams & Access",
      icon: Shield,
      items: ["Teams", "Overrides", "Player Access"],
    },
    {
      label: "Data",
      icon: BarChart3,
      items: ["Analytics", "Benchmarks", "Import Players", "GAA Import"],
    },
    {
      label: "Settings",
      icon: Settings,
      items: ["Settings", "Announcements", "Dev Tools"],
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">Admin Panel</span>
        <Button className="h-9 w-9" size="icon" variant="ghost">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <button className="flex w-full items-center gap-3 bg-accent px-4 py-3 font-medium text-sm">
          <Home className="h-5 w-5" />
          Overview
        </button>

        {groups.map((group) => (
          <div key={group.label}>
            <button
              className="flex w-full items-center justify-between px-4 py-3 font-medium text-sm hover:bg-accent"
              onClick={() =>
                setExpanded(expanded === group.label ? null : group.label)
              }
            >
              <div className="flex items-center gap-3">
                <group.icon className="h-5 w-5" />
                {group.label}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  expanded === group.label && "rotate-180"
                )}
              />
            </button>
            {expanded === group.label && (
              <div className="bg-muted/50">
                {group.items.map((item) => (
                  <button
                    className="w-full px-4 py-2.5 pl-12 text-left text-muted-foreground text-sm hover:bg-accent hover:text-foreground"
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Option B: Bottom Sheet Menu
function AdminNavBottomSheet() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const groups = [
    {
      label: "People",
      items: ["Players", "Coaches", "Guardians", "Users", "Approvals"],
    },
    {
      label: "Teams & Access",
      items: ["Teams", "Overrides", "Player Access"],
    },
    { label: "Data", items: ["Analytics", "Benchmarks", "Import"] },
    { label: "Settings", items: ["Settings", "Announcements"] },
  ];

  return (
    <div className="relative flex h-full flex-col">
      {/* Simplified top bar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <button
          className="flex items-center gap-2"
          onClick={() => setSheetOpen(!sheetOpen)}
        >
          <Menu className="h-5 w-5" />
          <span className="font-semibold">Admin</span>
        </button>
        <span className="text-muted-foreground text-sm">Overview</span>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="mt-16 text-center text-muted-foreground">
          Content Area
        </div>
        <p className="mt-4 text-center text-green-600 text-xs">
          Tap hamburger to see bottom sheet
        </p>
      </div>

      {/* Bottom Sheet Overlay */}
      {sheetOpen && (
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85%] overflow-y-auto rounded-t-2xl bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="sticky top-0 flex justify-center bg-background pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Menu Items */}
            <div className="px-4 pb-8">
              <button className="w-full rounded-lg bg-accent py-3 text-left font-medium">
                <div className="px-3">Overview</div>
              </button>

              {groups.map((group) => (
                <div className="mt-4" key={group.label}>
                  <div className="mb-2 px-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    {group.label}
                  </div>
                  {group.items.map((item) => (
                    <button
                      className="w-full py-2.5 text-left text-sm hover:bg-accent"
                      key={item}
                    >
                      <div className="px-3">{item}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Option C: Tabbed Categories
function AdminNavTabs() {
  const [activeTab, setActiveTab] = useState("people");

  const tabs = [
    {
      id: "people",
      label: "People",
      items: ["Overview", "Players", "Coaches", "Guardians", "Users"],
    },
    {
      id: "teams",
      label: "Teams",
      items: ["All Teams", "Overrides", "Access"],
    },
    {
      id: "data",
      label: "Data",
      items: ["Analytics", "Benchmarks", "Import"],
    },
    {
      id: "settings",
      label: "Settings",
      items: ["Settings", "Announcements", "Dev"],
    },
  ];

  const activeTabData = tabs.find((t) => t.id === activeTab);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar with title */}
      <div className="border-b px-4 py-3">
        <span className="font-semibold">Admin Panel</span>
      </div>

      {/* Category Tabs */}
      <div className="border-b">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              className={cn(
                "flex-1 border-b-2 py-2.5 text-center text-sm transition-colors",
                activeTab === tab.id
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-items for active tab */}
      <div className="flex-1 overflow-y-auto">
        {activeTabData?.items.map((item, i) => (
          <button
            className={cn(
              "w-full px-4 py-3 text-left text-sm hover:bg-accent",
              i === 0 && "bg-accent font-medium"
            )}
            key={item}
          >
            {item}
          </button>
        ))}

        <p className="mt-8 px-4 text-center text-green-600 text-xs">
          4 tabs reduce cognitive load
          <br />
          Sub-items appear below active tab
        </p>
      </div>
    </div>
  );
}
