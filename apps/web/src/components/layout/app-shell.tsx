"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNav, BottomNavSpacer, type BottomNavItem } from "./bottom-nav";
import {
  Home,
  Users,
  UserCog,
  Shield,
  Settings,
  ClipboardList,
  Award,
  Plus,
  Menu,
  ChevronLeft,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { CommandMenu } from "@/components/interactions/command-menu";

/**
 * AppShell - Responsive layout wrapper
 * 
 * Provides:
 * - Mobile: Bottom nav + minimal header
 * - Tablet: Collapsible sidebar + header
 * - Desktop: Full sidebar + breadcrumb header
 * 
 * Usage:
 * ```tsx
 * <AppShell 
 *   role="admin" 
 *   orgId="123"
 *   sidebar={<CustomSidebar />}
 * >
 *   {children}
 * </AppShell>
 * ```
 */

export interface AppShellProps {
  children: React.ReactNode;
  /** Current user role for navigation items */
  role?: "admin" | "coach" | "parent" | "player";
  /** Organization ID for navigation links */
  orgId?: string;
  /** Custom sidebar content (overrides default) */
  sidebar?: React.ReactNode;
  /** Custom header content */
  header?: React.ReactNode;
  /** Page title for mobile header */
  title?: string;
  /** Show back button */
  showBack?: boolean;
  /** Back button click handler */
  onBack?: () => void;
  /** Show search in header */
  showSearch?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search callback */
  onSearch?: (query: string) => void;
  /** Custom bottom nav items (mobile only) */
  bottomNavItems?: BottomNavItem[];
  /** Hide bottom nav on mobile */
  hideBottomNav?: boolean;
  /** Additional className for main content */
  className?: string;
}

// Default navigation items by role
const getDefaultBottomNavItems = (
  role: string,
  orgId: string
): BottomNavItem[] => {
  const baseItems: BottomNavItem[] = [
    {
      id: "home",
      icon: Home,
      label: "Home",
      href: `/orgs/${orgId}`,
    },
  ];

  switch (role) {
    case "admin":
      return [
        ...baseItems,
        { id: "players", icon: Users, label: "Players", href: `/orgs/${orgId}/admin/players` },
        {
          id: "add",
          icon: Plus,
          label: "Add",
          href: `/orgs/${orgId}/admin/players/new`,
          isAction: true,
        },
        { id: "teams", icon: Shield, label: "Teams", href: `/orgs/${orgId}/admin/teams` },
        {
          id: "settings",
          icon: Settings,
          label: "Settings",
          href: `/orgs/${orgId}/admin/settings`,
        },
      ];
    case "coach":
      return [
        ...baseItems,
        { id: "players", icon: Users, label: "Players", href: `/orgs/${orgId}/coach/players` },
        {
          id: "assess",
          icon: ClipboardList,
          label: "Assess",
          href: `/orgs/${orgId}/coach/assessments/new`,
          isAction: true,
        },
        {
          id: "reports",
          icon: Award,
          label: "Reports",
          href: `/orgs/${orgId}/coach/reports`,
        },
        {
          id: "profile",
          icon: UserCog,
          label: "Profile",
          href: `/orgs/${orgId}/coach/profile`,
        },
      ];
    case "parent":
      return [
        ...baseItems,
        {
          id: "children",
          icon: Users,
          label: "Children",
          href: `/orgs/${orgId}/parents/children`,
        },
        {
          id: "progress",
          icon: Award,
          label: "Progress",
          href: `/orgs/${orgId}/parents/progress`,
          isAction: true,
        },
        {
          id: "settings",
          icon: Settings,
          label: "Settings",
          href: `/orgs/${orgId}/parents/settings`,
        },
      ];
    default:
      return baseItems;
  }
};

export function AppShell({
  children,
  role = "admin",
  orgId = "",
  sidebar,
  header,
  title,
  showBack = false,
  onBack,
  showSearch = false,
  searchPlaceholder = "Search...",
  onSearch,
  bottomNavItems,
  hideBottomNav = false,
  className,
}: AppShellProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Get navigation items
  const navItems = bottomNavItems || getDefaultBottomNavItems(role, orgId);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  // Mobile header
  const MobileHeader = () => (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4">
      {showBack ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack || (() => window.history.back())}
          className="shrink-0"
        >
          <ChevronLeft className="size-5" />
          <span className="sr-only">Go back</span>
        </Button>
      ) : sidebar ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-auto">{sidebar}</div>
          </SheetContent>
        </Sheet>
      ) : null}

      {title && (
        <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
      )}

      {showSearch && (
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearch}
              className="h-10 pl-9"
            />
          </div>
        </div>
      )}

      {header}
    </header>
  );

  // Desktop/Tablet header
  const DesktopHeader = () => (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-6">
      {showBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack || (() => window.history.back())}
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
      )}

      {title && <h1 className="text-lg font-semibold">{title}</h1>}

      <div className="flex-1" />

      {showSearch && (
        <div className="w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {header}
    </header>
  );

  // Render based on breakpoint
  if (isMobile) {
    return (
      <div className="flex min-h-svh flex-col">
        <MobileHeader />
        <main className={cn("flex-1", className)}>{children}</main>
        {!hideBottomNav && <BottomNavSpacer />}
        {!hideBottomNav && (
          <BottomNav items={navItems} />
        )}
        {/* Global command menu - Cmd+K to open */}
        <CommandMenu orgId={orgId} />
      </div>
    );
  }

  // Desktop/Tablet layout
  return (
    <div className="flex min-h-svh">
      {/* Sidebar */}
      {sidebar && (
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r bg-sidebar lg:block">
          <div className="flex h-full flex-col overflow-auto">{sidebar}</div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <DesktopHeader />
        <main className={cn("flex-1 p-6", className)}>{children}</main>
      </div>

      {/* Global command menu - Cmd+K to open */}
      <CommandMenu orgId={orgId} />
    </div>
  );
}

/**
 * AppShellSidebar - Standard sidebar wrapper for AppShell
 */
export interface AppShellSidebarProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AppShellSidebar({
  children,
  header,
  footer,
  className,
}: AppShellSidebarProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      {header && (
        <div className="shrink-0 border-b px-4 py-3">{header}</div>
      )}
      <div className="flex-1 overflow-auto p-2">{children}</div>
      {footer && (
        <div className="shrink-0 border-t px-4 py-3">{footer}</div>
      )}
    </div>
  );
}

/**
 * AppShellNavGroup - Navigation group with collapsible items
 */
export interface AppShellNavGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AppShellNavGroup({
  title,
  children,
  defaultOpen = true,
}: AppShellNavGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="py-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronLeft
          className={cn(
            "size-4 transition-transform",
            isOpen ? "-rotate-90" : "rotate-0"
          )}
        />
      </button>
      {isOpen && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

/**
 * AppShellNavItem - Single navigation item
 */
export interface AppShellNavItemProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  isActive?: boolean;
  badge?: string | number;
  onClick?: () => void;
}

export function AppShellNavItem({
  icon: Icon,
  label,
  href,
  isActive,
  badge,
  onClick,
}: AppShellNavItemProps) {
  const pathname = usePathname();
  const active = isActive ?? pathname === href;

  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground font-medium"
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {badge}
        </span>
      )}
    </a>
  );
}

export default AppShell;