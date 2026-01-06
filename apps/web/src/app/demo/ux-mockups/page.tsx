"use client";

import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Edit,
  Eye,
  Filter,
  Home,
  Menu,
  Mic,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Star,
  Target,
  TrendingUp,
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

        {/* Divider - Real Page Examples */}
        <div className="border-t pt-8">
          <h2 className="mb-2 font-bold text-2xl">Real Page Examples</h2>
          <p className="text-muted-foreground">
            See how these UX improvements apply to actual pages in PlayerARC
          </p>
        </div>

        {/* Mockup 7: Full Admin Players List */}
        <AdminPlayersListMockup />

        {/* Mockup 8: Coach Assessment Entry */}
        <CoachAssessmentMockup />

        {/* Mockup 9: Parent Portal - Child Progress */}
        <ParentPortalMockup />

        {/* Mockup 10: Touch-Optimized Forms */}
        <TouchOptimizedFormsMockup />

        {/* Mockup 11: Pull-to-Refresh & Gestures */}
        <GesturesMockup />

        {/* Mockup 12: Team Management */}
        <TeamManagementMockup />
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

// ============================================
// MOCKUP 7: ADMIN PLAYERS LIST (FULL PAGE)
// ============================================

const samplePlayers = [
  {
    id: "1",
    name: "Cian Murphy",
    initials: "CM",
    ageGroup: "U12",
    team: "U12 Red",
    gender: "Male",
    lastReview: "2 days ago",
    reviewStatus: "complete" as const,
    sport: "GAA",
  },
  {
    id: "2",
    name: "Sarah O'Brien",
    initials: "SO",
    ageGroup: "U14",
    team: "U14 Blue",
    gender: "Female",
    lastReview: "45 days ago",
    reviewStatus: "due_soon" as const,
    sport: "GAA",
  },
  {
    id: "3",
    name: "Jack Ryan",
    initials: "JR",
    ageGroup: "U12",
    team: "U12 Red",
    gender: "Male",
    lastReview: "92 days ago",
    reviewStatus: "overdue" as const,
    sport: "Soccer",
  },
  {
    id: "4",
    name: "Emma Walsh",
    initials: "EW",
    ageGroup: "U10",
    team: "U10 Mixed",
    gender: "Female",
    lastReview: "Never",
    reviewStatus: "not_started" as const,
    sport: "GAA",
  },
];

function AdminPlayersListMockup() {
  const [swipedPlayer, setSwipedPlayer] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">7. Admin Players List</h2>
        <p className="mt-1 text-muted-foreground">
          Full players list with search, filters, and swipe actions. Shows
          review status with color coding.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PhoneMockup title="Current (Table overflow)">
          <CurrentPlayersTable />
        </PhoneMockup>
        <PhoneMockup highlighted title="Proposed (Cards + Actions)">
          <div className="flex h-full flex-col">
            {/* Header with stats */}
            <div className="border-b bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Players</span>
                <div className="flex gap-2">
                  <Button
                    className="h-9 w-9 bg-white/20 hover:bg-white/30"
                    size="icon"
                    variant="ghost"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button
                    className="h-9 w-9 bg-white/20 hover:bg-white/30"
                    size="icon"
                    variant="ghost"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Quick stats */}
              <div className="mt-2 flex gap-4 text-xs">
                <span className="rounded bg-white/20 px-2 py-0.5">
                  24 Total
                </span>
                <span className="rounded bg-green-500/80 px-2 py-0.5">
                  18 Reviewed
                </span>
                <span className="rounded bg-red-500/80 px-2 py-0.5">
                  3 Overdue
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="border-b px-3 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">
                  Search players...
                </span>
              </div>
            </div>

            {/* Player cards */}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {samplePlayers.map((player) => (
                <div
                  className="relative overflow-hidden rounded-lg"
                  key={player.id}
                >
                  {/* Swipe actions */}
                  <div className="absolute inset-y-0 right-0 flex">
                    <button className="flex w-14 flex-col items-center justify-center bg-blue-500 text-white">
                      <Eye className="h-4 w-4" />
                      <span className="text-[9px]">View</span>
                    </button>
                    <button className="flex w-14 flex-col items-center justify-center bg-amber-500 text-white">
                      <Edit className="h-4 w-4" />
                      <span className="text-[9px]">Edit</span>
                    </button>
                  </div>

                  {/* Card */}
                  <div
                    className={cn(
                      "relative rounded-lg border bg-card transition-transform",
                      swipedPlayer === player.id && "-translate-x-28"
                    )}
                    onClick={() =>
                      setSwipedPlayer(
                        swipedPlayer === player.id ? null : player.id
                      )
                    }
                  >
                    <div className="flex items-center gap-3 p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {player.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {player.name}
                          </span>
                          <ReviewStatusBadge status={player.reviewStatus} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge
                            className="px-1.5 py-0 text-[10px]"
                            variant="secondary"
                          >
                            {player.ageGroup}
                          </Badge>
                          <Badge
                            className="px-1.5 py-0 text-[10px]"
                            variant="outline"
                          >
                            {player.team}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {player.lastReview}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
              <p className="mt-2 text-center text-green-600 text-xs">
                Swipe left for quick actions
              </p>
            </div>

            {/* Bottom nav */}
            <MiniBottomNav activeTab="players" />
          </div>
        </PhoneMockup>
      </div>

      <PreferenceVoting
        mockupId="players-list-cards"
        mockupName="Admin Players List - Cards vs Table"
      />
    </section>
  );
}

function ReviewStatusBadge({
  status,
}: {
  status: "complete" | "due_soon" | "overdue" | "not_started";
}) {
  const config = {
    complete: { bg: "bg-green-100 text-green-700", label: "Done" },
    due_soon: { bg: "bg-yellow-100 text-yellow-700", label: "Due" },
    overdue: { bg: "bg-red-100 text-red-700", label: "Overdue" },
    not_started: { bg: "bg-gray-100 text-gray-600", label: "New" },
  };
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-medium text-[9px]",
        config[status].bg
      )}
    >
      {config[status].label}
    </span>
  );
}

function CurrentPlayersTable() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 font-medium">Players</div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="bg-muted">
            <tr>
              <th className="px-1.5 py-1.5 text-left">Name</th>
              <th className="px-1.5 py-1.5">Age</th>
              <th className="px-1.5 py-1.5">Team</th>
              <th className="px-1.5 py-1.5">Review</th>
              <th className="px-1.5 py-1.5">...</th>
            </tr>
          </thead>
          <tbody>
            {samplePlayers.map((p) => (
              <tr className="border-b" key={p.id}>
                <td className="max-w-[60px] truncate px-1.5 py-2">{p.name}</td>
                <td className="px-1.5 py-2 text-center">{p.ageGroup}</td>
                <td className="max-w-[50px] truncate px-1.5 py-2">{p.team}</td>
                <td className="max-w-[40px] truncate px-1.5 py-2">
                  {p.lastReview}
                </td>
                <td className="px-1.5 py-2">
                  <button className="px-1 text-[8px]">•••</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 text-center text-red-500 text-xs">
          Truncated names, tiny targets
          <br />
          Hard to scan quickly
        </div>
      </div>
    </div>
  );
}

function MiniBottomNav({ activeTab }: { activeTab: string }) {
  const items = [
    { icon: Home, id: "home" },
    { icon: Users, id: "players" },
    { icon: Plus, id: "add", isAction: true },
    { icon: BarChart3, id: "stats" },
    { icon: Settings, id: "settings" },
  ];

  return (
    <div className="border-t bg-background">
      <div className="flex items-center justify-around py-1.5">
        {items.map((item) => (
          <button
            className={cn(
              "flex h-10 w-10 items-center justify-center",
              item.isAction &&
                "-mt-3 rounded-full bg-primary text-primary-foreground shadow"
            )}
            key={item.id}
          >
            <item.icon
              className={cn(
                "h-5 w-5",
                activeTab === item.id && !item.isAction
                  ? "text-primary"
                  : item.isAction
                    ? ""
                    : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 8: COACH ASSESSMENT ENTRY
// ============================================

const sampleSkills = [
  { name: "Ball Control", prev: 3, category: "Technical" },
  { name: "Passing Accuracy", prev: 4, category: "Technical" },
  { name: "First Touch", prev: 2, category: "Technical" },
  { name: "Positioning", prev: 3, category: "Tactical" },
  { name: "Work Rate", prev: 5, category: "Physical" },
];

function CoachAssessmentMockup() {
  const [selectedRating, setSelectedRating] = useState<Record<string, number>>(
    {}
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">8. Coach Assessment Entry</h2>
        <p className="mt-1 text-muted-foreground">
          Quick skill ratings with touch-optimized sliders. Shows previous
          rating for context.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PhoneMockup title="Current (Small inputs)">
          <CurrentAssessmentForm />
        </PhoneMockup>
        <PhoneMockup highlighted title="Proposed (Touch-optimized)">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-white/30">
                  <AvatarFallback className="bg-white/20 text-white">
                    CM
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">Cian Murphy</div>
                  <div className="text-xs opacity-80">
                    U12 Red • Training Session
                  </div>
                </div>
              </div>
            </div>

            {/* Skills list */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {sampleSkills.map((skill) => (
                <div
                  className={cn(
                    "rounded-lg border p-3",
                    selectedRating[skill.name] && "border-green-300 bg-green-50"
                  )}
                  key={skill.name}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{skill.name}</div>
                      <div className="text-muted-foreground text-xs">
                        Previous:{" "}
                        <span className="font-medium">{skill.prev}/5</span>
                      </div>
                    </div>
                    {selectedRating[skill.name] && (
                      <Check className="h-5 w-5 text-green-600" />
                    )}
                  </div>

                  {/* Large touch-friendly rating buttons */}
                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        className={cn(
                          "flex h-11 flex-1 items-center justify-center rounded-lg border-2 font-medium transition-all",
                          selectedRating[skill.name] === rating
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted hover:border-primary/50"
                        )}
                        key={rating}
                        onClick={() =>
                          setSelectedRating((prev) => ({
                            ...prev,
                            [skill.name]: rating,
                          }))
                        }
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky save button */}
            <div className="border-t bg-background p-3">
              <Button className="h-12 w-full text-base">
                Save Assessment ({Object.keys(selectedRating).length}/
                {sampleSkills.length})
              </Button>
            </div>
          </div>
        </PhoneMockup>
      </div>

      <PreferenceVoting
        mockupId="coach-assessment"
        mockupName="Coach Assessment Entry"
      />
    </section>
  );
}

function CurrentAssessmentForm() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2">
        <span className="font-medium text-sm">Assessment: Cian Murphy</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {sampleSkills.slice(0, 3).map((skill) => (
          <div className="space-y-1" key={skill.name}>
            <label className="text-xs">{skill.name}</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  className="h-7 w-7 rounded border text-[10px] hover:bg-accent"
                  key={r}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="text-red-500 text-xs">
          Tiny buttons (28px)
          <br />
          Hard to tap accurately
          <br />
          No visual feedback
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 9: PARENT PORTAL - CHILD PROGRESS
// ============================================

function ParentPortalMockup() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          9. Parent Portal - Child Progress
        </h2>
        <p className="mt-1 text-muted-foreground">
          Parents see their children&apos;s progress at a glance with clear
          status indicators.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PhoneMockup title="Current (Basic list)">
          <CurrentParentView />
        </PhoneMockup>
        <PhoneMockup highlighted title="Proposed (Rich cards)">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-4 text-white">
              <div className="font-semibold text-lg">
                Your Family&apos;s Journey
              </div>
              <div className="mt-1 text-sm opacity-80">Tracking 2 children</div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-2 border-b p-3">
              <StatMini icon={Users} label="Children" value="2" />
              <StatMini color="green" icon={Check} label="Reviewed" value="1" />
              <StatMini
                color="yellow"
                icon={Clock}
                label="Due Soon"
                value="1"
              />
              <StatMini
                color="red"
                icon={AlertCircle}
                label="Overdue"
                value="0"
              />
            </div>

            {/* Children cards */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              <ChildProgressCard
                attendance={{ training: 92, matches: 88 }}
                goals={["Improve left foot", "Leadership skills"]}
                name="Cian Murphy"
                performance={78}
                reviewStatus="complete"
                strengths={["Ball Control", "Work Rate", "Passing"]}
                team="U12 Red"
              />
              <ChildProgressCard
                attendance={{ training: 85, matches: 90 }}
                goals={["Shot stopping", "Distribution"]}
                name="Aoife Murphy"
                performance={72}
                reviewStatus="due_soon"
                strengths={["Positioning", "Communication", "Reflexes"]}
                team="U14 Blue"
              />
            </div>

            {/* Bottom nav */}
            <div className="border-t bg-background">
              <div className="flex items-center justify-around py-2">
                {[
                  { icon: Home, label: "Home", active: true },
                  { icon: Users, label: "Children" },
                  { icon: CalendarDays, label: "Schedule" },
                  { icon: User, label: "Profile" },
                ].map((item) => (
                  <button
                    className="flex flex-col items-center gap-0.5"
                    key={item.label}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    {item.active && (
                      <span className="font-medium text-[9px] text-primary">
                        {item.label}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PhoneMockup>
      </div>

      <PreferenceVoting
        mockupId="parent-portal"
        mockupName="Parent Portal Child Progress"
      />
    </section>
  );
}

function StatMini({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof Users;
  value: string;
  label: string;
  color?: "green" | "yellow" | "red";
}) {
  const colorClasses = {
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
  };
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 p-2">
      <Icon
        className={cn("h-4 w-4", color ? colorClasses[color] : "text-primary")}
      />
      <span className="font-bold text-sm">{value}</span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

function ChildProgressCard({
  name,
  team,
  performance,
  reviewStatus,
  strengths,
  attendance,
  goals,
}: {
  name: string;
  team: string;
  performance: number;
  reviewStatus: "complete" | "due_soon" | "overdue";
  strengths: string[];
  attendance: { training: number; matches: number };
  goals: string[];
}) {
  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{name}</div>
            <div className="flex gap-1.5">
              <Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
                {team}
              </Badge>
              <ReviewStatusBadge status={reviewStatus} />
            </div>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-2 gap-3 p-3">
        {/* Performance */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Performance
          </div>
          <div className="mt-1 flex items-end gap-1">
            <span className="font-bold text-xl">{performance}%</span>
            <span className="mb-0.5 text-green-600 text-xs">+5%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${performance}%` }}
            />
          </div>
        </div>

        {/* Attendance */}
        <div className="rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            Attendance
          </div>
          <div className="mt-1 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Training</span>
              <span
                className={cn(
                  "font-medium",
                  attendance.training >= 90
                    ? "text-green-600"
                    : "text-yellow-600"
                )}
              >
                {attendance.training}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Matches</span>
              <span
                className={cn(
                  "font-medium",
                  attendance.matches >= 90
                    ? "text-green-600"
                    : "text-yellow-600"
                )}
              >
                {attendance.matches}%
              </span>
            </div>
          </div>
        </div>

        {/* Strengths */}
        <div className="col-span-2 rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Star className="h-3 w-3" />
            Top Strengths
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {strengths.map((s) => (
              <Badge
                className="px-1.5 py-0 text-[10px]"
                key={s}
                variant="outline"
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div className="col-span-2 rounded-lg bg-muted/50 p-2">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Target className="h-3 w-3" />
            Development Goals
          </div>
          <div className="mt-1 space-y-1">
            {goals.map((g) => (
              <div className="flex items-center gap-1.5 text-xs" key={g}>
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {g}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentParentView() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 font-medium">Your Children</div>
      <div className="flex-1 p-3">
        <div className="space-y-2">
          <div className="rounded border p-2 text-sm">
            <div>Cian Murphy</div>
            <div className="text-muted-foreground text-xs">U12 Red</div>
          </div>
          <div className="rounded border p-2 text-sm">
            <div>Aoife Murphy</div>
            <div className="text-muted-foreground text-xs">U14 Blue</div>
          </div>
        </div>
        <div className="mt-4 text-red-500 text-xs">
          No progress indicators
          <br />
          No quick stats
          <br />
          Limited information at a glance
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 10: TOUCH-OPTIMIZED FORMS
// ============================================

function TouchOptimizedFormsMockup() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">10. Touch-Optimized Forms</h2>
        <p className="mt-1 text-muted-foreground">
          Forms with 44px+ inputs, clear labels, and thumb-friendly layouts.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PhoneMockup title="Current (Desktop-sized)">
          <CurrentFormView />
        </PhoneMockup>
        <PhoneMockup highlighted title="Proposed (Touch-optimized)">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-3 font-semibold">Edit Player</div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* Touch-optimized inputs */}
              <div className="space-y-1.5">
                <label className="font-medium text-sm">First Name</label>
                <div className="flex h-12 items-center rounded-lg border bg-background px-3">
                  <span className="text-sm">Cian</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Last Name</label>
                <div className="flex h-12 items-center rounded-lg border bg-background px-3">
                  <span className="text-sm">Murphy</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Age Group</label>
                <div className="flex h-12 items-center justify-between rounded-lg border bg-background px-3">
                  <span className="text-sm">U12</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Team Assignment</label>
                <div className="space-y-2">
                  {["U12 Red (Core)", "U12 Development"].map((team, i) => (
                    <div
                      className={cn(
                        "flex h-12 items-center justify-between rounded-lg border px-3",
                        i === 0 && "border-primary bg-primary/5"
                      )}
                      key={team}
                    >
                      <span className="text-sm">{team}</span>
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border-2",
                          i === 0 && "border-primary bg-primary text-white"
                        )}
                      >
                        {i === 0 && <Check className="h-4 w-4" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-sm">Coach Notes</label>
                <div className="min-h-[80px] rounded-lg border bg-background p-3 text-muted-foreground text-sm">
                  Great attitude, works hard in training...
                </div>
              </div>
            </div>

            {/* Sticky save */}
            <div className="border-t bg-background p-3">
              <Button className="h-12 w-full text-base">Save Changes</Button>
            </div>
          </div>
        </PhoneMockup>
      </div>

      <PreferenceVoting
        mockupId="touch-forms"
        mockupName="Touch-Optimized Forms"
      />
    </section>
  );
}

function CurrentFormView() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2 font-medium text-sm">Edit Player</div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <div>
          <label className="text-xs">First Name</label>
          <div className="mt-1 h-8 rounded border px-2 text-sm">Cian</div>
        </div>
        <div>
          <label className="text-xs">Last Name</label>
          <div className="mt-1 h-8 rounded border px-2 text-sm">Murphy</div>
        </div>
        <div>
          <label className="text-xs">Age Group</label>
          <div className="mt-1 h-8 rounded border px-2 text-xs">U12</div>
        </div>
        <div className="text-red-500 text-xs">
          32px inputs (below 44px)
          <br />
          Small labels
          <br />
          Hard to tap accurately
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 11: PULL-TO-REFRESH & GESTURES
// ============================================

function GesturesMockup() {
  const [refreshing, setRefreshing] = useState(false);

  const simulateRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          11. Pull-to-Refresh & Gestures
        </h2>
        <p className="mt-1 text-muted-foreground">
          Native-feeling interactions: pull to refresh, swipe actions, haptic
          feedback.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PhoneMockup title="Pull-to-Refresh Demo">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-3 font-semibold">Players</div>

            {/* Pull indicator */}
            <div
              className={cn(
                "flex items-center justify-center overflow-hidden transition-all duration-300",
                refreshing ? "h-16" : "h-0"
              )}
            >
              <div className="flex items-center gap-2 text-primary">
                <RefreshCw
                  className={cn("h-5 w-5", refreshing && "animate-spin")}
                />
                <span className="text-sm">
                  {refreshing ? "Refreshing..." : "Pull to refresh"}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {samplePlayers.slice(0, 3).map((p) => (
                <div
                  className="flex items-center gap-3 rounded-lg border p-3"
                  key={p.id}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{p.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {p.team}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-3">
              <Button
                className="h-11 w-full"
                onClick={simulateRefresh}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Simulate Pull-to-Refresh
              </Button>
            </div>
          </div>
        </PhoneMockup>

        <PhoneMockup highlighted title="Swipe Actions Demo">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-3 font-semibold">
              Swipe Gestures
            </div>

            <div className="flex-1 space-y-3 p-3">
              {/* Swipe left demo */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 font-medium text-sm">
                  <ArrowLeft className="h-4 w-4" />
                  Swipe Left: Quick Actions
                </div>
                <div className="relative overflow-hidden rounded-lg">
                  <div className="absolute inset-y-0 right-0 flex">
                    <div className="flex w-12 items-center justify-center bg-blue-500 text-white">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div className="flex w-12 items-center justify-center bg-amber-500 text-white">
                      <Edit className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="-translate-x-24 rounded border bg-card p-3 transition-transform">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>CM</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">Cian Murphy</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swipe right demo */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 font-medium text-sm">
                  <ArrowRight className="h-4 w-4" />
                  Swipe Right: Primary Action
                </div>
                <div className="relative overflow-hidden rounded-lg">
                  <div className="absolute inset-y-0 left-0 flex">
                    <div className="flex w-16 items-center justify-center bg-green-500 text-white">
                      <Check className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="translate-x-16 rounded border bg-card p-3 transition-transform">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>SO</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">Sarah O&apos;Brien</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Long press */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 font-medium text-sm">
                  <MoreHorizontal className="h-4 w-4" />
                  Long Press: Context Menu
                </div>
                <div className="rounded border bg-card p-3">
                  <div className="mb-2 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>JR</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">Jack Ryan</span>
                  </div>
                  <div className="rounded-lg border bg-background p-2 shadow-lg">
                    <div className="space-y-1 text-xs">
                      <div className="rounded px-2 py-1.5 hover:bg-accent">
                        View Passport
                      </div>
                      <div className="rounded px-2 py-1.5 hover:bg-accent">
                        Edit Player
                      </div>
                      <div className="rounded px-2 py-1.5 hover:bg-accent">
                        Start Assessment
                      </div>
                      <div className="rounded px-2 py-1.5 text-red-600 hover:bg-red-50">
                        Remove from Team
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PhoneMockup>
      </div>

      <PreferenceVoting
        mockupId="gestures"
        mockupName="Pull-to-Refresh & Gestures"
      />
    </section>
  );
}

// Helper for arrows
function ArrowLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ============================================
// MOCKUP 12: TEAM MANAGEMENT
// ============================================

const sampleTeams = [
  {
    id: "1",
    name: "U12 Red",
    sport: "GAA",
    ageGroup: "U12",
    playerCount: 18,
    needsReview: false,
  },
  {
    id: "2",
    name: "U14 Blue",
    sport: "GAA",
    ageGroup: "U14",
    playerCount: 22,
    needsReview: true,
  },
  {
    id: "3",
    name: "U10 Mixed",
    sport: "Soccer",
    ageGroup: "U10",
    playerCount: 15,
    needsReview: false,
  },
];

function TeamManagementMockup() {
  const [expandedTeam, setExpandedTeam] = useState<string | null>("1");

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">12. Team Management</h2>
        <p className="mt-1 text-muted-foreground">
          Expandable team cards with quick roster view and actions.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <PhoneMockup title="Current (Dense table)">
          <div className="flex h-full flex-col">
            <div className="border-b px-3 py-2 font-medium">Teams</div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2">Sport</th>
                    <th className="p-2">Age</th>
                    <th className="p-2">Players</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleTeams.map((t) => (
                    <tr className="border-b" key={t.id}>
                      <td className="p-2">{t.name}</td>
                      <td className="p-2 text-center">{t.sport}</td>
                      <td className="p-2 text-center">{t.ageGroup}</td>
                      <td className="p-2 text-center">{t.playerCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 text-center text-red-500 text-xs">
                Hard to see roster
                <br />
                No quick actions
              </div>
            </div>
          </div>
        </PhoneMockup>

        <PhoneMockup highlighted title="Proposed (Expandable cards)">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-semibold">Teams</span>
              <Button className="h-9 w-9" size="icon" variant="ghost">
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* Team cards */}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {sampleTeams.map((team) => (
                <div
                  className="overflow-hidden rounded-lg border"
                  key={team.id}
                >
                  {/* Team header - tappable */}
                  <button
                    className="flex w-full items-center justify-between p-3 text-left hover:bg-accent"
                    onClick={() =>
                      setExpandedTeam(expandedTeam === team.id ? null : team.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{team.name}</span>
                          {team.needsReview && (
                            <span className="rounded bg-yellow-100 px-1.5 py-0.5 font-medium text-[9px] text-yellow-700">
                              Needs Setup
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 text-muted-foreground text-xs">
                          <Badge
                            className="px-1 py-0 text-[9px]"
                            variant="secondary"
                          >
                            {team.sport}
                          </Badge>
                          <Badge
                            className="px-1 py-0 text-[9px]"
                            variant="outline"
                          >
                            {team.ageGroup}
                          </Badge>
                          <span>{team.playerCount} players</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform",
                        expandedTeam === team.id && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Expanded content */}
                  {expandedTeam === team.id && (
                    <div className="border-t bg-muted/30 p-3">
                      {/* Quick actions */}
                      <div className="mb-3 flex gap-2">
                        <Button
                          className="h-9 flex-1"
                          size="sm"
                          variant="outline"
                        >
                          <Users className="mr-1.5 h-3.5 w-3.5" />
                          Roster
                        </Button>
                        <Button
                          className="h-9 flex-1"
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          className="h-9 flex-1"
                          size="sm"
                          variant="outline"
                        >
                          <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                          Stats
                        </Button>
                      </div>

                      {/* Mini roster preview */}
                      <div className="text-muted-foreground text-xs">
                        Recent players:
                      </div>
                      <div className="-space-x-2 mt-1.5 flex">
                        {["CM", "SO", "JR", "EW", "+14"].map((initials, i) => (
                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full border-2 border-background font-medium text-[10px]",
                              i === 4
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                            )}
                            key={initials}
                          >
                            {initials}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <MiniBottomNav activeTab="home" />
          </div>
        </PhoneMockup>
      </div>

      <PreferenceVoting
        mockupId="team-management"
        mockupName="Team Management Cards"
      />
    </section>
  );
}
