"use client";

import {
  AlertCircle,
  ArrowLeftRight,
  ArrowUpDown,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Columns,
  Edit,
  Eye,
  Filter,
  Home,
  Keyboard,
  LogOut,
  Menu,
  Mic,
  Monitor,
  MoreHorizontal,
  Mouse,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Smartphone,
  Star,
  SwitchCamera,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserCircle,
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

        {/* Divider - Desktop Experience */}
        <div className="border-t pt-8">
          <div className="flex items-center gap-3">
            <Monitor className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold text-2xl">Desktop Experience</h2>
              <p className="text-muted-foreground">
                See how these patterns adapt for keyboard and mouse users
              </p>
            </div>
          </div>
        </div>

        {/* Mockup 13: Mobile vs Desktop Comparison */}
        <MobileVsDesktopSection />

        {/* Mockup 14: Desktop Data Table */}
        <DesktopDataTableMockup />

        {/* Mockup 15: Command Palette (Cmd+K) */}
        <CommandPaletteMockup />

        {/* Mockup 16: Information Density Options */}
        <InformationDensityMockup />

        {/* Mockup 17: Desktop Sidebar Navigation */}
        <DesktopSidebarMockup />

        {/* Divider - Organization & Role Switching */}
        <div className="border-t pt-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold text-2xl">
                Organization & Role Switching
              </h2>
              <p className="text-muted-foreground">
                Multi-org, multi-role UX patterns for complex user contexts
              </p>
            </div>
          </div>
        </div>

        {/* Mockup 18: Current Org/Role Switcher Analysis */}
        <CurrentSwitcherAnalysisMockup />

        {/* Mockup 19: Org/Role Switcher Options */}
        <OrgRoleSwitcherOptionsMockup />

        {/* Mockup 20: User Account Menu Options */}
        <UserAccountMenuMockup />

        {/* Mockup 21: Combined Header Patterns */}
        <CombinedHeaderPatternsMockup />

        {/* Mockup 22: Mobile Org/Role Switching */}
        <MobileOrgRoleSwitchingMockup />
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

// ============================================
// DESKTOP MOCKUP WRAPPER
// ============================================

function DesktopMockup({
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
          "overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-100 shadow-xl",
          highlighted && "ring-2 ring-green-500 ring-offset-2"
        )}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b bg-gray-200 px-3 py-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 rounded bg-white px-3 py-1 text-center text-muted-foreground text-xs">
            playerarc.com
          </div>
        </div>
        {/* Content */}
        <div className="h-[400px] overflow-hidden bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MOCKUP 13: MOBILE VS DESKTOP COMPARISON
// ============================================

function MobileVsDesktopSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          13. Responsive Design: Mobile vs Desktop
        </h2>
        <p className="mt-1 text-muted-foreground">
          Same data, optimized for each platform. Cards on mobile, tables on
          desktop.
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Source: Responsive Design Best Practices
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-3">
        <Smartphone className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm">Cards + Swipe</span>
        <span className="mx-2 text-muted-foreground">→</span>
        <Monitor className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm">Tables + Hover</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <PhoneMockup title="Mobile: Card View">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-3 font-semibold">Players</div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {samplePlayers.slice(0, 3).map((p) => (
                <div className="rounded-lg border bg-card p-3" key={p.id}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{p.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="flex gap-1.5">
                        <Badge
                          className="px-1.5 py-0 text-[10px]"
                          variant="secondary"
                        >
                          {p.ageGroup}
                        </Badge>
                        <Badge
                          className="px-1.5 py-0 text-[10px]"
                          variant="outline"
                        >
                          {p.team}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 text-center text-green-600 text-xs">
              Touch-optimized cards with swipe actions
            </div>
          </div>
        </PhoneMockup>

        <DesktopMockup highlighted title="Desktop: Data Table">
          <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-sm">
                    Search players...
                  </span>
                  <kbd className="ml-8 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘K
                  </kbd>
                </div>
                <Button size="sm" variant="outline">
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  Filter
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Columns className="mr-1.5 h-3.5 w-3.5" />
                  Columns
                </Button>
                <Button size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Player
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="w-8 p-2">
                      <input className="h-4 w-4" type="checkbox" />
                    </th>
                    <th className="p-2 text-left font-medium">
                      <div className="flex items-center gap-1">
                        Name
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-2 text-left font-medium">Age Group</th>
                    <th className="p-2 text-left font-medium">Team</th>
                    <th className="p-2 text-left font-medium">Last Review</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="w-16 p-2" />
                  </tr>
                </thead>
                <tbody>
                  {samplePlayers.map((p, i) => (
                    <tr
                      className={cn(
                        "group border-b transition-colors hover:bg-accent",
                        i === 1 && "bg-accent"
                      )}
                      key={p.id}
                    >
                      <td className="p-2">
                        <input className="h-4 w-4" type="checkbox" />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs">
                              {p.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-2">{p.ageGroup}</td>
                      <td className="p-2">{p.team}</td>
                      <td className="p-2 text-muted-foreground">
                        {p.lastReview}
                      </td>
                      <td className="p-2">
                        <ReviewStatusBadge status={p.reviewStatus} />
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            className="h-7 w-7"
                            size="icon"
                            variant="ghost"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            className="h-7 w-7"
                            size="icon"
                            variant="ghost"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t px-4 py-2 text-muted-foreground text-xs">
              <span>4 of 24 players selected</span>
              <div className="flex items-center gap-2">
                <span>Rows per page: 10</span>
                <span>1-10 of 24</span>
              </div>
            </div>
          </div>
        </DesktopMockup>
      </div>

      <PreferenceVoting
        mockupId="mobile-vs-desktop"
        mockupName="Responsive Data Display (Cards vs Tables)"
      />
    </section>
  );
}

// ============================================
// MOCKUP 14: DESKTOP DATA TABLE FEATURES
// ============================================

function DesktopDataTableMockup() {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">14. Desktop Table Features</h2>
        <p className="mt-1 text-muted-foreground">
          Power user features: hover actions, column visibility, inline editing,
          keyboard navigation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mouse className="h-5 w-5" />
            Desktop Interaction Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Hover Actions */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-medium">
                <Eye className="h-4 w-4 text-primary" />
                Hover to Reveal Actions
              </h4>
              <div className="rounded-lg border">
                {samplePlayers.slice(0, 2).map((p) => (
                  <div
                    className={cn(
                      "flex items-center justify-between border-b p-3 transition-colors last:border-0",
                      hoveredRow === p.id && "bg-accent"
                    )}
                    key={p.id}
                    onMouseEnter={() => setHoveredRow(p.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {p.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.name}</span>
                    </div>
                    <div
                      className={cn(
                        "flex gap-1 transition-opacity",
                        hoveredRow === p.id ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <Button className="h-7 w-7" size="icon" variant="ghost">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button className="h-7 w-7" size="icon" variant="ghost">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button className="h-7 w-7" size="icon" variant="ghost">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Hover over rows to see action buttons
              </p>
            </div>

            {/* Column Visibility */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-medium">
                <Columns className="h-4 w-4 text-primary" />
                Column Visibility
              </h4>
              <div className="relative">
                <Button
                  className="w-full justify-between"
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  variant="outline"
                >
                  <span>Toggle Columns</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {showColumnMenu && (
                  <div className="absolute top-full z-10 mt-1 w-full rounded-lg border bg-background p-2 shadow-lg">
                    {["Name", "Age Group", "Team", "Status", "Last Review"].map(
                      (col, i) => (
                        <label
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                          key={col}
                        >
                          <input
                            className="h-4 w-4"
                            defaultChecked={i < 4}
                            type="checkbox"
                          />
                          {col}
                        </label>
                      )
                    )}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Show/hide columns based on preference
              </p>
            </div>

            {/* Keyboard Navigation */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-medium">
                <Keyboard className="h-4 w-4 text-primary" />
                Keyboard Shortcuts
              </h4>
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Quick search</span>
                  <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                    ⌘K
                  </kbd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>New player</span>
                  <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                    ⌘N
                  </kbd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Navigate rows</span>
                  <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                    ↑↓
                  </kbd>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Select row</span>
                  <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                    Space
                  </kbd>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Power users love keyboard shortcuts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <PreferenceVoting
        mockupId="desktop-table-features"
        mockupName="Desktop Table Features"
      />
    </section>
  );
}

// ============================================
// MOCKUP 15: COMMAND PALETTE (CMD+K)
// ============================================

function CommandPaletteMockup() {
  const [open, setOpen] = useState(false);

  const commands = [
    { icon: Users, label: "Go to Players", shortcut: "P" },
    { icon: Plus, label: "Add New Player", shortcut: "N" },
    { icon: BarChart3, label: "View Analytics", shortcut: "A" },
    { icon: Settings, label: "Open Settings", shortcut: "," },
    { icon: User, label: "Search: Cian Murphy", type: "player" },
    { icon: Users, label: "Search: U12 Red", type: "team" },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">15. Command Palette (⌘K)</h2>
        <p className="mt-1 text-muted-foreground">
          Quick access to everything. Type to search, navigate with arrows,
          press Enter to select.
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Source: Linear, Notion, VS Code
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Try It</CardTitle>
            <CardDescription>
              Click the button to open the command palette
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full justify-between"
              onClick={() => setOpen(!open)}
              variant="outline"
            >
              <span className="text-muted-foreground">Search commands...</span>
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                ⌘K
              </kbd>
            </Button>
          </CardContent>
        </Card>

        <div className="relative">
          {/* Command Palette Demo */}
          <div
            className={cn(
              "rounded-lg border bg-background shadow-2xl transition-all",
              open ? "opacity-100" : "pointer-events-none opacity-50"
            )}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Type a command or search..."
              />
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[300px] overflow-y-auto p-2">
              <div className="mb-2 px-2 font-medium text-muted-foreground text-xs">
                Quick Actions
              </div>
              {commands.slice(0, 4).map((cmd, i) => (
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === 0 ? "bg-accent" : "hover:bg-accent"
                  )}
                  key={cmd.label}
                >
                  <div className="flex items-center gap-3">
                    <cmd.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      ⌘{cmd.shortcut}
                    </kbd>
                  )}
                </button>
              ))}

              <div className="mt-4 mb-2 px-2 font-medium text-muted-foreground text-xs">
                Recent
              </div>
              {commands.slice(4).map((cmd) => (
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  key={cmd.label}
                >
                  <cmd.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{cmd.label}</span>
                  {cmd.type && (
                    <Badge
                      className="ml-auto px-1.5 py-0 text-[10px]"
                      variant="secondary"
                    >
                      {cmd.type}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 border-t px-4 py-2 text-muted-foreground text-xs">
              <div className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                  esc
                </kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PreferenceVoting
        mockupId="command-palette"
        mockupName="Command Palette (⌘K)"
      />
    </section>
  );
}

// ============================================
// MOCKUP 16: INFORMATION DENSITY OPTIONS
// ============================================

function InformationDensityMockup() {
  const [density, setDensity] = useState<
    "compact" | "comfortable" | "spacious"
  >("comfortable");

  const densityConfig = {
    compact: { padding: "py-1.5 px-2", text: "text-xs", avatar: "h-6 w-6" },
    comfortable: { padding: "py-2.5 px-3", text: "text-sm", avatar: "h-8 w-8" },
    spacious: { padding: "py-4 px-4", text: "text-base", avatar: "h-10 w-10" },
  };

  const config = densityConfig[density];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">16. Information Density</h2>
        <p className="mt-1 text-muted-foreground">
          Let users choose how much information they see at once. Power users
          often prefer compact views.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {(["compact", "comfortable", "spacious"] as const).map((d) => (
          <Button
            key={d}
            onClick={() => setDensity(d)}
            variant={density === d ? "default" : "outline"}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Preview: {density}</CardTitle>
            <CardDescription>
              {density === "compact" &&
                "Maximum data, minimum space - for power users"}
              {density === "comfortable" &&
                "Balanced view - good for most users"}
              {density === "spacious" &&
                "Easy scanning - good for occasional use"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <div className="border-b bg-muted px-3 py-2 font-medium text-sm">
                Players
              </div>
              {samplePlayers.map((p, i) => (
                <div
                  className={cn(
                    "flex items-center justify-between border-b transition-all last:border-0",
                    config.padding
                  )}
                  key={p.id}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className={config.avatar}>
                      <AvatarFallback className={config.text}>
                        {p.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className={cn("font-medium", config.text)}>
                        {p.name}
                      </span>
                      {density !== "compact" && (
                        <div className="text-muted-foreground text-xs">
                          {p.team}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {density === "compact" && (
                      <span className="text-muted-foreground text-xs">
                        {p.ageGroup}
                      </span>
                    )}
                    <ReviewStatusBadge status={p.reviewStatus} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Why This Matters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Power Users</div>
                <div className="text-muted-foreground text-xs">
                  Admins managing 100+ players prefer compact view to see more
                  at once
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
                <User className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Casual Users</div>
                <div className="text-muted-foreground text-xs">
                  Parents checking once a week prefer spacious, easy-to-scan
                  views
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Settings className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-sm">User Choice</div>
                <div className="text-muted-foreground text-xs">
                  Saving preference per user respects individual workflows
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MultiOptionVoting
        comparisonId="information-density"
        comparisonName="Information Density Preference"
        options={[
          {
            id: "compact",
            label: "Compact",
            description: "See more rows, less detail per row",
          },
          {
            id: "comfortable",
            label: "Comfortable (Recommended)",
            description: "Balanced - good for most users",
          },
          {
            id: "spacious",
            label: "Spacious",
            description: "Larger text and spacing, easier to scan",
          },
        ]}
      />
    </section>
  );
}

// ============================================
// MOCKUP 17: DESKTOP SIDEBAR NAVIGATION
// ============================================

function DesktopSidebarMockup() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("players");

  const navGroups = [
    {
      label: "Main",
      items: [
        { id: "overview", icon: Home, label: "Overview" },
        { id: "players", icon: Users, label: "Players", badge: "24" },
        { id: "teams", icon: Shield, label: "Teams" },
      ],
    },
    {
      label: "Manage",
      items: [
        { id: "coaches", icon: User, label: "Coaches" },
        { id: "analytics", icon: BarChart3, label: "Analytics" },
        { id: "settings", icon: Settings, label: "Settings" },
      ],
    },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          17. Desktop Sidebar Navigation
        </h2>
        <p className="mt-1 text-muted-foreground">
          Collapsible sidebar for desktop. Expands on hover or click. Persists
          user preference.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          onClick={() => setCollapsed(false)}
          variant={collapsed ? "outline" : "default"}
        >
          Expanded
        </Button>
        <Button
          onClick={() => setCollapsed(true)}
          variant={collapsed ? "default" : "outline"}
        >
          Collapsed
        </Button>
      </div>

      <DesktopMockup highlighted title="Desktop Sidebar">
        <div className="flex h-full">
          {/* Sidebar */}
          <div
            className={cn(
              "flex h-full flex-col border-r bg-muted/30 transition-all duration-200",
              collapsed ? "w-16" : "w-56"
            )}
          >
            {/* Logo */}
            <div className="flex h-14 items-center gap-3 border-b px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                P
              </div>
              {!collapsed && <span className="font-semibold">PlayerARC</span>}
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto p-2">
              {navGroups.map((group) => (
                <div className="mb-4" key={group.label}>
                  {!collapsed && (
                    <div className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          activeItem === item.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent",
                          collapsed && "justify-center"
                        )}
                        key={item.id}
                        onClick={() => setActiveItem(item.id)}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">
                              {item.label}
                            </span>
                            {item.badge && (
                              <Badge
                                className="px-1.5 py-0 text-[10px]"
                                variant={
                                  activeItem === item.id
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Collapse toggle */}
            <div className="border-t p-2">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setCollapsed(!collapsed)}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    !collapsed && "rotate-180"
                  )}
                />
                {!collapsed && <span className="text-sm">Collapse</span>}
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4">
            <div className="mb-4">
              <h1 className="font-semibold text-lg">
                {navGroups
                  .flatMap((g) => g.items)
                  .find((i) => i.id === activeItem)?.label || "Overview"}
              </h1>
            </div>
            <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
              Content area
            </div>
          </div>
        </div>
      </DesktopMockup>

      <PreferenceVoting
        mockupId="desktop-sidebar"
        mockupName="Desktop Sidebar Navigation"
      />
    </section>
  );
}

// ============================================
// MOCKUP 18: CURRENT SWITCHER ANALYSIS
// ============================================

const sampleOrgs = [
  {
    id: "1",
    name: "Grange GAA",
    logo: null,
    roles: ["admin", "coach"] as const,
    activeRole: "admin" as const,
  },
  {
    id: "2",
    name: "St. Mary's FC",
    logo: null,
    roles: ["coach"] as const,
    activeRole: "coach" as const,
  },
  {
    id: "3",
    name: "Dublin Athletics",
    logo: null,
    roles: ["parent"] as const,
    activeRole: "parent" as const,
  },
];

function CurrentSwitcherAnalysisMockup() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          18. Current Org/Role Switcher
        </h2>
        <p className="mt-1 text-muted-foreground">
          Analysis of the existing implementation. Users can belong to multiple
          orgs with multiple roles per org.
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Source: Current PlayerARC implementation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current User Context</CardTitle>
          <CardDescription>
            Example: User "Sean Murphy" belongs to 3 organizations with
            different roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sampleOrgs.map((org) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={org.id}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{org.name}</div>
                    <div className="flex gap-1">
                      {org.roles.map((role) => (
                        <Badge
                          className={cn(
                            "text-[10px]",
                            role === org.activeRole &&
                              "bg-green-100 text-green-700"
                          )}
                          key={role}
                          variant={
                            role === org.activeRole ? "default" : "outline"
                          }
                        >
                          {role === "admin" && (
                            <Shield className="mr-1 h-3 w-3" />
                          )}
                          {role === "coach" && (
                            <Users className="mr-1 h-3 w-3" />
                          )}
                          {role === "parent" && (
                            <UserCircle className="mr-1 h-3 w-3" />
                          )}
                          {role}
                          {role === org.activeRole && " (active)"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Current Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              <span>Shows org logo and name clearly</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              <span>Groups roles under each org</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              <span>Shows pending role requests</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-500" />
              <span>Allows role requesting from dropdown</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Opportunities to Improve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-orange-500" />
              <span>220px fixed width may truncate long names</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-orange-500" />
              <span>No keyboard shortcut to open (like Cmd+Shift+O)</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-orange-500" />
              <span>Mobile: Popover may be hard to use</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-orange-500" />
              <span>User menu separate from org switcher</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ============================================
// MOCKUP 19: ORG/ROLE SWITCHER OPTIONS
// ============================================

function OrgRoleSwitcherOptionsMockup() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [expandedOrg, setExpandedOrg] = useState<string | null>("1");

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          19. Org/Role Switcher Design Options
        </h2>
        <p className="mt-1 text-muted-foreground">
          Four innovative approaches to org/role switching. Vote for your
          favorite!
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Source: Slack, Notion, Linear, Figma patterns
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Option A: Current Enhanced */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            selectedOption === "enhanced" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedOption("enhanced")}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Option A: Enhanced Popover</span>
              <Badge variant="outline">Current + Improvements</Badge>
            </CardTitle>
            <CardDescription>
              Keep familiar pattern, add search and keyboard shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-background shadow-lg">
              {/* Search */}
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-muted-foreground text-sm">
                  Search orgs & roles...
                </span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘⇧O
                </kbd>
              </div>
              {/* Org list */}
              <div className="max-h-[200px] overflow-y-auto p-1">
                {sampleOrgs.map((org) => (
                  <div key={org.id}>
                    <button
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedOrg(expandedOrg === org.id ? null : org.id);
                      }}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4" />
                        <span>{org.name}</span>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expandedOrg === org.id && "rotate-90"
                        )}
                      />
                    </button>
                    {expandedOrg === org.id && (
                      <div className="ml-6 space-y-1 py-1">
                        {org.roles.map((role) => (
                          <button
                            className={cn(
                              "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm",
                              role === org.activeRole
                                ? "bg-green-100 text-green-700"
                                : "hover:bg-accent"
                            )}
                            key={role}
                          >
                            {role === "admin" && <Shield className="h-3 w-3" />}
                            {role === "coach" && <Users className="h-3 w-3" />}
                            {role === "parent" && (
                              <UserCircle className="h-3 w-3" />
                            )}
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                            {role === org.activeRole && (
                              <Check className="ml-auto h-3 w-3" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 text-center text-muted-foreground text-xs">
              Familiar pattern with search + keyboard shortcuts
            </div>
          </CardContent>
        </Card>

        {/* Option B: Two-Panel Split */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            selectedOption === "split" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedOption("split")}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Option B: Two-Panel Split</span>
              <Badge variant="outline">Linear Style</Badge>
            </CardTitle>
            <CardDescription>
              Orgs on left, roles on right. Clear visual hierarchy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex overflow-hidden rounded-lg border bg-background shadow-lg">
              {/* Orgs panel */}
              <div className="w-1/2 border-r bg-muted/30">
                <div className="border-b p-2 font-medium text-muted-foreground text-xs uppercase">
                  Organizations
                </div>
                <div className="p-1">
                  {sampleOrgs.map((org, i) => (
                    <button
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm",
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                      key={org.id}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">{org.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Roles panel */}
              <div className="w-1/2">
                <div className="border-b p-2 font-medium text-muted-foreground text-xs uppercase">
                  Your Roles
                </div>
                <div className="p-1">
                  {sampleOrgs[0].roles.map((role) => (
                    <button
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm",
                        role === sampleOrgs[0].activeRole
                          ? "bg-green-100 text-green-700"
                          : "hover:bg-accent"
                      )}
                      key={role}
                    >
                      {role === "admin" && <Shield className="h-4 w-4" />}
                      {role === "coach" && <Users className="h-4 w-4" />}
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                      {role === sampleOrgs[0].activeRole && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-muted-foreground text-xs">
              Two-panel layout for clear org → role selection
            </div>
          </CardContent>
        </Card>

        {/* Option C: Sidebar Dock (Slack style) */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            selectedOption === "dock" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedOption("dock")}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Option C: Sidebar Dock</span>
              <Badge variant="outline">Slack Style</Badge>
            </CardTitle>
            <CardDescription>
              Persistent org icons on left edge, always visible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex overflow-hidden rounded-lg border bg-background shadow-lg">
              {/* Org dock */}
              <div className="flex w-14 flex-col items-center gap-2 border-r bg-muted/50 py-3">
                {sampleOrgs.map((org, i) => (
                  <div className="relative" key={org.id}>
                    <button
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                        i === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                      )}
                    >
                      <span className="font-semibold text-sm">
                        {org.name.charAt(0)}
                      </span>
                    </button>
                    {i === 0 && (
                      <div className="-left-1 -translate-y-1/2 absolute top-1/2 h-5 w-1 rounded-full bg-primary" />
                    )}
                  </div>
                ))}
                <div className="my-1 h-px w-8 bg-border" />
                <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-background hover:bg-accent">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {/* Content preview */}
              <div className="flex-1 p-3">
                <div className="mb-2 font-medium text-sm">Grange GAA</div>
                <div className="flex gap-2">
                  <Badge className="bg-purple-100 text-purple-700">
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </Badge>
                  <Badge variant="outline">
                    <Users className="mr-1 h-3 w-3" />
                    Coach
                  </Badge>
                </div>
                <div className="mt-3 text-muted-foreground text-xs">
                  Click badge to switch role
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-muted-foreground text-xs">
              Always-visible org dock like Slack workspaces
            </div>
          </CardContent>
        </Card>

        {/* Option D: Context Strip */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            selectedOption === "strip" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedOption("strip")}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Option D: Context Strip</span>
              <Badge variant="outline">All-in-One</Badge>
            </CardTitle>
            <CardDescription>
              Unified header strip showing org + role + user together
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-background shadow-lg">
              <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                {/* Org selector */}
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium text-sm">Grange GAA</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {/* Role selector */}
                <button className="flex items-center gap-2 rounded-lg bg-purple-100 px-2 py-1 text-purple-700 hover:bg-purple-200">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium text-sm">Admin</span>
                  <ArrowLeftRight className="h-3 w-3" />
                </button>
                {/* User */}
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">SM</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="p-3 text-center text-muted-foreground text-sm">
                All context controls in one unified strip
              </div>
            </div>
            <div className="mt-3 text-center text-muted-foreground text-xs">
              Separate buttons for org, role, and user - clear but takes space
            </div>
          </CardContent>
        </Card>
      </div>

      <MultiOptionVoting
        comparisonId="org-role-switcher-design"
        comparisonName="Org/Role Switcher Design"
        options={[
          {
            id: "enhanced",
            label: "Option A: Enhanced Popover",
            description: "Current pattern with search + keyboard shortcuts",
          },
          {
            id: "split",
            label: "Option B: Two-Panel Split",
            description: "Orgs left, roles right - clear hierarchy",
          },
          {
            id: "dock",
            label: "Option C: Sidebar Dock",
            description: "Slack-style always-visible org icons",
          },
          {
            id: "strip",
            label: "Option D: Context Strip",
            description: "Unified header with separate controls",
          },
        ]}
      />
    </section>
  );
}

// ============================================
// MOCKUP 20: USER ACCOUNT MENU OPTIONS
// ============================================

function UserAccountMenuMockup() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          20. User Account Menu Options
        </h2>
        <p className="mt-1 text-muted-foreground">
          Different approaches to the user profile/settings dropdown
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Source: Figma, Notion, Gmail patterns
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Option A: Simple Avatar Dropdown */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            selectedOption === "simple" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedOption("simple")}
        >
          <CardHeader>
            <CardTitle>Option A: Simple Dropdown</CardTitle>
            <CardDescription>Minimal avatar with clean menu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end">
              <div className="rounded-lg border bg-background shadow-lg">
                <div className="flex items-center gap-3 border-b p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">Sean Murphy</div>
                    <div className="text-muted-foreground text-xs">
                      sean@example.com
                    </div>
                  </div>
                </div>
                <div className="p-1">
                  <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-accent">
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-accent">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-accent">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-red-600 text-sm hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Option B: Rich Profile Card */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            selectedOption === "rich" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedOption("rich")}
        >
          <CardHeader>
            <CardTitle>Option B: Rich Profile Card</CardTitle>
            <CardDescription>
              Shows current context + quick actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end">
              <div className="w-72 rounded-lg border bg-background shadow-lg">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 ring-2 ring-background">
                      <AvatarFallback className="text-lg">SM</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">Sean Murphy</div>
                      <div className="text-muted-foreground text-sm">
                        sean@example.com
                      </div>
                      <div className="mt-1 flex gap-1">
                        <Badge
                          className="px-1.5 py-0 text-[10px]"
                          variant="secondary"
                        >
                          <Building2 className="mr-1 h-3 w-3" />
                          Grange GAA
                        </Badge>
                        <Badge className="bg-purple-100 px-1.5 py-0 text-[10px] text-purple-700">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 p-2">
                  <button className="flex flex-col items-center gap-1 rounded p-2 hover:bg-accent">
                    <User className="h-5 w-5" />
                    <span className="text-xs">Profile</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 rounded p-2 hover:bg-accent">
                    <Settings className="h-5 w-5" />
                    <span className="text-xs">Settings</span>
                  </button>
                  <button className="flex flex-col items-center gap-1 rounded p-2 hover:bg-accent">
                    <SwitchCamera className="h-5 w-5" />
                    <span className="text-xs">Switch</span>
                  </button>
                </div>
                <div className="border-t p-2">
                  <button className="flex w-full items-center justify-center gap-2 rounded py-2 text-red-600 text-sm hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Option C: Combined with Org Switcher */}
        <Card
          className={cn(
            "cursor-pointer transition-all",
            selectedOption === "combined" && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedOption("combined")}
        >
          <CardHeader>
            <CardTitle>Option C: Combined Menu</CardTitle>
            <CardDescription>
              Org switching + user menu in one place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end">
              <div className="w-64 rounded-lg border bg-background shadow-lg">
                <div className="flex items-center gap-2 border-b p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">SM</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Sean Murphy</div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-2 font-medium text-muted-foreground text-xs uppercase">
                  Your Organizations
                </div>
                <div className="max-h-[150px] overflow-y-auto px-1 pb-2">
                  {sampleOrgs.map((org, i) => (
                    <button
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm",
                        i === 0 ? "bg-accent" : "hover:bg-accent"
                      )}
                      key={org.id}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="flex-1 truncate">{org.name}</span>
                      {i === 0 && <Check className="h-4 w-4 text-green-600" />}
                    </button>
                  ))}
                </div>
                <div className="border-t p-2">
                  <button className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-red-600 text-sm hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MultiOptionVoting
        comparisonId="user-account-menu"
        comparisonName="User Account Menu"
        options={[
          {
            id: "simple",
            label: "Option A: Simple Dropdown",
            description: "Clean, minimal menu",
          },
          {
            id: "rich",
            label: "Option B: Rich Profile Card",
            description: "Shows context + quick actions",
          },
          {
            id: "combined",
            label: "Option C: Combined Menu",
            description: "Org switching + user in one place",
          },
        ]}
      />
    </section>
  );
}

// ============================================
// MOCKUP 21: COMBINED HEADER PATTERNS
// ============================================

function CombinedHeaderPatternsMockup() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">21. Combined Header Patterns</h2>
        <p className="mt-1 text-muted-foreground">
          How org switcher, role switcher, and user menu work together in the
          header
        </p>
      </div>

      <div className="space-y-6">
        {/* Pattern A: Current Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pattern A: Current Layout
              <Badge variant="outline">Existing</Badge>
            </CardTitle>
            <CardDescription>
              Org/Role combined dropdown + separate user avatar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                    P
                  </div>
                  <span className="font-semibold">PlayerARC</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Combined Org/Role */}
                  <Button className="gap-2" variant="outline">
                    <Building2 className="h-4 w-4" />
                    <span>Grange GAA</span>
                    <span className="text-muted-foreground">•</span>
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span>Admin</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {/* User */}
                  <Button size="icon" variant="ghost">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>SM</AvatarFallback>
                    </Avatar>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pattern B: Separate Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pattern B: Separate Controls
              <Badge className="bg-green-500">Recommended</Badge>
            </CardTitle>
            <CardDescription>
              Separate buttons for org, role, and user - clearer intent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                    P
                  </div>
                  <span className="font-semibold">PlayerARC</span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Org Selector */}
                  <Button className="gap-2" size="sm" variant="outline">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Grange GAA</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  {/* Role Selector */}
                  <Button
                    className="gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200"
                    size="sm"
                    variant="ghost"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  {/* Notifications */}
                  <Button className="relative" size="icon" variant="ghost">
                    <Bell className="h-4 w-4" />
                    <span className="-top-1 -right-1 absolute flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-medium text-[10px] text-white">
                      3
                    </span>
                  </Button>
                  {/* User */}
                  <Button size="icon" variant="ghost">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>SM</AvatarFallback>
                    </Avatar>
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">
                  ⌘⇧O
                </kbd>
                Switch org
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-muted px-1 py-0.5 font-mono">
                  ⌘⇧R
                </kbd>
                Switch role
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pattern C: Minimal with Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pattern C: Minimal Header + Sidebar
              <Badge variant="outline">Alternative</Badge>
            </CardTitle>
            <CardDescription>
              Move org to sidebar, keep role and user in header
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex overflow-hidden rounded-lg border">
              {/* Sidebar with org */}
              <div className="flex w-14 flex-col items-center border-r bg-muted/30 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
                  G
                </div>
                <div className="my-2 h-px w-8 bg-border" />
                <button className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent">
                  <span className="text-xs">S</span>
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent">
                  <span className="text-xs">D</span>
                </button>
              </div>
              {/* Header */}
              <div className="flex-1">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="font-semibold">Grange GAA</span>
                  <div className="flex items-center gap-2">
                    <Button
                      className="gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200"
                      size="sm"
                      variant="ghost"
                    >
                      <Shield className="h-4 w-4" />
                      Admin
                    </Button>
                    <Button size="icon" variant="ghost">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>SM</AvatarFallback>
                      </Avatar>
                    </Button>
                  </div>
                </div>
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Content area
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PreferenceVoting
        mockupId="combined-header-patterns"
        mockupName="Header Layout Pattern"
      />
    </section>
  );
}

// ============================================
// MOCKUP 22: MOBILE ORG/ROLE SWITCHING
// ============================================

function MobileOrgRoleSwitchingMockup() {
  const [activeTab, setActiveTab] = useState<"orgs" | "roles">("orgs");

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-semibold text-2xl">
          22. Mobile Org/Role Switching
        </h2>
        <p className="mt-1 text-muted-foreground">
          Touch-optimized patterns for switching context on mobile devices
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Option A: Full-Screen Sheet */}
        <PhoneMockup highlighted title="Option A: Full-Screen Sheet">
          <div className="flex h-full flex-col">
            {/* Sheet header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold">Switch Context</h2>
              <button className="rounded-full p-1 hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                className={cn(
                  "flex-1 py-3 font-medium text-sm",
                  activeTab === "orgs"
                    ? "border-primary border-b-2 text-primary"
                    : "text-muted-foreground"
                )}
                onClick={() => setActiveTab("orgs")}
              >
                Organizations
              </button>
              <button
                className={cn(
                  "flex-1 py-3 font-medium text-sm",
                  activeTab === "roles"
                    ? "border-primary border-b-2 text-primary"
                    : "text-muted-foreground"
                )}
                onClick={() => setActiveTab("roles")}
              >
                Roles
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {activeTab === "orgs" ? (
                <div className="space-y-2">
                  {sampleOrgs.map((org, i) => (
                    <button
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                        i === 0
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent"
                      )}
                      key={org.id}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{org.name}</div>
                        <div className="text-muted-foreground text-sm">
                          {org.roles.length} role
                          {org.roles.length > 1 ? "s" : ""}
                        </div>
                      </div>
                      {i === 0 && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {sampleOrgs[0].roles.map((role) => (
                    <button
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                        role === sampleOrgs[0].activeRole
                          ? "border-green-500 bg-green-50"
                          : "hover:bg-accent"
                      )}
                      key={role}
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-lg",
                          role === "admin" && "bg-purple-100",
                          role === "coach" && "bg-green-100",
                          role === "parent" && "bg-blue-100"
                        )}
                      >
                        {role === "admin" && (
                          <Shield className="h-6 w-6 text-purple-600" />
                        )}
                        {role === "coach" && (
                          <Users className="h-6 w-6 text-green-600" />
                        )}
                        {role === "parent" && (
                          <UserCircle className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {role === "admin" && "Full club administration"}
                          {role === "coach" && "Team & player management"}
                          {role === "parent" && "View children's progress"}
                        </div>
                      </div>
                      {role === sampleOrgs[0].activeRole && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PhoneMockup>

        {/* Option B: Quick Switch in Header */}
        <PhoneMockup title="Option B: Compact Header Switch">
          <div className="flex h-full flex-col">
            {/* Compact header with switcher */}
            <div className="border-b bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-bold text-primary-foreground text-xs">
                    G
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm leading-tight">
                      Grange GAA
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-purple-600">
                      <Shield className="h-3 w-3" />
                      Admin
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">SM</AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <h1 className="mb-4 font-semibold text-lg">Dashboard</h1>
              <div className="space-y-3">
                <div className="h-20 rounded-lg bg-muted/50" />
                <div className="h-20 rounded-lg bg-muted/50" />
                <div className="h-20 rounded-lg bg-muted/50" />
              </div>
            </div>

            {/* Bottom nav */}
            <div className="flex items-center justify-around border-t bg-background py-2">
              <button className="flex flex-col items-center gap-1 p-2 text-primary">
                <Home className="h-5 w-5" />
                <span className="text-[10px]">Home</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
                <Users className="h-5 w-5" />
              </button>
              <button className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
                <Plus className="h-5 w-5" />
              </button>
              <button className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
                <Bell className="h-5 w-5" />
              </button>
              <button className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </PhoneMockup>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts (Desktop)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Switch Organization</span>
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                ⌘⇧O
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Switch Role</span>
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                ⌘⇧R
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">User Menu</span>
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                ⌘⇧U
              </kbd>
            </div>
          </div>
        </CardContent>
      </Card>

      <PreferenceVoting
        mockupId="mobile-org-role-switching"
        mockupName="Mobile Context Switching"
      />
    </section>
  );
}
