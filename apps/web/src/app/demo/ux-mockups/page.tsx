"use client";

import { useState } from "react";
import {
  Home,
  Users,
  Plus,
  BarChart3,
  User,
  ChevronRight,
  Star,
  Edit,
  Menu,
  X,
  ChevronDown,
  Shield,
  Settings,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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
          <h1 className="text-3xl font-bold">UX Mockups Preview</h1>
          <p className="text-muted-foreground mt-2">
            Interactive demonstrations of proposed UX improvements based on industry standards
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl p-4 space-y-12">
        {/* Mockup 1: Bottom Navigation */}
        <MockupSection
          title="1. Bottom Navigation"
          description="72% of users prefer bottom navigation. Redbooth saw 65% increase in DAU after switching from hamburger menu."
          source="Nielsen Norman Group"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <PhoneMockup title="Current (Top Nav)">
              <CurrentTopNav />
            </PhoneMockup>
            <PhoneMockup title="Proposed (Bottom Nav)" highlighted>
              <ProposedBottomNav />
            </PhoneMockup>
          </div>
        </MockupSection>

        {/* Mockup 2: Touch Targets */}
        <MockupSection
          title="2. Touch Target Sizes"
          description="Apple HIG mandates 44x44pt minimum. Buttons smaller than this are missed by 25%+ of users."
          source="Apple Human Interface Guidelines"
        >
          <TouchTargetDemo />
        </MockupSection>

        {/* Mockup 3: Mobile Player Cards */}
        <MockupSection
          title="3. Mobile Player Cards with Swipe Actions"
          description="Card-based views on mobile instead of tables. Swipe gestures are faster than finding and tapping buttons."
          source="LogRocket UX Design"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <PhoneMockup title="Current (Table)">
              <CurrentTableView />
            </PhoneMockup>
            <PhoneMockup title="Proposed (Cards + Swipe)" highlighted>
              <ProposedCardView />
            </PhoneMockup>
          </div>
        </MockupSection>

        {/* Mockup 4: Grouped Admin Navigation */}
        <MockupSection
          title="4. Grouped Admin Navigation (Progressive Disclosure)"
          description="90% of users prefer straightforward navigation. Reduces 16 items to 4 logical groups."
          source="UXPin Dashboard Principles"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <PhoneMockup title="Current (16 Horizontal Items)">
              <CurrentAdminNav />
            </PhoneMockup>
            <PhoneMockup title="Proposed (4 Groups)" highlighted>
              <ProposedAdminNav />
            </PhoneMockup>
          </div>
        </MockupSection>

        {/* Mockup 5: Skeleton Loading */}
        <MockupSection
          title="5. Skeleton Loading States"
          description="Skeleton screens reduce perceived loading time by up to 10% and prevent layout shift."
          source="UX Research"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <PhoneMockup title="Current (Spinner)">
              <CurrentLoadingState />
            </PhoneMockup>
            <PhoneMockup title="Proposed (Skeleton)" highlighted>
              <ProposedSkeletonState />
            </PhoneMockup>
          </div>
        </MockupSection>

        {/* Mockup 6: Empty States */}
        <MockupSection
          title="6. Actionable Empty States"
          description="Empty states should educate and encourage action, not just say 'No data'."
          source="UX Best Practices"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <PhoneMockup title="Current (Basic)">
              <CurrentEmptyState />
            </PhoneMockup>
            <PhoneMockup title="Proposed (Actionable)" highlighted>
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
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">Source: {source}</p>
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
          <Badge variant="default" className="bg-green-500">
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-xl" />
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
    <div className="flex flex-col h-full">
      {/* Top nav */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-[#1E3A5F] text-white text-sm">
        <div className="flex items-center gap-3">
          <span>Home</span>
          <span>Coach</span>
          <span>Admin</span>
        </div>
        <Menu className="h-5 w-5" />
      </div>
      {/* Content */}
      <div className="flex-1 p-4">
        <div className="text-center text-muted-foreground mt-20">
          Content Area
        </div>
        <div className="text-center text-xs text-red-500 mt-4">
          Navigation at top - hard to reach with thumb
        </div>
      </div>
    </div>
  );
}

function ProposedBottomNav() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="flex flex-col h-full">
      {/* Simplified top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold">Players</span>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="text-center text-muted-foreground mt-20">
          Content Area
        </div>
        <div className="text-center text-xs text-green-600 mt-4">
          More space for content!
        </div>
      </div>

      {/* Bottom nav */}
      <div className="border-t bg-background/95 backdrop-blur">
        <div className="flex items-center justify-around px-2 py-1">
          {[
            { icon: Home, label: "Home", id: "home" },
            { icon: Users, label: "Players", id: "players" },
            { icon: Plus, label: "Add", id: "add", isAction: true },
            { icon: BarChart3, label: "Stats", id: "stats" },
            { icon: User, label: "Profile", id: "profile" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center",
                item.isAction ? "relative -mt-4" : "h-14 w-14",
              )}
            >
              {item.isAction ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <item.icon className="h-5 w-5" />
                </div>
              ) : (
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    activeTab === item.id ? "text-primary" : "text-muted-foreground"
                  )}
                />
              )}
              <span
                className={cn(
                  "text-[10px] mt-0.5",
                  activeTab === item.id ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </button>
          ))}
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
        <CardDescription>Tap each button to feel the difference</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Current sizes */}
          <div className="space-y-4">
            <h4 className="font-medium text-red-600">Current Sizes (Below Standard)</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" className="h-8">
                  h-8 (32px)
                </Button>
                <span className="text-xs text-red-500">Too small</span>
              </div>
              <div className="flex items-center gap-3">
                <Button size="default" variant="outline" className="h-9">
                  h-9 (36px)
                </Button>
                <span className="text-xs text-red-500">Below 44px</span>
              </div>
              <div className="flex items-center gap-3">
                <Button size="lg" variant="outline" className="h-10">
                  h-10 (40px)
                </Button>
                <span className="text-xs text-yellow-600">Close but not compliant</span>
              </div>
            </div>
          </div>

          {/* Proposed sizes */}
          <div className="space-y-4">
            <h4 className="font-medium text-green-600">Proposed Sizes (Compliant)</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button variant="default" className="h-11 px-5">
                  h-11 (44px)
                </Button>
                <span className="text-xs text-green-600">Minimum standard</span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="default" className="h-12 px-6">
                  h-12 (48px)
                </Button>
                <span className="text-xs text-green-600">Comfortable</span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="default" className="h-14 px-8 text-base">
                  h-14 (56px)
                </Button>
                <span className="text-xs text-green-600">Primary CTA</span>
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
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b font-medium">Players</div>
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
              <tr key={i} className="border-b">
                <td className="px-2 py-2 truncate max-w-[80px]">{name}</td>
                <td className="px-2 py-2 text-center">12</td>
                <td className="px-2 py-2 truncate max-w-[50px]">U12</td>
                <td className="px-2 py-2 truncate max-w-[40px]">Mid</td>
                <td className="px-2 py-2 text-center">
                  <button className="text-[10px] px-1">•••</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-center text-xs text-red-500 mt-4 px-4">
          Requires horizontal scroll, tiny tap targets
        </div>
      </div>
    </div>
  );
}

function ProposedCardView() {
  const [swipedCard, setSwipedCard] = useState<number | null>(null);

  const players = [
    { name: "John Smith", team: "U12 Red", position: "Midfielder", rating: 4.2 },
    { name: "Sarah Johnson", team: "U14 Blue", position: "Goalkeeper", rating: 3.8 },
    { name: "Mike Williams", team: "U12 Red", position: "Forward", rating: 4.5 },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold">Players (24)</span>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {players.map((player, i) => (
          <div key={i} className="relative overflow-hidden rounded-lg">
            {/* Swipe actions */}
            <div className="absolute inset-y-0 right-0 flex">
              <button className="w-16 bg-blue-500 text-white flex flex-col items-center justify-center">
                <Edit className="h-4 w-4" />
                <span className="text-[10px]">Edit</span>
              </button>
              <button className="w-16 bg-green-500 text-white flex flex-col items-center justify-center">
                <BarChart3 className="h-4 w-4" />
                <span className="text-[10px]">Stats</span>
              </button>
            </div>

            {/* Card */}
            <div
              className={cn(
                "relative bg-card border rounded-lg transition-transform",
                swipedCard === i && "-translate-x-32"
              )}
              onClick={() => setSwipedCard(swipedCard === i ? null : i)}
            >
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{player.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{player.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {player.team.split(" ")[0]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{player.position}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-3 w-3",
                          star <= Math.floor(player.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-muted text-muted"
                        )}
                      />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({player.rating})
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
        <p className="text-center text-xs text-green-600 mt-2">
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
  const items = ["Overview", "Players", "Teams", "Coaches", "Guardians", "Users", "Import", "..."];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b font-medium">Admin Panel</div>
      <div className="overflow-x-auto border-b">
        <div className="flex gap-1 px-2 py-2 min-w-max">
          {items.map((item, i) => (
            <Button
              key={i}
              variant={i === 0 ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs whitespace-nowrap"
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-4">
        <div className="text-center text-xs text-red-500">
          16 items require horizontal scroll
          <br />
          Hard to find items
        </div>
      </div>
    </div>
  );
}

function ProposedAdminNav() {
  const [expanded, setExpanded] = useState<string | null>("People");

  const groups = [
    { label: "People", icon: Users, items: ["Players", "Coaches", "Guardians", "Users"] },
    { label: "Teams & Access", icon: Shield, items: ["Teams", "Overrides", "Access"] },
    { label: "Data", icon: BarChart3, items: ["Analytics", "Import", "Benchmarks"] },
    { label: "Settings", icon: Settings, items: ["Settings", "Announcements"] },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold">Admin Panel</span>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Overview always visible */}
        <button className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium hover:bg-accent">
          <Home className="h-5 w-5" />
          Overview
        </button>

        {/* Grouped items */}
        {groups.map((group) => (
          <div key={group.label}>
            <button
              onClick={() => setExpanded(expanded === group.label ? null : group.label)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-accent"
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
                    key={item}
                    className="w-full px-4 py-2.5 pl-12 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
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

// ============================================
// MOCKUP 5: LOADING STATES
// ============================================

function CurrentLoadingState() {
  return (
    <div className="flex flex-col h-full items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      <p className="text-xs text-red-500 mt-4">
        No layout context
        <br />
        Content jumps when loaded
      </p>
    </div>
  );
}

function ProposedSkeletonState() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="p-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
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
      <p className="text-center text-xs text-green-600 mt-2">
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
    <div className="flex flex-col h-full items-center justify-center p-4">
      <p className="text-muted-foreground">No players found</p>
      <p className="text-xs text-red-500 mt-4">
        No guidance for user
        <br />
        Dead end
      </p>
    </div>
  );
}

function ProposedEmptyState() {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg">No players yet</h3>
      <p className="text-muted-foreground text-sm mt-1 max-w-[200px]">
        Get started by adding your first player or importing from a spreadsheet.
      </p>
      <Button className="mt-4 h-11">
        <Plus className="h-4 w-4 mr-2" />
        Add Player
      </Button>
      <button className="mt-2 text-sm text-muted-foreground underline">
        Import from CSV
      </button>
    </div>
  );
}
